/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/toolSchemaLint.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNsToolSchema } from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';

// Runs in node:test AND the browser: lintToolSchema is pure. The .test asserts the exact schema-DEFINITION
// classes that broke runs 06→10 (enum/const without type, non-URI $id, unresolvable $ref, type unions,
// additionalProperties:true) — and that every newSolution step's assembled tool schema is clean.

const has = (errs: string[] | null, re: RegExp): boolean => Array.isArray(errs) && errs.some(e => re.test(e));

// ── a–j: each historical failure class ─────────────────────────────────────────
void test('a) enum without type is flagged (Moonshot/Kimi "type is not defined")', () => {
  const errs = lintToolSchema(JSON.stringify({ type: 'object', additionalProperties: false, properties: { kind: { enum: ['a', 'b'] } } }));
  assert.ok(has(errs, /enum\/const requires explicit type|enum.*type/i), errs?.join('; '));
});

void test('b) const without type is flagged', () => {
  const errs = lintToolSchema(JSON.stringify({ type: 'object', additionalProperties: false, properties: { kind: { const: 'image' } } }));
  assert.ok(has(errs, /enum\/const requires explicit type|const.*type/i), errs?.join('; '));
});

void test('c) bare (non-URI) $id is flagged (xAI "not a uri-reference")', () => {
  const errs = lintToolSchema(JSON.stringify({ type: 'object', additionalProperties: false, $id: 'collab.codes/agentNewSolution/e5-operation/x' }));
  assert.ok(has(errs, /\$id/i), errs?.join('; '));
});

void test('d) https $id is accepted (no $id error)', () => {
  const errs = lintToolSchema(JSON.stringify({ type: 'object', additionalProperties: false, $id: 'https://collab.codes/x' }));
  assert.ok(!has(errs, /\$id/i), errs?.join('; '));
});

void test('e) $defs nested under result with a root-relative $ref is unresolvable (xAI HTTP 400)', () => {
  const errs = lintToolSchema(JSON.stringify({
    type: 'object', additionalProperties: false,
    properties: {
      result: {
        type: 'object', additionalProperties: false,
        $defs: { field: { type: 'string' } },
        properties: { x: { $ref: '#/$defs/field' } },
      },
    },
  }));
  assert.ok(has(errs, /\$ref/i), errs?.join('; '));
});

void test('f) $defs hoisted to the root resolves cleanly', () => {
  const errs = lintToolSchema(JSON.stringify({
    type: 'object', additionalProperties: false,
    $defs: { field: { type: 'string' } },
    properties: { x: { $ref: '#/$defs/field' } },
  }));
  assert.ok(!has(errs, /\$ref/i), errs?.join('; '));
});

void test('g) union type is flagged', () => {
  const errs = lintToolSchema(JSON.stringify({ type: 'object', additionalProperties: false, properties: { k: { type: ['boolean', 'string'] } } }));
  assert.ok(has(errs, /union/i), errs?.join('; '));
});

void test('h) wrapper status enum without type is flagged (the build-24 bug)', () => {
  const errs = lintToolSchema(JSON.stringify({ type: 'object', additionalProperties: false, properties: { status: { enum: ['ok', 'failed'] } } }));
  assert.ok(has(errs, /enum\/const requires explicit type|enum.*type/i), errs?.join('; '));
});

void test('h2) additionalProperties:true is flagged (the reverted mistake)', () => {
  const errs = lintToolSchema(JSON.stringify({ type: 'object', additionalProperties: true }));
  assert.ok(has(errs, /additionalProperties/i), errs?.join('; '));
});

void test('i) a fully valid strict schema returns null', () => {
  const errs = lintToolSchema(JSON.stringify({
    type: 'object', additionalProperties: false, required: ['status'],
    $defs: { field: { type: 'object', additionalProperties: false, required: ['name'], properties: { name: { type: 'string' } } } },
    properties: {
      status: { type: 'string', enum: ['ok', 'failed'] },
      items: { type: 'array', items: { $ref: '#/$defs/field' } },
    },
  }));
  assert.equal(errs, null);
});

void test('j) invalid JSON returns an error array (never throws)', () => {
  const errs = lintToolSchema('{ not json');
  assert.ok(has(errs, /invalid JSON/i), String(errs));
});

// ── per step: every newSolution tool schema, assembled as the agent sends it, must be clean ─────────
const SCHEMA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'schemas');

void test('every newSolution step tool schema passes the lint (assembled via createNsToolSchema)', () => {
  const files = readdirSync(SCHEMA_DIR).filter(f => f.endsWith('.schema.json')).sort();
  assert.ok(files.length >= 10, `expected the step schemas, found ${files.length}`);
  for (const file of files) {
    const resultSchema = JSON.parse(readFileSync(path.join(SCHEMA_DIR, file), 'utf8')) as Record<string, unknown>;
    const tool = createNsToolSchema('probe', 'probe', resultSchema) as unknown as { function: { parameters: unknown } };
    const errs = lintToolSchema(JSON.stringify(tool.function.parameters));
    assert.equal(errs, null, `${file}: ${errs?.join(' | ')}`);
  }
});
