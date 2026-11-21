/// <mls fileReference="_102047_/l4/financeiro/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "financeiro",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "receberTitulo",
      "inProcess": false
    },
    {
      "journeyId": "estornarRecebimento",
      "inProcess": false
    },
    {
      "journeyId": "acompanharRecebiveis",
      "inProcess": false
    },
    {
      "journeyId": "emitirExtratoPagador",
      "inProcess": false
    },
    {
      "journeyId": "consultarMeusTitulos",
      "inProcess": false
    },
    {
      "journeyId": "pagarTituloCartao",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type FinanceiroWorkflowsType = typeof financeiroWorkflows;

export default financeiroWorkflows;
