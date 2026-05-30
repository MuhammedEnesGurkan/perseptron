# ====================================================================
# COPERNICUS'TAN 100 EUROSAT FORMATI RESİM İNDİR (MODEL YOK)
# ====================================================================
import requests
import json
import numpy as np
from PIL import Image
import io
import base64
from tqdm import tqdm
import time
import os

# ============== AYARLAR ==============
OAUTH_CLIENT_ID = "sh-94f62be8-a500-4f7e-8ef2-e08a605ec436"        # ← DEĞİŞTİR
OAUTH_CLIENT_SECRET = "7VQBmNss4dWLdMKZmwHNynsJN0qyPmv5" # ← DEĞİŞTİR

OUTPUT_DIR = "/kaggle/working/testimgeurosat"
# =====================================

# ====================================================================
# 100 LOKASYON
# ====================================================================
LOCATIONS = [
    # === SEALAKE (10 adet) ===
    (39.815, 32.879, "SeaLake", "Eymir_Golu"),
    (38.700, 33.400, "SeaLake", "Tuz_Golu_merkez"),
    (38.520, 43.350, "SeaLake", "Van_Golu_merkez"),
    (38.650, 43.000, "SeaLake", "Van_Golu_guney"),
    (40.432, 36.550, "SeaLake", "Samsun_kiyisi"),
    (37.025, 35.320, "SeaLake", "Adana_kiyisi"),
    (36.900, 30.700, "SeaLake", "Antalya_kiyisi"),
    (40.150, 26.410, "SeaLake", "Canakkale_bogazi"),
    (38.415, 27.140, "SeaLake", "Izmir_korfezi"),
    (37.038, 27.428, "SeaLake", "Bodrum_kiyisi"),
    
    # === RIVER (10 adet) ===
    (40.770, 30.380, "River", "Sakarya_Nehri_1"),
    (40.650, 30.520, "River", "Sakarya_Nehri_2"),
    (39.500, 34.700, "River", "Kizilirmak_1"),
    (40.450, 36.200, "River", "Kizilirmak_2"),
    (38.350, 38.310, "River", "Firat_Nehri_1"),
    (37.950, 38.780, "River", "Firat_Nehri_2"),
    (38.715, 39.450, "River", "Munzur_Cayi"),
    (40.920, 39.880, "River", "Coruh_Nehri"),
    (39.820, 32.920, "River", "Ankara_Cayi"),
    (41.020, 28.990, "River", "Istanbul_dere"),
    
    # === FOREST (15 adet) ===
    (40.700, 31.600, "Forest", "Bolu_daglari_1"),
    (40.820, 31.450, "Forest", "Bolu_daglari_2"),
    (40.900, 38.500, "Forest", "Karadeniz_ormanlari_1"),
    (41.100, 39.200, "Forest", "Karadeniz_ormanlari_2"),
    (40.050, 26.320, "Forest", "Canakkale_ormanlari"),
    (39.150, 26.800, "Forest", "Izmir_Manisa_ormanlari"),
    (37.550, 27.200, "Forest", "Mugla_ormanlari"),
    (36.950, 30.550, "Forest", "Antalya_ormanlari"),
    (40.580, 43.080, "Forest", "Artvin_ormanlari"),
    (38.350, 27.050, "Forest", "Aydin_ormanlari"),
    (40.150, 29.100, "Forest", "Bursa_Uludag"),
    (39.750, 30.520, "Forest", "Eskisehir_ormanlari"),
    (41.280, 36.330, "Forest", "Sinop_ormanlari"),
    (40.620, 35.830, "Forest", "Corum_ormanlari"),
    (39.920, 32.850, "Forest", "Ankara_Elmadagi"),
    
    # === ANNUALCROP (15 adet) ===
    (37.870, 32.490, "AnnualCrop", "Konya_Ovasi_1"),
    (37.920, 32.650, "AnnualCrop", "Konya_Ovasi_2"),
    (37.750, 32.350, "AnnualCrop", "Konya_Ovasi_3"),
    (37.000, 35.300, "AnnualCrop", "Cukurova_1"),
    (37.050, 35.450, "AnnualCrop", "Cukurova_2"),
    (39.200, 33.500, "AnnualCrop", "Aksaray_tarlalari"),
    (38.620, 34.720, "AnnualCrop", "Nevsehir_tarlalari"),
    (40.150, 32.550, "AnnualCrop", "Polatli_tarlalari"),
    (39.450, 27.850, "AnnualCrop", "Manisa_Akhisar_tarlalari"),
    (40.850, 29.880, "AnnualCrop", "Tekirdag_tarlalari"),
    (41.680, 26.560, "AnnualCrop", "Edirne_tarlalari"),
    (40.520, 36.880, "AnnualCrop", "Amasya_tarlalari"),
    (39.750, 37.015, "AnnualCrop", "Sivas_tarlalari"),
    (38.950, 40.220, "AnnualCrop", "Elazig_tarlalari"),
    (37.580, 36.920, "AnnualCrop", "Kahramanmaras_tarlalari"),
    
    # === RESIDENTIAL (15 adet) ===
    (40.998, 28.852, "Residential", "Istanbul_Bahcelievler"),
    (41.015, 28.975, "Residential", "Istanbul_Besiktas"),
    (41.080, 29.020, "Residential", "Istanbul_Sariyer"),
    (40.860, 29.380, "Residential", "Istanbul_Pendik"),
    (39.910, 32.860, "Residential", "Ankara_Cankaya"),
    (39.925, 32.854, "Residential", "Ankara_Kizilay"),
    (38.423, 27.142, "Residential", "Izmir_Karsiyaka"),
    (38.418, 27.128, "Residential", "Izmir_Bornova"),
    (37.000, 35.321, "Residential", "Adana_Seyhan"),
    (40.188, 29.061, "Residential", "Bursa_Osmangazi"),
    (41.278, 36.336, "Residential", "Sinop_merkez"),
    (37.875, 32.495, "Residential", "Konya_merkez"),
    (38.733, 35.485, "Residential", "Kayseri_merkez"),
    (39.933, 41.268, "Residential", "Erzurum_merkez"),
    (38.350, 38.310, "Residential", "Elazig_merkez"),
    
    # === INDUSTRIAL (12 adet) ===
    (40.990, 29.150, "Industrial", "Istanbul_OSB_Tuzla"),
    (40.800, 29.430, "Industrial", "Gebze_OSB"),
    (41.040, 28.870, "Industrial", "Istanbul_Ikitelli"),
    (40.770, 29.920, "Industrial", "Corlu_OSB"),
    (38.690, 35.560, "Industrial", "Kayseri_OSB"),
    (37.950, 32.560, "Industrial", "Konya_OSB"),
    (38.450, 27.200, "Industrial", "Izmir_Menemen_OSB"),
    (40.220, 29.020, "Industrial", "Bursa_OSB"),
    (37.060, 37.380, "Industrial", "Gaziantep_OSB"),
    (41.010, 39.720, "Industrial", "Trabzon_OSB"),
    (39.750, 30.520, "Industrial", "Eskisehir_OSB"),
    (36.820, 34.640, "Industrial", "Mersin_OSB"),
    
    # === HIGHWAY (10 adet) ===
    (40.770, 30.000, "Highway", "TEM_Bolu_1"),
    (40.730, 31.610, "Highway", "TEM_Bolu_2"),
    (40.850, 29.350, "Highway", "TEM_Istanbul"),
    (40.200, 29.050, "Highway", "Bursa_otoyolu"),
    (39.850, 32.750, "Highway", "Ankara_cevre_yolu"),
    (38.500, 27.200, "Highway", "Izmir_otoyolu"),
    (37.100, 37.320, "Highway", "Gaziantep_otoyolu"),
    (41.650, 26.580, "Highway", "Edirne_otoyolu"),
    (36.950, 35.280, "Highway", "Adana_otoyolu"),
    (40.950, 39.750, "Highway", "Trabzon_otoyolu"),
    
    # === PERMANENTCROP (8 adet) ===
    (38.620, 27.430, "PermanentCrop", "Manisa_baglari_1"),
    (38.550, 27.350, "PermanentCrop", "Manisa_baglari_2"),
    (40.180, 28.870, "PermanentCrop", "Bursa_meyve_bahceleri"),
    (37.050, 27.430, "PermanentCrop", "Mugla_zeytinlikleri"),
    (39.450, 27.850, "PermanentCrop", "Akhisar_zeytinlikleri"),
    (36.900, 30.700, "PermanentCrop", "Antalya_narenciye"),
    (37.850, 27.850, "PermanentCrop", "Aydin_incir_bahceleri"),
    (40.750, 30.400, "PermanentCrop", "Sakarya_findik_bahceleri"),
    
    # === PASTURE (5 adet) ===
    (40.200, 41.100, "Pasture", "Erzurum_yaylalari"),
    (39.950, 41.380, "Pasture", "Erzurum_mera_2"),
    (38.350, 38.900, "Pasture", "Tunceli_yaylalari"),
    (37.550, 43.350, "Pasture", "Van_yaylalari"),
    (40.620, 43.150, "Pasture", "Artvin_yaylalari"),
    
    # === ZOR ÖRNEKLER (10 adet) ===
    (41.010, 28.980, "Residential", "Istanbul_Fatih_yol_carpitma"),
    (40.860, 29.320, "Highway", "Pendik_otoyol_kesisme"),
    (39.920, 32.840, "Residential", "Ankara_Kizilay_trafik"),
    (38.430, 27.150, "Residential", "Izmir_Konak_karisik"),
    (40.200, 29.070, "Industrial", "Bursa_karisik_sanayi"),
    (37.870, 32.490, "AnnualCrop", "Konya_tarla_yol_karisimi"),
    (40.770, 30.100, "Highway", "Bolu_dag_gecidi_karisik"),
    (38.690, 35.490, "Industrial", "Kayseri_organize_konut"),
    (41.040, 28.960, "Residential", "Istanbul_Eyup_karisik"),
    (39.750, 37.020, "HerbaceousVegetation", "Sivas_step_bozuk"),
]

print(f"📍 Toplam {len(LOCATIONS)} lokasyon hazır\n")

# ====================================================================
# OAuth Token al
# ====================================================================
def get_oauth_token(client_id, client_secret):
    """OAuth Client Credentials ile token al"""
    url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    
    credentials = f"{client_id}:{client_secret}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {encoded_credentials}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    data = {"grant_type": "client_credentials"}
    
    response = requests.post(url, headers=headers, data=data)
    
    if response.status_code == 200:
        token_data = response.json()
        expires_in = token_data.get('expires_in', 3600)
        print(f"✅ Token alındı ({expires_in}s geçerli)\n")
        return token_data["access_token"], expires_in
    else:
        raise Exception(f"❌ OAuth token alınamadı: {response.status_code}\n{response.text}")

# ====================================================================
# Sentinel-2 resim çek
# ====================================================================
def get_sentinel_image(lat, lon, width_m=640, height_m=640, token=None):
    """EuroSAT formatında Sentinel-2 L2A görüntüsü çek (64x64, 640m×640m)"""
    delta_lat = (height_m / 2) / 111000
    delta_lon = (width_m / 2) / (111000 * np.cos(np.radians(lat)))
    
    bbox = [lon - delta_lon, lat - delta_lat, lon + delta_lon, lat + delta_lat]
    
    url = "https://sh.dataspace.copernicus.eu/api/v1/process"
    
    payload = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {
                        "from": "2024-01-01T00:00:00Z",
                        "to": "2024-12-31T23:59:59Z"
                    },
                    "maxCloudCoverage": 30,
                    "mosaickingOrder": "leastCC"
                }
            }]
        },
        "output": {
            "width": 64,
            "height": 64,
            "responses": [{"identifier": "default", "format": {"type": "image/png"}}]
        },
        "evalscript": """
            //VERSION=3
            function setup() {
                return {
                    input: ["B04", "B03", "B02"],
                    output: { bands: 3, sampleType: "AUTO" }
                };
            }
            function evaluatePixel(sample) {
                return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
            }
        """
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        return np.array(Image.open(io.BytesIO(response.content)))
    else:
        return None

# ====================================================================
# Ana indirme döngüsü
# ====================================================================
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("🔑 OAuth token alınıyor...")
token, expires_in = get_oauth_token(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET)

print(f"📥 {len(LOCATIONS)} lokasyondan Sentinel-2 resimleri indiriliyor...\n")

success_count = 0
fail_count = 0
token_refresh_counter = 0
start_time = time.time()

# CSV dosyası oluştur
import csv
csv_path = f"{OUTPUT_DIR}/metadata.csv"
csv_file = open(csv_path, 'w', newline='', encoding='utf-8')
csv_writer = csv.writer(csv_file)
csv_writer.writerow(['idx', 'filename', 'lat', 'lon', 'expected_class', 'name', 'status'])

for idx, (lat, lon, expected, name) in enumerate(tqdm(LOCATIONS, desc="İndiriliyor")):
    # Token yenileme kontrolü
    token_refresh_counter += 1
    elapsed = time.time() - start_time
    
    if token_refresh_counter > 50 or elapsed > (expires_in - 300):
        print("\n🔄 Token yenileniyor...")
        token, expires_in = get_oauth_token(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET)
        token_refresh_counter = 0
        start_time = time.time()
    
    # Resim çek
    img = get_sentinel_image(lat, lon, token=token)
    
    filename = f"{idx:03d}_{expected}_{name}.png"
    
    if img is not None:
        save_path = f"{OUTPUT_DIR}/{filename}"
        Image.fromarray(img).save(save_path)
        success_count += 1
        csv_writer.writerow([idx, filename, lat, lon, expected, name, 'success'])
    else:
        fail_count += 1
        csv_writer.writerow([idx, filename, lat, lon, expected, name, 'failed'])
    
    # Her 20 resimde progress göster
    if (idx + 1) % 20 == 0:
        print(f"\n📊 {idx+1}/{len(LOCATIONS)} | İndirilen: {success_count} | Başarısız: {fail_count}")

csv_file.close()

# ====================================================================
# Özet rapor
# ====================================================================
print("\n" + "=" * 80)
print("📊 İNDİRME RAPORU")
print("=" * 80)
print(f"\n✅ Başarıyla indirilen: {success_count}/{len(LOCATIONS)}")
print(f"❌ İndirilemedi (bulut/veri yok): {fail_count}/{len(LOCATIONS)}")
print(f"\n💾 Klasör: {OUTPUT_DIR}/")
print(f"📄 Metadata: {csv_path}")
print(f"\n📝 Dosya formatı: XXX_SınıfAdı_LokasyonAdı.png")
print(f"   Örnek: 000_SeaLake_Eymir_Golu.png")
print("\n✅ İndirme tamamlandı!")
print("\nŞimdi bu klasörü test hücresinde kullanabilirsin:")
print(f'TEST_FOLDER = "{OUTPUT_DIR}"')