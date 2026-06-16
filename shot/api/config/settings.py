from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

class FieldDefinition(BaseModel):
    label: str
    attribute: str

class AppSettings(BaseModel):
    acceptedMimeTypes: list[str]
    maxImageSizeMb: int
    maxBatchFiles: int
    targetProcessingMs: float
    requiredGovWarning: str
    extractionModel: str
    extractionPrompt: str
    probableMatchThreshold: float
    preprocessingContrastFactor: float
    preprocessingSharpnessFactor: float
    ocrImageMaxDimension: int
    ocrImageQuality: int
    ocrImageDetail: Literal["auto", "high", "low"]
    fieldDefinitions: list[FieldDefinition]


def _load_settings() -> AppSettings:
    path = Path(__file__).resolve().parent / "app.json"
    with path.open("r", encoding="utf-8") as config_file:
        raw = json.load(config_file)
    return AppSettings.model_validate(raw)

settings = _load_settings()