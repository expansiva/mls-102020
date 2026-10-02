/// <mls fileReference="_102047_/l4/hiringPipeline/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "hiringPipeline",
  "inbound": [],
  "outbound": [
    {
      "id": "closeFilledPosition",
      "kind": "event",
      "to": "any",
      "event": "closeFilledPosition",
      "on": "JobPosition.closeFilledPosition",
      "description": "Publishes when a job position closes because its headcount has been filled.",
      "entityRefs": [
        "JobPosition"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type HiringPipelineIntegrationType = typeof hiringPipelineIntegration;

export default hiringPipelineIntegration;
