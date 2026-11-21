/// <mls fileReference="_102047_/l4/conteudo/journeys/editarConteudo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const editarConteudoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "editarConteudo",
  "business": {
    "actorRef": "editor",
    "title": "Editar conteúdo existente",
    "goal": "Abrir um arquivo markdown do blog, da documentação ou do site, ler, alterar o texto e salvar no repositório.",
    "icon": "file-pen",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "navegarPastas",
        "kind": "locate",
        "entity": "ContentFile",
        "title": "Navegar pelas pastas",
        "description": "O editor navega pelas pastas blog, docs e site e escolhe o arquivo que quer abrir.",
        "icon": "folder-open"
      },
      {
        "stepId": "abrirArquivo",
        "kind": "inspect",
        "entity": "ContentFile",
        "title": "Abrir e ler arquivo",
        "description": "O editor abre o arquivo e lê o texto markdown atual, trazido do repositório de conteúdo.",
        "icon": "file-text"
      },
      {
        "stepId": "salvarAlteracao",
        "kind": "act",
        "entity": "ContentFile",
        "effect": "update",
        "title": "Alterar e salvar",
        "description": "O editor altera o texto e salva; a gravação vai para o repositório pelo módulo de integração e a publicação fica registrada no histórico com quem e quando.",
        "icon": "save"
      }
    ],
    "outcome": {
      "statement": "O arquivo alterado está gravado no repositório de conteúdo e a publicação consta do histórico.",
      "evidence": [
        "O arquivo aberto de novo mostra o texto alterado",
        "O histórico de publicações mostra o editor e a data e hora da gravação"
      ]
    }
  },
  "businessHash": "sha256:cf1b8451631505581593d5ab768cade4ef8fc811e45f70958b19dff9ec927161"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type EditarConteudoJourneyType = typeof editarConteudoJourney;

export default editarConteudoJourney;
