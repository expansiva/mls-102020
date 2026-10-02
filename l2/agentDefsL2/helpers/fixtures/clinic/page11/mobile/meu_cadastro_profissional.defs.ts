/// <mls fileReference="_102047_/l2/agendaClinica/web/mobile/page11/meu_cadastro_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/entityRecordManagement/page21.md",
    "experience": "focusedRecordForm"
  },
  "intent": "Mostra em conteúdo estreito e fluido em torno de 390px, também usável em 360px e 430px, o seu cadastro profissional para conferir os dados de atuação e gravar identificação e profissão.",
  "sections": [
    {
      "id": "profileMaintenance",
      "priority": "primary",
      "purpose": "Empilha os campos editáveis em coluna fluida perto de 390px para o profissional informar ou atualizar o próprio cadastro com o polegar, sem grade fixa.",
      "organisms": [
        "professionalForm"
      ]
    },
    {
      "id": "profileSummary",
      "priority": "main",
      "purpose": "Segue o formulário com o resumo do cadastro atual em bloco estreito para conferência rápida em 360px a 430px.",
      "organisms": [
        "professionalDetail"
      ]
    },
    {
      "id": "profileCommands",
      "priority": "secondary",
      "purpose": "Mantém a ação de ir à agenda no fluxo estreito, após a consulta ou a gravação do cadastro.",
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
