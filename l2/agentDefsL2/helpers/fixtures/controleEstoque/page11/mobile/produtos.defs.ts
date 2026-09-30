/// <mls fileReference="_102047_/l2/controleEstoque/web/mobile/page11/produtos.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/inventoryControl/page21.md",
    "experience": "splitViewOperations"
  },
  "intent": "Em conteúdo estreito e fluido, o estoquista vê primeiro os avisos de saldo baixo, depois localiza e confere produtos e cadastra um novo item quando necessário.",
  "sections": [
    {
      "id": "alertas",
      "priority": "primary",
      "purpose": "Coloca na frente, em cerca de 390px e ainda usável em 360px e 430px, os produtos abaixo do mínimo para o estoquista tratar a reposição.",
      "organisms": [
        "alertasSaldoBaixo"
      ]
    },
    {
      "id": "consulta",
      "priority": "main",
      "purpose": "Empilha saldos, busca, lista e detalhe em coluna fluida para localizar e conferir um produto na largura estreita.",
      "organisms": [
        "saldoAtual",
        "listaProdutos",
        "detalheProduto"
      ]
    },
    {
      "id": "cadastro",
      "priority": "secondary",
      "purpose": "Mantém o cadastro ao final, com campos e ação em sequência vertical no conteúdo estreito.",
      "organisms": [
        "formularioProduto",
        "acoesCadastro"
      ]
    }
  ],
  "organisms": {
    "saldoAtual": {
      "kind": "summary",
      "text": "Mostra o saldo atual de cada produto em lista compacta para o estoquista avaliar a disponibilidade no telefone.",
      "intents": []
    },
    "alertasSaldoBaixo": {
      "kind": "highlights",
      "text": "Destaca primeiro os produtos com saldo abaixo da quantidade mínima para o estoquista priorizar a reposição em tela estreita.",
      "intents": []
    },
    "listaProdutos": {
      "kind": "list",
      "text": "Lista os produtos cadastrados com busca pelo nome para o estoquista localizar o item sem depender de tabela larga.",
      "intents": []
    },
    "detalheProduto": {
      "kind": "detail",
      "text": "Apresenta o produto escolhido com saldo atual, quantidade mínima e unidade para conferência e para seguir ao registro de uma movimentação.",
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
      "text": "Recebe o nome do produto, a unidade de medida e a quantidade mínima em campos empilhados para incluir o item no acompanhamento.",
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
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewtable--ml-responsive-table"
      }
    ],
    "alertasSaldoBaixo": [
      {
        "role": "view",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
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
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewtable--ml-responsive-table"
      }
    ],
    "detalheProduto": [
      {
        "role": "card",
        "preferred": "groupviewcard--ml-view-card-horizontal",
        "alternative": "groupviewcard--ml-vertical-card"
      },
      {
        "role": "metric",
        "preferred": "groupviewmetric--ml-metric-big-number",
        "alternative": "groupviewmetric--ml-metric-card"
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
        "alternative": "grouptriggeraction--ml-icon-button"
      }
    ]
  }
} as const;
