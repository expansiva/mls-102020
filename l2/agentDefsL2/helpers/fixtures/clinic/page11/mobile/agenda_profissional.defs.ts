/// <mls fileReference="_102047_/l2/agendaClinica/web/mobile/page11/agenda_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/operationsQueue/page21.md",
    "experience": "workQueueSplit"
  },
  "intent": "Permitir que o profissional percorra em coluna estreita as consultas da sua agenda do dia, confira o paciente da consulta escolhida e registre a conclusão com anotação.",
  "sections": [
    {
      "id": "agendaDiaria",
      "priority": "primary",
      "purpose": "Empilhar a agenda do dia em conteúdo fluido em torno de 390px, ainda utilizável em 360px e 430px, para o profissional localizar uma consulta ao percorrer a lista.",
      "organisms": [
        "consultasDoDia"
      ]
    },
    {
      "id": "consultaAtual",
      "priority": "main",
      "purpose": "Seguir com o detalhe da consulta escolhida em leitura contínua na largura estreita, para conferir horário, situação e paciente antes de concluir.",
      "organisms": [
        "detalheConsulta"
      ]
    },
    {
      "id": "registroDoDia",
      "priority": "main",
      "purpose": "Oferecer o registro da anotação e da conclusão em sequência fluida depois da conferência, sem depender de colunas fixas.",
      "organisms": [
        "registroAtendimento"
      ]
    },
    {
      "id": "comandosAgenda",
      "priority": "secondary",
      "purpose": "Manter as ações de consultar a agenda e registrar o atendimento ao final do fluxo estreito, ao alcance do profissional.",
      "organisms": [
        "acoesAgenda"
      ]
    }
  ],
  "organisms": {
    "consultasDoDia": {
      "kind": "list",
      "text": "Lista em sequência as consultas do profissional previstas para o dia, com horário, situação e paciente, para localizar o atendimento a abrir na tela estreita.",
      "intents": []
    },
    "detalheConsulta": {
      "kind": "detail",
      "text": "Mostra os dados da consulta selecionada e a identificação do paciente vinculado, para conferir o atendimento antes de concluir.",
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
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-timeline-view"
      }
    ],
    "detalheConsulta": [
      {
        "role": "card",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
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
        "alternative": "grouptriggeraction--ml-icon-button"
      },
      {
        "role": "feedback",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-notify-banner"
      }
    ]
  }
} as const;
