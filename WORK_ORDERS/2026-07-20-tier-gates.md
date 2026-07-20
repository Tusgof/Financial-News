# Session Order — Financial News tier gates

## Scope of THIS session only

Add mandatory T2 project controls and CI for the public static-news repository without changing published news content.

## Tasks

1. Install a work-order validator and negative test.
2. Add `PROJECT_BRAIN.md` and `AGENTS.md` with public-content, source, and publication gates.
3. Add CI for manifest completeness, secret/PII scan, link/static-file checks, and no-absolute-path gate.
4. Verify from a clean clone and record the remote hash.

## Do Not Do

- Do not edit, add, or delete published news articles.
- Do not publish to social platforms.
- Do not weaken scans to make CI green.

## Exit

Controls exist, validator/CI/clean-clone checks pass, commit is pushed, and remote hash matches.
