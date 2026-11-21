/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/consultarMeusAbastecimentos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarMeusAbastecimentosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarMeusAbastecimentos",
  "business": {
    "actorRef": "motorista",
    "title": "Consultar meus abastecimentos",
    "goal": "Consultar os abastecimentos já registrados nos veículos atribuídos ao motorista.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarAbastecimentos",
        "kind": "locate",
        "entity": "Abastecimento",
        "title": "Listar meus abastecimentos",
        "description": "O motorista lista os abastecimentos dos veículos atribuídos a ele, filtrando por veículo ou período."
      },
      {
        "stepId": "verAbastecimento",
        "kind": "inspect",
        "entity": "Abastecimento",
        "title": "Ver detalhes do abastecimento",
        "description": "O motorista abre um abastecimento para conferir data, litros, valor e km no painel."
      }
    ],
    "outcome": {
      "statement": "O motorista visualiza os abastecimentos dos veículos que dirige.",
      "evidence": [
        "A lista mostra apenas abastecimentos de veículos atribuídos ao motorista"
      ]
    }
  },
  "businessHash": "sha256:c629a0829674a4f4b3f261676d4bd802850998f6ac098ef6de52613e32fbb582"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarMeusAbastecimentosJourneyType = typeof consultarMeusAbastecimentosJourney;

export default consultarMeusAbastecimentosJourney;
