# E1 changelog

- 2026-08-29: `/rebuild all` recovers the stored prompt, wipes that module's l4/l1/l2 (and its l5
  folder) through the same `deleteFile` channel as a total `/rebuild`, strips the module from
  project.json/config.json, and stamps `rebuildAll` counts on the new pipeline. Without a
  recoverable prompt it aborts and deletes nothing. `/rebuild` and `/rebuild eN` are unchanged.

- 2026-08-29: Actor rule in the prompt: a demographic persona does not create an actor. "Qualquer
  pessoa" / "público" is one public actor plus the privileged actors the request names. listaAssinatura
  run01 had listed morador, responsável and visitante as three actors; that is the upstream source of
  the three twin sign journeys E2 then emitted.

- 2026-08-27: Languages are a user decision, never an LLM guess. The prompt example shows a single
  language, and `normalizeNs4E1Review` discards every `productLanguages` entry the user did not cite
  in the clarification answer or in the original prompt (falling back to `[userLanguage]`), recording
  the discard in `review.i18nWarnings` — surfaced as a gate warning and in the e1-compile trace,
  never copied into the l4. Run02 of 102047: a pt-BR-only request shipped en/es in the l4 and the CF
  finalize auto-dispatched `@@addLanguage` for both.

- 2026-08-21: The existence backstop accepts a `/rebuild` run (`rebuildModule` memory, the analogue of
  `resumeModule`) and its message now teaches the flag. It has to be the memory and not the archive:
  the archive is a soft-delete and the module keeps `l2` files this flow does not own, so
  `listNs4ModuleFolders` still reports the folder. Every other collision is refused exactly as before —
  rule 7 is intact, regeneration is an explicit intent.

- 2026-08-08 — Build 29 canonicalizes single-token module names before the root planner, so an
  initial-capital command such as `BuildFlowFsm23` resumes `buildFlowFsm23` directly instead of
  executing a fresh E1 and discovering the collision only during compilation.
- 2026-08-05 — Build 6 persists terminal compile failures with `error` and `failedAt`; LLM-call
  failures use `wait_after_prompt` so their message remains in the task trace.
- 2026-08-05 — Flow v3: restored the stable root-planner architecture, including prompt-language
  detection, LLM-localized E1–E9 titles and the complete dependency roadmap created at task start.
  Split clarification from deterministic compilation with the durable `e1-clarification-answer`
  anchor. Removed local UI-cache synchronization, submit locks and automatic version migration.
- 2026-08-05 — Product languages became an explicit clarification field, normalized as ordered unique
  BCP-47 tags independently from the widget language.
- 2026-08-04 — Initial E1 artifact, resumable pipeline and foreign-module collision guard.
