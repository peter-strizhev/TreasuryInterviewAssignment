# S.H.O.T — Smart Heuristic OCR and TTB Validator

MVP prototype for S.H.O.T, a TTB alcohol label compliance verification tool.

## Architecture

```
Upload Image → OpenAI Vision (OCR Service) → Extract Fields → Validation Engine → Results Table
```

| Layer | Technology | Location |
|---|---|---|
| UI | Next.js 14 + Tailwind CSS | `client/` |
| API | FastAPI (Python) | `api/` |
| OCR | OpenAI GPT-4o Vision | `api/services/ocr.py` |
| Validation | TTB rules engine | `api/services/validation.py` |
| Domain models | Pydantic (backend) / TypeScript (frontend) | `*/models.py`, `*/types/domain.ts` |

## Setup

### API

```bash
cd shot/api
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env and set your OPENAI_API_KEY

uvicorn main:app --reload
# Runs on http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Client

```bash
cd shot/client
npm install
npm run dev
# Runs on http://localhost:3000
```

## Validated Fields

| Field | Source |
|---|---|
| Brand Name | Extracted via OCR, compared to application value |
| Class / Type | Extracted via OCR, compared to application value |
| Alcohol Content (ABV) | Extracted via OCR, compared to application value |
| Net Contents | Extracted via OCR, compared to application value |
| Government Warning | Extracted and validated against exact TTB-mandated text |

### Government Warning Validation (per Jenny Park's requirements)
- Warning statement must be present
- `GOVERNMENT WARNING:` must appear in all-capital letters
- Full warning text must match TTB-mandated wording exactly

## Environment Variables

### API (`.env`)
| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key with GPT-4o access |
| `FRONTEND_URL` | Frontend origin for CORS (default: `http://localhost:3000`) |

### Client (optional `.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |

## Assumptions & Trade-offs

- **No authentication** — prototype scope only; production would require auth.
- **No persistent storage** — each analysis is stateless; results are not saved.
- **Single and batch review supported** — batch jobs stay in memory for the life of the API process and reset on restart.
- **Government Warning comparison** normalizes whitespace but requires exact wording match.
- **Capitalization warnings** — minor case differences on non-warning fields produce a `REVIEW` status rather than outright `FAIL`, per Dave Morrison's feedback about case variants being common in practice.

## Testing

### API tests

```bash
cd shot/api
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pytest -q
```

The backend suite includes:

- unit tests for OCR field extraction sanitization and malformed responses
- unit tests for matching logic and government warning validation
- batch processing tests for queue summaries, elapsed timing, and failure capture
- deterministic OCR service integration tests for preprocessing and rotation fallback
- preprocessing integration tests that run representative sample images from `shot/test-images/` through the OCR image-prep pipeline
- a manifest-backed sample label suite that checks expected compliance outcomes and sample file presence
- edge-case tests for blank OCR output and unsupported file types