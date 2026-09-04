# s3-indexts — CHANGELOG

- **2026-09-04 (`contract_not_demonstrated`)** — measured on a real run: the showcase generated for
  `grouptriggeraction` shipped 6 instances of the button group and ZERO `data-variant` — the property the
  group's usage skill calls "the only way to change how the button looks". The mold
  (`skills/indexGroupPage.ts`) hands the model a closed, complete-looking tag and never mentions that a
  second layer (the usage skill's `Properties`/`Events` tables) exists on top of it, so the model never
  reaches for it.

  The gate now reproves a page that uses **zero** contract items beyond the mold's own envelope
  (`name`/`value`/`isEditing`/`@change`). Detection lives in `shared/usageContract.ts`, shared with
  `agentNewMolecule2`'s `n7-index` and `agentNewMoleculeVariant`'s `v4-index` — the three import the same
  mold and must not diverge on what counts as coverage. Measured across the 31 group `index.ts` files of
  the library: 28 pass, 3 reprove (`groupviewtable`, `groupenterboolean`, `groupnavigatesection` — the
  last two mostly document the envelope itself, so they are a known, accepted floor). An empty or degraded
  usage skill never reproves.

- **2026-08-27 (G4)** — Third trigger added: **regenerate** an existing, already-migrated `index.ts`
  whose `renderShowcaseCards()` (still static Lit code) doesn't show every molecule of the group —
  measured on `mls-102053`'s `groupViewHierarchy` (`the G4 decision of 2026-08-27`). Runs the
  SAME create-mode code path as G1 (one LLM call, gate, retry) — no new authoring logic — with
  `regenerationMissingCount` carried through the step args for the trace/report wording only.
  ⚠️ **The mode is now decided by the root and passed explicitly** (`mode: 'migrate' | 'create'` in the
  step's prompt), replacing the old `nmFileExists`-based inference: that inference was exactly right for
  G1/G3 but exactly wrong for G4 (file exists AND is migrated, so it would have picked a no-op
  migration). This also retires the narrower `retryAttempt`-presence workaround the same file used for
  the analogous E8b retry-routing bug — with mode always explicit, `nmFileExists` is no longer consulted
  anywhere in `beforePromptStep`'s routing. `createGate.ts`'s `molecule_not_shown` detector was extracted
  into `helpers/syMigrateIndexTs.syMoleculesNotShown` so the gate and the new G4 trigger share one
  implementation (the brief §4). See `flow.json`'s `decisions.g4Regeneration_*` and `spec.md`'s "G4" section.

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
  pure unit tests for the gate and the anti-invention scenario resolver. ⚠️ **Strong acceptance (the brief §7
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
  Strong acceptance (the brief §3): migrated the real `groupEnterDate` and `groupViewTable` `index.ts` files,
  diffed the result by hand (braces balanced, hero/cards/render() untouched), then compiled the migrated
  files against real, regenerated `index.defs.ts` content and the real shared module with a scoped `tsc`
  — clean, zero errors, confirming the `mls-102040` → `mls-102020` import resolves at the type level
  (D-E1's named risk). E8b (creating `index.ts` from scratch for the 2 groups with none) is not built —
  the brief explicitly allows stopping here.

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

- **2026-08-27 (proveniência)** — **os nomes de arquivo de controle saíram de tudo que é publicado.**
  O invariante `shared/localDocRefs.test.ts` só reprova o **caminho** (`todo/…`), então citar o arquivo
  pelo nome passava — mas é a mesma coisa que ele existe para impedir: um ponteiro para documento que
  **ninguém que receba o projeto pelo Studio tem**. As razões sempre estiveram escritas por extenso ao
  lado, que é o que importa; o nome era redundância que parecia um caminho.

  Varridos 76 ocorrências em 24 arquivos (código, `flow.json`, `spec.md`, readmes, CHANGELOGs e testes),
  incluindo duas herdadas do `agentChooseMolecules`. Passaram a ser marcas de proveniência datadas —
  "(decision of 2026-08-27)", "the E8a measurement of 2026-08-25", "the Studio battery" — que é a forma
  que o próprio invariante declara aceitável: uma etiqueta ao lado da frase que enuncia a decisão.
