/// <mls fileReference="_102047_/l4/controleEstoque/journeys/consultarSaldo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarSaldoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarSaldo",
  "business": {
    "actorRef": "estoquista",
    "title": "Consultar saldo",
    "goal": "Consultar o saldo atual de um produto e se está abaixo do mínimo.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarProdutoSaldo",
        "kind": "locate",
        "entity": "Produto",
        "title": "Localizar produto",
        "description": "Encontra o produto cujo saldo atual será consultado."
      },
      {
        "stepId": "verSaldoProduto",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Ver saldo atual",
        "description": "Visualiza o saldo atual, o saldo mínimo e se o produto está abaixo do mínimo."
      }
    ],
    "outcome": {
      "statement": "O estoquista vê o saldo atual do produto e se está abaixo do mínimo.",
      "evidence": [
        "O saldo atual do produto é exibido.",
        "A indicação de saldo abaixo do mínimo aparece quando for o caso."
      ]
    }
  },
  "businessHash": "sha256:d6ba0586a9407f00f5dd55ad9ece1a3c62a67bfc3ab0d6f9c2d4cc8569a8c1ab"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarSaldoJourneyType = typeof consultarSaldoJourney;

export default consultarSaldoJourney;
