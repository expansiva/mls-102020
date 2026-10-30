# agentEditPage

Changes ONE generated page as a person asks, in words: "centralize os botões", "destaque o total", "esconda o
histórico". Task: `tasks/approval/TASK-102020-agent-edit-page.md` (mls-base).

## What it does

1. **Plan** (`agentEditPageGate`, reasoning). Reads the page defs (intent, organisms), an outline of the page `.ts`
   (methods, the organisms each wraps, texts, molecules), the shared declaration (`web/shared/<page>Dts.txt`) and the
   user edits already in the defs `history`. Refuses what the page file alone cannot do with what the shared offers
   (new data, state, rule, backend, navigation, a molecule the page does not import). Otherwise returns operations:
   `{ organism | null, aspect, change, summary, revert }`. Nothing is written.
2. **Apply** (`agentEditPagePatch`, code), with the operations the person approved. The model returns the complete
   methods it changed and new catalogue keys; `editPageCore.applyPagePatch` checks and splices them; the page is
   written like a Studio edit (model + local copy) and compiled. One repair; a failure puts the file back.
3. **Record.** Each operation becomes a `request` entry of the defs `history` (`helpers/defsHistory`): organism +
   aspect is the key, the last one wins, a revert removes it. agentMaterializeL2 (pages50) redoes those entries when
   the page is regenerated ("Refazer página"). One trace JSON per run in `<module>/pipeline/agentEditPage/`.

## The selected element (TASK-102020-agent-edit-page-selection)

The panel sends the element selected in the Studio (`aura.edit.selection`) as `element`, only when it belongs to the
page and device being edited. The agent locates it with the class picker's own resolution
(`studioClassEdit.resolveStructuralAnchor`): its markup and the method holding it go to both prompts, and the patch
may touch only that method for operations on the element's organism. When the element is (or sits inside) a catalog
molecule, the molecule's `skill` and its group's usage contract go too. A molecule may change its APPEARANCE only
(class/data-class on the tag and on its slots, configuration attributes such as size/data-variant); its BEHAVIOR is
refused by the plan step, and the patch guard keeps every `@event`/`.property`/`?attribute` binding of it.

## What a patch may not do (`editPageCore`)

Touch a method outside the approved organisms (a new `render*` helper is fine); change imports, header, tag, class,
`msg`, the first line of render() or the catalogue shape; gain state, assignments, `await`, network, timers or
storage; use a hex color, a palette class, `dark:` or a token the design system does not have; drop a
`data-organism-id` wrapper; add a key that exists or is not a camelCase identifier. A rule counts only what the
patch ADDS: what the method already did is not held against it. Everything else is the compiler's job.

## Files

| file | role |
|---|---|
| `agentEditPage.ts` | root: deterministic bootstrap, adds the gate (plan) or the patch (apply) step |
| `agentEditPageGate.ts` | plan step |
| `agentEditPagePatch.ts` | apply step |
| `editPageCore.ts` (+ test) | pure: entry, operations, scanner, outline, catalogue, splice, guards |
| `editPagePrompts.ts` | prompts and strict tools |
| `editPageIo.ts` | Studio I/O: model + local copy, compile, history door, trace |
| `editPageIntents.ts` | collab-messages intents of this folder |

The Studio panel is in `aura/plugins/selectPage.ts` (page detail, "Editar página").
