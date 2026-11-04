/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/tarefas_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/workPlanningBoard/page21.md",
    "experience": "timelineList"
  },
  "intent": "Dar ao gestor a visão do andamento de todas as tarefas da equipe, permitindo filtrar por lista, responsável, prioridade, prazo e situação, abrir uma tarefa para ver detalhe e histórico e, quando necessário, trocar o responsável ou cancelar a tarefa.",
  "sections": [
    {
      "id": "quadroEquipe",
      "priority": "primary",
      "purpose": "Mostrar todas as tarefas da equipe com filtros, destacando as que vencem hoje ou estão atrasadas, para o gestor localizar rapidamente onde agir.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "id": "tarefaSelecionada",
      "priority": "main",
      "purpose": "Ao escolher uma tarefa no quadro, exibir ao lado o detalhe e as ações do gestor sobre ela.",
      "organisms": [
        "detalheTarefa",
        "acoesGestor"
      ]
    },
    {
      "id": "historico",
      "priority": "secondary",
      "purpose": "Contar como a tarefa chegou à situação atual, para apoiar a decisão de reatribuir ou cancelar.",
      "organisms": [
        "historicoTarefa"
      ]
    }
  ],
  "organisms": {
    "tarefasEquipe": {
      "kind": "list",
      "text": "Quadro de todas as tarefas da equipe com título, lista, responsável, prioridade, prazo, situação e progresso da checklist, filtrando por lista, responsável, prioridade, prazo e situação e sinalizando as que vencem hoje ou estão atrasadas.",
      "intents": []
    },
    "detalheTarefa": {
      "kind": "detail",
      "text": "Detalhe da tarefa escolhida: descrição, criador, responsável, prazo, situação, quantidade de subtarefas e checklist com os itens feitos e pendentes.",
      "intents": []
    },
    "acoesGestor": {
      "kind": "actions",
      "text": "Trocar o responsável da tarefa escolhendo uma pessoa ativa da equipe, que passa a ser quem age agora e é avisada, ou cancelar a tarefa enquanto ela ainda está aberta.",
      "intents": [
        {
          "id": "reatribuirTarefa",
          "kind": "submit"
        },
        {
          "id": "cancelarTarefa",
          "kind": "submit"
        }
      ]
    },
    "historicoTarefa": {
      "kind": "timeline",
      "text": "Histórico da tarefa: criação, início, envios para revisão, devoluções com motivo, reatribuições com aviso ao novo responsável, conclusão e cancelamento.",
      "intents": []
    }
  },
  "molecules": {
    "tarefasEquipe": [
      {
        "role": "Tabela das tarefas da equipe com ordenação e agrupamento",
        "preferred": "groupviewtable--ml-advanced-data-table",
        "alternative": "groupviewtable--ml-grouping-table"
      },
      {
        "role": "Filtro por lista, responsável, prioridade ou situação",
        "preferred": "groupselectone--ml-select-dropdown",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "Filtro por período de prazo",
        "preferred": "groupenterdateinterval--ml-date-interval-presets",
        "alternative": "groupenterdateinterval--ml-date-range-dual-calendar"
      },
      {
        "role": "Busca pelo título da tarefa",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      }
    ],
    "detalheTarefa": [
      {
        "role": "Resumo da tarefa escolhida",
        "preferred": "groupviewcard--ml-view-card-horizontal",
        "alternative": "groupviewcard--ml-vertical-card"
      },
      {
        "role": "Itens da checklist em ordem",
        "preferred": "groupviewdata--ml-vertical-record-list"
      }
    ],
    "acoesGestor": [
      {
        "role": "Escolha do novo responsável pelo nome",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "Botões de reatribuir e cancelar",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "Confirmação antes de cancelar",
        "preferred": "groupnotifyuser--ml-alert-modal"
      },
      {
        "role": "Retorno após reatribuir ou cancelar",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ],
    "historicoTarefa": [
      {
        "role": "Eventos da tarefa em ordem de tempo",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ]
  }
} as const;
