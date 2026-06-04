import { ClassificationWorkbench } from "@/components/classification-workbench";

export default function EuroSatMl2025Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">EuroSAT ML 2025</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-.05em] sm:text-3xl">Arazi sınıflandırma çalışma alanı</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">EuroSAT projesine ait model karşılaştırması, sınıf tahmini ve güven skorlarını YOLO entegrasyonundan ayrı inceleyin.</p>
        </div>
      </div>
      <ClassificationWorkbench mode="eurosat" />
    </div>
  );
}
