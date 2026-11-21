/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/cadastrarPublicarEvento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarPublicarEventoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPublicarEvento",
  "business": {
    "actorRef": "organizador",
    "title": "Cadastrar e publicar evento",
    "goal": "Criar um evento com título, descrição, data, local e número de vagas e publicá-lo para receber inscrições.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "criarEvento",
        "kind": "act",
        "entity": "Evento",
        "effect": "create",
        "title": "Cadastrar novo evento",
        "description": "O organizador informa título, descrição, data, local e número de vagas e salva o evento como rascunho."
      },
      {
        "stepId": "revisarEvento",
        "kind": "inspect",
        "entity": "Evento",
        "title": "Revisar dados do evento",
        "description": "O organizador confere os dados do evento antes de publicá-lo."
      },
      {
        "stepId": "publicarEvento",
        "kind": "act",
        "entity": "Evento",
        "effect": "transition",
        "transitionRef": "publicar",
        "title": "Publicar evento",
        "description": "O organizador publica o evento, que passa a ter uma página pública aberta a inscrições."
      }
    ],
    "outcome": {
      "statement": "O evento está publicado e sua página pública aceita inscrições.",
      "evidence": [
        "Evento com situação publicado",
        "Página pública do evento acessível"
      ]
    }
  },
  "businessHash": "sha256:8feca3ccd20729f6d5d95152a70b4a740cfb3854ef939f465a975bab8faf1938"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarPublicarEventoJourneyType = typeof cadastrarPublicarEventoJourney;

export default cadastrarPublicarEventoJourney;
