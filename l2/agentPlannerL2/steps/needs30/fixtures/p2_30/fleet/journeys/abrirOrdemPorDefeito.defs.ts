/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/abrirOrdemPorDefeito.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirOrdemPorDefeitoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirOrdemPorDefeito",
  "business": {
    "actorRef": "gestor",
    "title": "Abrir ordem de manutenção por defeito",
    "goal": "Registrar uma ordem para reparar um defeito identificado em um veículo da frota.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarVeiculoComDefeito",
        "kind": "locate",
        "entity": "Vehicle",
        "title": "x",
        "description": "Localiza o veículo da frota que apresentou defeito."
      },
      {
        "stepId": "inspecionarVeiculoComDefeito",
        "kind": "inspect",
        "entity": "Vehicle",
        "title": "x",
        "description": "Confere os dados do veículo antes de abrir a ordem de manutenção."
      },
      {
        "stepId": "abrirOrdemPorDefeito",
        "kind": "act",
        "entity": "MaintenanceOrder",
        "effect": "create",
        "title": "x",
        "description": "Abre a ordem de manutenção vinculada ao veículo, informando oficina, descrição do defeito, custo previsto quando disponível e data de entrada."
      }
    ],
    "outcome": {
      "statement": "Uma ordem de manutenção por defeito é aberta para o veículo.",
      "evidence": [
        "Há uma ordem vinculada ao veículo com a oficina, a descrição e a data de entrada.",
        "O custo e a data de saída podem ser registrados na ordem conforme o serviço avança."
      ]
    }
  },
  "businessHash": "sha256:97ecd6069b3817928940017423eadd3be6a320cea67d1e42847dd53f2339aa1e"
} as const satisfies Ns5JourneyArtifact;

export type AbrirOrdemPorDefeitoJourneyType = typeof abrirOrdemPorDefeitoJourney;

export default abrirOrdemPorDefeitoJourney;
