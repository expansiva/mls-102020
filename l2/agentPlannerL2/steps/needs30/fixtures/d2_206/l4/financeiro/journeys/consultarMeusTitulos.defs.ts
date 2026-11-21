/// <mls fileReference="_102047_/l4/financeiro/journeys/consultarMeusTitulos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarMeusTitulosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarMeusTitulos",
  "business": {
    "actorRef": "pagador",
    "title": "Consultar meus títulos",
    "goal": "Ver os próprios títulos e recebimentos no portal.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarMeusTitulos",
        "kind": "locate",
        "entity": "TituloReceber",
        "title": "Ver meus títulos",
        "description": "O pagador vê no portal somente os próprios títulos, em aberto e quitados."
      },
      {
        "stepId": "verMeuTitulo",
        "kind": "inspect",
        "entity": "TituloReceber",
        "title": "Ver título e recebimentos",
        "description": "O pagador vê valor, vencimento, origem, saldo e os recebimentos do título."
      }
    ],
    "outcome": {
      "statement": "O pagador conhece a situação dos seus títulos e pagamentos.",
      "evidence": [
        "Lista apenas com títulos do próprio pagador",
        "Recebimentos exibidos em cada título"
      ]
    }
  },
  "businessHash": "sha256:5bed44ebdc9c4af14100aaa6c1526558054a44d06c329644d5666a498eba9d46"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarMeusTitulosJourneyType = typeof consultarMeusTitulosJourney;

export default consultarMeusTitulosJourney;
