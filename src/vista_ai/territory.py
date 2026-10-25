"""Public-data enrichment with a short in-memory cache for presentation use."""
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

IBGE_RIO = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios/3304557"


class TerritoryService:
    def __init__(self) -> None:
        self._cached: Optional[dict] = None
        self._expires_at: Optional[datetime] = None

    def context(self, bairro: str) -> dict:
        now = datetime.now(timezone.utc)
        if self._cached is None or self._expires_at is None or now >= self._expires_at:
            try:
                response = httpx.get(IBGE_RIO, timeout=5.0, headers={"User-Agent": "Vista-AI-H-Premium/1.0"})
                response.raise_for_status()
                data = response.json()
                self._cached = {"municipality": data.get("nome", "Rio de Janeiro"), "state": data.get("microrregiao", {}).get("mesorregiao", {}).get("UF", {}).get("sigla", "RJ")}
                self._expires_at = now + timedelta(hours=24)
            except httpx.HTTPError:
                self._cached = {"municipality": "Rio de Janeiro", "state": "RJ"}
                self._expires_at = now + timedelta(minutes=10)
        return {"bairro": bairro.strip(), **self._cached, "source": "IBGE — Serviço de Dados", "retrieved_at": now.isoformat(), "note": "Contexto territorial oficial; complemente com dados autorizados da carteira para decisão comercial."}
