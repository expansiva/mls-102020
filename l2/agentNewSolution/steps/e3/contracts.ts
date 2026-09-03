/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e3/contracts.ts" enhancement="_blank"/>

import { sha256Ns4 } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';

export const NS4_ACCESS_MATRIX_SCHEMA_VERSION = '2026-08-09-ns4-access-matrix-v2' as const;
export const NS4_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION = '2026-08-10-ns4-access-matrix-v3' as const;
export const NS4_NAVIGATION_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION = '2026-08-13-ns4-access-matrix-v4' as const;

export type Ns4AccessProfileKind = 'internal' | 'external';
export type Ns4AccessScopeMode = 'organization' | 'assigned' | 'own' | 'related' | 'public' | 'custom';
export type Ns4DisclosureMode = 'fullRecord' | 'summaryOnly' | 'fieldsOnly' | 'aggregateOnly';

export interface Ns4AccessProfile {
  profileId: string;
  title: string;
  kind: Ns4AccessProfileKind;
  description: string;
  actorRefs: string[];
  landingIntent: string;
}

export interface Ns4AccessAuthority {
  authorityRef: string;
  title: string;
  description: string;
  journeyStepRefs: string[];
  informationNeeds: string[];
}

export interface Ns4AccessGrant {
  profileRef: string;
  authorityRef: string;
  reason: string;
  dataScope: {
    mode: Ns4AccessScopeMode;
    description: string;
  };
  disclosure: {
    mode: Ns4DisclosureMode;
    description: string;
    allowedInformation: string[];
    deniedInformation: string[];
  };
  useRules: string[];
}

export interface Ns4E3Review {
  planId: 'e3-access-review';
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  profiles: Ns4AccessProfile[];
  authorities: Ns4AccessAuthority[];
  grants: Ns4AccessGrant[];
  changeSummary: string[];
}

export interface Ns4E3ReviewEvent {
  action: 'approve' | 'requestChanges' | 'cancel';
  adjustment: string;
  review: Ns4E3Review;
}

export interface Ns4AccessMatrixArtifactV2 {
  schemaVersion: typeof NS4_ACCESS_MATRIX_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  title: string;
  profiles: Ns4AccessProfile[];
  authorities: Ns4AccessAuthority[];
  grants: Ns4AccessGrant[];
  accessHash: string;
  approvedBy: 'human' | 'auto';
  approvedAt: string;
  realization: {
    status: 'pending';
    compiledFromAccessHash: string;
    operationAuthorityRefs: never[];
  };
}

export interface Ns4AccessUseCaseAuthorityRef {
  useCaseId: string;
  authorityRef: string;
  journeyStepRefs: string[];
}

export interface Ns4AccessMatrixArtifactV3 extends Omit<Ns4AccessMatrixArtifactV2, 'schemaVersion' | 'realization'> {
  schemaVersion: typeof NS4_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION;
  realization: {
    status: 'useCasesCompiled';
    compiledFromAccessHash: string;
    useCaseAuthorityRefs: Ns4AccessUseCaseAuthorityRef[];
    operationAuthorityRefs: never[];
    realizationHash: string;
  };
}

export interface Ns4AccessOperationAuthorityRef {
  operationRef: string;
  route: string;
  workspaceId: string;
  functionId: string;
  useCaseId?: string;
  authorityRefs: string[];
}

export interface Ns4AccessMatrixArtifactV4 extends Omit<Ns4AccessMatrixArtifactV2, 'schemaVersion' | 'realization'> {
  schemaVersion: typeof NS4_NAVIGATION_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION;
  realization: {
    status: 'navigationCompiled';
    compiledFromAccessHash: string;
    useCaseAuthorityRefs: Ns4AccessUseCaseAuthorityRef[];
    operationAuthorityRefs: Ns4AccessOperationAuthorityRef[];
    realizationHash: string;
  };
}

/** Compile-only compatibility for already generated v1 L4 artifacts. */
export interface Ns4AccessMatrixArtifactV1 extends Omit<Ns4AccessMatrixArtifactV2, 'schemaVersion' | 'grants'> {
  schemaVersion: '2026-08-05-ns4-access-matrix-v1';
  grants: Array<Omit<Ns4AccessGrant, 'useRules'> & { constraints: string[] }>;
}

export type Ns4AccessMatrixArtifact = Ns4AccessMatrixArtifactV4 | Ns4AccessMatrixArtifactV3 | Ns4AccessMatrixArtifactV2 | Ns4AccessMatrixArtifactV1;

export function normalizeNs4E3Review(value: unknown, fallbackModule = ''): Ns4E3Review {
  const root = record(value);
  return {
    planId: 'e3-access-review',
    moduleName: text(root.moduleName) || fallbackModule,
    userLanguage: text(root.userLanguage) || 'en',
    title: text(root.title) || 'Access matrix',
    reviewRound: positiveInteger(root.reviewRound, 1),
    profiles: array(root.profiles).map(item => {
      const profile = record(item);
      return {
        profileId: text(profile.profileId),
        title: text(profile.title),
        kind: profile.kind === 'external' ? 'external' : 'internal',
        description: text(profile.description),
        actorRefs: strings(profile.actorRefs),
        landingIntent: text(profile.landingIntent),
      };
    }),
    authorities: array(root.authorities).map(item => {
      const authority = record(item);
      return {
        authorityRef: text(authority.authorityRef),
        title: text(authority.title),
        description: text(authority.description),
        journeyStepRefs: strings(authority.journeyStepRefs),
        informationNeeds: strings(authority.informationNeeds),
      };
    }),
    grants: array(root.grants).map(item => {
      const grant = record(item);
      const dataScope = record(grant.dataScope);
      const disclosure = record(grant.disclosure);
      return {
        profileRef: text(grant.profileRef),
        authorityRef: text(grant.authorityRef),
        reason: text(grant.reason),
        dataScope: {
          mode: scopeMode(dataScope.mode),
          description: text(dataScope.description),
        },
        disclosure: {
          mode: disclosureMode(disclosure.mode),
          description: text(disclosure.description),
          allowedInformation: strings(disclosure.allowedInformation),
          deniedInformation: strings(disclosure.deniedInformation),
        },
        useRules: strings(grant.useRules),
      };
    }),
    changeSummary: strings(root.changeSummary),
  };
}

export async function buildNs4AccessMatrixArtifact(
  review: Ns4E3Review,
  approvedBy: 'human' | 'auto',
  approvedAt: string,
): Promise<Ns4AccessMatrixArtifactV2> {
  const accessContract = {
    profiles: review.profiles,
    authorities: review.authorities,
    grants: review.grants,
  };
  const accessHash = await sha256Ns4(accessContract);
  return {
    schemaVersion: NS4_ACCESS_MATRIX_SCHEMA_VERSION,
    moduleName: review.moduleName,
    userLanguage: review.userLanguage,
    title: review.title,
    ...accessContract,
    accessHash,
    approvedBy,
    approvedAt,
    realization: {
      status: 'pending',
      compiledFromAccessHash: accessHash,
      operationAuthorityRefs: [],
    },
  };
}

function scopeMode(value: unknown): Ns4AccessScopeMode {
  if (value === 'organization' || value === 'assigned' || value === 'own'
    || value === 'related' || value === 'public') return value;
  return 'custom';
}

function disclosureMode(value: unknown): Ns4DisclosureMode {
  if (value === 'fullRecord' || value === 'summaryOnly' || value === 'aggregateOnly') return value;
  return 'fieldsOnly';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return array(value).map(text).filter(Boolean);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
