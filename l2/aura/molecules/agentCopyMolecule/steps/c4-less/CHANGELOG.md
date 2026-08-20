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

## 2026-08-20 — seletor raiz composto das moléculas PORTAL (falha T5 no Studio)

O gate rejeitou uma cópia correta do `ml-datetime-picker` com `less_scope`. Motivo: uma molécula
portal escopa a si mesma DUAS vezes na mesma regra —

```less
groupenterdatetime--ml-datetime-picker,
div[data-widget="groupenterdatetime--ml-datetime-picker"] { … }
```

— e o `extractLessRootSelectors` devolvia o texto inteiro como **um** seletor, que nunca é igual à tag.
Teria rejeitado **toda** molécula portal da base.

Corrigido no helper (separa as partes da vírgula) mais um `isTagScopedSelector` que reconhece as duas
formas legítimas de escopo: a tag (com pseudo/classe/descendente) e `div[data-widget="<tag>"]`. O
`replaceTag` já cuidava do renomear nas duas formas, porque a tag entre aspas tem fronteira.

## 2026-08-20 (2ª) — folha sem regras + o step deixa de bloquear (falha no Studio, grupo de 12)

Copiar o grupo `groupviewtable` inteiro morreu em `less_scope` no `ml-data-table`, com
"encontrados: (nenhum)". Motivo: o `.less` dessa molécula tem **só o header** — ela não tem aparência
própria. É **1 de 154** na base, e o gate tratava isso como erro de escopo. A cópia estava correta.

Duas correções, e a segunda é a que importa mais:

1. **folha sem regras é estado legítimo**: sem seletor raiz não há escopo a conferir. O gate emite
   `less_no_rules` (informativo, na lista `C_LESS_NON_BLOCKING`) e não reclama de escopo;
2. **o step passou a ser POR ITEM e não bloqueia** — padrão do `c5-demo`. O que ensinou isso foi o
   estado que o run deixou: o `c3` já havia escrito **24 arquivos** (12 moléculas × `.ts` + `.defs`)
   quando o `c4` falhou por causa de UMA folha, e não escreveu nenhuma — 12 moléculas ficaram sem
   estilo. Falhar aqui não desfaz o `c3`; só enterra a molécula meio-copiada. Agora item ruim é
   reportado e pulado, os bons são escritos, e a âncora leva `ok:false` para o summary contar a
   verdade.

Consequência de desenho, registrada de propósito: **o fail-fast do pipeline é por step, não
transacional entre steps.** Os steps que decidem se a molécula existe (c1, c3) falham cedo e sem
escrever; os que completam uma molécula já escrita (c4, c5) reportam em vez de bloquear.
