# s4-report — CHANGELOG

- **2026-08-25** — Written. The four obligations (written / ignored-with-reason / index.ts-not-touched /
  not-published) are load-bearing, each tied to a measured defect — see `report.ts`'s file header and
  `flow.json` → decisions `.indexTsScope` (D5's "no publish API exists" finding). A group requesting
  `index.ts` gets an honest "not built yet" line rather than being silently ignored, since `s3` does not
  exist in this build.

- **2026-08-25 (E8)** — Obligation 3 rewritten now that `s3` exists: index.ts status is reported PER
  MATCHED GROUP (`migrated` / `creation-needed` / `migration-failed` / `already-migrated`), read from the
  new `s3-<group>.json` artifacts and `input.json`'s `indexTsMigrationGroups`/`indexTsCreationGroups`.
  `SY_INDEX_TS_HOWTO` was dropped — migration no longer needs to be asked for
  (`flow.json` → `decisions.migrationIsAutomatic`); creation still has no path to "yes" in this build, so
  it stays an honest `creation-needed`, never silence.

- **2026-08-26** — **o run que não gera nada agora RELATA.** Antes, três condições de entrada (sintaxe
  ambígua do `index.ts`, nome de grupo desconhecido, nenhum grupo elegível) davam `throw` no root.
  Medido num run real de Studio: a plataforma **não** tem `try/catch` em volta do `beforePromptImplicit`
  (`executeBeforePromptStream`), então o erro vira rejeição não tratada no console do navegador e **o
  usuário vê uma tela vazia** — a mensagem estava certa e não chegava a ninguém.

  Agora o root carrega o motivo em `input.refusal`, o run é criado assim mesmo e **planta só o s4**: o
  relatório é o único canal que alcança o humano. Dois campos novos: `refusal` e `validGroups` — sem a
  segunda, "não conheço esse grupo" é beco sem saída; com ela, é uma correção que se lê de uma vez.

  Efeito colateral bom: o caminho de `unknown` que este relatório **já tinha construído**, e que o throw
  do root tornava inalcançável, passou a ser exercitado de verdade.

- **2026-08-27 (G4)** — `SyIndexTsStatus` ganha `regenerated` / `regeneration-failed`, lidos de
  `input.json`'s nova `indexTsRegenerationGroups` (`{ canonical, missingMoleculeCount }[]`) contra o
  mesmo `s3-<group>.json` artifact que `created` já usa — o s3 step não diferencia G1 de G4 no artefato,
  a diferença está só no `input.json` do root. **Obrigação nova, não decoração** (todo
  `the G4 decision of 2026-08-27` §3.2): uma página regenerada em silêncio é indistinguível de
  uma página corrompida, então a linha `regenerated` do resumo SEMPRE traz o motivo — `regenerada: N
  molécula(s) do grupo não apareciam na página` — nunca só o status. `agentSyReport.ts`'s artifact-read
  loop também precisou incluir os grupos de `indexTsRegenerationGroups`, não só migration/creation — sem
  isso todo grupo G4 bem-sucedido seria lido como `regeneration-failed` por "não deixou artefato" (o
  artefato existe, só não estava na lista lida).
