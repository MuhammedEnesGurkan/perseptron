"""Compare batch credit models against a FICO-style credit-score baseline.

The competition test.csv has no target label, so this script writes:
- prediction/risk distribution on kreditveriseti/test.csv
- reference metrics on labeled kreditveriseti/train.csv
"""
from __future__ import annotations

import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "kreditveriseti"
MODEL_PACKAGE = ROOT / "models" / "credit_default_xgb_lgbm_model_package.pkl"
OUTPUT_FILE = ROOT / "public" / "credit-model-test-results.json"

MODELS = ["lightgbm", "xgboost", "logistic_regression", "random_forest"]
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


def normalized_frame(frame: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=frame.index)
    for feature in FEATURES:
        if feature in NUMERIC_FEATURES:
            out[feature] = pd.to_numeric(frame[feature], errors="coerce")
        else:
            out[feature] = frame[feature].fillna("").astype(str)
    return out[FEATURES]


def risk_bands(default_probabilities: np.ndarray) -> np.ndarray:
    return np.where(
        default_probabilities >= 0.75,
        "CRITICAL",
        np.where(default_probabilities >= 0.50, "HIGH", np.where(default_probabilities >= 0.25, "MEDIUM", "LOW")),
    )


def fico_paid_score(frame: pd.DataFrame) -> np.ndarray:
    """Map raw credit_score to a 0..1 paid-back score.

    This is intentionally simple: it gives the FICO/credit-score baseline no
    access to income, DTI, loan amount, interest, or categorical features.
    """
    scores = pd.to_numeric(frame["credit_score"], errors="coerce").fillna(600).to_numpy(dtype=float)
    return np.clip((scores - 300.0) / 550.0, 0.0, 1.0)


def summarize_test_predictions(test_frame: pd.DataFrame, paid_scores: np.ndarray, threshold_paid: float) -> dict:
    default_scores = 1.0 - paid_scores
    paid_predictions = (paid_scores >= threshold_paid).astype(int)
    bands = risk_bands(default_scores)
    band_counts = {band: int((bands == band).sum()) for band in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]}
    highest_risk_indices = np.argsort(-default_scores)[:5]
    return {
        "predicted_paid_back_count": int(paid_predictions.sum()),
        "predicted_default_count": int((paid_predictions == 0).sum()),
        "predicted_paid_back_rate_percent": round(float(paid_predictions.mean() * 100), 3),
        "predicted_default_rate_percent": round(float((1 - paid_predictions).mean() * 100), 3),
        "avg_paid_back_probability_percent": round(float(paid_scores.mean() * 100), 3),
        "avg_default_probability_percent": round(float(default_scores.mean() * 100), 3),
        "median_default_probability_percent": round(float(np.median(default_scores) * 100), 3),
        "p90_default_probability_percent": round(float(np.percentile(default_scores, 90) * 100), 3),
        "p95_default_probability_percent": round(float(np.percentile(default_scores, 95) * 100), 3),
        "risk_band_counts": band_counts,
        "risk_band_rates_percent": {band: round(count / len(test_frame) * 100, 3) for band, count in band_counts.items()},
        "top_5_highest_risk_ids": [
            {
                "id": int(test_frame.iloc[index]["id"]),
                "default_probability_percent": round(float(default_scores[index] * 100), 3),
                "paid_back_probability_percent": round(float(paid_scores[index] * 100), 3),
                "risk_band": str(bands[index]),
            }
            for index in highest_risk_indices
        ],
    }


def labeled_metrics(expected_paid: np.ndarray, paid_scores: np.ndarray, threshold_paid: float) -> dict:
    predicted_paid = (paid_scores >= threshold_paid).astype(int)
    tn, fp, fn, tp = confusion_matrix(expected_paid, predicted_paid, labels=[0, 1]).ravel()
    return {
        "accuracy": round(float(accuracy_score(expected_paid, predicted_paid)), 6),
        "roc_auc": round(float(roc_auc_score(expected_paid, paid_scores)), 6),
        "pr_auc_paid_class": round(float(average_precision_score(expected_paid, paid_scores)), 6),
        "f1_paid": round(float(f1_score(expected_paid, predicted_paid, pos_label=1)), 6),
        "precision_paid": round(float(precision_score(expected_paid, predicted_paid, pos_label=1, zero_division=0)), 6),
        "recall_paid": round(float(recall_score(expected_paid, predicted_paid, pos_label=1, zero_division=0)), 6),
        "f1_default": round(float(f1_score(expected_paid, predicted_paid, pos_label=0)), 6),
        "precision_default": round(float(precision_score(expected_paid, predicted_paid, pos_label=0, zero_division=0)), 6),
        "recall_default": round(float(recall_score(expected_paid, predicted_paid, pos_label=0, zero_division=0)), 6),
        "confusion_matrix_labels_0_default_1_paid": {
            "tn_default_correct": int(tn),
            "fp_default_as_paid": int(fp),
            "fn_paid_as_default": int(fn),
            "tp_paid_correct": int(tp),
        },
    }


def main() -> None:
    package = joblib.load(MODEL_PACKAGE)
    threshold_paid = float(package.get("threshold_paid", 0.65))

    test_frame = pd.read_csv(DATA_DIR / "test.csv")
    train_frame = pd.read_csv(DATA_DIR / "train.csv")
    expected_paid = train_frame["loan_paid_back"].astype(int).to_numpy()

    test_features = normalized_frame(test_frame)
    train_features = normalized_frame(train_frame)
    transformed_test = package["preprocessor"].transform(test_features)
    transformed_train = package["preprocessor"].transform(train_features)

    results = {
        "dataset": {
            "test_csv": str((DATA_DIR / "test.csv").relative_to(ROOT)),
            "test_rows": int(len(test_frame)),
            "test_has_labels": False,
            "train_csv": str((DATA_DIR / "train.csv").relative_to(ROOT)),
            "train_rows": int(len(train_frame)),
            "train_target": "loan_paid_back (1=paid_back, 0=default_or_not_paid_back)",
            "threshold_paid": threshold_paid,
            "note": (
                "kreditveriseti/test.csv does not contain loan_paid_back, so success metrics are measured on train.csv. "
                "test.csv results are prediction/risk distributions only."
            ),
        },
        "models": {},
    }

    for model_id in MODELS:
        model = package["models"][model_id]
        if hasattr(model, "n_jobs"):
            model.n_jobs = 1
        test_paid_scores = model.predict_proba(transformed_test)[:, 1]
        train_paid_scores = model.predict_proba(transformed_train)[:, 1]
        results["models"][model_id] = {
            "model_name": model_id.replace("_", " ").title(),
            "source": "models/credit_default_xgb_lgbm_model_package.pkl",
            "test_csv_batch_summary": summarize_test_predictions(test_frame, test_paid_scores, threshold_paid),
            "train_reference_metrics": labeled_metrics(expected_paid, train_paid_scores, threshold_paid),
        }

    fico_test_scores = fico_paid_score(test_frame)
    fico_train_scores = fico_paid_score(train_frame)
    results["models"]["fico_credit_score_baseline"] = {
        "model_name": "FICO/Credit Score Baseline",
        "source": "credit_score only, normalized from 300..850",
        "test_csv_batch_summary": summarize_test_predictions(test_frame, fico_test_scores, threshold_paid),
        "train_reference_metrics": labeled_metrics(expected_paid, fico_train_scores, threshold_paid),
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
