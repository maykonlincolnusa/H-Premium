import os
import csv
import io
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from .repository import complete_action, create_property, initialise, list_actions, list_properties, management_summary
from .schemas import ComparableRequest, PropertyCreate, PropertyInput, ValuationResponse
from .services import SimilarityService, ValuationService
from .territory import TerritoryService

app = FastAPI(title="Vista AI", version="0.1.0", description="Inteligência de mercado para imóveis premium do Rio.")

# The dashboard can be hosted with the API (Docker/Render) or as a static site.
# Allow a separately hosted dashboard to call the public, read-only valuation API.
allowed_origins = [origin.strip() for origin in os.getenv("CORS_ALLOW_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
valuation = ValuationService()
similarity = SimilarityService()
territory = TerritoryService()
ROOT = Path(__file__).resolve().parents[2]
initialise()


@app.get("/health")
def health() -> dict:
    semantic_path = ROOT / "models" / "hf" / "multilingual-e5-small"
    return {"status": "ok", "price_model_loaded": valuation.model is not None, "semantic_model_ready": semantic_path.exists()}


@app.get("/v1/properties")
def properties() -> list[dict]:
    return list_properties()


@app.get("/v1/management/summary")
def management() -> dict:
    return management_summary()


@app.get("/v1/territory/context")
def territory_context(bairro: str) -> dict:
    if len(bairro.strip()) < 2:
        raise HTTPException(status_code=422, detail="Informe um bairro válido.")
    return territory.context(bairro)


@app.post("/v1/properties", status_code=201)
def add_property(property: PropertyCreate) -> dict:
    return create_property(property.model_dump())


@app.post("/v1/import/csv", status_code=201)
def import_properties_csv(content: str = Body(..., media_type="text/plain")) -> dict:
    """Import a UTF-8 CSV with the operational portfolio columns."""
    reader = csv.DictReader(io.StringIO(content))
    required = {"name", "bairro", "details", "area_m2", "asking_brl"}
    if not reader.fieldnames or not required.issubset(reader.fieldnames):
        raise HTTPException(status_code=422, detail="CSV precisa conter: name,bairro,details,area_m2,asking_brl")
    imported = 0
    for row in reader:
        if not any(row.values()):
            continue
        try:
            create_property({
                "name": row["name"].strip(), "bairro": row["bairro"].strip(), "details": row["details"].strip(),
                "area_m2": float(row["area_m2"]), "asking_brl": float(row["asking_brl"]),
                "market_brl": float(row["market_brl"]) if row.get("market_brl") else None,
                "days_on_market": int(row.get("days_on_market") or 0), "responsible": row.get("responsible") or "Não atribuído",
                "stage": row.get("stage") or "Captação", "visits": int(row.get("visits") or 0), "proposals": int(row.get("proposals") or 0),
            })
            imported += 1
        except (TypeError, ValueError, AttributeError) as exc:
            raise HTTPException(status_code=422, detail=f"Linha inválida no CSV: {row}") from exc
    return {"imported": imported}


@app.get("/v1/actions")
def actions() -> list[dict]:
    return list_actions()


@app.post("/v1/actions/{action_id}/complete")
def close_action(action_id: int) -> dict:
    if not complete_action(action_id):
        raise HTTPException(status_code=404, detail="Ação não encontrada.")
    return {"status": "done"}


@app.post("/v1/comparables")
def comparables(request: ComparableRequest) -> dict:
    portfolio = list_properties()
    subject = next((item for item in portfolio if item["id"] == request.property_id), None)
    if subject is None:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado.")
    candidates = [{"id": item["id"], "name": item["name"], "bairro": item["bairro"], "asking_brl": item["asking_brl"], "text": f'{item["name"]}. {item["bairro"]}. {item["details"]}'} for item in portfolio if item["id"] != subject["id"]]
    try:
        results = similarity.rank(f'{subject["name"]}. {subject["bairro"]}. {subject["details"]}', candidates)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Modelo de comparáveis indisponível.") from exc
    return {"subject_id": subject["id"], "model": "intfloat/multilingual-e5-small", "comparables": results}


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
