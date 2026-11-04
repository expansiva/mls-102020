/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/shared/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:caixaDespesasPendentes",
        "persist": true,
        "required": false
      }
    }
  },
  "requests": {
    "qryInicio": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "totalPendentes",
        "despesasPendentes"
      ]
    }
  },
  "states": {
    "totalPendentes": {
      "source": "qryInicio.totalPendentes",
      "description": "Número de despesas da equipe aguardando a decisão do gestor, para o destaque do volume pendente.",
      "organisms": [
        "caixaDespesasPendentes"
      ]
    },
    "despesasPendentes": {
      "source": "qryInicio.despesasPendentes",
      "description": "Despesa da equipe aguardando a decisão do gestor, com o colaborador que a registrou.",
      "organisms": [
        "caixaDespesasPendentes"
      ]
    }
  },
  "journeys": [],
  "rules": [
    "managerTeamExpenseAccess"
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
