# ====================================================================
# COPERNICUS'TAN HER SINIF ICIN 3 EUROSAT FORMATI RESIM INDIR
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
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ============== AYARLAR ==============
OAUTH_CLIENT_ID = os.environ.get("COPERNICUS_CLIENT_ID")
OAUTH_CLIENT_SECRET = os.environ.get("COPERNICUS_CLIENT_SECRET")

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloaded-eurosat")

if not OAUTH_CLIENT_ID or not OAUTH_CLIENT_SECRET:
    raise RuntimeError(
        "COPERNICUS_CLIENT_ID ve COPERNICUS_CLIENT_SECRET ortam degiskenlerini ayarla."
    )
# =====================================

# ====================================================================
# HER EUROSAT SINIFI ICIN 3 HOMOJEN LOKASYON
# ====================================================================
LOCATIONS = [
    # Tarla ve bitki ortusu
    (37.7460, 32.3920, "AnnualCrop", "Konya_Ovasi_1"),
    (41.6470, 26.6040, "AnnualCrop", "Edirne_Tarlalari"),
    (37.0700, 35.4980, "AnnualCrop", "Cukurova_Tarlalari"),
    (40.6680, 31.6820, "Forest", "Bolu_Ormanlari"),
    (37.0310, 28.4290, "Forest", "Mugla_Ormanlari"),
    (41.1460, 42.0670, "Forest", "Artvin_Ormanlari"),
    (39.7560, 37.0570, "HerbaceousVegetation", "Sivas_Stepleri"),
    (38.8220, 33.8320, "HerbaceousVegetation", "Aksaray_Bozkiri"),
    (39.0640, 30.1280, "HerbaceousVegetation", "Afyon_Bozkiri"),
    (40.0980, 41.1340, "Pasture", "Erzurum_Meralari"),
    (39.8020, 41.6050, "Pasture", "Erzurum_Yaylalari"),
    (38.2320, 43.1040, "Pasture", "Van_Meralari"),
    (38.5960, 27.4670, "PermanentCrop", "Manisa_Baglari"),
    (39.1910, 27.8010, "PermanentCrop", "Akhisar_Zeytinlikleri"),
    (37.8460, 27.8790, "PermanentCrop", "Aydin_Bahceleri"),

    # Yapay yuzeyler
    (40.9970, 28.8590, "Residential", "Istanbul_Bahcelievler"),
    (39.9190, 32.8550, "Residential", "Ankara_Cankaya"),
    (38.4300, 27.1500, "Residential", "Izmir_Konak"),
    (40.8270, 29.4230, "Industrial", "Gebze_OSB"),
    (37.9920, 32.5280, "Industrial", "Konya_OSB"),
    (37.0710, 37.3870, "Industrial", "Gaziantep_OSB"),
    (40.8560, 29.3240, "Highway", "TEM_Pendik"),
    (39.8510, 32.7420, "Highway", "Ankara_Cevre_Yolu"),
    (38.5030, 27.1980, "Highway", "Izmir_Otoyolu"),

    # Su yuzeyleri
    (38.7300, 33.3850, "SeaLake", "Tuz_Golu"),
    (38.6200, 42.9100, "SeaLake", "Van_Golu"),
    (37.0900, 27.2100, "SeaLake", "Ege_Denizi"),
    (40.7060, 30.3880, "River", "Sakarya_Nehri"),
    (37.9230, 38.7880, "River", "Firat_Nehri"),
    (41.3380, 36.0600, "River", "Kizilirmak_Deltasi"),
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
