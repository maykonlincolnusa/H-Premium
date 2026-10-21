"""Download the Hugging Face semantic-similarity model for local/offline serving."""
from pathlib import Path
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[1]
MODEL_NAME = "intfloat/multilingual-e5-small"
TARGET = ROOT / "models" / "hf" / "multilingual-e5-small"

if __name__ == "__main__":
    TARGET.mkdir(parents=True, exist_ok=True)
    SentenceTransformer(MODEL_NAME).save(str(TARGET))
    print(f"Modelo salvo em {TARGET}")
