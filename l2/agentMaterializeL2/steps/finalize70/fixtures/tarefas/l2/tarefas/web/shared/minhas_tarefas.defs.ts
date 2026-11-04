/// <mls fileReference="_102047_/l2/tarefas/web/shared/minhas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "filtro": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaTarefas",
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
      },
      "listaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:formTarefa",
        "persist": false,
        "required": false
      },
      "responsavelId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:formTarefa",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "qryMinhasTarefas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "tarefas"
      ]
    },
    "qryTarefa": {
      "kind": "qry",
      "trigger": "qryTarefa",
      "returns": [
        "tarefa"
      ]
    },
    "qryListasAtivas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "listas"
      ]
    },
    "qryBuscarMembros": {
      "kind": "qry",
      "trigger": "qryBuscarMembros",
      "returns": [
        "membros"
      ]
    },
    "cmdCriarTarefa": {
      "kind": "cmd",
      "trigger": "criarTarefa",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.create"
    },
    "cmdSalvarEdicao": {
      "kind": "cmd",
      "trigger": "salvarEdicao",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.update"
    },
    "cmdSalvarChecklist": {
      "kind": "cmd",
      "trigger": "salvarChecklist",
      "returns": [
        "tarefa"
      ],
      "writes": "ItemChecklist.update"
    },
    "cmdIniciar": {
      "kind": "cmd",
      "trigger": "iniciar",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.iniciar"
    },
    "cmdEnviarRevisao": {
      "kind": "cmd",
      "trigger": "enviarRevisao",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.enviarParaRevisao"
    },
    "cmdAceitar": {
      "kind": "cmd",
      "trigger": "aceitar",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.aceitar"
    },
    "cmdDevolver": {
      "kind": "cmd",
      "trigger": "devolver",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.devolver"
    },
    "cmdCancelar": {
      "kind": "cmd",
      "trigger": "cancelar",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.cancelar"
    }
  },
  "states": {
    "tarefas": {
      "source": "qryMinhasTarefas.tarefas",
      "description": "the list of Tarefa resumida com lista, responsável, criador, prazo, situação e indicadores de prazo, subtarefas e checklist.",
      "organisms": [
        "listaTarefas"
      ]
    },
    "tarefa": {
      "source": "qryTarefa.tarefa",
      "description": "Tarefa completa com lista, criador, responsável, situação, marcos do ciclo, motivo da devolução, papel de quem consulta e checklist ordenada.",
      "organisms": [
        "acoesTarefa",
        "detalheTarefa",
        "formTarefa",
        "historicoTarefa"
      ]
    },
    "listas": {
      "source": "qryListasAtivas.listas",
      "description": "the list of Lista ativa que pode receber tarefas, com nome e tipo.",
      "organisms": [
        "formTarefa"
      ]
    },
    "membros": {
      "source": "qryBuscarMembros.membros",
      "description": "the list of Membro da equipe que pode ser escolhido como responsável, com nome e situação no cadastro.",
      "organisms": [
        "formTarefa"
      ]
    },
    "selectedTarefa": {
      "source": "entry.params.tarefaId",
      "description": "the id of the Tarefa selected in listaTarefas",
      "organisms": [
        "detalheTarefa",
        "listaTarefas"
      ]
    }
  },
  "journeys": [
    {
      "step": "cancelarTarefaCriador/localizarCriada",
      "organisms": [
        "listaTarefas",
        "detalheTarefa"
      ]
    },
    {
      "step": "cancelarTarefaCriador/cancelarCriada",
      "organisms": [
        "acoesTarefa"
      ]
    },
    {
      "step": "criarTarefa/localizarLista",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "step": "criarTarefa/preencherTarefa",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "step": "editarTarefa/localizarTarefa",
      "organisms": [
        "listaTarefas",
        "detalheTarefa"
      ]
    },
    {
      "step": "editarTarefa/alterarCampos",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "step": "editarTarefa/ajustarChecklist",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "step": "executarTarefa/abrirMinhaTarefa",
      "organisms": [
        "listaTarefas",
        "detalheTarefa"
      ]
    },
    {
      "step": "executarTarefa/verTarefa",
      "organisms": [
        "detalheTarefa",
        "historicoTarefa"
      ]
    },
    {
      "step": "executarTarefa/iniciarTarefa",
      "organisms": [
        "acoesTarefa"
      ]
    },
    {
      "step": "executarTarefa/marcarChecklist",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "step": "executarTarefa/enviarRevisao",
      "organisms": [
        "acoesTarefa"
      ]
    },
    {
      "step": "reatribuirTarefaCriador/localizarParaReatribuir",
      "organisms": [
        "listaTarefas",
        "detalheTarefa"
      ]
    },
    {
      "step": "reatribuirTarefaCriador/escolherNovoResponsavel",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "step": "reatribuirTarefaCriador/trocarResponsavel",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "step": "retomarTarefaDevolvida/abrirDevolvida",
      "organisms": [
        "listaTarefas",
        "detalheTarefa"
      ]
    },
    {
      "step": "retomarTarefaDevolvida/lerMotivo",
      "organisms": [
        "detalheTarefa",
        "historicoTarefa"
      ]
    },
    {
      "step": "retomarTarefaDevolvida/ajustarCampos",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "step": "retomarTarefaDevolvida/reenviarRevisao",
      "organisms": [
        "acoesTarefa"
      ]
    },
    {
      "step": "revisarTarefa/abrirTarefaRevisao",
      "organisms": [
        "listaTarefas",
        "detalheTarefa"
      ]
    },
    {
      "step": "revisarTarefa/conferirEntrega",
      "organisms": [
        "detalheTarefa",
        "historicoTarefa"
      ]
    },
    {
      "step": "revisarTarefa/aceitarTarefa",
      "organisms": [
        "acoesTarefa"
      ]
    },
    {
      "step": "revisarTarefa/devolverTarefa",
      "organisms": [
        "acoesTarefa"
      ]
    }
  ],
  "rules": [
    "cancelamentoPorCriadorOuGestor",
    "checklistNaoMudaSituacao",
    "criacaoIdempotente",
    "devolucaoExigeMotivo",
    "edicaoNaoMudaSituacao",
    "editarSomenteTarefaVisivel",
    "listaInativaNaoRecebeTarefa",
    "reatribuicaoPorCriadorOuGestor",
    "responsavelDeveSerMembroAtivo",
    "somenteCriadorRevisa",
    "somenteResponsavelExecuta",
    "tarefaEncerradaNaoTransiciona"
  ],
  "access": {
    "actors": [
      "membroEquipe"
    ],
    "grants": [
      "membroTarefasProprias",
      "membroConsultaListas",
      "membroEscolheResponsavel"
    ]
  }
} as const;
