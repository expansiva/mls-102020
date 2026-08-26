# s2-project — CHANGELOG

- **2026-08-25** — Written. The group order was first guessed as "skills/index.ts order" (4 of 6 pilot
  groups fit), then re-guessed as "always skills/index.ts order" — both falsified by E5's regeneration
  (the seed lists `groupViewTable` before `groupEnterDate`, the opposite of their `skills/index.ts`
  order). Settled on alphabetical by folder: simple, deterministic, and every OTHER structural property
  of the seed reproduces exactly regardless of order. See `flow.json` → `decisions.groupOrder`.

- **2026-08-26** — ⚠️ **CONSERTO GRAVE: o `skill.ts` era truncado por qualquer run com alvo.** O passo
  montava a lista de grupos a partir de `input.matchedGroups` — só os grupos DAQUELE run — e gravava o
  `skill.ts` inteiro por cima. Medido num run real de Studio (`atualizar grupo groupEnterDate`, projeto
  102053, `s2-project.json` com `groupCount: 1`): **o nível 1 passaria a listar 1 grupo, apagando os
  outros 6 do projeto.**

  É o modo de falha que o piloto do catálogo mediu como fatal: grupo ausente do nível 1 é
  **inalcançável pelo consumidor**, mesmo com o nível 2 perfeito — o funil recusa na porta o que o andar
  de baixo saberia servir.

  **Agora o nível 1 é composto com TODOS os grupos do projeto**, de duas fontes, nesta ordem:
  1. o artefato l4 deste run — o mais fresco, e o único que um grupo recém-gerado tem;
  2. o `index.defs.ts` do próprio grupo — para os que este run não tocou. É a regra "nível 1 deriva do
     nível 2" aplicada aos grupos deixados em paz (`syExtractMoleculeShortTags`).

  Grupo sem nenhuma das duas nunca foi sincronizado: fica **fora do `skill.ts` e é nomeado** no resumo,
  nunca sumindo em silêncio. O resumo diz de onde veio cada grupo (`N deste run, M do index.defs`).
