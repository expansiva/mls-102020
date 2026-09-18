/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/acompanharIndicadoresAcademia.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharIndicadoresAcademiaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharIndicadoresAcademia",
  "business": {
    "actorRef": "gerencia",
    "title": "Acompanhar indicadores da academia",
    "goal": "Consultar os indicadores financeiros e de alunos do período.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "inspecionarIndicadores",
        "kind": "inspect",
        "entity": "Mensalidade",
        "title": "x",
        "description": "Consulta o painel com total a receber no mês, total recebido, quantidade de alunos ativos, bloqueados e inadimplentes."
      }
    ],
    "outcome": {
      "statement": "A gerência visualiza a posição financeira e a situação dos alunos da academia.",
      "evidence": [
        "Painel exibe os totais a receber e recebidos no mês.",
        "Painel exibe as quantidades de alunos ativos, bloqueados e inadimplentes."
      ]
    }
  },
  "businessHash": "sha256:e3016ac537483927333e7a5716882622b3258345db01e6057a40b9b7b16f121e"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharIndicadoresAcademiaJourneyType = typeof acompanharIndicadoresAcademiaJourney;

export default acompanharIndicadoresAcademiaJourney;
