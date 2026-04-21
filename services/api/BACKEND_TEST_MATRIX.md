# Backend Test Matrix And Branch Audit Guide

This note gives the team a short way to decide which backend tests are required, which ones depend on feature branches, and when a branch is actually ready to merge.

## Required Test Matrix

### `tests/test_automation_workflow.py`

Purpose:
- Verifies the main automation workflow from rule lookup through AI generation into `Draft` and `PostHistory` persistence.

Required environment:
- Run from `services/api`
- Use `DEBUG=false`
- No real API key required
- Uses the local test database setup inside the test module

Status:
- Baseline required

What failure usually means:
- Fixture or database setup drift
- Workflow persistence regression
- Routing or dependency override breakage in the automation path

### `tests/test_gemini_provider.py`

Purpose:
- Verifies mock regression safety, Gemini missing-key failure behavior, and Gemini provider wiring.

Required environment:
- Run from `services/api`
- Use `DEBUG=false`
- No real Gemini key required
- Network access is not required for a successful test outcome because the wiring test accepts a safe API failure

Status:
- Baseline required

What failure usually means:
- Provider registry selection regression
- Provider contract drift for Gemini
- Safe failure behavior changed unexpectedly

### `tests/test_output_validation.py`

Purpose:
- Verifies post-generation output sanitization, rejection rules, and persistence blocking for invalid AI output.

Required environment:
- Run from `services/api`
- Use `DEBUG=false`
- No real API key required

Status:
- Baseline required on branches that include the output validation layer

What failure usually means:
- Output validation contract changed
- Persistence blocking no longer happens on invalid output
- OpenAI prompt boundary and provider signature are out of sync

### `tests/test_prompt_quality_controls.py`

Purpose:
- Verifies supported prompt quality presets, fallback behavior, CTA handling, and compiled prompt usage on the OpenAI path.

Required environment:
- Run from `services/api`
- Use `DEBUG=false`
- No real API key required

Status:
- Feature-branch dependent
- Required only on branches where prompt quality controls are present

What failure usually means:
- Prompt preset catalog changed without test updates
- Prompt compilation fallback behavior regressed
- OpenAI compiled prompt contract drifted from the prompt builder layer

### `tests/test_schedule_model.py`

Purpose:
- Verifies the schedule model can be created, queried for due work, and updated through its basic status transitions.

Required environment:
- Run from `services/api`
- Use `DEBUG=false`
- No real API key required

Status:
- Feature-branch dependent
- Required only on branches where the worker/schedule slice is present

What failure usually means:
- Schedule model schema drift
- Schedule persistence or timestamp behavior changed
- Worker-support data model assumptions no longer match the API-side test fixtures

### `tests/test_worker_integration.py`

Purpose:
- Verifies worker-driven schedule execution behavior from due schedule lookup into automation execution expectations.

Required environment:
- Run from `services/api`
- Use `DEBUG=false`
- No real API key required
- Requires the worker slice files to be present on the branch

Status:
- Feature-branch dependent
- Required only on branches where the worker slice is present

What failure usually means:
- Worker import path drift
- Worker scheduler contract changed
- Schedule execution expectations no longer match backend automation behavior

## How To Run The Backend Baseline Locally

From `services/api`:

```bash
DEBUG=false python3 -m pytest tests/test_automation_workflow.py -v
DEBUG=false python3 -m pytest tests/test_gemini_provider.py -v
DEBUG=false python3 -m pytest tests/test_output_validation.py -v
```

If the branch includes prompt quality controls:

```bash
DEBUG=false python3 -m pytest tests/test_prompt_quality_controls.py -v
```

If the branch includes the worker slice:

```bash
DEBUG=false python3 -m pytest tests/test_schedule_model.py -v
DEBUG=false python3 -m pytest tests/test_worker_integration.py -v
```

## When A Branch Is Merge-Ready

A backend branch is merge-ready when all of the following are true:

- Every baseline-required test for that branch passes locally
- Any feature-branch-dependent test added by that branch also passes
- The branch bundle clearly reports the exact commands that were run
- The branch bundle clearly reports exact pass or fail summaries
- No unresolved mismatch remains between test expectations and the code contract for providers, prompt compilation, routing, fixtures, or persistence

Practical rule:
- If a branch changes backend behavior, the tests that cover that behavior must be green on that same branch before merge

## How To Audit A 10-Item Bundle

Check these items in order:

1. Confirm the branch name matches the requested task branch.
2. Confirm the commit hash exists on the pushed branch.
3. Confirm the changed file tree stays inside the allowed scope.
4. Confirm the important code sections point to real files and relevant lines.
5. Confirm the test commands are exact commands, not paraphrases.
6. Confirm the test output summary is exact and includes failures if any exist.
7. Confirm the verification section matches the actual branch state.
8. Confirm `TASK_PROGRESS.md` was updated when the task required it.
9. Confirm the push result shows the correct remote branch.
10. Reject the bundle as incomplete if any of the 10 sections are missing or internally inconsistent.

## How To Tell What Kind Of Failure You Have

### Fixture Failure

Typical signs:
- `no such table`
- setup or teardown errors
- tests fail before the target code path is exercised

Usually means:
- Test DB initialization drift
- Fixture ordering problem
- Dependency override not applied

### Routing Failure

Typical signs:
- `404 Not Found`
- wrong endpoint behavior across multiple workflow tests
- dependency injection path not reached

Usually means:
- Router registration mismatch
- Route path changed unexpectedly
- Test client is hitting the wrong path

### Provider Contract Failure

Typical signs:
- unexpected keyword argument errors
- missing required parameter errors
- compiled prompt or provider method signature mismatch

Usually means:
- Provider interface changed without aligning callers and tests
- Prompt boundary changed without aligning the provider implementation

### CI-Only Failure

Typical signs:
- local pass but GitHub Actions fail
- missing dependency or wrong Python version only in CI
- environment variable assumptions differ between local and CI

Usually means:
- Workflow command drift
- Missing install step or wrong working directory
- CI cache or OS-specific behavior
