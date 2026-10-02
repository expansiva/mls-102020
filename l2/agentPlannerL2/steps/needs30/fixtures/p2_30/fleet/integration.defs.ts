/// <mls fileReference="_102047_/l4/manutencaoFrota/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "manutencaoFrota",
  "inbound": [],
  "outbound": [
    {
      "id": "alertaPreventivaVencida",
      "kind": "event",
      "to": "any",
      "event": "alertaPreventivaVencida",
      "on": "Fueling.create",
      "description": "Publica um alerta de preventiva vencida quando o abastecimento registrado indicar que o veículo ultrapassou a quilometragem prevista no plano de manutenção preventiva.",
      "entityRefs": [
        "Fueling",
        "Vehicle",
        "MaintenancePlan"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type ManutencaoFrotaIntegrationType = typeof manutencaoFrotaIntegration;

export default manutencaoFrotaIntegration;
