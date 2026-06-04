import { ClassificationWorkbench } from "@/components/classification-workbench";

export default function YoloIntegrationPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">YOLO entegrasyonu</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-.05em] sm:text-3xl">İki aşamalı tespit hattı</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">EuroSAT bağlam kapısından geçen görüntülerde YOLO varlık modelini çalıştırın ve nihai risk kararını ayrı takip edin.</p>
        </div>
      </div>
      <ClassificationWorkbench mode="pipeline" />
    </div>
  );
}
