from __future__ import annotations

from models import ComplianceStatus, ExpectedValues, ExtractedFields, MatchType
from services.validation import ValidationService

def _field(result, name: str):
    return next(field for field in result.fields if field.name == name)

def test_validate_field_exact_match_is_compliant() -> None:
    result = ValidationService._validate_field("Brand Name", "OLD TOM DISTILLERY", "OLD TOM DISTILLERY")

    assert result.status == ComplianceStatus.COMPLIANT
    assert result.match == MatchType.EXACT
    assert result.score == 1.0

def test_validate_field_case_and_spacing_difference_is_probable_match() -> None:
    result = ValidationService._validate_field("Brand Name", "  old tom   distillery ", "OLD TOM DISTILLERY")

    assert result.status == ComplianceStatus.WARNING
    assert result.match == MatchType.PROBABLE
    assert "capitalization or spacing" in (result.details or "")

def test_validate_field_punctuation_difference_is_probable_match() -> None:
    result = ValidationService._validate_field(
        "Alcohol Content (ABV)",
        "45% Alc Vol 90 Proof",
        "45% Alc./Vol. (90 Proof)",
    )

    assert result.status == ComplianceStatus.WARNING
    assert result.match == MatchType.PROBABLE
    assert "punctuation or formatting differs" in (result.details or "")

def test_validate_field_material_difference_is_non_compliant() -> None:
    result = ValidationService._validate_field("Brand Name", "STONE'S THROW", "OLD TOM DISTILLERY")

    assert result.status == ComplianceStatus.NON_COMPLIANT
    assert result.match == MatchType.MISMATCH
    assert result.score < 0.45

def test_validate_field_without_expected_value_is_not_checked() -> None:
    result = ValidationService._validate_field("Brand Name", "OLD TOM DISTILLERY", None)

    assert result.status == ComplianceStatus.NOT_CHECKED
    assert result.match == MatchType.NOT_CHECKED

def test_validate_field_missing_extracted_value_is_missing() -> None:
    result = ValidationService._validate_field("Brand Name", None, "OLD TOM DISTILLERY")

    assert result.status == ComplianceStatus.NON_COMPLIANT
    assert result.match == MatchType.MISSING

def test_validate_warning_requires_all_caps_heading() -> None:
    result = ValidationService._validate_warning(
        "Government Warning: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems."
    )

    assert result.status == ComplianceStatus.NON_COMPLIANT
    assert result.present is True
    assert result.caps is False

def test_validate_combines_field_and_warning_statuses_into_overall_warning() -> None:
    service = ValidationService()
    extracted = ExtractedFields(
        brand="Old Tom Distillery",
        class_type="Kentucky Straight Bourbon Whiskey",
        abv="45% Alc./Vol. (90 Proof)",
        net="750 mL",
        warning=(
            "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems."
        ),
        raw="label text",
    )
    expected = ExpectedValues(
        brand="OLD TOM DISTILLERY",
        class_type="Kentucky Straight Bourbon Whiskey",
        abv="45% Alc./Vol. (90 Proof)",
        net="750 mL",
    )

    result = service.validate(extracted, expected)

    assert result.status == ComplianceStatus.WARNING
    assert _field(result, "Brand Name").status == ComplianceStatus.WARNING
    assert result.warning.status == ComplianceStatus.COMPLIANT