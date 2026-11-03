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

/**
 * The floating panel and the one docked in the Pages plugin (pageClassPickerPanel): both render in
 * the same document as the client page, so both answer to the same guards.
 */
const PANELS = ['classPickerPanel', 'pageClassPickerPanel'];

/**
 * What a panel RENDERS: its own chrome plus the content it inherits from classPickerBase
 * (TASK-102020-picker-inspector, phase 0). Every guard below reads the two together.
 */
function panelCode(panel: string): string {
  return `${code('classPickerBase.ts')}
${code(`${panel}.ts`)}`;
}

/**
 * Classes the templates compose at RUNTIME, which no static scan can see.
 *
 * `acp-slot-structure` is the one today: the slot tree passes it as an argument (`node(…, kind)`), so
 * the scan of the `class="…"` attribute only sees `${kind}`.
 */
const DYNAMIC: string[] = ['acp-slot-structure'];

/**
 * Font Awesome's own classes (`fa-solid fa-circle-info`), the system's icon font, 6.6, injected by the
 * studio header. Exempt from the prefix and from "styled here", on purpose: the font's stylesheet is
 * what styles them, they are not Tailwind utilities, and a client page that also uses Font Awesome uses
 * the same library — there is nothing to collide with.
 */
const ICON_FONT = /^fa-/u;

/** Every class the panel can put on an element, from the templates. */
function renderedClasses(TS: string): string[] {
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
  return [...found].filter((name) => !ICON_FONT.test(name));
}

/**
 * Classes the stylesheet selects on an ANCESTOR it does not own — the side panel's theme switch
 * (`.dark &`, in pageClassPickerPanel.less). Read, never rendered, so neither rule below applies.
 */
const CONTEXT = new Set(['dark']);

/** Every class the stylesheet selects on. */
function styledClasses(LESS: string): string[] {
  return [...new Set([...LESS.matchAll(/\.([a-zA-Z][\w-]*)/gu)].map((match) => match[1]))]
    .filter((name) => !CONTEXT.has(name));
}

/**
 * The calls through which a panel decides its vocabulary (TASK-102020-picker-molecule-data-class).
 *
 * The rules live in studioClassEdit; what each panel may get wrong is forgetting to pass the channel —
 * and then a molecule would be offered a background in one panel and not in the other.
 */
const CHANNEL_CALLS = [
  'utilityOptions(token, 2, this.dsRoles, (cssVar) => this.resolveVar(cssVar), side.channel)',
  'addableProperties(side.literal, { childCount: this.target?.childCount ?? 0, channel: side.channel })',
  'pasteStyleInto(this.literal, clip.literal, this.channel).literal',
  'pasteStyleInto(this.literal, clip.literal, this.channel);',
  "side.channel === 'data-class'",
  // A molecule: ONE part at a time, chosen in the part selector (TASK-102020-picker-inspector).
  '${this.renderParts()}',
  'part === \x27tag\x27 ? this.tagSide : inner',
  'this.renderSection(side)',
  // What goes out names its attribute — and its slot (TASK-102020-picker-molecule-slots).
  'detail: { literal, what, attribute: side.channel, slot: side.slot }',
  '{ literal, attribute: side.channel, slot: side.slot }',
  // A slot through the same renderSection as the inside and the tag.
  '? this.slotSide(part)',
];

test('both panels decide the vocabulary with the same core calls, and pass the channel to each', () => {
  for (const panel of PANELS) {
    const TS = panelCode(panel);
    for (const call of CHANNEL_CALLS) assert.ok(TS.includes(call), `${panel}: ${call}`);
    // No vocabulary call left without the section's channel.
    const bareOptions = [...TS.matchAll(/utilityOptions\(token, 2,[^\n]*\)/gu)].filter((match) => !match[0].includes('side.channel'));
    assert.deepEqual(bareOptions.map((match) => match[0]), [], panel);
    const barePaste = [...TS.matchAll(/= pasteStyle\(this\.literal, clip\.literal\)/gu)];
    assert.equal(barePaste.length, 0, `${panel}: the paste that writes goes through the channel`);
  }
});

/**
 * The chrome of TASK-102020-picker-inspector, phase 1: undo/redo in sight and the rest of the element
 * actions in a ⋯ menu, in BOTH panels — and the content they share is the base's, not a copy.
 */
test('both chromes show undo/redo and put the other actions in the ⋯ menu', () => {
  const base = code('classPickerBase.ts');
  for (const panel of PANELS) {
    const own = code(`${panel}.ts`);
    assert.ok(own.includes('extends ClassPickerBase'), `${panel} inherits the content`);
    assert.ok(own.includes('${this.renderActions()}'), `${panel} draws the shared actions`);
    for (const moved of ['moveButton(', 'duplicateButton(', 'removeElementButton(', 'renderCopyIcon(', 'renderPasteIcon(']) {
      assert.equal(own.includes(moved), false, `${panel}: ${moved} is in the menu, not in the chrome`);
    }
  }
  const actions = base.slice(base.indexOf('protected renderActions()'), base.indexOf('protected menuItem('));
  assert.ok(actions.includes("this.historyButton('undo')") && actions.includes("this.historyButton('redo')"), 'undo/redo stay in sight');
  for (const item of ["this.moveButton('up')", "this.moveButton('down')", 'this.duplicateButton()', 'this.removeElementButton()', 'this.renderCopyIcon()', 'this.renderPasteIcon()']) {
    assert.ok(actions.includes(item), `${item} is a line of the menu`);
  }
  // Remove still asks twice: its first click keeps the menu open.
  const remove = base.slice(base.indexOf('protected removeElementButton'), base.indexOf('protected onRemoveElement'));
  assert.ok(remove.includes('keepOpen: true'));
  // Tabs: Style, Animation, Component, and Info as an icon.
  assert.ok(base.includes("this.tabButton('classes', 'panel.tabStyle')"));
  assert.ok(base.includes('acp-tab-icon'));
});

/**
 * Phase 3 of TASK-102020-picker-inspector: the Animations tab keeps a tab of its own but is organised by
 * CATEGORY, not by screens, and follows the part selector — as does its preview.
 */
test('the Animations tab is categories, not screens, and acts on the chosen part', () => {
  const base = code('classPickerBase.ts');
  assert.equal(base.includes('goTo('), false, 'no screen navigation left');
  assert.equal(base.includes('this.screen'), false);
  for (const id of ['entrance', 'continuous', 'hover', 'advanced']) {
    assert.ok(base.includes(`{ id: '${id}', title: 'anim.cat.${id}', screen: '${id}' }`), id);
  }
  assert.ok(base.includes('ANIMATION_CATEGORIES.map('), 'the tab draws the categories');
  assert.ok(base.includes('this.renderOtherAnimations(side, unknown)'), 'and motion the catalog does not know');
  // One place for motion: the Style tab leaves it out.
  assert.ok(base.includes("INSPECTOR_GROUPS.filter((group) => group !== 'animation')"));
  assert.ok(base.includes('const owned = new Set(animationTokens(side.literal).owned);'));
  // The preview names the part, and the editor previews there.
  assert.ok(base.includes('{ option: optionId, attribute: side.channel, slot: side.slot }'));
  const editor = readFileSync(path.join(HERE, 'studioEditor.ts'), 'utf8');
  assert.ok(editor.includes('this.previewAnimation(detail.option ?? null, detail.attribute, detail.slot)'));
  assert.ok(editor.includes('const literal = sideOf(state, channel, slot)?.literal'));
});

test('what the "+" adds goes through classToAdd, so a data-class gets it already important', () => {
  const base = code('classPickerBase.ts');
  const seed = base.slice(base.indexOf('protected addSeed('), base.indexOf('protected addSeed(') + 400);
  assert.ok(seed.includes('addUtility(side.literal, classToAdd(cls, side.channel))'), 'the write');
  const chip = base.slice(base.indexOf('protected addChip('), base.indexOf('protected addSeed('));
  assert.ok(chip.includes('classToAdd(seed, side.channel)'), 'the chip previews and checks what it will write');
});

/**
 * The Properties tab (TASK-102020-picker-molecule-properties) is the same block in both panels: the
 * rows come decided by studioMoleculeProps, and each panel only renders them and emits.
 */
test('both panels render the Properties tab the same way, and neither decides what is written', () => {
  const block = (TS: string): string => TS.slice(TS.indexOf('protected renderProps()'), TS.indexOf('protected emitProp('));
  const [floating, docked] = PANELS.map((panel) => panelCode(panel));
  assert.ok(block(floating).length > 200, 'the floating panel has the tab');
  assert.equal(block(docked), block(floating), 'the two copies of the tab drifted apart');
  for (const [panel, TS] of [[PANELS[0], floating], [PANELS[1], docked]]) {
    assert.ok(TS.includes("'picker-props-open'"), `${panel}: the tab asks when it opens`);
    assert.ok(TS.includes("'picker-prop'"), `${panel}: the tab emits the write`);
    assert.ok(TS.includes("this.tabButton('props', 'panel.tabComponent')"), `${panel}: the tab button`);
    for (const decision of ['planPropWrite', 'splicePropAttribute', 'moleculePropsSchema']) {
      assert.ok(!TS.includes(decision), `${panel}: ${decision} is the editor's, not the panel's`);
    }
  }
});

for (const panel of PANELS) {
  const TS = panelCode(panel);
  const LESS = code(`${panel}.less`);

  test(`${panel}: every class the panel renders carries the prefix`, () => {
    // Measured on the real pages: they use `block` ~317 times, so `.block { display: block }` is in
    // their built stylesheet — and this panel used to render a `class="block"` of its own.
    const bare = renderedClasses(TS).filter((name) => !name.startsWith(PREFIX));
    assert.deepEqual(bare, [], 'these would collide with the client page');
  });

  test(`${panel}: every class the stylesheet selects carries the prefix`, () => {
    const bare = styledClasses(LESS).filter((name) => !name.startsWith(PREFIX));
    assert.deepEqual(bare, [], 'these would reach into the client page');
  });

  test(`${panel}: the rendered classes and the styled ones are the same set`, () => {
    // A rendered class with no rule is dead markup; a styled class nobody renders is dead css. Neither
    // is a crime on its own — but in a file this size, both are always a rename that went half way.
    const rendered = new Set(renderedClasses(TS));
    const styled = new Set(styledClasses(LESS));
    const unstyled = [...rendered].filter((name) => !styled.has(name)).sort();
    const unused = [...styled].filter((name) => !rendered.has(name)).sort();
    assert.deepEqual({ unstyled, unused }, { unstyled: [], unused: [] });
  });

  test(`${panel}: no class of the panel is a Tailwind utility`, async () => {
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
    const utilities = renderedClasses(TS).filter((name) => compiler.build([name]).length > empty);

    assert.deepEqual(utilities, [], 'the JIT would generate rules for these inside the client page');
  });

  test(`${panel}: the compiled css can survive being put inside a JS template literal`, () => {
    // How this broke for real (2026-09-10): a block comment in the .less said "someone writes
    // `md:p-3`", the css is injected as `loadStyle(`…css…`)` (processCssLit), the backtick closed the
    // template early, the module stopped parsing — and since the editor is loaded with a dynamic
    // `import()` whose rejection nobody reads, studio mode simply stopped arming. Silently.
    //
    // The `//` comments at the top of the file are safe (less strips them); a `/* */` one is not.
    const less = readFileSync(path.join(HERE, `${panel}.less`), 'utf8');
    const compiled = less
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');

    const offenders = compiled
      .split('\n')
      .map((line, index) => ({ line: line.trim(), at: index + 1 }))
      .filter((entry) => entry.line.includes('`') || entry.line.includes('${'));

    assert.deepEqual(offenders, [], 'a backtick or ${ here breaks the module that carries this css');
  });
}
