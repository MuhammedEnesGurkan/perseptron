import { ArrowRight, Check, Radar, ScanLine, ShieldAlert } from "lucide-react";
import { Badge, Dot } from "@/components/ui";
import type { Prediction } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

export function PipelineSummary({ result }: { result: Prediction }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-semibold text-ink">Karar hattı</p><p className="mt-1 text-[11px] text-dim">Bağlam sınıflandırması ve koşullu nesne tespiti</p></div>
        <Badge tone={result.baseDetected ? "danger" : "success"}>{result.baseDetected ? "İnceleme gerekli" : "Sinyal yok"}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <Step icon={Radar} label="EuroSAT" detail={`${result.className} · ${formatPercent(result.confidence)}`} active />
        <ArrowRight className="hidden h-4 w-4 text-dim sm:block" />
        <Step icon={ScanLine} label="Bağlam kapısı" detail={result.gatePassed ? "Açıldı" : "Atlandı"} active={result.gatePassed} />
        <ArrowRight className="hidden h-4 w-4 text-dim sm:block" />
        <Step icon={ShieldAlert} label="YOLO tespiti" detail={`${result.detections.length} varlık · ${formatPercent(result.militaryScore)}`} active={result.stageTwoRan} alert={result.baseDetected} />
      </div>
    </div>
  );
}

function Step({ icon: Icon, label, detail, active, alert }: { icon: typeof Radar; label: string; detail: string; active: boolean; alert?: boolean }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-xl border border-line bg-black/10 p-3">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${alert ? "bg-danger/15 text-danger" : active ? "bg-success/15 text-success" : "bg-white/[.04] text-dim"}`}><Icon className="h-4 w-4" /></div>
      <div><p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[.12em] text-dim">{label}{active && <Check className="h-3 w-3 text-success" />}</p><p className="mt-1 text-xs font-medium text-ink">{detail}</p></div>
    </div>
  );
}
