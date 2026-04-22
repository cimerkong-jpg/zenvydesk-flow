from urllib.parse import quote

from .image_base import BaseImageProvider


def build_svg_data_uri(prompt: str, model: str, provider: str) -> str:
    safe_prompt = (prompt or "AI creative preview").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    preview_lines = [
        safe_prompt[i:i + 52]
        for i in range(0, min(len(safe_prompt), 156), 52)
    ] or ["AI creative preview"]
    svg = f"""
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eef2ff" />
      <stop offset="55%" stop-color="#dbeafe" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
  </defs>
  <rect width="1200" height="900" rx="40" fill="url(#bg)" />
  <rect x="70" y="70" width="1060" height="760" rx="32" fill="rgba(255,255,255,0.72)" stroke="#cbd5e1" />
  <text x="110" y="170" fill="#0f172a" font-size="52" font-family="Inter, Arial, sans-serif" font-weight="700">
    AI Creative Preview
  </text>
  <text x="110" y="230" fill="#475569" font-size="28" font-family="Inter, Arial, sans-serif">
    Provider: {provider} / Model: {model}
  </text>
  <text x="110" y="330" fill="#1e293b" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="600">
    Prompt Snapshot
  </text>
  {''.join(f'<text x="110" y="{410 + index * 56}" fill="#334155" font-size="30" font-family="Inter, Arial, sans-serif">{line}</text>' for index, line in enumerate(preview_lines))}
  <circle cx="960" cy="280" r="118" fill="#6366f1" opacity="0.14" />
  <circle cx="1010" cy="250" r="54" fill="#8b5cf6" opacity="0.24" />
  <circle cx="910" cy="335" r="40" fill="#0ea5e9" opacity="0.22" />
</svg>
""".strip()
    return f"data:image/svg+xml;charset=UTF-8,{quote(svg)}"


class MockImageProvider(BaseImageProvider):
    def generate_image(self, prompt: str, model: str) -> str:
        return build_svg_data_uri(prompt=prompt, model=model, provider="mock")
