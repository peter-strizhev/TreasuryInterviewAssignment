from __future__ import annotations

import os
from pathlib import Path

import pytest

from services.ocr import OCRService

pytestmark = [pytest.mark.integration, pytest.mark.live_ocr]

TEST_IMAGES_DIR = Path(__file__).resolve().parents[2] / "test-images"

LIVE_OCR_CASES = [
    "label_01_perfect_pass.png",
    "label_08_slight_rotation_challenge.png",
]

@pytest.mark.parametrize("case_file", LIVE_OCR_CASES)
def test_live_ocr_extracts_readable_text_from_curated_samples(case_file: str) -> None:
    if os.getenv("SHOT_RUN_LIVE_OCR_TESTS") != "1":
        pytest.skip("Set SHOT_RUN_LIVE_OCR_TESTS=1 to run live OCR integration tests.")

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        pytest.skip("OPENAI_API_KEY is required for live OCR integration tests.")

    service = OCRService(api_key=api_key)
    image_path = TEST_IMAGES_DIR / case_file
    image_bytes = image_path.read_bytes()
    mime_type = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"

    result = service.extract(image_bytes, mime_type=mime_type)

    assert result.extracted_fields.raw.strip() != ""
