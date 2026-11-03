/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/shared/minhas_despesas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "status": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaMinhasDespesas",
        "persist": true,
        "required": false
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaMinhasDespesas",
        "persist": true,
        "required": false
      },
      "despesaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:detalheDespesa",
        "persist": true,
        "required": false
      }
    }
  },
  "requests": {
    "listarMinhasDespesas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "despesas"
      ]
    },
    "obterDespesa": {
      "kind": "qry",
      "trigger": "obterDespesa",
      "returns": [
        "despesa"
      ]
    },
    "registrarDespesa": {
      "kind": "cmd",
      "trigger": "registrarDespesa",
      "returns": [
        "despesa",
        "item"
      ],
      "writes": "Despesa.create"
    },
    "salvarCorrecao": {
      "kind": "cmd",
      "trigger": "salvarCorrecao",
      "returns": [
        "despesa",
        "item"
      ],
      "writes": "Despesa.update"
    },
    "enviarParaAprovacao": {
      "kind": "cmd",
      "trigger": "enviarParaAprovacao",
      "returns": [
        "despesa",
        "item"
      ],
      "writes": "Despesa.enviarParaAprovacao"
    },
    "reenviarParaAprovacao": {
      "kind": "cmd",
      "trigger": "reenviarParaAprovacao",
      "returns": [
        "despesa",
        "item"
      ],
      "writes": "Despesa.reenviarParaAprovacao"
    }
  },
  "states": {
    "despesas": {
      "source": "listarMinhasDespesas.despesas",
      "description": "Linha da lista de despesas do colaborador.",
      "organisms": [
        "listaMinhasDespesas"
      ]
    },
    "despesa": {
      "source": "obterDespesa.despesa",
      "description": "Despesa completa, usada no detalhe, no formulário de correção e nas ações de envio.",
      "organisms": [
        "acoesEnvio",
        "detalheDespesa",
        "formularioDespesa"
      ]
    },
    "selectedDespesa": {
      "source": "entry.params.despesaId",
      "description": "Despesa completa, usada no detalhe, no formulário de correção e nas ações de envio.",
      "organisms": [
        "detalheDespesa",
        "listaMinhasDespesas"
      ]
    }
  },
  "journeys": [
    {
      "step": "consultarMinhasDespesas/localizarMinhasDespesas",
      "organisms": [
        "listaMinhasDespesas"
      ]
    },
    {
      "step": "consultarMinhasDespesas/consultarDespesa",
      "organisms": [
        "detalheDespesa"
      ]
    },
    {
      "step": "corrigirReenviarDespesa/localizarDespesaRejeitada",
      "organisms": [
        "listaMinhasDespesas"
      ]
    },
    {
      "step": "corrigirReenviarDespesa/consultarMotivoRejeicao",
      "organisms": [
        "detalheDespesa"
      ]
    },
    {
      "step": "corrigirReenviarDespesa/corrigirDespesa",
      "organisms": [
        "formularioDespesa"
      ]
    },
    {
      "step": "corrigirReenviarDespesa/reenviarDespesa",
      "organisms": [
        "acoesEnvio"
      ]
    },
    {
      "step": "registrarEnviarDespesa/registrarDespesa",
      "organisms": [
        "formularioDespesa"
      ]
    },
    {
      "step": "registrarEnviarDespesa/enviarParaAprovacao",
      "organisms": [
        "acoesEnvio"
      ]
    }
  ],
  "rules": [
    "expenseOwnerOnly",
    "proofRequiredBeforeSubmission",
    "singleResubmission",
    "validExpenseData"
  ],
  "access": {
    "actors": [
      "colaborador"
    ],
    "grants": [
      "colaboradorGerenciaPropriasDespesas"
    ]
  }
} as const;
