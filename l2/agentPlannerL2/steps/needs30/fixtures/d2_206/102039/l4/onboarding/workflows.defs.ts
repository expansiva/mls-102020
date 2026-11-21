/// <mls fileReference="_102039_/l4/onboarding/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "onboarding",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "completeMyAccess",
      "inProcess": false
    },
    {
      "journeyId": "prepareCompany",
      "inProcess": false
    },
    {
      "journeyId": "maintainCountries",
      "inProcess": false
    },
    {
      "journeyId": "publishPrivacyText",
      "inProcess": false
    },
    {
      "journeyId": "reviewOrganizationPeople",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type OnboardingWorkflowsType = typeof onboardingWorkflows;

export default onboardingWorkflows;
