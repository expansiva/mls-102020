/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "manutencaoFrota",
  "journeys": [
    {
      "journeyId": "registrarAbastecimento",
      "actorRef": "motorista",
      "title": "Registrar abastecimento"
    },
    {
      "journeyId": "consultarMeusAbastecimentos",
      "actorRef": "motorista",
      "title": "Consultar meus abastecimentos"
    },
    {
      "journeyId": "cadastrarVeiculo",
      "actorRef": "gestor",
      "title": "Cadastrar veículo da frota"
    },
    {
      "journeyId": "cadastrarPlanoPreventiva",
      "actorRef": "gestor",
      "title": "Cadastrar plano de preventiva"
    },
    {
      "journeyId": "abrirOrdemPlanoVencido",
      "actorRef": "gestor",
      "title": "Abrir ordem por preventiva vencida"
    },
    {
      "journeyId": "abrirOrdemDefeito",
      "actorRef": "gestor",
      "title": "Abrir ordem por defeito"
    },
    {
      "journeyId": "concluirOrdem",
      "actorRef": "gestor",
      "title": "Concluir ordem de manutenção"
    },
    {
      "journeyId": "acompanharPreventivasVencidas",
      "actorRef": "gestor",
      "title": "Acompanhar preventivas vencidas"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type ManutencaoFrotaJourneyIndexType = typeof manutencaoFrotaJourneyIndex;

export default manutencaoFrotaJourneyIndex;
