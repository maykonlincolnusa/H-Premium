from typing import Optional

from pydantic import BaseModel, Field


class PropertyInput(BaseModel):
    bairro: str = Field(min_length=2, max_length=100, examples=["Barra da Tijuca"])
    area_m2: float = Field(gt=10, le=10_000, examples=[180])
    quartos: int = Field(ge=0, le=10, examples=[4], description="Registrado para comparáveis futuros; não é usado pelo baseline ITBI.")
    suites: int = Field(ge=0, le=10, examples=[2], description="Registrado para comparáveis futuros; não é usado pelo baseline ITBI.")
    vagas: int = Field(ge=0, le=10, examples=[3], description="Registrado para comparáveis futuros; não é usado pelo baseline ITBI.")
    descricao: str = Field(min_length=1, max_length=5_000, examples=["Apartamento frontal mar, andar alto, varanda gourmet e vista livre."])


class ValuationResponse(BaseModel):
    estimated_price_m2: float
    estimated_total_brl: float
    confidence: str
    explanation: str


class PropertyCreate(BaseModel):
    name: str = Field(min_length=3, max_length=160)
    bairro: str = Field(min_length=2, max_length=100)
    details: str = Field(min_length=1, max_length=1000)
    area_m2: float = Field(gt=10, le=10_000)
    asking_brl: float = Field(gt=0)
    market_brl: Optional[float] = Field(default=None, gt=0)
    days_on_market: int = Field(default=0, ge=0, le=10_000)
    responsible: str = Field(default="Não atribuído", max_length=120)
    stage: str = Field(default="Captação", max_length=50)
    visits: int = Field(default=0, ge=0)
    proposals: int = Field(default=0, ge=0)


class ComparableRequest(BaseModel):
    property_id: int = Field(gt=0)
