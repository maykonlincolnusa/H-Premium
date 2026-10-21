from pydantic import BaseModel, Field


class PropertyInput(BaseModel):
    bairro: str = Field(examples=["Barra da Tijuca"])
    area_m2: float = Field(gt=10, examples=[180])
    quartos: int = Field(ge=0, le=10, examples=[4])
    suites: int = Field(ge=0, le=10, examples=[2])
    vagas: int = Field(ge=0, le=10, examples=[3])
    descricao: str = Field(examples=["Apartamento frontal mar, andar alto, varanda gourmet e vista livre."])


class ValuationResponse(BaseModel):
    estimated_price_m2: float
    estimated_total_brl: float
    confidence: str
    explanation: str
