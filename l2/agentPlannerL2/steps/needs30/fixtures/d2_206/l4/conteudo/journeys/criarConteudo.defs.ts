/// <mls fileReference="_102047_/l4/conteudo/journeys/criarConteudo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const criarConteudoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "criarConteudo",
  "business": {
    "actorRef": "editor",
    "title": "Criar conteúdo novo",
    "goal": "Criar um novo arquivo markdown escolhendo a pasta, o título e o texto e gravá-lo no repositório.",
    "icon": "file-plus",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "escolherPasta",
        "kind": "locate",
        "entity": "ContentFile",
        "title": "Escolher a pasta",
        "description": "O editor escolhe a pasta onde o conteúdo novo ficará: blog, docs ou site.",
        "icon": "folder"
      },
      {
        "stepId": "criarArquivo",
        "kind": "act",
        "entity": "ContentFile",
        "effect": "create",
        "title": "Informar título e texto",
        "description": "O editor informa o título e o texto e salva; o arquivo é gravado no repositório pelo módulo de integração e a publicação entra no histórico.",
        "icon": "file-plus"
      }
    ],
    "outcome": {
      "statement": "O novo conteúdo existe no repositório, na pasta escolhida, e aparece na lista de arquivos.",
      "evidence": [
        "O arquivo novo aparece na pasta escolhida",
        "O histórico de publicações registra a criação com o editor e a data e hora"
      ]
    }
  },
  "businessHash": "sha256:658c34db50829176103a48253a5bf7552edc0c2a61d391bd474f16fc4d6b908d"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CriarConteudoJourneyType = typeof criarConteudoJourney;

export default criarConteudoJourney;
