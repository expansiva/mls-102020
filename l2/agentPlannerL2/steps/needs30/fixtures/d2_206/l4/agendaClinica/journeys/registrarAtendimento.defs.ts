/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarAtendimento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarAtendimentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarAtendimento",
  "business": {
    "actorRef": "profissional",
    "title": "Registrar atendimento",
    "goal": "Marcar uma consulta como atendida e registrar uma anotação do atendimento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaDoDia",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar consulta",
        "description": "O profissional localiza em sua própria agenda a consulta realizada."
      },
      {
        "stepId": "registrarAtendimentoRealizado",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarAtendimento",
        "title": "Registrar atendimento",
        "description": "O profissional marca a consulta como atendida e registra a anotação do atendimento."
      }
    ],
    "outcome": {
      "statement": "A consulta fica registrada como atendida com a anotação do profissional.",
      "evidence": [
        "A situação da consulta indica atendimento realizado.",
        "A anotação registrada pelo profissional está associada à consulta."
      ]
    }
  },
  "businessHash": "sha256:4753e0adf4ffd868f22d7807c806e1b2b2c463b1f8962d23103be5011101936f"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarAtendimentoJourneyType = typeof registrarAtendimentoJourney;

export default registrarAtendimentoJourney;
