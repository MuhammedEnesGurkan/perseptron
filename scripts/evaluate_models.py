"""Evaluate EuroSAT and credit-default models and write graph-ready JSON."""
from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import traceback
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import inference  # noqa: E402


EUROSAT_TEST_DIR = ROOT / "euro sat ui" / "test"
CREDIT_DATASET = ROOT / "kreditveriseti" / "train.csv"
OUTPUT_FILE = ROOT / "public" / "model-test-results.json"
CREDIT_CHUNK_SIZE = 50_000
CREDIT_THRESHOLD_PAID = 0.65

EUROSAT_FILENAME_LABELS = {
    "f": "Forest",
    "hv": "HerbaceousVegetation",
    "hw": "Highway",
    "i": "Industrial",
    "p": "Pasture",
    "pc": "PermanentCrop",
    "r": "Residential",
    "ri": "River",
    "sl": "SeaLake",
    "t": "AnnualCrop",
}


def round_float(value, digits=6):
    return round(float(value), digits)


def json_default(value):
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return value.tolist()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def image_label(path: Path) -> str:
    match = re.match(r"[a-z]+", path.stem.lower())
    prefix = match.group(0) if match else ""
    if prefix not in EUROSAT_FILENAME_LABELS:
        raise ValueError(f"Unknown EuroSAT test filename prefix: {path.name}")
    return EUROSAT_FILENAME_LABELS[prefix]


def encode_image(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def classification_metrics(expected, predicted, scores=None):
    labels = sorted(set(expected) | set(predicted))
    matrix = confusion_matrix(expected, predicted, labels=labels)
    result = {
        "accuracy": round_float(accuracy_score(expected, predicted)),
        "accuracy_percent": round_float(accuracy_score(expected, predicted) * 100, 2),
        "f1_macro": round_float(f1_score(expected, predicted, average="macro", zero_division=0)),
        "precision_macro": round_float(precision_score(expected, predicted, average="macro", zero_division=0)),
        "recall_macro": round_float(recall_score(expected, predicted, average="macro", zero_division=0)),
        "correct": int(sum(left == right for left, right in zip(expected, predicted))),
        "total": len(expected),
        "confusion_matrix": {"labels": labels, "values": matrix.tolist()},
    }
    if scores is not None:
        result["roc_auc"] = round_float(roc_auc_score(expected, scores))
    return result


def evaluate_eurosat():
    files = sorted(EUROSAT_TEST_DIR.glob("*.jpg"))
    samples = [{"filename": path.name, "expected_label": image_label(path)} for path in files]
    encoded_images = {path.name: encode_image(path) for path in files}
    model_ids = list(inference.SATELLITE_MODELS) + ["ensemble_top3_sum"]
    models = []

    for model_id in model_ids:
        print(f"[EuroSAT] Evaluating {model_id}...", flush=True)
        predictions = []
        try:
            for sample in samples:
                data = {"image_base64": encoded_images[sample["filename"]]}
                if model_id == "ensemble_top3_sum":
                    prediction = inference.predict_satellite_ensemble(data)
                else:
                    prediction = inference.predict_satellite({**data, "model_id": model_id})
                predictions.append(
                    {
                        **sample,
                        "predicted_label": prediction["prediction_label"],
                        "confidence": round_float(prediction["confidence"]),
                        "correct": sample["expected_label"] == prediction["prediction_label"],
                    }
                )

            expected = [item["expected_label"] for item in predictions]
            predicted = [item["predicted_label"] for item in predictions]
            metrics = classification_metrics(expected, predicted)
            per_class = {}
            for label in inference.EUROSAT_CLASS_LABELS:
                class_predictions = [item for item in predictions if item["expected_label"] == label]
                per_class[label] = {
                    "correct": sum(item["correct"] for item in class_predictions),
                    "total": len(class_predictions),
                    "accuracy_percent": round_float(
                        100 * sum(item["correct"] for item in class_predictions) / len(class_predictions), 2
                    ),
                }
            models.append(
                {
                    "model_id": model_id,
                    "model_name": prediction["model_name"],
                    "status": "ok",
                    "metrics": metrics,
                    "per_class": per_class,
                    "predictions": predictions,
                }
            )
        except Exception as error:
            models.append(
                {
                    "model_id": model_id,
                    "status": "error",
                    "error": f"{type(error).__name__}: {error}",
                }
            )
            print(traceback.format_exc(), file=sys.stderr)

    return {
        "dataset": {
            "path": str(EUROSAT_TEST_DIR.relative_to(ROOT)),
            "sample_count": len(samples),
            "samples_per_class": dict(sorted(Counter(item["expected_label"] for item in samples).items())),
            "note": "Small manually curated test folder. Use a larger held-out dataset for production claims.",
        },
        "models": models,
    }


def prepare_optimized_credit_frame(frame: pd.DataFrame) -> pd.DataFrame:
    engineered = frame.copy()
    income = engineered["annual_income"].replace(0, np.nan)
    engineered["loan_to_income_ratio"] = engineered["loan_amount"] / income
    engineered["interest_burden"] = engineered["loan_amount"] * engineered["interest_rate"] / 100
    engineered["dti_interest_risk"] = engineered["debt_to_income_ratio"] * engineered["interest_rate"]
    engineered["low_credit_score_flag"] = (engineered["credit_score"] < 650).astype(int)
    return engineered


def credit_result(
    model_id,
    model_name,
    expected,
    scores,
    source,
    *,
    target,
    threshold,
    stored_validation_metrics=None,
):
    predicted = (scores >= threshold).astype(int)
    result = {
        "model_id": model_id,
        "model_name": model_name,
        "status": "ok",
        "source": source,
        "target": target,
        "threshold": threshold,
        "metrics": classification_metrics(expected, predicted, scores),
    }
    if stored_validation_metrics:
        result["stored_validation_metrics"] = stored_validation_metrics
    return result


def evaluate_credit():
    print("[Credit] Loading labeled dataset...", flush=True)
    frame = pd.read_csv(CREDIT_DATASET)
    expected = frame["loan_paid_back"].astype(int).to_numpy()
    feature_frame = frame.drop(columns=["id", "loan_paid_back"])
    models = []

    package = inference.load_ml_package()
    transformed = package["preprocessor"].transform(feature_frame)
    for model_id, model in package["models"].items():
        print(f"[Credit] Evaluating app package {model_id}...", flush=True)
        paid_scores = model.predict_proba(transformed)[:, 1]
        stored = package.get("validation_scores", {})
        models.append(
            credit_result(
                f"app_{model_id}",
                f"App Package {model_id.title()}",
                expected,
                paid_scores,
                "models/credit_default_xgb_lgbm_model_package.pkl",
                target="loan_paid_back",
                threshold=CREDIT_THRESHOLD_PAID,
                stored_validation_metrics=stored.get(f"{model_id}_baseline")
                or stored.get(f"{'xgboost' if model_id == 'xgboost' else 'lightgbm'}_baseline"),
            )
        )

    print("[Credit] Evaluating CreditMLPSafe...", flush=True)
    dl_model, dl_preprocessor, dl_metadata = inference.load_dl_model()
    dl_scores = []
    with torch.no_grad():
        for offset in range(0, len(feature_frame), CREDIT_CHUNK_SIZE):
            chunk = feature_frame.iloc[offset : offset + CREDIT_CHUNK_SIZE]
            transformed_chunk = dl_preprocessor.transform(chunk)
            if hasattr(transformed_chunk, "toarray"):
                transformed_chunk = transformed_chunk.toarray()
            tensor = torch.tensor(np.asarray(transformed_chunk), dtype=torch.float32)
            dl_scores.append(torch.sigmoid(dl_model(tensor).reshape(-1)).cpu().numpy())
    models.append(
        credit_result(
            "credit_mlp_safe",
            "CreditMLPSafe",
            expected,
            np.concatenate(dl_scores),
            "models/credit_default_mlp_model.pt",
            target="loan_paid_back",
            threshold=CREDIT_THRESHOLD_PAID,
            stored_validation_metrics={"roc_auc": dl_metadata.get("best_valid_roc_auc")},
        )
    )

    print("[Credit] Evaluating optimized yenimodel classifiers...", flush=True)
    optimized_frame = prepare_optimized_credit_frame(feature_frame)
    optimized_preprocessor = joblib.load(ROOT / "yenimodel" / "preprocessor.pkl")
    optimized_transformed = optimized_preprocessor.transform(optimized_frame)
    expected_default = 1 - expected
    for model_id, filename in (("optimized_xgboost", "xgb_model.pkl"), ("optimized_lightgbm", "lgbm_model.pkl")):
        model = joblib.load(ROOT / "yenimodel" / filename)
        default_scores = model.predict_proba(optimized_transformed)[:, 1]
        models.append(
            credit_result(
                model_id,
                model_id.replace("_", " ").title(),
                expected_default,
                default_scores,
                f"yenimodel/{filename}",
                target="default_target",
                threshold=0.50,
            )
        )

    return {
        "dataset": {
            "path": str(CREDIT_DATASET.relative_to(ROOT)),
            "sample_count": len(frame),
            "target": "loan_paid_back",
            "scope": "in_sample_full_labeled_dataset",
            "note": (
                "kreditveriseti/test.csv has no target column. Metrics below are measured on the full labeled train.csv "
                "and must not be presented as unseen hold-out performance. Stored validation metrics are included when available."
            ),
        },
        "models": models,
    }


def chart_rows(models, metric):
    rows = []
    for model in models:
        if model["status"] != "ok":
            continue
        rows.append(
            {
                "model_id": model["model_id"],
                "model_name": model["model_name"],
                metric: model["metrics"].get(metric),
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE)
    args = parser.parse_args()

    eurosat = evaluate_eurosat()
    credit = evaluate_credit()
    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "eurosat": eurosat,
        "credit_default": credit,
        "charts": {
            "eurosat_accuracy": chart_rows(eurosat["models"], "accuracy_percent"),
            "eurosat_f1_macro": chart_rows(eurosat["models"], "f1_macro"),
            "credit_default_accuracy": chart_rows(credit["models"], "accuracy_percent"),
            "credit_default_f1_macro": chart_rows(credit["models"], "f1_macro"),
            "credit_default_roc_auc": chart_rows(credit["models"], "roc_auc"),
        },
        "excluded_models": [
            {
                "model": "PlanMLP",
                "reason": "Payment-plan recommendation model, not a credit-default classifier.",
            },
            {
                "model": "YOLO variants",
                "reason": "Military object detectors, not EuroSAT land-use classifiers.",
            },
            {
                "model": "payment_optimization_dl_model",
                "reason": "Payment optimization model, not a credit-default classifier.",
            },
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=json_default), encoding="utf-8")
    print(f"Wrote {args.output}", flush=True)


if __name__ == "__main__":
    main()
