# i3-edit

One LLM call (`code`). Routes B and C. **The only step that writes into the molecule.**

## Input

- `context.json`, `triage.json` (and `inherit.json` on route C)
- the current content of the editable artifacts, verbatim

Editable here: `defs`, `ts`, `less`. The playground belongs to i5 and the group index to i6. The
`.ts` is always shown even when it is not being edited — it is what the `.less` styles and what the
`.defs.ts` describes.

## Output

- the edited files, written to the molecule
- `l4/agentImproveMolecule2/<runKey>/edit.json`
- result step `i3-done` carrying `{ touched[], why[] }` — i5 reads `touched` to decide whether the
  playground is affected.

## Edits, not rewritten files

The model returns operations — `replace` (quoting the exact current text), `append`, `create` — and
code applies them. `agentNewMolecule2` returns whole files because it is *creating*; here the file
already works, and rewriting 300 lines to change a padding puts every untouched line at risk.

Three invariants come free from the format. They are not checked, they are unreachable:

1. **read before write** — a `replace` must quote text that is really there;
2. **untouched bytes stay untouched**, the `/// <mls …>` header included;
3. **no file outside this project** — an op names an artifact *kind*, and the kind resolves to a
   path this agent owns. On a shell, that is what protects the parent.

A `find` that matches twice is **rejected**, never applied to the first hit: ambiguity means the
model meant one place and code would pick another.

## The delta rule

The appearance detectors are the same ones `n4-render` uses, but n4-render judges a file it just
created, where every finding is its own. Here the file predates the run, so **every detector runs
twice, before and after, and only what the edit added is an error**. The same goes for the
compiler: two compiles per touched file is the price of not refusing to fix a padding in a molecule
that already has an error.

## Rollback

A rejected attempt is **rolled back**. This is a deliberate difference from `agentNewMolecule2`,
where a failed attempt stays on disk so the retry can see its own broken output — there the file is
new and there is nothing to lose. Here the molecule already works, and a run that fails twice must
not hand back something worse than it found. The retry loses nothing: it gets the gate errors, and
the prompt shows the original files, which is the state its `find` strings must match.

## Failure modes

Retry 1 with the gate errors; a 2nd failure fails the step, molecule untouched.

| code | means |
|---|---|
| `edit N (…)` | an apply error: `find` missing, ambiguous, or an op that contradicts the file's existence |
| `foreign_write` / `parent_write` | the hard invariant — asserted even though the format makes it unreachable |
| `header` | the mls header changed or a created file lacks one |
| `appearance_class` / `appearance_style` | the edit introduced a hardcoded colour |
| `render_side_effect`, `helper_outside_class`, `base_internals`, `selector_duplicate` | traps the library has actually shipped |
| `compile` | an error the edit added |

## Tests

`applyEdits.test.ts` (12) and `gate.test.ts` (14), both pure. The two that carry the design are
"a `find` that matches twice is REJECTED" and "a colour the file ALREADY hardcoded does not block
an unrelated fix".
