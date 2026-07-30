# n7-index — CHANGELOG

## 2026-07-29 — created (control item 3.9)

Gate covers 8 codes with 8 tests. Decisions:

- **D5 honored**: the `indexGroupPage` skill is reused in this step; no agent invocation
  (`agentUpdateIndexGroupPage` fans out — lesson P4).
- **`molecule_missing`** checks the OTHER molecules of the group, not just the new one. A showcase that
  silently drops a molecule makes it invisible to whoever browses the library, and the old flow had no
  check at all.
- **`index.html` is deterministic** (`renderGroupIndexHtml`): it is only the group index element, so
  there is nothing for a model to get wrong.
- The molecule list comes from a stor scan, filtering out `index`, `.defs` companions and `.test`
  files — the `.defs` filter matters because those share the `.ts` extension.
- **Never blocks**: a second failure emits `n7-done` with `ok:false`.
