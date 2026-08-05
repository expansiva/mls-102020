/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/nodejsSmoke.ts" enhancement="_blank"/>

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  isNs4Pipeline,
  markNs4E2Approved,
  markNs4E2Running,
  markNs4E2WaitingHuman,
  markNs4ModuleE2Approved,
  Ns4ModuleArtifact,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  buildNs4JourneyArtifacts,
  buildNs4JourneyIndex,
  normalizeNs4E2Review,
  stableNs4Stringify,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { validateNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/gate.js';

async function main(): Promise<void> {
  const [moduleDirArg, reviewFileArg, writeFlag] = process.argv.slice(2);
  if (!moduleDirArg || !reviewFileArg) {
    throw new Error('Usage: nodejsSmoke.ts <absolute-l4-module-dir> <absolute-review.json> [--write]');
  }
  const moduleDir = path.resolve(moduleDirArg);
  const reviewFile = path.resolve(reviewFileArg);
  const moduleFile = path.join(moduleDir, 'module.defs.ts');
  const pipelineFile = path.join(moduleDir, 'pipeline', 'pipeline.json');
  const [moduleSource, pipelineSource, reviewSource] = await Promise.all([
    readFile(moduleFile, 'utf8'), readFile(pipelineFile, 'utf8'), readFile(reviewFile, 'utf8'),
  ]);
  const moduleArtifact = parseDefs(moduleSource) as Ns4ModuleArtifact;
  const pipeline = JSON.parse(pipelineSource);
  const review = normalizeNs4E2Review(JSON.parse(reviewSource), moduleArtifact.module.moduleName);
  review.moduleName = moduleArtifact.module.moduleName;

  if (!isNs4Pipeline(pipeline) || pipeline.steps.e1.status !== 'approved') throw new Error('E1-approved agentNewSolution4 pipeline required.');
  if (pipeline.steps.e2?.status === 'approved' && writeFlag === '--write') throw new Error('E2 is already approved; smoke test will not overwrite it.');
  const gate = validateNs4E2Review(review);
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));

  const artifacts = await buildNs4JourneyArtifacts(review);
  const artifactPaths = artifacts.map(artifact => `l4/${review.moduleName}/journeys/${artifact.journeyId}.defs.ts`);
  const approvedAt = new Date().toISOString();
  const indexPath = `l4/${review.moduleName}/journeys/index.defs.ts`;
  const index = buildNs4JourneyIndex(review.moduleName, review, artifacts, artifactPaths, 'auto', approvedAt);
  const running = markNs4E2Running(pipeline, review.reviewRound, approvedAt);
  const draftPath = `l4/${review.moduleName}/pipeline/e2-journeys.draft.json`;
  const waiting = markNs4E2WaitingHuman(running, review.reviewRound, draftPath, approvedAt);
  const approvedPipeline = markNs4E2Approved(waiting, 'auto', [...artifactPaths, indexPath], approvedAt);
  const approvedModule = markNs4ModuleE2Approved(moduleArtifact, 'auto', approvedAt);

  const summary = {
    ok: true,
    mode: writeFlag === '--write' ? 'write' : writeFlag === '--verify' ? 'verify' : 'dry-run',
    moduleName: review.moduleName,
    journeyCount: artifacts.length,
    journeyIds: artifacts.map(item => item.journeyId),
    nextStep: approvedPipeline.nextStep,
    artifactPaths: [...artifactPaths, indexPath],
  };
  if (writeFlag === '--verify') {
    await verifyWrittenArtifacts(moduleDir, moduleArtifact.module.moduleName, artifacts, index, pipeline, moduleArtifact);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  if (writeFlag !== '--write') {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  const projectId = projectIdFromPath(moduleDir);
  const journeyDir = path.join(moduleDir, 'journeys');
  const pipelineDir = path.join(moduleDir, 'pipeline');
  await mkdir(journeyDir, { recursive: true });
  await mkdir(pipelineDir, { recursive: true });
  await writeFile(path.join(pipelineDir, 'e2-journeys.draft.json'), `${JSON.stringify(review, null, 2)}\n`);
  for (const artifact of artifacts) {
    await writeFile(
      path.join(journeyDir, `${artifact.journeyId}.defs.ts`),
      renderDefs(projectId, review.moduleName, `journeys/${artifact.journeyId}.defs.ts`, `${artifact.journeyId}Journey`, artifact),
    );
  }
  await writeFile(path.join(journeyDir, 'index.defs.ts'), renderDefs(projectId, review.moduleName, 'journeys/index.defs.ts', `${review.moduleName}JourneyIndex`, index));
  await writeFile(moduleFile, renderDefs(projectId, review.moduleName, 'module.defs.ts', `${review.moduleName}Module`, approvedModule));
  await writeFile(pipelineFile, `${JSON.stringify(approvedPipeline, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function verifyWrittenArtifacts(
  moduleDir: string,
  moduleName: string,
  artifacts: Awaited<ReturnType<typeof buildNs4JourneyArtifacts>>,
  index: ReturnType<typeof buildNs4JourneyIndex>,
  pipeline: Record<string, any>,
  moduleArtifact: Ns4ModuleArtifact,
): Promise<void> {
  if (pipeline.steps.e2?.status !== 'approved' || pipeline.nextStep !== 'e3-ontology') throw new Error('Written pipeline did not approve E2.');
  if (!moduleArtifact.specStatus.completedSteps.some(step => step.stepId === 'e2-journeys') || moduleArtifact.specStatus.nextStep !== 'e3-ontology') {
    throw new Error('Written module contract did not advance to E3.');
  }
  for (const expected of artifacts) {
    const actualSource = await readFile(path.join(moduleDir, 'journeys', `${expected.journeyId}.defs.ts`), 'utf8');
    const actual = parseDefs(actualSource) as typeof expected;
    if (actual.businessHash !== expected.businessHash || actual.realization?.compiledFromBusinessHash !== expected.businessHash) {
      throw new Error(`Business hash mismatch for ${expected.journeyId}.`);
    }
    if (stableNs4Stringify(actual.business) !== stableNs4Stringify(expected.business)) throw new Error(`Business block mismatch for ${expected.journeyId}.`);
  }
  const actualIndex = parseDefs(await readFile(path.join(moduleDir, 'journeys', 'index.defs.ts'), 'utf8')) as typeof index;
  if (actualIndex.moduleName !== moduleName || actualIndex.journeys.length !== artifacts.length) throw new Error('Journey index mismatch.');
}

function parseDefs(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', assignment);
  if (assignment < 0 || start < 0) throw new Error('Invalid module.defs.ts export.');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return JSON.parse(source.slice(start, index + 1));
  }
  throw new Error('Unterminated module.defs.ts object.');
}

function renderDefs(projectId: number, moduleName: string, suffix: string, exportName: string, value: unknown): string {
  return `/// <mls fileReference="_${projectId}_/l4/${moduleName}/${suffix}" enhancement="_blank"/>\n\n`
    + `export const ${exportName} = ${JSON.stringify(value, null, 2)} as const;\n\n`
    + `export default ${exportName};\n`;
}

function projectIdFromPath(moduleDir: string): number {
  const match = moduleDir.match(/mls-(\d+)(?:\/|$)/);
  if (!match) throw new Error(`Cannot infer project id from ${moduleDir}.`);
  return Number(match[1]);
}

void main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
