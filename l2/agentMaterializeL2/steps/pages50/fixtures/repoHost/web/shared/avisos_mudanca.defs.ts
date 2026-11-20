/// <mls fileReference="_102047_/l2/repoHost/web/shared/avisos_mudanca.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "repositoryChangeId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:detalheAviso",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "listarAvisos": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "avisos"
      ]
    },
    "obterAviso": {
      "kind": "qry",
      "trigger": "obterAviso",
      "returns": [
        "aviso"
      ]
    }
  },
  "states": {
    "avisos": {
      "source": "listarAvisos.avisos",
      "description": "the list of Aviso de mudança do repositório em forma resumida: quando mudou, a mensagem de registro e o autor.",
      "organisms": [
        "avisosRecebidos"
      ]
    },
    "aviso": {
      "source": "obterAviso.aviso",
      "description": "Aviso de mudança do repositório completo: quando mudou, a mensagem de registro, o autor e os arquivos afetados.",
      "organisms": [
        "detalheAviso"
      ]
    },
    "selectedRepositoryChange": {
      "source": "entry.params.repositoryChangeId",
      "description": "the id of the RepositoryChange selected in avisosRecebidos",
      "organisms": [
        "avisosRecebidos",
        "detalheAviso"
      ]
    }
  },
  "journeys": [
    {
      "step": "acompanharAvisosMudanca/listarAvisos",
      "organisms": [
        "avisosRecebidos"
      ]
    },
    {
      "step": "acompanharAvisosMudanca/verAviso",
      "organisms": [
        "detalheAviso"
      ]
    }
  ],
  "rules": [
    "repoHostChangesNewestFirst"
  ],
  "access": {
    "actors": [
      "administrador"
    ],
    "grants": [
      "administradorAcompanhaAvisos"
    ]
  }
} as const;
