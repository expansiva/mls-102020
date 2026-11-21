/// <mls fileReference="_102047_/l4/financeiro/journeys/estornarRecebimento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const estornarRecebimentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "estornarRecebimento",
  "business": {
    "actorRef": "caixa",
    "title": "Estornar recebimento do dia",
    "goal": "Desfazer um recebimento registrado por engano no mesmo dia.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarRecebimento",
        "kind": "locate",
        "entity": "Recebimento",
        "title": "Localizar recebimento do dia",
        "description": "O caixa busca entre os recebimentos registrados hoje o que precisa ser estornado."
      },
      {
        "stepId": "conferirRecebimento",
        "kind": "inspect",
        "entity": "Recebimento",
        "title": "Conferir recebimento",
        "description": "O caixa confere título, valor, forma de pagamento e data do recebimento."
      },
      {
        "stepId": "estornar",
        "kind": "act",
        "entity": "Recebimento",
        "effect": "transition",
        "transitionRef": "estornar",
        "title": "Estornar recebimento",
        "description": "O caixa estorna o recebimento, permitido apenas no mesmo dia, e o saldo em aberto do título é restabelecido."
      }
    ],
    "outcome": {
      "statement": "O recebimento fica estornado e o título volta a ter o saldo em aberto correspondente.",
      "evidence": [
        "Recebimento com situação estornado",
        "Saldo em aberto do título restabelecido"
      ]
    }
  },
  "businessHash": "sha256:d63137ac5acb49f148dce3b4e4a705d746dd58cad8e77422375652457288c9d3"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type EstornarRecebimentoJourneyType = typeof estornarRecebimentoJourney;

export default estornarRecebimentoJourney;
