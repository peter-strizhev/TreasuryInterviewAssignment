from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

API_DIR = Path(__file__).resolve().parents[1]
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from models import ExpectedValues


TEST_IMAGES_DIR = API_DIR.parent / "test-images"
MANIFEST_PATH = TEST_IMAGES_DIR / "manifest.json"


@pytest.fixture(scope="session")
def label_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def default_expected_values(label_manifest: dict) -> ExpectedValues:
    return ExpectedValues(
        brand=label_manifest["default_expected_values"]["brand_name"],
        class_type=label_manifest["default_expected_values"]["class_type"],
        abv=label_manifest["default_expected_values"]["alcohol_content"],
        net=label_manifest["default_expected_values"]["net_contents"],
    )