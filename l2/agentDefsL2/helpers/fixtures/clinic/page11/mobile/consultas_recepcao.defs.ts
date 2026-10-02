/// <mls fileReference="_102047_/l2/agendaClinica/web/mobile/page11/consultas_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/calendarScheduling/page21.md",
    "experience": "calendarGrid"
  },
  "intent": "Em conteúdo fluido para uma tela estreita em torno de 390px, também utilizável entre 360px e 430px, permite à recepcionista localizar consultas, conferir o agendamento em foco e registrar agendamento, confirmação telefônica ou falta.",
  "sections": [
    {
      "id": "consultaSelecionada",
      "priority": "primary",
      "purpose": "Prioriza a leitura da consulta em foco, com seus dados, horário, situação e contato do paciente, para apoiar a confirmação ou o registro de falta no atendimento móvel.",
      "organisms": [
        "detalheConsulta"
      ]
    },
    {
      "id": "registroEAcoes",
      "priority": "main",
      "purpose": "Mantém o novo agendamento e as ações de situação em sequência fluida, com espaço para informar os dados e concluir a operação sem depender de largura fixa.",
      "organisms": [
        "formularioConsulta",
        "acoesConsulta"
      ]
    },
    {
      "id": "agendaDeConsultas",
      "priority": "secondary",
      "purpose": "Oferece uma lista vertical pesquisável para localizar outra consulta por paciente, profissional, data, horário ou situação.",
      "organisms": [
        "listaConsultas"
      ]
    }
  ],
  "organisms": {
    "listaConsultas": {
      "kind": "list",
      "text": "Exibe as consultas em lista vertical com paciente, profissional, data, horário e situação para localizar agendamentos e consultar a disponibilidade pelo celular.",
      "intents": []
    },
    "detalheConsulta": {
      "kind": "detail",
      "text": "Resume a consulta selecionada com paciente, profissional, data, horário, situação e telefone do paciente para apoiar a conferência durante a confirmação ou o registro de falta.",
      "intents": []
    },
    "formularioConsulta": {
      "kind": "form",
      "text": "Organiza em sequência os campos de paciente, profissional e data e horário para registrar um novo agendamento em uma tela estreita.",
      "intents": [
        {
          "id": "registrarAgendamento",
          "kind": "submit"
        }
      ]
    },
    "acoesConsulta": {
      "kind": "actions",
      "text": "Disponibiliza ações fáceis de alcançar para verificar horários, registrar a confirmação telefônica ou marcar a falta na consulta selecionada.",
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
        "alternative": "groupsearchcontent--ml-search-history"
      },
      {
        "role": "dateFilter",
        "preferred": "groupenterdate--ml-compact-calendar",
        "alternative": "groupenterdate--ml-date-picker"
      },
      {
        "role": "statusFilter",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-select"
      },
      {
        "role": "collection",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewtable--ml-responsive-table"
      }
    ],
    "detalheConsulta": [
      {
        "role": "summary",
        "preferred": "groupviewcard--ml-view-card-horizontal",
        "alternative": "groupviewcard--ml-vertical-card"
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
        "preferred": "groupnotifyuser--ml-contextual-feedback",
        "alternative": "groupnotifyuser--ml-toast-notification"
      }
    ],
    "acoesConsulta": [
      {
        "role": "commands",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-button-group"
      },
      {
        "role": "feedback",
        "preferred": "groupnotifyuser--ml-contextual-feedback",
        "alternative": "groupnotifyuser--ml-toast-notification"
      }
    ]
  }
} as const;
