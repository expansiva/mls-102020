/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/catalog.ts" enhancement="_blank"/>

import {
  Ns4E5PlanDraft,
  Ns4E5UpstreamGap,
  Ns4RuleCoverage,
} from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import {
  ns4AccessConstraintSourceRef,
  ns4JourneyRuleSourceRef,
  ns4OntologyInvariantSourceRef,
  ns4OntologyLifecyclePredicateSourceRef,
  Ns4E5Sources,
} from '/_102020_/l2/agentNewSolution4/steps/e5/gate.js';

export interface Ns4E5SourceCatalogEntry {
  sourceRef: string;
  sourceType: Ns4RuleCoverage['sourceType'];
  statement: string;
  origin: {
    journeyId?: string;
    entityId?: string;
    profileRef?: string;
    authorityRef?: string;
    dependencyId?: string;
  };
}

export function buildNs4E5SourceCatalog(sources: Ns4E5Sources): Ns4E5SourceCatalogEntry[] {
  return [
    ...sources.journeys.journeys.flatMap(journey => journey.business.businessRules.map(rule => ({
      sourceRef: ns4JourneyRuleSourceRef(journey.journeyId, rule.journeyRuleId),
      sourceType: 'journeyRule' as const,
      statement: rule.statement,
      origin: { journeyId: journey.journeyId },
    }))),
    ...sources.ontology.entities.flatMap(entity => entity.invariants.map(invariant => ({
      sourceRef: ns4OntologyInvariantSourceRef(entity.entityId, invariant.invariantId),
      sourceType: 'ontologyInvariant' as const,
      statement: invariant.description,
      origin: { entityId: entity.entityId },
    }))),
    ...sources.ontology.entities.flatMap(entity => entity.lifecyclePredicates.map(predicate => ({
      sourceRef: ns4OntologyLifecyclePredicateSourceRef(entity.entityId, predicate.predicateId),
      sourceType: 'ontologyLifecyclePredicate' as const,
      statement: `${predicate.description} Exact states: ${predicate.stateIds.join(', ')}.`,
      origin: { entityId: entity.entityId },
    }))),
    ...sources.access.grants.flatMap(grant => grant.constraints.map((statement, index) => ({
      sourceRef: ns4AccessConstraintSourceRef(grant.profileRef, grant.authorityRef, index),
      sourceType: 'accessConstraint' as const,
      statement,
      origin: { profileRef: grant.profileRef, authorityRef: grant.authorityRef },
    }))),
    ...sources.module.declaredConstraints.mandatoryIntegrations.map(dependency => ({
      sourceRef: `module:integration:${dependency.dependencyId}`,
      sourceType: 'declaredConstraint' as const,
      statement: `${dependency.title}: ${dependency.reason}`,
      origin: { dependencyId: dependency.dependencyId },
    })),
    ...(sources.module.declaredConstraints.regulatoryNotes ? [{
      sourceRef: 'module:regulatoryNotes', sourceType: 'declaredConstraint' as const,
      statement: sources.module.declaredConstraints.regulatoryNotes, origin: {},
    }] : []),
    ...(sources.module.declaredConstraints.criticalNotes ? [{
      sourceRef: 'module:criticalNotes', sourceType: 'declaredConstraint' as const,
      statement: sources.module.declaredConstraints.criticalNotes, origin: {},
    }] : []),
  ];
}

/** Coverage is derived from the source catalog and plan; the LLM never authors this bookkeeping. */
export function completeNs4E5PlanCoverage(
  plan: Ns4E5PlanDraft,
  catalog: Ns4E5SourceCatalogEntry[],
): Ns4E5PlanDraft {
  const sourceToRule = new Map<string, string>();
  for (const rule of plan.rulePlans) {
    for (const sourceRef of rule.sourceRefs) if (!sourceToRule.has(sourceRef)) sourceToRule.set(sourceRef, rule.ruleId);
  }
  const routeBySource = new Map(plan.routedStatements.map(route => [route.sourceRef, route]));
  const statementBySource = new Map(catalog.map(source => [source.sourceRef, source.statement]));
  const routedStatements = plan.routedStatements
    .filter(route => statementBySource.has(route.sourceRef) && !sourceToRule.has(route.sourceRef))
    .map(route => ({ ...route, statement: statementBySource.get(route.sourceRef) || route.statement }));
  const coverage: Ns4RuleCoverage[] = [];
  for (const source of catalog) {
    const ruleRef = sourceToRule.get(source.sourceRef);
    if (ruleRef) {
      coverage.push({
      sourceRef: source.sourceRef, sourceType: source.sourceType,
        disposition: 'compiled', targetRef: ruleRef,
      });
      continue;
    }
    const route = routeBySource.get(source.sourceRef);
    if (route) coverage.push({
      sourceRef: source.sourceRef, sourceType: source.sourceType,
      disposition: 'routed', targetRef: route.destination,
    });
  }
  return { ...plan, routedStatements, coverage };
}

/** Finds required journey outputs that have no ontology business object before rule generation starts. */
export function findNs4E5MechanicalUpstreamGaps(sources: Ns4E5Sources): Ns4E5UpstreamGap[] {
  const entityIds = new Set(sources.ontology.entities.map(entity => entity.entityId));
  const occurrences = new Map<string, string[]>();
  for (const journey of sources.journeys.journeys) {
    for (const context of journey.business.entry.carries) {
      if (!context.required || entityIds.has(context.businessObject)) continue;
      const refs = occurrences.get(context.businessObject) || [];
      refs.push(`journey:${journey.journeyId}:entry`);
      occurrences.set(context.businessObject, refs);
    }
    for (const step of journey.business.steps) {
      for (const context of step.providesContext) {
        if (!context.required || entityIds.has(context.businessObject)) continue;
        const refs = occurrences.get(context.businessObject) || [];
        refs.push(`journey:${journey.journeyId}:step:${step.stepId}`);
        occurrences.set(context.businessObject, refs);
      }
    }
  }
  return [...occurrences.entries()].map(([businessObject, sourceRefs]) => ({
    gapId: `missing${businessObject}`,
    sourceRefs,
    missingContract: businessObject,
    reason: `Required E2 journey output ${businessObject} has no matching E4 ontology entity or projection.`,
  }));
}

export function buildNs4E5ReferenceIndex(sources: Ns4E5Sources): unknown {
  return {
    actors: sources.module.businessScope.actors.map(actor => actor.actorId),
    journeys: sources.journeys.journeys.map(journey => ({
      journeyId: journey.journeyId, actorRef: journey.business.actorRef,
      stepIds: journey.business.steps.map(step => step.stepId),
    })),
    authorities: sources.access.authorities.map(authority => authority.authorityRef),
    entities: sources.ontology.entities.map(entity => ({
      entityId: entity.entityId,
      fieldRefs: entity.fields.map(field => `${entity.entityId}.${field.fieldId}`),
      lifecycleStates: entity.lifecycleStates,
      lifecyclePredicates: entity.lifecyclePredicates.map(predicate => ({
        predicateId: predicate.predicateId,
        stateIds: predicate.stateIds,
        description: predicate.description,
      })),
    })),
    relationships: sources.ontology.relationships.map(relationship => relationship.relationshipId),
  };
}
