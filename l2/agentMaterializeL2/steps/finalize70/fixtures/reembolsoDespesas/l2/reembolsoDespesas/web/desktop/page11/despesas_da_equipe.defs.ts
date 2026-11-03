/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/desktop/page11/despesas_da_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/approvalWorkflow/page21.md",
    "experience": "readAndDecide"
  },
  "intent": "Permitir que o gestor da equipe encontre as despesas pendentes dos colaboradores, analise cada uma com seus dados e comprovante e registre a decisão de aprovar ou rejeitar com o motivo.",
  "sections": [
    {
      "id": "filaPendentes",
      "priority": "primary",
      "purpose": "Mostrar as despesas da equipe que aguardam aprovação, com colaborador, data, categoria e valor, para o gestor escolher qual analisar.",
      "organisms": [
        "despesasPendentes"
      ]
    },
    {
      "id": "analiseDecisao",
      "priority": "main",
      "purpose": "Apresentar ao lado da fila os dados completos e o comprovante da despesa escolhida, junto com as ações de decisão.",
      "organisms": [
        "analiseDespesa",
        "decisaoDespesa"
      ]
    }
  ],
  "organisms": {
    "despesasPendentes": {
      "kind": "list",
      "text": "Localizo as despesas pendentes da equipe, vendo colaborador, data, categoria, valor e situação, e escolho a que vou analisar.",
      "intents": []
    },
    "analiseDespesa": {
      "kind": "detail",
      "text": "Analiso os dados da despesa selecionada — colaborador, data, categoria, valor, descrição, se já foi reenviada e o motivo de uma rejeição anterior — e consulto o comprovante.",
      "intents": []
    },
    "decisaoDespesa": {
      "kind": "actions",
      "text": "Aprovo a despesa para seguir ao financeiro ou rejeito informando obrigatoriamente o motivo.",
      "intents": [
        {
          "id": "aprovarDespesa",
          "kind": "submit"
        },
        {
          "id": "rejeitarDespesa",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "despesasPendentes": [
      {
        "role": "tabela de despesas pendentes",
        "preferred": "groupviewtable--ml-side-detail-table",
        "alternative": "groupviewtable--ml-data-table"
      },
      {
        "role": "busca por colaborador ou categoria",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      },
      {
        "role": "filtro por período da despesa",
        "preferred": "groupenterdateinterval--ml-date-interval-presets"
      }
    ],
    "analiseDespesa": [
      {
        "role": "resumo da despesa",
        "preferred": "groupviewcard--ml-view-card-horizontal",
        "alternative": "groupviewcard--ml-vertical-card"
      },
      {
        "role": "visualização do comprovante",
        "preferred": "groupplaymedia--ml-pdf-viewer",
        "alternative": "groupplaymedia--ml-image-gallery"
      }
    ],
    "decisaoDespesa": [
      {
        "role": "botões aprovar e rejeitar",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "motivo da rejeição",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "confirmação da decisão",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
