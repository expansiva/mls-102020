# agentDefsL2

Recreated on 2026-09-30 for page11 v2. The public artifact renders page intent, sections, organisms and molecule choices. Field paths and write bindings stay in `pipeline/agentDefsL2/page11Needs/<pageId><Device>.json`.

Run `@@agentDefsL2 <module> /pages`, or invoke the step with `{ "project": N, "module": "<module>", "scope": "pages" }`. The four stages are `entry10 → input20 → pages50 → finalize60`. Input20 reads the canonical L4/planner snapshot; pages50 researches molecules and generates one desktop/mobile page11 pair and two internal needs drafts per selected page; finalize60 requires Studio compilation and records page ownership. Identical units reuse the complete receipt without an LLM call or write.

Only `/pages` exists now. Shared behavior and typed contracts will be redesigned after validating page11. The old `contracts30` remains frozen solely because L1 regeneration tests still import it; this flow does not execute it or read its artifacts. Existing shared and contract files in a module are left untouched.

`steps/contracts30/` is frozen solely for the L1 regeneration test. Its remaining compatibility dependencies are `helpers/d2Core.ts`, `helpers/d2Intents.ts`, `helpers/d2Header.ts`, `steps/input20/{gate,io,contracts}.ts` and `steps/finalize60/{compile,io,contracts}.ts`. The input20 gate and IO only re-export shared snapshot code from `l2/helpers/defsInput/`.
