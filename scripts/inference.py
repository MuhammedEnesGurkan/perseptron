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
    "efficientnet_b0_augmented_best": {
        "model_file": "best_robust_model.pth",
        "model_name": "EuroSAT EfficientNet B0 Augmented Best",
        "loader": "efficientnet_b0_state_dict",
    },
    "efficientnet_b0_robust": {
        "model_file": "best_robust_model.pth",
        "model_name": "EuroSAT EfficientNet B0 Augmented Best",
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


def load_convnext_tiny_model(model_file=SATELLITE_MODEL_FILE, num_classes=len(EUROSAT_CLASS_LABELS)):
    if timm is None:
        raise ImportError("ConvNeXt Tiny inference requires the Python package 'timm'. Install it with: python -m pip install timm")

    model = timm.create_model("convnext_tiny", pretrained=False, num_classes=num_classes)
    state = torch.load(MODELS_DIR / model_file, map_location="cpu", weights_only=True)
    if isinstance(state, dict):
        state = state.get("model_state_dict") or state.get("state_dict") or state.get("model") or state
    model.load_state_dict(state)
    model.eval()
    return model


def load_resnet18_state_dict_model(model_file, num_classes=len(EUROSAT_CLASS_LABELS)):
    if torchvision_models is None:
        raise ImportError("ResNet18 state-dict inference requires torchvision. Install it with: python -m pip install torchvision")

    model = torchvision_models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    state = torch.load(MODELS_DIR / model_file, map_location="cpu", weights_only=True)
    if isinstance(state, dict):
        state = state.get("model_state_dict") or state.get("state_dict") or state.get("model") or state
    model.load_state_dict(state)
    model.eval()
    return model


def load_efficientnet_b0_state_dict_model(model_file, num_classes=len(EUROSAT_CLASS_LABELS)):
    if torchvision_models is None:
        raise ImportError("EfficientNet B0 state-dict inference requires torchvision. Install it with: python -m pip install torchvision")

    model = torchvision_models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    state = torch.load(MODELS_DIR / model_file, map_location="cpu", weights_only=True)
    if isinstance(state, dict):
        state = state.get("model_state_dict") or state.get("state_dict") or state.get("model") or state
    model.load_state_dict(state)
    model.eval()
    return model


def load_full_torch_model(model_file):
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


def image_from_base64(image_base64: str):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


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
):
    image_base64 = data.get("image_base64") if isinstance(data, dict) else None
    if not image_base64:
        raise ValueError("image_base64 is required")

    model = model_loader(model_file)
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
        "model_id": model_id,
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
    selected_model_id = data.get("model_id", "resnet18_torchscript") if isinstance(data, dict) else "resnet18_torchscript"
    if selected_model_id not in SATELLITE_MODELS:
        valid_models = ", ".join(SATELLITE_MODELS.keys())
        raise ValueError(f"Unsupported satellite model_id '{selected_model_id}'. Valid options: {valid_models}")

    selected_model = SATELLITE_MODELS[selected_model_id]
    if not (MODELS_DIR / selected_model["model_file"]).exists():
        selected_model_id = "resnet18_torchscript"
        selected_model = SATELLITE_MODELS[selected_model_id]
    if selected_model["loader"] == "convnext_tiny":
        loader = load_convnext_tiny_model
    elif selected_model["loader"] == "resnet18_state_dict":
        loader = load_resnet18_state_dict_model
    elif selected_model["loader"] == "efficientnet_b0_state_dict":
        loader = load_efficientnet_b0_state_dict_model
    elif selected_model["loader"] == "full_model":
        loader = load_full_torch_model
    else:
        loader = load_resnet_model

    return predict_image_model(
        data,
        selected_model["model_file"],
        selected_model["model_name"],
        input_size=SATELLITE_INPUT_SIZE,
        class_file="eurosat_classes.json",
        fallback_labels=EUROSAT_CLASS_LABELS,
        dataset="EuroSAT",
        model_loader=loader,
        model_id=selected_model_id,
    )


def load_yolo_model(model_file=YOLO_MODEL_FILE):
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            from ultralytics import YOLO
    except ImportError:
        raise ImportError("YOLO inference requires the Python package 'ultralytics'. Install it with: python -m pip install ultralytics")
    with contextlib.redirect_stdout(io.StringIO()):
        return YOLO(str(YOLO_MODEL_DIR / model_file))


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


def predict_military_base(data):
    satellite = predict_satellite(data)
    context_label = satellite["prediction_label"]
    best_context_prediction = max(
        (item for item in satellite["top_predictions"] if item["class_label"] in MILITARY_CONTEXT_LABELS),
        key=lambda item: item["probability"],
        default=None,
    )
    context_confidence = float(sum(item["probability"] for item in satellite["top_predictions"] if item["class_label"] in MILITARY_CONTEXT_LABELS))
    context_matches = context_label in MILITARY_CONTEXT_LABELS or context_confidence >= DEFAULT_CONTEXT_THRESHOLD

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
    elif action == "predict_military_base":
        print(json.dumps(predict_military_base(data or {})))
    else:
        raise ValueError(f"Unsupported action '{action}'")


if __name__ == "__main__":
    main()
