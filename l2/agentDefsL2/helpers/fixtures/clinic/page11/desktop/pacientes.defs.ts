/// <mls fileReference="_102047_/l2/agendaClinica/web/desktop/page11/pacientes.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/customerManagement/page21.md",
    "experience": "directoryProfile"
  },
  "intent": "Mostra o cadastro de pacientes da clínica para a recepcionista localizar quem será atendido, conferir identificação e telefone e registrar um novo paciente antes de organizar ou confirmar consultas.",
  "sections": [
    {
      "id": "patientDirectory",
      "priority": "primary",
      "purpose": "Apresenta os pacientes já cadastrados para a recepcionista encontrar a pessoa certa por nome, documento ou contato.",
      "organisms": [
        "patientList"
      ]
    },
    {
      "id": "patientRecord",
      "priority": "main",
      "purpose": "Exibe a identificação e os canais de contato do paciente selecionado para conferência e confirmação telefônica.",
      "organisms": [
        "patientDetail"
      ]
    },
    {
      "id": "patientRegistration",
      "priority": "secondary",
      "purpose": "Reúne o formulário de novo paciente e as ações para gravar o cadastro ou seguir para as consultas.",
      "organisms": [
        "patientForm",
        "patientActions"
      ]
    }
  ],
  "organisms": {
    "patientList": {
      "kind": "list",
      "text": "Lista os pacientes cadastrados com nome, documento e situação para a recepcionista localizar quem precisa de agendamento ou confirmação.",
      "intents": []
    },
    "patientDetail": {
      "kind": "detail",
      "text": "Apresenta os dados de identificação do paciente selecionado e os telefones vinculados, para a recepcionista conferir o cadastro e ligar na confirmação.",
      "intents": []
    },
    "patientForm": {
      "kind": "form",
      "text": "Coleta nome, documento, país e consentimento de privacidade para cadastrar um novo paciente na clínica.",
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
        "alternative": "groupsearchcontent--ml-search-filters"
      },
      {
        "role": "records",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewtable--ml-advanced-data-table"
      },
      {
        "role": "pagination",
        "preferred": "grouptriggeraction--ml-pagination-control",
        "alternative": "grouptriggeraction--ml-button-standard"
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
        "alternative": "groupselectone--ml-select-dropdown"
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
