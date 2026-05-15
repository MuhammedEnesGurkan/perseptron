"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, ImageUp, Loader2, ScanSearch } from "lucide-react";

type ResNetPrediction = {
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

export default function BhwResNetPage() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResNetPrediction | null>(null);

  const previewSrc = useMemo(() => imageBase64 ?? "", [imageBase64]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setResult(null);
    setError(null);

    if (!file) {
      setImageBase64(null);
      setFileName("");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageBase64(String(reader.result));
    reader.onerror = () => setError("Image could not be loaded.");
    reader.readAsDataURL(file);
  };

  const runPrediction = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/resnet-classify", {
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">BHW ResNet Class Test</h1>
          <p className="text-muted-foreground mt-1">Upload a competition image and inspect the class prediction.</p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/50 text-primary bg-primary/10">
          ResNet18 TorchScript
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle>Image Input</CardTitle>
              <CardDescription>BHW-1 DL 2025-2026 model tester</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="relative flex min-h-[340px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/15 bg-black/20 transition-colors hover:bg-white/5">
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSrc} alt="Selected preview" className="h-full max-h-[420px] w-full object-contain p-4" />
                ) : (
                  <div className="flex flex-col items-center justify-center px-6 text-center text-muted-foreground">
                    <ImageUp className="mb-4 h-12 w-12 text-primary" />
                    <div className="text-sm font-medium text-foreground">Select image</div>
                    <div className="mt-1 text-xs">PNG, JPG, JPEG, JFIF, or WEBP</div>
                  </div>
                )}
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/jfif,.jfif,image/webp" className="absolute inset-0 opacity-0" onChange={handleFileChange} />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-5 truncate text-sm text-muted-foreground">
                  {fileName || "No image selected"}
                </div>
                <Button onClick={runPrediction} disabled={!imageBase64 || loading} className="w-full sm:w-auto">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                  Run Class Prediction
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
          <Card className="glass-card border-none h-full bg-gradient-to-br from-card/70 to-primary/5">
            <CardHeader>
              <CardTitle>Prediction Output</CardTitle>
              <CardDescription>Top class probabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground opacity-60">
                  <AlertCircle className="mb-4 h-12 w-12" />
                  <p>Run prediction to view model output</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-primary">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin" />
                  <p className="animate-pulse">Running ResNet inference...</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-5">
                    <div className="text-xs font-semibold uppercase text-primary">Predicted Class</div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-3xl font-bold text-foreground">
                          {result.class_labels_available ? result.prediction_label : `Class ${result.prediction}`}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {result.class_labels_available ? `Index #${result.prediction}` : "Class name mapping is missing"}
                        </div>
                      </div>
                      <Badge variant="outline" className="w-fit border-green-500/50 bg-green-500/10 px-3 py-1 text-green-500">
                        {(result.confidence * 100).toFixed(2)}%
                      </Badge>
                    </div>
                  </div>

                  {!result.class_labels_available && (
                    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                      This model returns class indices only. Add the training class list as
                      <span className="font-mono"> models/resnet_classes.json </span>
                      to see names instead of numbers.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground">Classes</div>
                      <div className="mt-1 text-2xl font-bold text-foreground">{result.num_classes}</div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground">Input Size</div>
                      <div className="mt-1 text-2xl font-bold text-foreground">{result.input_size}px</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {result.top_predictions.map((item) => (
                      <div key={item.class_index} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-foreground">{item.class_label}</span>
                          <span className="shrink-0 text-muted-foreground">{(item.probability * 100).toFixed(2)}%</span>
                        </div>
                        <Progress value={item.probability * 100} className="h-2" />
                      </div>
                    ))}
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
    </div>
  );
}
