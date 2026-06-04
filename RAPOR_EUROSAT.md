# EuroSAT Uydu Siniflandirma ve Askeri Varlik Tespiti - Rapor Bolumu

## 6.5 EuroSAT Uydu Goruntusu Siniflandirma

Desteklenen EuroSAT siniflari:

- AnnualCrop
- Forest
- HerbaceousVegetation
- Highway
- Industrial
- Pasture
- PermanentCrop
- Residential
- River
- SeaLake

Desteklenen modeller:

| Model ID | Model Dosyasi | Aciklama |
|---|---|---|
| `convnext_tiny` | `best_convnext_tiny_uydu.pth` | ConvNeXt Tiny uydu modeli |
| `resnet18_torchscript` | `best_resnet18_torchscript_uydu.pt` | TorchScript ResNet18 |
| `resnet18_state_dict` | `best_resnet18_state_dict_uydu.pth` | ResNet18 state dict |
| `resnet18_checkpoint` | `best_resnet18_checkpoint_uydu.pth` | ResNet18 checkpoint |
| `efficientnet_b0_torchscript` | `efficientnet_b0_torchscript.pt` | EfficientNet B0 TorchScript |
| `efficientnet_b0_state_dict` | `efficientnet_b0_state_dict.pth` | EfficientNet B0 state dict |
| `efficientnet_b0_full_model` | `efficientnet_b0_full_model.pth` | Tam PyTorch model |
| `efficientnet_b0_augmented_best` | `best_robust_model.pth` | Augmentation ile iyilestirilmis model |

Buraya yaz:

- EuroSAT veri setinin kisa tanimi nedir?
- Neden bu modeller secildi?
- Hangi model en iyi sonucu verdi?
- Accuracy, precision, recall, F1 gibi metrikleri tabloya ekle.

## 6.6 YOLO Askeri Varlik Tespiti

- Model klasoru: `models/yolo models`
- Model dosyalari:
  - `best.pt`
  - `last.pt`
  - `best.onnx`
  - `best.torchscript`
- Varsayilan confidence threshold: 0.25
- Askeri varlik karari icin minimum confidence: 0.45
- Ornek askeri sinif etiketleri: `SMV`, `LMV`, `AFV`, `MCV`

Pipeline mantigi:

1. EuroSAT modeli once uydu goruntusunun baglamini siniflandirir.
2. `Highway`, `Industrial` veya `Residential` gibi askeri varlik bulunmasi daha anlamli olan baglamlarda YOLO calistirilir.
3. YOLO askeri arac/varlik tespit ederse ve confidence 0.45 uzerindeyse sonuc `MILITARY_BASE` olarak yorumlanir.
4. Aksi durumda sonuc `NOT_MILITARY_BASE` olarak verilir.

Buraya yaz:

- YOLO modeli hangi veri setiyle egitildi?
- Sinif isimleri nelerdir?
- Modelin mAP, precision, recall degerleri nedir?
- Yanlis pozitif / yanlis negatif durumlari nasil ele alindi?

## 7.2 Goruntu / Uydu Veri Setleri

- Veri seti adi: [EuroSAT / YOLO veri seti]
- Sinif sayisi: [Yaz]
- Egitim goruntusu sayisi: [Yaz]
- Test goruntusu sayisi: [Yaz]
- Girdi boyutu: 224x224
- Augmentation islemleri:
  - [Resize]
  - [Random crop]
  - [Flip]
  - [Rotation]
  - [Color jitter]
  - [Varsa digerleri]

## 8.2 Egitim Parametreleri (EuroSAT Modelleri)

| Model | Epoch | Batch Size | Learning Rate | Optimizer | Loss |
|---|---:|---:|---:|---|---|
| EfficientNet B0 | [ ] | [ ] | [ ] | [ ] | [ ] |
| ConvNeXt Tiny | [ ] | [ ] | [ ] | [ ] | [ ] |
| YOLO | [ ] | [ ] | [ ] | [ ] | [ ] |

## 8.3 Performans Sonuclari (EuroSAT Modelleri)

| Model | Accuracy | Precision | Recall | F1 | mAP | Not |
|---|---:|---:|---:|---:|---:|---|
| EfficientNet B0 | [ ] | [ ] | [ ] | [ ] | [ ] | EuroSAT |
| ConvNeXt Tiny | [ ] | [ ] | [ ] | [ ] | [ ] | EuroSAT |
| YOLO | [ ] | [ ] | [ ] | [ ] | [ ] | Nesne tespiti |

## 10.2 Uydu Siniflandirma Ornegi

- Yuklenen goruntu: [Yaz]
- Model: [Yaz]
- Tahmin edilen sinif: [Yaz]
- Confidence: [Yaz]
- Top-5 tahmin: [Yaz]

Yorum:

[Sonucu kendi cumlelerinle yorumla.]

## 10.3 YOLO Tespit Ornegi

- Model: [Yaz]
- Tespit edilen siniflar: [Yaz]
- Confidence degerleri: [Yaz]
- Son karar: [MILITARY_BASE / NOT_MILITARY_BASE]

Yorum:

[Sonucu kendi cumlelerinle yorumla.]
