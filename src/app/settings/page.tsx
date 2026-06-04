"use client";

import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";
import { Check, Database, HardDrive, Save, SlidersHorizontal, Workflow } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Panel, SectionHeading } from "@/components/ui";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">Yapılandırma</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.05em] sm:text-3xl">Model ayarları</h1><p className="mt-2 text-sm text-muted">Sınıflandırma, nesne tespiti ve operasyon akışı varsayılanlarını yönetin.</p></div>
        <Button variant="primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }}>{saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saved ? "Kaydedildi" : "Değişiklikleri kaydet"}</Button>
      </div>
      <Tabs.Root defaultValue="classification">
        <Tabs.List className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
          <Tab value="classification" icon={SlidersHorizontal}>Sınıflandırma</Tab><Tab value="pipeline" icon={Workflow}>Karar hattı</Tab><Tab value="storage" icon={Database}>Kayıt ve arşiv</Tab>
        </Tabs.List>
        <Tabs.Content value="classification" className="mt-4 space-y-4 outline-none">
          <Panel className="p-4 sm:p-5"><SectionHeading title="EuroSAT modeli" description="Arazi bağlamını belirleyen birincil model ve çalışma parametreleri." /><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Varsayılan model"><select className="field"><option>4 Model Ensemble</option><option>ResNet18 TorchScript</option><option>Robust EfficientNet B0</option><option>ConvNeXt Tiny</option><option>EfficientNet B0 TorchScript</option></select></Field><Field label="Girdi boyutu"><select className="field"><option>224 × 224 px</option><option>256 × 256 px</option></select></Field><Field label="Batch boyutu"><input className="field" value="1" readOnly /></Field><Field label="Normalization"><input className="field" value="ImageNet mean / std" readOnly /></Field></div></Panel>
          <Panel className="p-4 sm:p-5"><SectionHeading title="YOLO varlık modeli" description="Bağlam kapısı açıldığında çalıştırılacak nesne tespit modeli." /><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Varsayılan YOLO modeli"><select className="field"><option>YOLO Best PT</option><option>YOLO Best ONNX</option><option>YOLO TorchScript</option></select></Field><Field label="Tespit eşiği"><input className="field" value="0.25" readOnly /></Field></div></Panel>
        </Tabs.Content>
        <Tabs.Content value="pipeline" className="mt-4 space-y-4 outline-none">
          <Panel className="p-4 sm:p-5"><SectionHeading title="İki aşamalı karar hattı" description="YOLO çalıştırılmadan önce değerlendirilen bağlam ve eşik kuralları." /><div className="mt-5 divide-y divide-line"><Toggle title="Koşullu YOLO taraması" description="YOLO yalnızca insan yapımı bağlamlarda devreye girsin." checked /><Toggle title="Manuel doğrulama kuyruğu" description="Pozitif sinyalleri operasyonel karardan önce analiste aktar." checked /><Toggle title="Düşük güven uyarısı" description="%70 altındaki EuroSAT tahminlerini ayrıca işaretle." checked /></div></Panel>
          <Panel className="p-4 sm:p-5"><SectionHeading title="Bağlam kapısı" description="İkinci aşamayı açabilecek EuroSAT sınıfları." /><div className="mt-4 flex flex-wrap gap-2">{["Industrial", "Highway", "Residential"].map((item) => <Badge key={item} tone="accent">{item}</Badge>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Askeri varlık karar eşiği"><input className="field" value="0.45" readOnly /></Field><Field label="Düşük bağlam güven eşiği"><input className="field" value="0.70" readOnly /></Field></div></Panel>
        </Tabs.Content>
        <Tabs.Content value="storage" className="mt-4 space-y-4 outline-none">
          <Panel className="p-4 sm:p-5"><SectionHeading title="Kayıt ve saklama" description="Analiz meta verilerinin saklama ilkeleri." /><div className="mt-5 divide-y divide-line"><Toggle title="Çıktı JSON kayıtları" description="Her analiz için model çıktısını ve pipeline kararını sakla." checked /><Toggle title="Ön izleme görüntüleri" description="İnceleme için düşük çözünürlüklü tile ön izlemesini sakla." checked /><Toggle title="Otomatik arşiv temizliği" description="Saklama süresi dolan eğitim kayıtlarını otomatik kaldır." /></div></Panel>
          <Panel className="flex items-center gap-3 p-4 sm:p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success"><HardDrive className="h-4 w-4" /></div><div><p className="text-xs font-medium">Arşiv alanı sağlıklı</p><p className="mt-1 text-[11px] text-dim">38.4 GB / 120 GB kullanılıyor · son doğrulama 4 dakika önce</p></div></Panel>
        </Tabs.Content>
      </Tabs.Root>
      <style jsx>{`.field { height: 40px; width: 100%; border-radius: 10px; border: 1px solid #2c3935; background: #202a27; padding: 0 12px; color: #eef1e9; font-size: 12px; outline: none; } .field:focus { border-color: #df8953; }`}</style>
    </div>
  );
}

function Tab({ value, icon: Icon, children }: { value: string; icon: typeof Workflow; children: React.ReactNode }) {
  return <Tabs.Trigger value={value} className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs text-muted outline-none transition-colors hover:text-ink data-[state=active]:bg-panel-raised data-[state=active]:text-ink"><Icon className="h-3.5 w-3.5" />{children}</Tabs.Trigger>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-dim">{label}</span>{children}</label>;
}

function Toggle({ title, description, checked }: { title: string; description: string; checked?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="text-xs font-medium">{title}</p><p className="mt-1 text-[11px] leading-5 text-dim">{description}</p></div><Switch.Root defaultChecked={checked} className="relative h-5 w-9 shrink-0 rounded-full bg-[#34423e] transition-colors data-[state=checked]:bg-accent"><Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" /></Switch.Root></div>;
}
