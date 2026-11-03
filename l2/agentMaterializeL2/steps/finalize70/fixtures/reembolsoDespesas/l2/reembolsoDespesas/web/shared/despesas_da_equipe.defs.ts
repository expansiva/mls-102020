/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/shared/despesas_da_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:despesasPendentes",
        "persist": true,
        "required": false
      },
      "despesaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:analiseDespesa",
        "persist": true,
        "required": false
      }
    }
  },
  "requests": {
    "listarDespesasPendentesEquipe": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "despesas"
      ]
    },
    "obterDespesaParaAnalise": {
      "kind": "qry",
      "trigger": "obterDespesaParaAnalise",
      "returns": [
        "despesa"
      ]
    },
    "aprovarDespesa": {
      "kind": "cmd",
      "trigger": "aprovarDespesa",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.aprovarDespesa"
    },
    "rejeitarDespesa": {
      "kind": "cmd",
      "trigger": "rejeitarDespesa",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.rejeitarDespesa"
    }
  },
  "states": {
    "despesas": {
      "source": "listarDespesasPendentesEquipe.despesas",
      "description": "Linha da fila de despesas pendentes da equipe.",
      "organisms": [
        "despesasPendentes"
      ]
    },
    "despesa": {
      "source": "obterDespesaParaAnalise.despesa",
      "description": "Despesa completa em análise, com colaborador, usada pela análise e pela decisão.",
      "organisms": [
        "analiseDespesa",
        "decisaoDespesa"
      ]
    },
    "selectedDespesa": {
      "source": "entry.params.despesaId",
      "description": "Despesa completa em análise, com colaborador, usada pela análise e pela decisão.",
      "organisms": [
        "analiseDespesa",
        "decisaoDespesa",
        "despesasPendentes"
      ]
    }
  },
  "journeys": [
    {
      "step": "analisarDecidirDespesa/localizarDespesasPendentes",
      "organisms": [
        "despesasPendentes"
      ]
    },
    {
      "step": "analisarDecidirDespesa/analisarDespesa",
      "organisms": [
        "analiseDespesa",
        "decisaoDespesa"
      ]
    }
  ],
  "rules": [
    "managerTeamExpenseAccess",
    "rejectionReasonRequired"
  ],
  "access": {
    "actors": [
      "gestorEquipe"
    ],
    "grants": [
      "gestorAnalisaDespesasDaEquipe"
    ]
  }
} as const;
