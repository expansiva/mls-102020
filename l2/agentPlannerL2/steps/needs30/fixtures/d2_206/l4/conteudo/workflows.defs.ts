/// <mls fileReference="_102047_/l4/conteudo/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conteudoWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "conteudo",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "editarConteudo",
      "inProcess": false
    },
    {
      "journeyId": "criarConteudo",
      "inProcess": false
    },
    {
      "journeyId": "consultarHistorico",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type ConteudoWorkflowsType = typeof conteudoWorkflows;

export default conteudoWorkflows;
