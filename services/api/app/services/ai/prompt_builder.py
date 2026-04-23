from app.models.content_library import ContentLibrary
from app.models.product import Product
from app.services.market_profiles import get_market_profile


def build_prompt(
    product: Product,
    content_library: ContentLibrary | None = None,
    market: str = "TH",
    tone: str = "marketing",
    language: str | None = None,
) -> str:
    profile = get_market_profile(market)
    resolved_language = language or profile.language
    sections = [
        "Create a social media post for Facebook.",
        f"Target market: {profile.label} ({profile.code})",
        f"Language: {resolved_language}",
        f"Tone: {tone}",
        f"Product name: {product.name}",
    ]

    if product.description:
        sections.append(f"Product description: {product.description}")

    if getattr(product, "price", None):
        sections.append(f"Product price: {product.price}")

    if content_library:
        if content_library.title:
            sections.append(f"Content library title: {content_library.title}")
        sections.append(f"Content library content: {content_library.content}")
        if content_library.content_type:
            sections.append(f"Content library type: {content_library.content_type}")

    sections.append(f"Target audience: {profile.audience}")
    sections.append(profile.content_guidance)
    return "\n".join(sections)
