/// <mls fileReference="_102047_/l2/tarefas/web/shared/meus_avisos.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "avisoVencimentoId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:avisoDoDia",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "qryPaginaMeusAvisos": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "avisos",
        "avisoAtual"
      ]
    },
    "qryListarMeusAvisos": {
      "kind": "qry",
      "trigger": "qryListarMeusAvisos",
      "returns": [
        "avisos"
      ]
    },
    "qryAvisoPorId": {
      "kind": "qry",
      "trigger": "qryAvisoPorId",
      "returns": [
        "aviso"
      ]
    }
  },
  "states": {
    "avisos": {
      "source": "qryPaginaMeusAvisos.avisos",
      "description": "the list of Aviso diário de vencimentos de um responsável, com data de referência, situação do envio, totais e registro de geração e finalização.",
      "organisms": [
        "historicoAvisos",
        "listaAvisos"
      ]
    },
    "avisoAtual": {
      "source": "qryPaginaMeusAvisos.avisoAtual",
      "description": "Aviso diário de vencimentos com seus totais e as tarefas que trouxe.",
      "organisms": [
        "avisoDoDia"
      ]
    },
    "selectedAvisoVencimento": {
      "source": "entry.params.avisoVencimentoId",
      "description": "the id of the AvisoVencimento selected in listaAvisos",
      "organisms": [
        "avisoDoDia",
        "listaAvisos"
      ]
    }
  },
  "journeys": [
    {
      "step": "avisoDiarioVencimentos/abrirAviso",
      "organisms": [
        "listaAvisos",
        "avisoDoDia"
      ]
    },
    {
      "step": "avisoDiarioVencimentos/verVencendo",
      "organisms": [
        "avisoDoDia"
      ]
    }
  ],
  "rules": [
    "avisoSomenteTarefasAbertasVencendo",
    "avisoUnicoPorResponsavelEDia"
  ],
  "access": {
    "actors": [
      "gestor",
      "membroEquipe"
    ],
    "grants": [
      "membroTarefasProprias",
      "membroAvisosProprios",
      "gestorTarefasEquipe",
      "gestorAvisosProprios"
    ]
  }
} as const;
