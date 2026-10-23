# review55 — CHANGELOG

- 2026-10-05: created (Guilherme: a review LLM after the page; off by default, enabled with `--review`). It reports only.
  - The reviewer judges the page against its template and intent, and every finding must quote its basis.
  - Severities are blocker, major and minor.
  - A failed answer settles the unit without being reused.
- 2026-10-22: **reuse compares DATA only; agent changes regenerate nothing until `--force`.** The receipt gets `dataHash` (the reviewed page, its page11 unit, the shared declaration); `contextHash` is recorded, never compared. An older receipt is adopted.
