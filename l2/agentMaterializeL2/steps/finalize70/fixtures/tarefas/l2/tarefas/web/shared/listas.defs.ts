/// <mls fileReference="_102047_/l2/tarefas/web/shared/listas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "listaId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:formularioLista",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "listarListas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "listas"
      ]
    },
    "buscarListas": {
      "kind": "qry",
      "trigger": "buscarListas",
      "returns": [
        "listas"
      ]
    },
    "criarLista": {
      "kind": "cmd",
      "trigger": "criarLista",
      "returns": [
        "lista"
      ],
      "writes": "Lista.create"
    },
    "salvarLista": {
      "kind": "cmd",
      "trigger": "salvarLista",
      "returns": [
        "lista"
      ],
      "writes": "Lista.update"
    }
  },
  "states": {
    "listas": {
      "source": "listarListas.listas",
      "description": "the list of Lista de tarefas de um projeto ou área, com seus dados editáveis, versão e a quantidade de tarefas abertas.",
      "organisms": [
        "formularioLista",
        "listasCadastradas"
      ]
    },
    "selectedLista": {
      "source": "entry.params.listaId",
      "description": "the id of the Lista selected in listasCadastradas",
      "organisms": [
        "formularioLista",
        "listasCadastradas"
      ]
    }
  },
  "journeys": [
    {
      "step": "manterListas/verListas",
      "organisms": [
        "listasCadastradas"
      ]
    },
    {
      "step": "manterListas/criarLista",
      "organisms": [
        "formularioLista"
      ]
    },
    {
      "step": "manterListas/editarLista",
      "organisms": [
        "listasCadastradas",
        "formularioLista"
      ]
    }
  ],
  "rules": [
    "listaMantidaPorGestor",
    "listaNomeUnico"
  ],
  "access": {
    "actors": [
      "gestor"
    ],
    "grants": [
      "gestorListas"
    ]
  }
} as const;
