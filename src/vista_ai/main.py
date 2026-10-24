from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from .schemas import PropertyInput, ValuationResponse
from .services import SimilarityService, ValuationService

app = FastAPI(title="Vista AI", version="0.1.0", description="Inteligência de mercado para imóveis premium do Rio.")
valuation = ValuationService()
similarity = SimilarityService()
ROOT = Path(__file__).resolve().parents[2]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "price_model_loaded": valuation.model is not None}


@app.post("/v1/valuation", response_model=ValuationResponse)
def create_valuation(property: PropertyInput) -> ValuationResponse:
    try:
        price_m2, confidence = valuation.estimate(property.bairro, property.area_m2, property.quartos, property.suites, property.vagas)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    total = price_m2 * property.area_m2
    return ValuationResponse(
        estimated_price_m2=round(price_m2, 2),
        estimated_total_brl=round(total, 2),
        confidence=confidence,
        explanation=(
            "Estimativa tabular baseada em ITBI por bairro e área. "
            "Quartos, suítes, vagas e descrição devem ser validados com comparáveis reais; "
            "não fazem parte da base ITBI deste modelo."
        ),
    )


@app.post("/v1/embeddings")
def create_embeddings(texts: list[str]) -> dict:
    if not texts or len(texts) > 50:
        raise HTTPException(status_code=422, detail="Envie de 1 a 50 textos.")
    try:
        embeddings = similarity.encode(texts)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Modelo de comparáveis indisponível. Baixe-o com: python scripts/download_model.py",
        ) from exc
    return {"model": "intfloat/multilingual-e5-small", "embeddings": embeddings}


@app.get("/v1/training/summary")
def training_summary() -> dict:
    return {
        "status": "completed" if valuation.model is not None else "awaiting_training",
        **valuation.metrics,
        "raw_files": ["itbi_2019_2024.xlsx", "itbi_2025_diante.xlsx"],
    }


@app.get("/", include_in_schema=False, response_class=HTMLResponse)
def frontend() -> str:
    """Serve the dashboard shell; its only controller is dashboard.js."""
    index = ROOT / "dist" / "index.html"
    return index.read_text(encoding="utf-8")


app.mount("/", StaticFiles(directory=ROOT / "dist", html=True), name="frontend")
