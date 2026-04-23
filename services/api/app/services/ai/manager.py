from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass

from app.core.config import settings
from app.services.ai_key_resolver import resolve_manager_openai_key
from app.services.ai_providers.registry import get_ai_provider
from app.services.output_validator import OutputValidator

logger = logging.getLogger(__name__)


@dataclass
class TextGenerationPlan:
    objective: str
    tone: str
    audience: str
    hook_style: str
    cta_style: str
    content_constraints: list[str]
    execution_prompt: str


@dataclass
class ManagedTextGeneration:
    plan: TextGenerationPlan
    normalized_output: str | None = None


class GPTManagerService:
    def create_plan(
        self,
        *,
        content_type: str,
        product_name: str,
        compiled_prompt: str,
        tone: str | None,
        target_audience: str | None,
        cta: str | None,
        execution_provider: str,
    ) -> TextGenerationPlan:
        base_plan = self._build_base_plan(
            content_type=content_type,
            product_name=product_name,
            compiled_prompt=compiled_prompt,
            tone=tone,
            target_audience=target_audience,
            cta=cta,
        )
        if execution_provider == "mock":
            logger.info("GPT manager using local fallback planner for mock execution")
            return base_plan

        manager_key = resolve_manager_openai_key()
        manager_provider = get_ai_provider("openai", api_key=manager_key.api_key)
        manager_prompt = self._build_manager_prompt(
            content_type=content_type,
            product_name=product_name,
            compiled_prompt=compiled_prompt,
            base_plan=base_plan,
        )
        logger.info(
            "GPT manager planning request: manager_model=%s key_source=%s content_type=%s execution_provider=%s",
            settings.openai_manager_model,
            manager_key.source,
            content_type,
            execution_provider,
        )
        result = manager_provider.generate_post_content(
            content_type="manager_plan",
            product_name=product_name,
            model=settings.openai_manager_model,
            prompt=manager_prompt,
            template_used="gpt_manager_text_plan",
        )
        if not result.success or not result.content:
            logger.warning("GPT manager plan generation failed; using base plan fallback: %s", result.error)
            return base_plan

        parsed = self._parse_plan(result.content, base_plan)
        logger.info("GPT manager plan ready: objective=%s execution_provider=%s", parsed.objective, execution_provider)
        return parsed

    def normalize_output(self, content: str) -> str:
        validation_result = OutputValidator.validate_and_clean(content)
        if not validation_result.success or not validation_result.cleaned_content:
            raise ValueError(validation_result.error or "AI output validation failed")
        return validation_result.cleaned_content

    def _build_base_plan(
        self,
        *,
        content_type: str,
        product_name: str,
        compiled_prompt: str,
        tone: str | None,
        target_audience: str | None,
        cta: str | None,
    ) -> TextGenerationPlan:
        objective_map = {
            "promotion": "sales",
            "product_intro": "sales",
            "engagement": "engagement",
            "message": "message",
            "general_post": "general",
        }
        objective = objective_map.get((content_type or "").strip().lower(), "general")
        resolved_tone = (tone or "marketing").strip()
        audience = (target_audience or "broad social media audience").strip()
        cta_style = (cta or "Clear, natural next step").strip()
        hook_style = {
            "sales": "Benefit-first opening",
            "engagement": "Question or curiosity hook",
            "message": "Direct and human opening",
            "general": "Short, attention-grabbing first line",
        }.get(objective, "Short, attention-grabbing first line")
        constraints = [
            "Return only the final post text without meta commentary.",
            "Keep claims grounded in the supplied product and market context.",
            "Optimize for Facebook readability with natural line breaks.",
        ]
        execution_prompt = "\n".join(
            [
                f"Objective: {objective}",
                f"Tone: {resolved_tone}",
                f"Audience: {audience}",
                f"Hook style: {hook_style}",
                f"CTA style: {cta_style}",
                "Constraints:",
                *[f"- {item}" for item in constraints],
                "Source brief:",
                compiled_prompt,
                f"Write the final Facebook post for {product_name}.",
            ]
        )
        return TextGenerationPlan(
            objective=objective,
            tone=resolved_tone,
            audience=audience,
            hook_style=hook_style,
            cta_style=cta_style,
            content_constraints=constraints,
            execution_prompt=execution_prompt,
        )

    def _build_manager_prompt(
        self,
        *,
        content_type: str,
        product_name: str,
        compiled_prompt: str,
        base_plan: TextGenerationPlan,
    ) -> str:
        return "\n".join(
            [
                "You are the ZenvyDesk GPT Manager for text generation.",
                "Refine the provided social content plan and return strict JSON only.",
                "Required JSON keys: objective, tone, audience, hook_style, cta_style, content_constraints, execution_prompt.",
                "Keep execution_prompt concise but complete, and make it ready for another model to execute.",
                "Do not mention API providers, policies, or internal implementation details.",
                f"Content type: {content_type}",
                f"Product: {product_name}",
                "Base plan JSON:",
                json.dumps(asdict(base_plan), ensure_ascii=True),
                "Source brief:",
                compiled_prompt,
            ]
        )

    def _parse_plan(self, raw_content: str, base_plan: TextGenerationPlan) -> TextGenerationPlan:
        candidate = raw_content.strip()
        if candidate.startswith("```"):
            candidate = candidate.strip("`")
            if "\n" in candidate:
                candidate = candidate.split("\n", 1)[1]
        if candidate.endswith("```"):
            candidate = candidate[:-3].strip()
        try:
            payload = json.loads(candidate)
        except json.JSONDecodeError:
            logger.warning("GPT manager returned non-JSON payload; using base plan")
            return base_plan

        return TextGenerationPlan(
            objective=str(payload.get("objective") or base_plan.objective),
            tone=str(payload.get("tone") or base_plan.tone),
            audience=str(payload.get("audience") or base_plan.audience),
            hook_style=str(payload.get("hook_style") or base_plan.hook_style),
            cta_style=str(payload.get("cta_style") or base_plan.cta_style),
            content_constraints=[
                str(item).strip()
                for item in payload.get("content_constraints", base_plan.content_constraints)
                if str(item).strip()
            ]
            or base_plan.content_constraints,
            execution_prompt=str(payload.get("execution_prompt") or base_plan.execution_prompt),
        )
