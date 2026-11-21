/// <mls fileReference="_102047_/l4/financeiro/journeys/emitirExtratoPagador.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const emitirExtratoPagadorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "emitirExtratoPagador",
  "business": {
    "actorRef": "gerenteFinanceiro",
    "title": "Emitir extrato por pagador",
    "goal": "Emitir o extrato de títulos e recebimentos de um pagador.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPagador",
        "kind": "locate",
        "entity": "Pagador",
        "title": "Localizar pagador",
        "description": "O gerente busca o pagador pelo nome ou documento."
      },
      {
        "stepId": "verExtrato",
        "kind": "inspect",
        "entity": "TituloReceber",
        "title": "Ver extrato do pagador",
        "description": "O gerente vê os títulos do pagador no período com seus recebimentos, estornos e saldo."
      },
      {
        "stepId": "emitirExtrato",
        "kind": "inspect",
        "entity": "TituloReceber",
        "title": "Emitir extrato",
        "description": "O gerente exporta ou imprime o extrato do pagador."
      }
    ],
    "outcome": {
      "statement": "O extrato do pagador é emitido com títulos, recebimentos e saldo do período.",
      "evidence": [
        "Extrato com títulos, recebimentos e saldo em aberto",
        "Arquivo ou impressão do extrato gerado"
      ]
    }
  },
  "businessHash": "sha256:85910986b617f410a20f5a45f07193ff32b370de327c4bbb7c78c022d0214f94"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type EmitirExtratoPagadorJourneyType = typeof emitirExtratoPagadorJourney;

export default emitirExtratoPagadorJourney;
