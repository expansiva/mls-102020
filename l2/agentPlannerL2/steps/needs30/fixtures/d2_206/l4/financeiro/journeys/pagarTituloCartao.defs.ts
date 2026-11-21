/// <mls fileReference="_102047_/l4/financeiro/journeys/pagarTituloCartao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const pagarTituloCartaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "pagarTituloCartao",
  "business": {
    "actorRef": "pagador",
    "title": "Pagar título com cartão",
    "goal": "Pagar pelo portal, com cartão, um título em aberto.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarTituloAberto",
        "kind": "locate",
        "entity": "TituloReceber",
        "title": "Escolher título em aberto",
        "description": "O pagador escolhe um dos próprios títulos em aberto."
      },
      {
        "stepId": "conferirValor",
        "kind": "inspect",
        "entity": "TituloReceber",
        "title": "Conferir valor a pagar",
        "description": "O pagador confere o saldo em aberto, o vencimento e a origem do título."
      },
      {
        "stepId": "pagarComCartao",
        "kind": "act",
        "entity": "Recebimento",
        "effect": "create",
        "title": "Pagar com cartão",
        "description": "O pagador paga o saldo com cartão via Stripe; o recebimento é registrado e o título fica quitado."
      }
    ],
    "outcome": {
      "statement": "O título é pago com cartão e aparece quitado no portal.",
      "evidence": [
        "Recebimento por cartão listado no título",
        "Título com situação quitado e saldo zero"
      ]
    }
  },
  "businessHash": "sha256:b35a0a5e33b7472bee857bce83976f01d02475110d37ee42f460486ec778a219"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type PagarTituloCartaoJourneyType = typeof pagarTituloCartaoJourney;

export default pagarTituloCartaoJourney;
