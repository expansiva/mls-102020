/// <mls fileReference="_102047_/l4/financeiro/journeys/acompanharRecebiveis.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharRecebiveisJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharRecebiveis",
  "business": {
    "actorRef": "gerenteFinanceiro",
    "title": "Acompanhar recebíveis e vencidos",
    "goal": "Ver os recebíveis da organização por período e por origem e identificar os títulos vencidos e não quitados.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "filtrarRecebiveis",
        "kind": "locate",
        "entity": "TituloReceber",
        "title": "Escolher período e origem",
        "description": "O gerente escolhe o período e, se quiser, a origem (restaurante, academia, assistência técnica)."
      },
      {
        "stepId": "verPainel",
        "kind": "inspect",
        "entity": "TituloReceber",
        "title": "Ver painel de recebíveis",
        "description": "O gerente vê os totais a receber, recebidos e em aberto agrupados por período e por origem."
      },
      {
        "stepId": "listarVencidos",
        "kind": "locate",
        "entity": "TituloReceber",
        "title": "Listar títulos vencidos",
        "description": "O gerente lista os títulos com vencimento passado e saldo em aberto, podendo filtrar por origem ou pagador."
      },
      {
        "stepId": "verTituloVencido",
        "kind": "inspect",
        "entity": "TituloReceber",
        "title": "Ver detalhe do título",
        "description": "O gerente vê pagador, valor, saldo, dias de atraso, origem e recebimentos parciais do título vencido."
      }
    ],
    "outcome": {
      "statement": "O gerente conhece a posição dos recebíveis no período e por origem e sabe quais títulos estão vencidos, de quem e de qual origem.",
      "evidence": [
        "Totais a receber, recebidos e em aberto exibidos por origem no período escolhido",
        "Lista de títulos vencidos com saldo e dias de atraso",
        "Detalhe do título vencido com recebimentos parciais"
      ]
    }
  },
  "businessHash": "sha256:f70fc05b65aa8ea226f509bb7614773cb77aaba7b32355eb5e6a4431430e7955"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharRecebiveisJourneyType = typeof acompanharRecebiveisJourney;

export default acompanharRecebiveisJourney;
