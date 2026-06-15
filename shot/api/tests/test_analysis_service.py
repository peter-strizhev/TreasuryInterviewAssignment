from __future__ import annotations

from fastapi import HTTPException

from models import (
    ComplianceStatus,
    ExpectedValues,
    ExtractedFields,
    FieldValidation,
    GovernmentWarningValidation,
    LabelAnalysisResult,
    MatchType,
    OCRExtractionResult,
    OCRPreprocessingStep,
    ProcessingMetrics,
)
from services.analysis import AnalysisService

class _FakeOCRService:
    def extract(self, img: bytes, mime: str = "image/jpeg") -> OCRExtractionResult:
        return OCRExtractionResult(
            fields=ExtractedFields(raw=""),
            steps=[OCRPreprocessingStep(name="prep", applied=True)],
        )


class _ReadableFakeOCRService:
    def extract(self, img: bytes, mime: str = "image/jpeg") -> OCRExtractionResult:
        return OCRExtractionResult(
            fields=ExtractedFields(raw="OLD TOM DISTILLERY 750 mL"),
            steps=[OCRPreprocessingStep(name="prep", applied=True)],
        )

class _FakeValidationService:
    def validate(self, extracted: ExtractedFields, expected: ExpectedValues) -> LabelAnalysisResult:
        return LabelAnalysisResult(
            session="session",
            timestamp="2026-06-12T00:00:00Z",
            fields=[
                FieldValidation(
                    name="Brand Name",
                    found="OLD TOM DISTILLERY",
                    expected="OLD TOM DISTILLERY",
                    status=ComplianceStatus.COMPLIANT,
                    details="Exact match",
                    match=MatchType.EXACT,
                    score=1.0,
                )
            ],
            warning=GovernmentWarningValidation(
                name="Government Warning",
                found="GOVERNMENT WARNING: exact text",
                expected="GOVERNMENT WARNING: exact text",
                status=ComplianceStatus.COMPLIANT,
                details="Government warning is valid",
                match=MatchType.EXACT,
                score=1.0,
                present=True,
                caps=True,
                exact=True,
            ),
            status=ComplianceStatus.COMPLIANT,
            elapsed=0.0,
            metrics=ProcessingMetrics(
                total=0.0,
                target=5000.0,
                ok=True,
                stages=[],
            ),
        )

def test_analyze_marks_blank_ocr_text_as_non_compliant() -> None:
    service = AnalysisService(_FakeOCRService(), _FakeValidationService())

    result = service.analyze(
        img=b"image",
        mime="image/png",
        expected=ExpectedValues(),
    )

    assert result.status == ComplianceStatus.NON_COMPLIANT
    assert result.outcome == "No readable text detected"
    assert result.ocr == ""


def test_analyze_preserves_ocr_text_and_preprocessing_steps() -> None:
    service = AnalysisService(_ReadableFakeOCRService(), _FakeValidationService())

    result = service.analyze(
        img=b"image",
        mime="image/png",
        expected=ExpectedValues(),
    )

    assert result.ocr == "OLD TOM DISTILLERY 750 mL"
    assert len(result.steps) == 1
    assert result.steps[0].name == "prep"
    assert result.outcome is None

def test_analyze_rejects_unsupported_file_types() -> None:
    service = AnalysisService(_FakeOCRService(), _FakeValidationService())

    try:
        service.analyze(
            img=b"image",
            mime="application/pdf",
            expected=ExpectedValues(),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "Unsupported file type" in str(exc.detail)
    else:
        raise AssertionError("Expected HTTPException for unsupported mime type")