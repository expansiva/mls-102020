/// <mls fileReference="_102047_/l4/compras/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const comprasIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "compras",
  "inbound": [],
  "outbound": [
    {
      "id": "recebimentoRegistrado",
      "kind": "event",
      "to": "controleEstoque",
      "event": "recebimentoRegistrado",
      "on": "GoodsReceipt.create",
      "description": "Publica o recebimento registrado para que o controle de estoque dê entrada nos produtos recebidos.",
      "entityRefs": [
        "GoodsReceipt"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type ComprasIntegrationType = typeof comprasIntegration;

export default comprasIntegration;
