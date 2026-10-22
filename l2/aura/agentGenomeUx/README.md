# agentGenomeUx

Generates the **UX N variant** of a module (`TASK-102020-genome-ux-3`, part A). For every page it writes
`l2/<module>/web/<device>/page{N}1/<page>.defs.ts` on **both devices**, in the exact page11 grammar
(`parseL2Page11`, `agentMaterializeL2/helpers/defs/page11.ts`):

- `template` = `{ category: <full template path>, experience: <name> }`;
- `intent`, `sections`, `organisms` and their `intents` copied from page11 unchanged;
- `molecules` chosen again for the template, or **absent** when `layouts[N].useMolecules` is `false`.

The template is `layouts[N].templates.pages["<module>/<page>"]`, or the page11 `template.category` when the UX
did not choose one (`helpers/uxTemplates.ts`). Its `## Molecule rules` (`helpers/templateRules.ts`) apply:
`forbid` is a hard constraint, `prefer` is guidance; a legacy `pageNN.md` has no rules (no restriction).

`agentImplementGenome` is untouched (part C stops calling it).

## Entry

JSON, optionally after `@@agentGenomeUx`:

```json
{ "module": "reembolsoDespesas", "layout": 2, "pages": ["despesas_aprovadas"], "materialize": true, "force": false }
```

| key | | |
|---|---|---|
| `module` | required | lowerCamel module |
| `layout` | required | UX N, integer 2..9 (`page{N}1`; UX 1 is page11). `layouts[N]` must exist in the project config |
| `pages` | optional | page ids (a full path or `.defs.ts` name is reduced to the id); empty = every `web/desktop/page11/*.defs.ts` |
| `materialize` | optional | at the end, run `agentMaterializeL2` with `{ module, scope: { genome: "page{N}1", pages? } }` (`pages` only when the entry named them) |
| `force` | optional | regenerate pages whose receipt is still fresh |

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
l2/<module>/pipeline/agentGenomeUx/page{N}1/<pageId>.json                         receipt (written last)
l2/<module>/pipeline/agentGenomeUx/page{N}1/responses/<pageId>-<stage>-<n>.json   raw LLM answers + verdict
```

## Receipt (`GenomeUxReceipt`, genomeUxReceipt.ts)

```jsonc
{
  "schemaVersion": "2026-10-22-genome-ux-v2",     // v2: pageDataHash (v1 receipts are stale)
  "project": 102047, "module": "reembolsoDespesas", "layout": 2, "genome": "page21", "pageId": "despesas_aprovadas",
  "template": {
    "path": "_102020_/l4/collabux/templates/financialTransactions/dueAgenda.md",
    "experience": "dueAgenda",
    "isDefault": false,                 // true = no entry in layouts[N].templates.pages, page11 template used
    "hash": "sha256:…",                 // template text ('' for bespoke)
    "rulesHash": "sha256:…" | null,     // normalized {axes, prefer, forbid}; null = no rules
    "rules": { "axes": {…}, "prefer": […], "forbid": […] } | null
  },
  "page11Hashes": { "desktop": "sha256:…", "mobile": "sha256:…" },
  "pageDataHash": "sha256:…",           // contract + shared defs texts the prompts saw
  "useMolecules": true,
  "catalogHash": "sha256:…" | null,     // D2MoleculeInventory.sourceHash (catalog molecules/skill.ts); null without molecules
  "moleculeHashes": { "<index/usage ref>": "sha256:…" },
  "selectedGroups": { "<organismId>": ["groupViewData"] },
  "dropped": ["desktop:<organismId>/<tag>"],
  "variantHashes": { "desktop": "sha256:…", "mobile": "sha256:…" },   // the written page{N}1 defs
  "createdAt": "2026-10-22T…Z"
}
```

## Stale (for the status panel, part C)

- Pure: `genomeUxStale(receipt, current) → { stale, reasons }` with reasons from
  `receipt` (none / older version), `page11`, `pageData`, `template`, `rules`, `catalog`, `useMolecules`, `variant`
  (a written defs is missing or was edited). `current` comes from `genomeUxCurrentFromTexts(...)`.
  `catalogHash` is compared only when the caller passes it.
- Studio: `readGenomeUxPageStatus(project, module, layout, pageId, { layoutEntry?, catalogHash? })` (genomeUxIo.ts)
  returns `{ kind: 'ok', receipt, current, verdict, context }` or `{ kind: 'error', diagnostic }` (missing page11,
  missing template, unreadable rules). `readGenomeUxInventory(project).sourceHash` gives the catalog hash.
- "generation" (a device's variant defs missing) shows as `variant` with `current.variantHashes[device] === null`;
  "refused" comes from the input20 snapshot, not from this receipt.

## Files

| file | |
|---|---|
| `agentGenomeUx.ts` | root agent: entry, deterministic bootstrap, dispatch step |
| `agentGenomeUxDispatch.ts` | page list, reuse check, workers / closing steps |
| `agentGenomeUxPage.ts` | the two LLM stages, gate, repair, write |
| `genomeUxCore.ts` | pure: entry, paths, effective template, experience, rules, forbid match |
| `genomeUxVariant.ts` | pure: build, render + `parseL2Page11` check, molecule gate, sanitize |
| `genomeUxPrompts.ts` | pure: prompts, tool schemas, answer parsing |
| `genomeUxPageData.ts` | pure: shared states + contract row types for the prompts |
| `genomeUxReceipt.ts` | pure: receipt, current inputs, stale verdict |
| `genomeUxRun.ts` | run plumbing: step args, finalize a page, closing steps |
| `genomeUxIo.ts` | Studio IO, `readGenomeUxPageStatus` |
