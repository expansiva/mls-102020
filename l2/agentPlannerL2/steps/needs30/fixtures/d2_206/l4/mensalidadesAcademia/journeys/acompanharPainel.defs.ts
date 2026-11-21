/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/acompanharPainel.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharPainelJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharPainel",
  "business": {
    "actorRef": "gerencia",
    "title": "Acompanhar painel financeiro",
    "goal": "Acompanhar total a receber e recebido no mês e a quantidade de alunos ativos, bloqueados e inadimplentes.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "verPainel",
        "kind": "inspect",
        "entity": "PainelMensalidades",
        "title": "Ver painel do mês",
        "description": "A gerência vê o total a receber no mês, o total recebido e as quantidades de alunos ativos, bloqueados e inadimplentes."
      },
      {
        "stepId": "detalharInadimplentes",
        "kind": "locate",
        "entity": "Mensalidade",
        "title": "Detalhar mensalidades vencidas",
        "description": "A gerência abre a lista de mensalidades vencidas para ver quais alunos estão inadimplentes."
      }
    ],
    "outcome": {
      "statement": "A gerência conhece a situação financeira do mês.",
      "evidence": [
        "O painel exibe total a receber, total recebido e as contagens de alunos ativos, bloqueados e inadimplentes."
      ]
    }
  },
  "businessHash": "sha256:3bf0f64cbb242b5dc17c164bced46c87a2c5a182216acc0d7d5dd137d87654b9"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharPainelJourneyType = typeof acompanharPainelJourney;

export default acompanharPainelJourney;
