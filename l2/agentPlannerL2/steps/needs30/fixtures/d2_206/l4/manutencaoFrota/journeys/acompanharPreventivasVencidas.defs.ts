/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/acompanharPreventivasVencidas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharPreventivasVencidasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharPreventivasVencidas",
  "business": {
    "actorRef": "gestor",
    "title": "Acompanhar preventivas vencidas",
    "goal": "Consultar os veículos que passaram do km previsto para a próxima preventiva.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarVencidos",
        "kind": "locate",
        "entity": "PlanoManutencao",
        "title": "Listar preventivas vencidas",
        "description": "O gestor lista os planos cujo veículo já passou do km previsto."
      },
      {
        "stepId": "verPlanoVencido",
        "kind": "inspect",
        "entity": "PlanoManutencao",
        "title": "Ver detalhes da preventiva",
        "description": "O gestor confere o km previsto, a quilometragem atual e se já há ordem aberta."
      }
    ],
    "outcome": {
      "statement": "O gestor sabe quais veículos estão com preventiva vencida por quilometragem.",
      "evidence": [
        "A lista mostra veículo, km previsto e km atual de cada preventiva vencida"
      ]
    }
  },
  "businessHash": "sha256:c630473453a79fffcf1f393dcf9f42c71ee30f0b4c97c95e6d344b8a0b0c64c5"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharPreventivasVencidasJourneyType = typeof acompanharPreventivasVencidasJourney;

export default acompanharPreventivasVencidasJourney;
