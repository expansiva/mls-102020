/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/minhas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/workPlanningBoard/page21.md",
    "experience": "timelineList"
  },
  "intent": "Concentrar em um só lugar as tarefas que criei ou pelas quais sou responsável, para que eu acompanhe prazo, situação e checklist, execute, revise e mantenha cada tarefa sem sair da página.",
  "sections": [
    {
      "id": "secTarefas",
      "priority": "primary",
      "purpose": "Mostrar minhas tarefas com filtros rápidos (criadas por mim, atribuídas a mim, em revisão, devolvidas) para eu escolher em qual agir.",
      "organisms": [
        "listaTarefas"
      ]
    },
    {
      "id": "secTarefaAberta",
      "priority": "main",
      "purpose": "Mostrar a tarefa escolhida com seus dados, checklist e motivo da devolução, junto das ações de ciclo permitidas para o meu papel nela.",
      "organisms": [
        "detalheTarefa",
        "acoesTarefa"
      ]
    },
    {
      "id": "secEdicao",
      "priority": "main",
      "purpose": "Criar uma nova tarefa ou ajustar uma existente: lista, título, descrição, prioridade, prazo, responsável e itens da checklist, incluindo marcar itens feitos e trocar o responsável.",
      "organisms": [
        "formTarefa"
      ]
    },
    {
      "id": "secHistorico",
      "priority": "secondary",
      "purpose": "Contar o caminho da tarefa até agora, para eu entender quem agiu, quando e por quê.",
      "organisms": [
        "historicoTarefa"
      ]
    }
  ],
  "organisms": {
    "listaTarefas": {
      "kind": "list",
      "text": "Tarefas que criei ou pelas quais sou responsável, com lista, responsável, prioridade, prazo, situação, subtarefas e progresso da checklist. Destaca as que vencem hoje ou estão atrasadas e filtra por criadas por mim, atribuídas a mim, em revisão e devolvidas.",
      "intents": []
    },
    "detalheTarefa": {
      "kind": "detail",
      "text": "A tarefa aberta: descrição, lista, criador, responsável, prazo, prioridade, situação, motivo da devolução quando houver e checklist com os itens marcados, para eu saber o que falta e quem age agora.",
      "intents": []
    },
    "formTarefa": {
      "kind": "form",
      "text": "Criar ou editar a tarefa: escolho a lista, preencho título, descrição, prioridade e prazo, escolho ou troco o responsável pelo nome e ajusto ou marco os itens da checklist. Editar não muda a situação da tarefa.",
      "intents": [
        {
          "id": "criarTarefa",
          "kind": "submit"
        },
        {
          "id": "salvarEdicao",
          "kind": "submit"
        },
        {
          "id": "salvarChecklist",
          "kind": "submit"
        }
      ]
    },
    "acoesTarefa": {
      "kind": "actions",
      "text": "Ações de ciclo conforme meu papel na tarefa: como responsável, iniciar e enviar ou reenviar para revisão; como criador, aceitar a entrega, devolver com motivo ou cancelar. Criar, editar, marcar a checklist e trocar o responsável acontecem no formulário da tarefa.",
      "intents": [
        {
          "id": "iniciar",
          "kind": "submit"
        },
        {
          "id": "enviarRevisao",
          "kind": "submit"
        },
        {
          "id": "aceitar",
          "kind": "submit"
        },
        {
          "id": "devolver",
          "kind": "submit"
        },
        {
          "id": "cancelar",
          "kind": "submit"
        }
      ]
    },
    "historicoTarefa": {
      "kind": "timeline",
      "text": "Histórico da tarefa: criação, atribuição e aviso ao responsável, início, envio para revisão, aceite ou devolução com motivo, reatribuição e cancelamento.",
      "intents": []
    }
  },
  "molecules": {
    "listaTarefas": [
      {
        "role": "tabela de tarefas",
        "preferred": "groupviewtable--ml-advanced-data-table",
        "alternative": "groupviewtable--ml-data-table"
      },
      {
        "role": "filtros rápidos",
        "preferred": "groupnavigatesection--ml-navigate-pills",
        "alternative": "groupnavigatesection--ml-tabs"
      },
      {
        "role": "progresso da checklist",
        "preferred": "groupshowprogress--ml-linear-progress",
        "alternative": "groupshowprogress--ml-circular-progress"
      },
      {
        "role": "busca por título",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      }
    ],
    "detalheTarefa": [
      {
        "role": "cartão da tarefa",
        "preferred": "groupviewcard--ml-view-card-horizontal",
        "alternative": "groupviewcard--ml-vertical-card"
      },
      {
        "role": "item da checklist",
        "preferred": "groupenterboolean--ml-checkbox-preference"
      },
      {
        "role": "motivo da devolução",
        "preferred": "groupnotifyuser--ml-contextual-feedback",
        "alternative": "groupnotifyuser--ml-notify-banner"
      }
    ],
    "formTarefa": [
      {
        "role": "lista da tarefa",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-select"
      },
      {
        "role": "responsável",
        "preferred": "groupselectone--ml-combobox",
        "alternative": "groupselectone--ml-select-one-autocomplete"
      },
      {
        "role": "prioridade",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-radio-group"
      },
      {
        "role": "título e item da checklist",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "descrição",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "prazo",
        "preferred": "groupenterdate--ml-date-picker",
        "alternative": "groupenterdate--ml-date-shortcut-picker"
      }
    ],
    "acoesTarefa": [
      {
        "role": "ações principais",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-split-button"
      },
      {
        "role": "ações secundárias",
        "preferred": "grouptriggeraction--ml-kebab-action-trigger"
      },
      {
        "role": "motivo da devolução",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "confirmação da ação",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-alert-modal"
      }
    ],
    "historicoTarefa": [
      {
        "role": "linha do tempo",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ]
  }
} as const;
