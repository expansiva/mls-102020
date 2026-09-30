/// <mls fileReference="_102047_/l2/controleEstoque/web/desktop/page11/produtos.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/inventoryControl/page21.md",
    "experience": "splitViewOperations"
  },
  "intent": "O estoquista acompanha os saldos atuais do estoque, identifica produtos abaixo da quantidade mínima, consulta cada item e cadastra novos produtos para o controle.",
  "sections": [
    {
      "id": "visaoGeral",
      "priority": "primary",
      "purpose": "Reúne o saldo atual e os avisos de saldo baixo para o estoquista enxergar a situação do estoque de imediato.",
      "organisms": [
        "saldoAtual",
        "alertasSaldoBaixo"
      ]
    },
    {
      "id": "consulta",
      "priority": "main",
      "purpose": "Permite localizar um produto cadastrado e consultar saldo, quantidade mínima e unidade antes de decidir a reposição ou uma movimentação.",
      "organisms": [
        "listaProdutos",
        "detalheProduto"
      ]
    },
    {
      "id": "cadastro",
      "priority": "secondary",
      "purpose": "Reúne os dados e a confirmação para cadastrar um produto no acompanhamento de estoque.",
      "organisms": [
        "formularioProduto",
        "acoesCadastro"
      ]
    }
  ],
  "organisms": {
    "saldoAtual": {
      "kind": "summary",
      "text": "Mostra o saldo atual de cada produto do estoque para o estoquista avaliar a disponibilidade sem abrir item a item.",
      "intents": []
    },
    "alertasSaldoBaixo": {
      "kind": "highlights",
      "text": "Destaca os produtos com saldo abaixo da quantidade mínima para o estoquista priorizar a reposição.",
      "intents": []
    },
    "listaProdutos": {
      "kind": "list",
      "text": "Lista os produtos cadastrados e permite buscar pelo nome para o estoquista localizar o item a acompanhar.",
      "intents": []
    },
    "detalheProduto": {
      "kind": "detail",
      "text": "Apresenta o produto selecionado com saldo atual, quantidade mínima e unidade para conferência e para seguir ao registro de uma movimentação.",
      "intents": [
        {
          "id": "abrirMovimentacoes",
          "kind": "navigate",
          "to": "movimentacoes"
        }
      ]
    },
    "formularioProduto": {
      "kind": "form",
      "text": "Recebe o nome do produto, a unidade de medida e a quantidade mínima para incluir o item no acompanhamento de estoque.",
      "intents": []
    },
    "acoesCadastro": {
      "kind": "actions",
      "text": "Confirma o cadastro do produto para disponibilizá-lo às movimentações e ao monitoramento do saldo.",
      "intents": [
        {
          "id": "cadastrarProduto",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "saldoAtual": [
      {
        "role": "view",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ],
    "alertasSaldoBaixo": [
      {
        "role": "view",
        "preferred": "groupviewdata--ml-card-grid",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ],
    "listaProdutos": [
      {
        "role": "search",
        "preferred": "groupsearchcontent--ml-search-bar",
        "alternative": "groupsearchcontent--ml-search-filters"
      },
      {
        "role": "view",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ],
    "detalheProduto": [
      {
        "role": "card",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      },
      {
        "role": "metric",
        "preferred": "groupviewmetric--ml-metric-card",
        "alternative": "groupviewmetric--ml-metric-big-number"
      }
    ],
    "formularioProduto": [
      {
        "role": "text",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "number",
        "preferred": "groupenternumber--ml-number-input",
        "alternative": "groupenternumber--ml-number-stepper"
      }
    ],
    "acoesCadastro": [
      {
        "role": "action",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-split-button"
      }
    ]
  }
} as const;
