from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageEnhance, ImageOps

from models import OCRPreprocessingStep
from config.settings import settings

@dataclass
class PreprocessedImage:
    img: bytes
    mime: str
    steps: list[OCRPreprocessingStep]

class PreprocessingService:
    def prep(self, img: bytes) -> PreprocessedImage:
        with Image.open(BytesIO(img)) as src:
            pic = src.copy()
            steps: list[OCRPreprocessingStep] = []

            if pic.mode != "RGB":
                pic = pic.convert("RGB")
            steps.append(
                OCRPreprocessingStep(
                    name="Color normalization",
                    applied=True,
                    details="Converted the image into a consistent RGB color space for OCR.",
                )
            )

            w, h = pic.size
            if max(pic.size) > settings.ocrImageMaxDimension:
                pic.thumbnail((settings.ocrImageMaxDimension, settings.ocrImageMaxDimension), Image.Resampling.LANCZOS)
                resized = True
                details = (
                    f"Downscaled the OCR image from {w}x{h} to "
                    f"{pic.width}x{pic.height} to reduce payload size and response time."
                )
            else:
                resized = False
                details = (
                    f"Kept the original OCR size at {w}x{h} because it was already within the "
                    f"{settings.ocrImageMaxDimension}px max dimension."
                )
            steps.append(
                OCRPreprocessingStep(
                    name="OCR resize",
                    applied=resized,
                    details=details,
                )
            )

            pic = ImageOps.autocontrast(pic)
            steps.append(
                OCRPreprocessingStep(
                    name="Contrast enhancement",
                    applied=True,
                    details="Applied autocontrast to recover text under glare and uneven lighting.",
                )
            )

            pic = ImageEnhance.Contrast(pic).enhance(settings.preprocessingContrastFactor)
            steps.append(
                OCRPreprocessingStep(
                    name="Contrast boost",
                    applied=True,
                    details=f"Boosted contrast by {settings.preprocessingContrastFactor:.2f}x for low-contrast labels.",
                )
            )

            pic = ImageEnhance.Sharpness(pic).enhance(settings.preprocessingSharpnessFactor)
            steps.append(
                OCRPreprocessingStep(
                    name="Sharpening",
                    applied=True,
                    details=f"Sharpened edges by {settings.preprocessingSharpnessFactor:.2f}x to improve character separation.",
                )
            )

            out = self._to_bytes(pic)

        return PreprocessedImage(
            img=out,
            mime="image/jpeg",
            steps=steps,
        )

    @staticmethod
    def _to_bytes(img: Image.Image) -> bytes:
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=settings.ocrImageQuality, optimize=True)
        return buffer.getvalue()