/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/abrirOrdemPlanoVencido.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const abrirOrdemPlanoVencidoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirOrdemPlanoVencido",
  "business": {
    "actorRef": "gestor",
    "title": "Abrir ordem por preventiva vencida",
    "goal": "Abrir uma ordem de manutenção quando o aviso indica que o veículo passou do km previsto da preventiva.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "verAvisoPlano",
        "kind": "inspect",
        "entity": "PlanoManutencao",
        "title": "Ver preventiva vencida",
        "description": "O gestor abre o aviso e confere o plano, o km previsto e a quilometragem atual do veículo."
      },
      {
        "stepId": "abrirOrdemPlano",
        "kind": "act",
        "entity": "OrdemManutencao",
        "effect": "create",
        "title": "Abrir ordem preventiva",
        "description": "O gestor abre a ordem vinculada ao plano, informando oficina, descrição e data de entrada."
      }
    ],
    "outcome": {
      "statement": "A preventiva vencida tem uma ordem de manutenção aberta.",
      "evidence": [
        "A ordem aparece aberta com oficina, descrição e data de entrada",
        "O plano mostra a ordem vinculada"
      ]
    }
  },
  "businessHash": "sha256:d9354848392286fe64047e506f0544da841ff988cad14e9deb4d47b06ca6e785"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AbrirOrdemPlanoVencidoJourneyType = typeof abrirOrdemPlanoVencidoJourney;

export default abrirOrdemPlanoVencidoJourney;
