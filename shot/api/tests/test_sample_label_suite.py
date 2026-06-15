from __future__ import annotations

import json
from pathlib import Path

from models import ComplianceStatus, ExpectedValues, ExtractedFields
from services.validation import ValidationService

TEST_IMAGES_DIR = Path(__file__).resolve().parents[2] / "test-images"
MANIFEST_PATH = TEST_IMAGES_DIR / "manifest.json"
MANIFEST = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

def _expected_values() -> ExpectedValues:
    defaults = MANIFEST["default_expected_values"]
    return ExpectedValues(
        brand=defaults["brand_name"],
        class_type=defaults["class_type"],
        abv=defaults["alcohol_content"],
        net=defaults["net_contents"],
    )

def _build_extracted_fields(case: dict) -> ExtractedFields:
    raw_text = " ".join(
        value
        for value in [
            case.get("title"),
            case.get("class_type"),
            case.get("abv"),
            case.get("net"),
            case.get("warning"),
        ]
        if value
    )
    return ExtractedFields(
        brand=case.get("title"),
        class_type=case.get("class_type"),
        abv=case.get("abv"),
        net=case.get("net"),
        warning=case.get("warning"),
        raw=raw_text,
    )

def _expected_status(case: dict) -> ComplianceStatus:
    file_name = case["file"]
    if "case_variant_review" in file_name:
        return ComplianceStatus.WARNING
    if "fail" in file_name:
        return ComplianceStatus.NON_COMPLIANT
    return ComplianceStatus.COMPLIANT

def test_manifest_references_existing_sample_images() -> None:
    missing_files = [case["file"] for case in MANIFEST["cases"] if not (TEST_IMAGES_DIR / case["file"]).exists()]

    assert missing_files == []

def test_manifest_cases_produce_expected_validation_outcomes() -> None:
    validation_service = ValidationService()
    expected = _expected_values()

    mismatches: list[str] = []
    for case in MANIFEST["cases"]:
        result = validation_service.validate(_build_extracted_fields(case), expected)
        expected_status = _expected_status(case)
        if result.status != expected_status:
            mismatches.append(
                f"{case['file']}: expected {expected_status.value}, got {result.status.value}"
            )

    assert mismatches == []