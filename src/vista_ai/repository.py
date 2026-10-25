"""Small operational store for the pilot; use a Railway volume in production."""
import os
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(ROOT / "data" / "vista_ai.db")))

SEED_PROPERTIES = [
    ("Apartamento · Jardim Oceânico", "Barra da Tijuca", "238 m² · 4 quartos · vista parcial", 238, 5200000, 4960000, 12),
    ("Cobertura · Península", "Barra da Tijuca", "180 m² · 3 suítes · andar alto", 180, 4650000, 3900000, 83),
    ("Frontal mar · Lúcio Costa", "Barra da Tijuca", "210 m² · 4 quartos · alto padrão", 210, 7100000, 6900000, 29),
    ("Casa · Itanhangá", "Itanhangá", "420 m² · 5 quartos · terreno amplo", 420, 6300000, 5200000, 112),
]


def connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialise() -> None:
    with connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS properties (
              id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, bairro TEXT NOT NULL,
              details TEXT NOT NULL, area_m2 REAL NOT NULL, asking_brl REAL NOT NULL,
              market_brl REAL, days_on_market INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS actions (
              id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER, title TEXT NOT NULL,
              detail TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(property_id) REFERENCES properties(id)
            );
        """)
        if conn.execute("SELECT COUNT(*) FROM properties").fetchone()[0] == 0:
            conn.executemany("INSERT INTO properties (name,bairro,details,area_m2,asking_brl,market_brl,days_on_market) VALUES (?,?,?,?,?,?,?)", SEED_PROPERTIES)
            conn.execute("INSERT INTO actions (property_id,title,detail) VALUES (2,?,?)", ("Reunião de preço · Cobertura Península", "Pedido acima da referência e 83 dias em carteira."))
            conn.execute("INSERT INTO actions (property_id,title,detail) VALUES (4,?,?)", ("Revisar estratégia · Casa Itanhangá", "112 dias de carteira e distância relevante da faixa."))


def list_properties() -> list[dict]:
    with connection() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM properties ORDER BY created_at DESC, id DESC")]


def create_property(data: dict) -> dict:
    with connection() as conn:
        cursor = conn.execute("INSERT INTO properties (name,bairro,details,area_m2,asking_brl,market_brl,days_on_market) VALUES (?,?,?,?,?,?,?)", (data["name"], data["bairro"], data["details"], data["area_m2"], data["asking_brl"], data.get("market_brl"), data.get("days_on_market", 0)))
        row = conn.execute("SELECT * FROM properties WHERE id=?", (cursor.lastrowid,)).fetchone()
        return dict(row)


def list_actions() -> list[dict]:
    with connection() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM actions WHERE status='open' ORDER BY created_at DESC, id DESC")]


def complete_action(action_id: int) -> bool:
    with connection() as conn:
        return conn.execute("UPDATE actions SET status='done' WHERE id=?", (action_id,)).rowcount == 1
