/// <mls fileReference="_102047_/l4/hiringPipeline/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "hiringPipeline",
  "inbound": [],
  "outbound": [
    {
      "id": "candidateHired",
      "kind": "event",
      "to": "any",
      "event": "candidateHired",
      "on": "Application.hire",
      "description": "Published when the hiring manager hires the candidate on an application. Other modules can use the hired application record, with its candidate and job position, to start their own work (for example, onboarding or payroll).",
      "entityRefs": [
        "Application",
        "Candidate",
        "JobPosition"
      ]
    },
    {
      "id": "jobPositionClosed",
      "kind": "event",
      "to": "any",
      "event": "jobPositionClosed",
      "on": "JobPosition.close",
      "description": "Published when a job position closes automatically because its headcount is filled. Other modules can use it to know the position is no longer open.",
      "entityRefs": [
        "JobPosition"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type HiringPipelineIntegrationType = typeof hiringPipelineIntegration;

export default hiringPipelineIntegration;
