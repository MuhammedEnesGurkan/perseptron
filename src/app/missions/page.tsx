import { Download, Plus } from "lucide-react";
import { MissionsTable } from "@/components/missions-table";
import { Button } from "@/components/ui";
import { readAnalysisRecords } from "@/lib/analysis-store";

export default async function MissionsPage() {
  const missions = await readAnalysisRecords();
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">Kayıt yönetimi</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.05em] sm:text-3xl">Analiz arşivi</h1><p className="mt-2 text-sm text-muted">İşlenen tile'ları, model çıktılarını ve manuel doğrulama durumlarını yönetin.</p></div>
        <div className="flex gap-2"><Button><Download className="h-4 w-4" />CSV dışa aktar</Button><Button variant="primary"><Plus className="h-4 w-4" />Yeni analiz</Button></div>
      </div>
      <MissionsTable data={missions} />
    </div>
  );
}
