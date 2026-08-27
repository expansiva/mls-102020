# s3-indexts — CHANGELOG

- **2026-08-27 (E8b)** — Second mode added to the SAME step/agent: creating `index.ts` from scratch for a
  G1 group (no page at all — the normal case for a project that received molecules by copy, e.g. 7/7
  groups in `mls-102053`). The ONLY LLM call in this agent: one tool-call turn per group, same shape as
  `agentNewMolecule2/n7-index` (`prompt_ready` + strict schema + `afterPromptStep` + gate + retry up to
  `NM_MAX_ATTEMPTS`). The system prompt reuses `skills/indexGroupPage.ts` verbatim plus an appended
  OVERRIDE section — never a forked copy — so the page is born already delegating its reference table to
  `renderCatalogReferenceTable`, enforced structurally by `createGate.ts` (a hand-written `<table>`,
  `headers.map(`, or `rows` array fails the gate and retries). The model's scenarios come back as DATA
  (`{ scenario, recommended: string[] }`, short molecule names) and are resolved against the group's own
  molecule list — an invented name is dropped, never guessed (`helpers/syCreateIndexTs.ts`) — then written
  into the group's `index.defs.ts` by re-rendering the WHOLE file via `syRenderIndexDefs` (the same
  renderer `s1` uses), never a text edit. See `flow.json`'s `decisions.e8bCreation_*` and `spec.md`'s
  "E8b" section for the full record. Verified without an LLM: scoped `tsc` clean across both projects,
  pure unit tests for the gate and the anti-invention scenario resolver. ⚠️ **Strong acceptance (todo §7
  step 4, creating `groupEnterDateTime`'s real `index.ts` in `mls-102040`) is PENDING a Studio run** — the
  first time this agent calls an LLM at all, unexercised by any of the above. One routing bug was found
  and fixed by code review before any run: a failed attempt's speculatively-written `index.ts` made the
  retry misroute into migration mode via `nmFileExists` — fixed by keying the mode decision off
  `retryAttempt` presence, not file existence alone, once a retry is in flight.

- **2026-08-25 (E8a)** — Written. Deterministic (no LLM) migration of an existing `index.ts`'s
  `renderReferenceTable()` to a 3-line call into the new `shared/indexReferenceTable.ts`. Four decisions
  closed with the product owner before coding (D-E1 module location, D-E2/D-E2b color and column order,
  D-E3 cross-group columns, D-E4 title normalization) — see `flow.json`'s `decisions.s3Migration_*` at
  the agent root, and `spec.md`'s "E8" section for the full record, including two matcher bugs found and
  fixed while measuring D-E3 (7 of 30 groups looked "foreign" before the fixes, 1 after — a real,
  genuine cross-group reference, `groupEnterNumber`'s "Range Slider").
  Strong acceptance (todo §3): migrated the real `groupEnterDate` and `groupViewTable` `index.ts` files,
  diffed the result by hand (braces balanced, hero/cards/render() untouched), then compiled the migrated
  files against real, regenerated `index.defs.ts` content and the real shared module with a scoped `tsc`
  — clean, zero errors, confirming the `mls-102040` → `mls-102020` import resolves at the type level
  (D-E1's named risk). E8b (creating `index.ts` from scratch for the 2 groups with none) is not built —
  the todo explicitly allows stopping here.

- **2026-08-27 (auditoria)** — ⚠️ **o gate passava o defeito que existe para pegar.** O check de molécula
  era `content.includes(shortName)`, e **a linha de import sozinha já satisfazia**. Medido contra fixture:
  uma página que importava uma molécula e **nunca a instanciava** voltava com **zero issues** — que é o
  defeito de 2026-08-05 verbatim (playground corrigido, área de detalhe vazia na página do grupo,
  descoberto por acaso dias depois). Import duplicado também passava.

  **Separado em três checks:** `molecule_missing` (não importada), `molecule_imported_twice` (importada
  mais de uma vez) e `molecule_not_shown` (importada e sem instância). A instância é procurada **fora das
  linhas de import**, como `<grupo--shortName`, e o import é casado pelo **fim do caminho** — sem isso o
  import de `ml-data-table` contaria pelo de `ml-data-table-select`, e o `groupViewTable` tem exatamente
  esse par.

  ⚠️ **A fixture `GOOD` do teste também estava errada:** instanciava `<ml-datetime-picker>`, sem o prefixo
  do grupo, que não é a forma que as páginas reais usam (`<groupentertext--ml-address-field>`). Corrigida
  — o teste validava uma forma que não ocorre.

  O `groupFolder` entrou nas opções do gate porque a instância só pode ser procurada com o prefixo real.
