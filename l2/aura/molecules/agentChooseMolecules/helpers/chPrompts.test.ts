/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chPrompts.test.ts" enhancement="_blank"/>

// The mechanical test skills/modelTypes.md makes mandatory: enumerate every prompt this agent owns and
// assert an explicit modelType marker. An omitted marker may be routed to a deployment alias that does
// not exist, and the call fails before the LLM produces anything.
//
// It also pins the invariant that keeps the probe honest: no prompt of this agent may contain a molecule
// tag. Every tag in a prompt is substituted from the catalog at assembly time — an example written by
// hand would be teaching exactly the mistake the gate refuses, and the usage contracts show how that
// ends: measured on 2026-08-19, 38 of their 40 example tags do not exist.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chParseModelType } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(HERE, '..');
const STEPS_ROOT = path.join(AGENT_ROOT, 'steps');

/** Every prompt.md under steps/, discovered rather than listed: a step added later cannot escape this. */
function stepPrompts(): Array<{ name: string; text: string }> {
  const out: Array<{ name: string; text: string }> = [];
  for (const step of readdirSync(STEPS_ROOT)) {
    const file = path.join(STEPS_ROOT, step, 'prompt.md');
    try {
      out.push({ name: `${step}/prompt.md`, text: readFileSync(file, 'utf8') });
    } catch {
      // A mechanical step has no prompt — c3-report is one. Nothing to check.
    }
  }
  return out;
}

void test('every step prompt declares an explicit modelType', () => {
  const prompts = stepPrompts();
  assert.ok(prompts.length >= 2, `expected the two LLM steps to own a prompt.md, found ${prompts.length}`);
  for (const prompt of prompts) {
    assert.equal(chParseModelType(prompt.text), 'reasoning', `${prompt.name} must declare modelType reasoning (flow.json.decisions.modelType)`);
  }
});

void test('every tool-calling prompt asks for server-side schema validation', () => {
  for (const prompt of stepPrompts()) {
    assert.match(prompt.text, /<!--\s*x-tool-strict:\s*true\s*-->/, `${prompt.name} crosses a gate, so it must be strict-validated`);
  }
});

void test('the root prompt declares its own modelType', () => {
  const root = readFileSync(path.join(AGENT_ROOT, 'agentChooseMolecules.ts'), 'utf8');
  assert.equal(chParseModelType(root), 'classifier');
});

void test('no prompt of this agent contains a molecule tag — tags come from the catalog only', () => {
  for (const prompt of stepPrompts()) {
    const hit = /\bml-[a-z][a-z0-9-]*/.exec(prompt.text);
    assert.equal(hit, null, `${prompt.name} names the tag '${hit?.[0]}' — substitute it from the catalog instead`);
  }
});

void test('the c2 prompt substitutes its example from the group being answered', () => {
  const text = readFileSync(path.join(STEPS_ROOT, 'c2-molecules', 'prompt.md'), 'utf8');
  for (const placeholder of ['{{group}}', '{{groupFolder}}', '{{tagExample}}', '{{shortExample}}', '{{catalog}}', '{{userLanguage}}']) {
    assert.ok(text.includes(placeholder), `c2 prompt must substitute ${placeholder}`);
  }
});

void test('the c1 prompt injects level 1 and the group names, and nothing about molecules', () => {
  const text = readFileSync(path.join(STEPS_ROOT, 'c1-groups', 'prompt.md'), 'utf8');
  for (const placeholder of ['{{catalog}}', '{{groupNames}}', '{{userLanguage}}']) {
    assert.ok(text.includes(placeholder), `c1 prompt must substitute ${placeholder}`);
  }
});
