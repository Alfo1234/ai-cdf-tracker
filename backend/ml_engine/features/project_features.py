from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sqlmodel import Session, select

from backend.models.project import Project


# ---------------------------------------------------------
# IMPORTANT: Keep this list stable.
# If you change it, retrain models.
# ---------------------------------------------------------
FEATURE_COLUMNS = [
    "budget_kes",
    "spent_kes",
    "spent_ratio",
    "progress_ratio",
    "spend_progress_gap",
    "time_elapsed_days",
    # NOTE: We intentionally DO NOT include planned_duration_days
    # because your regressor was trained with 6 features.
]


def pick_attr(obj, names, default=None):
    """Return the first attribute that exists on obj from the list."""
    for n in names:
        if hasattr(obj, n):
            return getattr(obj, n)
    return default


def to_float(x, default=0.0):
    try:
        if x is None:
            return default
        return float(x)
    except Exception:
        return default


def to_date(x):
    """
    Normalize x to datetime.date.
    Supports date, datetime, None.
    """
    if x is None:
        return None
    if isinstance(x, datetime):
        return x.date()
    if isinstance(x, date):
        return x
    return None


@dataclass
class FeatureSet:
    X: pd.DataFrame
    meta: pd.DataFrame


def _safe_div(a: float, b: float) -> float:
    return float(a) / float(b) if b not in (0, 0.0, None) else 0.0


def build_project_feature_set(session: Session) -> FeatureSet:
    """
    Builds a tabular feature matrix for ML anomaly detection + expected cost regression.

    Returns:
      - X: numeric features only (for models)
      - meta: non-feature columns used for mapping back to projects
    """
    projects: List[Project] = session.exec(select(Project)).all()
    today = date.today()

    rows: List[Dict[str, Any]] = []

    for p in projects:
        # Support both old/new field names safely
        budget = to_float(pick_attr(p, ["budget_kes", "budget", "budget_amount_kes"], 0))

        # ✅ FIX: include "spent" because your Project model uses "spent"
        spent = to_float(
            pick_attr(p, ["spent", "amount_spent_kes", "spent_kes", "amount_spent"], 0)
        )

        progress = to_float(pick_attr(p, ["progress_percent", "progress"], 0))

        start = to_date(pick_attr(p, ["start_date", "start"], None))
        end = to_date(pick_attr(p, ["completion_date", "end_date", "end"], None))

        time_elapsed = (today - start).days if start else None

        # We still compute planned_duration in case you need it later,
        # but we will NOT include it in FEATURE_COLUMNS for now.
        planned_duration = (end - start).days if (start and end) else None

        spent_ratio = _safe_div(spent, budget)
        progress_ratio = progress / 100.0 if progress else 0.0
        spend_progress_gap = abs(spent_ratio - progress_ratio)

        rows.append(
            {
                "project_id": getattr(p, "id", None),
                "constituency_code": pick_attr(p, ["constituency_code"], None),
                "category": str(pick_attr(p, ["category"], "")),
                "status": str(pick_attr(p, ["status"], "")),

                # numeric features
                "budget_kes": budget,
                "spent_kes": spent,
                "spent_ratio": spent_ratio,
                "progress_ratio": progress_ratio,
                "spend_progress_gap": spend_progress_gap,
                "time_elapsed_days": float(time_elapsed) if time_elapsed is not None else np.nan,

                # optional (not in FEATURE_COLUMNS right now)
                "planned_duration_days": float(planned_duration) if planned_duration is not None else np.nan,
            }
        )

    df = pd.DataFrame(rows)

    # meta for mapping + explanations
    meta = df[["project_id", "constituency_code", "category", "status"]].copy()

    # X for modeling (numeric only) - LOCKED to FEATURE_COLUMNS
    X = df[FEATURE_COLUMNS].copy()

    # Fill missing times with median (simple + stable)
    if "time_elapsed_days" in X.columns and X["time_elapsed_days"].isna().any():
        X["time_elapsed_days"] = X["time_elapsed_days"].fillna(X["time_elapsed_days"].median())

    return FeatureSet(X=X, meta=meta)