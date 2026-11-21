/// <mls fileReference="_102047_/l4/conteudo/journeys/consultarHistorico.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarHistoricoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarHistorico",
  "business": {
    "actorRef": "editor",
    "title": "Consultar histórico de publicações",
    "goal": "Ver o que cada pessoa publicou e quando.",
    "icon": "history",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarPublicacoes",
        "kind": "locate",
        "entity": "Publication",
        "title": "Listar publicações",
        "description": "O editor lista as publicações registradas, filtrando por pessoa, pasta ou período.",
        "icon": "list"
      },
      {
        "stepId": "verPublicacao",
        "kind": "inspect",
        "entity": "Publication",
        "title": "Ver detalhes da publicação",
        "description": "O editor vê quem publicou, qual arquivo e quando.",
        "icon": "eye"
      }
    ],
    "outcome": {
      "statement": "O editor sabe quem publicou cada conteúdo e quando.",
      "evidence": [
        "A lista mostra pessoa, arquivo e data e hora de cada publicação"
      ]
    }
  },
  "businessHash": "sha256:62cdd927edac18eace4b1b4903a80a647e906c5819a2d304febc23f15b17603b"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarHistoricoJourneyType = typeof consultarHistoricoJourney;

export default consultarHistoricoJourney;
