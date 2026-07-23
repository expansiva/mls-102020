# v4-index

Deterministic group index registration (NO LLM).

Input: context.json + existing index.ts/.html. Output: side-effect import added (or minimal index created) + v4-done anchor.
Scope guard: ONLY the import block of an existing index.ts is touched; the showcase content is never rewritten (summary reports that). Unrecognizable format => fail readable, never guess.
