# Critérios de aceite

## Para o CollabUX

Uma geração UX é considerada aceitável quando:

- o workspace tem classificação UX explícita;
- a página usa um template reconhecido;
- a página usa uma skill de estilo;
- ações primárias estão claras;
- ações secundárias não disputam atenção;
- campos técnicos não dominam a tela;
- validações aparecem perto dos campos;
- loading/empty/error/success estão definidos;
- a página é responsiva;
- a tela parece produto SaaS, não formulário técnico gerado.

## Para L4

Cada workspace deve ter:

```ts
ux: {
  workspaceClass: string;
  pagePattern: string;
  preferredExperience: string;
  density: string;
  primaryUserGoal: string;
  primaryEntity: string;
  primaryQuery?: string;
  primaryCommand?: string;
  secondaryCommands?: string[];
  fieldPriority?: {
    list?: string[];
    formPrimary?: string[];
    formAdvanced?: string[];
  };
}
```

## Para page31

A `page31` deve demonstrar melhoria clara sobre a página anterior:

- menos aparência técnica;
- melhor hierarquia;
- fluxo principal evidente;
- menos campos desnecessários na primeira dobra;
- melhor tratamento de erros;
- experiência familiar ao estilo selecionado.

## Para o 102051

Primeiros candidatos para validação:

```text
menuManagement -> recordCatalog + dynamicsStyle/salesforceStyle
stockManagement -> inventoryControl + oracleStyle/sapFioriStyle
posWorkspace -> retailPosWorkbench + squarePosStyle
kitchenWorkspace -> operationsQueueBoard + jiraBoardStyle
shiftWorkspace -> processWizard + sapFioriStyle
dashboardWorkspace -> insightCommandCenter + powerBiStyle/salesforceStyle
```

