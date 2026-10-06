import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const agentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const levelRe = /level:\s*[12]\b/g;
const ownProjectRe = /project:\s*102020\b/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

/** Brace-delimited object that contains `index`. Template `${}` braces count too; the scan is textual. */
function enclosingObject(text: string, index: number): string | null {
  let depth = 0;
  for (let i = index; i >= 0; i--) {
    const c = text[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        let d = 0;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '{') d++;
          else if (text[j] === '}') {
            d--;
            if (d === 0) return text.slice(i, j + 1);
          }
        }
        return null;
      }
      depth--;
    }
  }
  return null;
}

describe('planner L2 level 1 and 2', () => {
  it('each level: 1 or level: 2 sits in an object with project: 102020', () => {
    const bad: string[] = [];
    for (const file of sourceFiles(agentDir)) {
      const text = readFileSync(file, 'utf8');
      const rel = path.relative(agentDir, file);
      for (const match of text.matchAll(levelRe)) {
        const at = match.index ?? 0;
        const obj = enclosingObject(text, at);
        if (!obj || !ownProjectRe.test(obj)) {
          const line = text.slice(0, at).split('\n').length;
          bad.push(`${rel}:${line}`);
        }
      }
    }
    assert.equal(bad.join('\n'), '');
  });
});
