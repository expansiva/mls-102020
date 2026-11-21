/// <mls fileReference="_102039_/l4/onboarding/journeys/publishPrivacyText.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const publishPrivacyTextJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "publishPrivacyText",
  "business": {
    "actorRef": "companyOwner",
    "title": "Publish privacy text",
    "goal": "Change the privacy text by publishing a new version that becomes the current one.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "viewCurrentVersion",
        "kind": "inspect",
        "entity": "PrivacyTextVersion",
        "title": "See current version",
        "description": "The owner sees the current published privacy text, its version and whether it is the initial provisional text."
      },
      {
        "stepId": "createVersion",
        "kind": "act",
        "entity": "PrivacyTextVersion",
        "effect": "create",
        "title": "Write new version",
        "description": "The owner writes the changed text as a new version, leaving every published version unchanged."
      },
      {
        "stepId": "publishVersion",
        "kind": "act",
        "entity": "PrivacyTextVersion",
        "effect": "transition",
        "transitionRef": "publishPrivacyVersion",
        "title": "Publish the version",
        "description": "The owner publishes the new version, which becomes current and requires people who accepted an earlier version to accept again."
      }
    ],
    "outcome": {
      "statement": "A new privacy text version is published and is the current version.",
      "evidence": [
        "The new version has the next version number and is marked published",
        "Earlier versions remain unchanged",
        "People who accepted an earlier version show the consent as pending"
      ]
    }
  },
  "businessHash": "sha256:742292202e6d85c8013c58a229f675c144bd2a2e193c04b67659b36efcd92b15"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type PublishPrivacyTextJourneyType = typeof publishPrivacyTextJourney;

export default publishPrivacyTextJourney;
