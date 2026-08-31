/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e4/gate.ts" enhancement="_blank"/>

import { deriveNs4Contexts } from '/_102020_/l2/agentNewSolution/helpers/ns4Context.js';
import {
  collectNs4RequiredJourneyBusinessObjects,
  Ns4E2Review,
} from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import { Ns4E3Review } from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import {
  applyNs4E4RelationshipBindings,
  assembleNs4E4Review,
  Ns4E4EntityDraft,
  Ns4E4PlanDraft,
  Ns4E4RelationshipBindingsDraft,
  Ns4E4Review,
  Ns4EnumLabel,
  Ns4OntologyEntity,
  Ns4OntologyField,
  Ns4OntologyRelationship,
  Ns4RelationshipRealizationKind,
} from '/_102020_/l2/agentNewSolution/steps/e4/contracts.js';

export interface Ns4E4GateIssue { code: string; path: string; message: string }
export interface Ns4E4GateResult { ok: boolean; issues: Ns4E4GateIssue[] }
export interface Ns4E4GateOptions {
  requireRelationshipRealization?: boolean;
  /** E1 prompt + scope. The user request, not the ontology notes the model wrote about itself. */
  requestText?: string;
}

/** Suffixes of an on-demand artifact. `ExportItem` is the composition-only companion of `Export`. */
const DERIVED_ARTIFACT_ID = /(?:Export|Report|Receipt|Snapshot|Csv|File)(?:Item)?$/u;
const DERIVED_HISTORY = /hist[oó]rico|auditoria|versionamento|reprocesso|\baudit\b|\bhistory\b|\bversioning\b|\breprocess(?:ing)?\b/iu;
const DERIVED_ARTIFACT_WORD = /exporta[cç][aã]o|\bexport\b|relat[oó]rio|\breport\b|recibo|\breceipt\b|snapshot|\bcsv\b|\bfile\b/iu;

const MODULE_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const VERB_ENTITY = /^(Create|Update|Delete|Manage|View|Browse|Generate|Record|Process|Send|Close|Open)[A-Z]/;
const MDM_TYPE = /^[a-z][A-Za-z0-9]*\.[A-Z][A-Za-z0-9]*$/;

export function validateNs4E4Review(
  review: Ns4E4Review,
  journeys?: Ns4E2Review,
  access?: Ns4E3Review,
  options: Ns4E4GateOptions = {},
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
  const declaredEntityIds = new Set(review.entities.map(entity => entity.entityId).filter(Boolean));
  const createdByStep = new Map<string, string>();
  if (journeys) {
    for (const step of deriveNs4Contexts({
      journeys,
      ontology: { entities: review.entities, relationships: review.relationships },
    }).steps) {
      if (step.creates && step.entity && !createdByStep.has(step.entity)) {
        createdByStep.set(step.entity, step.stepRef);
      }
    }
  }

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
    // PARTY POLICY (Wagner, 18/ago/2026): every natural person and every organization is master data of
    // the ORGANIZATION, reused across modules — a future CRM depends on that single registry. The two
    // checks below are what make it mechanical instead of a prompt the model may or may not honour.
    if (entity.cardinality === 'singleton') {
      const createRef = createdByStep.get(entity.entityId);
      if (createRef) {
        add(
          'NS4_E4_SINGLETON_CREATE',
          `${path}.cardinality`,
          `cardinality 'singleton' contradicts ${createRef}, which creates instances of ${entity.entityId}. Omit the field when a journey creates records of this entity.`,
        );
      }
    }
    if (!entity.party) {
      add('NS4_E4_PARTY_MISSING', `${path}.party`, "Declare party: 'person' | 'organization' | 'none' — whether this entity IS a natural person or an organization.");
    } else if (entity.party !== 'none' && entity.storage.target !== 'mdm') {
      add('NS4_E4_PARTY_STORAGE', `${path}.storage.target`, `A ${entity.party} is master data of the organization: use kind 'mdm', ownership 'moduleOwned', scope 'organization' and storage.target 'mdm' (not '${entity.storage.target}'). If the person also signs in, keep the login as an external-reference field (platformUserId) ON the MDM record — never a separate entity.`);
    }
    // `core` + `external` is a combination the policy does not define, and it is exactly what FieldWorker
    // used: read as `core`, the backend materialized a local table of PEOPLE and seeded it.
    if (entity.kind === 'core' && entity.ownership === 'external') {
      add('NS4_E4_OWNERSHIP_EXTERNAL_CORE', `${path}.ownership`, "kind 'core' with ownership 'external' is undefined by the policy: a platform/plugin identity is not an entity of this module — keep it as an external-reference field (platformUserId) on the record that needs it, and if the entity IS a person or organization, model it as MDM.");
    }
    if (entity.kind === 'projection' && entity.ownership === 'derived') {
      if (!entity.derivation) {
        add(
          'NS4_E4_DERIVATION_MISSING',
          `${path}.derivation`,
          `Derived projection ${entity.entityId} must declare derivation.from (source entity in this ontology), derivation.filter (predicate on the source fields, empty if none) and derivation.aggregate (count|sum|min|max|first|groupKey per output field) — a projection without a source is an incomplete model.`,
        );
      } else if (!declaredEntityIds.has(entity.derivation.from)) {
        const siblingHidden = declaredEntityIds.size === 1 && entity.derivation.from !== entity.entityId;
        if (!siblingHidden) {
          add(
            'NS4_E4_DERIVATION_FROM_UNKNOWN',
            `${path}.derivation.from`,
            `derivation.from '${entity.derivation.from}' is not an entity in this ontology.`,
          );
        }
      }
    }
    const expectedTarget = entity.ownership === 'external' ? 'external'
      : entity.kind === 'mdm' ? 'mdm'
      : entity.kind === 'projection' ? 'derived'
      : entity.kind === 'valueObject' ? 'embedded'
      : 'moduleDatabase';
    if (entity.storage.target !== expectedTarget) {
      add('NS4_E4_STORAGE_TARGET', `${path}.storage.target`, `${entity.kind}/${entity.ownership} must use storage target ${expectedTarget}, not ${entity.storage.target}.`);
    }
    if (options.requestText !== undefined
      && entity.storage.target === 'moduleDatabase' && DERIVED_ARTIFACT_ID.test(entity.entityId)
      && !requestPersistsDerivedArtifact(entity, options.requestText)) {
      add(
        'NS4_E4_DERIVED_PERSISTED',
        `${path}.storage.target`,
        `${entity.entityId} is an on-demand artifact (export/report/file/receipt/snapshot) stored as moduleDatabase. Use storage.target 'derived' (kind projection), or declare history/audit/versioning/reprocessing of that artifact in the request. An entity that only composes another derived artifact must not exist.`,
      );
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
    const terminalStates = new Set(entity.terminalStates || []);
    if (entity.lifecycleStates.length && !entity.initialState) {
      add('NS4_E4_LIFECYCLE_INITIAL_REQUIRED', `${path}.initialState`, 'An entity with lifecycle states must declare its initialState.');
    }
    if (entity.initialState && !lifecycleStates.has(entity.initialState)) {
      add('NS4_E4_LIFECYCLE_INITIAL_STATE', `${path}.initialState`, 'initialState must be a declared lifecycle state.');
    }
    if (entity.initialState && terminalStates.has(entity.initialState)) {
      add('NS4_E4_LIFECYCLE_INITIAL_TERMINAL', `${path}.initialState`, 'initialState cannot also be a terminal state.');
    }
    terminalStates.forEach(stateId => {
      if (!lifecycleStates.has(stateId)) {
        add('NS4_E4_LIFECYCLE_TERMINAL_STATE', `${path}.terminalStates`, `Unknown terminal lifecycle state ${stateId}.`);
      }
    });
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
    for (const { path: codePath, value } of closedDomainCodes(entity, path)) {
      if (!isStableEnEnumCode(value)) {
        add(
          'NS4_E4_ENUM_CODE_EN',
          codePath,
          `Closed-domain value must be a stable English code (lowerCamel ASCII, e.g. active, monday), not user-language text (got '${value}').`,
        );
      }
    }
    const lifecycleCodes = new Set(entity.lifecycleStates);
    validateEnumLabelList(entity.lifecycleLabels, lifecycleCodes, `${path}.lifecycleLabels`, add);
    entity.fields.forEach((field, fieldIndex) => {
      const allowed = new Set(field.enum?.length ? field.enum : isStatusFieldId(field.fieldId) ? entity.lifecycleStates : []);
      validateEnumLabelList(field.enumLabels, allowed, `${path}.fields[${fieldIndex}].enumLabels`, add);
    });
    const ruleIds = new Set<string>();
    entity.useRules.forEach((ruleId, ruleIndex) => {
      const rulePath = `${path}.useRules[${ruleIndex}]`;
      if (!MEMBER_ID.test(ruleId)) add('NS4_E4_RULE_ID', rulePath, 'Rule reference must be lower-camel.');
      if (ruleIds.has(ruleId)) add('NS4_E4_RULE_DUPLICATE', rulePath, `Duplicate rule reference ${ruleId}.`);
      if (ruleId) ruleIds.add(ruleId);
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
    if (options.requireRelationshipRealization !== false) {
      validateRelationshipRealization(review, relationship, path).forEach(issue => issues.push(issue));
    }
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

  if (options.requireRelationshipRealization !== false) {
    review.entities.forEach((entity, entityIndex) => {
      const ownershipRules = entity.useRules.filter(ruleRequiresOwnerRelation);
      if (!ownershipRules.length) return;
      if (entityDeclaresOwnerHandle(entity, review.relationships)) return;
      add(
        'NS4_E4_OWNER_RELATION',
        `entities[${entityIndex}].useRules`,
        `Rule ${ownershipRules.join(', ')} requires an owner relation on ${entity.entityId} (a customerId/ownerId field, or a relationship to Customer/Client/Owner realized by such a field) — without it the generated usecase cannot verify ownership.`,
      );
    });
  }

  return { ok: issues.length === 0, issues };
}

/** Validates the frozen cross-entity decisions before expensive entity fan-out starts. */
export function validateNs4E4Plan(
  plan: Ns4E4PlanDraft,
  journeys?: Ns4E2Review,
  access?: Ns4E3Review,
  options: Ns4E4GateOptions = {},
): Ns4E4GateResult {
  const review: Ns4E4Review = {
    ...plan,
    planId: 'e4-ontology-review',
    entities: plan.entities.map(entity => ({
      ...entity,
      fields: placeholderFields(entity.entityId, entity.storage.idField, entity.lifecycleStates.length > 0),
      useRules: [],
    })),
  };
  return validateNs4E4Review(review, journeys, access, { requireRelationshipRealization: false, requestText: options.requestText });
}

/** Validates that the binding pass covered every frozen semantic relationship exactly once. */
export function validateNs4E4RelationshipBindings(
  review: Ns4E4Review,
  draft: Ns4E4RelationshipBindingsDraft,
  journeys?: Ns4E2Review,
  access?: Ns4E3Review,
): Ns4E4GateResult {
  const issues: Ns4E4GateIssue[] = [];
  if (draft.moduleName !== review.moduleName) {
    issues.push({ code: 'NS4_E4_BINDING_MODULE', path: 'moduleName', message: `Expected module ${review.moduleName}.` });
  }
  if (draft.reviewRound !== review.reviewRound) {
    issues.push({ code: 'NS4_E4_BINDING_ROUND', path: 'reviewRound', message: `Expected review round ${review.reviewRound}.` });
  }
  const expected = new Set(review.relationships.map(relationship => relationship.relationshipId));
  const seen = new Set<string>();
  draft.bindings.forEach((binding, index) => {
    const path = `bindings[${index}].relationshipId`;
    if (!expected.has(binding.relationshipId)) {
      issues.push({ code: 'NS4_E4_BINDING_UNKNOWN', path, message: `Unknown relationship ${binding.relationshipId}.` });
    }
    if (seen.has(binding.relationshipId)) {
      issues.push({ code: 'NS4_E4_BINDING_DUPLICATE', path, message: `Duplicate binding for ${binding.relationshipId}.` });
    }
    seen.add(binding.relationshipId);
  });
  expected.forEach(relationshipId => {
    if (!seen.has(relationshipId)) {
      issues.push({ code: 'NS4_E4_BINDING_MISSING', path: 'bindings', message: `Missing binding for ${relationshipId}.` });
    }
  });
  if (issues.length) return { ok: false, issues };
  return validateNs4E4Review(applyNs4E4RelationshipBindings(review, draft), journeys, access);
}

function validateRelationshipRealization(
  review: Ns4E4Review,
  relationship: Ns4OntologyRelationship,
  path: string,
): Ns4E4GateIssue[] {
  const issues: Ns4E4GateIssue[] = [];
  const add = (code: string, suffix: string, message: string) => issues.push({ code, path: `${path}.realization${suffix}`, message });
  const realization = relationship.realization;
  if (!realization) {
    add('NS4_E4_RELATIONSHIP_REALIZATION', '', 'Every final relationship must identify the fields or derived strategy that realizes it.');
    return issues;
  }
  if (realization.from.entityId !== relationship.fromEntity) {
    add('NS4_E4_RELATIONSHIP_FROM_BINDING', '.from.entityId', `Expected ${relationship.fromEntity}.`);
  }
  if (realization.to.entityId !== relationship.toEntity) {
    add('NS4_E4_RELATIONSHIP_TO_BINDING', '.to.entityId', `Expected ${relationship.toEntity}.`);
  }
  if (realization.ownerEntity !== relationship.fromEntity && realization.ownerEntity !== relationship.toEntity) {
    add('NS4_E4_RELATIONSHIP_OWNER', '.ownerEntity', 'ownerEntity must be one of the relationship endpoints.');
  }
  if (!realization.description) add('NS4_E4_RELATIONSHIP_REALIZATION_DESCRIPTION', '.description', 'Field realization needs a human-readable explanation.');

  const allowedKinds = expectedRealizationKinds(relationship.persistence.mode);
  if (!allowedKinds.includes(realization.kind)) {
    add('NS4_E4_RELATIONSHIP_REALIZATION_KIND', '.kind', `${relationship.persistence.mode} must use ${allowedKinds.join(' or ')}, not ${realization.kind}.`);
  }
  const fromEntity = review.entities.find(entity => entity.entityId === relationship.fromEntity);
  const toEntity = review.entities.find(entity => entity.entityId === relationship.toEntity);
  const fromFields = new Set(fromEntity?.fields.map(field => field.fieldId) || []);
  const toFields = new Set(toEntity?.fields.map(field => field.fieldId) || []);
  validateEndpointFields(realization.from.fieldIds, fromFields, '.from.fieldIds', add);
  validateEndpointFields(realization.to.fieldIds, toFields, '.to.fieldIds', add);

  if (realization.kind !== 'derived' && (!realization.from.fieldIds.length || !realization.to.fieldIds.length)) {
    add('NS4_E4_RELATIONSHIP_FIELDS_REQUIRED', '', 'A persisted relationship must name at least one existing field at each endpoint.');
  }
  if (relationship.required && realization.kind !== 'derived') {
    const owner = realization.ownerEntity === relationship.fromEntity ? fromEntity : toEntity;
    const ownerFields = realization.ownerEntity === relationship.fromEntity
      ? realization.from.fieldIds : realization.to.fieldIds;
    if (ownerFields.some(fieldId => !owner?.fields.find(field => field.fieldId === fieldId)?.required)) {
      add('NS4_E4_RELATIONSHIP_REQUIRED_FIELD', '.ownerEntity', 'A required relationship must use required field(s) on its owning entity.');
    }
  }
  return issues;
}

function validateEndpointFields(
  fieldIds: string[],
  available: Set<string>,
  path: string,
  add: (code: string, suffix: string, message: string) => void,
): void {
  const seen = new Set<string>();
  fieldIds.forEach(fieldId => {
    if (seen.has(fieldId)) add('NS4_E4_RELATIONSHIP_FIELD_DUPLICATE', path, `Duplicate field ${fieldId}.`);
    if (!available.has(fieldId)) add('NS4_E4_RELATIONSHIP_FIELD_UNKNOWN', path, `Unknown field ${fieldId}.`);
    seen.add(fieldId);
  });
}

function expectedRealizationKinds(mode: Ns4OntologyRelationship['persistence']['mode']): Ns4RelationshipRealizationKind[] {
  if (mode === 'mdmRelationship') return ['mdmRelationship'];
  if (mode === 'derivedJoin') return ['derived'];
  if (mode === 'externalReference') return ['externalReference'];
  if (mode === 'embedded') return ['embedded'];
  return ['fieldReference', 'fieldCollection'];
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
  return validateNs4E4Review(review, undefined, undefined, { requireRelationshipRealization: false });
}

/** `customerCanViewOnlyOwnPets` and kin: the rule is only evaluable if the entity names its owner. */
function ruleRequiresOwnerRelation(ruleId: string): boolean {
  return /own(?:er|pets?)/i.test(ruleId);
}

function entityDeclaresOwnerHandle(entity: { entityId: string; fields: Ns4OntologyField[]; storage: { idField?: string } }, relationships: Ns4OntologyRelationship[]): boolean {
  const idField = entity.storage.idField || `${entity.entityId.slice(0, 1).toLowerCase()}${entity.entityId.slice(1)}Id`;
  if (entity.fields.some(field => /^(owner|customer|client)Id$/i.test(field.fieldId) || /OwnerId$/u.test(field.fieldId))) {
    return true;
  }
  return relationships.some((rel) => {
    if (rel.fromEntity !== entity.entityId && rel.toEntity !== entity.entityId) return false;
    const other = rel.fromEntity === entity.entityId ? rel.toEntity : rel.fromEntity;
    if (!/^(Customer|Client|Owner)$/u.test(other)) return false;
    const realization = rel.realization;
    if (!realization) return false;
    const ownFields = realization.from.entityId === entity.entityId
      ? realization.from.fieldIds
      : realization.to.entityId === entity.entityId ? realization.to.fieldIds : [];
    return ownFields.some(fieldId => fieldId !== idField && /Id$/u.test(fieldId));
  });
}

/**
 * Enum and lifecycle values are stable codes, not labels. Format alone is not enough: `ativo` is a
 * legal identifier and is exactly what the petShop E4 wrote (run08 then died when a seed repair
 * "translated" it to Active). The stem list is the Portuguese closed-domain vocabulary that shape
 * cannot catch, including camelCase splits (`diaInteiro` → dia + inteiro).
 */
const STABLE_EN_ENUM_CODE = /^[a-z][a-zA-Z0-9]*$/;
const PORTUGUESE_ENUM_STEMS = new Set([
  'aberto', 'agendado', 'aprovado', 'ativo', 'cancelada', 'cancelado', 'concluida', 'concluido',
  'confirmado', 'dia', 'disponivel', 'domingo', 'encerrada', 'encerrado', 'fechada', 'fechado',
  'feira', 'hora', 'inativa', 'inativo', 'indisponivel', 'iniciada', 'iniciado', 'inteiro',
  'pendente', 'publicado', 'quarta', 'quinta', 'rascunho', 'recusado', 'rejeitado', 'sabado',
  'segunda', 'sexta', 'solicitado', 'terca', 'vigente',
]);

function isStableEnEnumCode(value: string): boolean {
  if (!STABLE_EN_ENUM_CODE.test(value)) return false;
  if (PORTUGUESE_ENUM_STEMS.has(value.toLowerCase())) return false;
  return !splitCamelStems(value).some(stem => PORTUGUESE_ENUM_STEMS.has(stem));
}

function splitCamelStems(value: string): string[] {
  return value.split(/(?=[A-Z])/u).map(part => part.toLowerCase()).filter(Boolean);
}

function closedDomainCodes(entity: Ns4OntologyEntity, path: string): { path: string; value: string }[] {
  const out: { path: string; value: string }[] = [];
  const push = (codePath: string, value: string) => {
    if (value) out.push({ path: codePath, value });
  };
  entity.lifecycleStates.forEach((state, index) => push(`${path}.lifecycleStates[${index}]`, state));
  if (entity.initialState) push(`${path}.initialState`, entity.initialState);
  (entity.terminalStates || []).forEach((state, index) => push(`${path}.terminalStates[${index}]`, state));
  entity.lifecyclePredicates.forEach((predicate, predicateIndex) => {
    predicate.stateIds.forEach((state, stateIndex) => {
      push(`${path}.lifecyclePredicates[${predicateIndex}].stateIds[${stateIndex}]`, state);
    });
  });
  entity.fields.forEach((field, fieldIndex) => {
    const fieldPath = `${path}.fields[${fieldIndex}]`;
    const declared = field.enum?.length
      ? field.enum
      : field.constraints.filter(constraint => constraint.kind === 'enum').flatMap(constraint => enumConstraintValues(constraint.value));
    declared.forEach((value, valueIndex) => push(`${fieldPath}.enum[${valueIndex}]`, value));
  });
  return out;
}

function isStatusFieldId(fieldId: string): boolean {
  return /(^|[a-z0-9])status$/i.test(fieldId);
}

function validateEnumLabelList(
  labels: Ns4EnumLabel[] | undefined,
  allowed: Set<string>,
  path: string,
  add: (code: string, path: string, message: string) => void,
): void {
  if (!labels?.length) return;
  const seen = new Set<string>();
  labels.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!entry.code) {
      add('NS4_E4_ENUM_LABEL_CODE', `${entryPath}.code`, 'enumLabels.code is required.');
    } else if (!allowed.has(entry.code)) {
      add('NS4_E4_ENUM_LABEL_ORPHAN', `${entryPath}.code`, `enumLabels code '${entry.code}' is not in the closed domain.`);
    }
    if (entry.code && seen.has(entry.code)) {
      add('NS4_E4_ENUM_LABEL_DUPLICATE', `${entryPath}.code`, `Duplicate enumLabels code '${entry.code}'.`);
    }
    if (entry.code) seen.add(entry.code);
    if (!entry.label) {
      add('NS4_E4_ENUM_LABEL_TEXT', `${entryPath}.label`, 'enumLabels.label is required user-language text.');
    }
  });
}

function enumConstraintValues(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(Boolean);
    } catch { /* fall through to the separated forms */ }
  }
  const separator = trimmed.includes('|') ? '|' : ',';
  return trimmed.replace(/^[[(]|[\])]$/g, '').split(separator)
    .map(item => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
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

/**
 * The E1 request the derived-artifact guard classifies against. Ontology notes are not the request:
 * the model that invented an audit table will also invent audit prose about it.
 */
export function ns4E4RequestText(module: {
  designContext?: { initialPrompt?: string; clarification?: { mainGoal?: string; boundaries?: string } };
  businessScope?: {
    mainGoal?: string;
    inScope?: string[];
    expectedOutcomes?: Array<{ title?: string; description?: string }>;
  };
} | null | undefined): string {
  if (!module) return '';
  const outcomes = (module.businessScope?.expectedOutcomes || [])
    .flatMap(outcome => [outcome.title, outcome.description]);
  return [
    module.designContext?.initialPrompt,
    module.designContext?.clarification?.mainGoal,
    module.designContext?.clarification?.boundaries,
    module.businessScope?.mainGoal,
    ...(module.businessScope?.inScope || []),
    ...outcomes,
  ].filter(Boolean).join('\n');
}

function requestPersistsDerivedArtifact(entity: Ns4OntologyEntity, requestText: string): boolean {
  if (!requestText || !DERIVED_HISTORY.test(requestText)) return false;
  const blob = requestText.toLowerCase();
  const needles = [
    entity.entityId.toLowerCase(),
    entity.title.toLowerCase(),
  ].filter(Boolean);
  if (needles.some(needle => blob.includes(needle))) return true;
  return DERIVED_ARTIFACT_WORD.test(requestText);
}
