"""
Prompt Templates for AI Content Generation
Reusable templates for different content types
"""

from typing import Dict


TONE_PRESETS: Dict[str, str] = {
    "friendly": "Use a warm, approachable voice that feels human and easy to trust.",
    "professional": "Use a polished, credible voice with clear business-friendly phrasing.",
    "urgent": "Use high-energy, time-sensitive language without sounding panicked or spammy.",
    "playful": "Use light, witty language that feels clever and upbeat without losing clarity.",
}

LENGTH_PRESETS: Dict[str, str] = {
    "short": "Keep the final response brief: 1 to 2 short paragraphs or 3 to 5 concise lines.",
    "medium": "Keep the final response balanced: around 2 short paragraphs or 5 to 8 concise lines.",
    "long": "Keep the final response more developed: 3 to 4 short paragraphs or 8 to 12 concise lines.",
}

EMOJI_PRESETS: Dict[str, str] = {
    "none": "Do not use emojis.",
    "light": "Use at most 1 emoji if it fits naturally.",
    "moderate": "Use 2 to 4 well-placed emojis at most, and avoid overloading the post.",
}

DEFAULT_TONE_PRESET = "friendly"
DEFAULT_LENGTH_PRESET = "medium"
DEFAULT_EMOJI_PRESET = "light"


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
- {quality_controls}
{target_audience}

Generate a compelling product introduction post.""",

    "promotion": """Create a promotional social media post for a special offer.

Product: {product_name}
{product_description}
{selling_points}

Requirements:
- Emphasize the value and urgency
- Include promotional language
- Make it action-oriented
- {quality_controls}
{target_audience}

Generate an effective promotional post.""",

    "engagement": """Create an engaging social media post to spark conversation.

Topic: {product_name}
{product_description}
{selling_points}

Requirements:
- Encourage audience interaction
- Ask questions or invite opinions
- Be relatable and conversational
- {quality_controls}
{target_audience}

Generate an engaging post that encourages interaction.""",

    "general_post": """Create a social media post.

Topic: {product_name}
{product_description}
{selling_points}

Requirements:
- Be clear and engaging
- Match the brand voice
- Keep it appropriate for social media
- {quality_controls}
{target_audience}

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


def get_supported_tone_presets() -> list:
    """Get supported tone presets."""
    return list(TONE_PRESETS.keys())


def get_supported_length_presets() -> list:
    """Get supported length presets."""
    return list(LENGTH_PRESETS.keys())


def get_supported_emoji_presets() -> list:
    """Get supported emoji presets."""
    return list(EMOJI_PRESETS.keys())
