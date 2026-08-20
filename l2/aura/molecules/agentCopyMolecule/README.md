# agentCopyMolecule

Copia o **código real** de uma molécula de um projeto de dependência (tipicamente o
`mls-102040`, `mls-102054` ou `mls-102055`) para o **projeto atual**, para o cliente
fazer o i18n — e o que mais quiser — na cópia. É o veículo da decisão de reunião de
2026-08-18: as bases ficam só em inglês, a tradução mora na cópia.

A cópia **mantém o nome e a tag da origem** e sombreia a base na resolução da tag
(`resolveNewTag` procura no projeto atual antes das dependências). Nunca é uma casca: se
a origem for casca, a cópia é **achatada** (corpo do pai, identidade da casca).

## Uso

```
@@agentCopyMolecule copie o componente _102040_/l2/molecules/groupviewtable/ml-inline-edit-table

@@agentCopyMolecule copie os componentes do grupo _102040_/l2/molecules/groupviewtable

@@agentCopyMolecule copie os componentes abaixo:
_102040_/l2/molecules/groupviewtable/ml-inline-edit-table
_102040_/l2/molecules/groupviewchart/ml-bar-chart
_102040_/l2/molecules/groupenterboolean/ml-boolean-segmented
```

Uma molécula, um grupo inteiro (referência sem o nome da molécula) ou uma lista. Serve
pelo **preview** (payload `{ fullName, page, prompt }`, como o `agentNewMoleculeVariant`)
e em **prosa** no collab-messages (como o `agentImproveMolecule2`). A prosa em volta das
referências vira observação; menção sem nenhuma referência completa falha legível.

Destino = `mls.actualProject`. A origem precisa ser dependência declarada do destino.

## O que sai

4 arquivos por molécula, em `l2/molecules/<grupo>/`: `.ts`, `.defs.ts`, `.less`, `.html`
— cópias **verbatim**, com o header trocado e uma linha `copiedFrom` de proveniência. O
`.test.ts` não acompanha, e **nenhum `index.ts` é gerado ou atualizado** (para a página
showcase do grupo, rode o `agentUpdateIndexGroupPage`).

Depois da cópia, o `pt` vai no bloco `collab_i18n` do `.ts` copiado — o summary aponta
onde.

## Spec

- `flow.json` — contrato máquina (spec-first: mudanças alteram o spec ANTES do código).
- `spec.md` — racional humana. Com o `flow.json` e os `CHANGELOG.md` dos steps, é o
  registro do desenho.
- `steps/<slug>/CHANGELOG.md` — por que cada step é assim, com as decisões datadas.

Não há documento externo a procurar: o registro do desenho é o que está publicado aqui.

## Pipeline

root (rootPlan `classifier`: idioma + títulos + runKey) → `c1-bootstrap` (sem LLM) →
`c2-clarify` (checkpoint; sem colisão, auto-completa) → `c3-copy` (sem LLM) →
`c4-less` (sem LLM) → `c5-demo` (sem LLM, não bloqueia) → `c6-summary` (`general`).

**Zero LLM de geração**: a única chamada de julgamento é o summary. Steps
determinísticos não têm retry — falham legível na hora. Âncoras `cN-done`;
contexto/trace em `l4/agentCopy/<runKey>/` no projeto de destino.

## Colisão

Se a molécula já existe no destino, o `c2` pergunta:

- **uma molécula**: substituir (descarta as alterações locais, **inclusive traduções**) /
  cancelar / renomear;
- **lote** (grupo ou lista): substituir todos / **ignorar já existentes** / cancelar a
  operação. Renomear existe só no modo de uma molécula.

Cancelar não escreve nada.

## Estrutura

- `steps/<slug>/` — agente do step + gate + `gate.test.ts` + readme + CHANGELOG
  (`prompt.md` só no `c6-summary`).
- `helpers/` — `cFs` (stor/paths), `cOrigin` (parse das refs + cadeia de casca),
  `cTemplates` (header, `copiedFrom`, troca de identidade), `cContext` (contrato do
  artefato), `cSteps` (intents/âncoras). **Próprios**: nada foi promovido a `shared/`, e o
  `agentNewMoleculeVariant` não é tocado.
- De `shared/` consome: `mentionEntry`, `widgetDecisionClarification`(+`Logic`),
  `llmTool`.

## Testes

Gates são puros — `node --test` nos `gate.test.ts` dos steps.
