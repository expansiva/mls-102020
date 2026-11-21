/// <mls fileReference="_102039_/l4/onboarding/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "onboarding",
  "inbound": [],
  "outbound": [],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type OnboardingIntegrationType = typeof onboardingIntegration;

export default onboardingIntegration;
