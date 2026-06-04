"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, FileImage, LoaderCircle, Play, RotateCcw, Save, UploadCloud } from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, type DragEvent, useState } from "react";
import { PipelineSummary } from "@/components/pipeline-summary";
import { SatelliteFrame } from "@/components/satellite-frame";
import { Badge, Button, Panel, SectionHeading } from "@/components/ui";
import type { EuroSatApiPrediction, Prediction } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

type WorkbenchState = "idle" | "ready" | "loading" | "done" | "error";
type WorkbenchMode = "eurosat" | "pipeline";

const workbenchCopy = {
  eurosat: {
    eyebrow: "EuroSAT ML 2025",
    title: "Arazi bağlamını sınıflandır",
    description: "EuroSAT ML 2025 proje akışı için uydu görüntüsünün arazi sınıfını ve model güvenini inceleyin.",
    badge: "Sınıflandırma hazır",
    empty: "Bir görüntü ekleyin. Sistem EuroSAT arazi bağlamını sınıflandırır ve top-3 tahminleri gösterir.",
    loading: "Tile normalize ediliyor ve EuroSAT modelleri çalıştırılıyor.",
  },
  pipeline: {
    eyebrow: "YOLO entegrasyonu",
    title: "YOLO ile entegre karar hattını çalıştır",
    description: "EuroSAT bağlam kapısını değerlendir, gerekli durumda askeri varlık taramasını ikinci aşamada çalıştır.",
    badge: "Worker hazır",
    empty: "Bir görüntü ekleyin. Sistem önce bağlamı sınıflandırır, ardından gerekli ise YOLO taramasını açar.",
    loading: "Tile normalize ediliyor, modeller çalıştırılıyor ve bağlam kapısı değerlendiriliyor.",
  },
} satisfies Record<WorkbenchMode, { eyebrow: string; title: string; description: string; badge: string; empty: string; loading: string }>;

export function ClassificationWorkbench({ mode = "pipeline" }: { mode?: WorkbenchMode }) {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [state, setState] = useState<WorkbenchState>("idle");
  const [result, setResult] = useState<Prediction | null>(null);
  const [dragging, setDragging] = useState(false);
  const [model, setModel] = useState("ensemble_top3_sum");
  const [yoloModel, setYoloModel] = useState("best_pt");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedId, setSavedId] = useState("");
  const copy = workbenchCopy[mode];
  const showPipeline = mode === "pipeline";

  function acceptFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bu dosya biçimi desteklenmiyor. PNG, JPG veya WEBP kullanın.");
      setState("error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Görüntü 20 MB sınırını aşıyor. Daha küçük bir dosya seçin.");
      setState("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.onerror = () => {
      setError("Görüntü okunamadı. Dosyayı kontrol edip tekrar deneyin.");
      setState("error");
    };
    reader.readAsDataURL(file);
    setFileName(file.name);
    setResult(null);
    setSavedId("");
    setSaveState("idle");
    setError("");
    setState("ready");
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  async function analyze() {
    if (!image) return;
    setState("loading");
    setResult(null);
    setError("");
    const startedAt = performance.now();

    try {
      const response = await fetch("/api/eurosat-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: image, model_id: model, yolo_model_id: yoloModel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Model analizi tamamlanamadı.");
      setResult(mapPrediction(data as EuroSatApiPrediction, performance.now() - startedAt));
      setSavedId("");
      setSaveState("idle");
      setState("done");
    } catch (requestError) {
      setError((requestError as Error).message);
      setState("error");
    }
  }

  function reset() {
    setImage(null); setFileName(""); setResult(null); setError(""); setSavedId(""); setSaveState("idle"); setState("idle");
  }

  async function saveAnalysis() {
    if (!image || !result) return;
    setSaveState("saving");
    setError("");
    try {
      const response = await fetch("/api/analysis-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: image,
          fileName,
          mode,
          className: result.className,
          confidence: result.confidence,
          assetCount: result.detections.length,
          model: result.modelName ?? model,
          yoloRan: result.stageTwoRan,
          militaryScore: result.militaryScore,
          detections: result.detections,
          predictions: result.aggregatePredictions?.map((item) => ({ name: item.name, probability: item.probability })) ?? result.predictions,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analiz kaydedilemedi.");
      setSavedId(data.id);
      setSaveState("saved");
    } catch (saveError) {
      setError((saveError as Error).message);
      setSaveState("error");
    }
  }

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} action={<Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-success" />{copy.badge}</Badge>} />
      </div>
      <div className="grid lg:grid-cols-[1.1fr_.9fr]">
        <div className="border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <SatelliteFrame image={image} showBoxes={state === "done"} detections={showPipeline ? result?.detections : []} patches={result?.patches} />
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 transition-colors ${dragging ? "border-accent bg-accent/10" : "border-[#46544f] bg-black/10 hover:border-accent/60"}`}
            >
              <UploadCloud className="h-5 w-5 text-accent" />
              <span className="min-w-0"><span className="block truncate text-xs font-medium text-ink">{fileName || "Görüntüyü buraya bırak veya bilgisayardan seç"}</span><span className="mt-0.5 block text-[11px] text-dim">PNG, JPG veya WEBP · En fazla 20 MB</span></span>
              <input className="hidden" type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => acceptFile(e.target.files?.[0])} />
            </label>
            <Button variant="primary" className="min-h-14" disabled={!image || state === "loading"} onClick={analyze}>
              {state === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
              {state === "loading" ? "Analiz sürüyor" : "Analizi başlat"}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={model} onChange={(e) => setModel(e.target.value)} className="focus-ring h-8 rounded-lg border border-line bg-panel-raised px-2 text-[11px] text-muted">
              <option value="ensemble_top3_sum">4 Model Ensemble · Top-3 sınıf toplamı</option><option value="resnet18_torchscript">ResNet18 TorchScript</option><option value="robust_efficientnet_b0">Robust EfficientNet B0</option><option value="convnext_tiny">ConvNeXt Tiny</option><option value="efficientnet_b0_torchscript">EfficientNet B0 TorchScript · 64px patch</option>
            </select>
            {showPipeline && <select value={yoloModel} onChange={(e) => setYoloModel(e.target.value)} className="focus-ring h-8 rounded-lg border border-line bg-panel-raised px-2 text-[11px] text-muted"><option value="best_pt">YOLO Best PT</option><option value="best_onnx">YOLO Best ONNX</option><option value="best_torchscript">YOLO TorchScript</option></select>}
            {image && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />Sıfırla</Button>}
          </div>
          {state === "error" && <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs leading-5 text-[#ec9b90]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        </div>
        <div className="min-h-[430px] p-4 sm:p-5">
          <AnimatePresence mode="wait">
            {state === "loading" ? <LoadingState description={copy.loading} /> : result ? <ResultState result={result} mode={mode} saveState={saveState} savedId={savedId} onSave={saveAnalysis} /> : <EmptyState description={copy.empty} />}
          </AnimatePresence>
          {saveState === "error" && <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs leading-5 text-[#ec9b90]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        </div>
      </div>
    </Panel>
  );
}

function EmptyState({ description }: { description: string }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-[390px] flex-col items-center justify-center text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white/[.025]"><FileImage className="h-6 w-6 text-dim" /></div><p className="mt-4 text-sm font-medium">Analiz sonucu bekleniyor</p><p className="mt-1 max-w-[260px] text-xs leading-5 text-dim">{description}</p></motion.div>;
}

function LoadingState({ description }: { description: string }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[390px] flex-col items-center justify-center text-center"><LoaderCircle className="h-8 w-8 animate-spin text-accent" /><p className="mt-4 text-sm font-medium">Model çıkarımı çalışıyor</p><p className="mt-1 text-xs text-dim">{description}</p><div className="mt-5 h-1 w-44 overflow-hidden rounded-full bg-white/[.06]"><motion.div initial={{ x: "-100%" }} animate={{ x: "250%" }} transition={{ repeat: Infinity, duration: 1.1 }} className="h-full w-16 rounded-full bg-accent" /></div></motion.div>;
}

function ResultState({ result, mode, saveState, savedId, onSave }: { result: Prediction; mode: WorkbenchMode; saveState: "idle" | "saving" | "saved" | "error"; savedId: string; onSave: () => void }) {
  if (mode === "eurosat") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-accent">EuroSAT sonucu</p><h3 className="mt-2 text-xl font-semibold tracking-[-.04em]">{result.className}</h3><p className="mt-1 text-xs text-muted">ML 2025 proje kapsamındaki birincil arazi bağlamı tahmini.</p></div><div className="rounded-xl border border-success/35 bg-success/10 px-3 py-2 text-right"><p className="text-[10px] uppercase tracking-[.14em] text-success">Güven</p><p className="mt-1 text-lg font-semibold text-[#a5c498]">{formatPercent(result.confidence)}</p></div></div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Bağlam" value={result.className} />
          <Metric label="Model" value={result.modelName ?? "EuroSAT"} />
          <Metric label="Gecikme" value={`${result.latency} ms`} />
        </div>
        {result.ensembleModels ? <EnsemblePredictions models={result.ensembleModels} aggregatePredictions={result.aggregatePredictions ?? []} /> : <TopPredictions predictions={result.predictions} />}
        {result.patches && <div className="rounded-xl border border-line bg-black/10 p-3"><p className="text-xs font-semibold">EfficientNet patch haritası</p><p className="mt-1 text-[11px] leading-5 text-dim">{result.patches.length} adet 64×64 patch sınıflandırıldı. Hücre sınıfları görüntünün üzerinde gösteriliyor; EfficientNet sonucu çoğunluk oyuyla belirleniyor.</p></div>}
        <SaveActions saveState={saveState} savedId={savedId} onSave={onSave} />
      </motion.div>
    );
  }

  const title = result.baseDetected ? "Askeri üs adayı" : "Askeri üs sinyali yok";
  const description = result.baseDetected
    ? "Manuel doğrulama kuyruğuna aktarılmalı."
    : result.gatePassed
      ? "Bağlam tarandı, güvenilir askeri varlık bulunmadı."
      : "Arazi bağlamı ikinci aşama taramasını gerektirmedi.";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-accent">Nihai karar</p><h3 className="mt-2 text-xl font-semibold tracking-[-.04em]">{title}</h3><p className="mt-1 text-xs text-muted">{description}</p></div><div className={`rounded-xl border px-3 py-2 text-right ${result.baseDetected ? "border-danger/35 bg-danger/10" : "border-success/35 bg-success/10"}`}><p className={`text-[10px] uppercase tracking-[.14em] ${result.baseDetected ? "text-danger" : "text-success"}`}>Risk skoru</p><p className={`mt-1 text-lg font-semibold ${result.baseDetected ? "text-[#f2a197]" : "text-[#a5c498]"}`}>{formatPercent(result.militaryScore)}</p></div></div>
      <PipelineSummary result={result} />
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Bağlam" value={result.className} />
        <Metric label="Güven" value={formatPercent(result.confidence)} />
        <Metric label="Gecikme" value={`${result.latency} ms`} />
      </div>
      {result.ensembleModels ? <EnsemblePredictions models={result.ensembleModels} aggregatePredictions={result.aggregatePredictions ?? []} /> : <TopPredictions predictions={result.predictions} />}
      {result.patches && <div className="rounded-xl border border-line bg-black/10 p-3"><p className="text-xs font-semibold">EfficientNet patch haritası</p><p className="mt-1 text-[11px] leading-5 text-dim">{result.patches.length} adet 64×64 patch sınıflandırıldı. Hücre sınıfları görüntünün üzerinde gösteriliyor; EfficientNet sonucu çoğunluk oyuyla belirleniyor.</p></div>}
      <div className="rounded-xl border border-line bg-black/10 p-3">
        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">Tespit edilen varlıklar</p><Badge tone="warning">{result.detections.length} işaret</Badge></div>
        {result.detections.slice(0, 3).map((item) => <div key={item.box} className="flex items-center justify-between border-t border-line py-2 text-xs"><span className="font-medium text-ink">{item.label}</span><span className="text-muted">{item.box}</span><span className="text-warning">{formatPercent(item.confidence)}</span></div>)}
        {result.detections.length === 0 && <p className="border-t border-line py-3 text-xs text-dim">{result.stageTwoRan ? "Askeri varlık sınıfında güvenilir bir tespit bulunmadı." : "Bağlam kapısı kapalı olduğu için YOLO çalıştırılmadı."}</p>}
      </div>
      {result.stageTwoError && <div className="rounded-xl border border-warning/35 bg-warning/10 p-3 text-xs leading-5 text-[#dfc180]">YOLO aşaması tamamlanamadı: {result.stageTwoError}</div>}
      <SaveActions saveState={saveState} savedId={savedId} onSave={onSave} />
    </motion.div>
  );
}

function SaveActions({ saveState, savedId, onSave }: { saveState: "idle" | "saving" | "saved" | "error"; savedId: string; onSave: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-black/10 p-3">
      <Button variant="primary" size="sm" onClick={onSave} disabled={saveState === "saving" || saveState === "saved"}>
        {saveState === "saving" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : saveState === "saved" ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
        {saveState === "saving" ? "Kaydediliyor" : saveState === "saved" ? "Kaydedildi" : "Analizi kaydet"}
      </Button>
      {savedId && <Link href={`/analysis/${savedId}`} className="text-xs font-medium text-accent hover:text-[#f2a06b]">Kayıt detayını aç</Link>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-black/10 p-3"><p className="text-[10px] uppercase tracking-[.12em] text-dim">{label}</p><p className="mt-1 truncate text-xs font-semibold text-ink">{value}</p></div>;
}

function mapPrediction(data: EuroSatApiPrediction, latency: number): Prediction {
  return {
    className: data.prediction_label,
    confidence: data.confidence,
    gatePassed: data.pipeline.stage_1_passed,
    stageTwoRan: data.pipeline.stage_2_ran,
    stageTwoError: data.pipeline.stage_2_error,
    baseDetected: data.pipeline.military_base_detected,
    militaryScore: data.pipeline.military_base_score,
    latency: Math.round(latency),
    modelName: data.model_name,
    ensembleModels: data.ensemble?.model_predictions.map((modelPrediction) => ({
      modelId: modelPrediction.model_id,
      modelName: modelPrediction.model_name,
      predictions: modelPrediction.top_predictions.map((item) => ({ name: item.class_label, probability: item.probability })),
    })),
    aggregatePredictions: data.ensemble?.aggregate_predictions.map((item) => ({ name: item.class_label, probability: item.probability, summedScore: item.summed_score })),
    patches: mapPatches(data.patch_analysis ?? data.ensemble?.model_predictions.find((item) => item.model_id.startsWith("efficientnet_b0"))?.patch_analysis),
    predictions: data.top_predictions.map((item) => ({ name: item.class_label, probability: item.probability })),
    detections: (data.pipeline.yolo?.military_detections ?? []).map((item) => {
      const bbox = item.bbox_xyxy.slice(0, 4) as [number, number, number, number];
      return {
        label: item.class_label,
        confidence: item.confidence,
        bbox,
        box: bbox.map((value) => Math.round(value)).join(", "),
      };
    }),
  };
}

function TopPredictions({ predictions }: { predictions: Prediction["predictions"] }) {
  return <div className="rounded-xl border border-line bg-black/10 p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">İlk 3 bağlam tahmini</p><Badge tone="neutral">EuroSAT</Badge></div><PredictionRows predictions={predictions} /></div>;
}

function EnsemblePredictions({ models, aggregatePredictions }: { models: NonNullable<Prediction["ensembleModels"]>; aggregatePredictions: NonNullable<Prediction["aggregatePredictions"]> }) {
  return (
    <div className="rounded-xl border border-line bg-black/10 p-3">
      <div className="mb-2 flex items-center justify-between"><div><p className="text-xs font-semibold">Model karşılaştırması</p><p className="mt-1 text-[11px] text-dim">Her modelin ilk 3 olasılığı sınıf bazında toplanır.</p></div><Badge tone="accent">Ensemble</Badge></div>
      <div className="mb-2 rounded-xl border border-accent/35 bg-accent/5 p-2.5">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[.14em] text-accent">Birleşik top-3 skorları</p>
        {aggregatePredictions.slice(0, 3).map((item, index) => <div key={item.name} className="flex items-center justify-between border-t border-line py-1.5 text-xs"><span className={index === 0 ? "font-semibold text-ink" : "text-muted"}>{index + 1}. {item.name}</span><span className={index === 0 ? "font-semibold text-accent" : "text-muted"}>{item.summedScore?.toFixed(3)}</span></div>)}
      </div>
      <div className="space-y-2">
        {models.map((model) => (
          <div key={model.modelId} className="rounded-xl border border-line bg-white/[.012] p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2"><p className="truncate text-[11px] font-semibold text-ink">{model.modelName}</p>{model.modelId.startsWith("efficientnet_b0") && <Badge tone="neutral">64px patch</Badge>}</div>
            <PredictionRows predictions={model.predictions} compact />
          </div>
        ))}
      </div>
    </div>
  );
}

function mapPatches(patchAnalysis?: EuroSatApiPrediction["patch_analysis"]): Prediction["patches"] {
  return patchAnalysis?.patches.map((patch) => ({
    label: patch.class_label,
    confidence: patch.confidence,
    bbox: patch.bbox_xyxy.slice(0, 4) as [number, number, number, number],
  }));
}

function PredictionRows({ predictions, compact = false }: { predictions: Prediction["predictions"]; compact?: boolean }) {
  return predictions.slice(0, 3).map((item, index) => (
    <div key={item.name} className={`flex items-center gap-3 border-t border-line text-xs ${compact ? "py-1.5" : "py-2.5"}`}>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/[.045] font-mono text-[10px] text-dim">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.name}</span>
      <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-white/[.055] sm:block"><div className={`h-full rounded-full ${index === 0 ? "bg-accent" : "bg-[#65736d]"}`} style={{ width: `${item.probability * 100}%` }} /></div>
      <span className={index === 0 ? "font-semibold text-accent" : "text-muted"}>{formatPercent(item.probability, 2)}</span>
    </div>
  ));
}
