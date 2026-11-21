/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/abrirOrdemDefeito.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const abrirOrdemDefeitoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirOrdemDefeito",
  "business": {
    "actorRef": "gestor",
    "title": "Abrir ordem por defeito",
    "goal": "Abrir uma ordem de manutenção corretiva quando um veículo apresenta defeito.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarVeiculoDefeito",
        "kind": "locate",
        "entity": "Veiculo",
        "title": "Localizar veículo",
        "description": "O gestor localiza o veículo com defeito pela placa."
      },
      {
        "stepId": "abrirOrdemCorretiva",
        "kind": "act",
        "entity": "OrdemManutencao",
        "effect": "create",
        "title": "Abrir ordem corretiva",
        "description": "O gestor abre a ordem informando oficina, descrição do defeito e data de entrada."
      }
    ],
    "outcome": {
      "statement": "O veículo com defeito tem uma ordem de manutenção aberta.",
      "evidence": [
        "A ordem aparece aberta no veículo com oficina, descrição e data de entrada"
      ]
    }
  },
  "businessHash": "sha256:d46d4407234d4974bbce80564a1d8567bf6ec85ea02dfe769c5dc6afeebee0a3"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AbrirOrdemDefeitoJourneyType = typeof abrirOrdemDefeitoJourney;

export default abrirOrdemDefeitoJourney;
