"use client";

import { type ChangeEvent, type DragEvent, useMemo, useState } from "react";
import { AlertCircle, ImageUp, Layers3, Loader2, Map, Satellite, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type EuroSatPrediction = {
  dataset?: string;
  model_name: string;
  model_file: string;
  input_size: number;
  num_classes: number;
  prediction: number;
  prediction_label: string;
  confidence: number;
  class_labels_available: boolean;
  top_predictions: Array<{
    class_index: number;
    class_label: string;
    probability: number;
  }>;
};

const classMeta: Record<string, { label: string; detail: string; tone: string; bar: string }> = {
  AnnualCrop: {
    label: "Annual Crop",
    detail: "Seasonal cultivated fields",
    tone: "border-lime-500/40 bg-lime-500/10 text-lime-300",
    bar: "bg-lime-500",
  },
  Forest: {
    label: "Forest",
    detail: "Dense tree canopy",
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    bar: "bg-emerald-500",
  },
  HerbaceousVegetation: {
    label: "Herbaceous Vegetation",
    detail: "Grass and low vegetation",
    tone: "border-green-500/40 bg-green-500/10 text-green-300",
    bar: "bg-green-500",
  },
  Highway: {
    label: "Highway",
    detail: "Major road corridors",
    tone: "border-slate-400/40 bg-slate-400/10 text-slate-200",
    bar: "bg-slate-400",
  },
  Industrial: {
    label: "Industrial",
    detail: "Factories and storage zones",
    tone: "border-zinc-400/40 bg-zinc-400/10 text-zinc-200",
    bar: "bg-zinc-400",
  },
  Pasture: {
    label: "Pasture",
    detail: "Open grazing land",
    tone: "border-teal-400/40 bg-teal-400/10 text-teal-200",
    bar: "bg-teal-400",
  },
  PermanentCrop: {
    label: "Permanent Crop",
    detail: "Orchards and perennial crops",
    tone: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
    bar: "bg-yellow-400",
  },
  Residential: {
    label: "Residential",
    detail: "Urban housing areas",
    tone: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    bar: "bg-sky-400",
  },
  River: {
    label: "River",
    detail: "Linear water bodies",
    tone: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
    bar: "bg-cyan-400",
  },
  SeaLake: {
    label: "Sea Lake",
    detail: "Large water surfaces",
    tone: "border-blue-400/40 bg-blue-400/10 text-blue-200",
    bar: "bg-blue-400",
  },
};

const orderedClasses = [
  "AnnualCrop",
  "Forest",
  "HerbaceousVegetation",
  "Highway",
  "Industrial",
  "Pasture",
  "PermanentCrop",
  "Residential",
  "River",
  "SeaLake",
];

function displayLabel(label: string) {
  return classMeta[label]?.label ?? label.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function readFileAsBase64(file: File, onLoad: (value: string) => void, onError: (message: string) => void) {
  if (!file.type.startsWith("image/")) {
    onError("Please select an image file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result));
  reader.onerror = () => onError("Image could not be loaded.");
  reader.readAsDataURL(file);
}

export default function EuroSatPage() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EuroSatPrediction | null>(null);

  const previewSrc = useMemo(() => imageBase64 ?? "", [imageBase64]);
  const bestMeta = result ? classMeta[result.prediction_label] : undefined;

  const setImageFile = (file?: File) => {
    setResult(null);
    setError(null);

    if (!file) {
      setImageBase64(null);
      setFileName("");
      return;
    }

    setFileName(file.name);
    readFileAsBase64(
      file,
      (value) => setImageBase64(value),
      (message) => {
        setImageBase64(null);
        setFileName("");
        setError(message);
      },
    );
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImageFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    setImageFile(event.dataTransfer.files?.[0]);
  };

  const runPrediction = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/eurosat-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Prediction failed.");
      }
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-300">
            <Satellite className="h-4 w-4" />
            2025 ML Final - Topic 5
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">EuroSAT Satellite Classifier</h1>
          <p className="mt-1 text-muted-foreground">CNN image classification for satellite land-cover scenes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="w-fit border-cyan-400/50 bg-cyan-400/10 text-cyan-200">
            EuroSAT
          </Badge>
          <Badge variant="outline" className="w-fit border-emerald-400/50 bg-emerald-400/10 text-emerald-200">
            Uydu model
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageUp className="h-5 w-5 text-cyan-300" />
                Satellite Image
              </CardTitle>
              <CardDescription>PNG, JPG, JPEG, JFIF, or WEBP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`relative flex aspect-[4/3] min-h-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-black/20 transition-colors ${
                  dragActive ? "border-cyan-300 bg-cyan-300/10" : "border-white/15 hover:bg-white/5"
                }`}
              >
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSrc} alt="Selected satellite preview" className="h-full max-h-[480px] w-full object-contain p-4" />
                ) : (
                  <div className="flex flex-col items-center justify-center px-6 text-center text-muted-foreground">
                    <Satellite className="mb-4 h-12 w-12 text-cyan-300" />
                    <div className="text-sm font-medium text-foreground">Select satellite image</div>
                    <div className="mt-1 text-xs">Drag and drop or click to browse</div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/jfif,.jfif,image/webp"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleFileChange}
                  aria-label="Select satellite image"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-5 truncate text-sm text-muted-foreground">{fileName || "No image selected"}</div>
                <Button onClick={runPrediction} disabled={!imageBase64 || loading} className="w-full bg-cyan-600 hover:bg-cyan-500 sm:w-auto">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                  Run Prediction
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="glass-card h-full border-none bg-gradient-to-br from-card/70 to-cyan-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-cyan-300" />
                Prediction Output
              </CardTitle>
              <CardDescription>Top land-cover probabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground opacity-60">
                  <Map className="mb-4 h-12 w-12" />
                  <p>Prediction results will appear here</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-cyan-300">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin" />
                  <p className="animate-pulse">Running satellite inference...</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className={`rounded-xl border p-5 ${bestMeta?.tone ?? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"}`}>
                    <div className="text-xs font-semibold uppercase">Predicted Class</div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-3xl font-bold text-foreground">{displayLabel(result.prediction_label)}</div>
                        <div className="mt-1 text-sm text-muted-foreground">Index #{result.prediction}</div>
                      </div>
                      <Badge variant="outline" className="w-fit border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                        {(result.confidence * 100).toFixed(2)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground">Dataset</div>
                      <div className="mt-1 truncate text-lg font-bold text-foreground">{result.dataset ?? "EuroSAT"}</div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground">Classes</div>
                      <div className="mt-1 text-lg font-bold text-foreground">{result.num_classes}</div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground">Input</div>
                      <div className="mt-1 text-lg font-bold text-foreground">{result.input_size}px</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {result.top_predictions.map((item) => {
                      const meta = classMeta[item.class_label];
                      return (
                        <div key={item.class_index} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-foreground">{displayLabel(item.class_label)}</span>
                            <span className="shrink-0 text-muted-foreground">{(item.probability * 100).toFixed(2)}%</span>
                          </div>
                          <Progress value={item.probability * 100} className="h-2" indicatorClassName={meta?.bar ?? "bg-cyan-400"} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
                    {result.model_file}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="glass-card border-none">
        <CardHeader>
          <CardTitle>EuroSAT Classes</CardTitle>
          <CardDescription>Land-cover labels used by the uydu model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {orderedClasses.map((className) => {
              const meta = classMeta[className];
              return (
                <div key={className} className={`min-h-[86px] rounded-xl border p-3 ${meta.tone}`}>
                  <div className="text-sm font-semibold text-foreground">{meta.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{meta.detail}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
