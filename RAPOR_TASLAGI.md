# Proje Rapor Taslagi

> Bu dosya raporu yazarken doldurman icin hazirlandi. Koseli parantezli alanlari kendi proje bilgilerin, deney sonuclari, ekran goruntuleri ve yorumlarinla degistir.

## 1. Kapak Bilgileri

- Proje adi: [Perseptron / proje adini yaz]
- Ders / konu: [Ders adi ve proje konusu]
- Hazirlayan: [Ad Soyad]
- Numara: [Ogrenci numarasi]
- Tarih: [Rapor tarihi]
- Danisman / ogretim elemani: [Varsa yaz]

## 2. Ozet

Bu projede [projenin temel amacini 3-5 cumleyle acikla]. Sistem, kredi basvurulari icin temerrut riskini tahmin eden makine ogrenmesi modelleri ile uydu/goruntu verileri uzerinden siniflandirma ve nesne tespiti yapan derin ogrenme modellerini bir web arayuzu uzerinden kullanilabilir hale getirmektedir.

Kisa ozet yazarken su sorulara cevap ver:

- Proje hangi problemi cozuyor?
- Hangi veri turleri kullaniliyor?
- Hangi modeller kullanildi?
- Sistem kullaniciya hangi ciktilari veriyor?
- Elde edilen en onemli sonuc nedir?

## 3. G&#305;ri&#351;

### 3.1 Problem Tanimi

[Buraya projenin cozdugu problemi yaz. Ornek: Kredi basvurularinda temerrut riskinin erken tahmin edilmesi, banka icin riskli musterilerin belirlenmesi ve uygun geri odeme planlarinin onerilmesi.]

### 3.2 Projenin Amaci

Bu projenin amaci:

- [Amac 1: Ornek, kredi temerrut riskini tahmin etmek]
- [Amac 2: Ornek, risk seviyesine gore karar mekanizmasi olusturmak]
- [Amac 3: Ornek, uydu goruntulerini siniflandirmak]
- [Amac 4: Ornek, askeri varlik / bolge tespitini model pipeline'i ile desteklemek]
- [Amac 5: Ornek, tum modeli web arayuzunden kullanilabilir hale getirmek]

### 3.3 Kapsam

Proje asagidaki modulleri kapsamaktadir:

- Dashboard genel bakis ekrani
- Musteri risk analizi
- Geri odeme / recovery plan onerisi
- Toplu musteri analizi
- Model icgoru ekranlari
- ResNet18 goruntu siniflandirma testi
- EuroSAT uydu goruntusu siniflandirma ve YOLO destekli askeri varlik tespit pipeline'i

## 4. Kullanilan Teknolojiler

### 4.1 Frontend Teknolojileri

| Teknoloji | Kullanim Amaci |
|---|---|
| Next.js 16.2.6 | Web uygulamasi ve API route yapisi |
| React 19.2.4 | Kullanici arayuzu bilesenleri |
| TypeScript | Tip guvenli frontend ve backend route kodlari |
| Tailwind CSS 4 | Stil ve responsive tasarim |
| shadcn / Base UI | UI bilesenleri |
| lucide-react | Ikonlar |
| Recharts | Grafik ve dashboard gorsellestirme |

### 4.2 Backend ve Entegrasyon

| Teknoloji | Kullanim Amaci |
|---|---|
| Next.js API Routes | Web arayuzu ile model inference katmani arasinda HTTP API |
| Node.js child_process | Python inference scriptini calistirma |
| Python | Model yukleme, veri isleme ve tahmin islemleri |
| JSON | Frontend ve Python inference arasinda veri alisverisi |

### 4.3 Python ve Makine Ogrenmesi Kutuphaneleri

| Kutuphane | Kullanim Amaci |
|---|---|
| joblib | Scikit-learn tarzinda kaydedilmis model/preprocessor paketlerini yukleme |
| numpy | Sayisal islemler |
| pandas | Tablo verisini DataFrame formatinda isleme |
| Pillow | Yuklenen goruntuleri acma ve RGB formata cevirme |
| torch | PyTorch modellerini yukleme ve inference |
| torchvision | ResNet18 ve EfficientNet mimarileri |
| timm | ConvNeXt Tiny modeli |
| ultralytics | YOLO modeli ile nesne tespiti |
| onnx / onnxruntime | ONNX model formatlari icin destek |

## 5. Sistem Mimarisi

### 5.1 Genel Akis

Sistem genel olarak su adimlarla calisir:

1. Kullanici web arayuzunde form doldurur veya goruntu yukler.
2. Frontend ilgili Next.js API endpoint'ine istek gonderir.
3. API route, `src/lib/modelInference.ts` icindeki `runInference` fonksiyonunu kullanarak `scripts/inference.py` scriptini baslatir.
4. Python scripti gelen JSON verisini okur, ilgili modeli yukler ve tahmin yapar.
5. Tahmin sonucu JSON olarak API route'a geri doner.
6. Frontend sonucu kullaniciya risk skoru, sinif etiketi, karar, grafik veya onerilen plan olarak gosterir.

### 5.2 Temel Dosya ve Klasorler

| Dosya / Klasor | Gorev |
|---|---|
| `src/app` | Next.js sayfalari ve route yapisi |
| `src/app/api` | API endpoint'leri |
| `src/lib/modelInference.ts` | TypeScript tarafindan Python inference scriptini calistiran yardimci katman |
| `scripts/inference.py` | Tum model yukleme ve tahmin fonksiyonlari |
| `models` | Egitilmis model dosyalari |
| `public` | Statik dosyalar |
| `requirements.txt` | Python bagimliliklari |
| `package.json` | JavaScript/TypeScript bagimliliklari |

### 5.3 API Endpointleri

| Endpoint | Amac |
|---|---|
| `/api/predict-default` | Tek musteri icin kredi temerrut tahmini |
| `/api/batch-predict` | Birden fazla musteri icin toplu tahmin |
| `/api/recommend-plan` | Risk sonucuna gore geri odeme / recovery plan onerisi |
| `/api/resnet-classify` | ResNet18 ile genel goruntu siniflandirma |
| `/api/eurosat-classify` | EuroSAT uydu siniflandirma ve askeri bolge pipeline'i |
| `/api/ai/recommendation-chat` | AI asistan cevap katmani; mevcut durumda mock yanit uretmektedir |

## 6. Kullanilan Modeller

### 6.1 Kredi Temerrut Tahmini - ML Model Paketi

- Model dosyasi: `models/credit_default_xgb_lgbm_model_package.pkl`
- Kullanilan yaklasim: [XGBoost / LightGBM veya paketteki model isimlerini yaz]
- Girdi ozellikleri:
  - `annual_income`
  - `debt_to_income_ratio`
  - `credit_score`
  - `loan_amount`
  - `interest_rate`
  - `gender`
  - `marital_status`
  - `education_level`
  - `employment_status`
  - `loan_purpose`
  - `grade_subgrade`
- Cikti:
  - Geri odeme olasiligi
  - Temerrut olasiligi
  - Risk bandi: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
  - Karar: `APPROVE`, `MANUAL_REVIEW`, `SEND_TO_AI_RECOVERY_PLANNING`, `REJECT`

Buraya yaz:

- Model hangi veri setiyle egitildi?
- Veri setinde kac satir ve kac ozellik vardi?
- Hangi on isleme adimlari kullanildi?
- Model performansi nedir? Accuracy, F1, AUC gibi metrikleri ekle.

### 6.2 Kredi Temerrut Tahmini - PyTorch MLP

- Model dosyasi: `models/credit_default_mlp_model.pt`
- Preprocessor dosyasi: `models/credit_default_mlp_preprocessor.pkl`
- Metadata dosyasi: `models/credit_default_mlp_metadata.pkl`
- Mimari:
  - Linear 256
  - BatchNorm
  - ReLU
  - Dropout 0.30
  - Linear 128
  - BatchNorm
  - ReLU
  - Dropout 0.25
  - Linear 64
  - ReLU
  - Dropout 0.15
  - Linear 1
- Aktivasyon / cikti: Sigmoid ile geri odeme olasiligi

Buraya yaz:

- MLP neden kullanildi?
- ML modelleriyle karsilastirildiginda avantaji/dezavantaji nedir?
- Egitim parametreleri nelerdir? Epoch, batch size, learning rate vb.

### 6.3 Recovery Plan Oneri Mekanizmasi

Bu bolumde klasik bir egitilmis modelden ziyade kural tabanli ve model skoru destekli bir karar mekanizmasi kullanilmaktadir.

Kullanilan girdiler:

- ML modelinden gelen temerrut olasiligi
- MLP modelinden gelen odeme olasiligi
- Kredi tutari
- Yillik gelir
- Faiz orani
- Borc/gelir orani

Onerilen plan etiketleri:

- `HYBRID_RESTRUCTURE`
- `EXTEND_TERM_LOWER_INSTALLMENT`
- `DEBT_CONSOLIDATION_RESTRUCTURE`
- `STANDARD_APPROVAL`

Buraya yaz:

- Bu kurallar hangi mantikla belirlendi?
- Musteri ve banka acisindan beklenen fayda nedir?
- Onerilen vade/faiz degisikligi nasil yorumlanmalidir?

### 6.4 ResNet18 Goruntu Siniflandirma

- Model dosyasi: `models/best_resnet18_torchscript.pt`
- Format: TorchScript
- Girdi boyutu: 224x224
- Normalizasyon: ImageNet mean/std
- Cikti: Sinif indeksi, sinif etiketi, confidence ve top-5 tahmin

Buraya yaz:

- Model hangi veri setinde egitildi?
- Kac sinif vardir?
- Sinif isimleri hangi dosyada tutuluyor? Varsa `models/resnet_classes.json`.
- Test sonuclari nelerdir?

### 6.5 EuroSAT Uydu Goruntusu Siniflandirma

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

### 6.6 YOLO Askeri Varlik Tespiti

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

## 7. Veri Setleri

### 7.1 Kredi Veri Seti

- Veri seti adi: [Yaz]
- Kaynak: [Kaggle, acik veri, sentetik veri vb.]
- Satir sayisi: [Yaz]
- Ozellik sayisi: [Yaz]
- Hedef degisken: [Yaz]
- Veri temizleme adimlari:
  - [Eksik veri islemleri]
  - [Kategorik degisken encoding]
  - [Sayisal olcekleme]
  - [Train/test ayrimi]

### 7.2 Goruntu / Uydu Veri Setleri

- Veri seti adi: [EuroSAT / BHW / YOLO veri seti]
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

## 8. Model Egitimi ve Degerlendirme

### 8.1 Deney Ortami

- Isletim sistemi: [Windows / Linux / macOS]
- Python surumu: [Yaz]
- Node.js surumu: [Yaz]
- GPU / CPU: [Yaz]
- Kullanilan frameworkler: PyTorch, torchvision, timm, ultralytics

### 8.2 Egitim Parametreleri

| Model | Epoch | Batch Size | Learning Rate | Optimizer | Loss |
|---|---:|---:|---:|---|---|
| MLP | [ ] | [ ] | [ ] | [ ] | [ ] |
| ResNet18 | [ ] | [ ] | [ ] | [ ] | [ ] |
| EfficientNet B0 | [ ] | [ ] | [ ] | [ ] | [ ] |
| ConvNeXt Tiny | [ ] | [ ] | [ ] | [ ] | [ ] |
| YOLO | [ ] | [ ] | [ ] | [ ] | [ ] |

### 8.3 Performans Sonuclari

| Model | Accuracy | Precision | Recall | F1 | AUC / mAP | Not |
|---|---:|---:|---:|---:|---:|---|
| LightGBM / XGBoost | [ ] | [ ] | [ ] | [ ] | [ ] | Kredi riski |
| PyTorch MLP | [ ] | [ ] | [ ] | [ ] | [ ] | Kredi riski |
| ResNet18 | [ ] | [ ] | [ ] | [ ] | [ ] | Goruntu siniflandirma |
| EfficientNet B0 | [ ] | [ ] | [ ] | [ ] | [ ] | EuroSAT |
| ConvNeXt Tiny | [ ] | [ ] | [ ] | [ ] | [ ] | EuroSAT |
| YOLO | [ ] | [ ] | [ ] | [ ] | [ ] | Nesne tespiti |

### 8.4 Hata Analizi

[Buraya modellerin hangi durumlarda hata yaptigini yaz.]

Ornek basliklar:

- Dusuk kredi skoru ama yuksek gelirli musterilerde karar belirsizligi
- Benzer uydu siniflari arasinda karisiklik: `Industrial` - `Residential`, `River` - `SeaLake`
- Kucuk askeri araclarin dusuk cozunurlukte tespit edilememesi
- YOLO confidence threshold seciminin sonuca etkisi

## 9. Web Uygulamasi

### 9.1 Arayuz Sayfalari

| Sayfa | Aciklama |
|---|---|
| Overview | Genel metrikler ve risk dagilimi |
| Customer Risk Analysis | Tek musteri icin kredi risk tahmini |
| Recovery Plan | Riskli musteriler icin geri odeme plani |
| Batch Analysis | Coklu musteri verisi uzerinden toplu analiz |
| Model Insights | Model sonuc ve metriklerinin incelenmesi |
| BHW ResNet Class Test | ResNet18 ile goruntu siniflandirma |
| Military Base Detection Pipeline | EuroSAT + YOLO pipeline'i |

### 9.2 Kullanici Akisi

[Buraya kullanicinin sistemi nasil kullandigini adim adim yaz.]

Ornek:

1. Kullanici kredi risk analizi sayfasina gider.
2. Gelir, kredi skoru, borc/gelir orani ve kredi bilgilerini girer.
3. Sistem ML modeliyle temerrut olasiligini hesaplar.
4. Risk `HIGH` veya `CRITICAL` ise recovery plan sayfasina yonlendirme yapilir.
5. Sistem musteri icin alternatif odeme plani onerir.

## 10. Ornek Sonuclar

### 10.1 Kredi Risk Tahmini Ornegi

- Yillik gelir: [Yaz]
- Borc/gelir orani: [Yaz]
- Kredi skoru: [Yaz]
- Kredi tutari: [Yaz]
- Model: [Yaz]
- Temerrut olasiligi: [Yaz]
- Risk bandi: [Yaz]
- Karar: [Yaz]

Yorum:

[Sonucu kendi cumlelerinle yorumla.]

### 10.2 Uydu Siniflandirma Ornegi

- Yuklenen goruntu: [Yaz]
- Model: [Yaz]
- Tahmin edilen sinif: [Yaz]
- Confidence: [Yaz]
- Top-5 tahmin: [Yaz]

Yorum:

[Sonucu kendi cumlelerinle yorumla.]

### 10.3 YOLO Tespit Ornegi

- Model: [Yaz]
- Tespit edilen siniflar: [Yaz]
- Confidence degerleri: [Yaz]
- Son karar: [MILITARY_BASE / NOT_MILITARY_BASE]

Yorum:

[Sonucu kendi cumlelerinle yorumla.]

## 11. Guvenilirlik, Limitasyonlar ve Etik Degerlendirme

### 11.1 Limitasyonlar

- Model performansi egitim verisinin kalitesine baglidir.
- Kredi riski tahminleri tek basina nihai karar mekanizmasi olarak kullanilmamalidir.
- Uydu goruntulerinde cozunurluk, bulutluluk, goruntu acisi ve mevsimsel farkliliklar sonucu etkileyebilir.
- YOLO tespitlerinde yanlis pozitif ve yanlis negatif durumlari olabilir.
- Mevcut AI chat endpoint'i gercek LLM entegrasyonu yerine mock yanit uretmektedir.

### 11.2 Etik Konular

[Buraya kredi kararlarinda adalet, veri gizliligi, aciklanabilirlik ve insan denetimi gerekliligi hakkinda yorum yaz.]

Ele alinabilecek noktalar:

- Finansal kararlarin sadece model sonucuna birakilmamasi
- Demografik degiskenlerin ayrimcilik riski
- Kullanici verilerinin gizliligi
- Askeri/uydu analizlerinde yanlis alarm riskleri
- Son kararda insan denetimi gerekliligi

## 12. Sonuc

Bu projede [kisa genel sonuc yaz]. Gelistirilen sistem, farkli veri turleri icin birden fazla yapay zeka modelini tek bir web uygulamasi altinda birlestirmektedir. Kredi riski tarafinda model sonucuna gore risk bandi ve geri odeme plani uretilebilirken, goruntu tarafinda ResNet18, EfficientNet, ConvNeXt ve YOLO tabanli analizler yapilabilmektedir.

Gelecekte yapilabilecek iyilestirmeler:

- Model metriklerinin arayuzde daha ayrintili gosterilmesi
- Gercek LLM entegrasyonu ile aciklama ve sohbet modulunun gelistirilmesi
- Model versiyonlama ve deney takip sistemi eklenmesi
- Daha genis veri setleriyle egitim
- Explainable AI yontemleri: SHAP, Grad-CAM vb.
- Kullanici rolleri ve yetkilendirme

## 13. Kaynakca

Kaynaklari IEEE, APA veya hocanin istedigi formata gore duzenle.

- Next.js Documentation: https://nextjs.org/docs
- React Documentation: https://react.dev
- PyTorch Documentation: https://pytorch.org/docs
- Torchvision Models: https://pytorch.org/vision/stable/models.html
- Ultralytics YOLO Documentation: https://docs.ultralytics.com
- EuroSAT Dataset: [Kullandigin kaynagi yaz]
- LightGBM / XGBoost kaynaklari: [Kullandigin kaynagi yaz]
- [Kullandigin makale, Kaggle veri seti, GitHub repo veya dokumanlari ekle]

## 14. Ekler

### Ek A - Kurulum Komutlari

```bash
npm install
pip install -r requirements.txt
npm run dev
```

### Ek B - Proje Calistirma

```bash
npm run dev
```

Tarayicida ac:

```text
http://localhost:3000
```

### Ek C - Ekran Goruntuleri

Buraya rapora koyacagin ekran goruntulerini ekle:

- Dashboard ekran goruntusu
- Kredi risk tahmini ekran goruntusu
- Recovery plan ekran goruntusu
- Batch analiz ekran goruntusu
- ResNet siniflandirma ekran goruntusu
- EuroSAT / YOLO pipeline ekran goruntusu

