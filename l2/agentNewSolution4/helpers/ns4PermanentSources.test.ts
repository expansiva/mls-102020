/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4PermanentSources.test.ts" enhancement="_blank"/>

/**
 * The class guard. Twice the same defect shipped: a step read, as if it were a contract, something
 * that only lives in `pipeline/` — the workspace model (bug_e8_5) and the policy decision bodies
 * (bug_e10_1). `pipeline/` is the working state of ONE run and is discarded afterwards, so anything
 * a LATER step reads must be permanent. This asserts it over the path builders themselves.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const fsSource = readFileSync(new URL('ns4Fs.ts', import.meta.url), 'utf8');

/** Every path builder that resolves inside `pipeline/`, with the step that owns it. */
function pipelineBuilders(): Map<string, string> {
  const owners = new Map<string, string>();
  const pattern = /export function (ns4[A-Za-z0-9]+File)\(([^)]*)\)[^{]*\{([\s\S]*?)\n\}/g;
  for (const match of fsSource.matchAll(pattern)) {
    const [, name, , body] = match;
    if (!/\/pipeline/.test(body)) continue;
    owners.set(name, (/^ns4(E\d+)/.exec(name)?.[1] || 'shared').toLowerCase());
  }
  return owners;
}

test('every path builder that writes into pipeline/ is recognized and owned by one step', () => {
  const builders = pipelineBuilders();
  // The two artifacts this guard exists for are permanent, and must never be listed here.
  assert.equal(builders.has('ns4WorkspaceModelFile'), false);
  assert.equal(builders.has('ns4JourneyIndexFile'), false);
  assert.ok(builders.size >= 10, 'the drafts of the pipeline are still recognized');
  assert.equal(builders.get('ns4E2DraftFile'), 'e2');
  assert.equal(builders.get('ns4PipelineFile'), 'shared');
});

test('no step reads the pipeline draft of another step', () => {
  const builders = pipelineBuilders();
  const stepsRoot = new URL('../steps/', import.meta.url);
  const offenders: string[] = [];
  // The shared loaders live in helpers/, and that is the most natural place for the next leak.
  const folders: Array<[string, URL]> = [['helpers', new URL('./', import.meta.url)]];
  for (const step of readdirSync(stepsRoot).filter(name => /^e\d+$/.test(name))) {
    folders.push([step, new URL(`${step}/`, stepsRoot)]);
  }

  for (const [step, folder] of folders) {
    for (const file of readdirSync(folder).filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts') && name !== 'ns4Fs.ts')) {
      const source = readFileSync(new URL(file, folder), 'utf8');
      for (const [builder, owner] of builders) {
        // The pipeline state itself is shared metadata (round, status), never a step's contract.
        if (owner === 'shared' || owner === step) continue;
        if (new RegExp(`\\b${builder}\\b`).test(source)) offenders.push(`${step}/${file} reads ${builder} (${owner})`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
