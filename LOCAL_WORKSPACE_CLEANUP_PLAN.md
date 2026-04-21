# Local Workspace Cleanup And Consolidation Plan

## Goal

Reduce local workspace sprawl by stopping the pattern of creating a new full repo folder for each task.

Target steady state:

- 1 fixed local repo for Cline
- 1 fixed local repo for Codex
- New task = new branch
- Optional isolation = `git worktree`, not a new standalone clone

## Current Local ZenvyDesk Folders

### Standalone Repo Folders

| Folder | Current branch | Task mapping | Status |
| --- | --- | --- | --- |
| `/Users/kongka0809/zenvydesk-flow` | `cline/worker-slice-1` | Primary working repo currently used by Cline for active worker-slice work | `active` |
| `/Users/kongka0809/zenvydesk-flow-ai-provider-docs` | `codex/ai-provider-docs` | AI provider and testing handoff docs task | `safe_to_delete` |
| `/Users/kongka0809/zenvydesk-flow-backend-ci` | `codex/backend-ci-baseline` | Initial backend CI baseline task | `archive_if_needed` |
| `/Users/kongka0809/zenvydesk-flow-dev-bootstrap` | `codex/dev-bootstrap` | Developer bootstrap docs and `.env.example` task | `safe_to_delete` |
| `/Users/kongka0809/zenvydesk-flow-merge-docs-main` | `codex/merge-docs-main` | Merge docs branches into main task | `safe_to_delete` |
| `/Users/kongka0809/zenvydesk-flow-merge-prompt-tests` | `codex/merge-prompt-quality-tests` | Merge prompt quality tests into main task | `archive_if_needed` |
| `/Users/kongka0809/zenvydesk-flow-prompt-quality` | `codex/prompt-quality-controls` | Prompt quality controls implementation task | `archive_if_needed` |
| `/Users/kongka0809/zenvydesk-flow-prompt-tests` | `codex/prompt-quality-tests` | Prompt quality automated test suite task | `archive_if_needed` |

### Internal Worktrees Under Main Repo

| Folder | Current branch | Task mapping | Status |
| --- | --- | --- | --- |
| `/Users/kongka0809/zenvydesk-flow/.worktrees/ci-test-discovery` | `codex/ci-test-discovery` | Expand backend CI test discovery | `safe_to_delete` |
| `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-ci-discovery-main` | `codex/merge-ci-discovery-main` | Merge CI discovery expansion into main | `safe_to_delete` |
| `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-support-main` | `main` | Merge support branches into main | `archive_if_needed` |
| `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-test-helpers` | `codex/merge-test-helpers` | Merge shared test helper refactor into main | `safe_to_delete` |
| `/Users/kongka0809/zenvydesk-flow/.worktrees/test-helpers-consolidation` | `codex/test-helpers-consolidation` | Consolidate backend test helpers and fixtures | `safe_to_delete` |
| `/Users/kongka0809/zenvydesk-flow/.worktrees/workspace-cleanup-plan` | `codex/workspace-cleanup-plan` | This cleanup planning task | `active` |

## Classification Rules

### `active`

Keep locally because one of these is true:

- It is the primary repo currently in use
- It is the repo/worktree for the current active task
- It is still being edited or reviewed locally

### `safe_to_delete`

Delete locally when all of these are true:

- Task is finished
- Branch has already been pushed
- Main outcome is already merged or preserved remotely
- No local-only notes or unpushed changes remain

### `archive_if_needed`

Keep only if one of these is true:

- You still need the exact local state for audit/history
- The branch was pushed but not yet merged and may still need reference
- The workspace holds a useful checkpoint before a later consolidation merge

If none of those apply anymore, downgrade it to `safe_to_delete`.

## Recommended Cleanup Order

### Phase 1: Keep

Keep these now:

- `/Users/kongka0809/zenvydesk-flow`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/workspace-cleanup-plan`

### Phase 2: Review Before Deleting

Review once, then likely remove:

- `/Users/kongka0809/zenvydesk-flow-backend-ci`
- `/Users/kongka0809/zenvydesk-flow-merge-prompt-tests`
- `/Users/kongka0809/zenvydesk-flow-prompt-quality`
- `/Users/kongka0809/zenvydesk-flow-prompt-tests`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-support-main`

### Phase 3: Safe Local Cleanup

These are straightforward cleanup candidates:

- `/Users/kongka0809/zenvydesk-flow-ai-provider-docs`
- `/Users/kongka0809/zenvydesk-flow-dev-bootstrap`
- `/Users/kongka0809/zenvydesk-flow-merge-docs-main`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/ci-test-discovery`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-ci-discovery-main`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-test-helpers`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/test-helpers-consolidation`

## Standard Workspace Structure From Now On

### Fixed Repos

Use exactly two long-lived local repos:

- Cline repo: `/Users/kongka0809/zenvydesk-flow`
- Codex repo: `/Users/kongka0809/zenvydesk-flow-codex`

If you do not want a second full repo, Codex can also work from the same base repo using only worktrees. But if you want hard separation between agents, keep the two fixed repos and stop creating task-specific clones.

### Task Model

For every new task:

1. Create a branch
2. If isolation is needed, create a worktree from the fixed repo
3. Name the worktree after the task, not as a new standalone clone
4. Remove the worktree after merge/push verification

Example:

```bash
git worktree add .worktrees/<task-slug> -b codex/<task-slug> main
```

## Operating Rules

### For Cline

- Keep the main Cline repo as the long-lived primary workspace
- Use branches for task isolation
- Use worktrees only when concurrent tasks would otherwise conflict

### For Codex

- Use one fixed Codex repo or the shared repo with worktrees
- Do not create folders like `zenvydesk-flow-<task-name>` anymore
- Prefer `codex/<task-name>` branches plus `.worktrees/<task-name>`

## Minimal Cleanup Policy

After each task finishes:

1. Confirm branch was pushed
2. Confirm any required merge is done
3. Delete the temporary worktree
4. Delete any leftover task-specific full clone
5. Keep only the long-lived repo(s)

## Resulting Target State

Good steady state:

- `/Users/kongka0809/zenvydesk-flow` for Cline
- `/Users/kongka0809/zenvydesk-flow-codex` for Codex, or no second repo if worktrees are enough
- Optional short-lived worktrees under `.worktrees/`

Bad steady state:

- Multiple folders like `zenvydesk-flow-backend-ci`, `zenvydesk-flow-dev-bootstrap`, `zenvydesk-flow-prompt-tests`, and similar task-specific clones left behind

## Recommendation

Adopt this immediately:

- Stop creating new standalone task folders
- Keep one fixed repo per agent at most
- Treat worktrees as disposable task sandboxes
- Remove completed worktrees right after push/merge verification
