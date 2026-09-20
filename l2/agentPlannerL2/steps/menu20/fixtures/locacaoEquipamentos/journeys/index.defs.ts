/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "locacaoEquipamentos",
  "journeys": [
    {
      "journeyId": "criarContratoLocacao",
      "actorRef": "atendente",
      "title": "Criar contrato de locação"
    },
    {
      "journeyId": "registrarDevolucao",
      "actorRef": "atendente",
      "title": "Registrar devolução de equipamentos"
    },
    {
      "journeyId": "consultarSituacaoEquipamentos",
      "actorRef": "gerente",
      "title": "Consultar situação dos equipamentos"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type LocacaoEquipamentosJourneyIndexType = typeof locacaoEquipamentosJourneyIndex;

export default locacaoEquipamentosJourneyIndex;
