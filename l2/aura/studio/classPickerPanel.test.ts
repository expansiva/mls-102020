/// <mls fileReference="_102020_/l2/aura/studio/classPickerPanel.test.ts" enhancement="_blank" />
// The panel renders in the LIGHT DOM of the client's page (TASK-102020-picker-state-lit), so its
// class names share a namespace with the app's own CSS and with whatever the Tailwind JIT decides to
// generate from the live DOM. These are the two guards that keep that safe.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PREFIX = 'acp-';

/**
 * Comments are stripped from both files before scanning.
 *
 * Both explain the very thing they guard — the .less quotes `.block` to say why the prefix exists —
 * and a scanner that reads its own documentation reports the documentation as a bug.
 */
function code(file: string): string {
  return readFileSync(path.join(HERE, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

const TS = code('classPickerPanel.ts');
const LESS = code('classPickerPanel.less');

/**
 * Classes the templates compose at RUNTIME, which no static scan can see.
 *
 * `class="acp-dir acp-${direction}"` produces one of these two. Listing them by hand is the price of
 * the interpolation, and it is a short list on purpose.
 */
const DYNAMIC = ['acp-in', 'acp-out'];

/** Every class the panel can put on an element, from the templates. */
function renderedClasses(): string[] {
  const found = new Set<string>();
  for (const attr of TS.matchAll(/class="([^"]*)"/gu)) {
    const value = attr[1];
    // Plain words outside `${…}`, and the literals a ternary inside one can produce.
    for (const chunk of value.split(/\$\{[^}]*\}/u)) {
      for (const word of chunk.split(/\s+/u)) if (word) found.add(word);
    }
    for (const expr of value.matchAll(/\$\{([^}]*)\}/gu)) {
      for (const literal of expr[1].matchAll(/'([A-Za-z][\w-]*)'/gu)) found.add(literal[1]);
    }
  }
  // A chunk that ends where an interpolation begins is half a name (`acp-` of `acp-${direction}`).
  for (const name of [...found]) if (name.endsWith('-')) found.delete(name);
  for (const name of DYNAMIC) found.add(name);
  return [...found];
}

/** Every class the stylesheet selects on. */
function styledClasses(): string[] {
  return [...new Set([...LESS.matchAll(/\.([a-zA-Z][\w-]*)/gu)].map((match) => match[1]))];
}

test('every class the panel renders carries the prefix', () => {
  // Measured on the real pages: they use `block` ~317 times, so `.block { display: block }` is in
  // their built stylesheet — and this panel used to render a `class="block"` of its own.
  const bare = renderedClasses().filter((name) => !name.startsWith(PREFIX));
  assert.deepEqual(bare, [], 'these would collide with the client page');
});

test('every class the stylesheet selects carries the prefix', () => {
  const bare = styledClasses().filter((name) => !name.startsWith(PREFIX));
  assert.deepEqual(bare, [], 'these would reach into the client page');
});

test('the rendered classes and the styled ones are the same set', () => {
  // A rendered class with no rule is dead markup; a styled class nobody renders is dead css. Neither
  // is a crime on its own — but in a file this size, both are always a rename that went half way.
  const rendered = new Set(renderedClasses());
  const styled = new Set(styledClasses());
  const unstyled = [...rendered].filter((name) => !styled.has(name)).sort();
  const unused = [...styled].filter((name) => !rendered.has(name)).sort();
  assert.deepEqual({ unstyled, unused }, { unstyled: [], unused: [] });
});

test('no class of the panel is a Tailwind utility', async () => {
  // The other direction of the same risk: in studio mode the JIT scans the LIVE DOM, so any class
  // name that happens to be a valid utility becomes a rule in the client's page. Compiled with the
  // tailwind of the lockfile — the same engine the studio JIT is pinned to.
  const { compile } = await import('tailwindcss');
  const root = path.resolve(HERE, '../../../..');
  const twDir = path.join(root, 'node_modules/tailwindcss');
  const loadStylesheet = async (id: string, base: string) => {
    const file = id === 'tailwindcss'
      ? path.join(twDir, 'index.css')
      : id.startsWith('tailwindcss/')
        ? path.join(twDir, id.slice('tailwindcss/'.length))
        : path.resolve(base, id);
    return { path: file, base: path.dirname(file), content: readFileSync(file, 'utf8') };
  };

  const compiler = await compile('@import "tailwindcss";', { base: root, loadStylesheet });
  const empty = compiler.build([]).length;
  const utilities = renderedClasses().filter((name) => compiler.build([name]).length > empty);

  assert.deepEqual(utilities, [], 'the JIT would generate rules for these inside the client page');
});
