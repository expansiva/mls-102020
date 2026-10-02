/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/registrarAbastecimento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarAbastecimentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarAbastecimento",
  "business": {
    "actorRef": "motorista",
    "title": "Registrar abastecimento do veículo dirigido",
    "goal": "Registrar o abastecimento de um veículo atribuído para manter o consumo e a quilometragem da frota atualizados.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarVeiculoAtribuido",
        "kind": "locate",
        "entity": "Vehicle",
        "title": "x",
        "description": "Localiza um veículo atribuído ao próprio motorista."
      },
      {
        "stepId": "inspecionarVeiculo",
        "kind": "inspect",
        "entity": "Vehicle",
        "title": "x",
        "description": "Confere a placa e a quilometragem atual do veículo antes de registrar o abastecimento."
      },
      {
        "stepId": "registrarAbastecimento",
        "kind": "act",
        "entity": "Fueling",
        "effect": "create",
        "title": "x",
        "description": "Registra a data, os litros, o valor e a quilometragem indicada no painel para o veículo selecionado."
      }
    ],
    "outcome": {
      "statement": "O abastecimento do veículo atribuído é registrado.",
      "evidence": [
        "Há um registro de abastecimento com data, litros, valor e quilometragem do painel vinculado ao veículo.",
        "A quilometragem atual do veículo reflete a leitura registrada quando ela for mais recente."
      ]
    }
  },
  "businessHash": "sha256:19515bd4930b4271afc54f8ae31e7ad94b7690eb069835fb308c4873e0adc027"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarAbastecimentoJourneyType = typeof registrarAbastecimentoJourney;

export default registrarAbastecimentoJourney;
