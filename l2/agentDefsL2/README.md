# agentDefsL2

Recreated on 2026-09-30 for page11 v2. The public artifact renders page intent, sections, organisms and molecule choices. Field paths and write bindings stay in `pipeline/agentDefsL2/page11Needs/<pageId><Device>.json`.

This stage contains pure builders, a renderer/parser and gates. The `/pages` execution flow, LLM prompt, Studio compilation and receipts are installed by later tasks. The entry agent reports that execution is unavailable until then.

`steps/contracts30/` is frozen solely for the L1 regeneration test. Its remaining compatibility dependencies are `helpers/d2Core.ts`, `helpers/d2Intents.ts`, `helpers/d2Header.ts`, `steps/input20/{gate,io,contracts}.ts` and `steps/finalize60/{compile,io,contracts}.ts`. The input20 gate and IO only re-export shared snapshot code from `l2/helpers/defsInput/`.
