/// <mls fileReference="_102047_/l4/manutencaoFrota/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

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
      "journeyId": "consultarMeusAbastecimentos",
      "inProcess": false
    },
    {
      "journeyId": "cadastrarVeiculo",
      "inProcess": false
    },
    {
      "journeyId": "cadastrarPlanoPreventiva",
      "inProcess": false
    },
    {
      "journeyId": "abrirOrdemPlanoVencido",
      "inProcess": false
    },
    {
      "journeyId": "abrirOrdemDefeito",
      "inProcess": false
    },
    {
      "journeyId": "concluirOrdem",
      "inProcess": false
    },
    {
      "journeyId": "acompanharPreventivasVencidas",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type ManutencaoFrotaWorkflowsType = typeof manutencaoFrotaWorkflows;

export default manutencaoFrotaWorkflows;
