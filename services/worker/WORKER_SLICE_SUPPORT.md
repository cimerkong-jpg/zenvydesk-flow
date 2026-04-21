# Worker Slice Support Notes

## Purpose

This note keeps the support layer aligned with the worker slice without changing worker implementation logic.

## Current Status

- The repository now has a worker service at `services/worker/`
- Worker-related test files may exist on worker branches before they are merged onto `main`
- Support docs and CI should treat worker tests as optional discovery targets until the worker slice is fully merged

## Worker-Related Test Files

When present in `services/api/tests/`, these files should be treated as worker support coverage:

- `tests/test_schedule_model.py`
- `tests/test_worker_integration.py`

## CI Awareness Rule

Backend CI should always run the current backend baseline first, then append worker-related tests only if those files exist on the checked-out branch.

This keeps CI stable on branches where the worker slice is absent, while automatically expanding coverage on branches where the worker slice is present.

## Local Verification Rule

When worker test files are present, the local backend CI-mirror command should include them after the mandatory baseline files.

When they are absent, the command should skip them cleanly without failing.

## Scope Boundary

This support note does not change:

- worker implementation behavior
- worker scheduling logic
- API route behavior
- AI generation logic
- provider logic

It only defines how docs and CI should recognize the worker slice when it exists.
