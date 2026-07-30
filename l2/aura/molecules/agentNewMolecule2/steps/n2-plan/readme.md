# n2-plan

The requirements call **and** the pipeline's only human stop.

## Why the checkpoint is here

The `.defs.ts` is the spec every later step reads, so an error there propagates into four files.
Stopping before it is the cheap moment. The old flow stopped in the same place, through
`agentNewMoleculePlannerClarification` — this step keeps that interface (decision D2) and adds a
read-only line naming the detected theme (Q3).

The name is part of what you confirm, on purpose: a molecule's tag is derived from its filename, so
renaming it later means touching four files plus the index.

## The model proposes a NAME, never a path

`shortName` comes back as a bare kebab base name (`kpi-card`). Code assembles everything else:

| decided by code | why |
|---|---|
| the `ml-` prefix | library convention, nothing to judge |
| the theme suffix | decision Q2 — the model forgetting it was a whole failure class |
| the destination project | the old flow wrote wherever the model's header said |
| the full `fileReference` | rebuilt from parts, so it is always well-formed |
| the tag | derived from the path (`tagFromFileReference`) |

`normalizeNm2Plan` records every coercion in the trace, so a model that keeps proposing the wrong
thing is visible rather than silently corrected.

The **group folder** is the exception: it is honored when the human edits the reference, because
moving the molecule to another group is a legitimate checkpoint decision. The gate then requires the
new folder to be a known group.

## The layout axes (decision D7 / option (c))

The `.defs.ts` declares which Design System layout axes the molecule candidates for. The DS matcher
treats an omitted axis as a WILDCARD and breaks ties by specificity, then alphabetical order — so an
empty bag is not neutral, it makes the molecule the group's **fallback pick**.

| step | who |
|---|---|
| which axes are offered | **code**, from `designSystemAuraBase.layoutAxes` filtered by the group (case-insensitive — the same group is spelled two ways across the codebase) |
| the value of each axis | the **model**, inside the closed enum, on the requirements call |
| confirming or changing it | **you**, at the checkpoint: one `<select>` per axis, pre-filled, plus an "any (wildcard)" option |
| validating | the **gate**, with `isValidAxisValue` and the group's own axis list |

The 5 groups with no governing axis (`groupEnterNumberInterval`, `groupLocatePosition`,
`groupPlayMedia`, `groupViewChart`, `groupScanCode`) offer no axes at all: the section is not rendered
and `{}` is the correct output — measured as the rule in the 146 real `.defs.ts` files, where the 18
empty ones are ALL in those groups and none is in a governed group.

## Gate (`gate.ts`) — runs TWICE

Once on the model's proposal (retry ≤ 1 with the errors in context), and again on the data the human
confirmed, because the widget lets them edit into a state it cannot fully validate.

| code | when |
|---|---|
| `payload` | the answer is not a `{ type: 'clarification', json }` envelope |
| `name_missing` / `name_prefix` | no name, or a name that lost the `ml-` prefix |
| `theme_suffix` | themed project, name without the suffix (only reachable via a human edit) |
| `reference_shape` | not `_<project>_/l2/molecules/<lowercase group>/<name>.ts` |
| `reference_project` | the reference points at another project |
| `group_unknown` | the folder is not a group in `skills/index.ts` |
| `tag_missing` / `tag_mismatch` | the tag is not the one derived from the path |
| `description` | no description — the contract's Objective is written from it |
| `requirements` | no functional requirement — the Responsibilities come from them |
| `requirement_question` | a requirement phrased as a question would carry the question into the contract |
| `collision` | an artifact already exists for this name; New Molecule never overwrites |
| `axis_unknown` | an axis outside the DS vocabulary — the catalog would drop it with a `console.warn` and the molecule would silently become a wildcard on it |
| `axis_value` | a value outside the axis enum |
| `axis_not_governing` | an axis that does not govern this group (page-wide `density`/`motion` are exempt — they legitimately act as discriminators) |
| `axis_required` | the group has governing axes and none was declared |

## Artifacts

- `l4/agentNewMolecule2/<runKey>/plan.json` — written twice: **provisional** after the gate (so the
  widget rebuilds from disk instead of trusting the mounted payload) and **final** on Confirm, with
  `confirmedAt`.
- `trace-n2-plan-<attempt>.json` — the gate verdict plus the coercions.
- the `n2-done` anchor, titled with the confirmed tag.

**Cancel writes nothing** and fails the step.
