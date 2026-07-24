# Contrato para geração de page31

## Objetivo

Definir como a geração da `page31` deve usar a classificação UX do L4.

## Regra principal

A `page31` não deve ser gerada apenas a partir de operações.

Ela deve ser gerada a partir de:

```text
L4 workspace funcional
+ UX classification
+ template escolhido
+ style skill
+ design system
= page31
```

## Entrada mínima

```json
{
  "workspaceId": "menuManagement",
  "title": "Gerenciar cardápio",
  "actors": ["gerente"],
  "entity": "MenuItem",
  "bffCalls": [],
  "ux": {
    "workspaceClass": "entityManagement",
    "preferredExperience": "dynamicsStyle",
    "pagePattern": "recordCatalog",
    "density": "comfortable",
    "primaryQuery": "listMenuItems",
    "primaryCommand": "createMenuItemCmd",
    "secondaryCommands": ["updateMenuItemCmd"]
  }
}
```

## Saída esperada

A página gerada deve:

- seguir o template selecionado;
- usar a skill de estilo selecionada;
- preservar contratos BFF;
- preservar estados de loading/error/success;
- tratar validação de campo;
- ser responsiva;
- evitar expor campos técnicos sem necessidade.

## Exemplo `menuManagement`

Para:

```text
pagePattern = recordCatalog
preferredExperience = dynamicsStyle
```

A página deveria ter:

- título `Cardápio`;
- botão primário `Novo item`;
- filtros de status/categoria/busca;
- lista ou tabela de itens;
- preço, categoria e status em destaque;
- drawer para criação/edição;
- ações secundárias no item;
- empty state guiado.

Não deveria:

- mostrar todos os formulários abertos;
- priorizar IDs técnicos;
- colocar ações perigosas sem confirmação;
- mostrar erro 400 genérico.

## Fallback

Se não houver classificação UX:

```text
preferredExperience = genericSaasStyle
pagePattern = inferred from workspace.kind + bffCalls
```

Mas a pipeline deve registrar warning:

```text
UX_CLASSIFICATION_MISSING
```

