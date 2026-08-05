# E1 changelog

- 2026-08-05 — Flow v3: restored the stable root-planner architecture, including prompt-language
  detection, LLM-localized E1–E9 titles and the complete dependency roadmap created at task start.
  Split clarification from deterministic compilation with the durable `e1-clarification-answer`
  anchor. Removed local UI-cache synchronization, submit locks and automatic version migration.
- 2026-08-05 — Product languages became an explicit clarification field, normalized as ordered unique
  BCP-47 tags independently from the widget language.
- 2026-08-04 — Initial E1 artifact, resumable pipeline and foreign-module collision guard.
