# Enriquecimento UX no L4

## Objetivo

Adicionar ao L4 uma classificação UX explícita para cada workspace.

Hoje o L4 já contém informações úteis:

- `workspaceId`
- `title`
- `actors`
- `kind`
- `entity`
- `operationIds`
- `purpose`
- `bffCalls`
- inputs/outputs das operações

Mas isso ainda é insuficiente para escolher um layout SaaS de qualidade.

## Campo sugerido

Adicionar uma seção `ux` ao workspace ou a um arquivo dedicado.

Exemplo:

```ts
ux: {
  workspaceClass: "entityManagement",
  preferredExperience: "salesforceStyle",
  pagePattern: "recordCatalog",
  density: "comfortable",
  primaryUserGoal: "Gerenciar itens do cardápio com rapidez e segurança",
  primaryEntity: "MenuItem",
  primaryQuery: "listMenuItems",
  primaryCommand: "createMenuItemCmd",
  secondaryCommands: ["updateMenuItemCmd"],
  fieldPriority: {
    list: ["name", "categoryName", "price", "status"],
    formPrimary: ["name", "menuCategoryId", "price", "status"],
    formAdvanced: ["description", "imageUrl", "displayOrder", "requiresStockLink"]
  },
  navigationModel: "list-detail-drawer"
}
```

## Onde armazenar

Opção A — dentro de cada workspace:

```text
l4/cafeFlow/workspaces/menuManagement.defs.ts
```

Vantagem:

- fica junto da definição funcional.

Desvantagem:

- mistura domínio com UX.

Opção B — arquivo dedicado:

```text
l4/cafeFlow/ux/workspaceClassifications.defs.ts
```

Vantagem:

- separa domínio de apresentação;
- permite recalcular UX sem mexer no workspace funcional.

Recomendação inicial:

```text
Opção B
```

## Classificação sugerida para o 102051

| Workspace | UX class | Page pattern | Style sugerido |
|---|---|---|---|
| `menuManagement` | `entityManagement` | `recordCatalog` | `dynamicsStyle` ou `salesforceStyle` |
| `stockManagement` | `inventoryManagement` | `inventoryControl` | `oracleStyle` ou `sapFioriStyle` |
| `posWorkspace` | `operationalWorkbench` | `retailPosWorkbench` | `squarePosStyle` |
| `kitchenWorkspace` | `queueOperations` | `operationsQueueBoard` | `jiraBoardStyle` |
| `shiftWorkspace` | `guidedWorkflow` | `processWizard` | `sapFioriStyle` |
| `dashboardWorkspace` | `analyticsDashboard` | `insightCommandCenter` | `salesforceStyle` ou `powerBiStyle` |

## Papel da LLM de enriquecimento

A LLM dedicada deve receber:

- workspace L4;
- siteMap;
- operações relacionadas;
- lista de templates disponíveis;
- preferências do cliente;
- exemplos de estilos aceitos.

E deve retornar:

- classificação UX;
- template escolhido;
- justificativa;
- prioridade de campos;
- ações primárias/secundárias;
- recomendações de layout;
- anti-patterns para evitar.

