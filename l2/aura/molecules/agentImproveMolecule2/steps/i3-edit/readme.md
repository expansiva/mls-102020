# i3-edit

One LLM call (`code`). Routes B and C. **The only step that writes into the molecule.**

## Input

- `context.json`, `triage.json` (and `inherit.json` on route C, `definition.json` on route A)
- the current content of the editable artifacts, verbatim
- the group's **creation** and **usage** contracts — read, never written

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
| `dead_member` | on a shell: the edit declared or assigned a member the parent does not have and nobody reads |
| `definition_changed` | on routes B and C: the edit adds a public slot/property/event the GROUP contract does not declare — that is route A, through the checkpoint |
| `definition_removed` | on routes B and C: the edit removes one. Removal is never a repair |
| `compile` | an error the edit added |

## The group contracts are the authority on the surface

Both are injected: **creation** (how a molecule of this group is built) and **usage** (what the group
offers a consumer). The step reads them and can never change them — altering a group contract is manual
work in `mls-102020`, because it defines the public surface of every molecule in the group.

Two rules come from them, and they are the difference between a repair and a mess: **the names come from
the contract**, case-sensitive — `Label` the slot is not `label` the property; and **what the group
declares and the molecule does not implement is a DEFECT**, which is ordinary work here.

⚠️ This restores what the previous flow did — `agentImproveMoleculeMaterialize` injected the group's
creation skill. IM2 inherited the references and stopped injecting the content; the measured cost is in
the CHANGELOG for 2026-08-17.

## On a shell, the parent is always shown

The parent's source is printed read-only on every shell — route B included — together with the list of
members the shell cannot reach. Until 2026-08-14 it arrived only with the route-C choice `override`,
while the prompt still asked for "a local override of a parent member": the step was ordered to override
a parent it could not see, and wrote a member that does not exist. `dead_member` is the code half of
that fix, and the CHANGELOG entry has the measurement.

The one shell where the parent stays hidden is the choice `less` — that decision is about the
stylesheet, and the `.ts` is not offered to `applyEdits` at all.

## Tests

`applyEdits.test.ts` (25) and `gate.test.ts` (24), both pure. The four that carry the design are
"a `find` that matches twice is REJECTED", "a colour the file ALREADY hardcoded does not block
an unrelated fix", "THE 13/08 DEFECT: um bloco que chega rente à margem é alinhado à âncora" and
"assigning a dead member is refused too — it is what the SECOND run did". A fifth pins the boundary
that makes the definition check usable at all: "DECLARING a slot the group already requires PASSES —
that is the defect fix".

**Indentation is the file's, not the model's** (CHANGELOG 2026-08-13). `alignReplacement` places the
written block at the depth of the text it replaces and shifts the rest of the block by the same amount.
It is idempotent for well-formed content, preserves relative structure without inventing it, and leaves
mid-line matches alone.
