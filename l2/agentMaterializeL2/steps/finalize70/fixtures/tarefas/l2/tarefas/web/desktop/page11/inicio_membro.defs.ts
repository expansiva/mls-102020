/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/inicio_membro.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/dashboardCommandCenter/page21.md",
    "experience": "exceptionTriage"
  },
  "intent": "Ponto de partida do dia do membro da equipe: mostra quantas tarefas estão abertas, quantas vencem hoje e quantas estão atrasadas, destaca o aviso diário das 8h e reúne o que espera por ele — tarefas para iniciar, entregas para revisar e devoluções para ajustar — para agir sem procurar.",
  "sections": [
    {
      "id": "secaoResumo",
      "priority": "primary",
      "purpose": "Dar uma leitura imediata da carga de trabalho: tarefas abertas, as que vencem hoje e as atrasadas, com o progresso da checklist de cada uma.",
      "organisms": [
        "resumoMinhasTarefas"
      ]
    },
    {
      "id": "secaoPendencias",
      "priority": "main",
      "purpose": "Concentrar o que depende de mim agora, para iniciar, enviar para revisão, aceitar ou devolver sem sair do Início.",
      "organisms": [
        "esperaPorMim"
      ]
    },
    {
      "id": "secaoAvisoDiario",
      "priority": "secondary",
      "purpose": "Lembrar do aviso diário das 8h com as tarefas que vencem hoje ou estão atrasadas, com acesso ao aviso completo.",
      "organisms": [
        "avisoDoDia"
      ]
    }
  ],
  "organisms": {
    "resumoMinhasTarefas": {
      "kind": "summary",
      "text": "Minhas tarefas abertas, quantas vencem hoje e quantas estão atrasadas, com o progresso da checklist de cada uma, para eu saber por onde começar.",
      "intents": [
        {
          "id": "abrirMinhasTarefas",
          "kind": "navigate",
          "to": "minhas_tarefas"
        }
      ]
    },
    "avisoDoDia": {
      "kind": "alerts",
      "text": "Aviso diário das 8h: mostra o aviso de hoje com a quantidade de tarefas que vencem hoje e de atrasadas; abro o aviso para ver cada tarefa com prazo e situação.",
      "intents": [
        {
          "id": "abrirMeusAvisos",
          "kind": "navigate",
          "to": "meus_avisos"
        }
      ]
    },
    "esperaPorMim": {
      "kind": "inbox",
      "text": "O que espera por mim: tarefas atribuídas para iniciar, tarefas em andamento para enviar à revisão, entregas que criei para aceitar ou devolver com motivo, e tarefas devolvidas com o motivo para eu ajustar e reenviar.",
      "intents": [
        {
          "id": "iniciarTarefa",
          "kind": "submit"
        },
        {
          "id": "enviarParaRevisao",
          "kind": "submit"
        },
        {
          "id": "aceitarEntrega",
          "kind": "submit"
        },
        {
          "id": "devolverComMotivo",
          "kind": "submit"
        },
        {
          "id": "abrirTarefaParaAjustar",
          "kind": "navigate",
          "to": "minhas_tarefas"
        }
      ]
    }
  },
  "molecules": {
    "resumoMinhasTarefas": [
      {
        "role": "indicadores de abertas, vencem hoje e atrasadas",
        "preferred": "groupviewmetric--ml-metric-card",
        "alternative": "groupviewmetric--ml-metric-big-number"
      },
      {
        "role": "tarefas abertas em destaque",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      },
      {
        "role": "progresso da checklist por tarefa",
        "preferred": "groupshowprogress--ml-linear-progress",
        "alternative": "groupshowprogress--ml-circular-progress"
      }
    ],
    "avisoDoDia": [
      {
        "role": "destaque do aviso de hoje",
        "preferred": "groupnotifyuser--ml-notify-banner",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ],
    "esperaPorMim": [
      {
        "role": "separar iniciar, revisar e ajustar",
        "preferred": "groupnavigatesection--ml-navigate-pills",
        "alternative": "groupnavigatesection--ml-tabs"
      },
      {
        "role": "itens pendentes",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      },
      {
        "role": "ação principal do item",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-split-button"
      },
      {
        "role": "ações secundárias do item",
        "preferred": "grouptriggeraction--ml-kebab-action-trigger"
      }
    ]
  }
} as const;
