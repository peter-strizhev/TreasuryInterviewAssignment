from __future__ import annotations

import time

from fastapi import HTTPException

from models import ComplianceStatus, ExpectedValues, LabelAnalysisResult, TimingMetric
from services.ocr import OCRService
from config.settings import settings
from services.validation import ValidationService

class AnalysisService:
    def __init__(self, ocr: OCRService, validation: ValidationService) -> None:
        self._ocr = ocr
        self._validation = validation
        self._mime_types = set(settings.acceptedMimeTypes)
        self._max_size = settings.maxImageSizeMb * 1024 * 1024

    def analyze(
        self,
        img: bytes,
        mime: str,
        expected: ExpectedValues,
    ) -> LabelAnalysisResult:
        if mime not in self._mime_types:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime}")

        if len(img) > self._max_size:
            raise HTTPException(status_code=413, detail=f"Image exceeds {settings.maxImageSizeMb} MB limit")

        start = time.perf_counter()
        ocr_start = time.perf_counter()
        ocr = self._ocr.extract(img, mime=mime)
        ocr_ms = (time.perf_counter() - ocr_start) * 1000

        check_start = time.perf_counter()
        out = self._validation.validate(ocr.fields, expected)
        check_ms = (time.perf_counter() - check_start) * 1000

        total = (time.perf_counter() - start) * 1000
        out.elapsed = total
        out.metrics.total = total
        out.metrics.target = settings.targetProcessingMs
        out.metrics.ok = total <= settings.targetProcessingMs
        out.metrics.stages = [
            TimingMetric(name="OCR", ms=ocr_ms),
            TimingMetric(name="Validation", ms=check_ms),
        ]
        out.ocr = ocr.fields.raw
        out.steps = ocr.steps

        if not out.ocr.strip():
            out.status = ComplianceStatus.NON_COMPLIANT
            out.outcome = "No readable text detected"

        return out