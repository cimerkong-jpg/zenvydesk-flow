"""
Base AI Provider Interface
Abstract base class for all AI providers
"""

from .types import AIGenerationResult


class BaseAIProvider:
    """Base class for AI content generation providers"""
    
    def generate_post_content(self, content_type: str, product_name: str, model: str) -> AIGenerationResult:
        """
        Generate post content using AI
        
        Args:
            content_type: Type of content (morning, sale, evening, etc.)
            product_name: Name of the product
            model: AI model to use
        
        Returns:
            AIGenerationResult with standardized response
        
        Raises:
            NotImplementedError: Must be implemented by subclasses
        """
        raise NotImplementedError("Subclasses must implement generate_post_content")
