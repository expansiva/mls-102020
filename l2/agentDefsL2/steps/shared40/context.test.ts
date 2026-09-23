/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/context.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildD2SharedPipeline } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { readD2SharedMaterializationContext, type D2SharedContextPort } from '/_102020_/l2/agentDefsL2/steps/shared40/context.js';

const MLS_BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

void test('reader expands the logical runtime alias and reads contract, skill and real APIs', async () => {
  const item = buildD2SharedPipeline('fixture', 'records');
  const reads: string[] = [];
  const port: D2SharedContextPort = { async readText(reference) { reads.push(reference); if (reference.startsWith('l2/')) return 'export const listRecordsRoute = "fixture.records.qryList" as const;'; return readFileSync(toPath(reference), 'utf8'); } };
  const context = await readD2SharedMaterializationContext(item, port);
  assert.equal(reads.includes('_102029_.d.ts'), false);
  assert.deepEqual(reads.slice(0, 3), [item.skills[0], item.dependsFiles[0], '_102029_/l2/stateLitElement.ts']);
  assert.match(context.sources['_102029_/l2/bffClient.ts'], /export async function execBff/);
  assert.match(context.sources['_102029_/l2/collabState.ts'], /export function setState/);
  assert.match(context.sources['_102029_/l2/interactionRuntime.ts'], /export async function runBlockingUiAction/);
  assert.match(context.sources[item.skills[0]], /selectedEntity/);
  assert.match(context.contextHash, /^sha256:/); assert.match(context.skillHash, /^sha256:/);
});

void test('reader reports the exact unreadable expanded runtime source', async () => {
  const item = buildD2SharedPipeline('fixture', 'records');
  const missing = '_102029_/l2/bffClient.ts';
  const port: D2SharedContextPort = { async readText(reference) { if (reference === missing) return null; if (reference.startsWith('l2/')) return 'contract'; return readFileSync(toPath(reference), 'utf8'); } };
  await assert.rejects(() => readD2SharedMaterializationContext(item, port), new RegExp(`D2_SHARED_CONTEXT_MISSING: ${missing}`));
});

function toPath(reference: string): string {
  const match = /^_(\d+)_\/(.+)$/.exec(reference);
  if (!match) throw new Error(`bad fixture reference ${reference}`);
  return path.join(MLS_BASE, `mls-${match[1]}`, match[2]);
}
