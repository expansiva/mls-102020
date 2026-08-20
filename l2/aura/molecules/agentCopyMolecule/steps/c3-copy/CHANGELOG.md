# CHANGELOG — c3-copy

## 2026-08-19 — nasce (Fase 3 do controle)

- **verbatim é a regra**: só header + `copiedFrom` + identidade nos dois caminhos que precisam;
- **gate compara o bloco `collab_i18n` byte a byte** entre fonte e cópia — é o motivo do agente
  existir, e é a checagem que justifica o step ter gate próprio;
- **identidade da casca no achatamento** (achado 7bis do controle): corpo do pai, tag e classe da
  casca; o gate falha se a tag do pai sobrar;
- **fonte do `.defs.ts` por projeto**: da casca quando existe (as 42 do 102055), senão do pai com
  `TagName` trocado (41 das 42 do 102054);
- **renderiza e passa pelo gate TODOS os itens antes de escrever o primeiro byte** — lote que
  falha no meio é meio-estado;
- `.defs.ts` ausente em toda a cadeia é **aviso**, não falha: o contrato não acompanha, a cópia sim.

## 2026-08-20 — a armadilha da tag-prefixo (achada pelo gate.test)

O gate checava a tag do pai com `writtenTs.includes(parentTag)` — e **falhava em toda casca de nome
convencional**, porque a tag da casca TEM a tag do pai como prefixo:
`grouptriggeraction--ml-button-standard` está dentro de `…-brutal`. O mesmo defeito existia nas
substituições (`split/join`), onde teria produzido `…-brutal-brutal`.

Agora toda substituição e toda checagem de tag passa por `cTemplates.replaceTag` /
`cTemplates.containsTag`, que só casam a tag quando ela **não** está colada a mais caracteres de tag
(`(?<![a-z0-9-])TAG(?![a-z0-9-])`). Vale para o `.ts`, o `.less` e o `.html`.

Achado pelo teste de aceite do achatamento, escrito antes de rodar o agente — que é o argumento para
o gate ter teste próprio.
