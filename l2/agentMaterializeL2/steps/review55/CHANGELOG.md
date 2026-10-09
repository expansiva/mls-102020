# review55 — CHANGELOG

- 2026-10-05: created (Guilherme: a review LLM after the page; off by default, enabled with `--review`). It reports only.
  - The reviewer judges the page against its template and intent, and every finding must quote its basis.
  - Severities are blocker, major and minor.
  - A failed answer settles the unit without being reused.
