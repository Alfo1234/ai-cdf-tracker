from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np
from sqlmodel import Session, select

from backend.models.project import Project
from backend.ml_engine.features.project_features import build_project_feature_set

MODEL_DIR = Path("backend/ml_engine/models")

ISO_FEATURE_COLS_PATH = MODEL_DIR / "iso_feature_columns.json"
RF_FEATURE_COLS_PATH = MODEL_DIR / "rf_feature_columns.json"

ISO_MODEL_PATH = MODEL_DIR / "isolation_forest.joblib"
ISO_SCALER_PATH = MODEL_DIR / "iso_scaler.joblib"

RF_MODEL_PATH = MODEL_DIR / "expected_cost_rf.joblib"
RF_SCALER_PATH = MODEL_DIR / "rf_scaler.joblib"


# ---------------------------------------------------------
# Utilities
# ---------------------------------------------------------
def _require(path: Path, msg: str) -> None:
    if not path.exists():
        raise FileNotFoundError(msg)


def _load_json(path: Path) -> list[str]:
    _require(
        path,
        f"Missing feature column file: {path}. "
        "Train first: python -m backend.ml_engine.train_models",
    )
    return json.loads(path.read_text())


def _load_iso():
    _require(
        ISO_MODEL_PATH,
        "Missing IsolationForest model. Train first.",
    )
    _require(
        ISO_SCALER_PATH,
        "Missing IsolationForest scaler. Train first.",
    )
    return joblib.load(ISO_MODEL_PATH), joblib.load(ISO_SCALER_PATH)


def _load_rf():
    _require(
        RF_MODEL_PATH,
        "Missing RandomForest model. Train first.",
    )
    _require(
        RF_SCALER_PATH,
        "Missing RandomForest scaler. Train first.",
    )
    return joblib.load(RF_MODEL_PATH), joblib.load(RF_SCALER_PATH)


# ---------------------------------------------------------
# Main Scoring Logic
# ---------------------------------------------------------
def compute_project_signals(session: Session, project_id: int) -> Dict[str, Any]:
    """
    Returns explainable AI outputs for a project:
      - Isolation Forest anomaly score
      - Expected cost prediction + residual
    """

    # Ensure project exists
    project = session.exec(select(Project).where(Project.id == project_id)).first()
    if not project:
        return {"detail": f"Project {project_id} not found"}

    fs = build_project_feature_set(session)

    if fs.meta.empty:
        return {"detail": "No projects found in database"}

    matches = fs.meta.index[fs.meta["project_id"] == project_id].tolist()
    if not matches:
        return {"detail": f"Project {project_id} not found in feature set"}

    idx = matches[0]

    # -----------------------------------------------------
    # Isolation Forest (Anomaly Detection)
    # -----------------------------------------------------
    iso_cols = _load_json(ISO_FEATURE_COLS_PATH)
    iso_model, iso_scaler = _load_iso()

    X_iso = fs.X[iso_cols].copy()
    row_iso = X_iso.iloc[[idx]]

    row_iso_scaled = iso_scaler.transform(row_iso)

    iso_raw = float(iso_model.decision_function(row_iso_scaled)[0])
    iso_pred = int(iso_model.predict(row_iso_scaled)[0])  # -1 anomaly, 1 normal

    # Normalize to 0–100 (UI-friendly)
    anomaly_score = int(np.clip((1.0 - (iso_raw + 0.5)) * 100, 0, 100))

    # -----------------------------------------------------
    # RandomForest (Expected Cost)
    # -----------------------------------------------------
    rf_cols = _load_json(RF_FEATURE_COLS_PATH)
    rf_model, rf_scaler = _load_rf()

    X_rf = fs.X[rf_cols].copy()
    row_rf = X_rf.iloc[[idx]]

    row_rf_scaled = rf_scaler.transform(row_rf)

    expected_spent = float(rf_model.predict(row_rf_scaled)[0])

    actual_spent = float(fs.X.iloc[idx].get("spent_kes", 0.0))
    residual = actual_spent - expected_spent

    # -----------------------------------------------------
    # Final Response
    # -----------------------------------------------------
    return {
        "project_id": project_id,
        "signals": {
            "anomaly": {
                "is_anomaly": (iso_pred == -1),
                "anomaly_score_0_100": anomaly_score,
                "raw_iforest_score": iso_raw,
                "explain": "Isolation Forest flags projects whose spend/progress/timeline patterns look unusual compared to others.",
            },
            "cost": {
                "expected_spent_kes": expected_spent,
                "actual_spent_kes": actual_spent,
                "residual_kes": residual,
                "explain": "RandomForest predicts typical spending using budget, progress and time only (no leakage).",
            },
        },
        "features_used": {
            "isolation_forest": iso_cols,
            "random_forest": rf_cols,
        },
    }