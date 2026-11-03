/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/shared/despesas_aprovadas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "colaboradorId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:despesasAprovadasLista",
        "persist": true,
        "required": false
      },
      "categoria": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:despesasAprovadasLista",
        "persist": true,
        "required": false
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:despesasAprovadasLista",
        "persist": true,
        "required": false
      },
      "despesaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:despesaAprovadaDetalhe",
        "persist": true,
        "required": false
      }
    }
  },
  "requests": {
    "listarDespesasAprovadas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "despesas"
      ]
    },
    "obterDespesaAprovada": {
      "kind": "qry",
      "trigger": "obterDespesaAprovada",
      "returns": [
        "despesa"
      ]
    },
    "registrarPagamento": {
      "kind": "cmd",
      "trigger": "registrarPagamento",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.registrarPagamento"
    }
  },
  "states": {
    "despesas": {
      "source": "listarDespesasAprovadas.despesas",
      "description": "Item da fila de despesas aprovadas que aguardam pagamento.",
      "organisms": [
        "despesasAprovadasLista"
      ]
    },
    "despesa": {
      "source": "obterDespesaAprovada.despesa",
      "description": "Despesa escolhida com seus dados completos e a versão usada no registro do pagamento.",
      "organisms": [
        "despesaAprovadaDetalhe",
        "registroPagamentoForm"
      ]
    },
    "selectedDespesa": {
      "source": "entry.params.despesaId",
      "description": "Despesa escolhida com seus dados completos e a versão usada no registro do pagamento.",
      "organisms": [
        "despesaAprovadaDetalhe",
        "despesasAprovadasLista"
      ]
    }
  },
  "journeys": [
    {
      "step": "consultarDespesasAprovadas/localizarDespesasAprovadas",
      "organisms": [
        "despesasAprovadasLista"
      ]
    },
    {
      "step": "consultarDespesasAprovadas/consultarDespesaAprovada",
      "organisms": [
        "despesaAprovadaDetalhe"
      ]
    },
    {
      "step": "registrarPagamentoDespesa/localizarDespesaAprovada",
      "organisms": [
        "despesasAprovadasLista"
      ]
    },
    {
      "step": "registrarPagamentoDespesa/registrarDataPagamento",
      "organisms": [
        "despesaAprovadaDetalhe",
        "registroPagamentoForm"
      ]
    }
  ],
  "rules": [
    "financeApprovedExpenseAccess",
    "paymentDateRequired"
  ],
  "access": {
    "actors": [
      "financeiro"
    ],
    "grants": [
      "financeiroConsultaEpagaDespesasAprovadas"
    ]
  }
} as const;
