/// <mls fileReference="_102047_/l2/tarefas/web/shared/tarefas_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "listaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:tarefasEquipe",
        "persist": true,
        "required": false
      },
      "responsavelId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:tarefasEquipe",
        "persist": true,
        "required": false
      },
      "prioridade": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:tarefasEquipe",
        "persist": true,
        "required": false
      },
      "status": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:tarefasEquipe",
        "persist": true,
        "required": false
      },
      "prazoDe": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:tarefasEquipe",
        "persist": true,
        "required": false
      },
      "prazoAte": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:tarefasEquipe",
        "persist": true,
        "required": false
      },
      "venceHoje": {
        "type": "boolean",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:tarefasEquipe",
        "persist": true,
        "required": false
      },
      "atrasada": {
        "type": "boolean",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:tarefasEquipe",
        "persist": true,
        "required": false
      },
      "tarefaId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:detalheTarefa",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "carregarOpcoesEquipe": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "listas",
        "membros"
      ]
    },
    "listarTarefasEquipe": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "tarefas"
      ]
    },
    "obterTarefa": {
      "kind": "qry",
      "trigger": "obterTarefa",
      "returns": [
        "tarefa"
      ]
    },
    "reatribuirTarefa": {
      "kind": "cmd",
      "trigger": "reatribuirTarefa",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.update"
    },
    "cancelarTarefa": {
      "kind": "cmd",
      "trigger": "cancelarTarefa",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.cancelar"
    }
  },
  "states": {
    "tarefas": {
      "source": "listarTarefasEquipe.tarefas",
      "description": "the list of Tarefa da equipe resumida com lista, responsável, prazo, situação e indicadores.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    "listas": {
      "source": "carregarOpcoesEquipe.listas",
      "description": "the list of Lista (projeto ou área) identificada pelo nome.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    "membros": {
      "source": "carregarOpcoesEquipe.membros",
      "description": "the list of Membro da equipe com nome e situação no cadastro.",
      "organisms": [
        "acoesGestor",
        "tarefasEquipe"
      ]
    },
    "tarefa": {
      "source": "obterTarefa.tarefa",
      "description": "Tarefa completa com criador, responsável, marcos do histórico e itens da checklist.",
      "organisms": [
        "acoesGestor",
        "detalheTarefa",
        "historicoTarefa"
      ]
    },
    "selectedTarefa": {
      "source": "entry.params.tarefaId",
      "description": "the id of the Tarefa selected in tarefasEquipe",
      "organisms": [
        "detalheTarefa",
        "tarefasEquipe"
      ]
    }
  },
  "journeys": [
    {
      "step": "acompanharTarefasEquipe/filtrarTarefas",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "step": "acompanharTarefasEquipe/verQuadro",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "step": "acompanharTarefasEquipe/verDetalhe",
      "organisms": [
        "detalheTarefa",
        "historicoTarefa"
      ]
    },
    {
      "step": "cancelarTarefaGestor/localizarParaCancelar",
      "organisms": [
        "tarefasEquipe",
        "detalheTarefa"
      ]
    },
    {
      "step": "cancelarTarefaGestor/cancelarPeloGestor",
      "organisms": [
        "acoesGestor"
      ]
    },
    {
      "step": "reatribuirTarefaGestor/localizarTarefaEquipe",
      "organisms": [
        "tarefasEquipe",
        "detalheTarefa"
      ]
    },
    {
      "step": "reatribuirTarefaGestor/escolherResponsavelEquipe",
      "organisms": [
        "acoesGestor"
      ]
    },
    {
      "step": "reatribuirTarefaGestor/reatribuir",
      "organisms": [
        "acoesGestor"
      ]
    }
  ],
  "rules": [
    "cancelamentoPorCriadorOuGestor",
    "edicaoNaoMudaSituacao",
    "editarSomenteTarefaVisivel",
    "reatribuicaoPorCriadorOuGestor",
    "responsavelDeveSerMembroAtivo",
    "tarefaEncerradaNaoTransiciona"
  ],
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
