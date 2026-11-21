/// <mls fileReference="_102039_/l4/onboarding/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "onboarding",
  "journeys": [
    {
      "journeyId": "completeMyAccess",
      "actorRef": "organizationMember",
      "title": "Complete my access"
    },
    {
      "journeyId": "prepareCompany",
      "actorRef": "companyOwner",
      "title": "Prepare the company"
    },
    {
      "journeyId": "maintainCountries",
      "actorRef": "companyOwner",
      "title": "Maintain countries"
    },
    {
      "journeyId": "publishPrivacyText",
      "actorRef": "companyOwner",
      "title": "Publish privacy text"
    },
    {
      "journeyId": "reviewOrganizationPeople",
      "actorRef": "companyOwner",
      "title": "Review organization people"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type OnboardingJourneyIndexType = typeof onboardingJourneyIndex;

export default onboardingJourneyIndex;
