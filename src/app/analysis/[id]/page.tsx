import { ArrowLeft, FileSearch } from "lucide-react";
import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { findAnalysisRecord } from "@/lib/analysis-store";
import { formatPercent } from "@/lib/utils";

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await findAnalysisRecord(id);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/missions" className="mb-3 flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />Analiz kayıtlarına dön</Link>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">Kayıt detayı</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-.05em] sm:text-3xl">{id}</h1>
      </div>
      {record ? (
        <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <Panel className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={record.imageUrl} alt={record.fileName} className="h-[360px] w-full object-cover" />
            <div className="border-t border-line p-4">
              <p className="text-xs font-semibold">{record.fileName}</p>
              <p className="mt-1 text-[11px] text-dim">{new Date(record.capturedAt).toLocaleString("tr-TR")}</p>
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-accent">{record.mode === "pipeline" ? "YOLO entegrasyonu" : "EuroSAT ML 2025"}</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-.04em]">{record.className}</h2>
                  <p className="mt-1 text-xs text-muted">{record.model}</p>
                </div>
                <Badge tone={record.assetCount > 0 ? "warning" : "success"}>{record.assetCount > 0 ? "İncelenecek" : "Temiz"}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Metric label="Güven" value={formatPercent(record.confidence)} />
                <Metric label="YOLO" value={record.yoloRan ? "Çalıştı" : "Atlandı"} />
                <Metric label="Risk" value={formatPercent(record.militaryScore)} />
              </div>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold">İlk tahminler</h2>
              <div className="mt-3 divide-y divide-line">
                {record.predictions.map((prediction) => <div key={prediction.name} className="flex items-center justify-between py-2 text-xs"><span>{prediction.name}</span><span className="font-mono text-muted">{formatPercent(prediction.probability)}</span></div>)}
              </div>
            </Panel>
            <Panel className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold">YOLO tespitleri</h2>
              <div className="mt-3 divide-y divide-line">
                {record.detections.length > 0 ? record.detections.map((detection) => <div key={`${detection.label}-${detection.box}`} className="flex items-center justify-between py-2 text-xs"><span>{detection.label}</span><span className="text-muted">{detection.box}</span><span className="font-mono text-warning">{formatPercent(detection.confidence)}</span></div>) : <p className="py-3 text-xs text-dim">Tespit edilen varlık yok.</p>}
              </div>
            </Panel>
          </div>
        </div>
      ) : (
        <Panel className="flex min-h-[380px] flex-col items-center justify-center px-5 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white/[.025]"><FileSearch className="h-6 w-6 text-dim" /></div>
          <h2 className="mt-4 text-sm font-semibold">Analiz kaydı bulunamadı</h2>
          <p className="mt-1 max-w-md text-xs leading-5 text-dim">Bu ID ile kaydedilmiş analiz bulunamadı.</p>
        </Panel>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-black/10 p-3"><p className="text-[10px] uppercase tracking-[.12em] text-dim">{label}</p><p className="mt-1 truncate text-xs font-semibold text-ink">{value}</p></div>;
}
