/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/desktop/page11/minhas_despesas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/approvalWorkflow/page21.md",
    "experience": "readAndDecide"
  },
  "intent": "Reunir num só lugar as despesas do colaborador: acompanhar a situação de cada uma, abrir os dados e o comprovante, registrar uma nova despesa ou corrigir uma rejeitada e enviá-la ou reenviá-la para aprovação do gestor.",
  "sections": [
    {
      "id": "acompanhamento",
      "priority": "primary",
      "purpose": "Mostrar as despesas que o colaborador registrou com a situação de cada uma, para ele saber o que está em rascunho, aguardando aprovação, rejeitado, aprovado ou pago.",
      "organisms": [
        "listaMinhasDespesas"
      ]
    },
    {
      "id": "despesaSelecionada",
      "priority": "main",
      "purpose": "Mostrar os dados, o comprovante, a situação e o motivo da rejeição da despesa escolhida, junto das ações de envio ou reenvio que valem para ela.",
      "organisms": [
        "detalheDespesa",
        "acoesEnvio"
      ]
    },
    {
      "id": "registroCorrecao",
      "priority": "secondary",
      "purpose": "Permitir preencher os dados e o comprovante de uma nova despesa ou corrigir uma despesa rejeitada antes de reenviá-la.",
      "organisms": [
        "formularioDespesa"
      ]
    }
  ],
  "organisms": {
    "listaMinhasDespesas": {
      "kind": "list",
      "text": "Vejo as despesas que registrei, com data, categoria, valor e situação de cada uma, para acompanhar o andamento e escolher qual abrir.",
      "intents": []
    },
    "detalheDespesa": {
      "kind": "detail",
      "text": "Abro a despesa para ver os dados, o comprovante, a situação, se já foi reenviada, a data de pagamento e o motivo informado pelo gestor quando ela foi rejeitada.",
      "intents": []
    },
    "formularioDespesa": {
      "kind": "form",
      "text": "Preencho a data, a categoria, o valor, a descrição e o comprovante para registrar uma despesa nova ou corrigir uma rejeitada.",
      "intents": [
        {
          "id": "registrarDespesa",
          "kind": "submit"
        },
        {
          "id": "salvarCorrecao",
          "kind": "submit"
        }
      ]
    },
    "acoesEnvio": {
      "kind": "actions",
      "text": "Envio a despesa em rascunho para aprovação do gestor ou reenvio, uma única vez, a despesa rejeitada que corrigi.",
      "intents": [
        {
          "id": "enviarParaAprovacao",
          "kind": "submit"
        },
        {
          "id": "reenviarParaAprovacao",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "listaMinhasDespesas": [
      {
        "role": "Lista das minhas despesas com situação",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewtable--ml-view-table"
      }
    ],
    "detalheDespesa": [
      {
        "role": "Resumo da despesa selecionada",
        "preferred": "groupviewcard--ml-view-card-horizontal",
        "alternative": "groupviewcard--ml-vertical-card"
      },
      {
        "role": "Destaque do motivo da rejeição",
        "preferred": "groupnotifyuser--ml-contextual-feedback",
        "alternative": "groupnotifyuser--ml-notify-banner"
      }
    ],
    "formularioDespesa": [
      {
        "role": "Data da despesa",
        "preferred": "groupenterdate--ml-date-picker",
        "alternative": "groupenterdate--ml-date-shortcut-picker"
      },
      {
        "role": "Categoria da despesa",
        "preferred": "groupentertext--ml-enter-text"
      },
      {
        "role": "Valor a reembolsar",
        "preferred": "groupentermoney--ml-enter-money-br",
        "alternative": "groupentermoney--ml-currency-input"
      },
      {
        "role": "Descrição da despesa",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "Comprovante da despesa",
        "preferred": "groupselectfileforupload--ml-file-upload-preview",
        "alternative": "groupselectfileforupload--ml-file-upload-dropzone"
      }
    ],
    "acoesEnvio": [
      {
        "role": "Enviar ou reenviar para aprovação",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "Confirmação do envio",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
