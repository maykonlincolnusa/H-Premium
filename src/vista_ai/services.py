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
        # ITBI does not provide rooms, suites or parking spaces.  The current
        # artifact still contains those legacy columns, all trained as zero;
        # keep them at that baseline so a form entry cannot suggest a signal
        # that the training data never contained.
        values = {
            "bairro": bairro.strip().upper(),
            "area_m2": area_m2,
            "quartos": 0,
            "suites": 0,
            "vagas": 0,
        }
        expected_features = list(getattr(self.model, "feature_names_in_", values))
        row = pd.DataFrame([{feature: values[feature] for feature in expected_features}])
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

    def rank(self, query: str, candidates: list[dict], limit: int = 3) -> list[dict]:
        if not candidates:
            return []
        embeddings = np.asarray(self.encode([query, *[item["text"] for item in candidates]]))
        scores = embeddings[1:] @ embeddings[0]
        ranked = sorted(zip(candidates, scores), key=lambda item: float(item[1]), reverse=True)[:limit]
        return [{**item, "similarity": round(float(score), 3)} for item, score in ranked]
