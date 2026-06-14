from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from difflib import SequenceMatcher

from models import (
    ComplianceStatus,
    ExpectedValues,
    ExtractedFields,
    FieldValidation,
    GovernmentWarningValidation,
    LabelAnalysisResult,
    MatchType,
    ProcessingMetrics,
)
from config.settings import settings

_PUNCTUATION_PATTERN = re.compile(r"[^\w\s]")
_WHITESPACE_PATTERN = re.compile(r"\s+")

class ValidationService:
    def validate(self, extracted: ExtractedFields, expected: ExpectedValues) -> LabelAnalysisResult:
        fields = [
            self._validate_field(label, getattr(extracted, attr), getattr(expected, attr))
            for label, attr in ((item.label, item.attribute) for item in settings.fieldDefinitions)
        ]
        warning = self._validate_warning(extracted.warning)

        statuses = [field.status for field in fields] + [warning.status]
        if ComplianceStatus.NON_COMPLIANT in statuses:
            status = ComplianceStatus.NON_COMPLIANT
        elif ComplianceStatus.WARNING in statuses:
            status = ComplianceStatus.WARNING
        else:
            status = ComplianceStatus.COMPLIANT

        return LabelAnalysisResult(
            session=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            fields=fields,
            warning=warning,
            status=status,
            elapsed=0.0,
            metrics=ProcessingMetrics(
                total=0.0,
                target=settings.targetProcessingMs,
                ok=True,
                stages=[],
            ),
        )

    @staticmethod
    def _validate_field(
        name: str,
        found: str | None,
        expected: str | None,
    ) -> FieldValidation:
        if found is None:
            return FieldValidation(
                name=name,
                found=None,
                expected=expected,
                status=ComplianceStatus.NON_COMPLIANT,
                details="Field not detected on label",
                match=MatchType.MISSING,
                score=0.0,
                reason="OCR could not confidently locate this field on the label image.",
                fix="Retake the label photo with flatter angle, lower glare, and the field fully visible.",
            )

        if expected is None:
            return FieldValidation(
                name=name,
                found=found,
                expected=None,
                status=ComplianceStatus.NOT_CHECKED,
                details="No expected value provided for comparison",
                match=MatchType.NOT_CHECKED,
                score=0.5,
                reason=None,
                fix="Provide an application value if you want this field validated automatically.",
            )

        got = found.strip()
        want = expected.strip()

        if got == want:
            return FieldValidation(
                name=name,
                found=found,
                expected=expected,
                status=ComplianceStatus.COMPLIANT,
                details="Exact match",
                match=MatchType.EXACT,
                score=1.0,
                reason=None,
                fix=None,
            )

        norm_got = ValidationService._normalize(got)
        norm_want = ValidationService._normalize(want)
        flat_got = ValidationService._strip(norm_got)
        flat_want = ValidationService._strip(norm_want)

        if norm_got == norm_want:
            return FieldValidation(
                name=name,
                found=found,
                expected=expected,
                status=ComplianceStatus.WARNING,
                details="Likely match; capitalization or spacing differs from the application value",
                match=MatchType.PROBABLE,
                score=0.97,
                reason="The value appears equivalent after case and whitespace normalization.",
                fix=f"Review '{expected}' as the likely intended normalized value.",
            )

        if flat_got == flat_want:
            return FieldValidation(
                name=name,
                found=found,
                expected=expected,
                status=ComplianceStatus.WARNING,
                details="Likely match; punctuation or formatting differs from the application value",
                match=MatchType.PROBABLE,
                score=0.95,
                reason="The value appears equivalent after punctuation normalization.",
                fix=f"Review '{expected}' as the likely intended formatted value.",
            )

        sim = ValidationService._ratio(flat_got, flat_want)

        if sim >= settings.probableMatchThreshold:
            return FieldValidation(
                name=name,
                found=found,
                expected=expected,
                status=ComplianceStatus.WARNING,
                details=f"Probable match; formatting differs but normalized similarity is {sim:.0%}",
                match=MatchType.PROBABLE,
                score=round(min(sim, 0.99), 2),
                reason="The extracted text is close to the expected value but not an exact normalized match.",
                fix=f"Likely intended value: '{expected}'. Confirm the label formatting before approval.",
            )

        return FieldValidation(
            name=name,
            found=found,
            expected=expected,
            status=ComplianceStatus.NON_COMPLIANT,
            details=f"Extracted value does not match expected value (normalized similarity {sim:.0%})",
            match=MatchType.MISMATCH,
            score=round(max(sim, 0.0), 2),
            reason="The extracted text materially differs from the application value after normalization.",
            fix=(
                f"Review whether '{expected}' is the intended value."
                if sim >= 0.45
                else "Inspect the raw OCR text and the label image to verify the correct field value."
            ),
        )

    @staticmethod
    def _normalize(value: str) -> str:
        return _WHITESPACE_PATTERN.sub(" ", value.casefold()).strip()

    @staticmethod
    def _strip(value: str) -> str:
        without_punctuation = _PUNCTUATION_PATTERN.sub(" ", value)
        return _WHITESPACE_PATTERN.sub(" ", without_punctuation).strip()

    @staticmethod
    def _ratio(left: str, right: str) -> float:
        if not left or not right:
            return 0.0
        return SequenceMatcher(None, left, right).ratio()

    @staticmethod
    def _validate_warning(text: str | None) -> GovernmentWarningValidation:
        if not text:
            return GovernmentWarningValidation(
                name="Government Warning",
                found=None,
                expected=settings.requiredGovWarning,
                status=ComplianceStatus.NON_COMPLIANT,
                details="Government warning statement not found on label",
                match=MatchType.MISSING,
                score=0.0,
                reason="The mandatory government warning was not detected anywhere in the OCR text.",
                fix="Retake the image with the full warning visible and verify the warning is printed on the label.",
                present=False,
                caps=False,
                exact=False,
            )

        caps = text.strip().startswith("GOVERNMENT WARNING:")
        got = " ".join(text.split())
        want = " ".join(settings.requiredGovWarning.split())
        exact = got == want

        if not caps:
            status = ComplianceStatus.NON_COMPLIANT
            details = '"GOVERNMENT WARNING:" must appear in all-capital letters'
            match = MatchType.MISMATCH
            score = 0.2
            reason = "The warning heading is present but the capitalization does not satisfy TTB requirements."
            fix = 'Update the label copy so "GOVERNMENT WARNING:" appears exactly in all caps.'
        elif not exact:
            status = ComplianceStatus.NON_COMPLIANT
            details = "Warning text does not exactly match the required TTB statement"
            match = MatchType.MISMATCH
            score = 0.35
            reason = "The warning statement wording differs from the required TTB text."
            fix = "Replace the warning with the exact required government warning statement."
        else:
            status = ComplianceStatus.COMPLIANT
            details = "Government warning is valid"
            match = MatchType.EXACT
            score = 1.0
            reason = None
            fix = None

        return GovernmentWarningValidation(
            name="Government Warning",
            found=text,
            expected=settings.requiredGovWarning,
            status=status,
            details=details,
            match=match,
            score=score,
            reason=reason,
            fix=fix,
            present=True,
            caps=caps,
            exact=exact,
        )
