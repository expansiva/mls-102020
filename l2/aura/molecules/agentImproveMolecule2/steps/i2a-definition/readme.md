# i2a-definition

One `reasoning` call plus a human checkpoint. **Route A only.** Writes no file of the molecule.

## What it is for

**The only screen in this agent where a promise changes.** Every other route repairs or restyles
something the molecule already said it does; route A moves the public surface — the slots, properties
and events that existing pages are written against.

The model proposes the delta, the human confirms it line by line, and `i3-edit` is instructed by what
was confirmed.

## Input / Output

- `context.json`, `triage.json`
- `l4/agentImproveMolecule2/<runKey>/definition-proposal.json` (the model's proposal)
- `l4/agentImproveMolecule2/<runKey>/definition.json` (what the human confirmed)
- result step `i2a-done` carrying `{ changes }` — `i3-edit` renders it as an instruction

## Route A is an EDIT, not a rebuild

The step was specced as a handoff to `agentNewMolecule2` from `n2-plan` onward, and that is what
blocked the route from 2026-08-06: **NM2 refuses to overwrite an existing molecule, and route A acts
on one by definition**. It also meant `n3-defs`, `n4-render` and `n5-less` regenerating a contract
that was approved and an implementation that works — to add one slot.

Editing in place removes both problems and reuses steps that already existed:

| step | what it does on route A | was it new? |
|---|---|---|
| `i2a-definition` | the human confirms the delta | **yes, this step** |
| `i3-edit` | writes the `.defs.ts` and the `.ts` together | no — `defs` was in `EDITABLE` since 06/08 |
| `i5-playground` | regenerates the playground, because the surface moved | no — **never reached before** |
| `i6-index` | follows the playground | no — **never reached before** |

The collision gate never comes up, because nothing hands anything to NM2.

## Why the route was worth building

`i5` and `i6` decide their branch by **measuring** the surface before and after the edit. Every
movement of the surface is route A, so until this step existed both were structurally stuck in their
no-op branch — half the pipeline, and the agent's central promise (playground and index following the
molecule), with no end-to-end verification.

That was a deduction until 2026-08-14, when it was measured: a sweep of the 154 base molecules found
**no** case where a route B fix would move the surface — no contract-promised event, slot or property
missing from the code. The 14 candidates the scan surfaced were all negative clauses ("producing no
events", "does not declare the Detail content area").

## The checkpoint is a list, not a yes/no

A request often implies more than the person meant — "add a footer" can come back as a slot plus an
event plus an alignment property. Each line can be dropped on its own; dropping all of them disables
Confirm, because that is a cancellation and not a confirmation.

`remove` and `rename` are styled apart from `add`: an addition is safe for every page already written,
and the other two break whoever already wrote one. The widget says which is which before the click.

## The gate, and why it can check more than the routing gates

A definition change is a movement of the **measured** surface, so most of it is decidable rather than
judgement:

| code | means |
|---|---|
| `no_change` | nothing named — the message says this is a route B edit |
| `kind_invalid` / `op_invalid` | not one of slot/property/event, or of add/remove/rename |
| `already_exists` | ADDING something the molecule already declares — if it exists and does not work, that is a defect, and defects are route B |
| `not_declared` | REMOVING or RENAMING something it does not declare; the message lists what it has |
| `previous_missing` / `rename_noop` / `previous_off_op` | the rename is malformed |
| `purpose_missing` | the human reads it and `i3-edit` writes the contract from it |
| `duplicate` | the same element named twice |
| `reason_missing` | the model's proposal arrives pre-selected and must say why |

It runs **twice**: on the model's proposal before the widget mounts, and on what the human confirmed —
because they dropped lines, so the two are not the same answer.

## Tests

`gate.test.ts` (11) and `widgetDefinitionChoiceLogic.test.ts` (7), both pure, no DOM. The two that
carry the design are "ADDING something that already exists is refused — and named as a defect, not a
definition change" and "dropping EVERY line is a cancellation, not a confirmation".
