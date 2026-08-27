# s1-group — CHANGELOG

- **2026-08-25** — Written. Deterministic (no LLM). Format anchored on the 6 groups the
  `agentChooseMolecules` pilot seeded by hand (v2) — regenerating all 6 from their real source files and
  diffing against the seed came back structurally identical; see `spec.md` → "E5 acceptance" at the
  agent root. The scenario harvest (reading a group's CURRENT `index.ts` table on first sync) needed a
  token-set field matcher, not the simpler exact-camelCase match first tried: `groupViewTable`'s table
  uses abbreviated field names (`detailGrid`, `advanced`, plain `data`) that do not mechanically derive
  from a molecule's short name. See `flow.json` → `decisions.scenarioHarvest`.

- **2026-08-25 (E8 prep)** — Two matcher bugs found and fixed while running the D-E3 sweep
  (`the E8a measurement of 2026-08-25` §2) across all 30 real groups with an `index.ts` (the pilot's 6
  seeded groups never exercised them): (1) some groups keep the `ml` prefix in the field name
  (`mlDateIntervalDrag`), most drop it (`addressField`) — the field side now drops a leading `ml` token;
  (2) a letter→digit boundary was not tokenized (`scanCode1d` read as one merged token `code1d` instead
  of `code`+`1d`), and a compound word spelled as ONE word in the filename but split by camelCase in the
  field (`mindMap` vs `ml-view-hierarchy-mindmap`'s `mindmap`) matched neither exactly nor as a superset —
  added a third, unique-substring fallback tier for exactly that case. Before the fixes, the sweep found 7
  of 30 groups with fields that looked "foreign"; after, only 1 (`groupEnterNumber`'s `rangeSlider`,
  genuinely `ml-number-range-slider` from `groupEnterNumberInterval`) — this is the number D-E3 uses.
  Re-verified: all helper tests green, E5's 6-group regeneration still structurally identical.

- **2026-08-26** — ⚠️ **passou a COMPILAR o `index.defs.ts` depois de gravá-lo.** Gravar no stor não
  torna um módulo carregável: o bundler do preview monta a página fazendo `fetch` de cada import, e um
  arquivo só escrito não é servido — a página do grupo falhava com
  `Error get /_102053_/l2/molecules/groupenterdate/index.defs` com o arquivo ali, no editor. Quem publica
  o módulo no cache é a **compilação** (`nmFs.compileStorTs` → `mls.l2.typescript.compileAndPostProcess`),
  que é o que o Studio faz quando um humano salva, e o que todo passo desta família que escreve fonte já
  fazia (n3-defs, n4-render, i3-edit).

  Segundo motivo, de graça: esta é a **única porta de compilação** que este passo determinístico tem. O
  defeito da crase de 26/08 — um `# Objective` com `código` inline fechava o template literal e
  invalidava o arquivo em silêncio — teria sido pego aqui, na geração.

- **2026-08-27 (idioma)** — **o markdown e os comentários dos arquivos GERADOS passaram a ser em inglês.**
  O conteúdo sempre foi inglês (a descrição do grupo vem do `skills/index.ts`, o `# Objective` vem de cada
  molécula); o que estava em português era o **arcabouço** — "Objetivo do grupo", "Como escolher",
  "Cenários (quick reference)", "Moléculas (N)", "Este projeto não tem tema local" — herdado da semeadura
  do piloto, escrita à mão em 19/08. O resultado era um quadro em português em volta de conteúdo em
  inglês, num projeto que é todo em inglês.

  Traduzidos os dois renderizadores (`syRenderDefs`, `syRenderSkill`), markdown e comentários do arquivo
  gerado. ⚠️ **As mensagens do agente ao usuário — resumo do `s4`, avisos, recusas — seguem em português**,
  porque são para quem roda, não para o arquivo. O escopo aqui era só o que o agente ESCREVE.

  Efeito: todo `.defs.ts` e o `skill.ts` diferem do que existe hoje nessas linhas — o próximo sync de cada
  projeto normaliza sozinho.
