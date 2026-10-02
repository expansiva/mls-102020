/// <mls fileReference="_102047_/l2/agendaClinica/web/desktop/page11/meu_cadastro_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/entityRecordManagement/page21.md",
    "experience": "focusedRecordForm"
  },
  "intent": "Mostra o seu cadastro profissional já selecionado na sessão para você conferir os dados de atuação na clínica e gravar identificação e profissão.",
  "sections": [
    {
      "id": "profileSummary",
      "priority": "primary",
      "purpose": "Apresenta o registro de atuação atual para o profissional reconhecer nome, documento, profissão e situação antes de alterar.",
      "organisms": [
        "professionalDetail"
      ]
    },
    {
      "id": "profileMaintenance",
      "priority": "main",
      "purpose": "Reúne os dados editáveis do próprio cadastro para informar um registro novo ou atualizar o existente na clínica.",
      "organisms": [
        "professionalForm"
      ]
    },
    {
      "id": "profileCommands",
      "priority": "secondary",
      "purpose": "Oferece a saída para a agenda diária depois de consultar ou manter o cadastro profissional.",
      "organisms": [
        "professionalActions"
      ]
    }
  ],
  "organisms": {
    "professionalDetail": {
      "kind": "detail",
      "text": "Exibe nome, documento, profissão e situação do seu cadastro de atuação para você conferir se os dados da clínica estão corretos.",
      "intents": []
    },
    "professionalForm": {
      "kind": "form",
      "text": "Permite informar ou atualizar nome, documento e profissão do seu cadastro de atuação para gravar o registro profissional na clínica.",
      "intents": [
        {
          "id": "persistProfessionalCreate",
          "kind": "submit"
        },
        {
          "id": "persistProfessionalUpdate",
          "kind": "submit"
        }
      ]
    },
    "professionalActions": {
      "kind": "actions",
      "text": "Encaminha você à sua agenda diária depois de consultar ou manter o próprio cadastro profissional.",
      "intents": [
        {
          "id": "openOwnAgenda",
          "kind": "navigate",
          "to": "agenda_profissional"
        }
      ]
    }
  },
  "molecules": {
    "professionalForm": [
      {
        "role": "identityText",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "documentText",
        "preferred": "groupentertext--ml-cpf-input",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "saveFeedback",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      },
      {
        "role": "saveAction",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-split-button"
      }
    ],
    "professionalActions": [
      {
        "role": "agendaAction",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-icon-button"
      }
    ]
  }
} as const;
