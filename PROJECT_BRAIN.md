# PROJECT_BRAIN.md

## 1. Project Definition

- **Purpose**: Publish a browsable daily summary of financial, business, economic, policy, political, and geopolitical news.
- **Primary Users**: Public Thai-language readers and the internal operation team that prepares daily news batches.
- **Problem Solved**: Daily signals are fragmented across sources and difficult to review consistently in one place.
- **Desired Outcome**: A portable static site that publishes complete, source-linked daily summaries without exposing private company data.
- **In Scope**: The static site shell, daily Markdown news, date manifest, publication prompts, content validation, repository safety checks, and GitHub Pages publication.
- **Out of Scope**: Personalized investment advice, transactions, portfolio management, private company operations, paid data acquisition, social-platform publication, and ownership of parent-unit state.
- **Level**: PROJECT — this is a bounded public-news publishing system under the Operation UNIT.
- **Tier**: T2 Operational — it serves real readers and can affect company reputation, while it does not move money or perform irreversible financial actions.
- **Kit Provenance**: `kit_version=v3.0`, `kit_commit=44501575d70643140b7af726b1f4ca90983368a6`, `adopted_on=2026-07-21`.
- **Local Deviation**: The public project keeps only project-specific control documents rather than a full `POLICY/` kit copy; no project gate is weakened.
- **Parent / Children**: Parent is the Operation UNIT. This PROJECT has no child registry and owns no parent or sibling state.

## 2. Success Criteria

### Usable When

- `index.html` loads `news/manifest.json` and the three category files for a selected date.
- Every manifest date maps to non-empty `business.md`, `economy.md`, and `politics.md` files.
- The site remains usable as a static GitHub Pages deployment with no build step.

### Production-Ready When

- `npm test` passes the work-order and repository-verifier negative tests.
- `npm run verify` passes manifest, source, static-link, secret/PII, and portability checks.
- The active tracker validates with all claimed `done` artifacts present.
- A clean clone passes the same commands without private configuration or Vault access.
- Local HEAD matches the pushed remote branch hash.

## 3. Tech Stack

| Layer | Technology | Version | Notes |
|:--|:--|:--|:--|
| Markup | HTML5 | N/A | Static application shell in `index.html` |
| Styling | CSS | N/A | Project-owned styles in `assets/css/style.css` |
| Browser logic | JavaScript | ES2020-compatible | Project-owned client code in `assets/js/app.js` |
| Markdown rendering | marked | 12.0.2 | Loaded from a pinned public CDN URL |
| Runtime for validation | Node.js | 22.17.0 | Pinned in `.nvmrc` |
| Dependency manifest | npm | lockfile v3 | `package.json` and `package-lock.json`; no runtime npm dependencies |
| Testing | Node.js standard library | 22.17.0 | Hermetic CLI and negative tests under `scripts/` |
| CI | GitHub Actions | checkout v5, setup-node v5 | Defined in `.github/workflows/verify.yml` |
| Hosting | GitHub Pages | N/A | Static deployment from `main` |

## 4. Architecture Overview

- **System Type**: Public static website with versioned Markdown content.
- **Core Flow**: A publication routine creates three dated Markdown files, adds the date to the manifest, validation runs, and a push to `main` makes the content available to GitHub Pages.
- **Application Shell**: `index.html` defines navigation, category panels, metadata, and third-party browser resources.
- **Client Runtime**: `assets/js/app.js` fetches the manifest, loads category Markdown, renders it with marked, and enhances the resulting cards.
- **Content State**: `news/manifest.json` and `news/YYYY-MM-DD/*.md` are the complete versioned publication state.
- **Prompts**: `prompts/` documents the generation routine but does not execute publication itself.
- **Validation**: `scripts/verify-repository.mjs` checks content completeness, sources, static references, secrets/PII, and portability.
- **External Dependencies**: GitHub Pages, the marked CDN asset, and hosted font assets referenced by `index.html`.
- **Persistence**: Published state is Git history and repository files. Browser `localStorage` stores only the reader's theme preference and is not project state.
- **Integration Points**: GitHub remote, GitHub Pages, public HTTPS source links, marked CDN, and font CDN.

## 5. Design Principles

- Public by construction: assume every tracked byte can be read externally.
- Evidence before narrative: every news item carries an HTTPS source link.
- Complete batch publication: a manifest date represents all three categories, not a partial day.
- Static and portable: no private service, database, secret, or machine path is required to build or run.
- Validation is a release gate, not advisory output.
- The PROJECT owns its own content and controls; the Operation UNIT owns none of its runtime state.

## 6. Current Verified State

- **Last Verified**: 2026-07-21 by the NEWS-TG-1 author through the repository verifier, negative tests, and active tracker.
- **Current Milestone**: NEWS-TG-1 T2 controls and CI installation.
- **Published State**: Every manifest date currently maps to all three category files; this is derived and checked by `scripts/verify-repository.mjs` rather than maintained as a hand-written count.
- **Latest Manifest Date**: The first entry of `news/manifest.json` is authoritative and is validated as the newest date by `scripts/verify-repository.mjs`.
- **Governance State**: `TRACKERS/2026-07-20-tier-gates.json` is the machine-readable status for this order.
- **CI State**: `.github/workflows/verify.yml` runs the hermetic test and verification commands on pushes to `main` and pull requests.

## 7. Next Safe Action

- **Action**: Prepare the next complete daily publication batch under a separately bounded publication cycle.
- **Preconditions**: The active tier-gate tracker validates, repository verification is green, and the new batch has reconcilable public sources.
- **Stop If**: Any category is incomplete, a source is unsupported, the safety scan finds private material, publication exceeds authority, or the locked stop rule triggers.
- **Verify With**: `npm test`, `npm run verify`, and `node scripts/validate-work-order.mjs TRACKERS/2026-07-20-tier-gates.json`.

## 8. Invariants & Guardrails

### Never

- Never store credentials, tokens, PII, contracts, payroll, financial statements, or legal documents in this public repository.
- Never add an absolute machine path to code, tests, documentation, or configuration.
- Never add a manifest date before all three category files exist.
- Never present generated analysis as a primary source or invent evidence.
- Never claim completion that is absent from a pushed commit.
- Never let this repository own state required by its parent UNIT.

### Always

- Always declare dependencies and pin the validation runtime.
- Always keep manifest dates unique and newest-first.
- Always provide an HTTPS evidence link for every news item.
- Always run tests and repository verification before publication.
- Always use the session-closure push-and-hash protocol.

### Requires Approval

- Changing project scope, level, tier, parent, or publication destination.
- Weakening a source, safety, completeness, or portability gate.
- Replacing a control document without first preserving the prior version under an approved work order.
- Changing a locked decision or the project stop rule.
- Rewriting history, changing repository visibility, or performing another irreversible repository action.

## 9. Operating Commands

```bash
# Setup
npm ci

# Local development
npm run serve

# Hermetic tests
npm test

# Full local verification
npm run verify

# Validate the active work-order tracker
node scripts/validate-work-order.mjs TRACKERS/2026-07-20-tier-gates.json

# Status
git status --short --branch
git log -5 --oneline

# Clean-clone verification (run from a temporary parent directory)
git clone <repository-url> financial-news-verify
cd financial-news-verify
npm ci
npm test
npm run verify

# Deploy after all gates pass
git push origin main

# Compare the deployed branch hash
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Rollback and recovery procedures are defined in `BACKUP_RESTORE.md`.

## 10. Conventions

- Dated content directories use `news/YYYY-MM-DD/`.
- Category filenames are exactly `business.md`, `economy.md`, and `politics.md`.
- Manifest dates are ISO calendar dates, unique, and newest-first.
- Browser JavaScript uses plain functions and constants in one project-owned file; no bundler or module loader is required.
- Validation scripts use ECMAScript modules and Node.js standard-library APIs only.
- Errors from verification are printed as one actionable finding per line and cause a non-zero exit.
- Browser runtime failures use `console.error` and a visible empty/error state.
- Control status is recorded in JSON trackers; narrative documents do not override tracker state.

## 11. Known Risks & Failure Modes

| Symptom | Cause | Impact | First Response | Status |
|:--|:--|:--|:--|:--|
| A date appears in the selector but one category is empty | Manifest and dated files were published out of sync | Readers see an incomplete daily batch | Stop publication and run `npm run verify` | resolved(2026-07-21): completeness gate installed |
| Private material appears in the public repository | A publication batch included a secret, PII, or Vault-class file | External exposure and company harm | Stop, remove material from the working tree, escalate exposure response, and rotate affected credentials | resolved(2026-07-21): current-tree and reachable-history gates installed |
| A news card has no evidence link | Generated content omitted or fabricated a source | Readers cannot audit a claim; reputation risk | Pause the batch and reconcile the claim to a public source | resolved(2026-07-21): source gate installed |
| Browser rendering fails while project files are intact | The marked or font CDN is unavailable or changed | Client-side presentation degrades | Confirm local files pass verification and inspect external asset availability | open |

## 12. Recovery Playbooks

- No incident-derived playbook is currently tracked.
- Repository backup, clean-clone rehearsal, and non-destructive restore procedures are maintained in `BACKUP_RESTORE.md`.
- Any future incident adds a dated playbook through a new work order; this section is not populated with hypothetical procedures.

## 13. Decision Log

Entries are append-only. A reversal is a new entry that states `SUPERSEDES #N`; existing rows are never edited or deleted.

| # | Date | Decision | Reason | Consequence | Status |
|:--|:--|:--|:--|:--|:--|
| 1 | 2026-07-20 | Classify Financial News as a PROJECT at T2 under Operation. | It is bounded public-facing work with real readers and reputation risk, but no money movement. | T2 CI, tracker, portability, and session-closure controls are mandatory. | Approved via ORG decisions #8, #11, and #18 |
| 2 | 2026-07-21 | Require complete three-category batches and HTTPS evidence per news item before publication. | Partial or unsupported publication creates avoidable reader and reputation harm. | Manifest, content, and source gates block incomplete batches. | Approved under NEWS-TG-1 |
| 3 | 2026-07-21 | Keep all Vault-class material outside this public repository. | A public working repository is not a suitable access boundary for private company data. | Working files contain public content and pointers only; safety scan blocks candidates. | Approved under ORG vault policy |
| 4 | 2026-07-20 | “หยุดทันทีเมื่อพบความคลาดเคลื่อนด้านเงิน การเปิดเผย PII/credential หรือการกระทำเกินอำนาจ; หาก acceptance gate เดิมล้มเหลวติดต่อกัน 3 ครั้งให้ pause และทบทวน; หากไม่เกิดผลดีที่วัดได้ติดต่อกัน 2 milestone ให้ kill หรือ re-scope” | T2 projects require an observable, counted stop rule. | The rule is applied verbatim to this bounded child project. | LOCKED via ORG decision #9 |

## 14. Document Map

| Document | Purpose |
|:--|:--|
| `PROJECT_BRAIN.md` | Project definition, current state, invariants, decisions, and operating memory |
| `AGENTS.md` | Repository-specific execution and publication rules |
| `BACKUP_RESTORE.md` | Repository backup, recovery, and rehearsal procedure |
| `README.md` | Product structure and daily content workflow |
| `WORK_ORDERS/2026-07-20-tier-gates.md` | Bounded NEWS-TG-1 implementation order |
| `TRACKERS/2026-07-20-tier-gates.json` | Machine-readable order status and evidence |
| `.github/workflows/verify.yml` | CI release gates |
| `scripts/verify-repository.mjs` | Content, static-file, source, safety, and portability verifier |
| `scripts/validate-work-order.mjs` | Machine validation for completed tracker artifacts |

No `IMPLEMENT_PLAN.md` or `ARCHITECTURE.md` is currently required for this bounded static project.

## 15. Roles

- **Final Decision Owner**: Company owner.
- **Parent Unit Owner**: Operation UNIT owner.
- **Architect**: Authorized human or AI agent named by the active work order.
- **Implementer**: Work-order assignee; NEWS-TG-1 is authored by GPT-5 Codex.
- **Reviewer**: Company owner or a separately assigned reviewer. T2 does not require a locked cross-review gate.

## 16. Operating Policy

- Execution follows `./AGENTS.md` and the active repo-relative work order.
- Agent work uses one session for one bounded scope.
- Ambiguous content, unsupported sources, exposure findings, and out-of-authority publication escalate to the company owner.
- Tracker state is authoritative for machine-checkable task status.
- GitHub Pages publication occurs only after local gates pass and the commit is intentionally pushed.
- The locked stop rule in Decision #4 applies without local reinterpretation.

## 17. Last Updated / Last Verified

- **Last Updated**: 2026-07-21 by GPT-5 Codex for NEWS-TG-1.
- **Last Verified**: 2026-07-21 through the active tracker, hermetic negative tests, repository verifier, and clean-clone protocol.
- **Kit Version**: v3.0 at `44501575d70643140b7af726b1f4ca90983368a6`.
