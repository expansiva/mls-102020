# n4-render

Writes the molecule `.ts` and compiles it. This is the step that decides whether the molecule can
ever be themed.

## Two things it does differently from the old chain

1. **The mls header is prepended by code.** The old flow parsed the model's first line to decide
   where to save the file, so a hallucinated project wrote to the wrong path (lesson M2).
2. **The compile fix loop lives here, bounded at one retry** — not in a separate `Fix` agent whose
   attempt counter lived in `longTermMemory` as a string and vanished when the task was recreated.
   The retry receives the real `compilerResults.errors` **and** the `prodDTS` of the molecule's own
   imports, which is what the old Fix agent assembled: prose about a type error is not the same as
   the signature.

A second failure **fails the step**. Generating a stylesheet and a demo for a molecule that does not
compile is worse than stopping.

The file is written to disk BEFORE the gate runs, because compiling requires a model — a failed
attempt leaves that content in place for the retry to read.

## Gate (`gate.ts`) — 12 codes, 17 tests

| code | when |
|---|---|
| `empty` / `fence` | nothing came back, or a markdown fence |
| `header` | not exactly one mls header, or one not referencing this destination |
| `tag_missing` / `tag_mismatch` | no `@customElement`, or a tag that is not the derived one |
| `base_extends` / `base_import` | does not extend / import `MoleculeAuraElement` from mls-102033 |
| `discipline` | **no `ml-*` semantic class** — the molecule could never be themed |
| `appearance_class` | a hardcoded Tailwind colour |
| `appearance_style` | inline `style` setting appearance with a LITERAL value |
| `compile` | one issue per `compilerResults.errors` entry |

## The appearance rules are MEASURED, not asserted

Running the three detectors over the **147 real `ml-*.ts` molecules of mls-102040** (2026-07-29):

| detector | molecules it would fail | conclusion |
|---|---|---|
| `discipline` | 0 / 147 | every validated molecule emits `ml-*` classes — this IS the library's discipline |
| `appearance_style` | 0 / 147 | inline `style` appears in 28 of them and is geometry (`width`, `left/top`, `transform`, `padding`, `flex`) or data-driven; the ban is property-level and literal-only |
| `appearance_class` | 5 / 147 | `text-white` ×2, `border-white`, `bg-black`, `bg-black/70` — rejected on purpose: `bg-black/70` on a media overlay stays black in a light theme |

Consequences of measuring first:

- **`style=` is not banned.** Banning it would have banned a pattern 19% of the library uses. Only
  appearance PROPERTIES with LITERAL values are rejected, so `background-color:${item.color}` — the
  one data-driven colour in the library — stays legal.
- **Hex is not banned outright.** All five molecules carrying hex are charts keeping a `palette`
  data array. Hex is only rejected where it styles markup.

## A bug the tests caught in the detector itself

`collectMlClasses` originally matched `ml-<name>` inside the file's own path
(`.../ml-kpi-card.ts`) and inside its own tag (`group--ml-kpi-card`) — so a molecule emitting **no**
semantic class still had two "matches" and the `discipline` check **could never fail**. The library
calibration reported 0/147 failures, which looked like confirmation but was the bug. A lookbehind
(`(?<![\w/-])`) fixed it; the test that pins it removes the classes and asserts the failure.

## Artifacts

- `l2/molecules/<group>/<name>.ts`
- `trace-n4-render-<attempt>.json`, carrying the `ml-*` inventory found
- the `n4-done` anchor, whose result publishes that inventory for `n5-less`
