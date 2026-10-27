# agentGenomeUx

Generates the **UX N variant** of a module (`TASK-102020-genome-ux-3`, part A), and with `layout: 1` applies the
template chosen for UX 1 to page11 itself (**base mode**, `TASK-102020-genome-ux-4`, see below). For every page it writes
`l2/<module>/web/<device>/page{N}1/<page>.defs.ts` on **both devices**, in the exact page11 grammar
(`parseL2Page11`, `agentMaterializeL2/helpers/defs/page11.ts`):

- `template` = `{ category: <full template path>, experience: <name> }`;
- `intent`, `sections`, `organisms` and their `intents` copied from page11 unchanged;
- `molecules` chosen again for the template, or **absent** when `layouts[N].useMolecules` is `false`.

The template is `layouts[N].templates.pages["<module>/<page>"]`, or the page11 `template.category` when the UX
did not choose one (`helpers/uxTemplates.ts`). Its `## Molecule rules` (`helpers/templateRules.ts`) apply:
`forbid` is a hard constraint, `prefer` is guidance; a legacy `pageNN.md` has no rules (no restriction).

`agentImplementGenome` is untouched (part C stops calling it).

## Base mode (UX 1, `TASK-102020-genome-ux-4`)

`layout: 1` rewrites **page11 itself** (`web/<device>/page11/<page>.defs.ts`, both devices) instead of writing a
variant folder:

- the template is `layouts["1"].templates.pages["<module>/<page>"]` (picked in the UX tab, local only), else the
  page11 `template.category` — and then the page is a **no-op** (no LLM, no write, no receipt), unless `force` is
  set or a base receipt of the page exists and is stale;
- `template` swapped and `molecules` chosen again, with the same funnel, rules and page data; `intent`, `sections`,
  `organisms` and their intents unchanged (the render refuses otherwise);
- rendered with the page11 fileReference and read back with `parseL2Page11` before the write;
- `layouts["1"]` may be absent from the config (then every page is a no-op); its `useMolecules` applies as for any
  UX (off = page11 written without `molecules`);
- receipt at `pipeline/agentGenomeUx/page11/<page>.json`; `materialize` chains `agentMaterializeL2` with
  `scope.genome = "page11"`.

Keeping the chosen template when agentDefsL2 regenerates page11 is part B of that task (agentDefsL2 side).

## Entry

JSON, optionally after `@@agentGenomeUx`:

```json
{ "module": "reembolsoDespesas", "layout": 2, "pages": ["despesas_aprovadas"], "materialize": true, "force": false }
```

| key | | |
|---|---|---|
| `module` | required | lowerCamel module |
| `layout` | required | UX N, integer 1..9 (`page{N}1`); **1 = base mode** (page11 rewritten in place, above). `layouts[N]` must exist in the project config, except for 1 |
| `pages` | optional | page ids (a full path or `.defs.ts` name is reduced to the id); empty = every `web/desktop/page11/*.defs.ts` |
| `materialize` | optional | at the end, run `agentMaterializeL2` with `{ module, scope: { genome: "page{N}1", pages? } }` (`pages` only when the entry named them) |
| `force` | optional | regenerate pages whose receipt is still fresh (base mode: also pages with no UX 1 choice — their molecules are chosen again for the current page11 template) |

Called from the UI like any agent: `_executeAgent('agentGenomeUx', JSON.stringify(entry))` (selectModule).

## Flow

```
1 (root, deterministic bootstrap)
└ genomeUx-dispatch          agentGenomeUxDispatch: pages of the run, reuse check, one worker per pending page
  ├ genomeUx-<page>-groups-1    agentGenomeUxPage, LLM: relevant groups per organism (forbidden groups not offered)
  ├ genomeUx-<page>-decision-1  agentGenomeUxPage, LLM: molecules for desktop AND mobile in one answer
  ├ …-2                         one repair per stage when the answer is refused
  ├ genomeUx-done               result anchor, added when every page of the run is fresh
  └ genomeUx-materialize        agentMaterializeL2 (only with materialize)
```

- The molecule funnel is agentDefsL2 pages50's (`moleculeGroupPrompt`, `parseD2MoleculeGroupJudgment`,
  `readD2MoleculeShortlist`, `moleculeDecisionContext`, `gateD2MoleculeRoles`), with the category fixed (the
  template) and the template text and rules in both prompts. Like agentDefsL2, one decision answers both devices.
- Both prompts also get the **page data** (`genomeUxPageData.ts`): the shared states (which state feeds which
  organism) and the contract row types (`web/contracts/<page>.defs.ts`, the only fields a row has, as
  agentMaterializeL2 pages50 prompts them). The decision rules say a molecule must fit its organism's data, and the
  template axes apply only when the data supports them — otherwise the template's degraded form. Without it the
  model chose sparklines for totals with no series (trendWall on `tarefas/inicio_membro`, 22/10/2026). A missing
  or unreadable contract/shared becomes `pageData: null` in the prompt, never a failure.
- Gate (`gateGenomeUxMolecules`): the organism exists in that device's page11; each tag is in a group chosen for
  that organism; no tag of a `forbid` group (group = tag prefix before `--`, ignoring case). A refusal gets one
  repair; if the repair is still refused, the refused tags are **dropped** (`sanitizeGenomeUxMolecules`) and the
  organism may end with no molecules — a forbidden tag is never written. Dropped tags are listed in the receipt.
- No LLM call when `useMolecules` is false, or when no allowed group/tag is left.
- Nothing intermediate is written inside `page{N}1` (input20 would discover it); both defs are rendered and read
  back with `parseL2Page11` before any write.

## Owned files

```
l2/<module>/pipeline/agentGenomeUx/page{N}1/<pageId>.json                         receipt (written last; page11/ for the base)
l2/<module>/pipeline/agentGenomeUx/page{N}1/responses/<pageId>-<stage>-<n>.json   raw LLM answers + verdict
```

## Receipt (`GenomeUxReceipt`, genomeUxReceipt.ts)

```jsonc
{
  "schemaVersion": "2026-10-23-genome-ux-v3",     // v3: page11ContractHashes + base receipts (v1/v2 receipts are stale)
  "project": 102047, "module": "reembolsoDespesas", "layout": 2, "genome": "page21", "pageId": "despesas_aprovadas",
  "template": {
    "path": "_102020_/l4/collabux/templates/financialTransactions/dueAgenda.md",
    "experience": "dueAgenda",
    "isDefault": false,                 // true = no entry in layouts[N].templates.pages, page11 template used
    "hash": "sha256:…",                 // template text ('' for bespoke)
    "rulesHash": "sha256:…" | null,     // normalized {axes, prefer, forbid}; null = no rules
    "rules": { "axes": {…}, "prefer": […], "forbid": […] } | null
  },
  "page11ContractHashes": { "desktop": "sha256:…", "mobile": "sha256:…" },   // page11 intent + sections + organisms only
  "pageDataHash": "sha256:…",           // contract + shared defs texts the prompts saw
  "useMolecules": true,
  "catalogHash": "sha256:…" | null,     // D2MoleculeInventory.sourceHash (catalog molecules/skill.ts); null without molecules
  "moleculeHashes": { "<index/usage ref>": "sha256:…" },
  "selectedGroups": { "<organismId>": ["groupViewData"] },
  "dropped": ["desktop:<organismId>/<tag>"],
  "variantHashes": { "desktop": "sha256:…", "mobile": "sha256:…" },   // the written page{N}1 defs (base: the written page11)
  "createdAt": "2026-10-22T…Z"
}
```

## Stale (for the status panel, part C)

- Pure: `genomeUxStale(receipt, current) → { stale, reasons }` with reasons from
  `receipt` (none / older version), `page11`, `pageData`, `template`, `rules`, `catalog`, `useMolecules`, `variant`
  (a written defs is missing or was edited). `current` comes from `genomeUxCurrentFromTexts(...)`.
  `catalogHash` is compared only when the caller passes it.
- **`page11` = only what a variant inherits** (v3, decision 4 of `TASK-102020-genome-ux-4`): per device, the hash
  of page11 `intent`, `sections` and `organisms`, key order ignored (`genomeUxPage11ContractHash`), not of the whole
  text. A page11 that only gets another template or other molecules (base mode, agentDefsL2) does not make UX ≥ 2
  stale; an organisms/sections/intent change does. Note: a UX N page **without its own template** follows the page11
  template, so a base template change still shows there as `template` (its effective template did change).
- **Base mode**: the written defs are page11, so `variantHashes` == the current page11 hashes says nobody rewrote it;
  `template` covers the choice (the `layouts["1"]` entry, else the page11 `template.category`). Fresh = page11 is
  what the agent wrote AND the chosen template is page11's AND its text / rules, the page data and useMolecules did
  not change. page11 rewritten afterwards (e.g. by agentDefsL2) → stale with `variant` (plus `template` / `page11`
  when those changed too).
- Reuse and end of run: `readGenomeUxPagePending` (genomeUxIo.ts). UX N: unreadable or stale. Base: no choice and no
  receipt = nothing to do; a choice that differs from page11 with no receipt = pending; with a receipt, its verdict.
- Studio: `readGenomeUxPageStatus(project, module, layout, pageId, { layoutEntry?, catalogHash? })` (genomeUxIo.ts)
  returns `{ kind: 'ok', receipt, current, verdict, context }` or `{ kind: 'error', diagnostic }` (missing page11,
  missing template, unreadable rules). `readGenomeUxInventory(project).sourceHash` gives the catalog hash.
- "generation" (a device's variant defs missing) shows as `variant` with `current.variantHashes[device] === null`;
  "refused" comes from the input20 snapshot, not from this receipt.
- Panel, base row (page11, `variationStatusCore.ts`): `generation` when the UX 1 choice differs from page11's
  `template.category`; `stale` only when a base receipt exists and is stale; otherwise page11's own logic (refused /
  materialize / fresh). Its "Generate" runs `{ module, layout: 1, pages, materialize: true }`.

## Files

| file | |
|---|---|
| `agentGenomeUx.ts` | root agent: entry, deterministic bootstrap, dispatch step |
| `agentGenomeUxDispatch.ts` | page list, reuse check, workers / closing steps |
| `agentGenomeUxPage.ts` | the two LLM stages, gate, repair, write |
| `genomeUxCore.ts` | pure: entry, paths, effective template, base choice, experience, rules, forbid match |
| `genomeUxVariant.ts` | pure: build, render + `parseL2Page11` check, molecule gate, sanitize |
| `genomeUxPrompts.ts` | pure: prompts, tool schemas, answer parsing |
| `genomeUxPageData.ts` | pure: shared states + contract row types for the prompts |
| `genomeUxReceipt.ts` | pure: receipt, current inputs, stale verdict |
| `genomeUxRun.ts` | run plumbing: step args, finalize a page, closing steps |
| `genomeUxIo.ts` | Studio IO, `readGenomeUxPageStatus`, `readGenomeUxPagePending`, `readGenomeUxBaseChoice` |
