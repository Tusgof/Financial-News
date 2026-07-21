# Backup and Restore — Financial News

## Scope

The Git remote and its reachable commit history are the backup for this static public project. No Vault data, credentials, generated database, or machine-local state is required to restore the site.

## Backup gate

Before declaring a publication or control change complete:

1. Run `npm test` and `npm run verify`.
2. Commit only the bounded work-order files.
3. Push the intended branch.
4. Compare `git rev-parse HEAD` with `git ls-remote origin refs/heads/main` when closing work on `main`.
5. Record the matching remote hash in the session result.

A local unpushed commit is not a completed backup.

## Restore without rewriting history

1. Identify the last verified commit from a session result or `git log`.
2. Create a recovery branch from that commit: `git switch -c recovery/<date> <verified-commit>`.
3. Run `npm ci`, `npm test`, and `npm run verify`.
4. Ask the owner to approve either a normal revert commit on `main` or temporary GitHub Pages publication from the recovery branch.
5. Preserve the failing commit and incident evidence; do not force-push or delete history.

## Missing or damaged working copy

1. Clone the Git remote into a new empty temporary directory.
2. Check out the verified commit.
3. Run the complete verification gate.
4. Replace local work only after the clean clone passes and the owner confirms the intended branch.

## Exposure exception

If a secret, PII, or Vault-class artifact was published, ordinary restore is insufficient. Stop publication work, notify the owner, rotate affected credentials, preserve an incident record outside this public repository, remove the exposed material, and follow the owner-approved history-remediation procedure.

## Rehearsal record

| Date | Method | Result | Evidence |
|:--|:--|:--|:--|
| 2026-07-21 | Fresh clone from the Git remote; install, tests, and full verification | Passed at `3d0f360974f3ed351a174b97d81e926df6a7e44f` | `TRACKERS/2026-07-20-tier-gates.json` |
