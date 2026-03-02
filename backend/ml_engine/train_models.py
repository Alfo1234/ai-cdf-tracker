from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sqlmodel import Session

from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.preprocessing import StandardScaler

from backend.database.db import engine
from backend.ml_engine.features.project_features import build_project_feature_set

MODEL_DIR = Path("backend/ml_engine/models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Feature column manifests (so scoring stays consistent)
ISO_FEATURE_COLS_PATH = MODEL_DIR / "iso_feature_columns.json"
RF_FEATURE_COLS_PATH = MODEL_DIR / "rf_feature_columns.json"

ISO_MODEL_PATH = MODEL_DIR / "isolation_forest.joblib"
ISO_SCALER_PATH = MODEL_DIR / "iso_scaler.joblib"

RF_MODEL_PATH = MODEL_DIR / "expected_cost_rf.joblib"
RF_SCALER_PATH = MODEL_DIR / "rf_scaler.joblib"


def _save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2))


def _load_json(path: Path):
    return json.loads(path.read_text())


def train_isolation_forest() -> None:
    with Session(engine) as session:
        fs = build_project_feature_set(session)

    # ✅ Stable columns + order for anomaly model
    iso_cols = list(fs.X.columns)
    _save_json(ISO_FEATURE_COLS_PATH, iso_cols)

    X = fs.X[iso_cols].copy()

    # Fit scaler on DataFrame (keeps feature_names_in_ inside sklearn)
    iso_scaler = StandardScaler()
    iso_scaler.fit(X)
    X_scaled = iso_scaler.transform(X)

    iso = IsolationForest(
        n_estimators=300,
        contamination=0.12,
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(X_scaled)

    joblib.dump(iso, ISO_MODEL_PATH)
    joblib.dump(iso_scaler, ISO_SCALER_PATH)
    print("✅ Saved Isolation Forest model.")


def train_expected_cost_regressor() -> None:
    """
    Predicts expected/typical spending (spent_kes) WITHOUT leakage.

    We train RF using non-leaky features only:
      - budget_kes
      - progress_ratio
      - time_elapsed_days

    We intentionally EXCLUDE:
      - spent_kes (it is the target)
      - spent_ratio (depends on spent)
      - spend_progress_gap (depends on spent_ratio -> depends on spent)
    """
    with Session(engine) as session:
        fs = build_project_feature_set(session)

    # Base columns from feature set (stable source)
    base_cols = list(fs.X.columns)

    # Non-leaky RF columns
    leak_cols = {"spent_kes", "spent_ratio", "spend_progress_gap"}
    rf_cols = [c for c in base_cols if c not in leak_cols]

    # Safety: ensure required columns exist
    required = ["budget_kes", "progress_ratio", "time_elapsed_days"]
    rf_cols = [c for c in rf_cols if c in required]

    if len(rf_cols) != len(required):
        missing = [c for c in required if c not in rf_cols]
        raise RuntimeError(
            f"RF training failed: missing required features {missing}. "
            f"Available columns: {base_cols}"
        )

    _save_json(RF_FEATURE_COLS_PATH, rf_cols)

    X = fs.X[rf_cols].copy()
    y = fs.X["spent_kes"].astype(float).values

    rf_scaler = StandardScaler()
    rf_scaler.fit(X)
    X_scaled = rf_scaler.transform(X)

    rf = RandomForestRegressor(
        n_estimators=300,
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_scaled, y)

    joblib.dump(rf, RF_MODEL_PATH)
    joblib.dump(rf_scaler, RF_SCALER_PATH)
    print("✅ Saved Expected Cost Regressor (RandomForest).")


def main() -> None:
    train_isolation_forest()
    train_expected_cost_regressor()


if __name__ == "__main__":
    main()