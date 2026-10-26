# agentNewReleaseL2

Applies the frontend half of a change effort. Run `@@agentNewReleaseL2 <module>`. The project is the current one. The agent reads `l4/<module>/pool/l4/changeEffort.json` and keeps the answers of this master.

Two paths:

- **Materialize only.** No new page, no contract change, and no defs to regenerate. The agent deletes the generated files of the effort pages (shared `.ts`, shared `Dts.txt`, and each device/genome `<pageId>.ts` that exists; never a `.defs.ts`). One `agentMaterializeL2` step then gets `{ project, module, scope: {} }`. A closing step of this agent waits on it and finishes `completed` or `failed` with the materializer's message and the deleted paths. A delete failure finishes `failed` with that path and does not materialize.
- **Regenerate.** A page is created, a contract changes, or defs of kind `page`, `contract`, or `shared` must be regenerated. The L2 pool `l4/<module>/pool/l2/web/effort.json` must already mark `toCreate` or `toUpdate` on exactly those pages. The agent stores a sha256 snapshot of the product defs, adds an `agentDefsL2` step with `{ project, module, scope: "all" }`, then a check step that waits on it. If the generator failed, the check fails with that message and does not materialize. If it finished, the check reads the product defs again. A path created, changed, or deleted outside the regenerated pages fails the check with that list and does not materialize. A clean check deletes the generated files of the regenerated pages and the materialize-only pages, then adds `agentMaterializeL2` for the whole module and the same closing step. A delete failure fails the check with that path and does not materialize.

A degree-2 page deletes only its desktop and mobile `page11` files. Shared `.ts` and `Dts.txt` are deleted when the effort names `shared` for that page, or names `contract` in `regenerateDefs`.

The close step writes one line per planned page, in alphabetical order, before any command: `<page> degrau <n>: <calls> calls (<repairs> repair), <cost> USD`. Those lines are present when the materializer failed. Commands are present only when it completed.

The snapshot is `l2/<module>/pipeline/agentNewReleaseL2/snapshot.json`. The guard compares only product files `l2/<module>/web/contracts/<page>.defs.ts`, `shared/<page>.defs.ts`, `desktop/page11/<page>.defs.ts`, and `mobile/page11/<page>.defs.ts`. It ignores everything under `l2/<module>/pipeline/`, including the defs-generator receipts and this snapshot. Files of a materialize-only page are ignored when they did not change. A change on one of them is outside and stops the release.

No model call. A missing module, an extra argument, a missing or invalid effort file, or a plan with nothing to apply ends on that message and adds no child step.

Refusals, and why:

| reason | why |
|---|---|
| usage line | the invocation is one module name |
| `changeEffort.json is missing at …` | there is nothing to apply |
| gate text | the file is not a change effort |
| `not in this release step: …` | the answer removes a unit, creates a non-page, regenerates a defs kind this step does not own, runs agents, or ended in `abend` |
| `nothing to apply` | this master has no page to materialize or regenerate |
| `planner conversation not run or marks differ: …` | the pool effort does not mark `toCreate` or `toUpdate` on exactly the pages this plan regenerates; both lists are in the message |
| `The current project is unavailable.` | the following step must carry the current project |
| `outside: …` | a product defs file outside the regenerated pages changed; nothing is materialized |
