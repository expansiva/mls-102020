/// <mls fileReference="_102047_/l2/agendaClinica/web/desktop/page11/meu_cadastro_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/entityRecordManagement/page21.md",
    "experience": "focusedRecordForm"
  },
  "intent": "A recepcionista consulta o próprio cadastro já selecionado na sessão e atualiza os dados de atuação na clínica, para manter identificação e privacidade corretas no atendimento da recepção.",
  "sections": [
    {
      "id": "currentProfile",
      "priority": "primary",
      "purpose": "Mostra o resumo do cadastro da recepcionista autenticada para ela conferir identificação, documento e privacidade antes de editar.",
      "organisms": [
        "ownReceptionistDetail"
      ]
    },
    {
      "id": "profileForm",
      "priority": "main",
      "purpose": "Reúne os campos editáveis do próprio cadastro para a recepcionista corrigir identificação e consentimento de privacidade.",
      "organisms": [
        "ownReceptionistForm"
      ]
    },
    {
      "id": "profileActions",
      "priority": "secondary",
      "purpose": "Oferece os comandos para gravar o cadastro próprio, criando o registro de recepcionista ou atualizando o que já está selecionado.",
      "organisms": [
        "ownReceptionistActions"
      ]
    }
  ],
  "organisms": {
    "ownReceptionistDetail": {
      "kind": "detail",
      "text": "Exibe identificação, documento e consentimento do próprio cadastro de recepcionista para a profissional confirmar como está registrada na clínica.",
      "intents": []
    },
    "ownReceptionistForm": {
      "kind": "form",
      "text": "Recebe as alterações de nome, documento e consentimento de privacidade do próprio cadastro para manter os dados de atuação alinhados à clínica.",
      "intents": []
    },
    "ownReceptionistActions": {
      "kind": "actions",
      "text": "Dispara a criação ou a atualização do próprio cadastro de recepcionista após a conferência e a edição dos dados de atuação.",
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
        "preferred": "groupviewcard--ml-profile-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      }
    ],
    "ownReceptionistForm": [
      {
        "role": "nameField",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "documentField",
        "preferred": "groupentertext--ml-cpf-input",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "saveFeedback",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
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
