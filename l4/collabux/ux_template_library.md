# Biblioteca de templates UX

## Objetivo

Criar uma biblioteca de templates de página para que a geração frontend use modelos previsíveis, SaaS-friendly e reutilizáveis.

## Templates iniciais sugeridos

### `recordCatalog`

Uso:

- cadastro/gestão de entidade;
- CRUD leve;
- catálogo administrativo.

Exemplos:

- menu/cardápio;
- clientes;
- produtos;
- fornecedores.

Layout:

- header com título e ação primária;
- toolbar com busca/filtros;
- lista/tabela/cards;
- drawer lateral para criar/editar;
- ações secundárias por linha.

### `enterpriseDataGrid`

Uso:

- tabelas densas;
- backoffice;
- muitos filtros;
- grande volume de dados.

Layout:

- command bar superior;
- grid denso;
- filtros avançados;
- seleção múltipla;
- ações em massa.

### `retailPosWorkbench`

Uso:

- operação rápida de venda/pedido.

Layout:

- catálogo de itens;
- carrinho/pedido lateral;
- botões grandes;
- foco em toque/tablet;
- pedidos abertos em área separada.

### `operationsQueueBoard`

Uso:

- fila operacional;
- status por etapa;
- cozinha;
- atendimento;
- suporte.

Layout:

- colunas por status;
- cards acionáveis;
- atualização rápida de estado;
- filtros mínimos.

### `inventoryControl`

Uso:

- estoque;
- insumos;
- alertas;
- ajustes manuais.

Layout:

- indicadores de estoque baixo;
- lista de itens;
- painel/drawer de ajuste;
- ações restritas e auditáveis.

Definição implementada:

- [`templates/salesforceStyle/inventoryControl/TEMPLATE.md`](./templates/salesforceStyle/inventoryControl/TEMPLATE.md)
- [`templates/salesforceStyle/inventoryControl/page31.contract.json`](./templates/salesforceStyle/inventoryControl/page31.contract.json)

Exemplo:

- [`examples/102051/stockManagement/salesforceStyle.inventoryControl.mapping.md`](./examples/102051/stockManagement/salesforceStyle.inventoryControl.mapping.md)

### `processWizard`

Uso:

- abertura/fechamento de turno;
- aprovação;
- onboarding;
- fechamento financeiro.

Layout:

- etapas claras;
- estado atual;
- validação forte;
- resumo final.

### `insightCommandCenter`

Uso:

- dashboards;
- IA;
- recomendações;
- indicadores operacionais.

Layout:

- KPIs no topo;
- cards de alerta;
- listas resumidas;
- recomendações acionáveis.

## Metadados mínimos do template

Cada template deve declarar:

```json
{
  "templateId": "recordCatalog",
  "supports": ["entityManagement"],
  "bestFor": ["CRUD", "catalog", "admin"],
  "antiPatterns": ["high-frequency POS", "multi-step approval"],
  "layoutSlots": [
    "header",
    "toolbar",
    "primaryList",
    "detailDrawer",
    "emptyState",
    "validationSummary"
  ],
  "primaryActionPlacement": "topRight",
  "secondaryActionPlacement": "rowActions",
  "mobileBehavior": "stackedCards",
  "validationPattern": "inlineFieldErrors"
}
```

## Regra

Templates devem ser estruturais.

Eles não devem depender de marca específica, logo, assets proprietários ou cópia pixel-perfect de produtos existentes.

Templates genéricos devem ficar em `templates/`. Evidências específicas de um projeto devem ficar em `examples/`.
