/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/registrarDevolucao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarDevolucaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarDevolucao",
  "business": {
    "actorRef": "atendente",
    "title": "Registrar devolução de equipamentos",
    "goal": "Registrar a data real de devolução e concluir a locação.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarContrato",
        "kind": "locate",
        "entity": "ContratoLocacao",
        "title": "x",
        "description": "Localiza o contrato de locação em aberto, usando o contrato já em contexto quando disponível."
      },
      {
        "stepId": "inspecionarContrato",
        "kind": "inspect",
        "entity": "ContratoLocacao",
        "title": "x",
        "description": "Confere os equipamentos locados e a data prevista de devolução."
      },
      {
        "stepId": "registrarDevolucao",
        "kind": "act",
        "entity": "ContratoLocacao",
        "effect": "transition",
        "transitionRef": "registrarDevolucao",
        "title": "x",
        "description": "Registra a data real de devolução, conclui a locação e permite o cálculo da multa quando houver atraso."
      }
    ],
    "outcome": {
      "statement": "A devolução é registrada e a multa por atraso, quando aplicável, fica calculada no contrato.",
      "evidence": [
        "Data real de devolução registrada no contrato.",
        "Multa calculada quando a devolução ocorre após a data prevista."
      ]
    }
  },
  "businessHash": "sha256:9a4f219495ee6e76edd98cfc455d1a7cebebb604d94db515c44f92ca41a207a3"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarDevolucaoJourneyType = typeof registrarDevolucaoJourney;

export default registrarDevolucaoJourney;
