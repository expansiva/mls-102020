/// <mls fileReference="_102020_/l2/agentNewSolution4/types.ts" enhancement="_blank"/>

// Canonical public type facade for every L4 contract produced by agentNewSolution4.
// Generated .defs.ts files import only from this stable path; implementation files may keep their
// types beside the owning step without forcing L1/L2 consumers to know the internal folder layout.

import type { Ns4ModuleArtifact } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import type { Ns4JourneyArtifact, Ns4JourneyIndex } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4AccessMatrixArtifact } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type {
  Ns4OntologyEntityArtifact,
  Ns4OntologyIndexArtifact,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import type { Ns4CompositionArtifact } from '/_102020_/l2/agentNewSolution4/steps/e6/contracts.js';
import type {
  Ns4UseCaseArtifact,
  Ns4UseCaseArtifactV3,
  Ns4UseCaseIndexArtifact,
  Ns4UseCaseIndexArtifactV3,
  Ns4WorkflowArtifact,
  Ns4WorkflowArtifactV2,
  Ns4WorkflowIndexArtifact,
  Ns4WorkflowIndexArtifactV2,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';

export type {
  Ns4ApprovedBy,
  Ns4CompletedStepId,
  Ns4E1Status,
  Ns4E2Status,
  Ns4E3Status,
  Ns4E4Status,
  Ns4E5Status,
  Ns4E6Status,
  Ns4E7Status,
  Ns4ModuleArtifact,
  Ns4NextStep,
  Ns4PipelineState,
  Ns4Presentation,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';

export type {
  Ns4E2Feature,
  Ns4E2Review,
  Ns4E2ReviewEvent,
  Ns4FeaturePriority,
  Ns4JourneyArtifact,
  Ns4JourneyBusiness,
  Ns4JourneyContext,
  Ns4JourneyEntryMode,
  Ns4JourneyIndex,
  Ns4JourneyPrerequisite,
  Ns4JourneyProposal,
  Ns4JourneyStep,
  Ns4JourneyStepKind,
  Ns4PolicyDecision,
  Ns4PolicyDecisionSelection,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export type {
  Ns4AccessAuthority,
  Ns4AccessGrant,
  Ns4AccessMatrixArtifact,
  Ns4AccessProfile,
  Ns4AccessProfileKind,
  Ns4AccessScopeMode,
  Ns4DisclosureMode,
  Ns4E3Review,
  Ns4E3ReviewEvent,
} from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';

export type {
  Ns4ConstraintSource,
  Ns4E4EntityDraft,
  Ns4E4PlanDraft,
  Ns4E4RelationshipBinding,
  Ns4E4RelationshipBindingsDraft,
  Ns4E4Review,
  Ns4E4ReviewEvent,
  Ns4EntityKind,
  Ns4EntityOwnership,
  Ns4FieldConstraint,
  Ns4LifecyclePredicate,
  Ns4OntologyEntity,
  Ns4OntologyEntityArtifact,
  Ns4OntologyEntityPlan,
  Ns4OntologyField,
  Ns4OntologyIndexArtifact,
  Ns4OntologyRelationship,
  Ns4RelationshipEndpointBinding,
  Ns4RelationshipPersistenceMode,
  Ns4RelationshipRealization,
  Ns4RelationshipRealizationKind,
  Ns4ResolvedOntologyRelationship,
  Ns4StorageScope,
  Ns4StorageTarget,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';

export type {
  Ns4E5Review,
  Ns4E5ReviewEvent,
  Ns4RuleDefinition,
  Ns4RulesArtifact,
} from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';

export type {
  Ns4AdditionalCapability,
  Ns4AdditionalCapabilityDecision,
  Ns4AdditionalCapabilityKind,
  Ns4CompositionArtifact,
  Ns4E6Review,
  Ns4E6ReviewEvent,
} from '/_102020_/l2/agentNewSolution4/steps/e6/contracts.js';

export type {
  Ns4E7PlanDraft,
  Ns4E7PlanUseCase,
  Ns4E7SourceHashes,
  Ns4UseCaseArtifact,
  Ns4UseCaseArtifactV3,
  Ns4UseCaseDraft,
  Ns4UseCaseEntityAccess,
  Ns4UseCaseError,
  Ns4UseCaseFieldRef,
  Ns4UseCaseIndexArtifact,
  Ns4UseCaseIndexArtifactV3,
  Ns4UseCaseInput,
  Ns4UseCaseKind,
  Ns4UseCaseOutput,
  Ns4UseCaseTransition,
  Ns4WorkflowArtifact,
  Ns4WorkflowArtifactV2,
  Ns4WorkflowIndexArtifact,
  Ns4WorkflowIndexArtifactV2,
  Ns4WorkflowTransition,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';

export const NS4_PERMANENT_ARTIFACT_TYPE_NAMES = [
  'Ns4ModuleArtifact',
  'Ns4JourneyArtifact',
  'Ns4JourneyIndex',
  'Ns4AccessMatrixArtifact',
  'Ns4OntologyEntityArtifact',
  'Ns4OntologyIndexArtifact',
  'Ns4RulesArtifact',
  'Ns4CompositionArtifact',
  'Ns4UseCaseArtifact',
  'Ns4UseCaseArtifactV3',
  'Ns4UseCaseIndexArtifact',
  'Ns4UseCaseIndexArtifactV3',
  'Ns4WorkflowArtifact',
  'Ns4WorkflowArtifactV2',
  'Ns4WorkflowIndexArtifact',
  'Ns4WorkflowIndexArtifactV2',
] as const;

export type Ns4PermanentArtifactTypeName = typeof NS4_PERMANENT_ARTIFACT_TYPE_NAMES[number];

export interface Ns4PermanentArtifactByType {
  Ns4ModuleArtifact: Ns4ModuleArtifact;
  Ns4JourneyArtifact: Ns4JourneyArtifact;
  Ns4JourneyIndex: Ns4JourneyIndex;
  Ns4AccessMatrixArtifact: Ns4AccessMatrixArtifact;
  Ns4OntologyEntityArtifact: Ns4OntologyEntityArtifact;
  Ns4OntologyIndexArtifact: Ns4OntologyIndexArtifact;
  Ns4RulesArtifact: Ns4RulesArtifact;
  Ns4CompositionArtifact: Ns4CompositionArtifact;
  Ns4UseCaseArtifact: Ns4UseCaseArtifact;
  Ns4UseCaseArtifactV3: Ns4UseCaseArtifactV3;
  Ns4UseCaseIndexArtifact: Ns4UseCaseIndexArtifact;
  Ns4UseCaseIndexArtifactV3: Ns4UseCaseIndexArtifactV3;
  Ns4WorkflowArtifact: Ns4WorkflowArtifact;
  Ns4WorkflowArtifactV2: Ns4WorkflowArtifactV2;
  Ns4WorkflowIndexArtifact: Ns4WorkflowIndexArtifact;
  Ns4WorkflowIndexArtifactV2: Ns4WorkflowIndexArtifactV2;
}
