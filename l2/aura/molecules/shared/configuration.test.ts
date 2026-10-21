/// <mls fileReference="_102020_/l2/aura/molecules/shared/configuration.test.ts" enhancement="_blank"/>

// Guards that keep the 30 `skills/<group>/configuration.ts` files aligned with:
// (a) their group's creation contract (`creation.ts`), and
// (b) the actual Lit properties declared in the 102040 molecules.
//
// WHY TEXT-READS, NOT IMPORTS
// The molecule sources live in a sibling project (102040) and cannot be imported without a module
// resolver aware of the store. Text reads are enough for the structural checks below.
//
// WHY THIS FILE IS HAND-WRITTEN
// The same reason as `configuration.ts` itself: it verifies the hand-written data, so it must be
// hand-written too, and survive any molecule regeneration without being overwritten.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(HERE, '..', 'skills');
const MOLECULES_ROOT = join(HERE, '..', '..', '..', '..', '..', 'mls-102040', 'l2', 'molecules');

// ─── helpers ────────────────────────────────────────────────────────────────

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`);
}

/** Attribute name for a prop: `attribute` field if set, else camelCase→kebab of `property`. */
function attrOf(prop: IMoleculeConfigProp): string {
  if (prop.attribute) return prop.attribute;
  if (prop.property.startsWith('data-')) return prop.property;
  return camelToKebab(prop.property);
}

/** Load the configuration from a group's `configuration.ts` (text-parsed, no eval). */
function loadGroupConfig(group: string): readonly IMoleculeConfigProp[] | null {
  const path = join(SKILLS_DIR, group, 'configuration.ts');
  if (!existsSync(path)) return null;
  // Dynamically require the compiled JS counterpart when running under Node's test runner.
  // Under MLS the test runner serves the `.js` from the `.ts` source via the store build.
  // Here we evaluate the TS source as a module.
  const text = readFileSync(path, 'utf8');
  // Extract the `configuration = [...]` literal by running it. Fallback: return null.
  try {
    // Locate the start of the array literal after the type annotation.
    const headerRe = /export const configuration:\s*readonly\s+IMoleculeConfigProp\[\]\s*=\s*\[/;
    const headerMatch = headerRe.exec(text);
    if (!headerMatch) return null;
    // Walk forward from the opening `[`, tracking bracket depth to find the matching `]`.
    const start = headerMatch.index + headerMatch[0].length - 1; // index of `[`
    let depth = 0;
    let end = start;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '[') depth++;
      else if (text[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    const literal = text.slice(start, end + 1);
    // eslint-disable-next-line no-new-func
    return new Function(`return ${literal}`)() as readonly IMoleculeConfigProp[];
  } catch {
    return null;
  }
}

/** Read the creation contract text for a group.
 *  Creation contracts are TypeScript template literals whose backticks are escaped as \`.
 *  We normalise them to plain backticks so the search below can find `prop` uniformly.
 */
function creationText(group: string): string {
  const path = join(SKILLS_DIR, group, 'creation.ts');
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf8').replace(/\\`/g, '`');
}

/**
 * Return all `.ts` source texts in the 102040 molecule folder for a group.
 * The folder name is the lowercase form of the group (e.g. `grouptriggeraction`).
 */
function moleculeSources(group: string): Array<{ name: string; text: string }> {
  const folder = join(MOLECULES_ROOT, group.toLowerCase());
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.defs.ts'))
    .map((f) => ({
      name: f.replace(/\.ts$/, ''),
      text: readFileSync(join(folder, f), 'utf8'),
    }))
    .filter((m) => m.text.includes('@propertyDataSource') || m.text.includes('getAttribute'));
}

/** 30 known groups (filesystem truth). */
const GROUPS = readdirSync(SKILLS_DIR).filter((d) => {
  try { return statSync(join(SKILLS_DIR, d)).isDirectory(); } catch { return false; }
}).sort();

// ─── guard 1: every group has a configuration.ts ────────────────────────────

test('every group directory has a configuration.ts', () => {
  const missing = GROUPS.filter((g) => !existsSync(join(SKILLS_DIR, g, 'configuration.ts')));
  assert.deepEqual(missing, [], `missing configuration.ts for groups: ${missing.join(', ')}`);
});

// ─── guard 2: internal type coherence (enum/text/number/boolean rules) ───────

for (const group of GROUPS) {
  test(`${group}: configuration type rules`, () => {
    const config = loadGroupConfig(group);
    assert.ok(config !== null, `could not parse configuration.ts for ${group}`);

    for (const prop of config) {
      if (prop.type === 'enum') {
        assert.ok(
          Array.isArray(prop.values) && prop.values.length > 0,
          `${group}.${prop.property}: enum must have non-empty values`,
        );
        if (prop.default !== null) {
          assert.ok(
            (prop.values as readonly string[]).includes(prop.default as string),
            `${group}.${prop.property}: default '${prop.default}' not in values ${JSON.stringify(prop.values)}`,
          );
        }
      }
      if (prop.type === 'text') {
        assert.equal(
          prop.values,
          undefined,
          `${group}.${prop.property}: text props must not have values (use examples for suggestions)`,
        );
      }
      assert.ok(
        ['enum', 'boolean', 'number', 'text'].includes(prop.type),
        `${group}.${prop.property}: unknown type '${prop.type}'`,
      );
    }
  });
}

// ─── guard 3: no duplicate properties within a group ─────────────────────────

for (const group of GROUPS) {
  test(`${group}: no duplicate properties`, () => {
    const config = loadGroupConfig(group);
    if (!config) return;
    const seen = new Set<string>();
    for (const prop of config) {
      assert.ok(!seen.has(prop.property), `${group}: property '${prop.property}' appears twice`);
      seen.add(prop.property);
    }
  });
}

// ─── guard 4: every property appears in the creation contract ─────────────────

for (const group of GROUPS) {
  test(`${group}: every property is cited in the creation contract`, () => {
    const config = loadGroupConfig(group);
    if (!config || config.length === 0) return;
    const contract = creationText(group);
    assert.ok(contract.length > 0, `no creation.ts found for ${group}`);

    for (const prop of config) {
      const attr = attrOf(prop);
      // Accept either the camelCase property name or the kebab attribute name in any table row.
      const mentioned = contract.includes(`\`${prop.property}\``) || contract.includes(`\`${attr}\``);
      assert.ok(
        mentioned,
        `${group}: '${prop.property}' (attr '${attr}') not found in creation.ts — ` +
        `add it to the contract table or remove it from configuration.ts`,
      );
    }
  });
}

// ─── guard 5: molecules declare the property (or read the data-* attribute) ──

for (const group of GROUPS) {
  test(`${group}: molecules declare configured properties`, () => {
    const config = loadGroupConfig(group);
    if (!config || config.length === 0) return;
    const sources = moleculeSources(group);
    if (sources.length === 0) return; // no compiled molecules in 102040 yet — skip

    for (const prop of config) {
      const attr = attrOf(prop);
      const isDataAttr = prop.property.startsWith('data-') || (prop.attribute?.startsWith('data-') ?? false);

      // Which molecules are candidates for this property?
      // With `only`: every listed molecule must declare it (strict).
      // Without `only`: at least half the molecules in the group must declare it (majority rule).
      // The majority rule allows groups where only some implementations add optional properties.
      const candidates = prop.only
        ? sources.filter((m) => prop.only!.some((tag) => tag.endsWith(`--${m.name}`)))
        : sources;

      if (candidates.length === 0) continue;

      if (prop.only) {
        // Strict: every listed molecule must declare the property.
        for (const mol of candidates) {
          if (isDataAttr) {
            assert.ok(
              mol.text.includes(`getAttribute('${attr}')`) || mol.text.includes(`getAttribute("${attr}")`),
              `${group}/${mol.name}: missing getAttribute('${attr}') for data attribute '${prop.property}'`,
            );
          } else {
            assert.ok(
              mol.text.includes(prop.property),
              `${group}/${mol.name}: missing property '${prop.property}' (listed in only[])`,
            );
          }
        }
      } else {
        // Majority: at least half the group molecules must declare the property.
        const declaringCount = candidates.filter((m) =>
          isDataAttr
            ? m.text.includes(`getAttribute('${attr}')`) || m.text.includes(`getAttribute("${attr}")`)
            : m.text.includes(prop.property),
        ).length;
        assert.ok(
          declaringCount >= Math.ceil(candidates.length / 2),
          `${group}: property '${prop.property}' declared in only ${declaringCount}/${candidates.length} molecules — ` +
          `use \`only\` to restrict it or remove it from configuration.ts`,
        );
      }
    }
  });
}

// ─── specific cases from the task's problem table ─────────────────────────────

test("groupEnterText: 'autocomplete' is text with examples, not a closed enum", () => {
  const config = loadGroupConfig('groupEnterText');
  assert.ok(config, 'config must load');
  const prop = config!.find((p) => p.property === 'autocomplete');
  assert.ok(prop, 'autocomplete must be in configuration');
  assert.equal(prop!.type, 'text');
  assert.equal(prop!.values, undefined);
  assert.ok(Array.isArray(prop!.examples) && prop!.examples.length > 0, 'examples must be set');
});

test("groupEnterText: 'mask' is text with examples, not an enum", () => {
  const config = loadGroupConfig('groupEnterText');
  assert.ok(config, 'config must load');
  const prop = config!.find((p) => p.property === 'mask');
  assert.ok(prop, 'mask must be in configuration');
  assert.equal(prop!.type, 'text');
  assert.equal(prop!.values, undefined);
  assert.ok(Array.isArray(prop!.examples), 'examples must be set');
});

test("groupNotifyUser: 'position' is text (open list), not a closed enum", () => {
  const config = loadGroupConfig('groupNotifyUser');
  assert.ok(config, 'config must load');
  const prop = config!.find((p) => p.property === 'position');
  assert.ok(prop, 'position must be in configuration');
  assert.equal(prop!.type, 'text');
  assert.equal(prop!.values, undefined);
});

test("groupViewTable: 'page' and 'totalItems' are NOT in configuration (page data)", () => {
  const config = loadGroupConfig('groupViewTable');
  assert.ok(config, 'config must load');
  const names = config!.map((p) => p.property);
  assert.ok(!names.includes('page'), "'page' must not be in configuration — it is page data");
  assert.ok(!names.includes('totalItems'), "'totalItems' must not be in configuration — it is page data");
});

test("groupTriggerAction: 'data-variant' is enum with 'only' for ml-button-standard", () => {
  const config = loadGroupConfig('groupTriggerAction');
  assert.ok(config, 'config must load');
  const prop = config!.find((p) => p.property === 'data-variant');
  assert.ok(prop, "data-variant must be in configuration");
  assert.equal(prop!.type, 'enum');
  assert.ok(Array.isArray(prop!.values) && prop!.values.length > 0, 'values must be set');
  assert.ok(Array.isArray(prop!.only) && prop!.only.length > 0, 'only must be set');
  assert.ok(prop!.only!.some((t) => t.includes('ml-button-standard')), 'only must include ml-button-standard');
});
