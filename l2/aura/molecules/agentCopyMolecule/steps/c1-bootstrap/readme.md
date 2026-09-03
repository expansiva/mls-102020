# c1-bootstrap

Deterministic. No LLM. The admission of the run — and the only step that decides whether the
run happens at all.

## Input

- the mention text, from task memory (`getCInput`) — the root already refused a mention with
  no complete reference;
- `runKey` from its own args (fallback: task memory).

## Output

- `l4/agentCopy/<runKey>/context.json` — the `CopyContext` every later step reads;
- `l4/agentCopy/<runKey>/trace-c1-bootstrap-01.json` — written **also on failure**: it is the
  record of why nothing was copied;
- result step `c1-done` carrying `{ contextFile, runKey, mode, items, collisions }`.

## What it does, in order

1. **parse** the mention into references (`parseCopyRefs`) — every `_<proj>_/l2/molecules/...`
   occurrence, prose ignored;
2. **mode** (`copyModeForRefs`): one molecule = `single`, one group-only ref = `group`,
   anything else = `list`. It matters because **rename is offered only in `single`**;
3. **expand** group references through the stor listing of the ORIGIN project
   (`listGroupMolecules`), excluding `index` and `.test.ts`;
4. **probe** every item: origin `.ts` readable, class name extractable, `.less` present, and
   the inheritance chain (`detectChain`) — for a shell, the parent must be readable and must
   not itself be a shell;
5. **build** the items: destination paths, provenance ref, and the collision record;
6. **gate** the WHOLE list and, if anything is wrong, fail with EVERY error at once.

## Invariants

**Nothing is written into `l2`.** The first molecule byte belongs to c3, after the checkpoint.
A step that writes before the user resolved a collision would make "cancel" a lie.

**Fail-fast on the list, not on the first item** (decision 2). The gate collects issues for
every item and formats them together. "Copiei 10 de 12" in silence is the half-state this
pipeline refuses — partial results exist only when the USER chooses them in c2.

**A collision is not a failure.** It is recorded per item (which files exist, and the
`copiedFrom` of the existing copy when readable) and handed to c2. The criterion is ANY of the
4 destination files existing — the Variant's criterion: a leftover `.less` under a fresh `.ts`
is the worse outcome.

**Depth 1.** Today every base molecule extends `MoleculeAuraElement` directly and every shell
extends a base molecule. A shell of a shell fails readable instead of guessing.
