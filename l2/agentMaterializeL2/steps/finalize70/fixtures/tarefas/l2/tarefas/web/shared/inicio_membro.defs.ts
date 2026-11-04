/// <mls fileReference="_102047_/l2/tarefas/web/shared/inicio_membro.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {}
  },
  "requests": {
    "carregarInicio": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "resumo",
        "avisoDoDia",
        "esperaPorMim"
      ]
    },
    "iniciarTarefa": {
      "kind": "cmd",
      "trigger": "iniciarTarefa",
      "returns": [
        "resumo",
        "esperaPorMim"
      ],
      "writes": "Tarefa.iniciar"
    },
    "enviarParaRevisao": {
      "kind": "cmd",
      "trigger": "enviarParaRevisao",
      "returns": [
        "resumo",
        "esperaPorMim"
      ],
      "writes": "Tarefa.enviarParaRevisao"
    },
    "aceitarEntrega": {
      "kind": "cmd",
      "trigger": "aceitarEntrega",
      "returns": [
        "resumo",
        "esperaPorMim"
      ],
      "writes": "Tarefa.aceitar"
    },
    "devolverComMotivo": {
      "kind": "cmd",
      "trigger": "devolverComMotivo",
      "returns": [
        "resumo",
        "esperaPorMim"
      ],
      "writes": "Tarefa.devolver"
    }
  },
  "states": {
    "resumo": {
      "source": "carregarInicio.resumo",
      "description": "Carga de trabalho da pessoa: totais de tarefas abertas, que vencem hoje e atrasadas, e as tarefas abertas mais urgentes.",
      "organisms": [
        "resumoMinhasTarefas"
      ]
    },
    "avisoDoDia": {
      "source": "carregarInicio.avisoDoDia",
      "description": "Aviso diário de vencimentos da pessoa para a data de hoje, com situação do envio e tarefas incluídas.",
      "organisms": [
        "avisoDoDia"
      ]
    },
    "esperaPorMim": {
      "source": "carregarInicio.esperaPorMim",
      "description": "Tarefas que dependem da pessoa, agrupadas pela ação esperada: iniciar, enviar para revisão, revisar e ajustar após devolução.",
      "organisms": [
        "esperaPorMim"
      ]
    }
  },
  "journeys": [
    {
      "step": "avisoDiarioVencimentos/abrirAviso",
      "organisms": [
        "avisoDoDia"
      ],
      "continuesIn": "meus_avisos"
    },
    {
      "step": "avisoDiarioVencimentos/verVencendo",
      "organisms": [
        "avisoDoDia"
      ],
      "continuesIn": "meus_avisos"
    },
    {
      "step": "executarTarefa/abrirMinhaTarefa",
      "organisms": [
        "esperaPorMim",
        "resumoMinhasTarefas"
      ]
    },
    {
      "step": "executarTarefa/verTarefa",
      "organisms": [],
      "continuesIn": "minhas_tarefas"
    },
    {
      "step": "executarTarefa/iniciarTarefa",
      "organisms": [
        "esperaPorMim"
      ]
    },
    {
      "step": "executarTarefa/marcarChecklist",
      "organisms": [],
      "continuesIn": "minhas_tarefas"
    },
    {
      "step": "executarTarefa/enviarRevisao",
      "organisms": [
        "esperaPorMim"
      ]
    },
    {
      "step": "retomarTarefaDevolvida/abrirDevolvida",
      "organisms": [
        "esperaPorMim"
      ]
    },
    {
      "step": "retomarTarefaDevolvida/lerMotivo",
      "organisms": [
        "esperaPorMim"
      ]
    },
    {
      "step": "retomarTarefaDevolvida/ajustarCampos",
      "organisms": [],
      "continuesIn": "minhas_tarefas"
    },
    {
      "step": "retomarTarefaDevolvida/reenviarRevisao",
      "organisms": [
        "esperaPorMim"
      ]
    },
    {
      "step": "revisarTarefa/abrirTarefaRevisao",
      "organisms": [
        "esperaPorMim"
      ]
    },
    {
      "step": "revisarTarefa/conferirEntrega",
      "organisms": [
        "esperaPorMim"
      ],
      "continuesIn": "minhas_tarefas"
    },
    {
      "step": "revisarTarefa/aceitarTarefa",
      "organisms": [
        "esperaPorMim"
      ]
    },
    {
      "step": "revisarTarefa/devolverTarefa",
      "organisms": [
        "esperaPorMim"
      ]
    }
  ],
  "rules": [
    "avisoUnicoPorResponsavelEDia",
    "devolucaoExigeMotivo",
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
      "membroAvisosProprios",
      "membroConsultaListas",
      "membroEscolheResponsavel"
    ]
  }
} as const;
