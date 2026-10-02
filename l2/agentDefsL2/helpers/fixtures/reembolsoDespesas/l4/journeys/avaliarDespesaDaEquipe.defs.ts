/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/avaliarDespesaDaEquipe.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const avaliarDespesaDaEquipeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "avaliarDespesaDaEquipe",
  "business": {
    "actorRef": "gestorEquipe",
    "title": "Avaliar despesa da equipe",
    "goal": "Avaliar uma despesa pendente da equipe e decidir por sua aprovação ou rejeição.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesaPendente",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesa pendente",
        "description": "Localiza uma despesa pendente de avaliação de um colaborador da equipe."
      },
      {
        "stepId": "inspecionarDespesaPendente",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Inspecionar despesa pendente",
        "description": "Consulta os dados informados e o comprovante da despesa."
      },
      {
        "stepId": "decidirAvaliacao",
        "kind": "decide",
        "entity": "Despesa",
        "title": "Decidir aprovação ou rejeição",
        "description": "Escolhe aprovar a despesa para pagamento ou rejeitá-la, informando o motivo da rejeição."
      },
      {
        "stepId": "registrarDecisaoDaDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "registrarDecisaoDaDespesa",
        "title": "Registrar decisão",
        "description": "Registra a aprovação para encaminhamento ao financeiro ou a rejeição com o motivo disponível ao colaborador."
      }
    ],
    "outcome": {
      "statement": "A despesa da equipe é aprovada para pagamento ou rejeitada com um motivo.",
      "evidence": [
        "A despesa aprovada pode ser localizada pelo financeiro.",
        "A despesa rejeitada contém o motivo informado pelo gestor."
      ]
    }
  },
  "businessHash": "sha256:773867de18c72931b624d9a621db7927b5fb71c729bc5826501da0b826f78cc1"
} as const satisfies Ns5JourneyArtifact;

export type AvaliarDespesaDaEquipeJourneyType = typeof avaliarDespesaDaEquipeJourney;

export default avaliarDespesaDaEquipeJourney;
