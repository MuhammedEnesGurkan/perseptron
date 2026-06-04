import { ArrowUpRight, FileClock, Radar, ScanLine } from "lucide-react";
import Link from "next/link";
import { MissionsTable } from "@/components/missions-table";
import { Panel } from "@/components/ui";
import { readAnalysisRecords } from "@/lib/analysis-store";

export default async function DashboardPage() {
  const missions = await readAnalysisRecords();
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">31 Mayıs 2026 · Operasyon vardiyası</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.05em] sm:text-3xl">Uydu sınıflandırma merkezi</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">EuroSAT arazi bağlamını sınıflandırın, insan yapımı bölgelerde askeri varlık sinyallerini ikinci aşamada inceleyin.</p></div>
        <Link href="/missions" className="flex items-center gap-2 text-xs font-medium text-accent hover:text-[#f2a06b]">Tüm analiz kayıtlarını aç <ArrowUpRight className="h-4 w-4" /></Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link href="/eurosat-ml-2025" className="group block">
          <Panel className="h-full p-5 transition-colors group-hover:border-accent/60">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white/[.025] text-accent"><Radar className="h-5 w-5" /></div>
            <h2 className="mt-4 text-base font-semibold">EuroSAT ML 2025 projesi</h2>
            <p className="mt-2 text-xs leading-5 text-muted">Arazi bağlamı sınıflandırması, model seçimi, top-3 tahminler ve patch analizi bu sayfada ayrı yönetilir.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-accent">Sayfayı aç <ArrowUpRight className="h-3.5 w-3.5" /></span>
          </Panel>
        </Link>
        <Link href="/yolo-integration" className="group block">
          <Panel className="h-full p-5 transition-colors group-hover:border-accent/60">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white/[.025] text-accent"><ScanLine className="h-5 w-5" /></div>
            <h2 className="mt-4 text-base font-semibold">YOLO entegrasyonu</h2>
            <p className="mt-2 text-xs leading-5 text-muted">EuroSAT bağlam kapısı, YOLO modeli seçimi, askeri varlık tespiti ve nihai karar hattı bu sayfada çalışır.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-accent">Sayfayı aç <ArrowUpRight className="h-3.5 w-3.5" /></span>
          </Panel>
        </Link>
      </div>
      {missions.length === 0 && (
        <Panel className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-white/[.025]"><FileClock className="h-5 w-5 text-dim" /></div>
          <h2 className="mt-4 text-sm font-semibold">Henüz kaydedilmiş analiz yok</h2>
          <p className="mt-1 max-w-md text-xs leading-5 text-dim">EuroSAT veya YOLO sayfasında analiz yaptıktan sonra sonucu kaydedin; arşiv ve detay sayfaları burada dolacak.</p>
        </Panel>
      )}
      <MissionsTable data={missions.slice(0, 5)} compact />
    </div>
  );
}
