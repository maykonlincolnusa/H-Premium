# Vista AI — Precificação Premium Rio

Produto de IA para análise de mercado imobiliário premium na Barra da Tijuca. Ele combina transações oficiais de ITBI do Rio com descrições da carteira da imobiliária.

## O que existe neste repositório

- `data/raw/`: planilhas oficiais de ITBI baixadas da Prefeitura do Rio (não versionadas no Git)
- `scripts/train.py`: treina o estimador de preço por m² a partir do ITBI
- `scripts/download_model.py`: baixa o modelo de embeddings do Hugging Face
- `src/vista_ai/`: API FastAPI e serviços de precificação/comparáveis
- `models/`: artefatos treinados e modelo HF, gerados localmente e ignorados pelo Git
- `Dockerfile` + `railway.toml`: deploy na Railway

## Fontes de dados

1. **ITBI — Prefeitura do Rio**: transações por trecho de logradouro. É a referência de negócio do projeto, não o Hugging Face.
2. **Carteira/CRM da imobiliária**: captações, visitas, propostas, fotos e descrições. Deve ser conectado no piloto.
3. **Hugging Face**: `intfloat/multilingual-e5-small`, um modelo pré-treinado de embeddings para encontrar imóveis semanticamente comparáveis em português.

As planilhas usadas foram publicadas pela Secretaria Municipal de Fazenda: <https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro/>.

## Como executar localmente

Requer Python 3.9+.

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python scripts/download_model.py
python scripts/train.py
uvicorn vista_ai.main:app --host 0.0.0.0 --port 8000
```

Documentação interativa: `http://localhost:8000/docs`.

Abra o painel pela mesma origem da API em `http://localhost:8000` para que a
precificação funcione automaticamente. Se a pasta `dist/` for hospedada como
site estático, informe a URL pública da API uma única vez pelo parâmetro
`?api=https://sua-api.exemplo.com`; o painel guarda essa configuração no
navegador. A API já responde a requisições cross-origin para esse cenário.

## Treinamento

O treinamento não faz fine-tuning de um LLM. Ele treina um **modelo tabular de valuation** sobre transações oficiais e usa o modelo HF já pré-treinado para similaridade semântica. Isso é mais seguro, auditável e adequado para a primeira versão, pois não existe conjunto de rótulos próprio para fine-tuning de linguagem.

O script salva `models/price_model.joblib` e `models/metrics.json`. Nesta versão, a estimativa usa somente bairro e área construída: as planilhas ITBI não contêm quartos, suítes, vagas ou características descritivas. Para produção, valide o erro por bairro/tipologia e complemente ITBI com comparáveis reais e dados autorizados da imobiliária antes de usar esses atributos na precificação.

## Railway

1. Crie um projeto na Railway a partir deste repositório.
2. Configure as variáveis `HF_MODEL_NAME=intfloat/multilingual-e5-small` e `PORT=8000`.
3. Faça o deploy pelo `railway.toml`. O build baixa o modelo HF e inclui o estimador versionado em `models/`.

### Operação compartilhada

O piloto operacional persiste carteira e ações em SQLite. No Railway, adicione
um Volume e configure `DATABASE_PATH=/data/vista_ai.db`; sem o Volume, os dados
podem ser reinicializados em um novo deploy. A API oferece `GET/POST
/v1/properties`, `GET /v1/actions`, conclusão de ações e `/v1/comparables`.
Essa última rota usa `intfloat/multilingual-e5-small` para ranquear imóveis da
carteira por similaridade semântica.

Para trazer a carteira inicial, envie um CSV UTF-8 para `POST /v1/import/csv`.
As colunas obrigatórias são `name,bairro,details,area_m2,asking_brl`; as
opcionais são `market_brl,days_on_market,responsible,stage,visits,proposals`.
O resumo gerencial fica em `GET /v1/management/summary`.

Não suba CRM, endereços completos, dados pessoais ou credenciais para o Git. O `.gitignore` já protege os dados brutos e artefatos locais.

## Render

O `render.yaml` define este projeto como um serviço web Docker com verificação em `/health`.
Ao conectar o repositório no Render, selecione a branch `main` e o diretório raiz do repositório. O `Dockerfile` já inclui a interface em `dist/`, o código da API e o modelo tabular treinado.
