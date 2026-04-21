"""
Anthropic Claude AI Provider
Real Claude API integration for content generation
"""

import logging
from typing import Optional
import requests

from .base import BaseAIProvider
from .types import AIGenerationResult

logger = logging.getLogger(__name__)


class ClaudeProvider(BaseAIProvider):
    """Anthropic Claude API provider"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize Claude provider
        
        Args:
            api_key: Anthropic Claude API key
            base_url: Optional custom base URL (defaults to Claude API)
        
        Raises:
            ValueError: If API key is missing
        """
        if not api_key:
            raise ValueError("Claude API key is required")
        
        self.api_key = api_key
        self.base_url = base_url or "https://api.anthropic.com/v1"
    
    def generate_post_content(self, content_type: str, product_name: str, model: str, prompt: str = None, template_used: str = None) -> AIGenerationResult:
        """
        Generate post content using Claude API
        
        Args:
            content_type: Type of content (promotion, engagement, etc.)
            product_name: Name of the product
            model: Claude model to use (e.g., claude-3-5-sonnet-20241022, claude-3-opus-20240229)
            prompt: Compiled prompt from prompt builder
            template_used: Template name that was used
        
        Returns:
            AIGenerationResult with generated content or error
        """
        try:
            # Use provided prompt or construct basic one
            if not prompt:
                prompt = f"Create a {content_type} social media post for the product: {product_name}. Make it engaging and concise."
            
            # Prepare request
            url = f"{self.base_url}/messages"
            headers = {
                "Content-Type": "application/json",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01"
            }
            
            payload = {
                "model": model,
                "max_tokens": 500,
                "temperature": 0.7,
                "messages": [{
                    "role": "user",
                    "content": prompt
                }]
            }
            
            logger.info(f"Claude API request: model={model}, content_type={content_type}, product={product_name}")
            
            # Make API call
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            
            # Claude response structure: content[0].text
            if "content" in data and len(data["content"]) > 0:
                content = data["content"][0]["text"].strip()
            else:
                raise KeyError("Unexpected response structure: missing content")
            
            # Extract usage info if available
            usage = {}
            if "usage" in data:
                usage = {
                    "prompt_tokens": data["usage"].get("input_tokens", 0),
                    "completion_tokens": data["usage"].get("output_tokens", 0),
                    "total_tokens": data["usage"].get("input_tokens", 0) + data["usage"].get("output_tokens", 0)
                }
            
            logger.info(f"Claude API success: tokens={usage.get('total_tokens', 0)}")
            
            return AIGenerationResult(
                success=True,
                content=content,
                provider="claude",
                model=model,
                usage=usage,
                provider_response=data,
                error=None
            )
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Claude API request failed: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="claude",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
        except (KeyError, IndexError) as e:
            error_msg = f"Claude API response parsing failed: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="claude",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
        except Exception as e:
            error_msg = f"Claude provider unexpected error: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="claude",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
