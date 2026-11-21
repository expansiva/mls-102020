/// <mls fileReference="_102047_/l4/agendaClinica/journeys/confirmarConsulta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const confirmarConsultaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "confirmarConsulta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Confirmar consulta",
    "goal": "Registrar a confirmação telefônica de uma consulta agendada.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsulta",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar consulta",
        "description": "A recepcionista localiza a consulta agendada que foi confirmada por telefone."
      },
      {
        "stepId": "conferirDadosConsulta",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "Conferir dados consulta",
        "description": "A recepcionista confere os dados da consulta antes de registrar a confirmação telefônica."
      },
      {
        "stepId": "confirmarAgendamento",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "confirmarConsulta",
        "title": "Confirmar consulta",
        "description": "A recepcionista registra que o paciente confirmou a consulta por telefone."
      }
    ],
    "outcome": {
      "statement": "A consulta passa a constar como confirmada.",
      "evidence": [
        "A consulta exibe a confirmação registrada.",
        "A confirmação fica visível na agenda da consulta."
      ]
    }
  },
  "businessHash": "sha256:677e6a84744bb17086d04d4f2ad1dc3d395f596c8a36341570af276ba7a79a4e"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConfirmarConsultaJourneyType = typeof confirmarConsultaJourney;

export default confirmarConsultaJourney;
