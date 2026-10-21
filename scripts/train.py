"""Train an auditable baseline price-per-m² model from official Rio ITBI spreadsheets."""
import json
import re
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "models"
CACHE = ROOT / "data" / "processed" / "itbi_training_v2.csv"


def normalise(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(name).lower().strip()).strip("_")


def choose(columns: list[str], patterns: list[str]) -> Optional[str]:
    return next((c for c in columns if any(p in c for p in patterns)), None)


def load_itbi() -> pd.DataFrame:
    if CACHE.exists():
        return pd.read_csv(CACHE)
    files = sorted(RAW.glob("itbi_*.xlsx"))
    if not files:
        raise FileNotFoundError("Planilhas não encontradas em data/raw.")
    frames = []
    for file in files:
        for _, frame in pd.read_excel(file, sheet_name=None).items():
            frame.columns = [normalise(c) for c in frame.columns]
            cols = list(frame.columns)
            bairro = "bairro" if "bairro" in cols else ("nm_bairro_norm" if "nm_bairro_norm" in cols else choose(cols, ["bairro"]))
            area = "area" if "area" in cols else choose(cols, ["area_construida", "area"])
            value = "vl_declarado" if "vl_declarado" in cols else ("valor_transacoes" if "valor_transacoes" in cols else choose(cols, ["valor_transacao", "valor_do_imovel", "valor"]))
            if not all([bairro, area, value]):
                raise ValueError(f"Não consegui mapear bairro/área/valor em {file.name}. Colunas: {cols}")
            frames.append(pd.DataFrame({"bairro": frame[bairro], "area_m2": pd.to_numeric(frame[area], errors="coerce"), "value_brl": pd.to_numeric(frame[value], errors="coerce")}))
    data = pd.concat(frames, ignore_index=True)
    data["quartos"] = 0
    data["suites"] = 0
    data["vagas"] = 0
    data = data.dropna(subset=["bairro", "area_m2", "value_brl"])
    data = data[(data.area_m2 >= 20) & (data.area_m2 <= 1500) & (data.value_brl >= 100000)]
    data["bairro"] = data["bairro"].astype(str).str.replace(r"_x0020_", " ", regex=True).str.strip().str.upper()
    data["price_m2"] = data.value_brl / data.area_m2
    data = data[(data.price_m2 >= 1000) & (data.price_m2 <= 100000)]
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(CACHE, index=False)
    return data


def main() -> None:
    OUT.mkdir(exist_ok=True)
    data = load_itbi()
    # Baseline deliberately capped so it can be retrained on a laptop and in CI.
    # Production can remove this cap after validating the feature set with the brokerage.
    data = data.sample(n=min(len(data), 75000), random_state=42)
    X = data[["bairro", "area_m2", "quartos", "suites", "vagas"]]
    y = np.log1p(data["price_m2"])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    preprocessor = ColumnTransformer([
        ("bairro", Pipeline([("fill", SimpleImputer(strategy="most_frequent")), ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), ["bairro"]),
        ("numerical", SimpleImputer(strategy="median"), ["area_m2", "quartos", "suites", "vagas"]),
    ])
    model = Pipeline([("features", preprocessor), ("regressor", HistGradientBoostingRegressor(max_iter=100, l2_regularization=1.0, random_state=42))])
    model.fit(X_train, y_train)
    prediction = np.expm1(model.predict(X_test))
    actual = np.expm1(y_test)
    metrics = {"records": int(len(data)), "mae_brl_m2": round(float(mean_absolute_error(actual, prediction)), 2), "source": "ITBI Prefeitura do Rio"}
    joblib.dump(model, OUT / "price_model.joblib")
    (OUT / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2))
    print(json.dumps(metrics, ensure_ascii=False))


if __name__ == "__main__":
    main()
