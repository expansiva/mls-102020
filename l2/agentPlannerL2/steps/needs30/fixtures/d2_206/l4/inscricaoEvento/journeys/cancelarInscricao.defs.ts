/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/cancelarInscricao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cancelarInscricaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarInscricao",
  "business": {
    "actorRef": "publico",
    "title": "Cancelar inscrição",
    "goal": "Cancelar a própria inscrição em um evento, liberando a vaga.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarInscricao",
        "kind": "locate",
        "entity": "Inscricao",
        "title": "Localizar minha inscrição",
        "description": "A pessoa localiza a própria inscrição no evento."
      },
      {
        "stepId": "verInscricao",
        "kind": "inspect",
        "entity": "Inscricao",
        "title": "Ver minha inscrição",
        "description": "A pessoa confere o evento e a situação da sua inscrição."
      },
      {
        "stepId": "cancelar",
        "kind": "act",
        "entity": "Inscricao",
        "effect": "transition",
        "transitionRef": "cancelar",
        "title": "Cancelar inscrição",
        "description": "A pessoa cancela a inscrição; se ela ocupava vaga, o primeiro da lista de espera é promovido automaticamente."
      }
    ],
    "outcome": {
      "statement": "A inscrição está cancelada e a vaga liberada foi passada ao primeiro da lista de espera, quando houver.",
      "evidence": [
        "Inscrição com situação cancelada",
        "Primeiro da lista de espera com situação confirmada"
      ]
    }
  },
  "businessHash": "sha256:cfb3890e0843f7a316c31eaceed2d58bc41b2b94f257eace62c8bd98239e5f55"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CancelarInscricaoJourneyType = typeof cancelarInscricaoJourney;

export default cancelarInscricaoJourney;
