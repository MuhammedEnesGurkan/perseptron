"""
Ödeme Planı DL Modeli Eğitimi — Gerçek Veri Seti
--------------------------------------------------
train.csv'deki gerçek temerrüt profillerine finansal kural etiketleri
atanarak PlanMLP eğitilir.

Plan sınıfları:
  0 - faiz_indirimi        : yüksek faiz yükü, DTI makul
  1 - hibrit_yapilandirma  : çok yüksek risk, hem faiz hem vade hem tutar
  2 - kefil_teminat        : işsiz/düzensiz gelir + yüksek risk
  3 - kredi_tutari_dusurme : gelire oranla aşırı kredi
  4 - standart_yapilandirma: orta risk, standart profil
  5 - vade_uzatma          : DTI düşük, aylık yük azaltılabilir
"""

import json, joblib, warnings, numpy as np, pandas as pd, torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from pathlib import Path

warnings.filterwarnings("ignore")

ROOT       = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"
DATA_PATH  = ROOT / "kreditveriseti" / "train.csv"

PLAN_LABELS = [
    "faiz_indirimi",
    "hibrit_yapilandirma",
    "kefil_teminat",
    "kredi_tutari_dusurme",
    "standart_yapilandirma",
    "vade_uzatma",
]
FEATURE_COLS = [
    "annual_income", "debt_to_income_ratio", "credit_score",
    "loan_amount", "interest_rate", "default_probability",
    "loan_to_income_monthly",
]


# ─── 1. Gerçek veriyi yükle ve hazırla ────────────────────────────────────────
def load_real_data() -> pd.DataFrame:
    print(f"Veri okunuyor: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)

    # Yalnızca temerrüt edenler
    df = df[df["loan_paid_back"] == 0].copy()
    print(f"Temerrüt kaydı: {len(df):,}")

    # Eksik değerleri doldur
    df["annual_income"].fillna(df["annual_income"].median(), inplace=True)
    df["debt_to_income_ratio"].fillna(df["debt_to_income_ratio"].median(), inplace=True)
    df["credit_score"].fillna(df["credit_score"].median(), inplace=True)
    df["loan_amount"].fillna(df["loan_amount"].median(), inplace=True)
    df["interest_rate"].fillna(df["interest_rate"].median(), inplace=True)

    # Türetilmiş özellikler
    df["loan_to_income_monthly"] = df["loan_amount"] / (df["annual_income"] / 12).clip(lower=1)

    # ML modeli ile default_probability tahmini (gerçek skor)
    pkg = joblib.load(MODELS_DIR / "credit_default_xgb_lgbm_model_package.pkl")
    FEATS = ["annual_income", "debt_to_income_ratio", "credit_score",
             "loan_amount", "interest_rate", "gender", "marital_status",
             "education_level", "employment_status", "loan_purpose", "grade_subgrade"]
    df_feat = df[FEATS].copy()
    transformed = pkg["preprocessor"].transform(df_feat)
    model = pkg["models"]["lightgbm"]
    paid_probs = model.predict_proba(transformed)[:, 1]
    df["default_probability"] = 1 - paid_probs
    print(f"default_probability hesaplandı — ort: {df['default_probability'].mean():.3f}")

    return df


# ─── 2. Finansal kural ile plan etiketi ata ───────────────────────────────────
def assign_plan(row: pd.Series) -> str:
    dp  = row["default_probability"]
    dti = row["debt_to_income_ratio"]
    cs  = row["credit_score"]
    lti = row["loan_to_income_monthly"]
    ir  = row["interest_rate"]
    emp = str(row.get("employment_status", "")).lower()

    # 1) Kefil/teminat — işsiz veya öğrenci + yüksek risk
    if dp >= 0.60 and any(k in emp for k in ["unemployed", "student"]):
        return "kefil_teminat"

    # 2) Hibrit — çok kötü profil: yüksek dp + düşük skor + yüksek DTI
    if dp >= 0.75 and cs < 630 and dti > 0.20:
        return "hibrit_yapilandirma"

    # 3) Faiz indirimi — faiz yüksek, DTI makul, skor orta
    if ir > 14 and dti < 0.22 and dp < 0.85:
        return "faiz_indirimi"

    # 4) Kredi tutarı düşürme — aylık gelire oranla çok yüksek kredi
    if lti > 4.0 and dp >= 0.55:
        return "kredi_tutari_dusurme"

    # 5) Vade uzatma — DTI düşük, ödeme kapasitesi var
    if dti < 0.14 and dp < 0.80:
        return "vade_uzatma"

    # 6) Standart yapılandırma — varsayılan
    return "standart_yapilandirma"


# ─── 3. Model mimarisi ────────────────────────────────────────────────────────
class PlanMLP(nn.Module):
    def __init__(self, input_dim: int, n_classes: int = 6):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 128),       nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.25),
            nn.Linear(128,  64),                            nn.ReLU(), nn.Dropout(0.15),
            nn.Linear(64, n_classes),
        )

    def forward(self, x):
        return self.net(x)


# ─── 4. Eğitim ────────────────────────────────────────────────────────────────
def train(df: pd.DataFrame):
    print("\nPlan dağılımı:")
    print(df["plan"].value_counts().to_string())

    X = df[FEATURE_COLS].values.astype(np.float32)
    le = LabelEncoder()
    le.fit(PLAN_LABELS)
    y = le.transform(df["plan"]).astype(np.int64)

    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    X_tr, X_val, y_tr, y_val = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    print(f"\nEğitim: {len(X_tr):,}  |  Validation: {len(X_val):,}")

    tr_loader = DataLoader(
        TensorDataset(torch.tensor(X_tr), torch.tensor(y_tr)),
        batch_size=1024, shuffle=True,
    )

    model   = PlanMLP(input_dim=X_tr.shape[1])
    opt     = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    sched   = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=50)
    loss_fn = nn.CrossEntropyLoss()

    best_acc, best_state = 0.0, None
    for epoch in range(1, 71):
        model.train()
        for xb, yb in tr_loader:
            opt.zero_grad()
            loss_fn(model(xb), yb).backward()
            opt.step()
        sched.step()

        model.eval()
        with torch.no_grad():
            preds = model(torch.tensor(X_val)).argmax(1).numpy()
        acc = accuracy_score(y_val, preds)
        if acc > best_acc:
            best_acc = acc
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        if epoch % 10 == 0:
            print(f"Epoch {epoch:3d} | val_acc = {acc:.4f}  (best = {best_acc:.4f})")

    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        final_preds = model(torch.tensor(X_val)).argmax(1).numpy()

    present = sorted(set(y_val.tolist()))
    names   = [PLAN_LABELS[i] for i in present]
    print("\nSınıflandırma Raporu (validation):")
    print(classification_report(y_val, final_preds, labels=present, target_names=names))

    meta = {
        "model_name":   "PlanMLP",
        "feature_cols": FEATURE_COLS,
        "plan_labels":  PLAN_LABELS,
        "input_dim":    int(X_tr.shape[1]),
        "n_classes":    6,
        "best_val_acc": float(best_acc),
        "train_size":   int(len(X_tr)),
        "data_source":  "Kaggle Playground S5E11 train.csv — temerrüt eden müşteriler (loan_paid_back=0)",
        "label_method": "Finansal profil kuralları (DTI, kredi skoru, faiz oranı, loan-to-income, istihdam durumu)",
        "note": (
            "Etiketler kural tabanlı atanmıştır çünkü gerçek yeniden yapılandırma "
            "sonuçlarını içeren bir veri seti mevcut değildir. Finansal kurallar "
            "bankacılık literatürüne dayanmaktadır."
        ),
    }
    return model, scaler, le, meta


# ─── 5. Kaydet ────────────────────────────────────────────────────────────────
def save(model, scaler, le, meta):
    torch.save(model.state_dict(), MODELS_DIR / "plan_mlp_model.pt")
    joblib.dump(scaler, MODELS_DIR / "plan_mlp_scaler.pkl")
    joblib.dump(le,     MODELS_DIR / "plan_mlp_encoder.pkl")
    (MODELS_DIR / "plan_mlp_metadata.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("\nKaydedilen dosyalar:")
    for f in ["plan_mlp_model.pt", "plan_mlp_scaler.pkl",
              "plan_mlp_encoder.pkl", "plan_mlp_metadata.json"]:
        size = (MODELS_DIR / f).stat().st_size / 1024
        print(f"  {f}  ({size:.0f} KB)")


# ─── 6. Ana akış ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  PlanMLP — Gerçek Veri ile Yeniden Eğitim")
    print("=" * 55)

    df = load_real_data()
    df["plan"] = df.apply(assign_plan, axis=1)

    print("\n=== Model eğitiliyor... ===")
    model, scaler, le, meta = train(df)

    print("\n=== Kaydediliyor... ===")
    save(model, scaler, le, meta)
    print("\nTamamlandı. ✓")
