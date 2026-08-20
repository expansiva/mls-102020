# CHANGELOG — c4-less

## 2026-08-19 — nasce (Fase 3 do controle)

- **sem LLM**, ao contrário do `v3-less` do Variant: a aparência não muda numa cópia, então a
  folha é cópia verbatim com header trocado;
- **fonte sempre a folha da molécula pedida** — na casca, a folha DA CASCA (a aparência escolhida
  pelo cliente); pegar a do pai desfaria o tema. O gate checa;
- **re-escopo só no renomear**, com o gate falhando se a tag antiga sobrar;
- o gate confere que o seletor raiz é a tag da cópia — é a única coisa que pode sair errada numa
  cópia de folha, e sai justamente no caminho renomeado.

## 2026-08-20 — `containsTag` no lugar de `includes`

A checagem de "tag antiga sobrou" tinha a armadilha da tag-prefixo (ver o CHANGELOG do c3): uma
folha renomeada para `ml-x-app` contém `ml-x`. Agora usa `cTemplates.containsTag`.
