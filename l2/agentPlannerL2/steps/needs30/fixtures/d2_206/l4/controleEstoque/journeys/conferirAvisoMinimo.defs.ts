/// <mls fileReference="_102047_/l4/controleEstoque/journeys/conferirAvisoMinimo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conferirAvisoMinimoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "conferirAvisoMinimo",
  "business": {
    "actorRef": "estoquista",
    "title": "Conferir aviso de mínimo",
    "goal": "Conferir o produto cujo saldo ficou abaixo do mínimo.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "verProdutoAvisado",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Ver produto avisado",
        "description": "Visualiza o produto do aviso, o saldo atual e o saldo mínimo."
      }
    ],
    "outcome": {
      "statement": "O estoquista confirma qual produto está abaixo do mínimo e qual é o saldo atual.",
      "evidence": [
        "O produto do aviso é exibido com saldo atual e mínimo."
      ]
    }
  },
  "businessHash": "sha256:67f2b66a55d711c7eba025ce4a30f9d39253cf46e1a5ac688d12372ef3a23466"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConferirAvisoMinimoJourneyType = typeof conferirAvisoMinimoJourney;

export default conferirAvisoMinimoJourney;
