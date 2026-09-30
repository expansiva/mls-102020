/// <mls fileReference="_102047_/l2/controleEstoque/web/mobile/page11/movimentacoes.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/inventoryControl/page21.md",
    "experience": "splitViewOperations"
  },
  "intent": "Em conteúdo estreito e fluido em torno de 390px, também usável em 360px e 430px, o estoquista registra uma entrada ou saída e consulta o histórico recente, para atualizar o saldo sem depender de uma grade fixa.",
  "sections": [
    {
      "id": "registroMovimentacao",
      "priority": "primary",
      "purpose": "Empilha localização do produto, conferência do saldo e preenchimento da entrada ou saída em faixa estreita, para o estoquista concluir o lançamento com o polegar sem sair do fluxo.",
      "organisms": [
        "formularioMovimentacao",
        "acoesRegistro"
      ]
    },
    {
      "id": "historicoMovimentacoes",
      "priority": "secondary",
      "purpose": "Mostra o histórico recente em lista fluida abaixo do lançamento, para o estoquista conferir entradas e saídas já gravadas depois de registrar a operação.",
      "organisms": [
        "historicoMovimentacoes"
      ]
    }
  ],
  "organisms": {
    "historicoMovimentacoes": {
      "kind": "list",
      "text": "Apresenta as entradas e saídas já registradas em sequência estreita, com produto, tipo, quantidade e data, para o estoquista conferir o histórico imutável no telefone.",
      "intents": []
    },
    "formularioMovimentacao": {
      "kind": "form",
      "text": "Localiza o produto, mostra o saldo atual e a quantidade mínima e pede tipo, quantidade e momento da operação em campos empilhados, para o estoquista informar a entrada ou saída na faixa estreita.",
      "intents": []
    },
    "acoesRegistro": {
      "kind": "actions",
      "text": "Oferece a confirmação visível na faixa estreita para gravar a movimentação, atualizar o saldo e avisar que o lançamento não poderá ser alterado depois.",
      "intents": [
        {
          "id": "registrarMovimentacao",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "historicoMovimentacoes": [
      {
        "role": "records",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewtable--ml-responsive-table"
      }
    ],
    "formularioMovimentacao": [
      {
        "role": "product",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "movementType",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-radio-group"
      },
      {
        "role": "quantity",
        "preferred": "groupenternumber--ml-number-stepper",
        "alternative": "groupenternumber--ml-number-input"
      }
    ],
    "acoesRegistro": [
      {
        "role": "submit",
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
