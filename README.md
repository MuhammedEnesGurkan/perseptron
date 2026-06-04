# Sentinel Scope - EuroSAT UI

EuroSAT arazi baglami siniflandirmasi ve kosullu YOLO askeri varlik incelemesi icin bagimsiz Next.js arayuzu.

## Calistirma

```bash
npm install
npm run dev
```

Ardindan `http://localhost:3000` adresini acin.

## Ekranlar

- `/`: operasyon ozeti, interaktif goruntu yukleme ve demo analiz akisi
- `/missions`: filtrelenebilir TanStack Table analiz arsivi
- `/analysis/{id}`: kalici arsiv baglandiginda kullanilacak analiz kaydi detayi
- `/settings`: model, karar hatti ve saklama ayarlari

## Model entegrasyonu

Goruntu yukleme alani gercek inference pipeline'ina baglidir. `src/app/api/eurosat-classify/route.ts` rotasi ana projedeki `scripts/inference.py` dosyasini `predict_military_base` aksiyonuyla calistirir.

Pipeline once secilen EuroSAT modeliyle baglam siniflandirmasi yapar. Tahmin `Highway`, `Industrial` veya `Residential` baglamindaysa ya da bu siniflarin toplam guveni esigi geciyorsa secilen YOLO modeli devreye girer. Arayuz modelin gercek sinif, guven, karar ve bounding box ciktilarini gosterir.

Model secim alanindaki `3 Model Ensemble` secenegi ResNet18 TorchScript, ConvNeXt Tiny ve EfficientNet B0 TorchScript modellerini ayni goruntu icin calistirir. Her modelin ilk uc tahmini arayuzde gosterilir. Pipeline, uc modelin birinci tahminleri arasinda en yuksek confidence degerine sahip sonucu kullanir ve YOLO'yu yalnizca bu kazanan baglam icin bir kez calistirir.
