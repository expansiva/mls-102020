/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/sources.ts" enhancement="_blank"/>

import { Ns4PipelineState } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  normalizeNs4E2Review, Ns4JourneyArtifact, Ns4JourneyIndex,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import {
  normalizeNs4E3Review, Ns4AccessMatrixArtifact,
} from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import {
  normalizeNs4E4Review, Ns4OntologyEntityArtifact, Ns4OntologyIndexArtifact,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import { Ns4E5Sources } from '/_102020_/l2/agentNewSolution4/steps/e5/gate.js';

export function assembleNs4E5SourcesFromApprovedArtifacts(
  module: Ns4E5Sources['module'],
  accessArtifact: Ns4AccessMatrixArtifact,
  journeyIndex: Ns4JourneyIndex,
  journeyArtifacts: Ns4JourneyArtifact[],
  ontologyIndex: Ns4OntologyIndexArtifact,
  ontologyEntities: Ns4OntologyEntityArtifact[],
  pipeline: Ns4PipelineState,
): Ns4E5Sources {
  const moduleName = module.module.moduleName;
  if (journeyIndex.moduleName !== moduleName || ontologyIndex.moduleName !== moduleName) {
    throw new Error(`Approved source module mismatch for ${moduleName}.`);
  }
  const journeyById = new Map(journeyArtifacts.map(artifact => [artifact.journeyId, artifact]));
  const journeys = journeyIndex.journeys.map(entry => {
    const artifact = journeyById.get(entry.journeyId);
    if (!artifact || artifact.businessHash !== entry.businessHash) {
      throw new Error(`Approved journey artifact mismatch: ${entry.journeyId}.`);
    }
    return artifact;
  });
  if (journeyById.size !== journeyIndex.journeys.length) {
    throw new Error(`Approved journey index contains duplicate or unexpected artifacts for ${moduleName}.`);
  }
  const entityById = new Map(ontologyEntities.map(entity => [entity.entityId, entity]));
  const entities = ontologyIndex.entities.map(entry => {
    const entity = entityById.get(entry.entityId);
    if (!entity || entity.moduleName !== moduleName || entity.ontologyHash !== ontologyIndex.ontologyHash) {
      throw new Error(`Approved ontology artifact mismatch: ${entry.entityId}.`);
    }
    return entity;
  });
  if (entityById.size !== ontologyIndex.entities.length) {
    throw new Error(`Approved ontology index contains duplicate or unexpected artifacts for ${moduleName}.`);
  }
  return {
    module,
    journeys: normalizeNs4E2Review({
      moduleName,
      userLanguage: module.presentation.userLanguage,
      reviewRound: pipeline.steps.e2?.reviewRound || 1,
      journeys,
      features: journeyIndex.features,
    }, moduleName),
    access: normalizeNs4E3Review(accessArtifact, moduleName),
    ontology: normalizeNs4E4Review({
      moduleName,
      userLanguage: ontologyIndex.userLanguage,
      title: ontologyIndex.title,
      reviewRound: pipeline.steps.e4?.reviewRound || 1,
      solutionMode: ontologyIndex.solutionMode,
      businessDomain: ontologyIndex.businessDomain,
      entities,
      relationships: ontologyIndex.relationships,
      changeSummary: [],
    }, moduleName),
  };
}
