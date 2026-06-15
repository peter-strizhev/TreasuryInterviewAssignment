from __future__ import annotations

import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services.analysis import AnalysisService
from services.batch import BatchFilePayload, BatchProcessingService
from models import BatchJob, ExpectedValues, LabelAnalysisResult
from services.ocr import OCRService
from config.settings import settings
from services.validation import ValidationService

load_dotenv()

_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
if not _OPENAI_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set")

app = FastAPI(
    title="S.H.O.T API",
    description="S.H.O.T — Smart Heuristic OCR and TTB Validator",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ocr = OCRService(api_key=_OPENAI_KEY)
_validation = ValidationService()
_analysis = AnalysisService(_ocr, _validation)
_batch = BatchProcessingService(_analysis)

@app.on_event("startup")
async def startup() -> None:
    await _batch.start()

@app.on_event("shutdown")
async def shutdown() -> None:
    await _batch.stop()

@app.get("/api/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "S.H.O.T API"}

@app.post("/api/analyze", response_model=LabelAnalysisResult, tags=["compliance"])
async def analyze(
    image: UploadFile = File(..., description="Label image file"),
    expected: str = Form(default="{}", description="JSON-encoded expected values"),
) -> LabelAnalysisResult:
    try:
        want = ExpectedValues(**json.loads(expected))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid expected JSON")

    img = await image.read()
    return _analysis.analyze(
        img=img,
        mime=image.content_type or "image/jpeg",
        expected=want,
    )

@app.post("/api/batches", response_model=BatchJob, tags=["compliance"])
async def create_batch(
    images: list[UploadFile] = File(..., description="Label image files"),
    expected: str = Form(default="{}", description="JSON-encoded expected values"),
) -> BatchJob:
    if not images:
        raise HTTPException(status_code=400, detail="At least one image is required")

    if len(images) > settings.maxBatchFiles:
        raise HTTPException(
            status_code=400,
            detail=f"Batch upload exceeds the limit of {settings.maxBatchFiles} files",
        )

    try:
        want = ExpectedValues(**json.loads(expected))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid expected JSON")

    files: list[BatchFilePayload] = []
    for image in images:
        files.append(
            BatchFilePayload(
                file=image.filename or "label-image",
                mime=image.content_type or "image/jpeg",
                img=await image.read(),
            )
        )
    return _batch.create(files, want)

@app.get("/api/batches/{job_id}", response_model=BatchJob, tags=["compliance"])
def get_batch(job_id: str) -> BatchJob:
    job = _batch.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Batch job not found")
    return job

# Health check endpoint for render.com
@app.get("/health")
def health():
    return {"status": "ok"}