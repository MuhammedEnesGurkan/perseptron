import json
import sys
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from torch import nn


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
    else:
        raise ValueError(f"Unsupported action '{action}'")


if __name__ == "__main__":
    main()
