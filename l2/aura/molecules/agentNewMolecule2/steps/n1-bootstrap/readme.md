# n1-bootstrap

**No LLM.** Resolves everything the chosen group implies and writes `context.json` once
(decision D1). Every later step reads it from disk and never re-derives.

## Why it runs before the requirements call

The **theme decides the molecule's name** (decision Q2). `n2-plan` proposes a `fileReference`
already carrying the theme suffix, so the human sees the final name and tag at the checkpoint —
while changing them is still free. That means detection has to happen first.

It is also all pure lookup: an LLM call here would be waste, and worse, unreliable.

## What it resolves

| field | source |
|---|---|
| destination project | `mls.actualProject` |
| group canonical name + folder | `skills/index.ts` (folder = name lowercased) |
| creation + usage skill refs | the same entry; the creation skill is **probed** (importable, non-empty `skill`) and later steps import it from the reference, so the text never bloats `context.json` |
| molecule base class | `_102033_/l2/moleculeBase.ts` — **mls-102033**, not 102040 |
| theme | `l2/skills/theme.ts` if present, validated with `shared/vThemeContract` |

## Gate (`gate.ts`) — no retry, failures are readable and immediate

| code | when |
|---|---|
| `group_unknown` | the group is not in `skills/index.ts` (the message lists what exists) |
| `group_no_skill` | the group has no `skillReference` — decision Q5; today only `groupNavigateMain` |
| `group_skill_empty` | the skill does not import or exports no non-empty `skill` |
| `base_unreadable` | `_102033_/l2/moleculeBase.ts` not readable — 102033 must be a declared dependency |
| `theme_invalid` | a theme EXISTS but fails contract v1 — never generate against a broken contract |
| `theme_suffix` | a valid theme with no suffix: the molecule could not be named apart from the neutral one |
| `group_folder` | the folder is not lowercase — kebab-casing a camelCase folder derives a tag that matches no molecule (`shared/moleculeTemplates` test) |
| `dest_project` | `mls.actualProject` unavailable |
| `context` | assembly failed for a reason no other code reported |

**A missing theme is not a failure.** No theme means a neutral molecule, exactly like the old
flow — that is what acceptance 3.11 checks. `loadVTheme` reports absence as an error (the Variant
requires a theme), so existence is checked first to keep absence and invalidity apart.

`checkNmGroupChoice` is exported and also used by the ROOT, right after the classification: failing
there costs nothing, while failing three steps later wastes two LLM calls.

## Output

- `l4/agentNewMolecule2/<runKey>/context.json`
- `l4/agentNewMolecule2/<runKey>/trace-n1-bootstrap-01.json`
- `runKey` appended to task memory
- the `n1-done` anchor, titled with the context summary
