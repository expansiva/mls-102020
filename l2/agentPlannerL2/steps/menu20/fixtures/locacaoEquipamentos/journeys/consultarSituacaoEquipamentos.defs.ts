/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/consultarSituacaoEquipamentos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarSituacaoEquipamentosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarSituacaoEquipamentos",
  "business": {
    "actorRef": "gerente",
    "title": "Consultar situação dos equipamentos",
    "goal": "Acompanhar quais equipamentos estão disponíveis, locados ou em manutenção.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarEquipamentos",
        "kind": "locate",
        "entity": "Equipamento",
        "title": "x",
        "description": "Localiza os equipamentos da locadora."
      },
      {
        "stepId": "inspecionarSituacao",
        "kind": "inspect",
        "entity": "Equipamento",
        "title": "x",
        "description": "Consulta a situação de cada equipamento, incluindo disponibilidade, locação ou manutenção."
      }
    ],
    "outcome": {
      "statement": "O gerente acompanha a situação atual dos equipamentos da locadora.",
      "evidence": [
        "Situação de disponibilidade, locação ou manutenção exibida para os equipamentos."
      ]
    }
  },
  "businessHash": "sha256:f1c14d2846a3f38dd6d23318844f6e96c13e1f64792c0cf1b9ac0beca2b9c256"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarSituacaoEquipamentosJourneyType = typeof consultarSituacaoEquipamentosJourney;

export default consultarSituacaoEquipamentosJourney;
