/// <mls fileReference="_102047_/l2/agendaClinica/web/mobile/page11/pacientes.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/customerManagement/page21.md",
    "experience": "directoryProfile"
  },
  "intent": "Em uma coluna estreita em torno de 390px, também usável em 360px e 430px, permite à recepcionista buscar um paciente, ver o telefone para confirmação e cadastrar um novo registro sem sair do fluxo de recepção.",
  "sections": [
    {
      "id": "patientDirectory",
      "priority": "primary",
      "purpose": "Empilha uma lista pesquisável e fluida dos pacientes para localizar a pessoa em uma tela estreita de telefone.",
      "organisms": [
        "patientList"
      ]
    },
    {
      "id": "patientRecord",
      "priority": "main",
      "purpose": "Mostra o contato do paciente selecionado e as ações para cadastrar ou ir às consultas, em sequência vertical fácil de alcançar.",
      "organisms": [
        "patientDetail",
        "patientActions"
      ]
    },
    {
      "id": "patientRegistration",
      "priority": "secondary",
      "purpose": "Oferece o formulário fluido de identificação e consentimento para cadastrar um novo paciente abaixo da ficha.",
      "organisms": [
        "patientForm"
      ]
    }
  ],
  "organisms": {
    "patientList": {
      "kind": "list",
      "text": "Lista compacta dos pacientes cadastrados com nome, documento e situação para a recepcionista localizar quem precisa de agendamento ou confirmação.",
      "intents": []
    },
    "patientDetail": {
      "kind": "detail",
      "text": "Mostra identificação e telefone do paciente selecionado para a recepcionista conferir o cadastro e ligar na confirmação a partir do aparelho.",
      "intents": []
    },
    "patientForm": {
      "kind": "form",
      "text": "Coleta nome, documento, país e consentimento de privacidade em campos empilhados para cadastrar um novo paciente.",
      "intents": []
    },
    "patientActions": {
      "kind": "actions",
      "text": "Oferece cadastrar o novo paciente e seguir para as consultas, onde a recepcionista agenda ou registra a confirmação telefônica.",
      "intents": [
        {
          "id": "submitPatientCreate",
          "kind": "submit"
        },
        {
          "id": "openConsultas",
          "kind": "navigate",
          "to": "consultas_recepcao"
        }
      ]
    }
  },
  "molecules": {
    "patientList": [
      {
        "role": "search",
        "preferred": "groupsearchcontent--ml-search-bar",
        "alternative": "groupsearchcontent--ml-search-history"
      },
      {
        "role": "records",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      }
    ],
    "patientDetail": [
      {
        "role": "summary",
        "preferred": "groupviewcard--ml-profile-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      }
    ],
    "patientForm": [
      {
        "role": "name",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "document",
        "preferred": "groupentertext--ml-cpf-input",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "documentType",
        "preferred": "groupselectone--ml-select",
        "alternative": "groupselectone--ml-radio-group"
      },
      {
        "role": "feedback",
        "preferred": "groupnotifyuser--ml-contextual-feedback",
        "alternative": "groupnotifyuser--ml-toast-notification"
      }
    ],
    "patientActions": [
      {
        "role": "commands",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-button-group"
      }
    ]
  }
} as const;
