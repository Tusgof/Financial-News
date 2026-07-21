# AGENTS.md — Financial News

This repository is a public T2 PROJECT under the Operation UNIT. These rules apply to every human or AI agent working here.

## 1. Scope and authority

- Work only within the active work order and its tracker.
- The company owner is the final decision owner. Publication policy, project scope, and locked decisions require owner approval.
- Governance-only work orders must not edit, add, or remove files under `news/`.
- Do not publish to social platforms from this repository.

## 2. Public-content gate

- Treat every tracked file as public. Credentials, PII, payroll, contracts, financial statements, legal documents, and private operational data never enter this repository.
- News is informational content, not investment advice. Do not add personalized recommendations, guaranteed outcomes, or calls to transact.
- Keep the three daily categories: `business`, `economy`, and `politics`.
- Each category file must contain the global and Thailand sections, at least six news items in total, and an HTTPS source link for every item.
- Do not invent a source, confidence label, quotation, statistic, or publication date. Ambiguity stops publication and is escalated to the owner.

## 3. Source gate

- Prefer primary documents and named reputable publishers. An AI-generated summary is not a source.
- A source link must identify the evidence used for that item; a home page or unrelated article does not satisfy the gate.
- Keep source URLs public and free of tokens, private query parameters, or account identifiers.
- If a material claim cannot be reconciled to a source, remove the claim or pause the publication batch.

## 4. Publication gate

- Add a date to `news/manifest.json` only after all three category files for that date exist and pass validation.
- Keep manifest dates unique, valid, and newest-first.
- Before push, run `npm test` and `npm run verify`.
- A failed validation is fixed at the cause. Never weaken or bypass a scan to publish.
- GitHub Pages deploys from `main`; a push is an external publication action.

## 5. Engineering discipline

- Make surgical changes. Do not refactor the site or rewrite news while installing governance controls.
- Declare every tool dependency in `package.json`; the verification scripts use only the pinned Node.js runtime and standard library.
- Do not add absolute machine paths. Use repository-relative paths or named environment variables.
- Preserve static-site portability: a clean clone must verify without private files, browser state, or machine-specific configuration.

## 6. Decisions, tracker, and closure

- `PROJECT_BRAIN.md` is the project source of truth. Decision-log entries are append-only; reversals are new superseding entries.
- Tracker status may become `done` only when all required artifacts exist and the documented checks pass.
- Use one session for one work-order scope.
- End a completed session with an intentional commit, push, and comparison of local HEAD with the remote branch hash.
- T2 commits authored by an AI agent include an `Agent:` trailer naming the model family.

## 7. Escalation and stop rule

Stop immediately on a secret/PII finding, unsupported or conflicting source, publication outside authority, missing daily category, or validation failure that cannot be resolved inside the work order.

The locked project stop rule is:

> “หยุดทันทีเมื่อพบความคลาดเคลื่อนด้านเงิน การเปิดเผย PII/credential หรือการกระทำเกินอำนาจ; หาก acceptance gate เดิมล้มเหลวติดต่อกัน 3 ครั้งให้ pause และทบทวน; หากไม่เกิดผลดีที่วัดได้ติดต่อกัน 2 milestone ให้ kill หรือ re-scope”
