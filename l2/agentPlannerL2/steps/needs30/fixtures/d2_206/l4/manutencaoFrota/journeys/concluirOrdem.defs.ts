/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/concluirOrdem.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const concluirOrdemJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "concluirOrdem",
  "business": {
    "actorRef": "gestor",
    "title": "Concluir ordem de manutenção",
    "goal": "Registrar a saída do veículo da oficina e o custo final da ordem de manutenção.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdem",
        "kind": "locate",
        "entity": "OrdemManutencao",
        "title": "Localizar ordem aberta",
        "description": "O gestor localiza a ordem aberta pelo veículo ou pela oficina."
      },
      {
        "stepId": "verOrdem",
        "kind": "inspect",
        "entity": "OrdemManutencao",
        "title": "Conferir ordem",
        "description": "O gestor confere oficina, descrição e data de entrada da ordem."
      },
      {
        "stepId": "registrarConclusao",
        "kind": "act",
        "entity": "OrdemManutencao",
        "effect": "transition",
        "transitionRef": "concluir",
        "title": "Registrar saída e custo",
        "description": "O gestor informa a data de saída e o custo e conclui a ordem; se for preventiva, o próximo vencimento do plano é recalculado."
      }
    ],
    "outcome": {
      "statement": "A ordem está concluída com data de saída e custo registrados.",
      "evidence": [
        "A ordem aparece como concluída com data de saída e custo",
        "O plano preventivo vinculado exibe o novo km ou data prevista"
      ]
    }
  },
  "businessHash": "sha256:925c1f266f72ddfde070bae3679feb883707f268eaf3c81a541d29102db29437"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConcluirOrdemJourneyType = typeof concluirOrdemJourney;

export default concluirOrdemJourney;
