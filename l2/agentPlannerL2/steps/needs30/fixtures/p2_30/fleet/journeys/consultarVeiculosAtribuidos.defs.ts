/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/consultarVeiculosAtribuidos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarVeiculosAtribuidosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarVeiculosAtribuidos",
  "business": {
    "actorRef": "motorista",
    "title": "Consultar veículos atribuídos",
    "goal": "Ver os veículos que estão atribuídos ao próprio motorista e suas informações de operação.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarVeiculosAtribuidos",
        "kind": "locate",
        "entity": "Vehicle",
        "title": "x",
        "description": "Localiza somente os veículos atribuídos ao próprio motorista."
      },
      {
        "stepId": "inspecionarVeiculoAtribuido",
        "kind": "inspect",
        "entity": "Vehicle",
        "title": "x",
        "description": "Consulta placa, modelo, ano e quilometragem atual do veículo selecionado."
      }
    ],
    "outcome": {
      "statement": "O motorista consulta os dados de um veículo que lhe está atribuído.",
      "evidence": [
        "O veículo consultado está vinculado ao motorista.",
        "A placa, o modelo, o ano e a quilometragem atual ficam disponíveis para consulta."
      ]
    }
  },
  "businessHash": "sha256:74ecbc93a09c3f191a1716248dfc0d1fcf0751f71babf08dac8a806dce8cf72d"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarVeiculosAtribuidosJourneyType = typeof consultarVeiculosAtribuidosJourney;

export default consultarVeiculosAtribuidosJourney;
