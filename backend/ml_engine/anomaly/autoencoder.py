from __future__ import annotations

from pathlib import Path
from typing import Tuple

import numpy as np
import joblib

from sklearn.preprocessing import StandardScaler

# torch only exists after A6.1
import torch
import torch.nn as nn


MODEL_DIR = Path("backend/ml_engine/models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)


class TabularAutoEncoder(nn.Module):
    def __init__(self, n_features: int):
        super().__init__()
        # small, CPU-friendly
        self.encoder = nn.Sequential(
            nn.Linear(n_features, 8),
            nn.ReLU(),
            nn.Linear(8, 3),
            nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(3, 8),
            nn.ReLU(),
            nn.Linear(8, n_features),
        )

    def forward(self, x):
        z = self.encoder(x)
        return self.decoder(z)


def train_autoencoder(X: np.ndarray, epochs: int = 60, lr: float = 1e-3) -> None:
    """
    Trains an autoencoder to reconstruct X. High reconstruction error => anomaly.
    Saves:
      - ae_scaler.joblib
      - autoencoder.pt
    """
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X).astype(np.float32)

    model = TabularAutoEncoder(n_features=Xs.shape[1])
    optim = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    Xt = torch.from_numpy(Xs)

    model.train()
    for _ in range(epochs):
        optim.zero_grad()
        out = model(Xt)
        loss = loss_fn(out, Xt)
        loss.backward()
        optim.step()

    joblib.dump(scaler, MODEL_DIR / "ae_scaler.joblib")
    torch.save(model.state_dict(), MODEL_DIR / "autoencoder.pt")


def load_autoencoder(n_features: int) -> Tuple[StandardScaler, TabularAutoEncoder]:
    scaler_path = MODEL_DIR / "ae_scaler.joblib"
    model_path = MODEL_DIR / "autoencoder.pt"
    if not scaler_path.exists() or not model_path.exists():
        raise FileNotFoundError("Autoencoder artifacts missing. Train autoencoder first.")
    scaler = joblib.load(scaler_path)
    model = TabularAutoEncoder(n_features=n_features)
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()
    return scaler, model


def reconstruction_error(model: TabularAutoEncoder, Xs: np.ndarray) -> np.ndarray:
    """
    Returns per-row reconstruction MSE (higher => more anomalous).
    """
    with torch.no_grad():
        Xt = torch.from_numpy(Xs.astype(np.float32))
        out = model(Xt).numpy()
    err = np.mean((out - Xs) ** 2, axis=1)
    return err