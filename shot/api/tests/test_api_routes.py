from __future__ import annotations

import importlib
import sys

from fastapi.testclient import TestClient

from models import (
    BatchJob,
    BatchJobStatus,
    BatchJobSummary,
    ComplianceStatus,
    ExpectedValues,
    FieldValidation,
    GovernmentWarningValidation,
    LabelAnalysisResult,
    MatchType,
    ProcessingMetrics,
)


def _load_main_module(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    if "main" in sys.modules:
        return importlib.reload(sys.modules["main"])
    return importlib.import_module("main")


def _build_result() -> LabelAnalysisResult:
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
        elapsed=25.0,
        metrics=ProcessingMetrics(
            total=25.0,
            target=5000.0,
            ok=True,
            stages=[],
        ),
    )


class _RecordingAnalysisService:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def analyze(self, img: bytes, mime: str, expected: ExpectedValues) -> LabelAnalysisResult:
        self.calls.append(
            {
                "img": img,
                "mime": mime,
                "expected": expected,
            }
        )
        return _build_result()


def test_analyze_route_accepts_ui_form_field_names(monkeypatch) -> None:
    main = _load_main_module(monkeypatch)
    analysis = _RecordingAnalysisService()
    monkeypatch.setattr(main, "_analysis", analysis)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/analyze",
            files={"image": ("label.png", b"image-bytes", "image/png")},
            data={"expected": '{"brand": "OLD TOM DISTILLERY"}'},
        )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert "warning" in payload
    assert "elapsed" in payload
    assert len(analysis.calls) == 1
    assert analysis.calls[0]["img"] == b"image-bytes"
    assert analysis.calls[0]["mime"] == "image/png"
    expected = analysis.calls[0]["expected"]
    assert isinstance(expected, ExpectedValues)
    assert expected.brand == "OLD TOM DISTILLERY"


def test_batch_route_accepts_ui_form_field_names(monkeypatch) -> None:
    main = _load_main_module(monkeypatch)
    captured: dict[str, object] = {}

    def fake_create(files, expected):
        captured["files"] = files
        captured["expected"] = expected
        return BatchJob(
            id="job-1",
            created="2026-06-12T00:00:00Z",
            updated="2026-06-12T00:00:00Z",
            status=BatchJobStatus.QUEUED,
            summary=BatchJobSummary(
                total=1,
                queued=1,
                processing=0,
                completed=0,
                failed=0,
            ),
            items=[],
        )

    monkeypatch.setattr(main._batch, "create", fake_create)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/batches",
            files={"images": ("label.png", b"image-bytes", "image/png")},
            data={"expected": '{"brand": "OLD TOM DISTILLERY"}'},
        )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert "created" in payload
    assert "summary" in payload and "queued" in payload["summary"]
    assert len(captured["files"]) == 1
    assert captured["files"][0].file == "label.png"
    assert captured["files"][0].mime == "image/png"
    assert captured["files"][0].img == b"image-bytes"
    expected = captured["expected"]
    assert isinstance(expected, ExpectedValues)
    assert expected.brand == "OLD TOM DISTILLERY"