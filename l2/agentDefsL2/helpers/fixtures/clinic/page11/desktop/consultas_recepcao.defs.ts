/// <mls fileReference="_102047_/l2/agendaClinica/web/desktop/page11/consultas_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/calendarScheduling/page21.md",
    "experience": "calendarGrid"
  },
  "intent": "Permite à recepcionista localizar e conferir as consultas da clínica, verificar a disponibilidade de horário e registrar agendamentos, confirmações telefônicas ou faltas.",
  "sections": [
    {
      "id": "agendaDeConsultas",
      "priority": "primary",
      "purpose": "Apresenta a agenda pesquisável para localizar rapidamente consultas por paciente, profissional, data, horário e situação antes de atuar sobre o agendamento correto.",
      "organisms": [
        "listaConsultas"
      ]
    },
    {
      "id": "consultaSelecionada",
      "priority": "main",
      "purpose": "Reúne a conferência da consulta em foco e o registro de um novo agendamento para apoiar decisões seguras sobre horários, paciente e profissional.",
      "organisms": [
        "detalheConsulta",
        "formularioConsulta"
      ]
    },
    {
      "id": "acoesDaConsulta",
      "priority": "secondary",
      "purpose": "Disponibiliza as ações contextuais para verificar a agenda, registrar a confirmação telefônica ou marcar a falta do paciente.",
      "organisms": [
        "acoesConsulta"
      ]
    }
  ],
  "organisms": {
    "listaConsultas": {
      "kind": "list",
      "text": "Lista as consultas da clínica por paciente, profissional, data, horário e situação para a recepcionista localizar o agendamento certo e identificar horários disponíveis.",
      "intents": []
    },
    "detalheConsulta": {
      "kind": "detail",
      "text": "Mostra os dados da consulta selecionada, incluindo paciente, profissional, data, horário, situação e canal de contato do paciente, para conferir o agendamento antes de confirmar ou registrar falta.",
      "intents": []
    },
    "formularioConsulta": {
      "kind": "form",
      "text": "Permite escolher o paciente, o profissional e a data e horário para registrar um novo agendamento e manter a agenda organizada.",
      "intents": [
        {
          "id": "registrarAgendamento",
          "kind": "submit"
        }
      ]
    },
    "acoesConsulta": {
      "kind": "actions",
      "text": "Oferece ações sobre a consulta em foco para verificar horários disponíveis, registrar a confirmação telefônica ou marcar a falta do paciente.",
      "intents": [
        {
          "id": "registrarConfirmacao",
          "kind": "submit"
        },
        {
          "id": "registrarFalta",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "listaConsultas": [
      {
        "role": "search",
        "preferred": "groupsearchcontent--ml-search-bar",
        "alternative": "groupsearchcontent--ml-search-filters"
      },
      {
        "role": "dateFilter",
        "preferred": "groupenterdate--ml-date-picker",
        "alternative": "groupenterdate--ml-date-shortcut-picker"
      },
      {
        "role": "statusFilter",
        "preferred": "groupselectone--ml-select",
        "alternative": "groupselectone--ml-segmented-control"
      },
      {
        "role": "collection",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewtable--ml-responsive-data-table"
      },
      {
        "role": "agenda",
        "preferred": "groupviewdata--ml-calendar-view",
        "alternative": "groupviewdata--ml-timeline-view"
      }
    ],
    "detalheConsulta": [
      {
        "role": "summary",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      }
    ],
    "formularioConsulta": [
      {
        "role": "patient",
        "preferred": "groupselectone--ml-combobox",
        "alternative": "groupselectone--ml-select-one-autocomplete"
      },
      {
        "role": "professional",
        "preferred": "groupselectone--ml-combobox",
        "alternative": "groupselectone--ml-select"
      },
      {
        "role": "scheduledAt",
        "preferred": "groupenterdatetime--ml-datetime-picker",
        "alternative": "groupenterdatetime--ml-enter-datetime-masked-input"
      },
      {
        "role": "submit",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-split-button"
      },
      {
        "role": "feedback",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ],
    "acoesConsulta": [
      {
        "role": "commands",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "feedback",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
