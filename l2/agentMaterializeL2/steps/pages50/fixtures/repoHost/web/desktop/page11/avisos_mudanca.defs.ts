/// <mls fileReference="_102047_/l2/repoHost/web/desktop/page11/avisos_mudanca.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/auditTrail/page21.md",
    "experience": "chronologicalLog"
  },
  "intent": "Permitir que o administrador acompanhe, do mais recente ao mais antigo, os avisos que o GitHub enviou quando o repositório mudou, e abra cada aviso para ver a mensagem de registro, o autor e os arquivos afetados. Assim ele confirma que a integração está recebendo as mudanças.",
  "sections": [
    {
      "id": "linhaDoTempo",
      "priority": "primary",
      "purpose": "Mostrar a sequência de avisos recebidos, com quando o repositório mudou e a mensagem de registro de cada um, para o administrador ver de relance o que chegou.",
      "organisms": [
        "avisosRecebidos"
      ]
    },
    {
      "id": "detalheDoAviso",
      "priority": "main",
      "purpose": "Mostrar ao lado da linha do tempo o aviso escolhido, com a mensagem completa, o autor e os arquivos incluídos, alterados ou removidos.",
      "organisms": [
        "detalheAviso"
      ]
    }
  ],
  "organisms": {
    "avisosRecebidos": {
      "kind": "timeline",
      "text": "Vejo, em ordem de chegada e do mais recente ao mais antigo, os avisos que o GitHub enviou quando o repositório mudou, com o momento da mudança, a mensagem de registro e o autor.",
      "intents": []
    },
    "detalheAviso": {
      "kind": "detail",
      "text": "Abro um aviso e vejo quando o repositório mudou, a mensagem de registro completa, quem fez a mudança e a lista dos arquivos afetados, com o tipo de alteração de cada um.",
      "intents": []
    }
  },
  "molecules": {
    "avisosRecebidos": [
      {
        "role": "sequência cronológica de avisos",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ],
    "detalheAviso": [
      {
        "role": "resumo do aviso com mensagem e autor",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      },
      {
        "role": "lista de arquivos afetados",
        "preferred": "groupexpandcontent--ml-collapsible-panel",
        "alternative": "groupexpandcontent--ml-accordion"
      }
    ]
  }
} as const;
