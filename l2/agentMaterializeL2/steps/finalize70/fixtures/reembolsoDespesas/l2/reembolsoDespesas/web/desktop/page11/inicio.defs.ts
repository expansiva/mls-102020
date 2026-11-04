/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/desktop/page11/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/approvalWorkflow/page21.md",
    "experience": "readAndDecide"
  },
  "intent": "Mostrar ao gestor, logo ao entrar, quais despesas da equipe estão esperando a análise e a decisão dele, para que ele perceba o volume pendente e siga direto para a análise.",
  "sections": [
    {
      "id": "pendenciasDecisao",
      "priority": "primary",
      "purpose": "Reunir as despesas da equipe que aguardam a decisão do gestor, com quem registrou, a data, a categoria e o valor, para ele escolher o que analisar primeiro.",
      "organisms": [
        "caixaDespesasPendentes"
      ]
    }
  ],
  "organisms": {
    "caixaDespesasPendentes": {
      "kind": "inbox",
      "text": "Vejo as despesas da equipe que estão esperando eu analisar e decidir: quem registrou, quando foi a despesa, a categoria e o valor, além de saber se é um reenvio depois de uma correção. Daqui sigo para a análise e decisão.",
      "intents": [
        {
          "id": "abrirAnaliseDespesas",
          "kind": "navigate",
          "to": "despesas_da_equipe"
        }
      ]
    }
  },
  "molecules": {
    "caixaDespesasPendentes": [
      {
        "role": "Total de despesas aguardando decisão",
        "preferred": "groupviewmetric--ml-metric-card",
        "alternative": "groupviewmetric--ml-metric-big-number"
      },
      {
        "role": "Lista das despesas pendentes da equipe",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewdata--ml-vertical-record-list"
      },
      {
        "role": "Ir para a análise das despesas",
        "preferred": "grouptriggeraction--ml-button-standard"
      }
    ]
  }
} as const;
