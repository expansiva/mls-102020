/// <mls fileReference="_102047_/l2/controleEstoque/web/desktop/page11/movimentacoes.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/inventoryControl/page21.md",
    "experience": "splitViewOperations"
  },
  "intent": "O estoquista registra uma entrada ou saída de unidades de um produto e acompanha o histórico já lançado, para atualizar o saldo atual com um registro que permanece inalterável.",
  "sections": [
    {
      "id": "registroMovimentacao",
      "priority": "primary",
      "purpose": "Reúne a localização do produto, a conferência do saldo e o preenchimento da entrada ou saída, para o estoquista gravar a movimentação no mesmo contexto em que vê o efeito no estoque.",
      "organisms": [
        "formularioMovimentacao",
        "acoesRegistro"
      ]
    },
    {
      "id": "historicoMovimentacoes",
      "priority": "main",
      "purpose": "Mostra as entradas e saídas já registradas para o estoquista conferir o histórico que alimenta o saldo, sem reabrir lançamentos encerrados.",
      "organisms": [
        "historicoMovimentacoes"
      ]
    }
  ],
  "organisms": {
    "historicoMovimentacoes": {
      "kind": "list",
      "text": "Lista as entradas e saídas já registradas, com produto, tipo, quantidade e data, para o estoquista acompanhar o histórico imutável que calcula o saldo.",
      "intents": []
    },
    "formularioMovimentacao": {
      "kind": "form",
      "text": "Localiza o produto, exibe o saldo atual e a quantidade mínima e pede tipo, quantidade e momento da operação, para o estoquista informar uma entrada ou saída antes de gravá-la.",
      "intents": []
    },
    "acoesRegistro": {
      "kind": "actions",
      "text": "Confirma o registro da movimentação para gravar a entrada ou saída e atualizar o saldo atual do produto, deixando o lançamento inalterável depois da gravação.",
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
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewdata--ml-timeline-view"
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
        "alternative": "grouptriggeraction--ml-split-button"
      },
      {
        "role": "feedback",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
