# contracts30

Pure deterministic typed-contract core. It converts indexed L4 ontology fields, exact backend
routes/usecases and per-actor grants into one contract module per page. Nested paths, enum codes,
required/derived/indexed marks, references and collections remain explicit. Unsupported types,
unresolved paths, changed routes and authorization ambiguity are named derivation errors. Transition
payloads come only from an explicit structural `payload` declaration; an absent declaration is a
diagnostic with the transition origin, while `payload: []` explicitly declares an id-only command.

The renderer emits only `contracts/<pageId>.defs.ts` content: exact route constants plus
`<CallPascal>Input`/`Output` declarations. List output is an explicit Item array; static pages emit
`export {}`. This task provides no agent hook and performs no live write or materialization; flow
integration remains unavailable until d2_04.
