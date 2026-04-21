# Main Cleanup Policy

## Purpose

This note standardizes what to clean up after task branches have already landed on `main`.

It focuses on:

- merged branch cleanup policy
- worktree and standalone folder cleanup guidance
- what is safe to delete now versus what should be kept temporarily

## Cleanup Rules After A Task Reaches `main`

### Branch Policy

After a task is merged into `main`:

1. Keep the remote branch only if it is still needed for audit, follow-up fixes, or active review comments.
2. Delete the local task branch if the work is already preserved on `main`.
3. Prefer keeping the commit hash in the task bundle instead of keeping a whole extra local repo forever.

### Worktree Policy

After a task is merged and verified:

1. Delete the temporary worktree used for that task.
2. Do not keep merge-helper worktrees once `main` has been updated and pushed.
3. Keep only the current active worktree(s).

### Standalone Repo Folder Policy

Task-specific full clones should be treated as temporary overflow, not normal workflow.

After a task is merged and pushed:

1. Delete task-specific standalone repo folders.
2. Keep only the long-lived primary repo.
3. If Codex needs isolation, use one fixed Codex repo or a worktree under the primary repo instead of another task-specific clone.

## Current Local Cleanup Classification

### Keep Active

These should stay for now:

- `/Users/kongka0809/zenvydesk-flow`
  Reason: primary local repo, currently active on `cline/facebook-posting-workflow-integration`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/main-cleanup-policy`
  Reason: current active Codex task worktree until this task is complete

### Safe To Delete Now

These are merged-task leftovers and can be removed now if you do not need local audit state:

- `/Users/kongka0809/zenvydesk-flow-ai-provider-docs`
- `/Users/kongka0809/zenvydesk-flow-dev-bootstrap`
- `/Users/kongka0809/zenvydesk-flow-merge-docs-main`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/ci-test-discovery`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-ci-discovery-main`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-test-helpers`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/test-helpers-consolidation`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/worker-docs-and-ci`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-worker-support-main`
- `/Users/kongka0809/zenvydesk-flow/.worktrees/merge-support-main`

Why they are safe now:

- their task outputs have already been pushed
- the relevant support changes are already on `main`
- they are not the current active workspace

### Keep Temporarily Or Archive If Needed

These can stay briefly if you still want local reference points, but they should not become permanent:

- `/Users/kongka0809/zenvydesk-flow-backend-ci`
  Reason: older CI baseline branch clone; safe to remove if you no longer need pre-merge local state
- `/Users/kongka0809/zenvydesk-flow-merge-prompt-tests`
  Reason: historical merge branch clone for prompt-quality test work
- `/Users/kongka0809/zenvydesk-flow-prompt-quality`
  Reason: original prompt quality controls task clone
- `/Users/kongka0809/zenvydesk-flow-prompt-tests`
  Reason: prompt quality test task clone
- `/Users/kongka0809/zenvydesk-flow/.worktrees/workspace-cleanup-plan`
  Reason: previous cleanup planning task worktree; removable if you no longer need local reference

## Recommended Cleanup Order Right Now

### Phase 1

Delete the obviously finished support worktrees:

- `.worktrees/ci-test-discovery`
- `.worktrees/merge-ci-discovery-main`
- `.worktrees/merge-test-helpers`
- `.worktrees/test-helpers-consolidation`
- `.worktrees/worker-docs-and-ci`
- `.worktrees/merge-worker-support-main`
- `.worktrees/merge-support-main`

### Phase 2

Delete the clearly obsolete standalone support clones:

- `zenvydesk-flow-ai-provider-docs`
- `zenvydesk-flow-dev-bootstrap`
- `zenvydesk-flow-merge-docs-main`

### Phase 3

Review and then remove if no longer needed:

- `zenvydesk-flow-backend-ci`
- `zenvydesk-flow-merge-prompt-tests`
- `zenvydesk-flow-prompt-quality`
- `zenvydesk-flow-prompt-tests`
- `.worktrees/workspace-cleanup-plan`

## Standard Ongoing Policy

Use this model from now on:

- 1 long-lived primary repo for Cline
- 1 long-lived repo for Codex only if separate-agent isolation is still needed
- otherwise use worktrees under the primary repo
- 1 task = 1 branch
- 1 concurrent isolated task = 1 temporary worktree
- delete the worktree after merge and verification

## Anti-Pattern To Avoid

Avoid this:

- creating a new full repo folder for every task
- keeping merged helper worktrees indefinitely
- using local folder sprawl as a substitute for branch discipline

## Minimum Cleanup Checklist

After each future task:

1. Confirm the branch has been pushed.
2. Confirm required merge to `main` is finished.
3. Confirm the final test/baseline recheck is recorded in the task bundle.
4. Delete the temporary worktree.
5. Delete any extra standalone task clone.
6. Keep only active long-lived repos.
