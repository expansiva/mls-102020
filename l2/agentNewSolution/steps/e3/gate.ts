/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e3/gate.ts" enhancement="_blank"/>

import { Ns4E2Review } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import { ns4E2JourneyOperationKey } from '/_102020_/l2/agentNewSolution/steps/e2/gate.js';
import { Ns4E3Review } from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';

export interface Ns4E3GateIssue {
  code: string;
  path: string;
  message: string;
}

export interface Ns4E3GateResult {
  ok: boolean;
  issues: Ns4E3GateIssue[];
}

const ID_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const AUTHORITY_PATTERN = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;

export function validateNs4E3Review(review: Ns4E3Review, journeys?: Ns4E2Review): Ns4E3GateResult {
  const issues: Ns4E3GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });

  if (!ID_PATTERN.test(review.moduleName)) add('NS4_E3_MODULE_ID', 'moduleName', 'moduleName must be a lower-camel identifier.');
  if (!review.profiles.length) add('NS4_E3_NO_PROFILES', 'profiles', 'At least one access profile is required.');
  if (!review.authorities.length) add('NS4_E3_NO_AUTHORITIES', 'authorities', 'At least one collab-auth authority is required.');
  if (!review.grants.length) add('NS4_E3_NO_GRANTS', 'grants', 'At least one profile-authority grant is required.');

  const validActorRefs = new Set(journeys?.journeys.map(journey => journey.business.actorRef) || []);
  const validStepRefs = new Set<string>();
  const requiredNowStepRefs = new Set<string>();
  const nowFeatureIds = new Set(journeys?.features.filter(feature => feature.priority === 'now').map(feature => feature.featureId) || []);
  journeys?.journeys.forEach(journey => journey.business.steps.forEach(step => {
    const stepRef = `${journey.journeyId}.${step.stepId}`;
    validStepRefs.add(stepRef);
    if (step.featureRefs.some(featureRef => nowFeatureIds.has(featureRef))) requiredNowStepRefs.add(stepRef);
  }));
  journeys?.features.filter(feature => feature.priority === 'now').forEach(feature => {
    feature.journeyStepRefs.forEach(stepRef => requiredNowStepRefs.add(stepRef));
  });

  const profileIds = new Set<string>();
  const coveredActorRefs = new Set<string>();
  review.profiles.forEach((profile, index) => {
    const path = `profiles[${index}]`;
    checkId(profile.profileId, `${path}.profileId`, 'profile', profileIds, add);
    if (!profile.title) add('NS4_E3_PROFILE_TITLE', `${path}.title`, 'Profile title is required.');
    if (!profile.description) add('NS4_E3_PROFILE_DESCRIPTION', `${path}.description`, 'Profile description is required.');
    if (!profile.landingIntent) add('NS4_E3_PROFILE_LANDING', `${path}.landingIntent`, 'Profile landing intent is required for future workspace compilation.');
    profile.actorRefs.forEach(actorRef => {
      if (journeys && !validActorRefs.has(actorRef)) add('NS4_E3_ACTOR_REF', `${path}.actorRefs`, `Unknown E2 actorRef ${actorRef}.`);
      coveredActorRefs.add(actorRef);
    });
    if (profile.kind === 'internal' && journeys && !profile.actorRefs.length) {
      add('NS4_E3_INTERNAL_ACTOR', `${path}.actorRefs`, 'An internal access profile must map to at least one E2 actorRef.');
    }
  });
  validActorRefs.forEach(actorRef => {
    if (!coveredActorRefs.has(actorRef)) add('NS4_E3_ACTOR_COVERAGE', 'profiles.actorRefs', `E2 actorRef ${actorRef} has no access profile.`);
  });

  const authorityRefs = new Set<string>();
  const coveredStepRefs = new Set<string>();
  review.authorities.forEach((authority, index) => {
    const path = `authorities[${index}]`;
    if (!AUTHORITY_PATTERN.test(authority.authorityRef)) {
      add('NS4_E3_AUTHORITY_FORMAT', `${path}.authorityRef`, 'Authority must follow the collab-auth domain:code pattern using lowercase letters, digits or hyphens.');
    }
    if (authorityRefs.has(authority.authorityRef)) add('NS4_E3_DUPLICATE_AUTHORITY', `${path}.authorityRef`, `Duplicate authority ${authority.authorityRef}.`);
    if (authority.authorityRef) authorityRefs.add(authority.authorityRef);
    if (!authority.title) add('NS4_E3_AUTHORITY_TITLE', `${path}.title`, 'Authority title is required.');
    if (!authority.description) add('NS4_E3_AUTHORITY_DESCRIPTION', `${path}.description`, 'Authority description is required.');
    if (!authority.journeyStepRefs.length && !authority.informationNeeds.length) {
      add('NS4_E3_AUTHORITY_PURPOSE', path, 'Authority must protect journey steps or a declared information need.');
    }
    authority.journeyStepRefs.forEach(stepRef => {
      if (journeys && !validStepRefs.has(stepRef)) add('NS4_E3_STEP_REF', `${path}.journeyStepRefs`, `Unknown E2 journey step ${stepRef}.`);
      coveredStepRefs.add(stepRef);
    });
  });
  requiredNowStepRefs.forEach(stepRef => {
    if (!coveredStepRefs.has(stepRef)) add('NS4_E3_NOW_STEP_COVERAGE', 'authorities.journeyStepRefs', `Now journey step ${stepRef} is not protected by any authority.`);
  });

  const grantKeys = new Set<string>();
  const grantedProfiles = new Set<string>();
  const grantedAuthorities = new Set<string>();
  review.grants.forEach((grant, index) => {
    const path = `grants[${index}]`;
    if (!profileIds.has(grant.profileRef)) add('NS4_E3_GRANT_PROFILE', `${path}.profileRef`, `Unknown profile ${grant.profileRef}.`);
    if (!authorityRefs.has(grant.authorityRef)) add('NS4_E3_GRANT_AUTHORITY', `${path}.authorityRef`, `Unknown authority ${grant.authorityRef}.`);
    const key = `${grant.profileRef}\u0000${grant.authorityRef}`;
    if (grantKeys.has(key)) add('NS4_E3_DUPLICATE_GRANT', path, `Duplicate grant for ${grant.profileRef} and ${grant.authorityRef}.`);
    grantKeys.add(key);
    grantedProfiles.add(grant.profileRef);
    grantedAuthorities.add(grant.authorityRef);
    if (!grant.reason) add('NS4_E3_GRANT_REASON', `${path}.reason`, 'Grant reason is required.');
    if (!grant.dataScope.description) add('NS4_E3_SCOPE_DESCRIPTION', `${path}.dataScope.description`, 'Data scope must be explained in business language.');
    if (!grant.disclosure.description) add('NS4_E3_DISCLOSURE_DESCRIPTION', `${path}.disclosure.description`, 'Disclosure boundary must be explained.');
    if (grant.disclosure.mode !== 'fullRecord' && !grant.disclosure.allowedInformation.length) {
      add('NS4_E3_LIMITED_DISCLOSURE', `${path}.disclosure.allowedInformation`, `${grant.disclosure.mode} access must list the information that may be exposed.`);
    }
    const profile = review.profiles.find(item => item.profileId === grant.profileRef);
    if (profile?.kind === 'external' && grant.dataScope.mode === 'organization') {
      add('NS4_E3_EXTERNAL_ORGANIZATION_SCOPE', `${path}.dataScope.mode`, 'External profiles cannot receive organization-wide scope.');
    }
    const ruleIds = new Set<string>();
    grant.useRules.forEach((ruleId, ruleIndex) => {
      checkId(ruleId, `${path}.useRules[${ruleIndex}]`, 'rule reference', ruleIds, add);
    });
  });
  profileIds.forEach(profileId => {
    if (!grantedProfiles.has(profileId)) add('NS4_E3_PROFILE_NO_GRANTS', 'grants', `Profile ${profileId} has no authority grant.`);
  });
  authorityRefs.forEach(authorityRef => {
    if (!grantedAuthorities.has(authorityRef)) add('NS4_E3_AUTHORITY_NO_GRANTS', 'grants', `Authority ${authorityRef} is not granted to any profile.`);
  });

  addTwinJourneyIssues(review, journeys, add);

  return { ok: issues.length === 0, issues };
}

function addTwinJourneyIssues(review: Ns4E3Review, journeys: Ns4E2Review | undefined, add: AddIssue): void {
  if (!journeys) return;
  const groups = new Map<string, { journeyId: string; actorRef: string }[]>();
  journeys.journeys.forEach(journey => {
    const actorRef = journey.business.actorRef;
    const operations = ns4E2JourneyOperationKey(journey);
    if (!actorRef || !operations) return;
    const access = actorAccessKey(actorRef, review);
    const key = `${operations}\u0000${access}`;
    const group = groups.get(key) || [];
    group.push({ journeyId: journey.journeyId, actorRef });
    groups.set(key, group);
  });
  groups.forEach((group, key) => {
    const actors = [...new Set(group.map(item => item.actorRef))];
    if (actors.length < 2) return;
    const operations = key.split('\u0000')[0];
    const journeyIds = [...new Set(group.map(item => item.journeyId))];
    add(
      'NS4_E3_TWIN_JOURNEYS',
      'profiles.actorRefs',
      `Journeys ${journeyIds.join(', ')} are twins: same operations (${operations}) and the same effective access with different actors (${actors.join(', ')}). A persona or demographic segment does not create an actor — the actors must merge.`,
    );
  });
}

function actorAccessKey(actorRef: string, review: Ns4E3Review): string {
  const profileIds = new Set(review.profiles.filter(profile => profile.actorRefs.includes(actorRef)).map(profile => profile.profileId));
  return review.grants
    .filter(grant => profileIds.has(grant.profileRef))
    .map(grant => `${grant.authorityRef}:${grant.dataScope.mode}`)
    .sort()
    .join(',');
}

type AddIssue = (code: string, path: string, message: string) => void;

function checkId(value: string, path: string, label: string, ids: Set<string>, add: AddIssue): void {
  if (!ID_PATTERN.test(value)) add('NS4_E3_ID', path, `${label} id must be a lower-camel identifier.`);
  if (ids.has(value)) add('NS4_E3_DUPLICATE_ID', path, `Duplicate ${label} id ${value || '(empty)'}.`);
  if (value) ids.add(value);
}
