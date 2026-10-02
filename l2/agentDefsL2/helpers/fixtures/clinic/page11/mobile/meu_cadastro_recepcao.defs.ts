/// <mls fileReference="_102047_/l2/agendaClinica/web/mobile/page11/meu_cadastro_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/entityRecordManagement/page21.md",
    "experience": "focusedRecordForm"
  },
  "intent": "Em conteúdo fluido e estreito em torno de 390px, também utilizável em 360px e 430px, a recepcionista consulta e atualiza o próprio cadastro de atuação na clínica, com leitura e edição empilhadas na mesma coluna.",
  "sections": [
    {
      "id": "profileForm",
      "priority": "primary",
      "purpose": "Na coluna estreita, concentra primeiro a edição do próprio cadastro para a recepcionista atualizar identificação e privacidade sem grade fixa.",
      "organisms": [
        "ownReceptionistForm"
      ]
    },
    {
      "id": "currentProfile",
      "priority": "main",
      "purpose": "Em seguida, apresenta o cadastro atual em cartão compacto para conferência no fluxo vertical de cerca de 390px.",
      "organisms": [
        "ownReceptionistDetail"
      ]
    },
    {
      "id": "profileActions",
      "priority": "secondary",
      "purpose": "Mantém os comandos de gravação ao alcance do polegar no final do conteúdo fluido, para criar ou atualizar o cadastro próprio.",
      "organisms": [
        "ownReceptionistActions"
      ]
    }
  ],
  "organisms": {
    "ownReceptionistDetail": {
      "kind": "detail",
      "text": "Mostra identificação, documento e consentimento do próprio cadastro em cartão compacto para a recepcionista conferir o registro na coluna estreita.",
      "intents": []
    },
    "ownReceptionistForm": {
      "kind": "form",
      "text": "Empilha os campos de nome, documento e consentimento de privacidade para a recepcionista atualizar o próprio cadastro no fluxo vertical de cerca de 390px.",
      "intents": []
    },
    "ownReceptionistActions": {
      "kind": "actions",
      "text": "Oferece os comandos de criar ou atualizar o próprio cadastro de recepcionista ao final da coluna fluida, após a edição dos dados de atuação.",
      "intents": [
        {
          "id": "createOwnReceptionist",
          "kind": "submit"
        },
        {
          "id": "updateOwnReceptionist",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "ownReceptionistDetail": [
      {
        "role": "profileCard",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-profile-card"
      }
    ],
    "ownReceptionistForm": [
      {
        "role": "nameField",
        "preferred": "groupentertext--ml-floating-text-input",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "documentField",
        "preferred": "groupentertext--ml-cpf-input",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "saveFeedback",
        "preferred": "groupnotifyuser--ml-contextual-feedback",
        "alternative": "groupnotifyuser--ml-toast-notification"
      }
    ],
    "ownReceptionistActions": [
      {
        "role": "maintainCommands",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-button-group"
      }
    ]
  }
} as const;
