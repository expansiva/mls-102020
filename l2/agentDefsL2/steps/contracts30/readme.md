# contracts30

Pure deterministic typed-contract core. It converts indexed L4 ontology fields, exact backend
routes/usecases and per-actor grants into one contract module per page. Nested paths, enum codes,
required/derived/indexed marks, references and collections remain explicit. Unsupported types,
unresolved paths, changed routes and authorization ambiguity are named derivation errors. Transition
payloads come only from an explicit structural `payload` declaration; an absent declaration is a
diagnostic with the transition origin, while `payload: []` explicitly declares an id-only command.

The renderer emits only `contracts/<pageId>.defs.ts` content: exact route constants plus
`<CallPascal>Input`/`Output` declarations. List output is an explicit Item array; static pages emit
`export {}`. The deterministic `agentD2Contracts` hook gates every selected create/update unit,
persists a draft, promotes the contract only after validation, rereads its SHA-256, and then records
an approved per-page result. `contracts.json` is the downstream barrier and becomes approved only
when every expected result and artifact hash matches the still-current input snapshot. Restarts reuse
approved units byte-for-byte; `done` and `toRemove` pages are not emitted. No model is called.
