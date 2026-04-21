"""
Prompt Templates for AI Content Generation
Reusable templates for different content types
"""

from typing import Dict, Optional


# Template definitions
TEMPLATES: Dict[str, str] = {
    "product_intro": """Create an engaging social media post introducing a new product.

Product: {product_name}
{product_description}
{selling_points}

Requirements:
- Highlight what makes this product special
- Create excitement and curiosity
- Keep it concise and engaging
- {tone}
{target_audience}
{cta}

Generate a compelling product introduction post.""",

    "promotion": """Create a promotional social media post for a special offer.

Product: {product_name}
{product_description}
{selling_points}

Requirements:
- Emphasize the value and urgency
- Include promotional language
- Make it action-oriented
- {tone}
{target_audience}
{cta}

Generate an effective promotional post.""",

    "engagement": """Create an engaging social media post to spark conversation.

Topic: {product_name}
{product_description}
{selling_points}

Requirements:
- Encourage audience interaction
- Ask questions or invite opinions
- Be relatable and conversational
- {tone}
{target_audience}
{cta}

Generate an engaging post that encourages interaction.""",

    "general_post": """Create a social media post.

Topic: {product_name}
{product_description}
{selling_points}

Requirements:
- Be clear and engaging
- Match the brand voice
- Keep it appropriate for social media
- {tone}
{target_audience}
{cta}

Generate a well-crafted social media post."""
}


# Default fallback template
DEFAULT_TEMPLATE = "general_post"


def get_template(content_type: str) -> str:
    """
    Get template for content type with fallback.
    
    Args:
        content_type: Type of content requested
        
    Returns:
        Template string (falls back to general_post if unknown)
    """
    return TEMPLATES.get(content_type, TEMPLATES[DEFAULT_TEMPLATE])


def get_supported_types() -> list:
    """Get list of supported content types."""
    return list(TEMPLATES.keys())
