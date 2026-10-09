/// <mls fileReference="_102020_/l2/agentMaterializeL2/prompts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// skills/modelTypes.md: every prompt file needs an explicit modelType marker. Without it the provider falls
// back to an alias such as `cost`, which was inactive on 30/09/2026 and paused the first shared40 run
// (llm.model.alias_not_found). Only `<!-- key: value -->` markers may precede the prompt text.
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const ACTIVE_MODEL_TYPES = ['classifier', 'general', 'reasoning', 'code', 'design', 'translate'];

function promptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'fixtures' ? [] : promptFiles(path);
    return /^prompt.*\.md$/u.test(name) ? [path] : [];
  });
}

test('every prompt of the agent declares an active modelType, and only markers come before the text', () => {
  const files = promptFiles(ROOT);
  // Phase A has no LLM step yet; the rule binds every prompt as soon as shared40/pages50 add theirs.
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const modelType = /^<!-- modelType: ([a-z]+) -->$/mu.exec(text)?.[1];
    assert.ok(modelType && ACTIVE_MODEL_TYPES.includes(modelType), `${file}: missing or unknown modelType (${modelType})`);
    for (const comment of text.match(/<!--[\s\S]*?-->/gu) ?? []) {
      assert.match(comment, /^<!-- [A-Za-z-]+: [^:>]+ -->$/u, `${file}: ${comment} is not a key: value marker`);
    }
  }
});
