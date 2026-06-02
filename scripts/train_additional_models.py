import os
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"
MODEL_PACKAGE_PATH = MODELS_DIR / "credit_default_xgb_lgbm_model_package.pkl"
DATASET_PATH = ROOT / "Dataset" / "train_enhanced_ml_dl.csv"

def main():
    print("Loading model package...")
    if not MODEL_PACKAGE_PATH.exists():
        raise FileNotFoundError(f"Model package not found at {MODEL_PACKAGE_PATH}")
    
    package = joblib.load(MODEL_PACKAGE_PATH)
    print("Package loaded successfully.")
    print("Existing models in package:", list(package["models"].keys()))
    
    feature_cols = package["feature_columns"]
    numeric_features = package["numeric_features"]
    categorical_features = package["categorical_features"]
    target_col = package["target_col"]
    
    print(f"Loading training dataset from {DATASET_PATH}...")
    # Load only necessary columns to save memory
    df = pd.read_csv(DATASET_PATH, usecols=feature_cols + [target_col])
    print(f"Dataset loaded. Shape: {df.shape}")
    
    # Clean and split data
    df = df.dropna(subset=[target_col])
    X = df[feature_cols].copy()
    y = df[target_col].astype(int)
    
    # Normalize features to match inference-time preprocessing
    print("Normalizing features...")
    for col in numeric_features:
        X[col] = pd.to_numeric(X[col], errors='coerce')
    for col in categorical_features:
        X[col] = X[col].fillna('').astype(str)
        
    # Split into train/validation sets (80% train, 20% validation)
    print("Splitting dataset into train and validation sets...")
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Transform features using existing preprocessor
    print("Preprocessing/transforming training and validation data...")
    preprocessor = package["preprocessor"]
    X_train_trans = preprocessor.transform(X_train)
    X_val_trans = preprocessor.transform(X_val)
    
    # 1. Train Logistic Regression
    print("\n--- Training Logistic Regression ---")
    lr_model = LogisticRegression(max_iter=1000, random_state=42, C=1.0)
    lr_model.fit(X_train_trans, y_train)
    
    # Evaluate Logistic Regression
    lr_preds = lr_model.predict(X_val_trans)
    lr_probs = lr_model.predict_proba(X_val_trans)[:, 1]
    lr_acc = accuracy_score(y_val, lr_preds)
    lr_auc = roc_auc_score(y_val, lr_probs)
    print(f"Logistic Regression Validation Accuracy: {lr_acc:.4f}")
    print(f"Logistic Regression Validation ROC AUC: {lr_auc:.4f}")
    
    # 2. Train Random Forest
    print("\n--- Training Random Forest ---")
    # Subsample training data if it's too large to train quickly, or use all with n_jobs=-1
    # 593k rows is fine for RF with max_depth=12 and n_jobs=-1.
    rf_model = RandomForestClassifier(
        n_estimators=100, 
        max_depth=12, 
        min_samples_split=10,
        random_state=42, 
        n_jobs=-1,
        verbose=1
    )
    rf_model.fit(X_train_trans, y_train)
    
    # Evaluate Random Forest
    rf_preds = rf_model.predict(X_val_trans)
    rf_probs = rf_model.predict_proba(X_val_trans)[:, 1]
    rf_acc = accuracy_score(y_val, rf_preds)
    rf_auc = roc_auc_score(y_val, rf_probs)
    print(f"Random Forest Validation Accuracy: {rf_acc:.4f}")
    print(f"Random Forest Validation ROC AUC: {rf_auc:.4f}")
    
    # Save the new models to the package dict
    print("\nSaving new models into the package...")
    package["models"]["logistic_regression"] = lr_model
    package["models"]["random_forest"] = rf_model
    
    # Also save validation scores if needed
    if "validation_scores" not in package or not isinstance(package["validation_scores"], dict):
        package["validation_scores"] = {}
        
    package["validation_scores"]["logistic_regression"] = {
        "accuracy": float(lr_acc),
        "roc_auc": float(lr_auc)
    }
    package["validation_scores"]["random_forest"] = {
        "accuracy": float(rf_acc),
        "roc_auc": float(rf_auc)
    }
    
    # Save package back to disk
    print(f"Writing updated package to {MODEL_PACKAGE_PATH}...")
    joblib.dump(package, MODEL_PACKAGE_PATH)
    print("Done! Extended package successfully.")

if __name__ == "__main__":
    main()
