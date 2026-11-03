/// <mls fileReference="_102047_/l2/tarefas/web/shared/inicio_gestor.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "tarefaId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:tarefasParaAcao",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "obterPanoramaEquipe": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "totalAbertas",
        "totalVenceHoje",
        "totalAtrasadas",
        "progressoChecklist",
        "listas"
      ]
    },
    "listarTarefasParaAcao": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "tarefas"
      ]
    }
  },
  "states": {
    "listas": {
      "source": "obterPanoramaEquipe.listas",
      "description": "the list of Lista (projeto ou área) com a quantidade de tarefas abertas que ela tem.",
      "organisms": [
        "destaquesEquipe"
      ]
    },
    "totalAbertas": {
      "source": "obterPanoramaEquipe.totalAbertas",
      "description": "the totalAbertas that obterPanoramaEquipe returns",
      "organisms": [
        "destaquesEquipe"
      ]
    },
    "totalVenceHoje": {
      "source": "obterPanoramaEquipe.totalVenceHoje",
      "description": "the totalVenceHoje that obterPanoramaEquipe returns",
      "organisms": [
        "destaquesEquipe"
      ]
    },
    "totalAtrasadas": {
      "source": "obterPanoramaEquipe.totalAtrasadas",
      "description": "the totalAtrasadas that obterPanoramaEquipe returns",
      "organisms": [
        "destaquesEquipe"
      ]
    },
    "progressoChecklist": {
      "source": "obterPanoramaEquipe.progressoChecklist",
      "description": "the progressoChecklist that obterPanoramaEquipe returns",
      "organisms": [
        "destaquesEquipe"
      ]
    },
    "tarefas": {
      "source": "listarTarefasParaAcao.tarefas",
      "description": "the list of Tarefa da equipe com título, situação, prioridade, prazo, nome da lista, nome do responsável e indicadores de prazo e checklist.",
      "organisms": [
        "tarefasParaAcao"
      ]
    },
    "selectedTarefa": {
      "source": "entry.params.tarefaId",
      "description": "the id of the Tarefa selected in destaquesEquipe",
      "organisms": [
        "destaquesEquipe",
        "tarefasParaAcao"
      ]
    }
  },
  "journeys": [
    {
      "step": "acompanharTarefasEquipe/filtrarTarefas",
      "organisms": [
        "tarefasParaAcao"
      ],
      "continuesIn": "tarefas_equipe"
    },
    {
      "step": "acompanharTarefasEquipe/verQuadro",
      "organisms": [
        "destaquesEquipe",
        "tarefasParaAcao"
      ],
      "continuesIn": "tarefas_equipe"
    },
    {
      "step": "acompanharTarefasEquipe/verDetalhe",
      "organisms": [
        "tarefasParaAcao"
      ],
      "continuesIn": "tarefas_equipe"
    }
  ],
  "rules": [],
  "access": {
    "actors": [
      "gestor"
    ],
    "grants": [
      "gestorTarefasEquipe",
      "gestorListas",
      "gestorMembros"
    ]
  }
} as const;
