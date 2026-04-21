"""
OpenAI AI Provider
Real OpenAI API integration for content generation
"""

import logging
from typing import Optional
import requests

from .base import BaseAIProvider
from .types import AIGenerationResult

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseAIProvider):
    """OpenAI API provider"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize OpenAI provider
        
        Args:
            api_key: OpenAI API key
            base_url: Optional custom base URL (defaults to OpenAI API)
        
        Raises:
            ValueError: If API key is missing
        """
        if not api_key:
            raise ValueError("OpenAI API key is required")
        
        self.api_key = api_key
        self.base_url = base_url or "https://api.openai.com/v1"
    
    def generate_post_content(
        self,
        content_type: str,
        product_name: str,
        model: str,
        prompt: str = None,
        template_used: str = None,
    ) -> AIGenerationResult:
        """
        Generate post content using OpenAI API
        
        Args:
            content_type: Type of content (morning, sale, evening, etc.)
            product_name: Name of the product
            model: OpenAI model to use (e.g., gpt-4, gpt-3.5-turbo)
            prompt: Compiled prompt from prompt builder
            template_used: Template name that was used
        
        Returns:
            AIGenerationResult with generated content or error
        """
        try:
            # Use provided prompt or fall back to a simple baseline prompt.
            if not prompt:
                prompt = f"Create a {content_type} social media post for the product: {product_name}. Make it engaging and concise."
            
            # Prepare request
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a social media content creator."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 300
            }
            
            logger.info(
                f"OpenAI API request: model={model}, content_type={content_type}, product={product_name}, template={template_used}"
            )
            
            # Make API call
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            usage = data.get("usage", {})
            
            logger.info(f"OpenAI API success: tokens={usage.get('total_tokens', 0)}")
            
            return AIGenerationResult(
                success=True,
                content=content,
                provider="openai",
                model=model,
                usage=usage,
                provider_response=data,
                error=None
            )
            
        except requests.exceptions.RequestException as e:
            error_msg = f"OpenAI API request failed: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="openai",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
        except (KeyError, IndexError) as e:
            error_msg = f"OpenAI API response parsing failed: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="openai",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
        except Exception as e:
            error_msg = f"OpenAI provider unexpected error: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="openai",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
