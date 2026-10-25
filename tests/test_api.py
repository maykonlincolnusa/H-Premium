import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")

from vista_ai.main import app


class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)
        cls.property = {
            "bairro": "Barra da Tijuca",
            "area_m2": 180,
            "quartos": 4,
            "suites": 2,
            "vagas": 3,
            "descricao": "Andar alto com varanda.",
        }

    def test_health_reports_loaded_model(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["price_model_loaded"])

    def test_dashboard_and_controller_are_served(self) -> None:
        dashboard = self.client.get("/")
        controller = self.client.get("/dashboard.js")
        self.assertEqual(dashboard.status_code, 200)
        self.assertIn('src="./dashboard.js"', dashboard.text)
        self.assertNotIn('type="text/plain"', dashboard.text)
        self.assertEqual(controller.status_code, 200)

    def test_valuation_returns_a_positive_estimate(self) -> None:
        response = self.client.post("/v1/valuation", json=self.property)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertGreater(body["estimated_price_m2"], 0)
        self.assertGreater(body["estimated_total_brl"], 0)

    def test_valuation_rejects_invalid_area(self) -> None:
        response = self.client.post("/v1/valuation", json={**self.property, "area_m2": 0})
        self.assertEqual(response.status_code, 422)

    def test_cross_origin_dashboard_requests_are_allowed(self) -> None:
        response = self.client.post(
            "/v1/valuation",
            json=self.property,
            headers={"Origin": "https://dashboard.example.com"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "*")

    def test_operational_summary_and_csv_import(self) -> None:
        summary = self.client.get("/v1/management/summary")
        self.assertEqual(summary.status_code, 200)
        self.assertIn("pipeline", summary.json())
        csv = "name,bairro,details,area_m2,asking_brl,responsible,stage,visits,proposals\nApartamento teste,Barra da Tijuca,Varanda e vista,120,2500000,Ana,Visita,2,1\n"
        imported = self.client.post("/v1/import/csv", content=csv, headers={"Content-Type": "text/plain"})
        self.assertEqual(imported.status_code, 201)
        self.assertEqual(imported.json()["imported"], 1)


if __name__ == "__main__":
    unittest.main()
