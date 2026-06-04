import json
import sys
import warnings
import base64
import contextlib
import io
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from torch import nn
from PIL import Image
try:
    import timm
except ImportError:
    timm = None
try:
    from torchvision import models as torchvision_models
except ImportError:
    torchvision_models = None


ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"
FEATURES = [
    "annual_income",
    "debt_to_income_ratio",
    "credit_score",
    "loan_amount",
    "interest_rate",
    "gender",
    "marital_status",
    "education_level",
    "employment_status",
    "loan_purpose",
    "grade_subgrade",
]
NUMERIC_FEATURES = [
    "annual_income",
    "debt_to_income_ratio",
    "credit_score",
    "loan_amount",
    "interest_rate",
]


warnings.filterwarnings("ignore", category=UserWarning)

RESNET_INPUT_SIZE = 224
RESNET_MODEL_FILE = "best_resnet18_torchscript.pt"
RESNET_CLASS_FILE = "resnet_classes.json"
SATELLITE_MODEL_FILE = "best_convnext_tiny_uydu.pth"
SATELLITE_INPUT_SIZE = 224
SATELLITE_TILE_SIZE = 64
SATELLITE_TILE_BATCH_SIZE = 32
SATELLITE_ENSEMBLE_MODEL_IDS = (
    "resnet18_torchscript",
    "convnext_tiny",
    "efficientnet_b0_torchscript",
)
EUROSAT_CLASS_LABELS = [
    "AnnualCrop",
    "Forest",
    "HerbaceousVegetation",
    "Highway",
    "Industrial",
    "Pasture",
    "PermanentCrop",
    "Residential",
    "River",
    "SeaLake",
]
IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
IMAGENET_STD = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
SATELLITE_MODELS = {
    "convnext_tiny": {
        "model_file": "best_convnext_tiny_uydu.pth",
        "model_name": "EuroSAT ConvNeXt Tiny",
        "loader": "convnext_tiny",
    },
    "resnet18_torchscript": {
        "model_file": "best_resnet18_torchscript_uydu.pt",
        "model_name": "EuroSAT ResNet18 TorchScript",
        "loader": "torchscript",
    },
    "resnet18_state_dict": {
        "model_file": "best_resnet18_state_dict_uydu.pth",
        "model_name": "EuroSAT ResNet18 State Dict",
        "loader": "resnet18_state_dict",
    },
    "resnet18_checkpoint": {
        "model_file": "best_resnet18_checkpoint_uydu.pth",
        "model_name": "EuroSAT ResNet18 Checkpoint",
        "loader": "resnet18_state_dict",
    },
    "efficientnet_b0_torchscript": {
        "model_file": "efficientnet_b0_torchscript.pt",
        "model_name": "EuroSAT EfficientNet B0 TorchScript",
        "loader": "torchscript",
    },
    "efficientnet_b0_state_dict": {
        "model_file": "efficientnet_b0_state_dict.pth",
        "model_name": "EuroSAT EfficientNet B0 State Dict",
        "loader": "efficientnet_b0_state_dict",
    },
    "efficientnet_b0_full_model": {
        "model_file": "efficientnet_b0_full_model.pth",
        "model_name": "EuroSAT EfficientNet B0 Full Model",
        "loader": "full_model",
    },
    # Robust/augmented model — single entry, no duplicate
    "efficientnet_b0_robust": {
        "model_file": "best_robust_model.pth",
        "model_name": "EuroSAT EfficientNet B0 Robust (Augmented)",
        "loader": "efficientnet_b0_state_dict",
    },
}
YOLO_MODEL_DIR = MODELS_DIR / "yolo models"
YOLO_MODEL_FILE = "best.pt"
YOLO_MODELS = {
    "best_pt": {
        "model_file": "best.pt",
        "model_name": "YOLO Best PyTorch",
    },
    "last_pt": {
        "model_file": "last.pt",
        "model_name": "YOLO Last PyTorch",
    },
    "best_onnx": {
        "model_file": "best.onnx",
        "model_name": "YOLO Best ONNX",
    },
    "best_torchscript": {
        "model_file": "best.torchscript",
        "model_name": "YOLO Best TorchScript",
    },
}
MILITARY_CONTEXT_LABELS = {"Highway", "Industrial", "Residential"}
DEFAULT_CONTEXT_THRESHOLD = 0.50
DEFAULT_CONTEXT_TILE_THRESHOLD = 0.70
DEFAULT_YOLO_THRESHOLD = 0.25
MIN_MILITARY_ASSET_CONFIDENCE = 0.45
MILITARY_ASSET_LABELS = {"SMV", "LMV", "AFV", "MCV"}
VEHICLE_KEYWORDS = (
    "aircraft",
    "airplane",
    "apc",
    "armored",
    "army",
    "artillery",
    "cannon",
    "fighter",
    "helicopter",
    "howitzer",
    "jet",
    "military",
    "missile",
    "mlrs",
    "radar",
    "sam",
    "soldier",
    "tank",
    "truck",
    "vehicle",
    "warship",
)

# Process-level model cache: populated during the lifetime of one inference call.
# Helps ensemble (3 models loaded once) and batch (ML/DL packages loaded once).
_MODEL_CACHE: dict = {}


def _cached(key: str, loader_fn):
    if key not in _MODEL_CACHE:
        _MODEL_CACHE[key] = loader_fn()
    return _MODEL_CACHE[key]


def _extract_state_dict(state: dict) -> dict:
    if isinstance(state, dict):
        return state.get("model_state_dict") or state.get("state_dict") or state.get("model") or state
    return state


class PlanMLP(nn.Module):
    """Temerrüt riski yüksek müşteriler için ödeme planı öneren DL modeli."""
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


class CreditMLP(nn.Module):
    def __init__(self, input_dim: int):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.25),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(64, 1),
        )

    def forward(self, x):
        return self.network(x)


def normalize_record(record: dict) -> dict:
    normalized = {}
    for feature in FEATURES:
        value = record.get(feature)
        if feature in NUMERIC_FEATURES:
            normalized[feature] = float(value) if value not in (None, "") else np.nan
        else:
            normalized[feature] = str(value) if value not in (None, "") else ""
    return normalized


def frame_from_records(records):
    if isinstance(records, dict):
        records = [records]
    return pd.DataFrame([normalize_record(record) for record in records], columns=FEATURES)


def risk_band(default_probability: float) -> str:
    if default_probability >= 0.75:
        return "CRITICAL"
    if default_probability >= 0.50:
        return "HIGH"
    if default_probability >= 0.25:
        return "MEDIUM"
    return "LOW"


def decision_for(default_probability: float) -> str:
    band = risk_band(default_probability)
    if band == "CRITICAL":
        return "REJECT"
    if band == "HIGH":
        return "SEND_TO_AI_RECOVERY_PLANNING"
    if band == "MEDIUM":
        return "MANUAL_REVIEW"
    return "APPROVE"


def load_ml_package():
    return _cached("ml_package", lambda: joblib.load(MODELS_DIR / "credit_default_xgb_lgbm_model_package.pkl"))


def predict_ml(records, model_name=None):
    package = load_ml_package()
    selected_model_name = model_name or package.get("default_model") or "lightgbm"
    is_combined_model = selected_model_name in {"combined", "combined_model", "ensemble"}
    if not is_combined_model and selected_model_name not in package["models"]:
        raise ValueError(f"Unknown model_name '{selected_model_name}'")

    df = frame_from_records(records)
    transformed = package["preprocessor"].transform(df)
    if is_combined_model:
        model_probabilities = [
            model.predict_proba(transformed)[:, 1]
            for model in package["models"].values()
        ]
        paid_probs = np.mean(model_probabilities, axis=0)
        selected_model_name = "combined"
    else:
        model = package["models"][selected_model_name]
        paid_probs = model.predict_proba(transformed)[:, 1]
    threshold = float(package.get("threshold_paid", 0.65))

    results = []
    for paid_probability in paid_probs:
        paid_probability = float(paid_probability)
        default_probability = float(1 - paid_probability)
        prediction = int(paid_probability >= threshold)
        prediction_label = package.get("class_mapping", {}).get(prediction, "paid_back" if prediction else "default_or_not_paid_back")
        band = risk_band(default_probability)
        results.append(
            {
                "paid_back_probability": paid_probability,
                "default_probability": default_probability,
                "prediction": prediction,
                "prediction_label": prediction_label,
                "model_name": selected_model_name,
                "risk_band": band,
                "ml_default_target": int(default_probability >= 0.50),
                "decision": decision_for(default_probability),
                "confidence": max(paid_probability, default_probability),
            }
        )
    return results


def load_dl_model():
    def _load():
        metadata = joblib.load(MODELS_DIR / "credit_default_mlp_metadata.pkl")
        model = CreditMLP(int(metadata["input_dim"]))
        state = torch.load(MODELS_DIR / "credit_default_mlp_model.pt", map_location="cpu", weights_only=True)
        model.load_state_dict(state)
        model.eval()
        preprocessor = joblib.load(MODELS_DIR / "credit_default_mlp_preprocessor.pkl")
        return model, preprocessor, metadata

    return _cached("dl_model", _load)


def load_plan_model():
    def _load():
        meta = json.loads((MODELS_DIR / "plan_mlp_metadata.json").read_text(encoding="utf-8"))
        model = PlanMLP(input_dim=int(meta["input_dim"]), n_classes=int(meta["n_classes"]))
        state = torch.load(MODELS_DIR / "plan_mlp_model.pt", map_location="cpu", weights_only=True)
        model.load_state_dict(state)
        model.eval()
        scaler  = joblib.load(MODELS_DIR / "plan_mlp_scaler.pkl")
        encoder = joblib.load(MODELS_DIR / "plan_mlp_encoder.pkl")
        return model, scaler, encoder, meta

    return _cached("plan_model", _load)


def predict_plan(record: dict, default_probability: float, payment_probability: float) -> dict:
    """DL modeli ile ödeme planı tahmini yapar."""
    model, scaler, encoder, meta = load_plan_model()
    feature_cols = meta["feature_cols"]

    annual_income = float(record.get("annual_income") or 0)
    loan_amount   = float(record.get("loan_amount") or 0)
    monthly_income = annual_income / 12 if annual_income > 0 else 1.0

    row = {
        "annual_income":          annual_income,
        "debt_to_income_ratio":   float(record.get("debt_to_income_ratio") or 0),
        "credit_score":           float(record.get("credit_score") or 600),
        "loan_amount":            loan_amount,
        "interest_rate":          float(record.get("interest_rate") or 10),
        "default_probability":    default_probability,
        "loan_to_income_monthly": loan_amount / monthly_income,
    }

    x = np.array([[row[c] for c in feature_cols]], dtype=np.float32)
    x = scaler.transform(x)
    tensor = torch.tensor(x)

    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1).cpu().numpy()[0]

    top_idx   = int(np.argmax(probs))
    plan_label = encoder.classes_[top_idx]

    top_plans = [
        {"plan": encoder.classes_[i], "probability": float(probs[i])}
        for i in np.argsort(-probs)[:3]
    ]

    return {
        "recommended_plan":       plan_label,
        "plan_confidence":        float(probs[top_idx]),
        "top_plans":              top_plans,
        "model":                  "PlanMLP",
    }


def predict_dl(records):
    model, preprocessor, metadata = load_dl_model()
    df = frame_from_records(records)
    transformed = preprocessor.transform(df)
    if hasattr(transformed, "toarray"):
        transformed = transformed.toarray()
    tensor = torch.tensor(transformed, dtype=torch.float32)
    with torch.no_grad():
        logits = model(tensor).reshape(-1)
        paid_probs = torch.sigmoid(logits).cpu().numpy()

    threshold = float(metadata.get("threshold_paid", 0.65))
    results = []
    for paid_probability in paid_probs:
        paid_probability = float(paid_probability)
        default_probability = float(1 - paid_probability)
        prediction = int(paid_probability >= threshold)
        results.append(
            {
                "payment_probability": paid_probability,
                "paid_back_probability": paid_probability,
                "default_probability": default_probability,
                "prediction": prediction,
                "prediction_label": metadata.get("class_mapping", {}).get(prediction, "paid_back" if prediction else "default_or_not_paid_back"),
                "model_name": metadata.get("model_name", "CreditMLPSafe"),
                "risk_band": risk_band(default_probability),
            }
        )
    return results


def _recommendation_from_results(record: dict, ml: dict, dl: dict) -> dict:
    """
    DL modeli (PlanMLP) ile ödeme planı üretir.
    ML → temerrüt olasılığı, CreditMLP → ödeme olasılığı,
    PlanMLP → 6 plan sınıfından birini önerir.
    """
    payment_probability = dl["payment_probability"]
    default_probability = ml["default_probability"]
    loan_amount   = float(record.get("loan_amount", 0) or 0)
    annual_income = float(record.get("annual_income", 0) or 0)
    interest_rate = float(record.get("interest_rate", 0) or 0)

    # ── PlanMLP ile ödeme planı tahmini ──────────────────────────────────────
    plan_result = predict_plan(record, default_probability, payment_probability)
    plan_label  = plan_result["recommended_plan"]

    # Plan etiketine göre finansal parametreler
    PLAN_PARAMS = {
        "faiz_indirimi":         {"term": 48, "rate_delta": -4.0, "reduction": 0.20},
        "hibrit_yapilandirma":   {"term": 72, "rate_delta": -3.5, "reduction": 0.35},
        "kefil_teminat":         {"term": 60, "rate_delta": -2.0, "reduction": 0.25},
        "kredi_tutari_dusurme":  {"term": 48, "rate_delta": -1.5, "reduction": 0.30},
        "standart_yapilandirma": {"term": 48, "rate_delta": -1.5, "reduction": 0.18},
        "vade_uzatma":           {"term": 60, "rate_delta":  0.0, "reduction": 0.15},
    }
    params    = PLAN_PARAMS.get(plan_label, PLAN_PARAMS["standart_yapilandirma"])
    term      = params["term"]
    rate_delta = params["rate_delta"]
    reduction  = params["reduction"]

    recommended_rate = max(4.0, interest_rate + rate_delta)
    monthly_rate = recommended_rate / 100 / 12
    if monthly_rate > 0 and term > 0:
        payment = loan_amount * monthly_rate / (1 - (1 + monthly_rate) ** (-term))
    else:
        payment = loan_amount / max(term, 1)

    affordability = float(np.clip((annual_income / 12) / max(payment, 1) / 6, 0, 1))
    recovery_probability = float(np.clip((payment_probability * 0.75) + (affordability * 0.25), 0, 1))
    bank_value = float(np.clip(recovery_probability * (1 - reduction * 0.35), 0, 1))

    return {
        "recommended_plan_label":     plan_label,
        "plan_confidence":            plan_result["plan_confidence"],
        "top_plans":                  plan_result["top_plans"],
        "recommended_interest_rate":  round(recommended_rate, 2),
        "recommended_term_months":    term,
        "recommended_monthly_payment": round(payment, 2),
        "payment_reduction_ratio":    round(reduction, 4),
        "customer_affordability_score": round(affordability, 4),
        "expected_recovery_probability": round(recovery_probability, 4),
        "expected_bank_value_index":  round(bank_value, 4),
        "plan_success_label":         int(recovery_probability >= 0.65),
        "dl_payment_probability":     round(payment_probability, 6),
        "ml_default_probability":     round(default_probability, 6),
        "plan_model":                 "PlanMLP",
        "ai_explanation": (
            f"{ml.get('model_name', 'ML modeli')} temerrüt riskini %{default_probability * 100:.1f} olarak tahmin etti. "
            f"CreditMLP ödeme olasılığını %{payment_probability * 100:.1f} olarak belirledi. "
            f"PlanMLP müşteri profiline göre '{plan_label}' planını önerdi "
            f"(%{plan_result['plan_confidence'] * 100:.0f} güven)."
        ),
    }


def recommendation(record):
    ml = predict_ml(record, record.get("model_name"))[0]
    dl = predict_dl(record)[0]
    return _recommendation_from_results(record, ml, dl)


def batch(records, model_name=None):
    # Run ML and DL inference once for all records, then compute recommendations
    # without triggering additional model loads per customer.
    ml_results = predict_ml(records, model_name)
    dl_results = predict_dl(records)
    rows = []
    distribution = {}
    for idx, (record, ml, dl) in enumerate(zip(records, ml_results, dl_results), start=1):
        plan = _recommendation_from_results(record, ml, dl)
        label = plan["recommended_plan_label"]
        distribution[label] = distribution.get(label, 0) + 1
        rows.append(
            {
                "customer_id": record.get("customer_id", idx),
                "default_probability": ml["default_probability"],
                "paid_back_probability": ml["paid_back_probability"],
                "risk_band": ml["risk_band"],
                "recommended_plan_label": label,
                "expected_recovery_probability": plan["expected_recovery_probability"],
                "expected_bank_value_index": plan["expected_bank_value_index"],
                "dl_payment_probability": dl["payment_probability"],
            }
        )

    total = len(rows)
    return {
        "total_customers": total,
        "high_risk_customers": sum(1 for row in rows if row["risk_band"] in ("HIGH", "CRITICAL")),
        "average_default_probability": float(np.mean([row["default_probability"] for row in rows])) if rows else 0,
        "average_expected_recovery_probability": float(np.mean([row["expected_recovery_probability"] for row in rows])) if rows else 0,
        "average_bank_value_index": float(np.mean([row["expected_bank_value_index"] for row in rows])) if rows else 0,
        "recommended_plans_distribution": distribution,
        "results": rows,
    }


def load_resnet_model(model_file=RESNET_MODEL_FILE):
    return _cached(f"torchscript:{model_file}", lambda: _load_torchscript(model_file))


def _load_torchscript(model_file):
    model = torch.jit.load(MODELS_DIR / model_file, map_location="cpu")
    model.eval()
    return model


def load_convnext_tiny_model(model_file=SATELLITE_MODEL_FILE, num_classes=len(EUROSAT_CLASS_LABELS)):
    if timm is None:
        raise ImportError("ConvNeXt Tiny inference requires the Python package 'timm'. Install it with: python -m pip install timm")

    def _load():
        model = timm.create_model("convnext_tiny", pretrained=False, num_classes=num_classes)
        state = torch.load(MODELS_DIR / model_file, map_location="cpu", weights_only=True)
        model.load_state_dict(_extract_state_dict(state))
        model.eval()
        return model

    return _cached(f"convnext_tiny:{model_file}:{num_classes}", _load)


def load_resnet18_state_dict_model(model_file, num_classes=len(EUROSAT_CLASS_LABELS)):
    if torchvision_models is None:
        raise ImportError("ResNet18 state-dict inference requires torchvision. Install it with: python -m pip install torchvision")

    def _load():
        model = torchvision_models.resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        state = torch.load(MODELS_DIR / model_file, map_location="cpu", weights_only=True)
        model.load_state_dict(_extract_state_dict(state))
        model.eval()
        return model

    return _cached(f"resnet18_state_dict:{model_file}:{num_classes}", _load)


def load_efficientnet_b0_state_dict_model(model_file, num_classes=len(EUROSAT_CLASS_LABELS)):
    if torchvision_models is None:
        raise ImportError("EfficientNet B0 state-dict inference requires torchvision. Install it with: python -m pip install torchvision")

    def _load():
        model = torchvision_models.efficientnet_b0(weights=None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
        state = torch.load(MODELS_DIR / model_file, map_location="cpu", weights_only=True)
        model.load_state_dict(_extract_state_dict(state))
        model.eval()
        return model

    return _cached(f"efficientnet_b0_state_dict:{model_file}:{num_classes}", _load)


def load_full_torch_model(model_file):
    return _cached(f"full_model:{model_file}", lambda: _load_full(model_file))


def _load_full(model_file):
    model = torch.load(MODELS_DIR / model_file, map_location="cpu", weights_only=False)
    model.eval()
    return model


def load_resnet_classes(num_classes: int, class_file=RESNET_CLASS_FILE, fallback_labels=None):
    class_path = MODELS_DIR / class_file
    if class_path.exists():
        labels = json.loads(class_path.read_text(encoding="utf-8"))
        if isinstance(labels, dict):
            return [str(labels.get(str(idx), labels.get(idx, f"class_{idx:03d}"))) for idx in range(num_classes)], True
        if isinstance(labels, list):
            return [str(labels[idx]) if idx < len(labels) else f"class_{idx:03d}" for idx in range(num_classes)], True
    if fallback_labels and len(fallback_labels) >= num_classes:
        return [str(fallback_labels[idx]) for idx in range(num_classes)], True
    return [f"class_{idx:03d}" for idx in range(num_classes)], False


def normalized_image_tensor(image, input_size=RESNET_INPUT_SIZE):
    image = image.resize((input_size, input_size), Image.Resampling.BILINEAR)
    array = np.asarray(image).astype(np.float32) / 255.0
    tensor = torch.from_numpy(array).permute(2, 0, 1)
    return (tensor - IMAGENET_MEAN) / IMAGENET_STD


def image_from_base64(image_base64: str):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def image_tensor_from_base64(image_base64: str, input_size=RESNET_INPUT_SIZE):
    image = image_from_base64(image_base64)
    return normalized_image_tensor(image, input_size).unsqueeze(0)


def tile_axis_positions(length: int, tile_size: int):
    if length <= tile_size:
        return [0]
    positions = list(range(0, length - tile_size + 1, tile_size))
    final_position = length - tile_size
    if positions[-1] != final_position:
        positions.append(final_position)
    return positions


def tiled_image_tensors_from_base64(image_base64: str, input_size: int, tile_size: int):
    image = image_from_base64(image_base64)
    x_positions = tile_axis_positions(image.width, tile_size)
    y_positions = tile_axis_positions(image.height, tile_size)
    boxes = [
        (left, top, min(left + tile_size, image.width), min(top + tile_size, image.height))
        for top in y_positions
        for left in x_positions
    ]
    tiles = [image.crop(box) for box in boxes]
    tensors = torch.stack([normalized_image_tensor(tile, input_size) for tile in tiles])
    return tensors, {
        "strategy": "tile_majority_vote",
        "tile_size": tile_size,
        "tile_count": len(tiles),
        "source_width": image.width,
        "source_height": image.height,
    }, boxes


def average_model_probabilities(model, tensors, batch_size=SATELLITE_TILE_BATCH_SIZE):
    probability_sum = None
    probability_max = None
    probability_batches = []
    with torch.no_grad():
        for offset in range(0, tensors.shape[0], batch_size):
            logits = model(tensors[offset : offset + batch_size])
            if isinstance(logits, (tuple, list)):
                logits = logits[0]
            if logits.ndim == 1:
                logits = logits.unsqueeze(0)
            probabilities = torch.softmax(logits, dim=1)
            probability_batches.append(probabilities)
            batch_sum = probabilities.sum(dim=0)
            probability_sum = batch_sum if probability_sum is None else probability_sum + batch_sum
            batch_max = probabilities.max(dim=0).values
            probability_max = batch_max if probability_max is None else torch.maximum(probability_max, batch_max)
    return probability_sum / tensors.shape[0], probability_max, torch.cat(probability_batches)


def predict_image_model(
    data,
    model_file,
    model_name,
    input_size=RESNET_INPUT_SIZE,
    class_file=RESNET_CLASS_FILE,
    fallback_labels=None,
    dataset=None,
    model_loader=load_resnet_model,
    model_id=None,
    tile_size=None,
):
    image_base64 = data.get("image_base64") if isinstance(data, dict) else None
    if not image_base64:
        raise ValueError("image_base64 is required")

    model = model_loader(model_file)
    if tile_size:
        tensors, inference, tile_boxes = tiled_image_tensors_from_base64(image_base64, input_size, tile_size)
    else:
        tensors = image_tensor_from_base64(image_base64, input_size)
        inference = {"strategy": "single_image_resize", "tile_count": 1}
        tile_boxes = None
    mean_probabilities, max_probabilities, tile_probabilities = average_model_probabilities(model, tensors)
    if tile_boxes and tensors.shape[0] > 1:
        vote_counts = torch.bincount(tile_probabilities.argmax(dim=1), minlength=tile_probabilities.shape[1])
        probabilities = vote_counts.float() / tensors.shape[0]
    else:
        probabilities = mean_probabilities
    top_probs, top_indices = torch.topk(probabilities, k=min(5, probabilities.numel()))
    tile_max_probs, tile_max_indices = torch.topk(max_probabilities, k=min(5, max_probabilities.numel()))

    labels, labels_available = load_resnet_classes(int(probabilities.numel()), class_file, fallback_labels)
    top_predictions = []
    for probability, index in zip(top_probs.cpu().tolist(), top_indices.cpu().tolist()):
        top_predictions.append(
            {
                "class_index": int(index),
                "class_label": labels[int(index)],
                "probability": float(probability),
            }
        )
    tile_max_predictions = []
    for probability, index in zip(tile_max_probs.cpu().tolist(), tile_max_indices.cpu().tolist()):
        tile_max_predictions.append(
            {
                "class_index": int(index),
                "class_label": labels[int(index)],
                "probability": float(probability),
            }
        )
    patch_analysis = None
    if tile_boxes:
        patch_analysis = {
            "patch_size": tile_size,
            "image_width": inference["source_width"],
            "image_height": inference["source_height"],
            "total_patches": len(tile_boxes),
            "aggregation": "majority_vote",
            "patches": [],
        }
        for box, patch_probabilities in zip(tile_boxes, tile_probabilities):
            confidence, index = torch.max(patch_probabilities, dim=0)
            patch_analysis["patches"].append(
                {
                    "class_index": int(index.item()),
                    "class_label": labels[int(index.item())],
                    "confidence": float(confidence.item()),
                    "bbox_xyxy": list(box),
                }
            )

    best = top_predictions[0]
    result = {
        "model_name": model_name,
        "model_id": model_id,
        "model_file": model_file,
        "input_size": input_size,
        "num_classes": int(probabilities.numel()),
        "prediction": best["class_index"],
        "prediction_label": best["class_label"],
        "confidence": best["probability"],
        "class_labels_available": labels_available,
        "top_predictions": top_predictions,
        "tile_max_predictions": tile_max_predictions,
        "inference": inference,
    }
    if patch_analysis:
        result["patch_analysis"] = patch_analysis
    if dataset:
        result["dataset"] = dataset
    return result


def predict_resnet(data):
    return predict_image_model(data, RESNET_MODEL_FILE, "ResNet18 TorchScript")


def _resolve_satellite_model(model_id: str) -> tuple[dict, str]:
    """Return (model_config, resolved_model_id), falling back to resnet18_torchscript if file missing."""
    if model_id not in SATELLITE_MODELS:
        valid = ", ".join(SATELLITE_MODELS.keys())
        raise ValueError(f"Unsupported satellite model_id '{model_id}'. Valid options: {valid}")
    cfg = SATELLITE_MODELS[model_id]
    if not (MODELS_DIR / cfg["model_file"]).exists():
        model_id = "resnet18_torchscript"
        cfg = SATELLITE_MODELS[model_id]
    return cfg, model_id


def _loader_for(loader_name: str):
    if loader_name == "convnext_tiny":
        return load_convnext_tiny_model
    if loader_name == "resnet18_state_dict":
        return load_resnet18_state_dict_model
    if loader_name == "efficientnet_b0_state_dict":
        return load_efficientnet_b0_state_dict_model
    if loader_name == "full_model":
        return load_full_torch_model
    return load_resnet_model


def predict_satellite(data):
    selected_model_id = data.get("model_id", "resnet18_torchscript") if isinstance(data, dict) else "resnet18_torchscript"
    cfg, selected_model_id = _resolve_satellite_model(selected_model_id)
    return predict_image_model(
        data,
        cfg["model_file"],
        cfg["model_name"],
        input_size=SATELLITE_INPUT_SIZE,
        class_file="eurosat_classes.json",
        fallback_labels=EUROSAT_CLASS_LABELS,
        dataset="EuroSAT",
        model_loader=_loader_for(cfg["loader"]),
        model_id=selected_model_id,
        tile_size=SATELLITE_TILE_SIZE,
    )


def predict_satellite_ensemble(data):
    model_predictions = [
        predict_satellite({**data, "model_id": model_id})
        for model_id in SATELLITE_ENSEMBLE_MODEL_IDS
    ]
    aggregate_scores = np.zeros(len(EUROSAT_CLASS_LABELS), dtype=np.float64)
    for prediction in model_predictions:
        for item in prediction["top_predictions"][:3]:
            aggregate_scores[item["class_index"]] += item["probability"]

    total_score = float(aggregate_scores.sum()) or 1.0
    aggregate_predictions = [
        {
            "class_index": int(index),
            "class_label": EUROSAT_CLASS_LABELS[int(index)],
            "probability": float(aggregate_scores[index] / total_score),
            "summed_score": float(aggregate_scores[index]),
        }
        for index in np.argsort(-aggregate_scores)
    ]
    best = aggregate_predictions[0]
    efficientnet_prediction = next(
        prediction for prediction in model_predictions if prediction["model_id"] == "efficientnet_b0_torchscript"
    )
    return {
        "dataset": "EuroSAT",
        "model_name": "EuroSAT 3 Model Ensemble",
        "model_id": "ensemble_top3_sum",
        "model_file": ", ".join(prediction["model_file"] for prediction in model_predictions),
        "input_size": SATELLITE_INPUT_SIZE,
        "num_classes": len(EUROSAT_CLASS_LABELS),
        "prediction": best["class_index"],
        "prediction_label": best["class_label"],
        "confidence": best["probability"],
        "class_labels_available": True,
        "top_predictions": aggregate_predictions[:5],
        "tile_max_predictions": efficientnet_prediction["tile_max_predictions"],
        "inference": {
            "strategy": "ensemble_top3_sum",
            "model_count": len(model_predictions),
        },
        "ensemble": {
            "strategy": "top_3_class_probability_sum",
            "selected_class_label": best["class_label"],
            "selected_class_score": best["summed_score"],
            "aggregate_predictions": aggregate_predictions,
            "model_predictions": model_predictions,
        },
    }


def load_yolo_model(model_file=YOLO_MODEL_FILE):
    def _load():
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                from ultralytics import YOLO
        except ImportError:
            raise ImportError("YOLO inference requires the Python package 'ultralytics'. Install it with: python -m pip install ultralytics")
        with contextlib.redirect_stdout(io.StringIO()):
            return YOLO(str(YOLO_MODEL_DIR / model_file))

    return _cached(f"yolo:{model_file}", _load)


def is_military_detection(label: str):
    if label.upper() in MILITARY_ASSET_LABELS:
        return True
    normalized = label.lower().replace("-", " ").replace("_", " ")
    return any(keyword in normalized for keyword in VEHICLE_KEYWORDS)


def predict_yolo_military(data, model_file=None, confidence_threshold=DEFAULT_YOLO_THRESHOLD):
    image_base64 = data.get("image_base64") if isinstance(data, dict) else None
    if not image_base64:
        raise ValueError("image_base64 is required")

    selected_model_id = data.get("yolo_model_id", "best_pt") if isinstance(data, dict) else "best_pt"
    if model_file is None:
        if selected_model_id not in YOLO_MODELS:
            valid_models = ", ".join(YOLO_MODELS.keys())
            raise ValueError(f"Unsupported yolo_model_id '{selected_model_id}'. Valid options: {valid_models}")
        selected_model = YOLO_MODELS[selected_model_id]
        model_file = selected_model["model_file"]
        model_name = selected_model["model_name"]
    else:
        model_name = "YOLO Military Asset Detector"

    model = load_yolo_model(model_file)
    image = image_from_base64(image_base64)
    with contextlib.redirect_stdout(io.StringIO()):
        yolo_results = model.predict(image, conf=confidence_threshold, verbose=False)
    names = getattr(model, "names", {}) or {}

    detections = []
    military_detections = []
    for result in yolo_results:
        boxes = getattr(result, "boxes", None)
        if boxes is None:
            continue
        for box in boxes:
            class_index = int(box.cls.item())
            confidence = float(box.conf.item())
            xyxy = [float(value) for value in box.xyxy[0].tolist()]
            label = str(names.get(class_index, f"class_{class_index}"))
            detection = {
                "class_index": class_index,
                "class_label": label,
                "confidence": confidence,
                "bbox_xyxy": xyxy,
                "is_military_asset": is_military_detection(label),
            }
            detections.append(detection)
            if detection["is_military_asset"]:
                military_detections.append(detection)

    best_military_confidence = max((item["confidence"] for item in military_detections), default=0.0)
    return {
        "model_name": model_name,
        "model_id": selected_model_id,
        "model_file": str(Path("yolo models") / model_file),
        "confidence_threshold": confidence_threshold,
        "detections": detections,
        "military_detections": military_detections,
        "military_asset_detected": bool(military_detections),
        "military_asset_confidence": best_military_confidence,
    }


def military_base_score(vehicle_confidence: float):
    return float(np.clip(vehicle_confidence, 0, 1))


def military_base_prediction(satellite, data):
    context_label = satellite["prediction_label"]
    best_context_prediction = max(
        (item for item in satellite["top_predictions"] if item["class_label"] in MILITARY_CONTEXT_LABELS),
        key=lambda item: item["probability"],
        default=None,
    )
    context_confidence = float(sum(item["probability"] for item in satellite["top_predictions"] if item["class_label"] in MILITARY_CONTEXT_LABELS))
    best_tile_context_prediction = max(
        (item for item in satellite["tile_max_predictions"] if item["class_label"] in MILITARY_CONTEXT_LABELS),
        key=lambda item: item["probability"],
        default=None,
    )
    tile_context_confidence = float(best_tile_context_prediction["probability"]) if best_tile_context_prediction else 0.0
    context_matches = (
        context_label in MILITARY_CONTEXT_LABELS
        or context_confidence >= DEFAULT_CONTEXT_THRESHOLD
        or tile_context_confidence >= DEFAULT_CONTEXT_TILE_THRESHOLD
    )

    yolo = None
    yolo_error = None
    vehicle_confidence = 0.0
    if context_matches:
        try:
            yolo = predict_yolo_military(data)
            vehicle_confidence = float(yolo["military_asset_confidence"])
        except Exception as error:
            yolo_error = str(error)

    has_reliable_military_asset = bool(yolo and yolo["military_asset_detected"] and vehicle_confidence >= MIN_MILITARY_ASSET_CONFIDENCE)
    score = military_base_score(vehicle_confidence) if yolo else 0.0
    is_military_base = bool(context_matches and has_reliable_military_asset)

    return {
        **satellite,
        "pipeline": {
            "name": "satellite_context_then_yolo_military_asset",
            "decision_authority": "YOLO",
            "stage_1_context_labels": sorted(MILITARY_CONTEXT_LABELS),
            "stage_1_passed": context_matches,
            "stage_1_context_score": context_confidence,
            "stage_1_best_context_label": best_context_prediction["class_label"] if best_context_prediction else None,
            "stage_1_best_context_confidence": float(best_context_prediction["probability"]) if best_context_prediction else 0.0,
            "stage_1_best_tile_context_label": best_tile_context_prediction["class_label"] if best_tile_context_prediction else None,
            "stage_1_best_tile_context_confidence": tile_context_confidence,
            "stage_1_tile_context_threshold": DEFAULT_CONTEXT_TILE_THRESHOLD,
            "stage_2_ran": yolo is not None,
            "stage_2_error": yolo_error,
            "yolo": yolo,
            "military_base_detected": is_military_base,
            "military_base_score": score,
            "minimum_military_asset_confidence": MIN_MILITARY_ASSET_CONFIDENCE,
            "decision_label": "MILITARY_BASE" if is_military_base else "NOT_MILITARY_BASE",
            "score_formula": "stage 1 only decides whether YOLO runs; final military base decision requires YOLO military_asset_confidence >= 0.45",
        },
    }


def predict_military_base(data):
    return military_base_prediction(predict_satellite(data), data)


def predict_military_base_ensemble(data):
    return military_base_prediction(predict_satellite_ensemble(data), data)


def main():
    payload = json.load(sys.stdin)
    action = payload.get("action")
    data = payload.get("data")
    if action == "predict_ml":
        result = predict_ml(data, payload.get("model_name"))
        print(json.dumps(result[0] if isinstance(data, dict) else result))
    elif action == "predict_dl":
        result = predict_dl(data)
        print(json.dumps(result[0] if isinstance(data, dict) else result))
    elif action == "recommend":
        print(json.dumps(recommendation(data)))
    elif action == "batch":
        print(json.dumps(batch(data or [], payload.get("model_name"))))
    elif action == "predict_resnet":
        print(json.dumps(predict_resnet(data or {})))
    elif action == "predict_satellite":
        print(json.dumps(predict_satellite(data or {})))
    elif action == "predict_military_base":
        print(json.dumps(predict_military_base(data or {})))
    elif action == "predict_military_base_ensemble":
        print(json.dumps(predict_military_base_ensemble(data or {})))
    else:
        raise ValueError(f"Unsupported action '{action}'")


if __name__ == "__main__":
    main()
