/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/registrarAbastecimento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarAbastecimentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarAbastecimento",
  "business": {
    "actorRef": "motorista",
    "title": "Registrar abastecimento",
    "goal": "Registrar o abastecimento do veículo que o motorista dirige, com data, litros, valor e km no painel.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarVeiculo",
        "kind": "locate",
        "entity": "Veiculo",
        "title": "Localizar meu veículo",
        "description": "O motorista localiza, entre os veículos atribuídos a ele, o veículo que abasteceu."
      },
      {
        "stepId": "conferirVeiculo",
        "kind": "inspect",
        "entity": "Veiculo",
        "title": "Conferir dados do veículo",
        "description": "O motorista confere placa, modelo e quilometragem atual do veículo antes de registrar."
      },
      {
        "stepId": "lancarAbastecimento",
        "kind": "act",
        "entity": "Abastecimento",
        "effect": "create",
        "title": "Lançar abastecimento",
        "description": "O motorista informa data, litros, valor e km no painel; o km informado atualiza a quilometragem atual do veículo."
      }
    ],
    "outcome": {
      "statement": "O abastecimento fica registrado no veículo e a quilometragem atual do veículo é atualizada.",
      "evidence": [
        "O abastecimento aparece no histórico do veículo com data, litros, valor e km no painel",
        "A quilometragem atual do veículo passa a refletir o km informado"
      ]
    }
  },
  "businessHash": "sha256:6b44f45394ad782c9feb0c3c1ac77c37992437a1f76427d4ee68619ab0dd4251"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarAbastecimentoJourneyType = typeof registrarAbastecimentoJourney;

export default registrarAbastecimentoJourney;
