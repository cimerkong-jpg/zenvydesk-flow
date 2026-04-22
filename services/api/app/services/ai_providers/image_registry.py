from typing import Optional

from .image_base import BaseImageProvider
from .mock_image_provider import MockImageProvider
from .openai_image_provider import OpenAIImageProvider
from .stable_diffusion_image_provider import StableDiffusionImageProvider


def get_image_provider(
    provider_name: str,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> BaseImageProvider:
    if provider_name == "mock":
        return MockImageProvider()
    if provider_name == "openai":
        return OpenAIImageProvider()
    if provider_name == "stable_diffusion":
        return StableDiffusionImageProvider()
    raise ValueError(f"Unknown image provider: {provider_name}")
