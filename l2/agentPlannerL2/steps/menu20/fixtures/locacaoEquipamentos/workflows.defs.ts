/// <mls fileReference="_102047_/l4/locacaoEquipamentos/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "locacaoEquipamentos",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "criarContratoLocacao",
      "inProcess": false
    },
    {
      "journeyId": "registrarDevolucao",
      "inProcess": false
    },
    {
      "journeyId": "consultarSituacaoEquipamentos",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type LocacaoEquipamentosWorkflowsType = typeof locacaoEquipamentosWorkflows;

export default locacaoEquipamentosWorkflows;
