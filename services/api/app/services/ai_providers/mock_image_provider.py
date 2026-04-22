from urllib.parse import quote

from .image_base import BaseImageProvider


class MockImageProvider(BaseImageProvider):
    def generate_image(self, prompt: str, model: str) -> str:
        return f"https://image-url/mock/{model}?prompt={quote(prompt[:120])}"
