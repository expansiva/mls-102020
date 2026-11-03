/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/meus_avisos.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/activityNotificationHub/page21.md",
    "experience": "inboxSplit"
  },
  "intent": "Permitir que eu consulte meus avisos diários das 8h, escolha um dia e veja quais tarefas abertas venciam naquele dia ou já estavam atrasadas, além de saber quando cada aviso foi gerado e finalizado.",
  "sections": [
    {
      "id": "avisosRecebidos",
      "priority": "primary",
      "purpose": "Mostrar meus avisos diários por data de referência, para eu localizar rapidamente o aviso de hoje ou de um dia anterior e ver quantas tarefas e quantas atrasadas cada um trouxe.",
      "organisms": [
        "listaAvisos"
      ]
    },
    {
      "id": "conteudoAviso",
      "priority": "main",
      "purpose": "Exibir o aviso escolhido com as tarefas que vencem no dia ou estão atrasadas, com prazo e situação, para eu saber o que precisa de atenção agora.",
      "organisms": [
        "avisoDoDia"
      ]
    },
    {
      "id": "registroEnvio",
      "priority": "secondary",
      "purpose": "Mostrar quando o sistema gerou e finalizou cada aviso, para eu confiar que o aviso das 8h chegou completo.",
      "organisms": [
        "historicoAvisos"
      ]
    }
  ],
  "organisms": {
    "listaAvisos": {
      "kind": "list",
      "text": "Meus avisos diários por data de referência, com a quantidade de tarefas e de atrasadas de cada um e a situação do envio; posso filtrar por período e escolher um aviso para ver o conteúdo.",
      "intents": []
    },
    "avisoDoDia": {
      "kind": "detail",
      "text": "O aviso escolhido: totais de tarefas e de atrasadas em destaque e a relação das tarefas abertas que vencem no dia ou já estavam atrasadas, com título, prazo e situação de cada uma.",
      "intents": []
    },
    "historicoAvisos": {
      "kind": "timeline",
      "text": "Linha do tempo de quando o sistema gerou e finalizou cada aviso diário às 8h, indicando se o envio terminou com sucesso ou falha.",
      "intents": []
    }
  },
  "molecules": {
    "listaAvisos": [
      {
        "role": "lista de avisos por data",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewdata--ml-vertical-record-list"
      },
      {
        "role": "filtro por período de referência",
        "preferred": "groupenterdateinterval--ml-date-interval-presets",
        "alternative": "groupenterdateinterval--ml-date-range-dual-calendar"
      }
    ],
    "avisoDoDia": [
      {
        "role": "totais de tarefas e atrasadas",
        "preferred": "groupviewmetric--ml-metric-card",
        "alternative": "groupviewmetric--ml-metric-big-number"
      },
      {
        "role": "tarefas do aviso com prazo e situação",
        "preferred": "groupviewtable--ml-view-table",
        "alternative": "groupviewtable--ml-data-table-minimal"
      }
    ],
    "historicoAvisos": [
      {
        "role": "geração e finalização dos avisos",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewtable--ml-data-table-minimal"
      }
    ]
  }
} as const;
