/// <mls fileReference="_102047_/l4/manutencaoFrota/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "manutencaoFrota",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "registrarAbastecimento",
      "inProcess": false
    },
    {
      "journeyId": "consultarVeiculosAtribuidos",
      "inProcess": false
    },
    {
      "journeyId": "cadastrarPlanoPreventivo",
      "inProcess": false
    },
    {
      "journeyId": "abrirOrdemPorDefeito",
      "inProcess": false
    },
    {
      "journeyId": "tratarAlertaPreventivaVencida",
      "inProcess": false
    },
    {
      "journeyId": "atualizarOrdemManutencao",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type ManutencaoFrotaWorkflowsType = typeof manutencaoFrotaWorkflows;

export default manutencaoFrotaWorkflows;
