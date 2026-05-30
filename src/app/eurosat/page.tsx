"use client";

import { type ChangeEvent, type DragEvent, useMemo, useState } from "react";
import { AlertCircle, ImageUp, Layers3, Loader2, Map, Satellite, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EuroSatPrediction = {
  dataset?: string;
  model_name: string;
  model_id?: string;
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
  pipeline?: {
    name: string;
    decision_authority?: string;
    stage_1_context_labels: string[];
    stage_1_passed: boolean;
    stage_1_context_score?: number;
    stage_1_best_context_label?: string | null;
    stage_1_best_context_confidence?: number;
    stage_2_ran: boolean;
    stage_2_error?: string | null;
    yolo?: {
      military_asset_detected: boolean;
      military_asset_confidence: number;
      military_detections: Array<{
        class_label: string;
        confidence: number;
        bbox_xyxy: number[];
      }>;
      detections: Array<{
        class_label: string;
        confidence: number;
        bbox_xyxy: number[];
        is_military_asset: boolean;
      }>;
    } | null;
    military_base_detected: boolean;
    military_base_score: number;
    minimum_military_asset_confidence?: number;
    decision_label: string;
    score_formula: string;
  };
};

type SatelliteModelId =
  | "convnext_tiny"
  | "resnet18_torchscript"
  | "resnet18_state_dict"
  | "resnet18_checkpoint"
  | "efficientnet_b0_torchscript"
  | "efficientnet_b0_state_dict"
  | "efficientnet_b0_full_model"
  | "efficientnet_b0_augmented_best";
type YoloModelId = "best_pt" | "last_pt" | "best_onnx" | "best_torchscript";

const satelliteModels: Array<{ id: SatelliteModelId; label: string; detail: string }> = [
  {
    id: "convnext_tiny",
    label: "ConvNeXt Tiny",
    detail: "best_convnext_tiny_uydu.pth",
  },
  {
    id: "resnet18_torchscript",
    label: "ResNet18 TorchScript",
    detail: "best_resnet18_torchscript_uydu.pt",
  },
  {
    id: "resnet18_state_dict",
    label: "ResNet18 State Dict",
    detail: "best_resnet18_state_dict_uydu.pth",
  },
  {
    id: "resnet18_checkpoint",
    label: "ResNet18 Checkpoint",
    detail: "best_resnet18_checkpoint_uydu.pth",
  },
  {
    id: "efficientnet_b0_torchscript",
    label: "EfficientNet B0",
    detail: "efficientnet_b0_torchscript.pt",
  },
  {
    id: "efficientnet_b0_state_dict",
    label: "EfficientNet B0 State Dict",
    detail: "efficientnet_b0_state_dict.pth",
  },
  {
    id: "efficientnet_b0_full_model",
    label: "EfficientNet B0 Full Model",
    detail: "efficientnet_b0_full_model.pth",
  },
  {
    id: "efficientnet_b0_augmented_best",
    label: "EfficientNet B0 Augmented Best",
    detail: "best_robust_model.pth",
  },
];

const yoloModels: Array<{ id: YoloModelId; label: string; detail: string }> = [
  {
    id: "best_pt",
    label: "YOLO Best PT",
    detail: "yolo models/best.pt",
  },
  {
    id: "last_pt",
    label: "YOLO Last PT",
    detail: "yolo models/last.pt",
  },
  {
    id: "best_onnx",
    label: "YOLO Best ONNX",
    detail: "yolo models/best.onnx",
  },
  {
    id: "best_torchscript",
    label: "YOLO TorchScript",
    detail: "yolo models/best.torchscript",
  },
];

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
  const [selectedModelId, setSelectedModelId] = useState<SatelliteModelId>("resnet18_torchscript");
  const [selectedYoloModelId, setSelectedYoloModelId] = useState<YoloModelId>("best_pt");

  const previewSrc = useMemo(() => imageBase64 ?? "", [imageBase64]);
  const bestMeta = result ? classMeta[result.prediction_label] : undefined;
  const selectedModel = satelliteModels.find((model) => model.id === selectedModelId) ?? satelliteModels[0];
  const selectedYoloModel = yoloModels.find((model) => model.id === selectedYoloModelId) ?? yoloModels[0];

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
        body: JSON.stringify({ image_base64: imageBase64, model_id: selectedModelId, yolo_model_id: selectedYoloModelId }),
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Military Base Detection Pipeline</h1>
          <p className="mt-1 text-muted-foreground">EuroSAT context classification with conditional YOLO military asset detection.</p>
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
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <Select
                    value={selectedModelId}
                    onValueChange={(value) => {
                      setSelectedModelId(value as SatelliteModelId);
                      setResult(null);
                      setError(null);
                    }}
                  >
                    <SelectTrigger className="w-full min-w-[220px] border-white/10 bg-black/20 sm:w-[220px]">
                      <SelectValue>{selectedModel.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {satelliteModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={runPrediction} disabled={!imageBase64 || loading} className="w-full bg-cyan-600 hover:bg-cyan-500 sm:w-auto">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                    Run Prediction
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
                {selectedModel.detail}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">{selectedYoloModel.detail}</div>
                <Select
                  value={selectedYoloModelId}
                  onValueChange={(value) => {
                    setSelectedYoloModelId(value as YoloModelId);
                    setResult(null);
                    setError(null);
                  }}
                >
                  <SelectTrigger className="w-full min-w-[220px] border-white/10 bg-black/20 sm:w-[220px]">
                    <SelectValue>{selectedYoloModel.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {yoloModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <CardDescription>Land-cover probabilities and base decision</CardDescription>
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
                  {result.pipeline && (
                    <div
                      className={`rounded-xl border p-5 ${
                        result.pipeline.military_base_detected
                          ? "border-red-400/50 bg-red-500/10 text-red-200"
                          : "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase">Pipeline Decision</div>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-2xl font-bold text-foreground">
                            {result.pipeline.military_base_detected ? "Military Base Candidate" : "No Military Base Signal"}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Gate {result.pipeline.stage_1_passed ? "opened" : "closed"} - YOLO{" "}
                            {result.pipeline.stage_2_ran ? "ran" : "skipped"}
                          </div>
                        </div>
                        <Badge variant="outline" className="w-fit border-white/20 bg-black/20 px-3 py-1 text-foreground">
                          {(result.pipeline.military_base_score * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      {result.pipeline.stage_2_error && (
                        <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-xs text-amber-200">
                          {result.pipeline.stage_2_error}
                        </div>
                      )}
                    </div>
                  )}

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

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
                    {result.model_name}
                  </div>

                  {result.pipeline?.yolo && (
                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">YOLO Military Assets</div>
                          <div className="text-xs text-muted-foreground">{result.pipeline.yolo.detections.length} total detections</div>
                        </div>
                        <Badge variant="outline" className="border-cyan-400/40 bg-cyan-400/10 text-cyan-200">
                          {(result.pipeline.yolo.military_asset_confidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      {result.pipeline.yolo.military_detections.length > 0 ? (
                        <div className="space-y-2">
                          {result.pipeline.yolo.military_detections.slice(0, 4).map((item, index) => (
                            <div key={`${item.class_label}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate text-foreground">{item.class_label}</span>
                              <span className="shrink-0 text-muted-foreground">{(item.confidence * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No military vehicle or asset class detected.</div>
                      )}
                    </div>
                  )}

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
