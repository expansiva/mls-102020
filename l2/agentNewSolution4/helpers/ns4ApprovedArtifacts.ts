/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4ApprovedArtifacts.ts" enhancement="_blank"/>

import { isNs4Pipeline } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  ns4AccessMatrixFile, ns4JourneyFile, ns4JourneyIndexFile, ns4OntologyEntityFile,
  ns4OntologyIndexFile, Ns4FileInfo, readNs4DefsJson, readNs4Module, readNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import {
  normalizeNs4E2Review, Ns4E2Review, Ns4JourneyArtifact, Ns4JourneyIndex,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import {
  normalizeNs4E3Review, Ns4AccessMatrixArtifact, Ns4E3Review,
} from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import {
  normalizeNs4E4Review, Ns4E4Review, Ns4OntologyEntityArtifact, Ns4OntologyIndexArtifact,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';

export async function readNs4ApprovedJourneys(moduleName: string): Promise<Ns4E2Review> {
  const [module, pipeline, index] = await Promise.all([
    readNs4Module(moduleName),
    readNs4Pipeline(moduleName),
    readRequiredDefs<Ns4JourneyIndex>(ns4JourneyIndexFile(moduleName), 'journey index'),
  ]);
  if (!module || !isNs4Pipeline(pipeline) || index.moduleName !== moduleName) {
    throw new Error(`Approved journey ownership is invalid for ${moduleName}.`);
  }
  const artifacts = await mapInBatches(index.journeys, entry =>
    readRequiredDefs<Ns4JourneyArtifact>(ns4JourneyFile(moduleName, entry.journeyId), `journey ${entry.journeyId}`));
  const byId = new Map(artifacts.map(artifact => [artifact.journeyId, artifact]));
  const journeys = index.journeys.map(entry => {
    const artifact = byId.get(entry.journeyId);
    if (!artifact || artifact.businessHash !== entry.businessHash) {
      throw new Error(`Approved journey artifact mismatch: ${entry.journeyId}.`);
    }
    return artifact;
  });
  if (byId.size !== index.journeys.length) {
    throw new Error(`Approved journey index contains duplicate or unexpected artifacts for ${moduleName}.`);
  }
  return normalizeNs4E2Review({
    moduleName,
    userLanguage: module.presentation.userLanguage,
    reviewRound: pipeline.steps.e2?.reviewRound || 1,
    journeys,
    features: index.features,
  }, moduleName);
}

export async function readNs4ApprovedAccess(moduleName: string): Promise<Ns4E3Review> {
  const artifact = await readRequiredDefs<Ns4AccessMatrixArtifact>(ns4AccessMatrixFile(moduleName), 'access matrix');
  if (artifact.moduleName !== moduleName) throw new Error(`Approved access ownership is invalid for ${moduleName}.`);
  return normalizeNs4E3Review(artifact, moduleName);
}

export async function readNs4ApprovedOntology(moduleName: string): Promise<Ns4E4Review> {
  const [pipeline, index] = await Promise.all([
    readNs4Pipeline(moduleName),
    readRequiredDefs<Ns4OntologyIndexArtifact>(ns4OntologyIndexFile(moduleName), 'ontology index'),
  ]);
  if (!isNs4Pipeline(pipeline) || index.moduleName !== moduleName) {
    throw new Error(`Approved ontology ownership is invalid for ${moduleName}.`);
  }
  const artifacts = await mapInBatches(index.entities, entry =>
    readRequiredDefs<Ns4OntologyEntityArtifact>(ns4OntologyEntityFile(moduleName, entry.entityId), `ontology entity ${entry.entityId}`));
  const byId = new Map(artifacts.map(artifact => [artifact.entityId, artifact]));
  const entities = index.entities.map(entry => {
    const artifact = byId.get(entry.entityId);
    if (!artifact || artifact.moduleName !== moduleName || artifact.ontologyHash !== index.ontologyHash) {
      throw new Error(`Approved ontology artifact mismatch: ${entry.entityId}.`);
    }
    return artifact;
  });
  if (byId.size !== index.entities.length) {
    throw new Error(`Approved ontology index contains duplicate or unexpected artifacts for ${moduleName}.`);
  }
  return normalizeNs4E4Review({
    moduleName,
    userLanguage: index.userLanguage,
    title: index.title,
    reviewRound: pipeline.steps.e4?.reviewRound || 1,
    solutionMode: index.solutionMode,
    businessDomain: index.businessDomain,
    entities,
    relationships: index.relationships,
    changeSummary: [],
  }, moduleName);
}

export async function readNs4ApprovedOntologyEntity(
  moduleName: string,
  entityId: string,
): Promise<Ns4OntologyEntityArtifact | null> {
  const artifact = await readOptionalDefs<Ns4OntologyEntityArtifact>(
    ns4OntologyEntityFile(moduleName, entityId), `ontology entity ${entityId}`,
  );
  return artifact?.moduleName === moduleName ? artifact : null;
}

async function readRequiredDefs<T>(fileInfo: Ns4FileInfo, label: string): Promise<T> {
  let failure = '';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const artifact = await readNs4DefsJson<T>(fileInfo, true);
      if (artifact) return artifact;
      failure = 'storage returned non-parseable content';
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`Unable to read approved ${label} after 2 attempts: ${failure}`);
}

async function readOptionalDefs<T>(fileInfo: Ns4FileInfo, label: string): Promise<T | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const artifact = await readNs4DefsJson<T>(fileInfo, false);
      if (artifact) return artifact;
    } catch { /* optional previous artifact */ }
  }
  return null;
}

async function mapInBatches<T, R>(items: T[], load: (item: T) => Promise<R>): Promise<R[]> {
  const result: R[] = [];
  for (let index = 0; index < items.length; index += 5) {
    result.push(...await Promise.all(items.slice(index, index + 5).map(load)));
  }
  return result;
}
