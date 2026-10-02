/// <mls fileReference="_102047_/l2/agendaClinica/web/desktop/page11/agenda_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/operationsQueue/page21.md",
    "experience": "workQueueSplit"
  },
  "intent": "Permitir que o profissional veja somente as consultas da sua agenda do dia, localize um atendimento, confira o paciente vinculado e registre a conclusão com a anotação do atendimento.",
  "sections": [
    {
      "id": "agendaDiaria",
      "priority": "primary",
      "purpose": "Apresentar as consultas previstas para o dia na agenda do profissional, para localizar rapidamente o atendimento que ele vai abrir.",
      "organisms": [
        "consultasDoDia"
      ]
    },
    {
      "id": "consultaAtual",
      "priority": "main",
      "purpose": "Mostrar os dados da consulta selecionada e o paciente do atendimento, e permitir registrar a conclusão com anotação no mesmo contexto.",
      "organisms": [
        "detalheConsulta",
        "registroAtendimento"
      ]
    },
    {
      "id": "comandosAgenda",
      "priority": "secondary",
      "purpose": "Reunir as ações para consultar a agenda diária e confirmar o registro do atendimento de uma consulta própria.",
      "organisms": [
        "acoesAgenda"
      ]
    }
  ],
  "organisms": {
    "consultasDoDia": {
      "kind": "list",
      "text": "Lista as consultas do profissional previstas para o dia, com horário, situação e paciente, para localizar o atendimento a abrir.",
      "intents": []
    },
    "detalheConsulta": {
      "kind": "detail",
      "text": "Mostra os dados da consulta selecionada e a identificação do paciente vinculado, para o profissional conferir o atendimento antes de concluir.",
      "intents": []
    },
    "registroAtendimento": {
      "kind": "form",
      "text": "Captura a anotação do atendimento e conclui a consulta selecionada como atendida, para registrar o trabalho realizado.",
      "intents": [
        {
          "id": "registrarAtendimento",
          "kind": "submit"
        }
      ]
    },
    "acoesAgenda": {
      "kind": "actions",
      "text": "Disponibiliza as ações de consultar a agenda diária e registrar o atendimento de uma consulta própria do profissional.",
      "intents": [
        {
          "id": "confirmarRegistroAtendimento",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "consultasDoDia": [
      {
        "role": "search",
        "preferred": "groupsearchcontent--ml-search-bar",
        "alternative": "groupsearchcontent--ml-search-filters"
      },
      {
        "role": "view",
        "preferred": "groupviewdata--ml-calendar-view",
        "alternative": "groupviewdata--ml-timeline-view"
      }
    ],
    "detalheConsulta": [
      {
        "role": "card",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-profile-card"
      }
    ],
    "registroAtendimento": [
      {
        "role": "note",
        "preferred": "groupentertext--ml-multiline-text",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "submit",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-button-group"
      }
    ],
    "acoesAgenda": [
      {
        "role": "action",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-split-button"
      },
      {
        "role": "feedback",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
