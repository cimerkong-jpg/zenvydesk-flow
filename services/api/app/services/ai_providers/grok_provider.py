"""
xAI Grok AI Provider
Real Grok API integration for content generation
"""

import logging
from typing import Optional
import requests

from .base import BaseAIProvider
from .types import AIGenerationResult

logger = logging.getLogger(__name__)


class GrokProvider(BaseAIProvider):
    """xAI Grok API provider (OpenAI-compatible)"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize Grok provider
        
        Args:
            api_key: xAI Grok API key
            base_url: Optional custom base URL (defaults to Grok API)
        
        Raises:
            ValueError: If API key is missing
        """
        if not api_key:
            raise ValueError("Grok API key is required")
        
        self.api_key = api_key
        self.base_url = base_url or "https://api.x.ai/v1"
    
    def generate_post_content(self, content_type: str, product_name: str, model: str, prompt: str = None, template_used: str = None) -> AIGenerationResult:
        """
        Generate post content using Grok API
        
        Args:
            content_type: Type of content (promotion, engagement, etc.)
            product_name: Name of the product
            model: Grok model to use (e.g., grok-beta, grok-2-latest)
            prompt: Compiled prompt from prompt builder
            template_used: Template name that was used
        
        Returns:
            AIGenerationResult with generated content or error
        """
        try:
            # Use provided prompt or construct basic one
            if not prompt:
                prompt = f"Create a {content_type} social media post for the product: {product_name}. Make it engaging and concise."
            
            # Prepare request (OpenAI-compatible format)
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant that creates engaging social media content."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 500
            }
            
            logger.info(f"Grok API request: model={model}, content_type={content_type}, product={product_name}")
            
            # Make API call
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            # Parse response (OpenAI-compatible format)
            data = response.json()
            
            # Extract content from response
            if "choices" in data and len(data["choices"]) > 0:
                content = data["choices"][0]["message"]["content"].strip()
            else:
                raise KeyError("Unexpected response structure: missing choices")
            
            # Extract usage info if available
            usage = {}
            if "usage" in data:
                usage = {
                    "prompt_tokens": data["usage"].get("prompt_tokens", 0),
                    "completion_tokens": data["usage"].get("completion_tokens", 0),
                    "total_tokens": data["usage"].get("total_tokens", 0)
                }
            
            logger.info(f"Grok API success: tokens={usage.get('total_tokens', 0)}")
            
            return AIGenerationResult(
                success=True,
                content=content,
                provider="grok",
                model=model,
                usage=usage,
                provider_response=data,
                error=None
            )
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Grok API request failed: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="grok",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
        except (KeyError, IndexError) as e:
            error_msg = f"Grok API response parsing failed: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="grok",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
        except Exception as e:
            error_msg = f"Grok provider unexpected error: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="grok",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
