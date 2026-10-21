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

/**
 * Attribute name for a prop: the `attribute` field if set, else Lit's rule — the property name
 * LOWERCASED, never kebab-cased. `@propertyDataSource({ type: String }) inputType` observes
 * `inputtype`; reading it as `input-type` is how a molecule that ignores the group's attribute went
 * unnoticed (TASK-102020-picker-molecule-properties).
 */
function attrOf(prop: IMoleculeConfigProp): string {
  return (prop.attribute ?? prop.property).toLowerCase();
}

/**
 * Every `@propertyDataSource` of a molecule's source, with the attribute Lit observes for it — what
 * `elementProperties` would say at runtime, read as text.
 */
function declaredAttributes(text: string): Map<string, string> {
  const declared = new Map<string, string>();
  const decl = /@propertyDataSource\((\{[^}]*\})?\)\s*(?:(?:public|private|protected|declare|override|readonly)\s+)*(\w+)/gu;
  for (const match of text.matchAll(decl)) {
    const attribute = /attribute:\s*['"]([^'"]+)['"]/u.exec(match[1] ?? '')?.[1];
    declared.set(match[2], (attribute ?? match[2]).toLowerCase());
  }
  return declared;
}

/**
 * The default each `@propertyDataSource` field is initialised with, when it is a plain literal
 * (`= 'md'`, `= 0`, `= false`). Anything else (an array, a call, no initialiser) is left out: there is
 * nothing to compare.
 */
function declaredDefaults(text: string): Map<string, string | number | boolean> {
  const defaults = new Map<string, string | number | boolean>();
  const decl = /@propertyDataSource\((?:\{[^}]*\})?\)\s*(?:(?:public|private|protected|declare|override|readonly)\s+)*(\w+)\s*[!?]?\s*(?::\s*[^=;\n]+?)?\s*=\s*([^;\n]+?)\s*;/gu;
  for (const match of text.matchAll(decl)) {
    const raw = match[2];
    const quoted = /^(['"])(.*)\1$/u.exec(raw);
    if (quoted) defaults.set(match[1], quoted[2]);
    else if (raw === 'true' || raw === 'false') defaults.set(match[1], raw === 'true');
    else if (/^-?\d+(\.\d+)?$/u.test(raw)) defaults.set(match[1], Number(raw));
  }
  return defaults;
}

/** The tag of a molecule of a group's folder: `grouptriggeraction--ml-button-standard`. */
function tagOf(group: string, name: string): string {
  return `${group.toLowerCase()}--${name}`;
}

/**
 * Molecules that read a configured property under ANOTHER attribute than their group's, measured on
 * 2026-10-21. The picker writes the attribute the registered class observes (reconcileWithRuntime),
 * so these work there — but a page or an agent following the group's contract writes an attribute the
 * molecule ignores. Listed so a NEW divergence breaks the guard; each one is checked to still be one.
 */
const KNOWN_ATTRIBUTE_DIVERGENCES: Record<string, string> = {
  'groupEnterText/ml-enter-text.inputType': 'inputtype',
  'groupEnterTimeInterval/ml-work-shift-interval.hour12': 'hour-12',
  'groupEnterTimeInterval/ml-enter-time-interval.minTime': 'mintime',
  'groupEnterTimeInterval/ml-enter-time-interval.maxTime': 'maxtime',
  'groupTriggerAction/ml-kebab-action-trigger.iconPosition': 'iconposition',
};

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
      // Accept either the camelCase property name or the attribute name in any table row.
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

// ─── guard 6: the molecule observes the attribute the configuration writes ──────

for (const group of GROUPS) {
  test(`${group}: molecules observe the configured attribute`, () => {
    const config = loadGroupConfig(group);
    if (!config || config.length === 0) return;
    for (const mol of moleculeSources(group)) {
      const declared = declaredAttributes(mol.text);
      for (const prop of config) {
        // A data-* is read with getAttribute (guard 5); and a molecule outside `only` never reads it.
        if (prop.property.startsWith('data-')) continue;
        if (prop.only && !prop.only.some((tag) => tag.endsWith(`--${mol.name}`))) continue;
        const observed = declared.get(prop.property);
        if (observed === undefined) continue; // presence is guard 5's question
        const key = `${group}/${mol.name}.${prop.property}`;
        const known = KNOWN_ATTRIBUTE_DIVERGENCES[key];
        if (known !== undefined) {
          assert.equal(observed, known, `${key}: the known divergence changed — update the list`);
          continue;
        }
        assert.equal(
          observed,
          attrOf(prop),
          `${key}: the molecule observes '${observed}', the configuration writes '${attrOf(prop)}'`,
        );
      }
    }
  });
}

// ─── guard 7: the default the picker shows is the one the molecule uses ─────────
//
// The picker says "not written — the default applies: X" and "back to the default" REMOVES the
// attribute. Both are only true if X is what the molecule falls back to — so a molecule whose own
// default differs from its group's declares it in `defaults[tag]`.

for (const group of GROUPS) {
  test(`${group}: each molecule's default is the configured one`, () => {
    const config = loadGroupConfig(group);
    if (!config || config.length === 0) return;
    for (const mol of moleculeSources(group)) {
      const tag = tagOf(group, mol.name);
      const declared = declaredDefaults(mol.text);
      for (const prop of config) {
        if (prop.only && !prop.only.includes(tag)) continue;
        if (!declared.has(prop.property)) continue;
        const configured = prop.defaults && tag in prop.defaults ? prop.defaults[tag] : prop.default;
        if (configured === null) continue;
        assert.equal(
          declared.get(prop.property),
          configured,
          `${tag}.${prop.property}: the molecule defaults to ${JSON.stringify(declared.get(prop.property))}, `
          + `the configuration says ${JSON.stringify(configured)} — set defaults['${tag}']`,
        );
      }
    }
  });

  test(`${group}: per-tag defaults name real molecules and differ from the group's`, () => {
    const config = loadGroupConfig(group);
    if (!config) return;
    const tags = new Set(moleculeSources(group).map((mol) => tagOf(group, mol.name)));
    for (const prop of config) {
      for (const [tag, value] of Object.entries(prop.defaults ?? {})) {
        assert.ok(tags.has(tag), `${group}.${prop.property}: defaults names '${tag}', not a molecule of the group`);
        assert.ok(!prop.only || prop.only.includes(tag), `${group}.${prop.property}: defaults['${tag}'] is outside only`);
        assert.notEqual(value, prop.default, `${group}.${prop.property}: defaults['${tag}'] repeats the group's default`);
        if (prop.type === 'enum' && value !== null) {
          assert.ok(prop.values?.includes(value as string), `${group}.${prop.property}: defaults['${tag}'] not in values`);
        }
      }
    }
  });
}

test('every known attribute divergence is still a divergence', () => {
  for (const [key, observed] of Object.entries(KNOWN_ATTRIBUTE_DIVERGENCES)) {
    const [where, property] = key.split('.');
    const [group, name] = where.split('/');
    const mol = moleculeSources(group).find((entry) => entry.name === name);
    assert.ok(mol, `${key}: molecule not found`);
    assert.equal(declaredAttributes(mol.text).get(property), observed, `${key}: fixed? remove it from the list`);
    const prop = loadGroupConfig(group)?.find((entry) => entry.property === property);
    assert.ok(prop && attrOf(prop) !== observed, `${key}: no longer divergent — remove it from the list`);
  }
});

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
