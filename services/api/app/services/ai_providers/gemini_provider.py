"""
Google Gemini AI Provider
Real Gemini API integration for content generation
"""

import logging
from typing import Optional
import requests

from .base import BaseAIProvider
from .types import AIGenerationResult

logger = logging.getLogger(__name__)


class GeminiProvider(BaseAIProvider):
    """Google Gemini API provider"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize Gemini provider
        
        Args:
            api_key: Google Gemini API key
            base_url: Optional custom base URL (defaults to Gemini API)
        
        Raises:
            ValueError: If API key is missing
        """
        if not api_key:
            raise ValueError("Gemini API key is required")
        
        self.api_key = api_key
        self.base_url = base_url or "https://generativelanguage.googleapis.com/v1beta"
    
    def generate_post_content(self, content_type: str, product_name: str, model: str, prompt: str = None, template_used: str = None) -> AIGenerationResult:
        """
        Generate post content using Gemini API
        
        Args:
            content_type: Type of content (promotion, engagement, etc.)
            product_name: Name of the product
            model: Gemini model to use (e.g., gemini-pro, gemini-1.5-pro)
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
            # Gemini API format: /models/{model}:generateContent?key={api_key}
            url = f"{self.base_url}/models/{model}:generateContent"
            params = {"key": self.api_key}
            headers = {"Content-Type": "application/json"}
            
            payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 500,
                    "topP": 0.8,
                    "topK": 40
                }
            }
            
            logger.info(f"Gemini API request: model={model}, content_type={content_type}, product={product_name}")
            
            # Make API call
            response = requests.post(url, params=params, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            
            # Gemini response structure: candidates[0].content.parts[0].text
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    content = candidate["content"]["parts"][0]["text"].strip()
                else:
                    raise KeyError("Unexpected response structure: missing content.parts")
            else:
                raise KeyError("Unexpected response structure: missing candidates")
            
            # Extract usage info if available
            usage = {}
            if "usageMetadata" in data:
                usage = {
                    "prompt_tokens": data["usageMetadata"].get("promptTokenCount", 0),
                    "completion_tokens": data["usageMetadata"].get("candidatesTokenCount", 0),
                    "total_tokens": data["usageMetadata"].get("totalTokenCount", 0)
                }
            
            logger.info(f"Gemini API success: tokens={usage.get('total_tokens', 0)}")
            
            return AIGenerationResult(
                success=True,
                content=content,
                provider="gemini",
                model=model,
                usage=usage,
                provider_response=data,
                error=None
            )
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Gemini API request failed: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="gemini",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
        except (KeyError, IndexError) as e:
            error_msg = f"Gemini API response parsing failed: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="gemini",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
        except Exception as e:
            error_msg = f"Gemini provider unexpected error: {str(e)}"
            logger.error(error_msg)
            return AIGenerationResult(
                success=False,
                content=None,
                provider="gemini",
                model=model,
                usage=None,
                provider_response=None,
                error=error_msg
            )
