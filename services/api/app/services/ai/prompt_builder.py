from app.models.content_library import ContentLibrary
from app.models.product import Product


def build_prompt(
    product: Product,
    content_library: ContentLibrary | None = None,
    tone: str = "marketing",
    language: str = "th",
) -> str:
    sections = [
        "Create a social media post for Facebook.",
        f"Language: {language}",
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

    sections.append("Write clear, conversion-focused copy suitable for the Thai market.")
    return "\n".join(sections)
