# n4-render — CHANGELOG

## 2026-07-29 — created (control item 3.6)

Gate covers 12 codes with 17 tests. The appearance rules were **measured over the 147 real
`ml-*.ts` molecules of mls-102040** before being written, not asserted:

| detector | fails | why that is the right calibration |
|---|---|---|
| `discipline` (no `ml-*` class) | 0 / 147 | it IS the library's discipline |
| `appearance_style` | 0 / 147 | `style=` appears in 28 molecules, always geometry or data-driven |
| `appearance_class` | 5 / 147 | `text-white` ×2, `border-white`, `bg-black`, `bg-black/70` — genuinely unthemeable spots |

What measuring changed versus what `flow.json` originally said ("no inline style with
color/background/border/shadow, no hex/rgb literal in the markup"):

- **`style=` is NOT banned** — 28 of 147 molecules use it for geometry. The ban became
  property-level AND literal-only, so `background-color:${item.color}` (the one data-driven colour in
  the library) stays legal.
- **hex is NOT banned outright** — all 5 molecules carrying hex are charts keeping a `palette` data
  array. Hex is rejected only where it styles markup.

**A bug the tests caught in my own detector:** `collectMlClasses` matched `ml-<name>` inside the
file's own path and inside its own tag, so the `discipline` check could never fail — a molecule with
zero semantic classes still had two "matches". The library calibration said 0/147, which read like
confirmation but was the bug. Fixed with a lookbehind `(?<![\w/-])`; the pinning test strips the
classes and asserts the failure, and the calibration was re-run afterwards (still 0/147, this time
for the right reason).

Other decisions:

- The file is written to disk BEFORE the gate, because compiling needs a model; a failed attempt
  leaves the content for the retry to read.
- The retry context carries `compilerResults.errors` **plus** the `prodDTS` of the molecule's `./`
  imports — the same assembly the old `agentNewMoleculeFix` did.
- A second failure fails the step, so `n5-less` and `n6-demo` never run against a molecule that does
  not compile.
