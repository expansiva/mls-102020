/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4Context.ts" enhancement="_blank"/>

/**
 * The single place where journey contexts are derived. E2 owns narrative, sequence, step kind and
 * step entity; nothing declares a context id, a cardinality or a provider. Every consumer (E7, E8,
 * E9) reads the same derivation so a context can never mean two things in two steps.
 */

export type Ns4ContextStepKind = 'locate' | 'inspect' | 'act' | 'decide' | 'handoff';

export interface Ns4DerivedContext {
  contextId: string;
  businessObject: string;
  cardinality: 'one' | 'many';
  required: boolean;
  idFieldRef?: string;
}

export interface Ns4DerivedStepContexts {
  journeyId: string;
  stepId: string;
  stepRef: string;
  kind: Ns4ContextStepKind;
  entity: string;
  /** True when the step introduces its own entity instead of operating on an existing record. */
  creates: boolean;
  requires: Ns4DerivedContext[];
  provides: Ns4DerivedContext[];
}

export interface Ns4DerivedContextGraph {
  catalog: Ns4DerivedContext[];
  steps: Ns4DerivedStepContexts[];
  byStepRef: Map<string, Ns4DerivedStepContexts>;
  entryByJourneyId: Map<string, Ns4DerivedContext[]>;
}

export interface Ns4ContextJourneyStep {
  stepId: string;
  kind: Ns4ContextStepKind;
  entity: string;
  targetProfile?: string;
}

export interface Ns4ContextJourney {
  journeyId: string;
  business: {
    actorRef: string;
    entry: { mode: string; preferredFromJourneyRef?: string };
    steps: Ns4ContextJourneyStep[];
  };
}

export interface Ns4ContextEntity {
  entityId: string;
  ownership?: string;
  storage?: { target?: string; scope?: string; idField?: string };
  fields?: Array<{ fieldId: string }>;
}

export interface Ns4ContextRelationship {
  fromEntity: string;
  toEntity: string;
  type: string;
  required: boolean;
}

export interface Ns4ContextSources {
  journeys: { journeys: Ns4ContextJourney[] };
  ontology: { entities: Ns4ContextEntity[]; relationships: Ns4ContextRelationship[] };
  access?: { profiles: Array<{ profileId: string; actorRefs: string[] }> };
}

/** A context id is a pure function of its entity, so the catalog and the E9 store are entity-keyed. */
export function ns4ContextIdOf(entity: string): string {
  return entity ? `selected${upperCamel(entity)}` : '';
}

/**
 * Platform-owned records are supplied by the runtime session, never selected by the user, so they
 * are not a coordination requirement of a business step.
 */
export function isNs4PlatformOwnedEntity(entity: Ns4ContextEntity): boolean {
  return entity.ownership === 'external' && entity.storage?.target === 'external' && entity.storage.scope === 'platform';
}

export function deriveNs4Contexts(sources: Ns4ContextSources): Ns4DerivedContextGraph {
  const entities = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  const sessionOwned = new Set([...entities.values()].filter(isNs4PlatformOwnedEntity).map(entity => entity.entityId));
  const parentsByEntity = requiredParents(sources.ontology.relationships, sessionOwned);
  const context = (entity: string): Ns4DerivedContext => {
    const idFieldRef = idFieldOf(entities.get(entity));
    return { contextId: ns4ContextIdOf(entity), businessObject: entity, cardinality: 'one', required: true,
      ...(idFieldRef ? { idFieldRef } : {}) };
  };

  const steps: Ns4DerivedStepContexts[] = [];
  for (const journey of sources.journeys.journeys) {
    const provided = new Set<string>();
    for (const step of journey.business.steps) {
      const entity = step.entity;
      const creates = step.kind === 'act' && !provided.has(entity);
      const requires = new Map<string, Ns4DerivedContext>();
      if (entity && !creates && step.kind !== 'locate') requires.set(entity, context(entity));
      if (entity && (step.kind === 'act' || step.kind === 'decide')) {
        for (const parent of parentsByEntity.get(entity) || []) {
          if (parent !== entity) requires.set(parent, context(parent));
        }
      }
      const stepRef = `${journey.journeyId}.${step.stepId}`;
      steps.push({ journeyId: journey.journeyId, stepId: step.stepId, stepRef, kind: step.kind, entity, creates,
        requires: sortContexts([...requires.values()]), provides: entity ? [context(entity)] : [] });
      if (entity) provided.add(entity);
    }
  }

  const byStepRef = new Map(steps.map(step => [step.stepRef, step]));
  const entryByJourneyId = new Map<string, Ns4DerivedContext[]>();
  const profilesByActor = new Map<string, string[]>();
  for (const profile of sources.access?.profiles || []) {
    for (const actor of profile.actorRefs || []) profilesByActor.set(actor, [...(profilesByActor.get(actor) || []), profile.profileId]);
  }
  for (const journey of sources.journeys.journeys) {
    const mode = journey.business.entry.mode;
    const first = journey.business.steps[0];
    if (mode === 'coldStart' || !first?.entity) { entryByJourneyId.set(journey.journeyId, []); continue; }
    if (mode === 'eventDriven') {
      const receiverProfiles = profilesByActor.get(journey.business.actorRef) || [];
      const sender = steps.find(step => step.kind === 'handoff' && step.journeyId !== journey.journeyId
        && receiverProfiles.includes(handoffTarget(sources, step.stepRef)));
      entryByJourneyId.set(journey.journeyId, [context(sender?.entity || first.entity)]);
      continue;
    }
    entryByJourneyId.set(journey.journeyId, [context(first.entity)]);
  }

  const catalog = sortContexts([...new Map([
    ...steps.flatMap(step => [...step.provides, ...step.requires]),
    ...[...entryByJourneyId.values()].flat(),
  ].map(item => [item.contextId, item])).values()]);
  return { catalog, steps, byStepRef, entryByJourneyId };
}

/** Business objects the ontology must realize: exactly the entities the journeys operate on. */
export function collectNs4JourneyEntities(journeys: { journeys: Ns4ContextJourney[] }): string[] {
  return [...new Set(journeys.journeys.flatMap(journey => journey.business.steps.map(step => step.entity)).filter(Boolean))].sort();
}

function handoffTarget(sources: Ns4ContextSources, stepRef: string): string {
  const [journeyId, stepId] = splitRef(stepRef);
  const journey = sources.journeys.journeys.find(item => item.journeyId === journeyId);
  return journey?.business.steps.find(step => step.stepId === stepId)?.targetProfile || '';
}

function splitRef(stepRef: string): [string, string] {
  const separator = stepRef.indexOf('.');
  return separator < 0 ? [stepRef, ''] : [stepRef.slice(0, separator), stepRef.slice(separator + 1)];
}

function requiredParents(relationships: Ns4ContextRelationship[], sessionOwned: Set<string>): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (!relationship.required || sessionOwned.has(relationship.toEntity)) continue;
    if (relationship.type !== 'manyToOne' && relationship.type !== 'oneToOne') continue;
    const current = result.get(relationship.fromEntity) || [];
    if (!current.includes(relationship.toEntity)) current.push(relationship.toEntity);
    result.set(relationship.fromEntity, current);
  }
  for (const [entity, parents] of result) result.set(entity, [...parents].sort());
  return result;
}

function idFieldOf(entity: Ns4ContextEntity | undefined): string {
  return entity?.storage?.idField || (entity?.fields || []).find(field => /id$/i.test(field.fieldId))?.fieldId || '';
}

function sortContexts(values: Ns4DerivedContext[]): Ns4DerivedContext[] {
  return [...values].sort((left, right) => left.contextId.localeCompare(right.contextId));
}

function upperCamel(value: string): string {
  return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : '';
}
