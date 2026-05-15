import json
import sys
import warnings
import base64
import io
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from torch import nn
from PIL import Image


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
    return joblib.load(MODELS_DIR / "credit_default_xgb_lgbm_model_package.pkl")


def predict_ml(records, model_name=None):
    package = load_ml_package()
    selected_model_name = model_name or package.get("default_model") or "lightgbm"
    if selected_model_name not in package["models"]:
        raise ValueError(f"Unknown model_name '{selected_model_name}'")

    df = frame_from_records(records)
    transformed = package["preprocessor"].transform(df)
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
    metadata = joblib.load(MODELS_DIR / "credit_default_mlp_metadata.pkl")
    model = CreditMLP(int(metadata["input_dim"]))
    state = torch.load(MODELS_DIR / "credit_default_mlp_model.pt", map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()
    preprocessor = joblib.load(MODELS_DIR / "credit_default_mlp_preprocessor.pkl")
    return model, preprocessor, metadata


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


def recommendation(record):
    ml = predict_ml(record)[0]
    dl = predict_dl(record)[0]
    payment_probability = dl["payment_probability"]
    default_probability = ml["default_probability"]
    loan_amount = float(record.get("loan_amount", 0) or 0)
    annual_income = float(record.get("annual_income", 0) or 0)
    interest_rate = float(record.get("interest_rate", 0) or 0)
    dti = float(record.get("debt_to_income_ratio", 0) or 0)

    if default_probability >= 0.75:
        label = "HYBRID_RESTRUCTURE"
        term = 72
        rate_delta = -3.0
        reduction = 0.32
    elif default_probability >= 0.50:
        label = "EXTEND_TERM_LOWER_INSTALLMENT"
        term = 60
        rate_delta = -2.0
        reduction = 0.24
    elif dti >= 0.35:
        label = "DEBT_CONSOLIDATION_RESTRUCTURE"
        term = 48
        rate_delta = -1.5
        reduction = 0.18
    else:
        label = "STANDARD_APPROVAL"
        term = 36
        rate_delta = 0
        reduction = 0.0

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
        "recommended_plan_label": label,
        "recommended_interest_rate": round(recommended_rate, 2),
        "recommended_term_months": term,
        "recommended_monthly_payment": round(payment, 2),
        "payment_reduction_ratio": round(reduction, 4),
        "customer_affordability_score": round(affordability, 4),
        "expected_recovery_probability": round(recovery_probability, 4),
        "expected_bank_value_index": round(bank_value, 4),
        "plan_success_label": int(recovery_probability >= 0.65),
        "dl_payment_probability": round(payment_probability, 6),
        "ml_default_probability": round(default_probability, 6),
        "ai_explanation": (
            f"LightGBM estimates default risk at {default_probability * 100:.1f}%. "
            f"The PyTorch MLP estimates payment probability at {payment_probability * 100:.1f}%. "
            f"The selected plan is intended to lower installment pressure while preserving expected bank value."
        ),
    }


def batch(records):
    ml_results = predict_ml(records)
    dl_results = predict_dl(records)
    rows = []
    distribution = {}
    for idx, (record, ml, dl) in enumerate(zip(records, ml_results, dl_results), start=1):
        plan = recommendation(record)
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
    model = torch.jit.load(MODELS_DIR / model_file, map_location="cpu")
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


def image_tensor_from_base64(image_base64: str, input_size=RESNET_INPUT_SIZE):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((input_size, input_size), Image.Resampling.BILINEAR)
    array = np.asarray(image).astype(np.float32) / 255.0
    tensor = torch.from_numpy(array).permute(2, 0, 1)
    tensor = (tensor - IMAGENET_MEAN) / IMAGENET_STD
    return tensor.unsqueeze(0)


def predict_image_model(data, model_file, model_name, input_size=RESNET_INPUT_SIZE, class_file=RESNET_CLASS_FILE, fallback_labels=None, dataset=None):
    image_base64 = data.get("image_base64") if isinstance(data, dict) else None
    if not image_base64:
        raise ValueError("image_base64 is required")

    model = load_resnet_model(model_file)
    tensor = image_tensor_from_base64(image_base64, input_size)
    with torch.no_grad():
        logits = model(tensor)
        if isinstance(logits, (tuple, list)):
            logits = logits[0]
        probabilities = torch.softmax(logits.reshape(1, -1), dim=1)[0]
        top_probs, top_indices = torch.topk(probabilities, k=min(5, probabilities.numel()))

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

    best = top_predictions[0]
    result = {
        "model_name": model_name,
        "model_file": model_file,
        "input_size": input_size,
        "num_classes": int(probabilities.numel()),
        "prediction": best["class_index"],
        "prediction_label": best["class_label"],
        "confidence": best["probability"],
        "class_labels_available": labels_available,
        "top_predictions": top_predictions,
    }
    if dataset:
        result["dataset"] = dataset
    return result


def predict_resnet(data):
    return predict_image_model(data, RESNET_MODEL_FILE, "ResNet18 TorchScript")


def predict_satellite(data):
    return predict_image_model(
        data,
        SATELLITE_MODEL_FILE,
        "EuroSAT ResNet18 TorchScript",
        input_size=SATELLITE_INPUT_SIZE,
        class_file="eurosat_classes.json",
        fallback_labels=EUROSAT_CLASS_LABELS,
        dataset="EuroSAT",
    )


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
        print(json.dumps(batch(data or [])))
    elif action == "predict_resnet":
        print(json.dumps(predict_resnet(data or {})))
    elif action == "predict_satellite":
        print(json.dumps(predict_satellite(data or {})))
    else:
        raise ValueError(f"Unsupported action '{action}'")


if __name__ == "__main__":
    main()
