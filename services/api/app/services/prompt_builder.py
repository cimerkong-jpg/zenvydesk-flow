"""
Prompt Builder Service
Compiles prompts from templates with context
"""

import logging
from typing import Optional
from dataclasses import dataclass

from .prompt_templates import get_template, get_supported_types, DEFAULT_TEMPLATE

logger = logging.getLogger(__name__)


@dataclass
class PromptContext:
    """Context for prompt building"""
    product_name: str
    product_description: Optional[str] = None
    selling_points: Optional[list] = None
    tone: Optional[str] = None
    target_audience: Optional[str] = None
    cta: Optional[str] = None  # Call to action


class PromptBuilder:
    """Builds prompts from templates and context"""
    
    @staticmethod
    def build_prompt(content_type: str, context: PromptContext) -> tuple[str, str]:
        """
        Build final prompt from template and context.
        
        Args:
            content_type: Type of content to generate
            context: Context with product/content information
            
        Returns:
            Tuple of (final_prompt, selected_template_name)
        """
        # Get template (with fallback)
        template = get_template(content_type)
        selected_template = content_type if content_type in get_supported_types() else DEFAULT_TEMPLATE
        
        if selected_template != content_type:
            logger.info(f"Content type '{content_type}' not found, using fallback '{selected_template}'")
        
        # Build optional sections
        product_description = ""
        if context.product_description:
            product_description = f"Description: {context.product_description}"
        
        selling_points = ""
        if context.selling_points and len(context.selling_points) > 0:
            points = "\n".join([f"- {point}" for point in context.selling_points])
            selling_points = f"Key Points:\n{points}"
        
        tone = ""
        if context.tone:
            tone = f"Tone: {context.tone}"
        else:
            tone = "Tone: Professional yet friendly"
        
        target_audience = ""
        if context.target_audience:
            target_audience = f"Target Audience: {context.target_audience}"
        
        cta = ""
        if context.cta:
            cta = f"Call to Action: {context.cta}"
        
        # Compile final prompt
        final_prompt = template.format(
            product_name=context.product_name,
            product_description=product_description,
            selling_points=selling_points,
            tone=tone,
            target_audience=target_audience,
            cta=cta
        )
        
        # Clean up extra whitespace
        final_prompt = "\n".join([line for line in final_prompt.split("\n") if line.strip()])
        
        logger.debug(f"Built prompt using template '{selected_template}' for content_type '{content_type}'")
        
        return final_prompt, selected_template
    
    @staticmethod
    def get_supported_content_types() -> list:
        """Get list of supported content types."""
        return get_supported_types()
