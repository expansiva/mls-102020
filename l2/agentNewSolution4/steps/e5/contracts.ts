/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/contracts.ts" enhancement="_blank"/>

import { sha256Ns4 } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export const NS4_RULE_SCHEMA_VERSION = '2026-08-06-ns4-rule-v1' as const;
export const NS4_RULE_INDEX_SCHEMA_VERSION = '2026-08-06-ns4-rule-index-v1' as const;

export type Ns4RuleKind = 'invariant' | 'validation' | 'transitionGuard' | 'calculation'
  | 'temporal' | 'authorization' | 'visibility' | 'conditionalRequirement';
export type Ns4RuleLayer = 'domain' | 'application' | 'access';

export interface Ns4RuleDefinition {
  ruleId: string;
  title: string;
  statement: string;
  kind: Ns4RuleKind;
  layer: Ns4RuleLayer;
  criticality: 'blocking' | 'warning';
  scope: {
    entityRefs: string[];
    fieldRefs: string[];
    relationshipRefs: string[];
    journeyRefs: string[];
    journeyStepRefs: string[];
    actorRefs: string[];
    authorityRefs: string[];
  };
  trigger: { type: 'create' | 'update' | 'delete' | 'transition' | 'read' | 'calculate' | 'schedule'; description: string };
  condition: { expression: string; facts: string[] };
  enforcement: {
    backend: { required: boolean; effect: 'reject' | 'calculate' | 'filter' | 'authorize' | 'notify'; errorCode?: string };
    frontend: { behavior: 'block' | 'warn' | 'hide' | 'disable' | 'calculate' | 'none'; message?: string };
  };
  acceptanceCases: Array<{ caseId: string; given: string[]; when: string; then: string; expected: 'accept' | 'reject' | 'calculate' | 'filter' }>;
  sourceRefs: string[];
}

export interface Ns4RoutedStatement {
  sourceRef: string;
  statement: string;
  destination: 'e4-fieldConstraint' | 'e4-entityInvariant' | 'e5-rule' | 'e6-workflow' | 'documentation';
  reason: string;
  ruleRef?: string;
}

export interface Ns4RuleCoverage {
  sourceRef: string;
  sourceType: 'journeyRule' | 'ontologyInvariant' | 'ontologyLifecyclePredicate' | 'accessConstraint' | 'declaredConstraint';
  disposition: 'compiled' | 'routed';
  targetRef: string;
}

export interface Ns4E5Review {
  planId: 'e5-rules-review';
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  rules: Ns4RuleDefinition[];
  routedStatements: Ns4RoutedStatement[];
  coverage: Ns4RuleCoverage[];
  changeSummary: string[];
}

export type Ns4RulePlanItem = Omit<Ns4RuleDefinition, 'trigger' | 'condition' | 'enforcement' | 'acceptanceCases'>;

export interface Ns4E5UpstreamGap {
  gapId: string;
  sourceRefs: string[];
  missingContract: string;
  reason: string;
}

export interface Ns4E5PlanDraft {
  planId: 'e5-rules-plan';
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  rulePlans: Ns4RulePlanItem[];
  routedStatements: Ns4RoutedStatement[];
  coverage: Ns4RuleCoverage[];
  upstreamGaps: Ns4E5UpstreamGap[];
  changeSummary: string[];
}

export interface Ns4E5RuleDraft {
  planId: 'e5-rule-detail';
  moduleName: string;
  reviewRound: number;
  ruleId: string;
  rule: Ns4RuleDefinition;
}

export interface Ns4E5ReviewEvent {
  action: 'approve' | 'requestChanges' | 'cancel';
  adjustment: string;
  review: Ns4E5Review;
}

export interface Ns4RuleArtifact extends Ns4RuleDefinition {
  schemaVersion: typeof NS4_RULE_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  rulesHash: string;
  approvedBy: 'human' | 'auto';
  approvedAt: string;
}

export interface Ns4RuleIndexArtifact {
  schemaVersion: typeof NS4_RULE_INDEX_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  title: string;
  rulesHash: string;
  rules: Array<Pick<Ns4RuleDefinition, 'ruleId' | 'title' | 'kind' | 'layer' | 'criticality'> & { definitionRef: string }>;
  routedStatements: Ns4RoutedStatement[];
  coverage: Ns4RuleCoverage[];
  approvedBy: 'human' | 'auto';
  approvedAt: string;
  realization: { status: 'pending'; compiledFromRulesHash: string; operationRefs: never[] };
}

export function normalizeNs4E5Review(value: unknown, fallbackModule = ''): Ns4E5Review {
  const root = record(value);
  return {
    planId: 'e5-rules-review',
    moduleName: text(root.moduleName) || fallbackModule,
    userLanguage: text(root.userLanguage) || 'en',
    title: text(root.title) || 'Business rules',
    reviewRound: positiveInteger(root.reviewRound, 1),
    rules: array(root.rules).map(normalizeRule),
    routedStatements: array(root.routedStatements).map(item => {
      const route = record(item);
      return {
        sourceRef: text(route.sourceRef), statement: text(route.statement),
        destination: destination(route.destination), reason: text(route.reason),
        ...(text(route.ruleRef) ? { ruleRef: text(route.ruleRef) } : {}),
      };
    }),
    coverage: array(root.coverage).map(item => {
      const coverage = record(item);
      return {
        sourceRef: text(coverage.sourceRef), sourceType: sourceType(coverage.sourceType),
        disposition: coverage.disposition === 'routed' ? 'routed' : 'compiled',
        targetRef: text(coverage.targetRef),
      };
    }),
    changeSummary: strings(root.changeSummary),
  };
}

export function normalizeNs4E5PlanDraft(value: unknown, fallbackModule = ''): Ns4E5PlanDraft {
  const root = record(value);
  const normalized = normalizeNs4E5Review({
    ...root,
    rules: array(root.rulePlans),
  }, fallbackModule);
  return {
    planId: 'e5-rules-plan',
    moduleName: normalized.moduleName,
    userLanguage: normalized.userLanguage,
    title: normalized.title,
    reviewRound: normalized.reviewRound,
    rulePlans: normalized.rules.map(({ trigger, condition, enforcement, acceptanceCases, ...rule }) => rule),
    routedStatements: normalized.routedStatements,
    coverage: normalized.coverage,
    upstreamGaps: array(root.upstreamGaps).map(item => {
      const gap = record(item);
      return {
        gapId: text(gap.gapId), sourceRefs: strings(gap.sourceRefs),
        missingContract: text(gap.missingContract), reason: text(gap.reason),
      };
    }),
    changeSummary: normalized.changeSummary,
  };
}

export function normalizeNs4E5RuleDraft(
  value: unknown,
  moduleName: string,
  reviewRound: number,
  ruleId: string,
): Ns4E5RuleDraft {
  const root = record(value);
  const rawRule = record(root.rule);
  const rule = normalizeNs4E5Review({ rules: [{ ...rawRule, ruleId }] }, moduleName).rules[0];
  return { planId: 'e5-rule-detail', moduleName, reviewRound, ruleId, rule };
}

export function assembleNs4E5Review(plan: Ns4E5PlanDraft, details: Ns4E5RuleDraft[]): Ns4E5Review {
  const byRule = new Map(details.map(detail => [detail.ruleId, detail.rule]));
  return normalizeNs4E5Review({
    planId: 'e5-rules-review', moduleName: plan.moduleName, userLanguage: plan.userLanguage,
    title: plan.title, reviewRound: plan.reviewRound,
    rules: plan.rulePlans.map(rule => byRule.get(rule.ruleId)).filter(Boolean),
    routedStatements: plan.routedStatements, coverage: plan.coverage, changeSummary: plan.changeSummary,
  }, plan.moduleName);
}

export async function buildNs4RuleArtifacts(
  review: Ns4E5Review,
  approvedBy: 'human' | 'auto',
  approvedAt: string,
): Promise<{ rules: Ns4RuleArtifact[]; index: Ns4RuleIndexArtifact }> {
  const rulesHash = await sha256Ns4({ rules: review.rules, routedStatements: review.routedStatements, coverage: review.coverage });
  const rules = review.rules.map(rule => ({
    schemaVersion: NS4_RULE_SCHEMA_VERSION, moduleName: review.moduleName, userLanguage: review.userLanguage,
    ...rule, rulesHash, approvedBy, approvedAt,
  }));
  return {
    rules,
    index: {
      schemaVersion: NS4_RULE_INDEX_SCHEMA_VERSION, moduleName: review.moduleName,
      userLanguage: review.userLanguage, title: review.title, rulesHash,
      rules: review.rules.map(rule => ({
        ruleId: rule.ruleId, title: rule.title, kind: rule.kind, layer: rule.layer,
        criticality: rule.criticality, definitionRef: `l4/${review.moduleName}/rules/${rule.ruleId}.defs.ts`,
      })),
      routedStatements: review.routedStatements, coverage: review.coverage, approvedBy, approvedAt,
      realization: { status: 'pending', compiledFromRulesHash: rulesHash, operationRefs: [] },
    },
  };
}

function normalizeRule(value: unknown): Ns4RuleDefinition {
  const rule = record(value); const scope = record(rule.scope); const trigger = record(rule.trigger);
  const condition = record(rule.condition); const enforcement = record(rule.enforcement);
  const backend = record(enforcement.backend); const frontend = record(enforcement.frontend);
  return {
    ruleId: text(rule.ruleId), title: text(rule.title), statement: text(rule.statement),
    kind: ruleKind(rule.kind), layer: ruleLayer(rule.layer),
    criticality: rule.criticality === 'warning' ? 'warning' : 'blocking',
    scope: {
      entityRefs: strings(scope.entityRefs), fieldRefs: strings(scope.fieldRefs),
      relationshipRefs: strings(scope.relationshipRefs), journeyRefs: strings(scope.journeyRefs),
      journeyStepRefs: strings(scope.journeyStepRefs), actorRefs: strings(scope.actorRefs),
      authorityRefs: strings(scope.authorityRefs),
    },
    trigger: { type: triggerType(trigger.type), description: text(trigger.description) },
    condition: { expression: text(condition.expression), facts: strings(condition.facts) },
    enforcement: {
      backend: {
        required: backend.required === true, effect: backendEffect(backend.effect),
        ...(text(backend.errorCode) ? { errorCode: text(backend.errorCode) } : {}),
      },
      frontend: { behavior: frontendBehavior(frontend.behavior), ...(text(frontend.message) ? { message: text(frontend.message) } : {}) },
    },
    acceptanceCases: array(rule.acceptanceCases).map(item => {
      const testCase = record(item);
      return { caseId: text(testCase.caseId), given: strings(testCase.given), when: text(testCase.when), then: text(testCase.then), expected: expected(testCase.expected) };
    }),
    sourceRefs: strings(rule.sourceRefs),
  };
}

function ruleKind(value: unknown): Ns4RuleKind {
  if (value === 'validation' || value === 'transitionGuard' || value === 'calculation' || value === 'temporal'
    || value === 'authorization' || value === 'visibility' || value === 'conditionalRequirement') return value;
  return 'invariant';
}
function ruleLayer(value: unknown): Ns4RuleLayer { return value === 'application' || value === 'access' ? value : 'domain'; }
function triggerType(value: unknown): Ns4RuleDefinition['trigger']['type'] {
  if (value === 'update' || value === 'delete' || value === 'transition' || value === 'read' || value === 'calculate' || value === 'schedule') return value;
  return 'create';
}
function backendEffect(value: unknown): Ns4RuleDefinition['enforcement']['backend']['effect'] {
  if (value === 'calculate' || value === 'filter' || value === 'authorize' || value === 'notify') return value;
  return 'reject';
}
function frontendBehavior(value: unknown): Ns4RuleDefinition['enforcement']['frontend']['behavior'] {
  if (value === 'warn' || value === 'hide' || value === 'disable' || value === 'calculate' || value === 'none') return value;
  return 'block';
}
function expected(value: unknown): Ns4RuleDefinition['acceptanceCases'][number]['expected'] {
  if (value === 'accept' || value === 'calculate' || value === 'filter') return value;
  return 'reject';
}
function destination(value: unknown): Ns4RoutedStatement['destination'] {
  if (value === 'e4-fieldConstraint' || value === 'e4-entityInvariant' || value === 'e6-workflow' || value === 'documentation') return value;
  return 'e5-rule';
}
function sourceType(value: unknown): Ns4RuleCoverage['sourceType'] {
  if (value === 'ontologyInvariant' || value === 'ontologyLifecyclePredicate'
    || value === 'accessConstraint' || value === 'declaredConstraint') return value;
  return 'journeyRule';
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return array(value).map(text).filter(Boolean); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function positiveInteger(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback; }
