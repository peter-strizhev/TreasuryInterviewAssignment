from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from models import ExtractedFields, OCRPreprocessingStep
from services.ocr import OCRService
from services.processing import PreprocessedImage

def _build_ocr_service(response_content: str | None = None) -> OCRService:
    service = object.__new__(OCRService)
    service._client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(
                create=lambda **_: SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content=response_content))]
                )
            )
        )
    )
    return service

def test_extract_returns_empty_fields_when_message_content_is_missing() -> None:
    service = _build_ocr_service(response_content=None)

    result = service._extract(b"image-bytes", "image/png")

    assert result == ExtractedFields()

def test_extract_returns_empty_fields_for_invalid_json() -> None:
    service = _build_ocr_service(response_content="{not valid json")

    result = service._extract(b"image-bytes", "image/png")

    assert result == ExtractedFields()

def test_extract_filters_unknown_keys_and_sanitizes_hallucinated_fields() -> None:
    service = _build_ocr_service(
        response_content=json.dumps(
            {
                "brand": "OLD TOM DISTILLERY",
                "class_type": "Kentucky Straight Bourbon Whiskey",
                "abv": "45% Alc./Vol. (90 Proof)",
                "net": "750 mL",
                "warning": "GOVERNMENT WARNING: exact text",
                "raw": "OLD TOM DISTILLERY 750 mL",
                "invented": "ignore me",
            }
        )
    )

    result = service._extract(b"image-bytes", "image/png")

    assert result.brand == "OLD TOM DISTILLERY"
    assert result.net == "750 mL"
    assert result.class_type is None
    assert result.abv is None
    assert result.warning is None

def test_sanitize_extraction_returns_empty_when_raw_text_is_empty() -> None:
    sanitized = OCRService._sanitize(
        ExtractedFields(
            brand="OLD TOM DISTILLERY",
            raw="   ",
        )
    )

    assert sanitized == ExtractedFields()

@pytest.mark.integration
def test_extract_returns_primary_preprocessed_result() -> None:
    service = object.__new__(OCRService)
    service._prep = SimpleNamespace(
        prep=lambda _: PreprocessedImage(
            img=b"primary",
            mime="image/jpeg",
            steps=[OCRPreprocessingStep(name="prep", applied=True)],
        )
    )
    service._extract = lambda img, mime: ExtractedFields(raw="primary text")

    result = service.extract(b"ignored-image")

    assert result.fields.raw == "primary text"
    assert result.steps[0].name == "prep"