from __future__ import annotations

import base64
import json
import re
from openai import OpenAI

from models import ExtractedFields, OCRExtractionResult
from services.processing import PreprocessingService
from config.settings import settings

_VALID_FIELDS = frozenset(ExtractedFields.model_fields)
_WHITESPACE_PATTERN = re.compile(r"\s+")

class OCRService:
    def __init__(self, api_key: str) -> None:
        self._client = OpenAI(api_key=api_key)
        self._prep = PreprocessingService()

    def extract(self, img: bytes, mime: str = "image/jpeg") -> OCRExtractionResult:
        prepped = self._prep.prep(img)
        fields = self._extract(prepped.img, prepped.mime)

        return OCRExtractionResult(
            fields=fields,
            steps=prepped.steps,
        )

    def _extract(self, img: bytes, mime: str) -> ExtractedFields:
        raw_img = base64.b64encode(img).decode()

        rsp = self._client.chat.completions.create(
            model=settings.extractionModel,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": settings.extractionPrompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{raw_img}",
                                "detail": settings.ocrImageDetail,
                            },
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=640,
        )

        response_content = rsp.choices[0].message.content
        if not response_content:
            return ExtractedFields()

        try:
            raw = json.loads(response_content)
        except json.JSONDecodeError:
            return ExtractedFields()

        fields = ExtractedFields(**{key: value for key, value in raw.items() if key in _VALID_FIELDS})
        return self._sanitize(fields)

    @staticmethod
    def _sanitize(fields: ExtractedFields) -> ExtractedFields:
        raw = OCRService._normalize(fields.raw)
        if not raw:
            return ExtractedFields()

        vals = {
            key: OCRService._normalize(getattr(fields, key))
            for key in ("brand", "class_type", "abv", "net", "warning")
        }

        seen = {
            key: bool(value and value in raw)
            for key, value in vals.items()
        }

        return ExtractedFields(
            brand=fields.brand.strip() if seen["brand"] and fields.brand else None,
            class_type=fields.class_type.strip() if seen["class_type"] and fields.class_type else None,
            abv=fields.abv.strip() if seen["abv"] and fields.abv else None,
            net=fields.net.strip() if seen["net"] and fields.net else None,
            warning=fields.warning.strip() if seen["warning"] and fields.warning else None,
            raw=fields.raw.strip(),
        )

    @staticmethod
    def _normalize(value: str | None) -> str:
        if not value:
            return ""
        return _WHITESPACE_PATTERN.sub(" ", value.casefold()).strip()

