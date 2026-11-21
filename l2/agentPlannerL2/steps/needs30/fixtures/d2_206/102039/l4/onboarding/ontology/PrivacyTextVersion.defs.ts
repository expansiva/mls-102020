/// <mls fileReference="_102039_/l4/onboarding/ontology/PrivacyTextVersion.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingEntityPrivacyTextVersion = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "onboarding",
  "entityId": "PrivacyTextVersion",
  "title": "Privacy text version",
  "description": "A version of the module's privacy text that people accept. A published version is never changed; the current version is the latest published one, and a new current version requires people who accepted an earlier one to accept again.",
  "displayField": "versionCode",
  "relationships": {
    "acceptedByMembers": {
      "relationshipId": "memberAcceptedVersion",
      "to": "OrganizationMember",
      "via": "OrganizationMember.details.person.privacyConsent.consentVersion",
      "cardinality": "1:N",
      "title": "Members who accepted this version",
      "description": "People whose privacy consent records this version code as the accepted one, with when and how.",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Reads one privacy text version by its id, used by the owner's version screen and by the access screen to show the text next to the acceptance.",
    "locate.byColumn": "Lists versions filtered by status and ordered by publication moment, so the access screen and the owner find the current published version and the owner sees the version history.",
    "count": "Counts versions by status, so the owner sees how many versions were published and whether a draft is pending.",
    "create": "The company owner writes a changed privacy text as a new draft version, leaving every published version untouched; also used to load the initial provisional version 1.",
    "update": "The company owner edits the text of a version only while it is still a draft; a published version is refused.",
    "transition": "The company owner publishes a draft version, which becomes the current privacy text and requires earlier acceptances to be renewed.",
    "uniqueKey": "Refuses a second version with the same version code, enforced by the engine on write.",
    "sequence.next": "Issues the next version code from the module counter when the owner creates a new version, never from a counter of the module.",
    "listByForeignKey": "Resolves, for a list of people, the versions their consents point at, so the owner's people list shows who must accept the current version again.",
    "onboarding.currentPrivacyVersion": "Returns the current privacy text (latest published version) with its code and provisional flag, read by the complete-my-access screen when the chosen country requires consent and by the owner's publish screen."
  },
  "rules": [
    "publishedVersionImmutable",
    "currentVersionIsLatestPublished",
    "newCurrentVersionRequiresReacceptance",
    "onlyOwnerMaintainsPrivacyText",
    "initialProvisionalPrivacyText",
    "privacyVersionCodeFromSequence"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "onboarding_privacytextversion",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "versionCode": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "derived": true,
        "title": "Version code",
        "description": "Code of this privacy text version (1, 2, 3…), issued by the platform number sequence when the version is created. This is the code recorded on the person's consent when they accept it.",
        "maxLength": 20
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "draft",
            "title": "Draft",
            "description": "Being written by the company owner; not shown to people yet."
          },
          {
            "value": "published",
            "title": "Published",
            "description": "Published and frozen; the latest published version is the current one."
          }
        ],
        "title": "Status",
        "description": "Whether this version is still a draft the owner is writing or has been published. A published version is never changed."
      },
      "publishedAt": {
        "type": "timestamp",
        "indexed": true,
        "derived": true,
        "title": "Published at",
        "description": "When the owner published this version. Set by the publish action; the latest one decides which version is current."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Content of this privacy text version.",
        "fields": {
          "text": {
            "type": "text",
            "required": true,
            "title": "Privacy text",
            "description": "The full privacy text people read and accept on the access screen, on desktop and mobile."
          },
          "isProvisional": {
            "type": "boolean",
            "required": true,
            "title": "Provisional text",
            "description": "True for the initial provisional text (version 1) the module starts with, so the owner sees it still needs to be replaced."
          },
          "changeNote": {
            "type": "text",
            "title": "Change note",
            "description": "Optional short note from the owner explaining what changed compared with the previous version.",
            "maxLength": 500
          },
          "isCurrent": {
            "type": "boolean",
            "derived": true,
            "title": "Current version",
            "description": "Yes when this version is published and no other version was published after it; it is the text people must have accepted for their access to be complete."
          }
        }
      }
    }
  },
  "initialData": "One initial provisional privacy text, version 1, published and marked as provisional.",
  "uniqueKeys": [
    [
      "versionCode"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "draft",
      "reachedBy": "actor"
    },
    {
      "state": "published",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "publishPrivacyVersion",
      "from": [
        "draft"
      ],
      "to": "published",
      "by": [
        "companyOwner"
      ],
      "description": "The owner publishes the new version: it is frozen, gets its publication moment and becomes the current privacy text, so people who accepted an earlier version must accept again.",
      "payload": [],
      "ruleRefs": [
        "publishedVersionImmutable",
        "currentVersionIsLatestPublished",
        "newCurrentVersionRequiresReacceptance",
        "onlyOwnerMaintainsPrivacyText"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OnboardingEntityPrivacyTextVersionType = typeof onboardingEntityPrivacyTextVersion;

export default onboardingEntityPrivacyTextVersion;
