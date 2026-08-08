/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/gate.ts" enhancement="_blank"/>

import {
  collectNs4RequiredJourneyBusinessObjects,
  Ns4E2Review,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import {
  assembleNs4E4Review,
  Ns4E4EntityDraft,
  Ns4E4PlanDraft,
  Ns4E4Review,
  Ns4OntologyField,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';

export interface Ns4E4GateIssue { code: string; path: string; message: string }
export interface Ns4E4GateResult { ok: boolean; issues: Ns4E4GateIssue[] }

const MODULE_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const VERB_ENTITY = /^(Create|Update|Delete|Manage|View|Browse|Generate|Record|Process|Send|Close|Open)[A-Z]/;
const MDM_TYPE = /^[a-z][A-Za-z0-9]*\.[A-Z][A-Za-z0-9]*$/;

export function validateNs4E4Review(
  review: Ns4E4Review,
  journeys?: Ns4E2Review,
  access?: Ns4E3Review,
): Ns4E4GateResult {
  const issues: Ns4E4GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });

  if (!MODULE_ID.test(review.moduleName)) add('NS4_E4_MODULE_ID', 'moduleName', 'moduleName must be a lower-camel identifier.');
  if (review.solutionMode !== 'new') add('NS4_E4_SOLUTION_MODE', 'solutionMode', 'This E4 build currently accepts only the explicit new-solution mode.');
  if (!review.businessDomain) add('NS4_E4_BUSINESS_DOMAIN', 'businessDomain', 'The business domain is required.');
  if (!review.entities.length) add('NS4_E4_NO_ENTITIES', 'entities', 'At least one ontology entity is required.');

  const validJourneyIds = new Set(journeys?.journeys.map(item => item.journeyId) || []);
  const validFeatureIds = new Set(journeys?.features.map(item => item.featureId) || []);
  const requiredFeatureIds = new Set(journeys?.features.filter(item => item.priority === 'now').map(item => item.featureId) || []);
  const validAuthorityRefs = new Set(access?.authorities.map(item => item.authorityRef) || []);
  const requiredInformationAuthorities = new Set(
    access?.authorities.filter(item => item.informationNeeds.length > 0).map(item => item.authorityRef) || [],
  );
  const coveredJourneys = new Set<string>();
  const coveredFeatures = new Set<string>();
  const coveredAuthorities = new Set<string>();
  const entityIds = new Set<string>();

  review.entities.forEach((entity, entityIndex) => {
    const path = `entities[${entityIndex}]`;
    if (!ENTITY_ID.test(entity.entityId)) add('NS4_E4_ENTITY_ID', `${path}.entityId`, 'entityId must be a PascalCase business noun.');
    if (VERB_ENTITY.test(entity.entityId)) add('NS4_E4_ENTITY_VERB', `${path}.entityId`, 'Ontology entities must be data nouns, not actions or screens.');
    if (entityIds.has(entity.entityId)) add('NS4_E4_ENTITY_DUPLICATE', `${path}.entityId`, `Duplicate entityId ${entity.entityId}.`);
    if (entity.entityId) entityIds.add(entity.entityId);
    if (!entity.title) add('NS4_E4_ENTITY_TITLE', `${path}.title`, 'Entity title is required.');
    if (!entity.description) add('NS4_E4_ENTITY_DESCRIPTION', `${path}.description`, 'Entity description is required.');
    if (!entity.fields.length) add('NS4_E4_ENTITY_FIELDS', `${path}.fields`, 'Every entity must define its useful fields.');
    if (!entity.storage.notes) add('NS4_E4_STORAGE_NOTES', `${path}.storage.notes`, 'Every persistence decision needs a human-readable reason.');
    if (!entity.sourceRefs.journeyIds.length && !entity.sourceRefs.featureIds.length && !entity.sourceRefs.authorityRefs.length) {
      add('NS4_E4_ENTITY_SOURCE', `${path}.sourceRefs`, 'Every entity must be traceable to a journey, feature or access authority.');
    }
    entity.sourceRefs.journeyIds.forEach(ref => {
      if (journeys && !validJourneyIds.has(ref)) add('NS4_E4_JOURNEY_REF', `${path}.sourceRefs.journeyIds`, `Unknown E2 journey ${ref}.`);
      coveredJourneys.add(ref);
    });
    entity.sourceRefs.featureIds.forEach(ref => {
      if (journeys && !validFeatureIds.has(ref)) add('NS4_E4_FEATURE_REF', `${path}.sourceRefs.featureIds`, `Unknown E2 feature ${ref}.`);
      coveredFeatures.add(ref);
    });
    entity.sourceRefs.authorityRefs.forEach(ref => {
      if (access && !validAuthorityRefs.has(ref)) add('NS4_E4_AUTHORITY_REF', `${path}.sourceRefs.authorityRefs`, `Unknown E3 authority ${ref}.`);
      coveredAuthorities.add(ref);
    });

    const fieldIds = new Set<string>();
    entity.fields.forEach((field, fieldIndex) => {
      const fieldPath = `${path}.fields[${fieldIndex}]`;
      if (!MEMBER_ID.test(field.fieldId)) add('NS4_E4_FIELD_ID', `${fieldPath}.fieldId`, 'fieldId must be a lower-camel identifier.');
      if (fieldIds.has(field.fieldId)) add('NS4_E4_FIELD_DUPLICATE', `${fieldPath}.fieldId`, `Duplicate field ${field.fieldId}.`);
      if (field.fieldId) fieldIds.add(field.fieldId);
      if (!field.title) add('NS4_E4_FIELD_TITLE', `${fieldPath}.title`, 'Field title is required for human review.');
      if (!field.description) add('NS4_E4_FIELD_DESCRIPTION', `${fieldPath}.description`, 'Field description is required.');
      const constraintIds = new Set<string>();
      field.constraints.forEach((constraint, constraintIndex) => {
        const constraintPath = `${fieldPath}.constraints[${constraintIndex}]`;
        if (!MEMBER_ID.test(constraint.constraintId)) add('NS4_E4_CONSTRAINT_ID', `${constraintPath}.constraintId`, 'constraintId must be lower-camel.');
        if (constraintIds.has(constraint.constraintId)) add('NS4_E4_CONSTRAINT_DUPLICATE', `${constraintPath}.constraintId`, `Duplicate constraint ${constraint.constraintId}.`);
        if (constraint.constraintId) constraintIds.add(constraint.constraintId);
        if (!constraint.value) add('NS4_E4_CONSTRAINT_VALUE', `${constraintPath}.value`, 'Constraint value is required.');
        if (!constraint.description) add('NS4_E4_CONSTRAINT_DESCRIPTION', `${constraintPath}.description`, 'Constraint description is required.');
        if (constraint.source === 'database' || constraint.source === 'legacyCode') {
          add('NS4_E4_GREENFIELD_LEGACY_SOURCE', `${constraintPath}.source`, 'A new solution cannot claim a discovered database or legacy-code constraint.');
        }
      });
    });
    const expectedTarget = entity.ownership === 'external' ? 'external'
      : entity.kind === 'mdm' ? 'mdm'
      : entity.kind === 'projection' ? 'derived'
      : entity.kind === 'valueObject' ? 'embedded'
      : 'moduleDatabase';
    if (entity.storage.target !== expectedTarget) {
      add('NS4_E4_STORAGE_TARGET', `${path}.storage.target`, `${entity.kind}/${entity.ownership} must use storage target ${expectedTarget}, not ${entity.storage.target}.`);
    }
    const expectedScope = expectedTarget === 'mdm' ? 'organization'
      : expectedTarget === 'moduleDatabase' ? 'module'
      : expectedTarget === 'external' ? 'platform'
      : 'none';
    if (entity.storage.scope !== expectedScope) {
      add('NS4_E4_STORAGE_SCOPE', `${path}.storage.scope`, `${expectedTarget} storage must use scope ${expectedScope}.`);
    }
    if ((entity.storage.target === 'mdm' || entity.storage.target === 'moduleDatabase')
      && !entity.fields.some(field => field.required && /Id$/.test(field.fieldId))) {
      add('NS4_E4_ENTITY_IDENTIFIER', `${path}.fields`, 'Stored business entities need a required identifier field ending in Id.');
    }
    if (entity.storage.target === 'mdm' || entity.storage.target === 'moduleDatabase') {
      const idField = entity.fields.find(field => field.fieldId === entity.storage.idField);
      if (!entity.storage.idField || !idField || !idField.required || idField.type !== 'uuid') {
        add('NS4_E4_STORAGE_ID_FIELD', `${path}.storage.idField`, 'Stored entities must name an existing required uuid idField.');
      }
    } else if (entity.storage.idField) {
      add('NS4_E4_STORAGE_ID_UNUSED', `${path}.storage.idField`, `${entity.storage.target} entities must not declare a persisted idField.`);
    }
    if (entity.storage.target === 'mdm') {
      if (!entity.storage.mdmType || !MDM_TYPE.test(entity.storage.mdmType)) {
        add('NS4_E4_MDM_TYPE', `${path}.storage.mdmType`, 'MDM entities require mdmType in lowerCamelModule.PascalEntity form.');
      } else if (entity.storage.mdmType !== `${review.moduleName}.${entity.entityId}`) {
        add('NS4_E4_MDM_TYPE_MODULE', `${path}.storage.mdmType`, `Module-owned MDM type must be ${review.moduleName}.${entity.entityId}.`);
      }
    } else if (entity.storage.mdmType) {
      add('NS4_E4_MDM_TYPE_UNUSED', `${path}.storage.mdmType`, 'Only MDM entities may declare mdmType.');
    }
    if (entity.lifecycleStates.length && !entity.fields.some(field => field.fieldId === 'status')) {
      add('NS4_E4_LIFECYCLE_STATUS', `${path}.lifecycleStates`, 'An entity with lifecycle states must define a status field.');
    }
    const lifecycleStates = new Set(entity.lifecycleStates);
    const lifecyclePredicateIds = new Set<string>();
    entity.lifecyclePredicates.forEach((predicate, predicateIndex) => {
      const predicatePath = `${path}.lifecyclePredicates[${predicateIndex}]`;
      if (!MEMBER_ID.test(predicate.predicateId)) {
        add('NS4_E4_LIFECYCLE_PREDICATE_ID', `${predicatePath}.predicateId`, 'predicateId must be lower-camel.');
      }
      if (lifecyclePredicateIds.has(predicate.predicateId)) {
        add('NS4_E4_LIFECYCLE_PREDICATE_DUPLICATE', `${predicatePath}.predicateId`, `Duplicate lifecycle predicate ${predicate.predicateId}.`);
      }
      if (predicate.predicateId) lifecyclePredicateIds.add(predicate.predicateId);
      if (!predicate.description) {
        add('NS4_E4_LIFECYCLE_PREDICATE_DESCRIPTION', `${predicatePath}.description`, 'Lifecycle predicate description is required.');
      }
      if (!predicate.stateIds.length) {
        add('NS4_E4_LIFECYCLE_PREDICATE_EMPTY', `${predicatePath}.stateIds`, 'A lifecycle predicate must identify at least one state.');
      }
      const predicateStates = new Set<string>();
      predicate.stateIds.forEach(stateId => {
        if (!lifecycleStates.has(stateId)) {
          add('NS4_E4_LIFECYCLE_PREDICATE_STATE', `${predicatePath}.stateIds`, `Unknown lifecycle state ${stateId}.`);
        }
        if (predicateStates.has(stateId)) {
          add('NS4_E4_LIFECYCLE_PREDICATE_STATE_DUPLICATE', `${predicatePath}.stateIds`, `Duplicate lifecycle state ${stateId}.`);
        }
        predicateStates.add(stateId);
      });
      if (predicate.source === 'database' || predicate.source === 'legacyCode') {
        add('NS4_E4_GREENFIELD_LEGACY_PREDICATE', `${predicatePath}.source`, 'A new solution cannot claim a discovered legacy lifecycle predicate.');
      }
    });
    const invariantIds = new Set<string>();
    entity.invariants.forEach((invariant, invariantIndex) => {
      const invariantPath = `${path}.invariants[${invariantIndex}]`;
      if (!MEMBER_ID.test(invariant.invariantId)) add('NS4_E4_INVARIANT_ID', `${invariantPath}.invariantId`, 'invariantId must be lower-camel.');
      if (invariantIds.has(invariant.invariantId)) add('NS4_E4_INVARIANT_DUPLICATE', `${invariantPath}.invariantId`, `Duplicate invariant ${invariant.invariantId}.`);
      if (invariant.invariantId) invariantIds.add(invariant.invariantId);
      if (!invariant.description) add('NS4_E4_INVARIANT_DESCRIPTION', `${invariantPath}.description`, 'Invariant description is required.');
      if (invariant.source === 'database' || invariant.source === 'legacyCode') {
        add('NS4_E4_GREENFIELD_LEGACY_INVARIANT', `${invariantPath}.source`, 'A new solution cannot claim a discovered legacy invariant.');
      }
    });
  });

  validJourneyIds.forEach(ref => {
    if (!coveredJourneys.has(ref)) add('NS4_E4_JOURNEY_COVERAGE', 'entities.sourceRefs.journeyIds', `Journey ${ref} is not represented in the ontology.`);
  });
  requiredFeatureIds.forEach(ref => {
    if (!coveredFeatures.has(ref)) add('NS4_E4_FEATURE_COVERAGE', 'entities.sourceRefs.featureIds', `Now feature ${ref} is not represented in the ontology.`);
  });
  requiredInformationAuthorities.forEach(ref => {
    if (!coveredAuthorities.has(ref)) add('NS4_E4_INFORMATION_COVERAGE', 'entities.sourceRefs.authorityRefs', `Information authority ${ref} is not represented in the ontology.`);
  });
  const requiredContextObjects = new Set(journeys ? collectNs4RequiredJourneyBusinessObjects(journeys) : []);
  requiredContextObjects.forEach(businessObject => {
    if (!entityIds.has(businessObject)) {
      add(
        'NS4_E4_REQUIRED_CONTEXT_OBJECT', 'entities',
        `Required E2 journey business object ${businessObject} needs an E4 entity or projection with the same entityId.`,
      );
    }
  });

  const relationshipIds = new Set<string>();
  const relatedEntities = new Set<string>();
  review.relationships.forEach((relationship, index) => {
    const path = `relationships[${index}]`;
    if (!MEMBER_ID.test(relationship.relationshipId)) add('NS4_E4_RELATIONSHIP_ID', `${path}.relationshipId`, 'relationshipId must be lower-camel.');
    if (relationshipIds.has(relationship.relationshipId)) add('NS4_E4_RELATIONSHIP_DUPLICATE', `${path}.relationshipId`, `Duplicate relationship ${relationship.relationshipId}.`);
    if (relationship.relationshipId) relationshipIds.add(relationship.relationshipId);
    if (!entityIds.has(relationship.fromEntity)) add('NS4_E4_RELATIONSHIP_FROM', `${path}.fromEntity`, `Unknown entity ${relationship.fromEntity}.`);
    if (!entityIds.has(relationship.toEntity)) add('NS4_E4_RELATIONSHIP_TO', `${path}.toEntity`, `Unknown entity ${relationship.toEntity}.`);
    if (relationship.fromEntity === relationship.toEntity) add('NS4_E4_RELATIONSHIP_SELF', path, 'Self relationships require a later explicit design and are not accepted implicitly.');
    if (!relationship.description) add('NS4_E4_RELATIONSHIP_DESCRIPTION', `${path}.description`, 'Relationship description is required.');
    relatedEntities.add(relationship.fromEntity);
    relatedEntities.add(relationship.toEntity);
  });
  if (review.entities.length > 1) {
    review.entities.filter(entity => entity.kind !== 'valueObject' && entity.kind !== 'projection').forEach(entity => {
      if (!relatedEntities.has(entity.entityId)) add('NS4_E4_ENTITY_ORPHAN', 'relationships', `Entity ${entity.entityId} is disconnected from the ontology graph.`);
    });
    review.entities.filter(entity => entity.kind === 'projection' && entity.fields.some(field => field.fieldId === 'projectId')).forEach(entity => {
      if (entityIds.has('Project') && !relatedEntities.has(entity.entityId)) {
        add('NS4_E4_PROJECT_PROJECTION_ORPHAN', 'relationships', `Project-related projection ${entity.entityId} must declare its relationship to Project.`);
      }
    });
  }

  return { ok: issues.length === 0, issues };
}

/** Validates the frozen cross-entity decisions before expensive entity fan-out starts. */
export function validateNs4E4Plan(
  plan: Ns4E4PlanDraft,
  journeys?: Ns4E2Review,
  access?: Ns4E3Review,
): Ns4E4GateResult {
  const review: Ns4E4Review = {
    ...plan,
    planId: 'e4-ontology-review',
    entities: plan.entities.map(entity => ({
      ...entity,
      fields: placeholderFields(entity.entityId, entity.storage.idField, entity.lifecycleStates.length > 0),
      invariants: [],
    })),
  };
  return validateNs4E4Review(review, journeys, access);
}

/** Validates one parallel entity result against the storage/lifecycle contract frozen by the plan. */
export function validateNs4E4EntityDraft(
  plan: Ns4E4PlanDraft,
  detail: Ns4E4EntityDraft,
): Ns4E4GateResult {
  const issues: Ns4E4GateIssue[] = [];
  if (detail.moduleName !== plan.moduleName) {
    issues.push({ code: 'NS4_E4_ENTITY_MODULE', path: 'moduleName', message: `Expected module ${plan.moduleName}.` });
  }
  if (detail.reviewRound !== plan.reviewRound) {
    issues.push({ code: 'NS4_E4_ENTITY_ROUND', path: 'reviewRound', message: `Expected review round ${plan.reviewRound}.` });
  }
  if (!plan.entities.some(entity => entity.entityId === detail.entityId)) {
    issues.push({ code: 'NS4_E4_ENTITY_UNKNOWN', path: 'entityId', message: `Entity ${detail.entityId} is not in the ontology plan.` });
  }
  if (issues.length) return { ok: false, issues };
  const review = assembleNs4E4Review(
    { ...plan, entities: plan.entities.filter(entity => entity.entityId === detail.entityId), relationships: [] },
    [detail],
  );
  return validateNs4E4Review(review);
}

function placeholderFields(entityId: string, idField: string | undefined, needsStatus: boolean): Ns4OntologyField[] {
  const fields: Ns4OntologyField[] = [{
    fieldId: idField || `${entityId.slice(0, 1).toLowerCase()}${entityId.slice(1)}Value`,
    title: entityId,
    type: idField ? 'uuid' : 'string',
    required: true,
    description: 'Plan-validation placeholder replaced by the entity detail pass.',
    constraints: [],
  }];
  if (needsStatus && !fields.some(field => field.fieldId === 'status')) {
    fields.push({
      fieldId: 'status', title: 'Status', type: 'string', required: true,
      description: 'Plan-validation lifecycle placeholder replaced by the entity detail pass.', constraints: [],
    });
  }
  return fields;
}
