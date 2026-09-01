/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsCreateAgentGraph.test.ts" enhancement="_blank"/>

// createAgent() must load on a host without Monaco, Lit, or a DOM (CLI collab-msg). Widgets stay
// behind import() inside beforeClarificationStep; prompt hooks never touch window/document/indexedDB.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NS_ROOT = path.resolve(HERE, '..');
const PROJECT_ROOT = path.resolve(NS_ROOT, '../..');
const ENTRY = path.join(NS_ROOT, 'agentNewSolution.ts');

const IMPORT_FROM = /\b(?:import|export)\s+(type\s+)?(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/g;

const FORBIDDEN_GLOBALS = /\b(?:window|document|indexedDB)\b|\bmls\.editor\b/g;

type Offence = { file: string; reason: string };

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function isTypeOnlyClause(clause: string | undefined, typeKeyword: string | undefined): boolean {
  if (typeKeyword) return true;
  if (!clause) return false;
  const trimmed = clause.trim();
  if (trimmed.startsWith('type ') || trimmed.startsWith('type\t')) return true;
  const inner = trimmed.match(/^\{([\s\S]*)\}$/);
  if (!inner) return false;
  const specs = inner[1].split(',').map(part => part.trim()).filter(Boolean);
  return specs.length > 0 && specs.every(spec => /^type\s/.test(spec));
}

function staticImportSpecifiers(source: string): string[] {
  const text = stripComments(source);
  const specs: string[] = [];
  IMPORT_FROM.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_FROM.exec(text))) {
    if (isTypeOnlyClause(match[2], match[1])) continue;
    specs.push(match[3]);
  }
  return specs;
}

function forbiddenImportReason(spec: string): string | null {
  if (/(?:^|\/)monaco(?:-editor)?(?:\/|$)/.test(spec)) return `static import of monaco (${spec})`;
  if (spec === 'lit' || spec.startsWith('lit/')) return `static import of lit (${spec})`;
  if (/(?:^|\/)widgets\//.test(spec)) return `static import of widgets (${spec})`;
  if (spec.includes('mls.editor')) return `static import of mls.editor (${spec})`;
  return null;
}

function resolveInProject(fromFile: string, spec: string): string | null {
  let candidate: string | null = null;
  if (spec.startsWith('/_102020_/')) {
    candidate = path.join(PROJECT_ROOT, spec.replace(/^\/_102020_\//, '').replace(/\.js$/, '.ts'));
  } else if (spec.startsWith('.')) {
    candidate = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, '.ts'));
  }
  if (!candidate) return null;
  if (!existsSync(candidate)) return null;
  const rel = path.relative(PROJECT_ROOT, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return candidate;
}

function stripClarificationFunctions(source: string): string {
  const fnRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
  let result = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = fnRe.exec(source))) {
    if (!/Clarification/i.test(match[1])) continue;
    const start = match.index;
    let brace = fnRe.lastIndex;
    while (brace < source.length && source[brace] !== '{') brace += 1;
    if (brace >= source.length) break;
    let depth = 0;
    let end = brace;
    for (; end < source.length; end += 1) {
      const ch = source[end];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }
    result += source.slice(cursor, start);
    result += `function ${match[1]}(){}`;
    cursor = end;
    fnRe.lastIndex = end;
  }
  return result + source.slice(cursor);
}

function stripStrings(source: string): string {
  return source
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function globalOffences(source: string): string[] {
  const scanned = stripStrings(stripComments(stripClarificationFunctions(source)));
  const found: string[] = [];
  FORBIDDEN_GLOBALS.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FORBIDDEN_GLOBALS.exec(scanned))) {
    found.push(match[0]);
  }
  return found;
}

function relNs(file: string): string {
  return path.relative(NS_ROOT, file).replace(/\\/g, '/');
}

function walkCreateAgentGraph(entry = ENTRY): { files: string[]; offences: Offence[] } {
  const queue = [entry];
  const seen = new Set<string>();
  const files: string[] = [];
  const offences: Offence[] = [];

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    files.push(file);
    const source = readFileSync(file, 'utf8');
    for (const spec of staticImportSpecifiers(source)) {
      const reason = forbiddenImportReason(spec);
      if (reason) offences.push({ file: relNs(file), reason });
      const next = resolveInProject(file, spec);
      if (next) queue.push(next);
    }
    for (const ident of globalOffences(source)) {
      offences.push({ file: relNs(file), reason: `prompt-hook graph uses ${ident}` });
    }
  }

  return { files, offences };
}

void test('createAgent static graph has no monaco/lit/widgets/DOM host deps', () => {
  assert.equal(existsSync(ENTRY), true, `missing ${ENTRY}`);
  const entrySource = readFileSync(ENTRY, 'utf8');
  assert.match(entrySource, /export function createAgent\s*\(/);

  const { files, offences } = walkCreateAgentGraph();
  const rels = files.map(relNs);

  assert.ok(rels.includes('agentNewSolution.ts'), 'entry must be in the graph');
  assert.ok(rels.includes('steps/e1/agentNs4E1.ts'), 'E1 must be in the graph');
  assert.ok(rels.includes('steps/e7/agentNs4E7.ts'), 'E7 must be in the graph');
  assert.ok(!rels.some(file => file.startsWith('widgets/')), `widgets leaked into static graph:\n${rels.filter(file => file.startsWith('widgets/')).join('\n')}`);

  assert.deepEqual(offences, [], offences.map(item => `${item.file}: ${item.reason}`).join('\n'));
});

void test('guard goes red on a static widgets import (mutation of the detector)', () => {
  const poisoned = [
    'import { showNs4ClarificationError } from "/_102020_/l2/agentNewSolution/helpers/ns4Clarification.js";',
    'import { Widget } from "/_102020_/l2/agentNewSolution/widgets/clarification.js";',
    'export function beforeNs4E1PromptStep() { return window.location; }',
  ].join('\n');

  const importHits = staticImportSpecifiers(poisoned)
    .map(forbiddenImportReason)
    .filter((reason): reason is string => Boolean(reason));
  assert.ok(importHits.some(reason => reason.includes('widgets')), importHits.join('\n'));
  assert.deepEqual(globalOffences(poisoned), ['window']);
});
