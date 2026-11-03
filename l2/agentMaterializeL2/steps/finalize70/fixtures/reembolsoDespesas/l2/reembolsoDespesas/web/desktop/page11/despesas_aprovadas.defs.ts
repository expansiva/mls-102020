/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/desktop/page11/despesas_aprovadas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/financialTransactions/page21.md",
    "experience": "ledgerTable"
  },
  "intent": "O financeiro vê as despesas aprovadas que aguardam pagamento, consulta os dados de cada uma e registra a data em que foi paga.",
  "sections": [
    {
      "id": "filaPagamento",
      "priority": "primary",
      "purpose": "Mostra as despesas aprovadas que ainda aguardam pagamento. Assim, o financeiro sabe o que precisa pagar.",
      "organisms": [
        "despesasAprovadasLista"
      ]
    },
    {
      "id": "analisePagamento",
      "priority": "main",
      "purpose": "Mostra os dados da despesa escolhida ao lado do registro da data de pagamento. Assim, o financeiro confere o valor antes de confirmar o pagamento.",
      "organisms": [
        "despesaAprovadaDetalhe",
        "registroPagamentoForm"
      ]
    }
  ],
  "organisms": {
    "despesasAprovadasLista": {
      "kind": "list",
      "text": "Lista as despesas aprovadas que aguardam pagamento, com colaborador, data, categoria e valor. O financeiro pode localizar e escolher uma despesa.",
      "intents": []
    },
    "despesaAprovadaDetalhe": {
      "kind": "detail",
      "text": "Mostra os dados da despesa aprovada: colaborador, data, categoria, valor, descrição e situação. O financeiro confere essas informações antes de pagar.",
      "intents": []
    },
    "registroPagamentoForm": {
      "kind": "form",
      "text": "Recebe a data em que a despesa aprovada foi paga e registra o pagamento. Com isso, a despesa passa para a situação de paga.",
      "intents": [
        {
          "id": "registrarPagamento",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "despesasAprovadasLista": [
      {
        "role": "tabela de despesas aprovadas",
        "preferred": "groupviewtable--ml-side-detail-table",
        "alternative": "groupviewtable--ml-data-table"
      },
      {
        "role": "busca na lista",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      },
      {
        "role": "paginação",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ],
    "despesaAprovadaDetalhe": [
      {
        "role": "resumo da despesa",
        "preferred": "groupviewcard--ml-view-card-horizontal",
        "alternative": "groupviewcard--ml-vertical-card"
      }
    ],
    "registroPagamentoForm": [
      {
        "role": "data de pagamento",
        "preferred": "groupenterdate--ml-date-shortcut-picker",
        "alternative": "groupenterdate--ml-date-picker"
      },
      {
        "role": "confirmar pagamento",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "confirmação do registro",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
