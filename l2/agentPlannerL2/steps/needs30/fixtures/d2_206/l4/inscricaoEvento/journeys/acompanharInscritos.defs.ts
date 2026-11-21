/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/acompanharInscritos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharInscritosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharInscritos",
  "business": {
    "actorRef": "organizador",
    "title": "Acompanhar inscritos do evento",
    "goal": "Ver os inscritos, o total de vagas ocupadas e baixar a lista em CSV.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarEventoOrg",
        "kind": "locate",
        "entity": "Evento",
        "title": "Localizar evento",
        "description": "O organizador localiza o evento entre os eventos cadastrados."
      },
      {
        "stepId": "verOcupacao",
        "kind": "inspect",
        "entity": "Evento",
        "title": "Ver vagas ocupadas",
        "description": "O organizador vê o total de vagas ocupadas, as vagas restantes e o tamanho da lista de espera."
      },
      {
        "stepId": "verInscritos",
        "kind": "inspect",
        "entity": "Inscricao",
        "title": "Ver lista de inscritos",
        "description": "O organizador vê os inscritos com nome, e-mail, situação e ordem de chegada."
      },
      {
        "stepId": "baixarCsv",
        "kind": "inspect",
        "entity": "Inscricao",
        "title": "Baixar lista em CSV",
        "description": "O organizador baixa a lista de inscritos do evento em arquivo CSV."
      }
    ],
    "outcome": {
      "statement": "O organizador conhece a ocupação do evento e tem a lista de inscritos em CSV.",
      "evidence": [
        "Total de vagas ocupadas exibido",
        "Arquivo CSV com os inscritos baixado"
      ]
    }
  },
  "businessHash": "sha256:3fb13d9b3477d9f9a70e055b8a28154b03dc7e3d1374d29ad8f24e199d666f17"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharInscritosJourneyType = typeof acompanharInscritosJourney;

export default acompanharInscritosJourney;
