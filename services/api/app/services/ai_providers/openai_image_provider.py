import logging
from typing import Optional

import requests

from .image_base import BaseImageProvider
from .mock_image_provider import build_svg_data_uri


logger = logging.getLogger(__name__)


class OpenAIImageProvider(BaseImageProvider):
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")

    def generate_image(self, prompt: str, model: str) -> str:
        if not self.api_key:
            return build_svg_data_uri(prompt=prompt, model=model, provider="openai")

        try:
            response = requests.post(
                f"{self.base_url}/images/generations",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "prompt": prompt,
                    "size": "1024x1024",
                },
                timeout=60,
            )
            response.raise_for_status()
            payload = response.json()
            image = (payload.get("data") or [{}])[0]
            image_b64 = image.get("b64_json")
            image_url = image.get("url")
            if image_b64:
                return f"data:image/png;base64,{image_b64}"
            if image_url:
                return image_url
        except Exception as error:
            logger.warning("OpenAI image generation failed, falling back to SVG preview: %s", error)

        return build_svg_data_uri(prompt=prompt, model=model, provider="openai")
