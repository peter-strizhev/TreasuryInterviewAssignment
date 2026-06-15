from __future__ import annotations

import asyncio

from models import (
    ComplianceStatus,
    ExpectedValues,
    FieldValidation,
    GovernmentWarningValidation,
    LabelAnalysisResult,
    MatchType,
    ProcessingMetrics,
)
from services.batch import BatchFilePayload, BatchProcessingService


def _build_result(elapsed: float) -> LabelAnalysisResult:
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
        elapsed=elapsed,
        metrics=ProcessingMetrics(
            total=elapsed,
            target=5000.0,
            ok=True,
            stages=[],
        ),
    )


class _SuccessfulAnalysisService:
    def analyze(self, img: bytes, mime: str, expected: ExpectedValues) -> LabelAnalysisResult:
        return _build_result(elapsed=float(len(img) * 10))


class _FailingAnalysisService:
    def analyze(self, img: bytes, mime: str, expected: ExpectedValues) -> LabelAnalysisResult:
        raise RuntimeError(f"Unable to process {mime}")


def test_process_job_records_item_timing_and_completion_summary() -> None:
    async def run_test() -> None:
        service = BatchProcessingService(_SuccessfulAnalysisService())
        job = service.create(
            files=[
                BatchFilePayload(file="label-1.png", mime="image/png", img=b"abc"),
                BatchFilePayload(file="label-2.png", mime="image/png", img=b"abcdef"),
            ],
            expected=ExpectedValues(),
        )

        record = service._jobs[job.id]
        await service._process_job(record)

        processed_job = service.get(job.id)
        assert processed_job is not None
        assert processed_job.status == "completed"
        assert processed_job.summary.completed == 2
        assert processed_job.summary.failed == 0

        first_item, second_item = processed_job.items
        assert first_item.started is not None
        assert first_item.done is not None
        assert first_item.elapsed == 30.0
        assert second_item.elapsed == 60.0
        assert all(item.result is not None for item in processed_job.items)

    asyncio.run(run_test())


def test_process_job_records_failure_elapsed_time_and_error() -> None:
    async def run_test() -> None:
        service = BatchProcessingService(_FailingAnalysisService())
        job = service.create(
            files=[BatchFilePayload(file="label-1.png", mime="image/png", img=b"abc")],
            expected=ExpectedValues(),
        )

        record = service._jobs[job.id]
        await service._process_job(record)

        processed_job = service.get(job.id)
        assert processed_job is not None
        assert processed_job.status == "failed"
        assert processed_job.summary.failed == 1

        item = processed_job.items[0]
        assert item.result is None
        assert item.error == "Unable to process image/png"
        assert item.started is not None
        assert item.done is not None
        assert item.elapsed is not None
        assert item.elapsed >= 0.0

    asyncio.run(run_test())