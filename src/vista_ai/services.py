import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models" / "price_model.joblib"
METRICS_PATH = ROOT / "models" / "metrics.json"


class ValuationService:
    def __init__(self) -> None:
        self.model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
        self.metrics = json.loads(METRICS_PATH.read_text()) if METRICS_PATH.exists() else {}

    def estimate(self, bairro: str, area_m2: float, quartos: int, suites: int, vagas: int) -> tuple[float, str]:
        if self.model is None:
            raise RuntimeError("Modelo de valuation não encontrado. Execute: python scripts/train.py")
        row = pd.DataFrame([{"bairro": bairro.strip().upper(), "area_m2": area_m2, "quartos": quartos, "suites": suites, "vagas": vagas}])
        price_m2 = float(np.expm1(self.model.predict(row)[0]))
        mae = self.metrics.get("mae_brl_m2", 0)
        confidence = "alta" if mae and mae / price_m2 < 0.15 else "moderada"
        return price_m2, confidence


class SimilarityService:
    def __init__(self) -> None:
        self._model = None

    def encode(self, texts: list[str]) -> list[list[float]]:
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            local_model = ROOT / "models" / "hf" / "multilingual-e5-small"
            model_ref = str(local_model) if local_model.exists() else os.getenv("HF_MODEL_NAME", "intfloat/multilingual-e5-small")
            self._model = SentenceTransformer(model_ref)
        return self._model.encode(texts, normalize_embeddings=True).tolist()
