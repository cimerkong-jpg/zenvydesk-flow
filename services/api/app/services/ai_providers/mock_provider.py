"""
Mock AI Provider
Simple mock implementation for testing and development
"""

from .base import BaseAIProvider
from .types import AIGenerationResult


class MockAIProvider(BaseAIProvider):
    """Mock AI provider for testing"""
    
    def __init__(self):
        self.selected_template = None
    
    def generate_post_content(self, content_type: str, product_name: str, model: str, prompt: str = None, template_used: str = None) -> AIGenerationResult:
        """
        Generate mock post content
        
        Args:
            content_type: Type of content (morning, sale, evening, etc.)
            product_name: Name of the product
            model: AI model to use
            prompt: Compiled prompt (optional, for logging)
            template_used: Template name that was used (optional)
        
        Returns:
            AIGenerationResult with mock content
        """
        self.selected_template = template_used or content_type
        
        content = f"[mock/{model}] AI-generated {content_type} post for product: {product_name}"
        if template_used:
            content += f" [template:{template_used}]"
        
        return AIGenerationResult(
            success=True,
            content=content,
            provider="mock",
            model=model,
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            provider_response={
                "mock": True,
                "template_used": template_used,
                "prompt_length": len(prompt) if prompt else 0
            },
            error=None
        )
