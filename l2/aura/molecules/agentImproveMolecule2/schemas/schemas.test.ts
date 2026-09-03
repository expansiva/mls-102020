/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/schemas/schemas.test.ts" enhancement="_blank"/>

// The tool schemas, checked against agentsBestPractices §9 — "write for the strictest provider".
//
// WHY THIS EXISTS. On 2026-08-07 the first Studio run of this agent died on `LLM call failed`, and
// hunting it turned up TWO defects of the same family: a system prompt with no `<!-- modelType -->`
// marker (the platform fell back to a `cost` alias the org does not have — 404), and three of these
// schemas declaring a property outside `required`.
//
// The second one had not fired yet. It would have, at i3-edit, two steps after the point that
// failed — and a rejected schema is an HTTP 400 with zero output, so it would have looked exactly
// like the first bug and sent the next person down the same hunt.
//
// A schema is data, and data with rules deserves a test. Every rule below is a line of §9.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILES = readdirSync(HERE).filter(name => name.endsWith('.schema.json')).sort();

interface Node {
  type?: string;
  properties?: Record<string, Node>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Node;
  enum?: unknown[];
  const?: unknown;
}

function walk(node: Node | undefined, path: string, visit: (node: Node, path: string) => void): void {
  if (!node || typeof node !== 'object') return;
  visit(node, path);
  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) walk(child, `${path}.${key}`, visit);
  }
  if (node.items) walk(node.items, `${path}[]`, visit);
}

function load(name: string): Node {
  return JSON.parse(readFileSync(join(HERE, name), 'utf8')) as Node;
}

test('there is at least one schema to check — a silent empty sweep would pass forever', () => {
  assert.ok(FILES.length >= 4, `expected the agent's schemas, found ${FILES.length}`);
});

for (const name of FILES) {
  test(`${name}: every property is listed in required`, () => {
    // THE 2026-08-07 DEFECT. With additionalProperties:false, a strict provider rejects the whole
    // tool over one optional property — HTTP 400, no output. Optionality is expressed by accepting
    // an empty value and normalizing it in code (the gate coerces), never by leaving it out.
    const offenders: string[] = [];
    walk(load(name), '(root)', (node, path) => {
      if (node.type !== 'object' || !node.properties) return;
      const required = new Set(node.required || []);
      for (const key of Object.keys(node.properties)) {
        if (!required.has(key)) offenders.push(`${path}.${key}`);
      }
    });
    assert.deepEqual(offenders, []);
  });

  test(`${name}: every object declares additionalProperties: false`, () => {
    const offenders: string[] = [];
    walk(load(name), '(root)', (node, path) => {
      if (node.type === 'object' && node.properties && node.additionalProperties !== false) offenders.push(path);
    });
    assert.deepEqual(offenders, []);
  });

  test(`${name}: every enum also declares its type`, () => {
    // Some providers reject a bare enum with "type is not defined" — an HTTP 400 on the whole tool.
    const offenders: string[] = [];
    walk(load(name), '(root)', (node, path) => {
      if ((node.enum || node.const !== undefined) && !node.type) offenders.push(path);
    });
    assert.deepEqual(offenders, []);
  });

  test(`${name}: no multi-typed property`, () => {
    const offenders: string[] = [];
    walk(load(name), '(root)', (node, path) => {
      if (Array.isArray(node.type)) offenders.push(path);
    });
    assert.deepEqual(offenders, []);
  });
}
