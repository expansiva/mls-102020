/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarFalta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarFaltaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarFalta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Registrar falta",
    "goal": "Registrar que o paciente não compareceu à consulta.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaAusente",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar consulta",
        "description": "A recepcionista localiza a consulta cujo paciente não compareceu."
      },
      {
        "stepId": "marcarFalta",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarFalta",
        "title": "Registrar falta",
        "description": "A recepcionista marca a consulta como falta do paciente."
      }
    ],
    "outcome": {
      "statement": "A consulta fica registrada como falta.",
      "evidence": [
        "A situação da consulta indica falta do paciente.",
        "A consulta não permanece pendente de atendimento."
      ]
    }
  },
  "businessHash": "sha256:21441774896dd23441d25cc6959c5cb63fd9451f305ef6c2a905d9da2c4bd0fe"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarFaltaJourneyType = typeof registrarFaltaJourney;

export default registrarFaltaJourney;
