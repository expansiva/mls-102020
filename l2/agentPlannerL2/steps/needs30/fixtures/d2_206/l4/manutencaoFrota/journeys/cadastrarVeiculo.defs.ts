/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/cadastrarVeiculo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarVeiculoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarVeiculo",
  "business": {
    "actorRef": "gestor",
    "title": "Cadastrar veículo da frota",
    "goal": "Cadastrar um veículo com placa, modelo, ano e quilometragem atual e atribuí-lo a um motorista.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "criarVeiculo",
        "kind": "act",
        "entity": "Veiculo",
        "effect": "create",
        "title": "Cadastrar veículo",
        "description": "O gestor informa placa, modelo, ano e quilometragem atual do veículo."
      },
      {
        "stepId": "atribuirMotorista",
        "kind": "act",
        "entity": "Veiculo",
        "effect": "update",
        "title": "Atribuir motorista",
        "description": "O gestor atribui o veículo ao motorista que vai dirigi-lo."
      }
    ],
    "outcome": {
      "statement": "O veículo está cadastrado na frota e atribuído a um motorista.",
      "evidence": [
        "O veículo aparece na lista da frota com placa, modelo, ano e km atual",
        "O motorista atribuído passa a ver o veículo"
      ]
    }
  },
  "businessHash": "sha256:a493b4a4a3168a07804981f767a00e31ec2baf6b101b4104e24eb1d37f235cf3"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarVeiculoJourneyType = typeof cadastrarVeiculoJourney;

export default cadastrarVeiculoJourney;
