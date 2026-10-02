/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/registrarEenviarDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarEenviarDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarEenviarDespesa",
  "business": {
    "actorRef": "colaborador",
    "title": "Registrar e enviar despesa para aprovação",
    "goal": "Cadastrar uma despesa própria e encaminhá-la ao gestor da equipe.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registrarDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "create",
        "title": "Registrar despesa",
        "description": "Informa data, categoria, valor, descrição e comprovante da própria despesa e a envia para avaliação do gestor da equipe."
      }
    ],
    "outcome": {
      "statement": "A despesa própria é registrada e enviada para avaliação do gestor da equipe.",
      "evidence": [
        "Existe uma despesa registrada com data, categoria, valor, descrição e comprovante.",
        "A despesa está disponível para avaliação pelo gestor da equipe."
      ]
    }
  },
  "businessHash": "sha256:daf110e2b12913d0e987805b4c2c56a82fc492c44460c75086b732c5f43420bc"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarEenviarDespesaJourneyType = typeof registrarEenviarDespesaJourney;

export default registrarEenviarDespesaJourney;
