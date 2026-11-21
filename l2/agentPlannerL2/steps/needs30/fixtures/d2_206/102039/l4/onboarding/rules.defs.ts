/// <mls fileReference="_102039_/l4/onboarding/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "onboarding",
  "rules": {
    "onlyOwnerMaintainsCountries": "Only the company owner can add, edit, inactivate or reactivate countries in the module country list.",
    "onlyActiveCountryOffered": "Only active countries are offered for selection to people and to the company, and an inactivated country stays on the records that already point at it.",
    "publishedVersionImmutable": "A privacy text version that has been published is never changed; any change to the text becomes a new version.",
    "currentVersionIsLatestPublished": "The current privacy text is the most recently published version.",
    "newCurrentVersionRequiresReacceptance": "When a new privacy text version is published and becomes current, every acceptance of an earlier version stops being valid for completing access.",
    "onlyOwnerMaintainsPrivacyText": "Only the company owner can create and publish privacy text versions.",
    "noSecondPerson": "The module works only on the person the platform already has for the signed-in login and never creates a second person or links another e-mail or record; when the login cannot be linked because another record uses that e-mail as a contact, the person is told the owner must release the access on the platform and can come back later.",
    "loginEmailReadOnly": "The person's e-mail is the login e-mail, shown read-only and never typed or stored by the module.",
    "onlyMissingDataAsked": "Complete my access asks only for the missing name and country, never for personal phone, and a person whose minimum data is already complete goes straight to the modules they may use.",
    "unknownCountryNeverDefaulted": "An unknown person country is left empty and asked for, never replaced by a default country.",
    "countryFromActiveList": "The person's country must be one of the active countries in the module country list.",
    "consentFollowsEditedCountry": "Whether privacy consent is required is decided by the platform rule for the country currently being edited, before saving, and changing the country keeps the other typed data.",
    "consentNeverAutoAccepted": "The privacy acceptance is shown unchecked with the current text and its version and is given only by the person's explicit action, never by changing the country or by default.",
    "reacceptOnNewPrivacyVersion": "A person whose consent is empty, invalid, revoked or for an earlier version must accept the current privacy text before access is complete when the country requires it, and a valid consent for the current version is not asked again; the acceptance records when, how and the accepted version code.",
    "accessCompleteByPlatformRule": "Access is complete, by the platform rule, when name and country are filled in and, if the country requires it, a valid consent for the current privacy version exists, and after saving the screen and the session show the same status, with what was saved and what is pending kept without retyping.",
    "dataEntryGrantsNoAuthority": "Filling in data never grants roles or permissions; module access is granted only by the owner on the platform, and the owner role comes only from the platform, not from being first to sign in.",
    "listingProvesNoInvitation": "Appearing in the organization people list neither proves an accepted invitation nor grants any authority.",
    "onlyOwnerPreparesCompany": "Only the company owner can prepare the company; a member is told that only the owner can do it.",
    "companyCountryNeverDefaulted": "The company country is chosen from the module country list and an unknown company country is never replaced by a default.",
    "companyContactNotDuplicated": "The company contact belongs to this company, and saving again with the same type and value reuses the existing contact instead of creating a duplicate.",
    "companyPreparedWhenRequiredSaved": "The company is prepared only when name, legal name, country, document, address and contact are all saved, and only then is the fixed guidance with the link to create the first module in Studio shown.",
    "companyNotAskedAgainForExistingData": "Preparing the company asks only for the required company data the platform does not already have.",
    "authorityErrorDistinctFromValidation": "An authority error is shown differently from a validation error and from a missing company, and an empty list is shown differently from a loading error.",
    "countryIsoCodeUnique": "Each two-letter ISO code appears only once in the module country list.",
    "countryIsoCodeFormat": "A country code must be a two-letter ISO 3166-1 alpha-2 code in upper case, and every country has an English name.",
    "initialProvisionalPrivacyText": "The module starts with an initial privacy text published as version 1 and marked as provisional, and the country list starts with every ISO 3166-1 country.",
    "privacyVersionCodeFromSequence": "Each new privacy text version receives the next version code from the platform number sequence when it is created."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type OnboardingRulesType = typeof onboardingRules;

export default onboardingRules;
