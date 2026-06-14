from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


WATERMARK_TEXT = "Created by Peter Strizhev for US Treasury Interview"


class ComplianceStatus(str, Enum):
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    WARNING = "warning"
    NOT_CHECKED = "not_checked"

class MatchType(str, Enum):
    EXACT = "exact"
    PROBABLE = "probable"
    MISMATCH = "mismatch"
    MISSING = "missing"
    NOT_CHECKED = "not_checked"

class BatchJobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ExtractedFields(BaseModel):
    brand: Optional[str] = None
    class_type: Optional[str] = None
    abv: Optional[str] = None
    net: Optional[str] = None
    warning: Optional[str] = None
    raw: str = ""

class ExpectedValues(BaseModel):
    brand: Optional[str] = None
    class_type: Optional[str] = None
    abv: Optional[str] = None
    net: Optional[str] = None

class FieldValidation(BaseModel):
    name: str
    found: Optional[str] = None
    expected: Optional[str] = None
    status: ComplianceStatus
    details: Optional[str] = None
    match: MatchType
    score: float
    reason: Optional[str] = None
    fix: Optional[str] = None

class OCRPreprocessingStep(BaseModel):
    name: str
    applied: bool
    details: Optional[str] = None

class OCRExtractionResult(BaseModel):
    fields: ExtractedFields
    steps: list[OCRPreprocessingStep]

class TimingMetric(BaseModel):
    name: str
    ms: float

class ProcessingMetrics(BaseModel):
    total: float
    target: float
    ok: bool
    stages: list[TimingMetric]

class GovernmentWarningValidation(FieldValidation):
    present: bool
    caps: bool
    exact: bool

class LabelAnalysisResult(BaseModel):
    session: str
    timestamp: str
    fields: list[FieldValidation]
    warning: GovernmentWarningValidation
    status: ComplianceStatus
    outcome: Optional[str] = None
    elapsed: float
    metrics: ProcessingMetrics
    ocr: str = ""
    steps: list[OCRPreprocessingStep] = Field(default_factory=list)
    watermark: str = WATERMARK_TEXT

class BatchJobItemResult(BaseModel):
    id: str
    file: str
    status: BatchJobStatus
    result: Optional[LabelAnalysisResult] = None
    error: Optional[str] = None
    started: Optional[str] = None
    done: Optional[str] = None
    elapsed: Optional[float] = None

class BatchJobSummary(BaseModel):
    total: int
    queued: int
    processing: int
    completed: int
    failed: int

class BatchJob(BaseModel):
    id: str
    created: str
    updated: str
    status: BatchJobStatus
    summary: BatchJobSummary
    items: list[BatchJobItemResult]
    watermark: str = WATERMARK_TEXT