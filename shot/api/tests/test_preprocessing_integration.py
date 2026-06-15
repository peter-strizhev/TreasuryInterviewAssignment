from __future__ import annotations

import pytest

from services.processing import PreprocessingService


@pytest.mark.integration
@pytest.mark.parametrize(
    "case_file",
    [
        "label_01_perfect_pass.png",
        "label_07_low_contrast_challenge.png",
        "label_08_slight_rotation_challenge.png",
        "label_09_heavy_rotation_low_contrast_image_of_screen.jpg",
        "label_10_low_contrast_image_of_screen_upside_down.jpg",
        "label_11_extreme_perspective_glare.jpg",
        "label_12_low_light_motion_blur.jpg",
        "label_13_screen_moire_tilt.jpg",
        "label_14_shadow_occlusion.jpg",
        "label_15_partial_crop_warning_fail.jpg",
    ],
)
def test_sample_images_can_flow_through_preprocessing(case_file: str, label_manifest: dict) -> None:
    known_files = {case["file"] for case in label_manifest["cases"]}
    assert case_file in known_files

    image_bytes = (TEST_IMAGES_DIR / case_file).read_bytes()

    result = PreprocessingService().image_prep(image_bytes)

    assert result.mime_type == "image/jpeg"
    assert result.img_bytes
    assert len(result.preprocessing_steps) >= 4


from tests.conftest import TEST_IMAGES_DIR