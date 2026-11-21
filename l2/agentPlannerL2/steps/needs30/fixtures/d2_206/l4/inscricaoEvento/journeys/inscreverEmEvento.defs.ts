/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/inscreverEmEvento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscreverEmEventoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "inscreverEmEvento",
  "business": {
    "actorRef": "publico",
    "title": "Inscrever-se em evento",
    "goal": "Garantir uma vaga ou um lugar na lista de espera de um evento publicado.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarEvento",
        "kind": "locate",
        "entity": "Evento",
        "title": "Abrir página do evento",
        "description": "A pessoa acessa a página pública de um evento publicado."
      },
      {
        "stepId": "verEvento",
        "kind": "inspect",
        "entity": "Evento",
        "title": "Ver detalhes do evento",
        "description": "A pessoa lê título, descrição, data, local e disponibilidade de vagas."
      },
      {
        "stepId": "criarInscricao",
        "kind": "act",
        "entity": "Inscricao",
        "effect": "create",
        "title": "Inscrever-se com nome e e-mail",
        "description": "A pessoa informa nome e e-mail; o mesmo e-mail só se inscreve uma vez por evento e, se as vagas acabaram, a inscrição entra na lista de espera por ordem de chegada."
      }
    ],
    "outcome": {
      "statement": "A pessoa está inscrita com vaga confirmada ou na lista de espera do evento.",
      "evidence": [
        "Inscrição registrada com situação confirmada ou em espera",
        "Posição na lista de espera exibida quando não há vaga"
      ]
    }
  },
  "businessHash": "sha256:5598d75b0bf4a6daf686be3ad593cd3cbb7e4c9ebdc9b9202c50ffdb549d72b1"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type InscreverEmEventoJourneyType = typeof inscreverEmEventoJourney;

export default inscreverEmEventoJourney;
