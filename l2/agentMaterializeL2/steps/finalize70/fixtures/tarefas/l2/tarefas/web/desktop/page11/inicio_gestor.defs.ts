/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/inicio_gestor.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/dashboardCommandCenter/page21.md",
    "experience": "exceptionTriage"
  },
  "intent": "Dar ao gestor uma visão rápida do andamento de todas as tarefas da equipe: quantas estão abertas em cada lista, quantas vencem hoje, quantas estão atrasadas e como estão as checklists. Logo abaixo, mostrar as tarefas que podem pedir uma ação dele, como trocar o responsável ou cancelar.",
  "sections": [
    {
      "id": "panoramaEquipe",
      "priority": "primary",
      "purpose": "Mostrar logo de início a situação da equipe: tarefas abertas por lista, as que vencem hoje, as atrasadas e o progresso das checklists, para o gestor ver onde o trabalho está acumulando ou correndo risco.",
      "organisms": [
        "destaquesEquipe"
      ]
    },
    {
      "id": "atencaoGestor",
      "priority": "main",
      "purpose": "Listar as tarefas da equipe que podem precisar de uma decisão do gestor, como as atrasadas ou que vencem hoje, e levar até Tarefas da equipe para trocar o responsável ou cancelar.",
      "organisms": [
        "tarefasParaAcao"
      ]
    }
  ],
  "organisms": {
    "destaquesEquipe": {
      "kind": "highlights",
      "text": "Tarefas abertas em cada lista, quantas vencem hoje e quantas estão atrasadas na equipe, com o progresso das checklists. Mostra ao gestor onde há acúmulo ou risco de atraso.",
      "intents": []
    },
    "tarefasParaAcao": {
      "kind": "inbox",
      "text": "Tarefas da equipe que podem pedir ação do gestor, com título, lista, responsável, prioridade, prazo e situação, e com as atrasadas e as que vencem hoje em destaque. Cada tarefa leva até Tarefas da equipe para trocar o responsável ou cancelar.",
      "intents": [
        {
          "id": "abrirTarefasEquipe",
          "kind": "navigate",
          "to": "tarefas_equipe"
        }
      ]
    }
  },
  "molecules": {
    "destaquesEquipe": [
      {
        "role": "Totais de tarefas abertas, das que vencem hoje e das atrasadas",
        "preferred": "groupviewmetric--ml-metric-card",
        "alternative": "groupviewmetric--ml-metric-big-number"
      },
      {
        "role": "Tarefas abertas por lista",
        "preferred": "groupviewchart--ml-bar-chart",
        "alternative": "groupviewchart--ml-pie-chart"
      },
      {
        "role": "Progresso das checklists",
        "preferred": "groupshowprogress--ml-linear-progress",
        "alternative": "groupshowprogress--ml-circular-progress"
      }
    ],
    "tarefasParaAcao": [
      {
        "role": "Fila de tarefas que pedem ação",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      },
      {
        "role": "Abrir a tarefa em Tarefas da equipe",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-icon-button"
      },
      {
        "role": "Navegar entre páginas da fila",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ]
  }
} as const;
