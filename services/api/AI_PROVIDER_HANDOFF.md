# AI Provider And Testing Handoff

This note is the short operational handoff for the backend AI stack in `services/api`.

## Current Provider Stack

### `mock`
- Purpose: local development, fast workflow verification, and safe default.
- Network dependency: none.
- Typical local config:
  - `AI_PROVIDER=mock`
  - `AI_MODEL=mock-v1`
- Expected behavior: always available and suitable for baseline workflow tests.

### `openai`
- Purpose: production-facing GPT/OpenAI path.
- Network dependency: `requests`.
- Config:
  - `AI_PROVIDER=openai`
  - `AI_MODEL=<openai-model>`
  - `AI_API_KEY=<your-key>`
  - `AI_BASE_URL=` optional, only for compatible custom endpoints
- Behavior:
  - loaded lazily through the provider registry
  - safe failure if API key is missing
  - safe failure if optional dependencies are missing

### `gemini`
- Purpose: second real provider path through Google Gemini.
- Network dependency: `requests`.
- Config:
  - `AI_PROVIDER=gemini`
  - `AI_MODEL=gemini-pro` or another supported Gemini model
  - `AI_API_KEY=<your-key>`
  - `AI_BASE_URL=` optional
- Behavior:
  - loaded lazily through the provider registry
  - safe failure if API key is missing
  - safe failure if optional dependencies are missing

## Config And Environment

The backend settings currently come from `services/api/app/core/config.py`.

Important env vars:
- `DEBUG`: should be a real boolean string such as `true` or `false`
- `AI_PROVIDER`: `mock`, `openai`, or `gemini`
- `AI_MODEL`: model name for the selected provider
- `AI_API_KEY`: optional for `mock`, required for real providers
- `AI_BASE_URL`: optional custom base URL for compatible providers

Notes:
- Local SQLite is currently configured in code as `sqlite:///./zenvydesk.db`.
- The repo ignores `.env`; do not commit local secrets.
- For local test stability, prefer `DEBUG=false` instead of non-boolean values.

## Safe Loading And Failure Model

Provider selection flows through the registry in `app/services/ai_providers/registry.py`.

Current behavior:
- `mock` is available without extra dependencies
- `openai` and `gemini` are imported lazily
- missing dependency errors do not crash the whole app at import time
- missing API key errors return structured generation failures

This keeps the mock path usable even if optional provider dependencies are unavailable.

## Output Validation Layer

Current state:
- AI output validation exists in `app/services/output_validator.py`
- validation runs after provider generation and before persistence
- empty, whitespace-only, too-short, and leaked-instruction style outputs are rejected
- sanitization trims whitespace, collapses excessive blank lines, and removes safe leading meta phrases

Operational effect:
- invalid AI output should not become `Draft` or `PostHistory` data
- existing providers still return through the same generation flow, with validation applied after generation

## Prompt Quality Controls

Current state:
- prompt quality controls are not part of this branch baseline yet
- the current baseline still uses the older prompt builder behavior
- the prompt-quality branches add:
  - tone presets
  - output length presets
  - emoji presets
  - CTA handling
  - compiled-prompt handling on the OpenAI path

Prompt quality automated test status on this branch:
- `tests/test_prompt_quality_controls.py` is not present on the current branch baseline
- that suite is tracked on the prompt-quality test branch and should be included once merged

## Test Map

### Current Branch Baseline

`tests/test_automation_workflow.py`
- Covers the main automation workflow from rule lookup through AI generation into draft/post history behavior.

`tests/test_gemini_provider.py`
- Covers mock regression, Gemini missing-key safe failure, and Gemini provider wiring.

`tests/test_output_validation.py`
- Covers post-generation sanitization and rejection behavior, plus invalid-output persistence blocking.

### Additional Prompt Quality Suite

`tests/test_prompt_quality_controls.py`
- Covers supported preset lists, fallback preset behavior, CTA optional behavior, and OpenAI compiled-prompt usage.
- This file is not present on the current branch baseline; merge the prompt-quality test branch to include it.

## How To Run The Backend Baseline Locally

From repo root:

```bash
DEBUG=false python3 -m pytest services/api/tests/test_automation_workflow.py -v
DEBUG=false python3 -m pytest services/api/tests/test_gemini_provider.py -v
DEBUG=false python3 -m pytest services/api/tests/test_output_validation.py -v
```

From `services/api`:

```bash
DEBUG=false python3 -m pytest tests/test_automation_workflow.py -v
DEBUG=false python3 -m pytest tests/test_gemini_provider.py -v
DEBUG=false python3 -m pytest tests/test_output_validation.py -v
```

If the prompt-quality suite is present after merge:

```bash
DEBUG=false python3 -m pytest tests/test_prompt_quality_controls.py -v
```

## How To Add The Next Provider

1. Add a provider implementation under `app/services/ai_providers/`.
2. Keep its public return shape aligned with `AIGenerationResult`.
3. Register it in `app/services/ai_providers/registry.py` using the same lazy import pattern as `openai` and `gemini`.
4. Make missing API key and missing dependency behavior fail safely with structured errors.
5. Reuse the compiled prompt input boundary instead of reintroducing ad hoc prompt construction at route level.
6. Ensure the provider output still passes through the output validation layer unchanged.
7. Add a dedicated provider test file plus any workflow regression coverage needed.
8. Update this handoff doc and `TASK_PROGRESS.md` after the provider lands.
