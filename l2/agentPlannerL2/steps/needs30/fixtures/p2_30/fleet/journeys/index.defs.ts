/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "manutencaoFrota",
  "journeys": [
    {
      "journeyId": "registrarAbastecimento",
      "actorRef": "motorista",
      "title": "Registrar abastecimento do veículo dirigido"
    },
    {
      "journeyId": "consultarVeiculosAtribuidos",
      "actorRef": "motorista",
      "title": "Consultar veículos atribuídos"
    },
    {
      "journeyId": "cadastrarPlanoPreventivo",
      "actorRef": "gestor",
      "title": "Cadastrar plano de manutenção preventiva"
    },
    {
      "journeyId": "abrirOrdemPorDefeito",
      "actorRef": "gestor",
      "title": "Abrir ordem de manutenção por defeito"
    },
    {
      "journeyId": "tratarAlertaPreventivaVencida",
      "actorRef": "gestor",
      "title": "Tratar alerta de manutenção preventiva vencida"
    },
    {
      "journeyId": "atualizarOrdemManutencao",
      "actorRef": "gestor",
      "title": "Atualizar ordem de manutenção"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type ManutencaoFrotaJourneyIndexType = typeof manutencaoFrotaJourneyIndex;

export default manutencaoFrotaJourneyIndex;
