# agentMaterializeL2

Materializes the frontend of a module from the L2 defs **by their intent and commitments** (briefing `mls-102047/materializadorL2.md`, 05/10/2026), with the module's L4 as context. The order is contract, then shared, then desktop and mobile pages, then test cases. `agentMaterializeL2v2` stayed as it was (V1) until it was removed on 08/10/2026.

Run `@@agentMaterializeL2 <module>`. The project comes from the current context. Optional scope:

| option | effect |
|---|---|
| `--page <id>[,<id>…]` | shared40 and pages50 work only on these pages. input20 always gates the whole module, and refuses an id that is not an accepted page |
| `--device desktop\|mobile` | pages50 generates only this device (the shared is common to both) |
| `--force` | regenerates the units in scope even when nothing changed (with `--device`, only that device's pages) |
| `--review` | adds `review55`: a second LLM reviews each page in scope against its template (report only; off by default) |

Examples: `@@agentMaterializeL2 comandaRestaurante --page mesas --device mobile`, `@@agentMaterializeL2 comandaRestaurante --page fechamento --force`.

**State on 05/10/2026: phase C** (`entry10 → input20 → shared40 → pages50`). Task: `mls-base/tasks/planned/TASK-102020-agent-materialize-l2-v4.md`.

## Inputs, per page

| kind | file | role |
|---|---|---|
| contract | `l2/<module>/web/contracts/<pageId>.defs.ts` | commitment (routes, types, rules, access); the route JSDoc is intent |
| shared | `l2/<module>/web/shared/<pageId>.defs.ts` | commitment (ids of states, functions, params, forms); descriptions and modes are intent |
| desktop, mobile | `l2/<module>/web/<device>/page11/<pageId>.defs.ts` | intent of the page, organisms, suggested molecules, template |
| L4 | `l4/<module>/{module,rules,access}.defs.ts`, `ontology/`, `journeys/` | intent: meanings, field titles, rule texts, business steps, actors; sliced per page |

## Folder

| path | what |
|---|---|
| `agentMaterializeL2.ts` | public root agent: parses the message and plans the steps |
| `flow.json` | the contract: steps, dependencies, done-anchors, status, decisions |
| `helpers/` | everything shared by the steps (V2). Copies are marked in their header |
| `helpers/core.ts` | names, invocation, `pipeline.json` |
| `helpers/defs/` | grammar readers: `contract.ts` (copy of the official `l2/helpers/contractV2` parser), `shared.ts`, `page11.ts` |
| `helpers/l4/context.ts` | L4 reader, per-page slice and its prompt rendering |
| `helpers/{storText,hash,intents,studioDeclaration}.ts` | Studio IO, digest, collab-messages intents, Studio compile |
| `steps/entry10/` | starts a fresh pipeline |
| `steps/input20/` | discovery, gate, method resolution, L4 slice, fingerprints, `input.json`. See its `readme.md` |
| `steps/shared40/` | shared class per page: prompt with the L4, gate, Studio compile, declaration, receipt with findings. See its `readme.md` |
| `steps/pages50/` | desktop and mobile page per accepted page: design prompt with the L4, gate, Studio compile, receipt. See its `readme.md` |
| `steps/review55/` | review of each page, only with `--review`: findings with severity in a receipt, report only. See its `readme.md` |

## Rules

- Self-contained: no import from `l2/helpers/` or another agent's folder.
- Was `agentMaterializeL2v4` until 09/10/2026, when it replaced the old `agentMaterializeL2` (the cfe pipeline, removed that day) and took its name. It keeps the files of the old agent that other code still uses:
  - `helpers/cfeMaterializeStudio.ts` and its dependencies (`cfeMaterializeCore`, `cfeMlsImports`, `cfeSessionScope`, `cfePageSkeleton`, `cfeSharedScaffold`), imported by the aura plugins, services and `agentManageLanguages`;
  - `nodejsSaveConfigJson.ts` (with `helpers/cfeModuleNavigation.ts`), which composes the frontend of `l5/config.json`. `scripts/build.mjs` runs it from `l2/<masters.frontend.agentFolder>/`.

  They are copies of the old files. The materialization pipeline (entry10 … review55) does not use them.
- No hard-coded module, page, category or function name.
- Browser only (Studio). Proof is Studio compilation.
- Tailwind in the page `.ts`, no `.less` (V3). Texts in the product languages of the L4 module (V4).
- Nothing is computed in the browser; a gap in the shared defs is completed minimally and reported (V5).
