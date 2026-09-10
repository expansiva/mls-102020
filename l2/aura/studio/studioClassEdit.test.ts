/// <mls fileReference="_102020_/l2/aura/studio/studioClassEdit.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ANIMATION_GROUPS,
  CASCADE_MAX_CHILDREN,
  MISSING_IN_SOURCE,
  NO_OPTIONS,
  applyAnimationCustom,
  applyCascade,
  readAnimationCustom,
  readCascade,
  removeAnimationCustom,
  removeCascade,
  MOTION_SAFE_HINT,
  activeAnimationGroups,
  activeAnimations,
  addUtility,
  animationScreen,
  applyAnimationGroup,
  applyAnimationOption,
  applyAnimationState,
  buildAnimationClass,
  hasUtility,
  readAnimationState,
  removeUtility,
  type IAnimationState,
  scanTemplateTree,
  NOT_LOCATED,
  chipAvailability,
  colorOf,
  composeUtility,
  repeatedRenderWarning,
  resolveStructuralAnchor,
  scanTemplateElements,
  parseVarValue,
  readDesignSystemRoles,
  roleLabel,
  roleOptions,
  roleVar,
  describeMissingLiteral,
  editScope,
  findClassAttrs,
  parseClassAttr,
  replaceUtility,
  resolveAnchor,
  splitUtilities,
  utilityLabel,
  utilityOptions,
  type IDomPathStep,
  type IHitTree,
  type IOwnerTree,
  type ITemplateTree,
  STYLE_CATEGORIES,
  addableProperties,
  addableProperty,
  applyTypedValue,
  diffLiterals,
  newRoleOptions,
  classAttrSpan,
  containsPoint,
  deepestAt,
  ownerChain,
  readAttribute,
  readTypedValue,
  selectableChain,
  typedValueSpec,
  pasteCategories,
  pasteStyle,
  styleCategories,
} from '/_102020_/l2/aura/studio/studioClassEdit.js';

/** A page shaped like the generator's own output (the real 102046 page uses exactly these patterns). */
const PAGE = [
  `import { html } from 'lit';`,
  ``,
  `class ApproveChangeOrder {`,
  `  render() {`,
  `    return html\``,
  `      <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">`,
  `        <p class="rounded-md bg-[var(--surface-subtle,#f8fafc)] text-[var(--text-muted,#64748b)] p-3">Ok</p>`,
  `        <span class="px-3 py-2">a</span>`,
  `        <span class="px-3 py-2">b</span>`,
  `        <button data-class="px-9 py-9" panelClass="px-8 py-8" class="text-sm font-medium">go</button>`,
  `      </div>\`;`,
  `  }`,
  `}`,
].join('\n');

function tokenOf(literal: string, raw: string) {
  const token = splitUtilities(literal).find((candidate) => candidate.raw === raw);
  assert.ok(token, `token ${raw} not found in "${literal}"`);
  return token;
}

// --- splitUtilities ---

test('a class literal is split into tokens with family, value and variants', () => {
  const tokens = splitUtilities('rounded-md bg-[var(--surface-subtle,#f8fafc)] p-3 dark:hover:text-gray-300 -mt-2 flex');

  assert.deepEqual(tokens.map((t) => t.raw), [
    'rounded-md', 'bg-[var(--surface-subtle,#f8fafc)]', 'p-3', 'dark:hover:text-gray-300', '-mt-2', 'flex',
  ]);

  assert.deepEqual(
    tokens.map((t) => [t.family, t.value]),
    [['rounded', 'md'], ['bg', '[var(--surface-subtle,#f8fafc)]'], ['p', '3'], ['text', 'gray-300'], ['mt', '2'], ['', 'flex']],
  );

  const dark = tokenOf('dark:hover:text-gray-300', 'dark:hover:text-gray-300');
  assert.deepEqual(dark.variants, ['dark', 'hover']);
  assert.equal(dark.base, 'text-gray-300');

  const negative = tokens.find((t) => t.raw === '-mt-2');
  assert.equal(negative?.negative, true, 'the leading minus is not part of the family');

  assert.equal(tokens[1].arbitrary, true, 'a [..] value is arbitrary');
  assert.equal(tokens[5].family, '', 'a family with no vocabulary stays empty instead of being guessed');
});

test('the family is the longest known prefix, not the text before the last dash', () => {
  // `space-y-1` as `space` + `y-1`, or `max-w-6xl` as `max-w-6` + `xl`, would both be wrong.
  assert.deepEqual(
    splitUtilities('space-y-1 max-w-6xl gap-x-2 rounded-tl-lg mt-4 min-h-full').map((t) => [t.family, t.value]),
    [['space-y', '1'], ['max-w', '6xl'], ['gap-x', '2'], ['rounded-tl', 'lg'], ['mt', '4'], ['min-h', 'full']],
  );
});

test('a bare utility has an empty value, and composing it back drops the dash', () => {
  const [rounded, border] = splitUtilities('rounded border');
  assert.deepEqual([rounded.family, rounded.value], ['rounded', '']);
  assert.deepEqual([border.family, border.value], ['border', '']);
  assert.equal(composeUtility(rounded, ''), 'rounded');
  assert.equal(composeUtility(rounded, 'lg'), 'rounded-lg');
  assert.equal(composeUtility(tokenOf('dark:text-gray-300', 'dark:text-gray-300'), 'gray-500'), 'dark:text-gray-500');
  assert.equal(composeUtility(tokenOf('-mt-2', '-mt-2'), '4'), '-mt-4');
});

// --- utilityOptions ---

test('a scale family offers the current step plus its neighbours', () => {
  const options = utilityOptions(tokenOf('p-3', 'p-3'));
  assert.equal(options.kind, 'scale');
  assert.deepEqual(options.options, ['p-1', 'p-2', 'p-3', 'p-4', 'p-5']);
  assert.ok(options.options.includes('p-3'), 'the current one is always in the list, to be marked');
});

test('the window slides at the edges instead of shrinking', () => {
  assert.deepEqual(utilityOptions(tokenOf('p-0', 'p-0')).options, ['p-0', 'p-px', 'p-1', 'p-2', 'p-3']);
  assert.deepEqual(utilityOptions(tokenOf('p-24', 'p-24')).options, ['p-10', 'p-12', 'p-16', 'p-20', 'p-24']);
});

test('a value outside the curated scale is kept, in its numeric place', () => {
  // Half-steps exist but do not deserve a chip of their own for everyone; the current one does.
  const options = utilityOptions(tokenOf('p-1.5', 'p-1.5'));
  assert.deepEqual(options.options, ['p-px', 'p-1', 'p-1.5', 'p-2', 'p-3'], 'centred on the current value');
});

test('a colour family offers the shades of the SAME palette', () => {
  const options = utilityOptions(tokenOf('text-gray-400', 'text-gray-400'));
  assert.equal(options.kind, 'color');
  assert.deepEqual(options.options, ['text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600']);

  // Variants survive, or the dark-mode chip would silently edit the light-mode class.
  assert.deepEqual(
    utilityOptions(tokenOf('dark:text-gray-300', 'dark:text-gray-300'), 1).options,
    ['dark:text-gray-200', 'dark:text-gray-300', 'dark:text-gray-400'],
  );
});

test('the same family serves size and colour, decided by the value', () => {
  assert.equal(utilityOptions(tokenOf('text-sm', 'text-sm')).kind, 'scale');
  assert.equal(utilityOptions(tokenOf('text-gray-400', 'text-gray-400')).kind, 'color');
  assert.deepEqual(utilityOptions(tokenOf('border', 'border')).options, ['border-0', 'border', 'border-2', 'border-4', 'border-8']);
  assert.equal(utilityOptions(tokenOf('border-gray-200', 'border-gray-200')).kind, 'color');
});

test('what has no honest vocabulary is offered nothing, with ONE reason', () => {
  // `isolate` and friends: no family, no list. The sentence is the same for every such case — the
  // differences between them are about what MY tables know, not about anything the user can act on.
  for (const raw of ['isolate', 'antialiased', 'mix-blend-multiply', 'font-sans']) {
    const options = utilityOptions(tokenOf(raw, raw));
    assert.equal(options.kind, 'none', raw);
    assert.deepEqual(options.options, [], raw);
    assert.deepEqual(options.reason, NO_OPTIONS, raw);
  }
  assert.equal(NO_OPTIONS.id, 'reason.noOptions');
  // The arbitrary value is where the design-system roles go — never a hex or a raw step.
  assert.equal(
    utilityOptions(tokenOf('bg-[var(--x,#fff)]', 'bg-[var(--x,#fff)]')).reason?.id,
    'reason.noDsTokens',
  );
});

// --- Enumerated families ---

test('a whole class offers the other members of its list', () => {
  // `flex` has no neighbours to window: its alternatives are `block`, `grid`, `hidden`. Measured on the
  // 102 real pages, these were 16% of every token and the panel had nothing to say about them.
  const display = utilityOptions(tokenOf('flex', 'flex'));
  assert.equal(display.kind, 'list');
  assert.deepEqual(display.options, ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden']);
  assert.ok(display.options.includes('flex'), 'the current one is in the list, to be marked');

  assert.deepEqual(utilityOptions(tokenOf('italic', 'italic')).options, ['italic', 'not-italic']);
  assert.deepEqual(utilityOptions(tokenOf('relative', 'relative')).options, ['static', 'relative', 'absolute', 'fixed', 'sticky']);
  // The variant survives, like everywhere else.
  assert.deepEqual(
    utilityOptions(tokenOf('md:hidden', 'md:hidden')).options.slice(0, 2),
    ['md:block', 'md:inline-block'],
  );
});

test('an enumerated VALUE is shown in full, not as a window', () => {
  assert.deepEqual(
    utilityOptions(tokenOf('justify-between', 'justify-between')).options,
    ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly'],
  );
  assert.deepEqual(
    utilityOptions(tokenOf('overflow-x-auto', 'overflow-x-auto')).options,
    ['overflow-x-auto', 'overflow-x-hidden', 'overflow-x-visible', 'overflow-x-scroll', 'overflow-x-clip'],
  );
  assert.equal(utilityOptions(tokenOf('grid-cols-2', 'grid-cols-2')).kind, 'list');
  assert.equal(utilityOptions(tokenOf('animate-pulse', 'animate-pulse')).options.includes('animate-spin'), true);
});

test('a size is both a keyword and a step — the value decides', () => {
  // `h-full` is a keyword; `h-24` is a step of the spacing scale. Same family, two vocabularies.
  assert.equal(utilityOptions(tokenOf('h-full', 'h-full')).kind, 'list');
  assert.deepEqual(utilityOptions(tokenOf('h-full', 'h-full')).options, ['h-auto', 'h-full', 'h-screen', 'h-fit', 'h-min', 'h-max']);
  const numeric = utilityOptions(tokenOf('h-24', 'h-24'));
  assert.equal(numeric.kind, 'scale');
  assert.ok(numeric.options.includes('h-24'));
  assert.ok(numeric.options.includes('h-20'));
});

test('the dual families keep their third meaning: alignment and sides', () => {
  assert.deepEqual(
    utilityOptions(tokenOf('text-left', 'text-left')).options,
    ['text-left', 'text-center', 'text-right', 'text-justify', 'text-start', 'text-end'],
  );
  assert.deepEqual(utilityOptions(tokenOf('border-b', 'border-b')).options, ['border-t', 'border-r', 'border-b', 'border-l', 'border-x', 'border-y']);
  assert.deepEqual(utilityOptions(tokenOf('divide-y', 'divide-y')).options, ['divide-x', 'divide-y']);
  // And the other meanings still work.
  assert.equal(utilityOptions(tokenOf('text-sm', 'text-sm')).kind, 'scale');
  assert.equal(utilityOptions(tokenOf('text-gray-400', 'text-gray-400')).kind, 'color');
  assert.equal(utilityOptions(tokenOf('border-gray-200', 'border-gray-200')).kind, 'color');
  assert.equal(utilityOptions(tokenOf('border', 'border')).kind, 'scale');
});

test('a margin takes auto, a padding does not', () => {
  // `mx-auto` is 57x in the real pages; `p-auto` is not a thing.
  const margin = utilityOptions(tokenOf('mx-auto', 'mx-auto'));
  assert.equal(margin.kind, 'scale');
  assert.ok(margin.options.includes('mx-auto'));
  assert.equal(utilityOptions(tokenOf('p-auto', 'p-auto')).kind, 'none');
});

// --- replaceUtility ---

test('replacing a token keeps every other character of the literal', () => {
  const literal = 'rounded-md bg-[var(--surface-subtle,#f8fafc)]  p-3';
  assert.equal(
    replaceUtility(literal, 'p-3', 'p-4'),
    'rounded-md bg-[var(--surface-subtle,#f8fafc)]  p-4',
    'the double space is not normalised — that diff noise would land in the source',
  );
  assert.equal(replaceUtility(literal, 'rounded-md', 'rounded-lg'), 'rounded-lg bg-[var(--surface-subtle,#f8fafc)]  p-3');
  assert.equal(replaceUtility(literal, 'nope', 'p-9'), literal, 'an absent token changes nothing');
});

test('a repeated token is disambiguated by index', () => {
  const literal = 'p-3 mx-auto p-3';
  assert.equal(replaceUtility(literal, 'p-3', 'p-4', 2), 'p-3 mx-auto p-4');
  assert.equal(replaceUtility(literal, 'p-3', 'p-4', 0), 'p-4 mx-auto p-3');
  assert.equal(replaceUtility(literal, 'p-3', 'p-4'), 'p-4 mx-auto p-3', 'without the index, the first match wins');
});

// --- findClassAttrs / parseClassAttr ---

test('class literals are found in source order, and the offsets bracket the literal exactly', () => {
  const matches = findClassAttrs(PAGE, 'px-3 py-2');
  assert.equal(matches.length, 2);
  for (const match of matches) {
    assert.equal(PAGE.slice(match.startOffset, match.endOffset), 'px-3 py-2');
    assert.equal(PAGE[match.startOffset - 1], '"', 'startOffset sits right after the opening quote');
    assert.equal(PAGE[match.endOffset], '"', 'endOffset sits on the closing quote');
  }
  assert.ok(matches[0].startOffset < matches[1].startOffset);

  const second = parseClassAttr(PAGE, 'px-3 py-2', 1);
  assert.equal(second?.startOffset, matches[1].startOffset);
  assert.equal(parseClassAttr(PAGE, 'px-3 py-2', 2), null, 'a nonexistent occurrence is null, not a guess');
});

test('an attribute merely ENDING in class is not a class attribute', () => {
  // Rewriting `data-class` or `panelClass` would corrupt a component's props.
  assert.deepEqual(findClassAttrs(PAGE, 'px-9 py-9'), []);
  assert.deepEqual(findClassAttrs(PAGE, 'px-8 py-8'), []);
  assert.equal(findClassAttrs(PAGE, 'text-sm font-medium').length, 1);
});

test('arbitrary values with regex metacharacters are matched literally', () => {
  const literal = 'rounded-md bg-[var(--surface-subtle,#f8fafc)] text-[var(--text-muted,#64748b)] p-3';
  const matches = findClassAttrs(PAGE, literal);
  assert.equal(matches.length, 1);
  assert.equal(PAGE.slice(matches[0].startOffset, matches[0].endOffset), literal);
});

test('single quotes are supported and the quote is reported', () => {
  const source = `<div class='p-3 flex'></div>`;
  const [match] = findClassAttrs(source, 'p-3 flex');
  assert.equal(match.quote, "'");
  assert.equal(source.slice(match.startOffset, match.endOffset), 'p-3 flex');
});

// --- describeMissingLiteral ---

test('a computed class attribute is named as such, not reported as "not found"', () => {
  // Ids, not sentences: the words live in studioMessages, and asserting them here would only make the
  // tests break every time the copy is polished.
  assert.equal(describeMissingLiteral('<div class=${this.cls}>').id, 'reason.computedClass');
  assert.equal(describeMissingLiteral('<div class="${classMap(this.cls)}">').id, 'reason.computedClass');
  assert.equal(describeMissingLiteral('<div class="p-3 ${this.extra}">').id, 'reason.mixedClass');
  assert.deepEqual(describeMissingLiteral(PAGE), MISSING_IN_SOURCE);
});

// --- resolveAnchor ---

test('M = 1 and N = 1: the only occurrence, no warning', () => {
  assert.deepEqual(resolveAnchor({ sourceCount: 1, domCount: 1, domIndex: 0 }), { ok: true, occurrence: 0 });
});

test('M = 1 and N > 1: edits, and warns that it renders N times', () => {
  const result = resolveAnchor({ sourceCount: 1, domCount: 12, domIndex: 7 });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.occurrence, 0);
  assert.deepEqual(result.ok ? result.warning : undefined, repeatedRenderWarning(12));
  // The count travels as a PARAM: the sentence around it is the catalog's business, and pt and en put
  // the number in different places.
  assert.deepEqual(repeatedRenderWarning(12), { id: 'reason.repeatedRender', params: { count: 12 } });
});

test('M = N: the DOM index maps straight to the occurrence', () => {
  assert.deepEqual(resolveAnchor({ sourceCount: 3, domCount: 3, domIndex: 2 }), { ok: true, occurrence: 2 });
  assert.deepEqual(resolveAnchor({ sourceCount: 2, domCount: 2, domIndex: 0 }), { ok: true, occurrence: 0 });
  // An index outside the range is a refusal, never a clamp onto occurrence 0.
  assert.equal(resolveAnchor({ sourceCount: 2, domCount: 2, domIndex: 5 }).ok, false);
});

test('1 < M < N and M > N are refused, never guessed — and the refusal says what to DO', () => {
  for (const input of [
    { sourceCount: 2, domCount: 12, domIndex: 3 },
    { sourceCount: 5, domCount: 2, domIndex: 1 },
  ]) {
    const result = resolveAnchor(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.deepEqual(!result.ok ? result.reason : undefined, NOT_LOCATED);
  }
  // One id for every "I cannot place this element": the differences between the old four
  // sentences were about what the code knows, not about anything the user can act on.
  assert.equal(NOT_LOCATED.id, 'reason.notLocated');
  assert.equal(NOT_LOCATED.params, undefined, 'no counts in the refusal');
});

test('M = 0 has nothing to edit', () => {
  assert.equal(resolveAnchor({ sourceCount: 0, domCount: 1, domIndex: 0 }).ok, false);
});

// --- editScope ---

test('a molecule element is refused with the shared-scope reason', () => {
  const scope = editScope('_102040_/l2/mlAlertModal', 102040);
  assert.equal(scope.shared, true);
  // The project travels as a param: which one it is matters, and only the catalog knows how to say it.
  assert.deepEqual(scope.refusal, { id: 'reason.moleculeShared', params: { project: 102040 } });
});

test('a page element carries no refusal, and names the file that will change', () => {
  const scope = editScope('_102046_buildFlowFsm/web/desktop/page11/approveChangeOrder', null);
  assert.equal(scope.shared, false);
  assert.equal(scope.refusal, undefined);
  assert.match(scope.file, /approveChangeOrder/u);
});

// --- chipAvailability (the JIT dependency) ---

test('a class absent from the built css is offered only while the JIT is live', () => {
  // In the built css: safe everywhere.
  assert.equal(chipAvailability(false, true, true), 'offer');
  assert.equal(chipAvailability(false, true, false), 'offer');
  // Absent + JIT: works on screen now, only reaches the client after the next publish.
  assert.equal(chipAvailability(false, false, true), 'jit-only');
  // Absent + no JIT: hidden. A chip that drops the utility silently is worse than no chip.
  assert.equal(chipAvailability(false, false, false), 'hidden');
  // The current class is always shown — it is what the element already has.
  assert.equal(chipAvailability(true, false, false), 'offer');
});

// --- Design system roles ---

const DS_CSS = [
  ':root{',
  '\t--page-bg: #eef1f5;',
  '\t--surface-bg: #ffffff;',
  '\t--surface-subtle: #f8fafc;',
  '\t--text-default: #0f172a;',
  '\t--text-muted: #64748b;',
  '\t--border-default: #e2e8f0;',
  '\t--button-primary-bg: #2563eb;',
  '\t--button-primary-text: #ffffff;',
  '\t--shadow-soft: rgb(0 0 0 / 0.1);',
  '\t--ml-alert-bg: var(--surface-bg);',
  '}',
  '[data-theme="dark"], :root.dark {',
  '\t--page-bg: #0b1220;',
  '\t--text-muted: #94a3b8;',
  '}',
].join('\n');

test('the design system roles come from the LIGHT block, without the molecule tokens', () => {
  const roles = readDesignSystemRoles(DS_CSS);
  assert.deepEqual(roles, [
    '--page-bg', '--surface-bg', '--surface-subtle', '--text-default', '--text-muted',
    '--border-default', '--button-primary-bg', '--button-primary-text', '--shadow-soft',
  ]);
  assert.equal(roles.includes('--ml-alert-bg'), false, 'molecule reconciliation tokens are not page roles');
  // The dark block repeats the same names — taking both would duplicate every role.
  assert.equal(roles.filter((role) => role === '--page-bg').length, 1);
});

test('an arbitrary var() value is parsed into role and fallback', () => {
  assert.deepEqual(parseVarValue('[var(--surface-subtle,#f8fafc)]'), { cssVar: '--surface-subtle', fallback: '#f8fafc' });
  assert.deepEqual(parseVarValue('[var(--surface-bg)]'), { cssVar: '--surface-bg', fallback: '' });
  assert.equal(parseVarValue('[12px]'), null, 'not every arbitrary value is a token');
  assert.equal(parseVarValue('gray-400'), null);
});

test('the roles offered match the FAMILY, current first', () => {
  const roles = readDesignSystemRoles(DS_CSS);
  const resolve = (cssVar: string) => ({
    '--page-bg': '#eef1f5',
    '--surface-bg': '#ffffff',
    '--surface-subtle': '#f8fafc',
    '--button-primary-bg': '#2563eb',
    '--text-default': '#0f172a',
    '--text-muted': '#64748b',
    '--border-default': '#e2e8f0',
    '--button-primary-text': '#ffffff',
  } as Record<string, string>)[cssVar] ?? '';

  const bg = utilityOptions(tokenOf('bg-[var(--surface-subtle,#f8fafc)]', 'bg-[var(--surface-subtle,#f8fafc)]'), 2, roles, resolve);
  assert.equal(bg.kind, 'role');
  assert.equal(bg.options[0], 'bg-[var(--surface-subtle,#f8fafc)]', 'the current role leads the list');
  assert.ok(bg.options.includes('bg-[var(--page-bg,#eef1f5)]'));
  assert.ok(bg.options.includes('bg-[var(--button-primary-bg,#2563eb)]'));
  // A text role has no business in a background picker — the DS naming rule is what makes this safe.
  assert.equal(bg.options.some((option) => option.includes('--text-')), false);
  // `--surface-subtle` does not end in `-bg`, so it only shows up because it is the CURRENT one.
  assert.equal(bg.options.filter((option) => option.includes('--surface-subtle')).length, 1);

  const text = utilityOptions(tokenOf('text-[var(--text-muted,#64748b)]', 'text-[var(--text-muted,#64748b)]'), 2, roles, resolve);
  assert.ok(text.options.includes('text-[var(--text-default,#0f172a)]'));
  assert.ok(text.options.includes('text-[var(--button-primary-text,#ffffff)]'));
  assert.equal(text.options.some((option) => option.endsWith('-bg,#eef1f5)]')), false);

  const border = utilityOptions(tokenOf('border-[var(--border-default,#e2e8f0)]', 'border-[var(--border-default,#e2e8f0)]'), 2, roles, resolve);
  assert.deepEqual(border.options, ['border-[var(--border-default,#e2e8f0)]']);
});

test('the fallback is re-resolved from the NEW role, never carried over', () => {
  const roles = ['--surface-subtle', '--surface-bg'];
  const options = roleOptions(
    tokenOf('bg-[var(--surface-subtle,#f8fafc)]', 'bg-[var(--surface-subtle,#f8fafc)]'),
    roles,
    (cssVar) => (cssVar === '--surface-bg' ? '#ffffff' : '#f8fafc'),
  );
  // Keeping `#f8fafc` under `--surface-bg` would render the OLD colour whenever the DS fails to load.
  assert.ok(options.includes('bg-[var(--surface-bg,#ffffff)]'));
  assert.equal(options.some((option) => option === 'bg-[var(--surface-bg,#f8fafc)]'), false);
});

test('a value with whitespace is offered WITHOUT a fallback instead of a broken class', () => {
  const options = roleOptions(
    tokenOf('bg-[var(--surface-bg,#fff)]', 'bg-[var(--surface-bg,#fff)]'),
    ['--surface-bg', '--overlay-backdrop-bg'],
    (cssVar) => (cssVar === '--overlay-backdrop-bg' ? 'rgb(0 0 0 / 0.4)' : '#ffffff'),
  );
  assert.equal(options.includes('bg-[var(--overlay-backdrop-bg)]'), true, 'no fallback beats an unparseable one');
  assert.equal(options.some((option) => option.includes('rgb(')), false);
});

test('with no design system loaded, an arbitrary value stays read-only with a reason', () => {
  const options = utilityOptions(tokenOf('bg-[var(--surface-bg,#fff)]', 'bg-[var(--surface-bg,#fff)]'), 2, []);
  assert.equal(options.kind, 'none');
  assert.equal(options.reason?.id, 'reason.noDsTokens');
});

test('the role label is what the user reads', () => {
  assert.equal(roleLabel('bg-[var(--surface-subtle,#f8fafc)]'), 'surface-subtle');
  assert.equal(roleLabel('dark:text-[var(--text-muted)]'), 'text-muted');
});

// --- scanTemplateElements / resolveStructuralAnchor ---

// The two shapes that matter, both taken from the real pages: a header row with identical `<th>`s (the
// case counting called "ambiguous"), and a body row inside `${rows.map(...)}` with an event binding
// whose arrow contains a `>` and whose class mixes a literal with an expression.
const TABLE = [
  `class Catalogue {`,
  `  render() {`,
  `    return html\`<section class="p-4">`,
  `      <table class="min-w-full text-sm">`,
  `        <thead><tr class="border-b">`,
  `          <th class="px-3 py-2">a</th><th class="px-3 py-2">b</th><th class="px-3 py-2">c</th>`,
  `        </tr></thead>`,
  `        <tbody>\${rows.map((item: Array<string>) => html\`<tr class="border-b \${item.sel ? 'bg-x' : ''}">`,
  `          <td class="px-3 py-2"><button class="p-2" @click=\${() => { if (window.confirm(\\\`\${item.name}\\\`)) { this.go(item); } }}>x</button></td>`,
  `          <td class="px-3 py-2">\${item.qty}</td>`,
  `        </tr>\`)}</tbody>`,
  `      </table>`,
  `    </section>\`;`,
  `  }`,
  `}`,
].join('\n');

function elementsOf(source: string) {
  return scanTemplateElements(source);
}

function treeOf(source: string) {
  return scanTemplateTree(source);
}

test('the scanner reads tags, nesting and the class literal — and nothing from the TypeScript', () => {
  const elements = elementsOf(TABLE);

  // `Array<string>` inside a ${...} is NOT an element: a phantom sibling shifts every index after it.
  assert.equal(elements.some((element) => element.tag === 'string'), false);

  assert.deepEqual(
    elements.map((element) => element.tag),
    ['section', 'table', 'thead', 'tr', 'th', 'th', 'th', 'tbody', 'tr', 'td', 'button', 'td'],
  );

  // Offsets slice the literal back out, quotes excluded.
  for (const element of elements) {
    if (element.literal === null) continue;
    assert.equal(TABLE.slice(element.literalStart, element.literalEnd), element.literal);
    assert.equal(TABLE[element.literalStart - 1], '"');
    assert.equal(TABLE[element.literalEnd], '"');
  }

  // Nesting: every child sits inside its parent's span.
  for (const element of elements) {
    if (element.parent < 0) continue;
    const parent = elements[element.parent];
    assert.ok(element.openStart > parent.openStart, `${element.tag} starts after ${parent.tag}`);
    assert.ok(element.end <= parent.end, `${element.tag} ends inside ${parent.tag}`);
  }

  const [, , thead, headRow] = elements;
  assert.equal(elements[thead.parent].tag, 'table');
  assert.equal(headRow.tag, 'tr');
  assert.equal(elements.filter((element) => element.tag === 'th').every((th) => th.inExpression), false);

  // What lives inside ${...} is flagged: one source node, many rendered elements.
  const bodyRow = elements.find((element) => element.tag === 'tr' && element.inExpression);
  assert.ok(bodyRow, 'the mapped row is flagged as being inside an expression');
  assert.equal(elements[bodyRow.parent].tag, 'tbody', 'and its parent is still the tbody');
});

test('an arrow function in a binding does not end the open tag early', () => {
  // `@click=${() => { … }}`: the `>` of the arrow used to close the tag several lines too soon, and
  // everything after it was scanned as markup with corrupted nesting.
  const elements = elementsOf(TABLE);
  const button = elements.find((element) => element.tag === 'button');
  assert.ok(button);
  assert.equal(button.literal, 'p-2');
  assert.equal(elements[button.parent].tag, 'td');
  // The `<td>` after the button's one is still a sibling of it, not a descendant.
  const tds = elements.filter((element) => element.tag === 'td');
  assert.equal(tds.length, 2);
  assert.equal(tds[0].parent, tds[1].parent);
});

test('a class attribute that mixes literal and expression is read as the literal it contains', () => {
  const elements = elementsOf(TABLE);
  const bodyRow = elements.find((element) => element.tag === 'tr' && element.inExpression);
  assert.equal(bodyRow?.literal, "border-b ${item.sel ? 'bg-x' : ''}");
});

test('the walk resolves identical siblings by POSITION, which counting could not', () => {
  const elements = elementsOf(TABLE);
  const path = [
    { tag: 'section', index: 0, count: 1 },
    { tag: 'table', index: 0, count: 1 },
    { tag: 'thead', index: 0, count: 1 },
    { tag: 'tr', index: 0, count: 1 },
    { tag: 'th', index: 2, count: 3 },
  ];
  const anchor = resolveStructuralAnchor({ elements, links: [] }, path);
  assert.equal(anchor.ok, true);
  // Three `<th class="px-3 py-2">` in the file plus two `<td>` with the same string: counting refuses.
  const ths = elements.filter((element) => element.tag === 'th');
  assert.equal(anchor.ok && anchor.element, ths[2]);
  assert.equal(anchor.ok && anchor.renders, 1);
  assert.equal(findClassAttrs(TABLE, 'px-3 py-2').length, 5, 'the same literal appears 5x in the file');
});

test('one source node rendering N rows resolves, and reports how many', () => {
  const elements = elementsOf(TABLE);
  // The DOM has 12 `<tr>` under the tbody; the template has one, inside the ${...}.
  const anchor = resolveStructuralAnchor({ elements, links: [] }, [
    { tag: 'section', index: 0, count: 1 },
    { tag: 'table', index: 0, count: 1 },
    { tag: 'tbody', index: 0, count: 1 },
    { tag: 'tr', index: 6, count: 12 },
    { tag: 'td', index: 1, count: 2 },
  ]);
  assert.equal(anchor.ok, true);
  assert.equal(anchor.ok && anchor.element.tag, 'td');
  assert.equal(anchor.ok && anchor.renders, 12, 'so the panel can warn that the change hits 12 rows');
});

test('the walk refuses instead of guessing when the counts do not line up', () => {
  const elements = elementsOf(TABLE);
  // Two source `<td>` against three on screen: a conditional added one, and there is no way to know
  // which is which.
  const anchor = resolveStructuralAnchor({ elements, links: [] }, [
    { tag: 'section', index: 0, count: 1 },
    { tag: 'table', index: 0, count: 1 },
    { tag: 'tbody', index: 0, count: 1 },
    { tag: 'tr', index: 0, count: 1 },
    { tag: 'td', index: 2, count: 3 },
  ]);
  assert.equal(anchor.ok, false);

  // A tag that is not there at all.
  assert.equal(resolveStructuralAnchor({ elements, links: [] }, [{ tag: 'nav', index: 0, count: 1 }]).ok, false);
  // And an empty path is not "the first element".
  assert.equal(resolveStructuralAnchor({ elements, links: [] }, []).ok, false);
});

test('a helper template is LINKED where it is called — without that, 87% of the page is unreachable', () => {
  // Measured on the 102 real pages: 92% split render() into helpers and 87% of all elements live
  // outside the first template. The raw scan sees a forest; the tree links it back together.
  const source = [
    'render() { return html`<section class="p-4">${this.renderForm()}<footer class="mt-4">x</footer></section>`; }',
    'renderForm() { return html`<form class="grid gap-6"><input class="px-3 py-2"></form>`; }',
  ].join('\n');

  const elements = elementsOf(source);
  const rawForm = elements.find((element) => element.tag === 'form');
  assert.equal(rawForm?.parent, -1, 'the raw scan still has the helper as a root of its own');

  const tree = treeOf(source);
  assert.equal(tree.links.length, 1);
  assert.equal(tree.elements[tree.links[0].root].tag, 'form');
  assert.equal(tree.elements[tree.links[0].parent].tag, 'section');

  const anchor = resolveStructuralAnchor(tree, [
    { tag: 'section', index: 0, count: 1 },
    { tag: 'form', index: 0, count: 1 },
    { tag: 'input', index: 0, count: 1 },
  ]);
  assert.equal(anchor.ok, true);
  assert.equal(anchor.ok && anchor.element.literal, 'px-3 py-2');

  // The helper is mounted where it is CALLED, so it comes before the footer even though its source
  // sits after the whole render().
  const footer = resolveStructuralAnchor(tree, [
    { tag: 'section', index: 0, count: 1 },
    { tag: 'footer', index: 0, count: 1 },
  ]);
  assert.equal(footer.ok && footer.element.literal, 'mt-4');
});

test('a helper called twice is one source node rendering twice, and says so', () => {
  const source = [
    'render() { return html`<div class="grid">${this.card(a)}${this.card(b)}</div>`; }',
    'card(item) { return html`<article class="rounded-md p-4">${item}</article>`; }',
  ].join('\n');
  const tree = treeOf(source);
  assert.equal(tree.links.length, 2, 'two mounts of the same root');
  assert.equal(tree.links[0].root, tree.links[1].root);

  const anchor = resolveStructuralAnchor(tree, [
    { tag: 'div', index: 0, count: 1 },
    { tag: 'article', index: 1, count: 2 },
  ]);
  assert.equal(anchor.ok, true);
  assert.equal(anchor.ok && anchor.element.literal, 'rounded-md p-4');
  // Both chips edit the same line, so the panel warns instead of pretending it is only this one.
  assert.equal(anchor.ok && anchor.renders, 2);
});

test('a method with no template, and a template no one calls, are simply not linked', () => {
  const source = [
    'render() { return html`<div class="a">${this.label()}</div>`; }',
    'label() { return this.msg.title; }',
    'renderUnused() { return html`<span class="b">x</span>`; }',
  ].join('\n');
  const tree = treeOf(source);
  assert.deepEqual(tree.links, []);
  // The orphan template stays a root: reachable only if the DOM path happens to start there.
  assert.equal(tree.elements.filter((element) => element.parent === -1).length, 2);
});

test('void and self-closing elements do not swallow their siblings', () => {
  const elements = elementsOf('html`<div class="a"><input class="b"><br><img class="c"/><span class="d">x</span></div>`');
  assert.deepEqual(elements.map((element) => element.tag), ['div', 'input', 'br', 'img', 'span']);
  for (const element of elements.slice(1)) {
    assert.equal(element.parent, 0, `${element.tag} is a child of the div`);
  }
});

// --- Adding / removing (the animation tab's gesture) ---

test('adding and removing a class keeps the rest of the literal untouched', () => {
  assert.equal(addUtility('rounded-md  p-3', 'animate-pulse'), 'rounded-md  p-3 animate-pulse');
  assert.equal(addUtility('', 'animate-pulse'), 'animate-pulse', 'an element with no class starts one');
  assert.equal(addUtility('p-3 animate-pulse', 'animate-pulse'), 'p-3 animate-pulse', 'adding twice is a no-op');

  assert.equal(removeUtility('rounded-md  p-3 animate-pulse', 'animate-pulse'), 'rounded-md  p-3');
  assert.equal(removeUtility('animate-pulse p-3', 'animate-pulse'), 'p-3');
  assert.equal(removeUtility('p-3 animate-pulse rounded', 'animate-pulse'), 'p-3 rounded');
  assert.equal(removeUtility('animate-pulse', 'animate-pulse'), '');
  assert.equal(removeUtility('p-3', 'animate-spin'), 'p-3', 'removing what is not there changes nothing');
});

test('a class counts as present with or without its variant prefix', () => {
  assert.equal(hasUtility('p-3 animate-pulse', 'animate-pulse'), true);
  assert.equal(hasUtility('p-3 motion-safe:animate-pulse', 'animate-pulse'), true);
  assert.equal(hasUtility('p-3', 'animate-pulse'), false);
});

// --- Animation vocabulary ---

test('the vocabulary is only what really exists', () => {
  const classes = ANIMATION_GROUPS.flatMap((group) => group.options).flatMap((option) => option.classes);
  // Tailwind's four keyframes — already the house standard (animate-pulse is used 51x by the client
  // pages, animate-spin 51x by the molecules). Anything invented would be a DEAD class: there are no
  // keyframes for it anywhere, and the JIT does not invent them.
  assert.deepEqual(
    classes.filter((cls) => cls.startsWith('animate-')).sort(),
    ['animate-bounce', 'animate-ping', 'animate-pulse', 'animate-spin'],
  );
  assert.equal(classes.some((cls) => /animate-(fade|slide|zoom)/u.test(cls)), false, 'no invented keyframes');
  // Duration comes from Tailwind's scale: the design system's transition-* tokens are inverted in the
  // real projects (fast: 0.5s, slow: 0.2s) and the picker must not spread that silently.
  assert.equal(classes.some((cls) => cls.includes('transition-fast') || cls.includes('transition-slow')), false);
  for (const option of ANIMATION_GROUPS.flatMap((group) => group.options)) {
    assert.match(option.hint, /^anim\.\w+\.hint$/u, `${option.id} needs a hint id — a label cannot describe motion`);
    assert.match(option.label, /^anim\.\w+\.label$/u, option.id);
  }
  // Every group with a root chip has to know what that chip turns on.
  for (const group of ANIMATION_GROUPS) {
    if (group.kind !== 'hover') continue;
    assert.ok(group.defaultOptionId, `${group.id} needs a default for the root screen`);
    assert.ok(group.options.some((option) => option.id === group.defaultOptionId));
  }
});

// --- Screens ---

test('the root screen is short: the families and a way into each', () => {
  const root = animationScreen('root');
  assert.equal(root.back, undefined, 'the root has nowhere to go back to');
  assert.equal(root.advanced, 'advanced', 'tuning lives behind Avançado, not on the first screen');
  assert.notEqual(root.motionSwitch, true, 'the switch is a setting: it lives in Avançado, not here');
  assert.deepEqual(root.rows.map((row) => row.more), ['entrance', 'continuous', 'hover']);

  // Duration and curve are NOT on the first screen any more.
  const titles = root.rows.map((row) => row.title);
  assert.equal(titles.includes('anim.group.duration'), false);
  assert.equal(titles.includes('anim.group.easing'), false);

  // The hover row is one chip per EFFECT (its intensities are alternatives, shown in the full screen).
  const hoverRow = root.rows.find((row) => row.more === 'hover');
  assert.equal(hoverRow?.mode, 'groups');
  assert.deepEqual(hoverRow?.groups?.map((group) => group.id), ['scale', 'lift', 'fade', 'shadow', 'rotate', 'bright']);
});

test('each full screen configures its family and can come back', () => {
  const continuous = animationScreen('continuous');
  assert.equal(continuous.back, 'root');
  assert.deepEqual(continuous.rows.map((row) => row.title), [
    'anim.group.continuous', 'anim.group.speed', 'anim.group.repeat',
    'anim.state.trigger.title', 'anim.group.pause',
  ]);
  // There are only four keyframes in Tailwind, so the full screen is CONFIGURATION, not more of them.
  assert.equal(continuous.rows[0].group?.options.length, 4);

  const hover = animationScreen('hover');
  assert.equal(hover.back, 'root');
  assert.deepEqual(hover.rows.map((row) => row.title), [
    'anim.group.scale', 'anim.group.lift', 'anim.group.fade', 'anim.group.shadow',
    'anim.group.rotate', 'anim.group.bright', 'anim.state.when.title',
  ]);

  const advanced = animationScreen('advanced');
  assert.equal(advanced.back, 'root');
  assert.deepEqual(advanced.rows.map((row) => row.title), [
    'anim.group.scope', 'anim.group.duration', 'anim.group.easing', 'anim.group.delay',
  ]);
  // The switch is on the screen where movement gets tuned, not only on the root.
  assert.equal(advanced.motionSwitch, true);
});

// --- Applying ---

test('the motion-safe switch explains itself, and says what BOTH states do', () => {
  // The label names the switch; the hint says what happens and WHERE the preference lives — nobody can
  // infer that from a checkbox. The words themselves are asserted in the catalog test.
  assert.equal(MOTION_SAFE_HINT.id, 'panel.motionSafeHint');
  // Exactly one screen offers the switch, and the explanation goes with it.
  assert.equal(animationScreen('advanced').motionSwitch, true);
  for (const screen of ['root', 'continuous', 'hover'] as const) {
    assert.notEqual(animationScreen(screen).motionSwitch, true, screen);
  }
});

test('the continuous animations are exclusive: picking one drops the other', () => {
  const withSpin = applyAnimationOption('p-3', 'spin');
  assert.equal(withSpin, 'p-3 animate-spin');

  const swapped = applyAnimationOption(withSpin, 'pulse');
  assert.equal(swapped, 'p-3 animate-pulse', 'two keyframes at once would fight each other');
  assert.deepEqual(activeAnimations(swapped), ['pulse']);
});

test('clicking the active chip turns it off', () => {
  const on = applyAnimationOption('p-3', 'bounce');
  assert.equal(applyAnimationOption(on, 'bounce'), 'p-3');
});

test('speed and repetitions are arbitrary properties, exclusive within themselves', () => {
  // `duration-*` drives TRANSITIONS, not keyframes: retiming an animation needs the arbitrary property.
  let literal = applyAnimationOption('p-3 animate-spin', 'sp2');
  assert.equal(literal, 'p-3 animate-spin [animation-duration:2s]');
  literal = applyAnimationOption(literal, 'sp05');
  assert.equal(literal, 'p-3 animate-spin [animation-duration:0.5s]');

  literal = applyAnimationOption(literal, 'rp2');
  assert.deepEqual(activeAnimations(literal).sort(), ['rp2', 'sp05', 'spin']);
  assert.equal(literal.includes('[animation-iteration-count:2]'), true);
});

test('a hover effect brings `transition` with it, and never takes it away', () => {
  const withScale = applyAnimationOption('p-3', 'scale105');
  assert.equal(withScale, 'p-3 hover:scale-105 transition');

  // Different effects stack; intensities of the SAME effect replace each other.
  const both = applyAnimationOption(withScale, 'lift05');
  assert.deepEqual(activeAnimations(both).sort(), ['lift05', 'scale105']);
  assert.equal(both.split(' ').filter((cls) => cls === 'transition').length, 1, 'transition is not added twice');

  const stronger = applyAnimationOption(both, 'scale110');
  assert.deepEqual(activeAnimations(stronger).sort(), ['lift05', 'scale110']);
  assert.equal(stronger.includes('scale-105'), false);

  // Turning the effects off leaves `transition` alone: it may have been the user's own.
  const off = applyAnimationOption(applyAnimationOption(stronger, 'lift05'), 'scale110');
  assert.equal(off, 'p-3 transition');
});

test('an existing scoped transition counts — the pair is not added on top of it', () => {
  const literal = applyAnimationOption('p-3 transition-colors', 'fade80');
  assert.equal(literal, 'p-3 transition-colors hover:opacity-80');
});

test('the root chip toggles the whole effect, whatever intensity is on', () => {
  const strong = applyAnimationOption('p-3', 'shadowXl');
  assert.deepEqual(activeAnimationGroups(strong).sort(), ['shadow']);

  // Clicking the root chip while ANY intensity is on turns the effect off — not "adds the default".
  const off = applyAnimationGroup(strong, 'shadow');
  assert.deepEqual(activeAnimationGroups(off), []);

  // And from off, it turns on the group's default.
  const on = applyAnimationGroup(off, 'shadow');
  assert.deepEqual(activeAnimations(on), ['shadowLg']);
});

// --- State switches ---

test('the motion-safe guard wraps what MOVES, and only that', () => {
  const state: IAnimationState = { motionSafe: true, animationTrigger: 'always', hoverTrigger: 'hover' };
  assert.equal(buildAnimationClass('animate-spin', 'animation', state), 'motion-safe:animate-spin');
  assert.equal(buildAnimationClass('scale-105', 'hover', state), 'motion-safe:hover:scale-105');
  // A duration says HOW something moves; guarding it would leave a motion-reduce user with a
  // transition of the wrong length instead of no movement at all.
  assert.equal(buildAnimationClass('duration-300', 'duration', state), 'duration-300');

  const guarded = applyAnimationState(applyAnimationOption('p-3 animate-spin duration-300', 'scale105'), 'motionSafe', 'true');
  assert.equal(guarded, 'p-3 motion-safe:animate-spin duration-300 motion-safe:hover:scale-105 transition');
  assert.equal(readAnimationState(guarded).motionSafe, true);
  assert.deepEqual(activeAnimations(guarded).sort(), ['d300', 'scale105', 'spin'], 'the guard does not hide what is on');

  // The switch rewrites in place, both ways: no reshuffling of the file.
  const plain = applyAnimationState(guarded, 'motionSafe', 'false');
  assert.equal(plain, 'p-3 animate-spin duration-300 hover:scale-105 transition');
  assert.equal(readAnimationState(plain).motionSafe, false);
});

test('a continuous animation can be told to run only under the mouse', () => {
  const always = applyAnimationOption('p-3', 'pulse');
  assert.equal(readAnimationState(always).animationTrigger, 'always');

  const onHover = applyAnimationState(always, 'animationTrigger', 'hover');
  assert.equal(onHover, 'p-3 hover:animate-pulse');
  assert.equal(readAnimationState(onHover).animationTrigger, 'hover');
  assert.deepEqual(activeAnimations(onHover), ['pulse'], 'still the same option, just triggered differently');

  // A new option written while the trigger is `hover` is written with it.
  const swapped = applyAnimationOption(onHover, 'spin');
  assert.equal(swapped, 'p-3 hover:animate-spin');
});

test('the hover effects can answer focus or click instead of the mouse', () => {
  const onHover = applyAnimationOption('p-3', 'lift1');
  assert.equal(onHover, 'p-3 hover:-translate-y-1 transition');

  const onFocus = applyAnimationState(onHover, 'hoverTrigger', 'focus');
  assert.equal(onFocus, 'p-3 focus:-translate-y-1 transition', 'keyboard users get the same affordance');
  assert.equal(readAnimationState(onFocus).hoverTrigger, 'focus');

  // And a second effect follows the chosen trigger.
  const withShadow = applyAnimationOption(onFocus, 'shadowLg');
  assert.equal(withShadow.includes('focus:shadow-lg'), true);

  const onActive = applyAnimationState(withShadow, 'hoverTrigger', 'active');
  assert.equal(onActive.includes('active:-translate-y-1'), true);
  assert.equal(onActive.includes('active:shadow-lg'), true);
});

test('an arbitrary-property class survives the variant rewrites (its value holds a colon)', () => {
  const literal = applyAnimationState(applyAnimationOption('p-3 animate-spin', 'sp2'), 'motionSafe', 'true');
  assert.equal(literal, 'p-3 motion-safe:animate-spin [animation-duration:2s]');
  assert.deepEqual(activeAnimations(literal).sort(), ['sp2', 'spin']);
});

test('an element with no animation reports none, and nothing is invented for it', () => {
  assert.deepEqual(activeAnimations('p-3 rounded-md text-gray-400'), []);
  assert.deepEqual(activeAnimationGroups('p-3 rounded-md'), []);
  assert.deepEqual(readAnimationState('p-3 rounded-md'), { motionSafe: false, animationTrigger: 'always', hoverTrigger: 'hover' });
});

// --- Friendly names ---

/** The label as the panel composes it, so the tests can read one string. */
function labelOf(raw: string): string {
  const label = utilityLabel(tokenOf(raw, raw));
  if (!label.property) return '';
  return [label.property, ...label.variants.map((part) => part.id ?? part.raw ?? '')].join(' · ');
}

test('the row label says what the class DOES, not what it is written as', () => {
  // The examples the user gave, in their own order — as ids, since the words live in the catalog.
  assert.equal(labelOf('rounded-md'), 'prop.radius');
  assert.equal(labelOf('border-[var(--button-secondary-border,#cbd5e1)]'), 'prop.borderColor');
  assert.equal(labelOf('bg-[var(--button-secondary-bg,#f8fafc)]'), 'prop.bgColor');
  assert.equal(labelOf('px-3'), 'prop.paddingX');
  assert.equal(labelOf('space-y-4'), 'prop.spaceY');
  assert.equal(labelOf('max-w-6xl'), 'prop.maxWidth');
});

test('a family that means two things is named by its VALUE', () => {
  assert.equal(labelOf('text-sm'), 'prop.textSize');
  assert.equal(labelOf('text-gray-400'), 'prop.textColor');
  assert.equal(labelOf('text-[var(--text-muted,#64748b)]'), 'prop.textColor');
  assert.equal(labelOf('border'), 'prop.borderWidth');
  assert.equal(labelOf('border-gray-200'), 'prop.borderColor');
});

test('the variant is part of the label — two rows must not read the same', () => {
  // `text-gray-400` and `dark:text-gray-300` are different rows; without the variant both would read
  // the same and the user would have to guess which one is which.
  assert.equal(labelOf('dark:text-gray-300'), 'prop.textColor · variant.dark');
  assert.equal(labelOf('hover:bg-gray-100'), 'prop.bgColor · variant.hover');
  assert.equal(labelOf('dark:hover:text-gray-300'), 'prop.textColor · variant.dark · variant.hover');
  assert.notEqual(labelOf('text-gray-400'), labelOf('dark:text-gray-300'));

  // A breakpoint carries its name as a param, because pt and en word it differently.
  const responsive = utilityLabel(tokenOf('md:p-6', 'md:p-6'));
  assert.deepEqual(responsive.variants, [{ id: 'variant.breakpointFrom', params: { name: 'md' } }]);
});

test('a value that is neither a step nor a colour is not named as one', () => {
  // `text-left` used to be labelled as a text SIZE — a wrong name, which is worse than no name.
  assert.equal(labelOf('text-left'), 'prop.textAlign');
  assert.equal(labelOf('text-nowrap'), 'prop.textWrap');
  assert.equal(labelOf('border-b'), 'prop.borderSideBottom');
  assert.equal(labelOf('border-dashed'), 'prop.borderStyle');
});

test('layout classes with no family here are still named — they are 16% of every token', () => {
  // Read-only rows, but `w-full` alone appears 462 times in the real pages: a panel where a sixth of
  // the rows shows raw classes reads worse for no reason.
  assert.equal(labelOf('w-full'), 'prop.width');
  assert.equal(labelOf('block'), 'prop.display');
  assert.equal(labelOf('grid-cols-2'), 'prop.gridCols');
  assert.equal(labelOf('justify-between'), 'prop.justify');
  assert.equal(labelOf('items-center'), 'prop.items');
  assert.equal(labelOf('overflow-x-auto'), 'prop.overflowX');
  assert.equal(labelOf('min-h-full'), 'prop.minHeight');
  // And what the animation tab writes is nameable by the classes tab.
  assert.equal(labelOf('animate-pulse'), 'prop.animation');
  assert.equal(labelOf('motion-safe:animate-spin'), 'prop.animation · variant.motionSafe');
});

test('with no honest name the label is empty, and the panel falls back to the class', () => {
  // Inventing a description would be worse than showing the truth.
  for (const raw of ['isolate', 'antialiased', 'mix-blend-multiply', 'will-change-transform']) {
    assert.equal(utilityLabel(tokenOf(raw, raw)).property, undefined, raw);
  }
  // An unknown variant is shown as itself rather than dropped — as a raw word, with no id.
  const unknown = utilityLabel(tokenOf('supports-grid:p-4', 'supports-grid:p-4'));
  assert.equal(unknown.property, 'prop.padding');
  assert.deepEqual(unknown.variants, [{ raw: 'supports-grid' }]);
});

// --- Entrance ---

test('the entrance screen is reachable from the root and says what it does NOT do yet', () => {
  const root = animationScreen('root');
  assert.deepEqual(root.rows.map((row) => row.title),
    ['anim.root.entrance', 'anim.group.continuous', 'anim.root.hover']);
  assert.equal(root.rows[0].more, 'entrance');
  assert.equal(root.rows[0].mode, 'groups', 'one chip per effect; the intensities live in the full screen');
  assert.deepEqual(
    root.rows[0].groups?.map((group) => group.rootLabel),
    ['anim.root.fade', 'anim.root.slideY', 'anim.root.slideX', 'anim.root.zoom'],
  );

  const entrance = animationScreen('entrance');
  assert.equal(entrance.back, 'root');
  assert.deepEqual(entrance.rows.map((row) => row.title), [
    'anim.group.entFade', 'anim.group.entSlideY', 'anim.group.entSlideX', 'anim.group.entZoom',
    'anim.group.duration', 'anim.group.delay', 'panel.cascadeTitle',
  ]);
  assert.equal(entrance.rows.at(-1)?.cascade, true);
  assert.equal(entrance.note, 'anim.screen.entranceNote');
});

test('an entrance writes the permanent state AND the first frame, plus a transition', () => {
  const literal = applyAnimationOption('p-4', 'fadeIn');
  // Without `transition` there is nothing to interpolate and the entrance is invisible.
  assert.equal(literal, 'p-4 opacity-100 starting:opacity-0 transition');
  assert.deepEqual(activeAnimations(literal), ['fadeIn']);

  // Effects on different axes stack; `transition` is not added twice.
  const both = applyAnimationOption(literal, 'yUp4');
  assert.equal(both, 'p-4 opacity-100 starting:opacity-0 transition translate-y-0 starting:translate-y-4');
  assert.deepEqual(activeAnimations(both).sort(), ['fadeIn', 'yUp4']);
  assert.equal(both.split(' ').filter((cls) => cls === 'transition').length, 1);
});

test('the vertical entrance is one exclusive group: coming from above replaces coming from below', () => {
  const up = applyAnimationOption('p-4', 'yUp4');
  const down = applyAnimationOption(up, 'yDown4');
  assert.deepEqual(activeAnimations(down), ['yDown4'], 'two translate-y entrances would fight');
  assert.equal(down.includes('starting:translate-y-4'), false);
  assert.equal(down.includes('starting:-translate-y-4'), true);

  // And a horizontal one lives alongside it: different axis, no conflict.
  const sideways = applyAnimationOption(down, 'xLeft4');
  assert.deepEqual(activeAnimations(sideways).sort(), ['xLeft4', 'yDown4']);
});

test('clicking the active entrance chip removes both of its classes', () => {
  const on = applyAnimationOption('p-4', 'zoom95');
  assert.equal(on, 'p-4 scale-100 starting:scale-95 transition');
  const off = applyAnimationOption(on, 'zoom95');
  // `transition` stays: it may have been the user's own (same rule as the hover effects).
  assert.equal(off, 'p-4 transition');
});

test('the motion guard wraps the first frame, not the permanent state', () => {
  const guarded = applyAnimationState(applyAnimationOption('p-4', 'yUp4'), 'motionSafe', 'true');
  // `translate-y-0` guarded would be pointless — its absence already means "just sit still".
  assert.equal(guarded, 'p-4 translate-y-0 motion-safe:starting:translate-y-4 transition');
  assert.equal(readAnimationState(guarded).motionSafe, true);
  assert.deepEqual(activeAnimations(guarded), ['yUp4'], 'the guard does not hide what is on');
});

// --- Cascade ---

test('a cascade staggers the children from the CONTAINER, with the container effects', () => {
  const container = applyAnimationOption('grid gap-6', 'fadeIn');
  const { literal, applied, dropped } = applyCascade(container, 150, 3);

  assert.equal(applied, 3);
  assert.equal(dropped, 0);
  // The children get the transition, the container's own effect, and one delay each after the first.
  assert.equal(literal.includes('[&>*]:transition'), true);
  assert.equal(literal.includes('[&>*]:opacity-100'), true);
  assert.equal(literal.includes('[&>*]:starting:opacity-0'), true);
  assert.equal(literal.includes('[&>*:nth-child(2)]:delay-[150ms]'), true);
  assert.equal(literal.includes('[&>*:nth-child(3)]:delay-[300ms]'), true);
  assert.equal(literal.includes('[&>*:nth-child(1)]'), false, 'the first child does not wait');

  assert.deepEqual(readCascade(literal), { step: 150, children: 3 });
});

test('with no effect on the container the children get fade + subir', () => {
  const { literal } = applyCascade('grid gap-6', 200, 2);
  assert.equal(literal.includes('[&>*]:starting:opacity-0'), true);
  assert.equal(literal.includes('[&>*]:starting:translate-y-4'), true);
  assert.equal(literal.includes('[&>*:nth-child(2)]:delay-[200ms]'), true);
});

test('the child-scoped classes are NOT read as the container own animation', () => {
  // `[&>*]:starting:opacity-0` means the CHILDREN fade. Lighting the container's chip for it would be
  // a lie, and removing that chip would silently break the cascade.
  const { literal } = applyCascade('grid gap-6', 150, 3);
  assert.deepEqual(activeAnimations(literal), []);
  assert.deepEqual(activeAnimationGroups(literal), []);
});

test('the cascade cap is applied and REPORTED, never a silent truncation', () => {
  const { literal, applied, dropped } = applyCascade('grid', 100, 20);
  assert.equal(applied, CASCADE_MAX_CHILDREN);
  assert.equal(dropped, 20 - CASCADE_MAX_CHILDREN);
  assert.equal(literal.includes(`[&>*:nth-child(${CASCADE_MAX_CHILDREN})]:delay-[${(CASCADE_MAX_CHILDREN - 1) * 100}ms]`), true);
  assert.equal(literal.includes(`[&>*:nth-child(${CASCADE_MAX_CHILDREN + 1})]`), false);
});

test('removing the cascade takes only what the cascade wrote', () => {
  const container = applyAnimationOption('grid gap-6 p-4', 'fadeIn');
  const { literal } = applyCascade(container, 150, 4);
  const back = removeCascade(literal);
  assert.equal(back, container, 'the container keeps its own classes and its own entrance');
  assert.deepEqual(readCascade(back), { step: null, children: 0 });
});

test('changing the step rewrites the cascade instead of stacking a second one', () => {
  const first = applyCascade('grid', 100, 4).literal;
  const second = applyCascade(first, 200, 4).literal;
  assert.deepEqual(readCascade(second), { step: 200, children: 4 });
  assert.equal(second.includes('delay-[100ms]'), false);
  assert.equal(second.split(' ').filter((cls) => cls.includes('nth-child')).length, 3);
});

test('the motion guard reaches the children of a cascade', () => {
  const { literal } = applyCascade('grid', 150, 3);
  const guarded = applyAnimationState(literal, 'motionSafe', 'true');
  // Guarding the container and leaving the children unguarded would be the worst of both.
  assert.equal(guarded.includes('[&>*]:motion-safe:starting:opacity-0'), true);
  assert.equal(guarded.includes('[&>*]:opacity-100'), true, 'the permanent state is not guarded');
  assert.equal(readAnimationState(guarded).motionSafe, true);
});

// --- Custom values ---

test('every numeric group accepts a typed value, and only those', () => {
  const withCustom = ANIMATION_GROUPS.filter((group) => group.custom).map((group) => group.id);
  assert.deepEqual(withCustom.sort(), [
    'bright', 'delay', 'duration', 'entFade', 'entSlideX', 'entSlideY', 'entZoom',
    'fade', 'lift', 'repeat', 'rotate', 'scale', 'speed',
  ].sort());
  // A keyframe or an easing curve is not a number: there is nothing to type there.
  for (const id of ['continuous', 'easing', 'scope', 'shadow', 'pause']) {
    assert.equal(ANIMATION_GROUPS.find((group) => group.id === id)?.custom, undefined, id);
  }
  for (const group of ANIMATION_GROUPS) {
    if (!group.custom) continue;
    assert.ok(group.custom.min < group.custom.max, group.id);
    assert.ok(group.custom.templates.some((template) => template.includes('{v}')), group.id);
    assert.match(group.custom.hint, /^custom\.\w+$/u, group.id);
  }
});

test('a typed value replaces the curated one of the same group', () => {
  const fixed = applyAnimationOption('p-4', 'd300');
  assert.equal(fixed, 'p-4 duration-300');

  const custom = applyAnimationCustom(fixed, 'duration', 850);
  assert.equal(custom?.literal, 'p-4 duration-[850ms]');
  assert.equal(custom?.value, 850);
  assert.equal(readAnimationCustom(custom?.literal ?? '', 'duration'), 850);
  assert.deepEqual(activeAnimations(custom?.literal ?? ''), [], 'no curated chip is active any more');

  // And a curated chip replaces the typed value back.
  const back = applyAnimationOption(custom?.literal ?? '', 'd300');
  assert.equal(back, 'p-4 duration-300');
  assert.equal(readAnimationCustom(back, 'duration'), null);
});

test('an out-of-range value is clamped, and the applied value is reported', () => {
  const tooBig = applyAnimationCustom('p-4', 'duration', 999999);
  assert.equal(tooBig?.value, 10000);
  assert.equal(tooBig?.literal.includes('duration-[10000ms]'), true);

  const tooSmall = applyAnimationCustom('p-4', 'speed', 1);
  assert.equal(tooSmall?.value, 100, 'an animation of 1ms is not an animation');

  assert.equal(applyAnimationCustom('p-4', 'duration', Number.NaN), null);
  assert.equal(applyAnimationCustom('p-4', 'nope', 100), null);
});

test('a typed entrance writes the permanent state, the first frame and the transition', () => {
  const custom = applyAnimationCustom('p-4', 'entSlideY', 22);
  assert.equal(custom?.literal, 'p-4 translate-y-0 starting:translate-y-[22px] transition');
  assert.equal(readAnimationCustom(custom?.literal ?? '', 'entSlideY'), 22);
});

test('the typed distance follows the DIRECTION already chosen', () => {
  // Coming from above is `-translate-y`: typing 30 must not silently flip it downwards.
  const fromAbove = applyAnimationOption('p-4', 'yDown4');
  const custom = applyAnimationCustom(fromAbove, 'entSlideY', 30);
  assert.equal(custom?.literal.includes('starting:-translate-y-[30px]'), true);
  assert.equal(custom?.literal.includes('starting:translate-y-[30px]'), false);

  // With nothing chosen, the group's default direction is used (de baixo).
  const fresh = applyAnimationCustom('p-4', 'entSlideY', 30);
  assert.equal(fresh?.literal.includes('starting:translate-y-[30px]'), true);
});

test('two groups sharing a base do not read each other value', () => {
  // `starting:scale-[87%]` is the entrance; `hover:scale-[103%]` is the hover effect. Same base.
  const entrance = applyAnimationCustom('p-4', 'entZoom', 87)?.literal ?? '';
  const both = applyAnimationCustom(entrance, 'scale', 103)?.literal ?? '';

  assert.equal(readAnimationCustom(both, 'entZoom'), 87);
  assert.equal(readAnimationCustom(both, 'scale'), 103);
  assert.equal(both.includes('starting:scale-[87%]'), true);
  assert.equal(both.includes('hover:scale-[103%]'), true);
});

test('the typed value carries the variants the state asks for', () => {
  const guarded = applyAnimationCustom('p-4', 'entFade', 20, {
    motionSafe: true, animationTrigger: 'always', hoverTrigger: 'hover',
  });
  assert.equal(guarded?.literal, 'p-4 opacity-100 motion-safe:starting:opacity-[20%] transition');
  assert.equal(readAnimationCustom(guarded?.literal ?? '', 'entFade'), 20, 'read through the guard');

  const onFocus = applyAnimationCustom('p-4', 'lift', 3, {
    motionSafe: false, animationTrigger: 'always', hoverTrigger: 'focus',
  });
  assert.equal(onFocus?.literal.includes('focus:-translate-y-[3px]'), true);
});

test('clearing a typed value takes the permanent state with it', () => {
  const custom = applyAnimationCustom('p-4', 'entZoom', 87)?.literal ?? '';
  assert.equal(custom, 'p-4 scale-100 starting:scale-[87%] transition');
  const cleared = removeAnimationCustom(custom, 'entZoom');
  // `scale-100` alone would be a leftover nobody asked for; `transition` stays (it may be the user's).
  assert.equal(cleared, 'p-4 transition');
  assert.equal(readAnimationCustom(cleared, 'entZoom'), null);
});

test('the cascade of a container is not mistaken for a typed value of its own', () => {
  const { literal } = applyCascade('grid', 150, 3);
  for (const group of ANIMATION_GROUPS) {
    if (!group.custom) continue;
    assert.equal(readAnimationCustom(literal, group.id), null, group.id);
  }
});

// --- Colour of a role ---

test('a token value that IS a colour comes back as one', () => {
  for (const value of ['#ffffff', '#0f172a', '#fff', '#000f', 'rgb(15, 23, 42)', 'rgb(255 255 255 / 0.9)',
    'oklch(0.7 0.1 200)', 'hsl(210 40% 96%)', 'white', 'transparent']) {
    assert.equal(colorOf(value), value, value);
  }
});

test('what is NOT a colour comes back null', () => {
  // A design system also carries durations, sizes and font stacks — and that null is what keeps them
  // out of a COLOUR picker, before it is what keeps a swatch from lying.
  for (const value of ['0.3s', '0.25rem', '16px', 'Inter, sans-serif', '600', '', '   ', '#zzz', '#12345',
    'calc(var(--font-base-unit) * 4)']) {
    assert.equal(colorOf(value), null, JSON.stringify(value));
  }
});

test('the role of an option is readable back, with and without the -- prefix', () => {
  assert.equal(roleVar('bg-[var(--surface-subtle,#f8fafc)]'), '--surface-subtle');
  assert.equal(roleLabel('bg-[var(--surface-subtle,#f8fafc)]'), 'surface-subtle');
  assert.equal(roleVar('dark:text-[var(--text-muted)]'), '--text-muted');
  assert.equal(roleVar('p-4'), '', 'not a role at all');
  assert.equal(roleLabel('p-4'), 'p-4', 'and then the label is the class itself');
});

test('only roles that ARE colours are offered as colours', () => {
  // Measured on the real 102046 design system: the families with no name rule (`fill`, `from`, …) fell
  // back to every role and offered `fill-[var(--font-size-16)]` — nonsense wearing a valid class shape.
  const roles = ['--surface-bg', '--font-size-16', '--font-family-primary', '--transition-fast', '--page-bg'];
  const resolve = (cssVar: string) => ({
    '--surface-bg': '#ffffff',
    '--font-size-16': 'calc(var(--font-base-unit) * 4)',
    '--font-family-primary': '"Playwrite BR Guides", cursive',
    '--transition-fast': '0.5s',
    '--page-bg': '#eef1f5',
  } as Record<string, string>)[cssVar] ?? '';

  const options = roleOptions(tokenOf('fill-[var(--page-bg,#eef1f5)]', 'fill-[var(--page-bg,#eef1f5)]'), roles, resolve);
  assert.deepEqual(options, ['fill-[var(--page-bg,#eef1f5)]', 'fill-[var(--surface-bg,#ffffff)]']);

  // With no resolver there is no way to tell, so nothing is dropped — guessing would hide real roles.
  const blind = roleOptions(tokenOf('fill-[var(--page-bg,#eef1f5)]', 'fill-[var(--page-bg,#eef1f5)]'), roles);
  assert.equal(blind.length, roles.length);
});

test('the classes tab knows every class the animations tab can write', () => {
  // A class the picker itself produced coming back as "sem opções prontas" is the worst version of
  // having no vocabulary — and it is exactly what happened with `translate-x-0`, `transition`,
  // `duration-*` and the typed `starting:-translate-x-[400px]`.
  const written = new Set<string>();
  const STATE: IAnimationState = { motionSafe: false, animationTrigger: 'always', hoverTrigger: 'hover' };

  for (const group of ANIMATION_GROUPS) {
    for (const option of group.options) {
      for (const token of splitUtilities(applyAnimationOption('', option.id, STATE))) written.add(token.raw);
    }
    if (!group.custom) continue;
    const typed = applyAnimationCustom('', group.id, Math.round((group.custom.min + group.custom.max) / 2), STATE);
    for (const token of splitUtilities(typed?.literal ?? '')) written.add(token.raw);
  }
  for (const token of splitUtilities(applyCascade('', 150, 3, STATE).literal)) written.add(token.raw);

  const orphans: string[] = [];
  for (const cls of written) {
    // The cascade writes into the CHILDREN (`[&>*]:…`); those are the container's markup, not a row of
    // its own, and the panel never offers them as the element's own classes.
    if (cls.startsWith('[&>')) continue;
    const token = splitUtilities(cls)[0];
    const options = utilityOptions(token);
    if (options.kind === 'none' || !options.options.includes(cls)) orphans.push(cls);
  }

  assert.deepEqual(orphans, [], 'every class the animations tab writes must be editable in the classes tab');
});

test('a typed value is a current value, not a dead end', () => {
  const typed = utilityOptions(tokenOf('starting:-translate-x-[400px]', 'starting:-translate-x-[400px]'));
  assert.equal(typed.kind, 'scale');
  assert.equal(typed.options[0], 'starting:-translate-x-[400px]', 'the current value leads');
  assert.ok(typed.options.includes('starting:-translate-x-4'), 'and the family is the way back');

  const spacing = utilityOptions(tokenOf('p-[13px]', 'p-[13px]'));
  assert.equal(spacing.options[0], 'p-[13px]');
  assert.ok(spacing.options.includes('p-3'));

  // An arbitrary value of a family with no vocabulary at all is still a dead end, honestly reported.
  const unknown = utilityOptions(tokenOf('mask-[url(x.svg)]', 'mask-[url(x.svg)]'));
  assert.equal(unknown.kind, 'none');
  assert.deepEqual(unknown.reason, NO_OPTIONS);
});

test('the motion families answer like any other', () => {
  assert.deepEqual(utilityOptions(tokenOf('transition', 'transition')).options,
    ['transition', 'transition-all', 'transition-colors', 'transition-opacity', 'transition-shadow', 'transition-transform', 'transition-none']);
  assert.deepEqual(utilityOptions(tokenOf('ease-out', 'ease-out')).options,
    ['ease-linear', 'ease-in', 'ease-out', 'ease-in-out', 'ease-initial']);
  assert.equal(utilityOptions(tokenOf('translate-x-0', 'translate-x-0')).kind, 'scale');
  assert.ok(utilityOptions(tokenOf('duration-500', 'duration-500')).options.includes('duration-300'));
  assert.ok(utilityOptions(tokenOf('delay-450', 'delay-450')).options.includes('delay-450'), 'a step off the list is kept');
  assert.ok(utilityOptions(tokenOf('scale-105', 'scale-105')).options.includes('scale-110'));
  assert.ok(utilityOptions(tokenOf('rotate-3', 'rotate-3')).options.includes('rotate-6'));
});

// --- Copying a style from one element onto another ---

/** Two literals shaped like the generator's real output. */
const SOURCE_BUTTON = 'inline-flex items-center gap-2 rounded-md bg-[var(--button-primary-bg,#2563eb)]'
  + ' px-4 py-2 text-sm font-semibold text-[var(--button-primary-text,#ffffff)] shadow-sm';
const TARGET_BUTTON = 'rounded border border-[var(--border-default,#e2e8f0)] px-3 py-1 text-xs italic w-full';

test('pasting with nothing held back makes the target IDENTICAL to the source', () => {
  // The decision, in one assertion: the result IS the source's literal. Anything else is "parecido".
  assert.equal(pasteStyle(TARGET_BUTTON, SOURCE_BUTTON), SOURCE_BUTTON);

  // Which means the replace also REMOVES what the target had and the source has not.
  const diff = diffLiterals(TARGET_BUTTON, pasteStyle(TARGET_BUTTON, SOURCE_BUTTON));
  assert.ok(diff.removed.includes('italic'), 'a merge would have left the target italic');
  assert.ok(diff.removed.includes('w-full'));
  assert.ok(diff.added.includes('shadow-sm'));
});

test('what the user asks to keep survives, and beats the source for the same property', () => {
  const kept = pasteStyle(TARGET_BUTTON, SOURCE_BUTTON, ['w-full', 'px-3']);
  const classes = splitUtilities(kept).map((token) => token.raw);

  assert.ok(classes.includes('w-full'), 'the target keeps its width');
  assert.ok(classes.includes('px-3'), 'and its own horizontal padding');
  assert.equal(classes.includes('px-4'), false, "the source's px-4 gave way to it");
  // Everything not held back still came.
  assert.ok(classes.includes('shadow-sm'));
  assert.ok(classes.includes('bg-[var(--button-primary-bg,#2563eb)]'));
  assert.equal(classes.includes('italic'), false, 'keeping one class is not keeping everything');
});

test('the source can be told to leave something behind — the container case', () => {
  // `keep` alone cannot express this: a `max-w-6xl` coming from a container has nothing to collide
  // with on a target that has no width at all.
  const source = 'max-w-6xl mx-auto rounded-lg bg-white p-6 shadow';
  const pasted = pasteStyle('rounded p-2', source, [], ['max-w-6xl']);
  const classes = splitUtilities(pasted).map((token) => token.raw);

  assert.equal(classes.includes('max-w-6xl'), false);
  assert.ok(classes.includes('shadow'));
  assert.ok(classes.includes('p-6'), 'the source still decides the padding');
});

test('a variant is a layer of its own: it travels whole and does not collide with the base', () => {
  const source = 'p-2 md:p-8 hover:bg-blue-700';
  const pasted = pasteStyle('p-3 md:p-4', source, ['p-3']);
  const classes = splitUtilities(pasted).map((token) => token.raw);

  assert.ok(classes.includes('md:p-8'), 'the responsive layer arrives as written');
  assert.ok(classes.includes('hover:bg-blue-700'));
  assert.ok(classes.includes('p-3'), 'the kept base value wins over the base of the source');
  assert.equal(classes.includes('p-2'), false);
  // The kept BASE padding must not delete the source's `md:` padding — different layers.
  assert.equal(classes.filter((cls) => cls.endsWith('p-8')).length, 1);
});

test('no property is written twice by a paste', () => {
  const literal = pasteStyle('p-3 w-full text-xs', SOURCE_BUTTON, ['p-3', 'w-full', 'text-xs']);
  const seen = new Map<string, string>();
  for (const token of splitUtilities(literal)) {
    const label = utilityLabel(token);
    if (!label.property) continue;
    const key = `${token.variants.join(':')}|${label.property}`;
    assert.equal(seen.has(key), false, `${key} written twice: ${seen.get(key)} and ${token.raw}`);
    seen.set(key, token.raw);
  }
});

test('a class is filed by what it is FOR', () => {
  const groups = styleCategories(
    'w-full absolute top-0 z-10 col-span-2 p-4 gap-2 rounded-md bg-white text-sm shadow'
    + ' animate-pulse duration-300 flex grid-cols-2 items-center cursor-pointer',
  );

  assert.deepEqual(groups.place, ['w-full', 'absolute', 'top-0', 'z-10', 'col-span-2']);
  assert.deepEqual(groups.spacing, ['p-4', 'gap-2']);
  assert.deepEqual(groups.appearance, ['rounded-md', 'bg-white', 'text-sm', 'shadow']);
  assert.deepEqual(groups.animation, ['animate-pulse', 'duration-300']);
  // The internal layout of a container is how it arranges its CHILDREN — part of the look being
  // copied, not of where the element sits. Keeping "my position" must not also keep "your columns".
  assert.deepEqual(groups.other, ['flex', 'grid-cols-2', 'items-center', 'cursor-pointer']);
});

test('an entrance and its cascade are motion, wherever they are written', () => {
  const groups = styleCategories('starting:opacity-0 starting:-translate-y-4 [&>*:nth-child(2)]:delay-150 opacity-100');
  assert.deepEqual(groups.animation, ['starting:opacity-0', 'starting:-translate-y-4', '[&>*:nth-child(2)]:delay-150']);
  assert.deepEqual(groups.appearance, ['opacity-100']);
});

test('“only the looks” brings colour and border and leaves size, spacing and layout alone', () => {
  const target = 'flex w-full p-2 rounded border border-gray-200 text-xs';
  const looks = pasteCategories(target, SOURCE_BUTTON, ['appearance']);
  const classes = splitUtilities(looks).map((token) => token.raw);

  assert.ok(classes.includes('bg-[var(--button-primary-bg,#2563eb)]'), 'the colour came');
  assert.ok(classes.includes('rounded-md'), 'and replaced the target rounding');
  assert.ok(classes.includes('font-semibold'));
  assert.equal(classes.includes('rounded'), false);
  assert.ok(classes.includes('w-full'), 'the place stayed');
  assert.ok(classes.includes('p-2'), 'the spacing stayed');
  assert.ok(classes.includes('flex'), 'and so did the layout');
  assert.equal(classes.includes('px-4'), false, 'the source spacing did not travel');
  assert.equal(classes.includes('items-center'), false);
});

test('keeping the place is the same primitive, spelled as categories', () => {
  const target = 'w-full max-w-sm p-2 text-xs';
  const source = 'max-w-6xl p-6 text-lg bg-white';
  const byCategory = pasteCategories(target, source, ['appearance', 'spacing', 'animation', 'other']);
  const byHand = pasteStyle(target, source, ['w-full', 'max-w-sm'], ['max-w-6xl']);

  assert.equal(splitUtilities(byCategory).map((t) => t.raw).sort().join(' '),
    splitUtilities(byHand).map((t) => t.raw).sort().join(' '));
  const classes = splitUtilities(byCategory).map((token) => token.raw);
  assert.ok(classes.includes('w-full') && classes.includes('max-w-sm'), 'the element stays where it is');
  assert.equal(classes.includes('max-w-6xl'), false, "and does not inherit the container's width");
  assert.ok(classes.includes('p-6') && classes.includes('text-lg') && classes.includes('bg-white'));
});

test('every category travels when all of them are asked for', () => {
  assert.equal(pasteCategories(TARGET_BUTTON, SOURCE_BUTTON, STYLE_CATEGORIES), SOURCE_BUTTON);
});

test('the summary reads both directions, and says nothing when there is nothing to say', () => {
  const diff = diffLiterals('p-2 text-xs italic', 'p-4 text-xs');
  assert.deepEqual(diff.added, ['p-4']);
  assert.deepEqual(diff.removed, ['p-2', 'italic']);
  assert.deepEqual(diffLiterals('p-2 text-xs', 'p-2 text-xs'), { added: [], removed: [] });
});

test('an empty side is not a crash', () => {
  assert.equal(pasteStyle('', SOURCE_BUTTON), SOURCE_BUTTON);
  assert.equal(pasteStyle(TARGET_BUTTON, ''), '');
  assert.equal(pasteStyle(TARGET_BUTTON, '', ['w-full']), 'w-full', 'what is kept is still kept');
  assert.deepEqual(styleCategories('').place, []);
});

test('an unknown class is its own identity — two of them coexist, the same one never doubles', () => {
  // No property label, so the fallback key is the class itself.
  const pasted = pasteStyle('isolate mix-blend-multiply', 'isolate p-4', ['mix-blend-multiply', 'isolate']);
  const classes = splitUtilities(pasted).map((token) => token.raw);
  assert.deepEqual(classes.filter((cls) => cls === 'isolate'), ['isolate'], 'not written twice');
  assert.ok(classes.includes('mix-blend-multiply'));
  assert.ok(classes.includes('p-4'));
});

test('a family whose value means two unrelated things gets two names', () => {
  // Found by pasting every real button onto every other one: `ring-1` and `ring-[var(--…)]` were both
  // called "focus ring", so holding one back deleted the other. 8 elements in the 102046 pages carry
  // the pair, and 9 carry the `divide-y` + `divide-[…]` one.
  const label = (cls: string) => utilityLabel(tokenOf(cls, cls)).property;

  assert.equal(label('ring-1'), 'prop.ringWidth');
  assert.equal(label('ring'), 'prop.ringWidth', 'a bare ring is a 1px ring');
  assert.equal(label('ring-[var(--button-secondary-border,#cbd5e1)]'), 'prop.ringColor');
  assert.equal(label('divide-y'), 'prop.divideAxis');
  assert.equal(label('divide-[var(--border-subtle,#e2e8f0)]'), 'prop.divideColor');

  // And the consequence for the paste: keeping the width does not take the colour with it.
  const kept = pasteStyle('ring-1 ring-[var(--a,#111111)]', 'ring-2 ring-[var(--b,#222222)]', ['ring-1']);
  const classes = splitUtilities(kept).map((token) => token.raw);
  assert.ok(classes.includes('ring-1'));
  assert.ok(classes.includes('ring-[var(--b,#222222)]'), 'the colour still came from the source');
  assert.equal(classes.includes('ring-2'), false);
});

test('an arbitrary value that is a LENGTH is a size, not a colour', () => {
  // The generator writes every colour as `[var(--role,#hex)]` — and sizes in the very same shape.
  const label = (cls: string) => utilityLabel(tokenOf(cls, cls)).property;

  assert.equal(label('text-[var(--font-size-24,1.5rem)]'), 'prop.textSize');
  assert.equal(label('text-[var(--text-strong,#0f172a)]'), 'prop.textColor');
  assert.equal(label('text-[13px]'), 'prop.textSize');
  assert.equal(label('border-[var(--border-default,#e2e8f0)]'), 'prop.borderColor');

  // Which is what lets both live on the same element without one deleting the other.
  const both = 'text-[var(--font-size-24,1.5rem)] text-[var(--text-strong,#0f172a)]';
  assert.equal(pasteStyle('text-sm', both), both);
  const kept = pasteStyle(both, 'text-lg text-[var(--text-muted,#64748b)]', ['text-[var(--font-size-24,1.5rem)]']);
  const classes = splitUtilities(kept).map((token) => token.raw);
  assert.ok(classes.includes('text-[var(--font-size-24,1.5rem)]'), 'the kept size survived');
  assert.ok(classes.includes('text-[var(--text-muted,#64748b)]'), 'and the colour came from the source');
  assert.equal(classes.includes('text-lg'), false, 'the source size gave way to the kept one');
});

// --- The "+": adding a property the element does not have ---

const ANY = { childCount: 0 };

/** The property ids the "+" offers for a literal. */
function offered(literal: string, context = ANY): string[] {
  return addableProperties(literal, context).map((entry) => entry.property);
}

test('the "+" never offers what the element already has', () => {
  const literal = 'flex p-2 text-sm rounded-md bg-[var(--surface-bg,#ffffff)] shadow-sm';
  const list = offered(literal);

  for (const already of ['prop.padding', 'prop.textSize', 'prop.radius', 'prop.bgColor', 'prop.shadow']) {
    assert.equal(list.includes(already), false, already);
  }
  // And it does offer what is missing.
  assert.ok(list.includes('prop.marginTop'));
  assert.ok(list.includes('prop.textColor'));
});

test('a variant is not the property: `md:p-6` still lets padding be added', () => {
  // `md:p-6` gives the element padding from md up, not at every width — and writing variants is the
  // layer task, not this one. Counting it as "already has padding" would leave no way to set the base.
  assert.ok(offered('md:p-6 text-sm').includes('prop.padding'));
});

test('gap, justify and items are only offered inside a flex or a grid', () => {
  // Measured on the 102046 pages: 399/399 gaps, 133/133 justifies and 136/136 items sit on an element
  // that is flex or grid in its own classes. The pages never get this wrong; the picker must not be
  // the one to introduce it.
  const plain = offered('p-2 text-sm');
  for (const contextual of ['prop.gap', 'prop.justify', 'prop.items']) {
    assert.equal(plain.includes(contextual), false, contextual);
  }

  const flex = offered('flex p-2');
  assert.ok(flex.includes('prop.gap'));
  assert.ok(flex.includes('prop.justify'));
  assert.ok(flex.includes('prop.items'));
  assert.ok(offered('inline-grid p-2').includes('prop.gap'));
});

test('grid columns need a grid, and spacing between children needs children', () => {
  assert.equal(offered('flex p-2').includes('prop.gridCols'), false, 'a flex has no columns');
  assert.ok(offered('grid p-2').includes('prop.gridCols'));

  // `space-y` is the one that is NOT about flex: 0 of its 408 uses in the real pages sit on a
  // flex/grid element — it is how a plain container spaces its children.
  assert.equal(offered('p-2', { childCount: 0 }).includes('prop.spaceY'), false);
  assert.equal(offered('p-2', { childCount: 1 }).includes('prop.spaceY'), false, 'one child has no gaps');
  assert.ok(offered('p-2', { childCount: 3 }).includes('prop.spaceY'));
});

test('the "+" does not create an axis overlap, in either direction', () => {
  // `p-4` on an element that already has `px-3 py-2`: measured 0 occurrences in the real pages.
  assert.equal(offered('px-3 py-2').includes('prop.padding'), false);
  const whole = offered('p-2');
  assert.equal(whole.includes('prop.paddingX'), false);
  assert.equal(whole.includes('prop.paddingY'), false);
  // The same rule for the other three pairs.
  assert.equal(offered('mt-1').includes('prop.margin' as string), false);
  assert.equal(offered('flex gap-x-2').includes('prop.gap'), false);
  assert.equal(offered('rounded-t-md').includes('prop.radius'), false);
});

test('a property is born with the value the project uses most — and colour is not born at all', () => {
  const seeds = new Map(addableProperties('span', ANY).map((entry) => [entry.property, entry.seed]));

  assert.equal(seeds.get('prop.borderWidth'), 'border', '100% of the border widths in the pages');
  assert.equal(seeds.get('prop.width'), 'w-full', '98%');
  assert.equal(seeds.get('prop.textSize'), 'text-sm', '62%');
  assert.equal(seeds.get('prop.padding'), 'p-2', '44%');

  // The two colours sit at 23% and 38% over ~34 distinct values: there is no default to find, so the
  // palette opens instead of a guess being written into the client's file.
  for (const colour of ['prop.bgColor', 'prop.textColor', 'prop.borderColor']) {
    assert.equal(seeds.get(colour), null, colour);
    assert.ok(addableProperty(colour)?.family, 'and it says which palette to open');
  }
});

test('everything the "+" offers can still be edited after it is created', () => {
  // A property the picker cannot edit once written leaves a dead row behind — worse than not offering.
  for (const entry of addableProperties('span', { childCount: 4 })) {
    if (!entry.seed) {
      assert.ok(['bg', 'text', 'border'].includes(entry.family ?? ''), entry.property);
      continue;
    }
    const token = splitUtilities(entry.seed)[0];
    assert.notEqual(utilityOptions(token).kind, 'none', `${entry.seed} would be a dead row`);
    assert.equal(utilityLabel(token).property, entry.property, `${entry.seed} must read as ${entry.property}`);
  }
});

test('emptying an element takes the whole class attribute with it', () => {
  // The last class CAN go now that an element is anchored by its position in the template. What must
  // not stay behind is `class=""`: the `insert` anchor only matches a tag with no class attribute at
  // all, so an empty one would leave the element unreachable by the panel that emptied it.
  const source = 'class X { render() { return html`<div class="p-2">a</div>`; } }';
  const element = scanTemplateElements(source)[0];
  const span = classAttrSpan(source, element.literalStart, element.literalEnd);
  assert.ok(span);
  assert.equal(source.slice(span.start, span.end), ' class="p-2"', 'the space before it goes too');

  const emptied = source.slice(0, span.start) + source.slice(span.end);
  assert.match(emptied, /<div>a<\/div>/u);
  const after = scanTemplateElements(emptied)[0];
  assert.equal(after.literal, null, 'and the tag is back to having no class');
  assert.equal(after.classComputed, false);

  // Anything that is not the attribute this expects is left alone.
  assert.equal(classAttrSpan('const x = "p-2";', 12, 15), null);
});

test('a typed value is offered only where typing a number means something', () => {
  const spec = (cls: string) => {
    const token = tokenOf(cls, cls);
    return typedValueSpec(token, utilityOptions(token).kind);
  };

  assert.deepEqual(spec('p-3'), { unit: 'px', min: 0, max: 200 });
  assert.deepEqual(spec('w-24'), { unit: 'px', min: 0, max: 2000 });
  assert.deepEqual(spec('text-sm'), { unit: 'px', min: 8, max: 96 });
  // Same family, other meaning: a colour has nothing to type into.
  assert.equal(spec('text-[var(--text-muted,#64748b)]'), null);
  // A list is not a scale.
  assert.equal(spec('justify-between'), null);
  assert.equal(spec('block'), null);
  assert.equal(spec('shadow-sm'), null);
});

test('a typed value is written, read back and clamped to its range', () => {
  // The token has to come from the literal being edited: it carries the POSITION, which is what keeps
  // a literal with the same class twice unambiguous.
  const literal = 'flex p-3 text-sm';
  const token = tokenOf(literal, 'p-3');
  const spec = typedValueSpec(token, utilityOptions(token).kind);
  assert.ok(spec);

  assert.equal(applyTypedValue(literal, token, 13, spec), 'flex p-[13px] text-sm');
  assert.equal(applyTypedValue(literal, token, 9999, spec), 'flex p-[200px] text-sm');
  assert.equal(applyTypedValue(literal, token, -5, spec), 'flex p-[0px] text-sm');

  assert.equal(readTypedValue(tokenOf('p-[13px]', 'p-[13px]')), 13);
  assert.equal(readTypedValue(tokenOf('p-3', 'p-3')), null, 'a scale step is not a typed value');
  assert.equal(readTypedValue(tokenOf('bg-[var(--x,#fff)]', 'bg-[var(--x,#fff)]')), null);

  // And the typed value stays editable: it leads its own family.
  const options = utilityOptions(tokenOf('p-[13px]', 'p-[13px]'));
  assert.equal(options.options[0], 'p-[13px]');
  assert.ok(options.options.includes('p-3'));
});

test('the typed value keeps the variant and the negative sign of the token it replaces', () => {
  const responsive = tokenOf('md:p-3', 'md:p-3');
  const spec = typedValueSpec(responsive, utilityOptions(responsive).kind);
  assert.ok(spec);
  assert.equal(applyTypedValue('md:p-3', responsive, 13, spec), 'md:p-[13px]');

  const negative = tokenOf('-mt-2', '-mt-2');
  const marginSpec = typedValueSpec(negative, utilityOptions(negative).kind);
  assert.ok(marginSpec);
  assert.equal(applyTypedValue('-mt-2', negative, 8, marginSpec), '-mt-[8px]');
});

test('the palette can open for a family that has no colour yet', () => {
  const roles = ['--surface-bg', '--surface-alt-bg', '--text-muted', '--border-default', '--font-size-16'];
  const resolve = (cssVar: string) => ({
    '--surface-bg': '#ffffff',
    '--surface-alt-bg': '#f8fafc',
    '--text-muted': '#64748b',
    '--border-default': '#e2e8f0',
    '--font-size-16': '1rem',
  }[cssVar] ?? '');

  const backgrounds = newRoleOptions('bg', roles, resolve);
  assert.deepEqual(backgrounds, ['bg-[var(--surface-bg,#ffffff)]', 'bg-[var(--surface-alt-bg,#f8fafc)]']);
  assert.deepEqual(newRoleOptions('text', roles, resolve), ['text-[var(--text-muted,#64748b)]']);
  assert.deepEqual(newRoleOptions('border', roles, resolve), ['border-[var(--border-default,#e2e8f0)]']);

  // A size is not a colour, whatever the family filter lets through.
  assert.equal(newRoleOptions('fill', roles, resolve).includes('fill-[var(--font-size-16,1rem)]'), false);
});

test('the scanner tells "no class" from "class built in code", and says where one would go', () => {
  // The two need opposite answers: an element with no class can receive one, an element whose class
  // is computed already has the attribute and would end up with two.
  const source = [
    `import { html } from 'lit';`,
    `class X {`,
    `  render() {`,
    `    return html\``,
    `      <div>`,
    `        <span class="p-2">a</span>`,
    `        <b class=\${classMap(this.kind)}>c</b>`,
    `      </div>\`;`,
    `  }`,
    `}`,
  ].join('\n');

  const elements = scanTemplateElements(source);
  const of = (tag: string) => elements.find((element) => element.tag === tag);

  const div = of('div');
  assert.ok(div);
  assert.equal(div.literal, null);
  assert.equal(div.classComputed, false, 'it simply has no class');
  assert.equal(source.slice(div.openStart, div.insertAt), '<div', 'the insertion point is past the tag name');

  const span = of('span');
  assert.equal(span?.literal, 'p-2');
  assert.equal(span?.classComputed, false);

  const bound = of('b');
  assert.equal(bound?.literal, null);
  assert.equal(bound?.classComputed, true, 'class=${…} is an attribute that is already there');

  // And the insertion produces valid markup, not a second attribute.
  const written = `${source.slice(0, div.insertAt)} class="p-4"${source.slice(div.insertAt)}`;
  assert.match(written, /<div class="p-4">/u);
  assert.equal(scanTemplateElements(written).find((element) => element.tag === 'div')?.literal, 'p-4');
});

test('the insertion point survives an open tag that already has other attributes', () => {
  const source = [
    `class X {`,
    `  render() {`,
    `    return html\``,
    `      <button type="button" @click=\${() => this.go()} ?disabled=\${this.busy}>ok</button>\`;`,
    `  }`,
    `}`,
  ].join('\n');

  const button = scanTemplateElements(source).find((element) => element.tag === 'button');
  assert.ok(button);
  assert.equal(button.literal, null);
  assert.equal(button.classComputed, false, 'an event binding is not a class');
  const written = `${source.slice(0, button.insertAt)} class="p-4"${source.slice(button.insertAt)}`;
  assert.match(written, /<button class="p-4" type="button"/u);
  assert.equal(scanTemplateElements(written).find((element) => element.tag === 'button')?.literal, 'p-4');
});

// --- Pointing at what the mouse cannot reach ---

interface Box {
  name: string;
  rect: { left: number; top: number; right: number; bottom: number } | null;
  kids?: Box[];
  chrome?: boolean;
}

/** The tree the editor walks, as plain objects: no DOM, and the rule is the same one. */
const TREE: IHitTree<Box> = {
  children: (node) => node.kids ?? [],
  rect: (node) => node.rect,
  skip: (node) => Boolean(node.chrome),
};

const box = (name: string, left: number, top: number, right: number, bottom: number, kids?: Box[]): Box =>
  ({ name, rect: { left, top, right, bottom }, kids });

/** The shape of the bug: a section with a small disabled button inside it. */
const SECTION = box('section', 0, 0, 400, 200, [
  box('h2', 8, 8, 392, 40),
  box('p', 8, 48, 392, 80),
  box('button', 8, 90, 120, 130),
]);

test('the click that lands on the ancestor comes back as the button', () => {
  // The whole point. A disabled button never dispatches, so the event arrives on the section — and
  // selecting the section would be silently wrong.
  assert.equal(deepestAt(SECTION, { x: 60, y: 110 }, TREE).name, 'button');
  assert.equal(deepestAt(SECTION, { x: 200, y: 20 }, TREE).name, 'h2');
  assert.equal(deepestAt(SECTION, { x: 200, y: 160 }, TREE).name, 'section', 'no child there');
});

test('a box with no area is not what the pointer is on', () => {
  // A wrapper of zero height still reports a position. Taking it would select something the user
  // cannot see, let alone click.
  const withEmptyWrapper: Box = {
    name: 'root',
    rect: { left: 0, top: 0, right: 100, bottom: 100 },
    kids: [
      { name: 'collapsed', rect: { left: 0, top: 50, right: 100, bottom: 50 } },
      { name: 'zeroWidth', rect: { left: 50, top: 0, right: 50, bottom: 100 } },
      box('real', 40, 40, 60, 60),
    ],
  };
  assert.equal(deepestAt(withEmptyWrapper, { x: 50, y: 50 }, TREE).name, 'real');
});

test('a node that was never rendered has no box and is skipped', () => {
  const tree: Box = {
    name: 'root',
    rect: { left: 0, top: 0, right: 100, bottom: 100 },
    kids: [{ name: 'ghost', rect: null, kids: [box('inside', 10, 10, 90, 90)] }],
  };
  // The ghost is skipped, and so is everything under it: with no box of its own there is no evidence
  // the pointer is anywhere near its children.
  assert.equal(deepestAt(tree, { x: 50, y: 50 }, TREE).name, 'root');
});

test('between siblings that overlap, the last one wins', () => {
  // They are painted in document order, so the last is the one under the pointer — and the one the
  // user believes they clicked.
  const overlap: Box = {
    name: 'root',
    rect: { left: 0, top: 0, right: 100, bottom: 100 },
    kids: [box('under', 0, 0, 80, 80), box('over', 20, 20, 100, 100)],
  };
  assert.equal(deepestAt(overlap, { x: 50, y: 50 }, TREE).name, 'over');
  assert.equal(deepestAt(overlap, { x: 10, y: 10 }, TREE).name, 'under', 'where only the first is');
});

test("the editor's own chrome is walked past, children and all", () => {
  const withChrome: Box = {
    name: 'root',
    rect: { left: 0, top: 0, right: 100, bottom: 100 },
    kids: [
      { name: 'panel', chrome: true, rect: { left: 0, top: 0, right: 100, bottom: 100 }, kids: [box('chip', 10, 10, 30, 30)] },
      box('appContent', 40, 40, 60, 60),
    ],
  };
  assert.equal(deepestAt(withChrome, { x: 20, y: 20 }, TREE).name, 'root', 'not the chip');
  assert.equal(deepestAt(withChrome, { x: 50, y: 50 }, TREE).name, 'appContent');
});

test('the edges of a box count as inside it', () => {
  // A one-pixel-off rule shows up as "the outline flickers at the border", which is the kind of bug
  // nobody reports precisely.
  assert.equal(deepestAt(SECTION, { x: 8, y: 90 }, TREE).name, 'button', 'top-left corner');
  assert.equal(deepestAt(SECTION, { x: 120, y: 130 }, TREE).name, 'button', 'bottom-right corner');
  assert.equal(containsPoint({ left: 0, top: 0, right: 10, bottom: 10 }, { x: 10, y: 10 }), true);
  assert.equal(containsPoint({ left: 0, top: 0, right: 10, bottom: 10 }, { x: 11, y: 5 }), false);
});

test('depth wins over breadth: the deepest containing node is the answer', () => {
  const deep = box('a', 0, 0, 100, 100, [box('b', 10, 10, 90, 90, [box('c', 20, 20, 80, 80, [box('d', 30, 30, 70, 70)])])]);
  assert.equal(deepestAt(deep, { x: 50, y: 50 }, TREE).name, 'd');
  assert.equal(deepestAt(deep, { x: 25, y: 25 }, TREE).name, 'c');
  assert.equal(deepestAt(deep, { x: 5, y: 5 }, TREE).name, 'a');
});

// --- Siblings that live inside a `${...}` (TASK-102020-anchor-expressions) ---
//
// The two shapes below are the ones that failed in the real `changeOrderCatalogue`, reduced to what
// matters: a section whose same-tag siblings are branches of one ternary.

/** The list section: a static header div, and a ternary between "loading" and the table. */
const CONDITIONAL_LIST = [
  'renderList() {',
  '  return html`<section class="box">',
  '    <div class="head"><h2 class="title">Orders</h2></div>',
  '    ${this.loading',
  '      ? html`<div class="animate-pulse">loading</div>`',
  '      : html`<div class="overflow-x-auto"><table class="min-w-full"><tbody>'
  + '${this.rows.map((row) => html`<tr class="row"><td class="cell">${row.id}</td></tr>`)}'
  + '</tbody></table></div>`}',
  '  </section>`;',
  '}',
].join('\n');

/** The delete section: a static <p> with NO class, and a ternary of <p> for success/error. */
const CONDITIONAL_DELETE = [
  'renderDelete() {',
  '  return html`<section class="box">',
  '    <h2 class="title">Delete</h2>',
  '    <p>Delete this order</p>',
  '    <button class="danger">Delete</button>',
  '    ${this.state === "success"',
  '      ? html`<p class="ok">done</p>`',
  '      : this.state === "error" ? html`<p class="err">failed</p>` : nothing}',
  '  </section>`;',
  '}',
].join('\n');

/** A step as the editor builds it: both pairs, the literal one and the tag one. */
function step(tag: string, literal: string | null, at: { index: number; count: number; literalIndex?: number; literalCount?: number }) {
  return {
    tag,
    index: at.index,
    count: at.count,
    literal,
    literalIndex: at.literalIndex ?? 0,
    literalCount: at.literalCount ?? 1,
  };
}

test('the row of a table under a CONDITIONAL wrapper resolves', () => {
  // The bug was never in the row: it was one level above, in the `<div class="overflow-x-auto">`.
  // Under the section the template has three divs — one static and two branches of the same ternary —
  // while the DOM has two, so the old rule (candidates === dom count, or a single candidate) refused.
  const tree = treeOf(CONDITIONAL_LIST);

  const anchor = resolveStructuralAnchor(tree, [
    step('section', 'box', { index: 0, count: 1 }),
    step('div', 'overflow-x-auto', { index: 1, count: 2 }),
    step('table', 'min-w-full', { index: 0, count: 1 }),
    step('tbody', null, { index: 0, count: 1 }),
    step('tr', 'row', { index: 1, count: 3, literalIndex: 1, literalCount: 3 }),
  ]);

  assert.equal(anchor.ok, true);
  assert.equal(anchor.ok && anchor.element.literal, 'row');
  // One source line behind three rows — the panel has to say so.
  assert.equal(anchor.ok && anchor.renders, 3);
});

test('without the literal in the path, that same row is lost — which is the bug', () => {
  // The fixture reproduces the failure, so the test above is not proving something that always worked.
  const tree = treeOf(CONDITIONAL_LIST);
  const anchor = resolveStructuralAnchor(tree, [
    { tag: 'section', index: 0, count: 1 },
    { tag: 'div', index: 1, count: 2 },
    { tag: 'table', index: 0, count: 1 },
    { tag: 'tbody', index: 0, count: 1 },
    { tag: 'tr', index: 1, count: 3 },
  ]);
  assert.equal(anchor.ok, false);
  assert.deepEqual(anchor.ok === false && anchor.reason, NOT_LOCATED);
});

test('a static element with NO class resolves next to conditional siblings of its tag', () => {
  // The other half of the bug: three <p> in the template (one static, two branches), one in the DOM.
  const tree = treeOf(CONDITIONAL_DELETE);
  const anchor = resolveStructuralAnchor(tree, [
    step('section', 'box', { index: 0, count: 1 }),
    step('p', null, { index: 0, count: 1 }),
  ]);
  assert.equal(anchor.ok, true);
  assert.equal(anchor.ok && anchor.element.literal, null);
  assert.equal(anchor.ok && anchor.element.tag, 'p');
});

test('and the branch that DID render resolves too, by its own literal', () => {
  const tree = treeOf(CONDITIONAL_DELETE);
  // The DOM now has two <p>: the static one and the success message.
  const anchor = resolveStructuralAnchor(tree, [
    step('section', 'box', { index: 0, count: 1 }),
    step('p', 'ok', { index: 1, count: 2 }),
  ]);
  assert.equal(anchor.ok, true);
  assert.equal(anchor.ok && anchor.element.literal, 'ok');
});

test('when the literal cannot tell them apart, the SLOT can', () => {
  // Two <p> with no class at all: one static, one in a ternary. The literal is null on both, so it
  // narrows nothing — but a static always renders, and with one node in the DOM the ternary rendered
  // nothing. That is the shape of 137 of the elements measured in the real pages.
  const tree = treeOf([
    'render() {',
    '  return html`<section class="box">',
    '    <p>always here</p>',
    '    ${this.extra ? html`<p>sometimes</p>` : nothing}',
    '  </section>`;',
    '}',
  ].join('\n'));

  const anchor = resolveStructuralAnchor(tree, [
    step('section', 'box', { index: 0, count: 1 }),
    step('p', null, { index: 0, count: 1 }),
  ]);
  assert.equal(anchor.ok, true);
  assert.equal(anchor.ok && anchor.element.inExpression, false, 'the static one');
});

test('two expressions both producing nodes stay ambiguous, and say so', () => {
  // Guessing here writes the edit into the wrong element. The honest message ("select the element
  // around it") is a better answer than a silent mistake.
  const tree = treeOf([
    'render() {',
    '  return html`<section class="box">',
    '    ${this.a ? html`<p>one</p>` : nothing}',
    '    ${this.b ? html`<p>two</p>` : nothing}',
    '  </section>`;',
    '}',
  ].join('\n'));

  const anchor = resolveStructuralAnchor(tree, [
    step('section', 'box', { index: 0, count: 1 }),
    step('p', null, { index: 0, count: 1 }),
  ]);
  assert.equal(anchor.ok, false);
});

test('the scanner says WHICH expression holds each element', () => {
  // `inExpression` says "this may not render"; `expression` says with whom — which is what turns two
  // branches into one position instead of two.
  const tree = treeOf(CONDITIONAL_DELETE);
  const paragraphs = tree.elements.filter((element) => element.tag === 'p');
  assert.equal(paragraphs.length, 3);

  const [staticP, success, error] = paragraphs;
  assert.equal(staticP.expression, -1, 'the static one belongs to no expression');
  assert.equal(staticP.inExpression, false);
  assert.ok(success.expression > 0);
  assert.equal(success.expression, error.expression, 'both branches of the same ternary');

  // Innermost, not outermost: a ternary inside a `.map()` is a choice within each repetition.
  const nested = treeOf([
    'render() {',
    '  return html`<ul class="l">${this.rows.map((r) => html`<li class="i">${r.ok ? html`<b class="y">y</b>` : html`<i class="n">n</i>`}</li>`)}</ul>`;',
    '}',
  ].join('\n'));
  const li = nested.elements.find((element) => element.tag === 'li');
  const bold = nested.elements.find((element) => element.tag === 'b');
  const italic = nested.elements.find((element) => element.tag === 'i');
  assert.ok(li && bold && italic);
  assert.equal(bold.expression, italic.expression, 'the two branches share their own ternary');
  assert.notEqual(bold.expression, li.expression, 'not the map that repeats them');
});

// ── Ownership: whose file the markup under the pointer is in ────────────────────────────────────

interface OwnedNode {
  name: string;
  /** Custom-element tag; absent for plain markup. */
  tag?: string;
  /** Key this node's children were drained into — it is a projection ANCHOR. */
  held?: string;
  /** Key this node is the SOURCE of (`data-ml-live-source`, written by `_fillAnchor`). */
  source?: string;
  kids?: OwnedNode[];
  up?: OwnedNode | null;
}

/** Links the parents once, the way the DOM already has them linked. */
function owned(root: OwnedNode): OwnedNode {
  const link = (node: OwnedNode, parent: OwnedNode | null): void => {
    node.up = parent;
    for (const kid of node.kids ?? []) link(kid, node);
  };
  link(root, null);
  return root;
}

function pick(root: OwnedNode, name: string): OwnedNode {
  if (root.name === name) return root;
  for (const kid of root.kids ?? []) {
    const hit = pick(kid, name);
    if (hit.name === name) return hit;
  }
  return root;
}

/** Sources are hunted inside the molecule that RENDERED the anchor, exactly as the editor does. */
const OWNER: IOwnerTree<OwnedNode> = {
  parent: (node) => node.up ?? null,
  slotAnchor: (node) => node.held ?? null,
  slotSource: (node, key) => {
    let molecule = node.up ?? null;
    while (molecule && !molecule.tag) molecule = molecule.up ?? null;
    if (!molecule) return null;
    const hunt = (from: OwnedNode): OwnedNode | null => {
      for (const kid of from.kids ?? []) {
        if (kid.source === key) return kid;
        if (kid.tag) continue; // another molecule's sources are its own
        const deeper = hunt(kid);
        if (deeper) return deeper;
      }
      return null;
    };
    return hunt(molecule);
  },
  component: (node) => node.tag ?? null,
};

const ownedNames = (nodes: OwnedNode[]): string[] => nodes.map((node) => node.name);

/**
 * The shape of every 102047 page: the whole page inside a `<Scene>` of an `ml-scenary`, projected
 * into an anchor buried under the molecule's own wrappers.
 */
function scenaryPage(): OwnedNode {
  return owned({
    name: 'page',
    kids: [{
      name: 'scenary',
      tag: 'molecules--ml-scenary-102020',
      kids: [
        { name: 'Scene', source: 'ref1' }, // emptied by the capture, still a child, still hidden
        {
          name: 'ml-scenary',
          kids: [{
            name: 'ml-scenary-panel',
            kids: [{
              name: 'anchor',
              held: 'ref1',
              kids: [{
                name: 'pageRoot',
                kids: [{ name: 'header', kids: [{ name: 'h1' }] }],
              }],
            }],
          }],
        },
      ],
    }],
  });
}

test('content the page passed into a live slot is still the page it came from', () => {
  // The 102047 in one assertion. The DOM route to the `h1` runs through three of the molecule's own
  // wrappers plus the anchor; the page's file says `<ml-scenary><Scene><div><header><h1>`. Without
  // the re-route the path is unresolvable and the selection collapses to the molecule — which is
  // why 599 class attributes were reachable exactly zero times.
  const page = scenaryPage();
  const chain = ownerChain(pick(page, 'h1'), page, OWNER);

  assert.deepEqual(ownedNames(chain.chain), ['scenary', 'Scene', 'pageRoot', 'header', 'h1']);
  assert.equal(chain.crossed, true);
  assert.equal(chain.ownerBreak, -1, 'the molecule was HANDED this markup, it does not own it');
});

test('the molecule own markup still collapses to the molecule', () => {
  // The rule this task must not weaken: that file is shared by every project that imports it, and
  // there is no undo anywhere in the chain.
  const page = scenaryPage();
  const chain = ownerChain(pick(page, 'ml-scenary-panel'), page, OWNER);

  assert.equal(chain.crossed, false);
  assert.ok(chain.ownerBreak >= 0);
  assert.equal(chain.chain[chain.ownerBreak].name, 'scenary');
});

test('a molecule inside another molecule slot keeps both levels of the consumer markup', () => {
  // Composition with live slots is legitimate, and the rule has to be re-applied at EVERY boundary:
  // one miss and the outer level collapses the whole thing again.
  const page = owned({
    name: 'page',
    kids: [{
      name: 'outer',
      tag: 'ml-outer-102040',
      kids: [
        { name: 'Scene', source: 'Scene' },
        {
          name: 'outerBody',
          kids: [{
            name: 'outerAnchor',
            held: 'Scene',
            kids: [{
              name: 'inner',
              tag: 'ml-inner-102040',
              kids: [
                { name: 'Item', source: 'Item' },
                {
                  name: 'innerBody',
                  kids: [{ name: 'innerAnchor', held: 'Item', kids: [{ name: 'cell' }] }],
                },
              ],
            }],
          }],
        },
      ],
    }],
  });

  const chain = ownerChain(pick(page, 'cell'), page, OWNER);
  assert.deepEqual(ownedNames(chain.chain), ['outer', 'Scene', 'inner', 'Item', 'cell']);
  assert.equal(chain.ownerBreak, -1);
});

test('the anchor is read by what it HOLDS, not by the key it was rendered with', () => {
  // `_fillAnchor` reuses anchors by position: while a table is sorted, anchor #2 still carries the
  // id it was rendered with and already holds another row's nodes. Trusting the rendered key would
  // resolve the previous row's source — the panel would then edit a cell nobody clicked.
  const page = owned({
    name: 'page',
    kids: [{
      name: 'table',
      tag: 'ml-table-102040',
      kids: [
        { name: 'cellA', source: 'ref1' },
        { name: 'cellB', source: 'ref2' },
        { name: 'anchor', held: 'ref2', kids: [{ name: 'text' }] },
      ],
    }],
  });

  const chain = ownerChain(pick(page, 'text'), page, OWNER);
  assert.deepEqual(ownedNames(chain.chain), ['table', 'cellB', 'text'], 'the source it holds NOW');
});

test('an anchor whose source does not resolve collapses — it never guesses', () => {
  // The high risk of the whole task: a boundary detected where there is no projection points the
  // panel at the page's file for markup that is not in it, and the write lands somewhere else
  // entirely. With no source there is no boundary, and the answer is the one from before.
  const page = owned({
    name: 'page',
    kids: [{
      name: 'molecule',
      tag: 'ml-x-102040',
      kids: [{ name: 'anchor', held: 'gone', kids: [{ name: 'orphan' }] }],
    }],
  });

  const chain = ownerChain(pick(page, 'orphan'), page, OWNER);
  assert.equal(chain.crossed, false);
  assert.equal(chain.chain[chain.ownerBreak]?.name, 'molecule');
});

test('the deepest molecule is the one that owns the markup', () => {
  // What the scope refusal needs: naming the outer molecule would send the user to the wrong
  // project's file.
  const page = owned({
    name: 'page',
    kids: [{
      name: 'outer',
      tag: 'ml-outer-102040',
      kids: [{
        name: 'wrapper',
        kids: [{ name: 'inner', tag: 'ml-inner-102040', kids: [{ name: 'deep' }] }],
      }],
    }],
  });

  const chain = ownerChain(pick(page, 'deep'), page, OWNER);
  assert.equal(chain.chain[chain.ownerBreak].name, 'inner');
  // And the ancestors ABOVE the break are still in the chain: that is where the refusal goes
  // looking for a project to name.
  assert.deepEqual(ownedNames(chain.chain.slice(0, chain.ownerBreak)), ['outer', 'wrapper']);
});

test('a molecule the page renders is the page own element', () => {
  // `<ml-x class="p-3">` carries the PAGE's class attribute. The node itself never breaks ownership
  // — only a strict ancestor does — or editing a molecule's usage would be refused.
  const page = scenaryPage();
  const chain = ownerChain(pick(page, 'scenary'), page, OWNER);

  assert.deepEqual(ownedNames(chain.chain), ['scenary']);
  assert.equal(chain.ownerBreak, -1);
});

test('a node outside the page has no chain', () => {
  const page = scenaryPage();
  const loose = owned({ name: 'toolbar', kids: [{ name: 'chip' }] });

  assert.deepEqual(ownerChain(pick(loose, 'chip'), page, OWNER).chain, []);
  assert.deepEqual(ownerChain(page, page, OWNER).chain, [], 'the root itself is not a step');
});

test('cyclic accessors do not hang the pointer handler', () => {
  const a: OwnedNode = { name: 'a' };
  const b: OwnedNode = { name: 'b', up: a };
  a.up = b;

  assert.deepEqual(ownerChain(a, { name: 'root' }, OWNER).chain, []);
});

// ── The breadcrumb of the selection (TASK-102020-ancestor-breadcrumb) ────────────────────────────
//
// The chain the panel offers is the ownership chain, minus what is not editable. Everything here is
// measured on the same fixtures as `ownerChain` above, because it is the same walk: the pointer
// cannot reach a wrapper its children cover, and this is the way in.

/** The chain as the editor asks for it: from the HOST, so the first level is the page's element. */
function levelsOf(host: OwnedNode, node: OwnedNode): string[] {
  return ownedNames(selectableChain(ownerChain(node, host, OWNER), node));
}

test('the breadcrumb starts at the page element and never at the host', () => {
  // The host is the shell's: it is in no source, and offering it would offer an element nothing can
  // be written for. `ownerChain` never includes its root, which is exactly what gives us this.
  const host = owned({
    name: 'host',
    kids: [{ name: 'page', kids: [{ name: 'section', kids: [{ name: 'div', kids: [{ name: 'p' }] }] }] }],
  });

  assert.deepEqual(levelsOf(host, pick(host, 'p')), ['page', 'section', 'div', 'p']);
  // And the selection is the last level, always: that is what the panel highlights as "here".
  assert.deepEqual(levelsOf(host, pick(host, 'section')), ['page', 'section']);
});

test('a level of the page inside a live slot is the SOURCE, not the molecule wrappers', () => {
  // The 102047 shape: the page's own markup was MOVED into the molecule's template, so the DOM route
  // to it runs through `ml-scenary > ml-scenary-panel > span[anchor]` — three elements that appear in
  // no file of the page. A breadcrumb built from `parentElement` would offer them, and each one would
  // answer with a refusal.
  const page = scenaryPage();
  const levels = levelsOf(page, pick(page, 'h1'));

  assert.deepEqual(levels, ['scenary', 'Scene', 'pageRoot', 'header', 'h1']);
  for (const wrapper of ['ml-scenary', 'ml-scenary-panel', 'anchor']) {
    assert.equal(levels.includes(wrapper), false, `${wrapper} is the molecule's own markup`);
  }
});

test('molecule markup never becomes a level, and the selection still ends the chain', () => {
  // A molecule rendered INSIDE another molecule: the click resolves to the inner one (the deepest
  // break) while the ownership names the outer. The wrapper between them is the outer molecule's own
  // markup — not editable, so not offered — and the inner one is still where the user is.
  const page = owned({
    name: 'page',
    kids: [{
      name: 'outer',
      tag: 'ml-outer-102040',
      kids: [{
        name: 'wrapper',
        kids: [{ name: 'inner', tag: 'ml-inner-102040', kids: [{ name: 'deep' }] }],
      }],
    }],
  });

  assert.deepEqual(levelsOf(page, pick(page, 'inner')), ['outer', 'inner']);
  // The same rule from the other side: with the whole chain owned by the page, nothing is cut.
  assert.deepEqual(levelsOf(page, pick(page, 'outer')), ['outer']);
});

test('a node that does not hang from the root has no breadcrumb at all', () => {
  // The panel renders nothing rather than a chain of one invented level.
  const page = scenaryPage();
  const loose = owned({ name: 'toolbar', kids: [{ name: 'chip' }] });

  assert.deepEqual(levelsOf(page, pick(loose, 'chip')), []);
  assert.deepEqual(levelsOf(page, page), [], 'the root itself is not a level');
});

test('every ancestor of a wrapper is reachable from any descendant', () => {
  // The promise of the task, as a rule: from the deepest node, the chain contains EVERY element
  // between the page and it — which is what makes a wrapper whose children cover it selectable.
  const host = owned({
    name: 'host',
    kids: [{
      name: 'page',
      kids: [{ name: 'a', kids: [{ name: 'b', kids: [{ name: 'c', kids: [{ name: 'd' }] }] }] }],
    }],
  });

  const deepest = levelsOf(host, pick(host, 'd'));
  for (const name of ['page', 'a', 'b', 'c']) {
    assert.ok(deepest.includes(name), `${name} has to be one click away`);
    // And selecting it lands on a chain that is the same walk truncated — never a different one.
    assert.deepEqual(levelsOf(host, pick(host, name)), deepest.slice(0, deepest.indexOf(name) + 1));
  }
});

// ── The template that is not linked to whoever renders it (TASK-102020-anchor-orphan-roots) ──────
//
// The failure these guard is not the resolver's matching — measured over the 5.571 elements of the
// two real projects, `matchStep` never failed. It is the step before: a helper's template not being
// connected to its call site, which leaves the resolver believing that block is top level while the
// DOM says it is nested. Everything under it then resolves to nothing, or to the wrong node.

/** The path the browser hands the editor for `literal`, given the tree that knows the true nesting. */
function domPathFor(tree: ITemplateTree, literal: string, parentLiteral: string): IDomPathStep[] {
  void tree;
  return [
    { tag: 'section', index: 0, count: 1, literal: parentLiteral, literalIndex: 0, literalCount: 1 },
    { tag: 'div', index: 0, count: 1, literal, literalIndex: 0, literalCount: 1 },
  ];
}

test('a helper whose method holds an `if` is still linked to its call', () => {
  // `if (…) {` matches the shape of a method declaration exactly. The ranges are built as
  // [start, nextStart), so a phantom range in the middle of a method took over every template after
  // it: they stopped belonging to the method that returns them, and the real call never found them.
  // 132 phantom ranges in the two real projects, and the single biggest source of "not located".
  const source = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap">${this.renderBody()}</section>`;',
    '  }',
    '  renderBody() {',
    '    if (this.loading) {',
    '      return html`<div class="spinner">…</div>`;',
    '    }',
    '    return html`<div class="body">pronto</div>`;',
    '  }',
    '}',
  ].join('\n');

  const tree = scanTemplateTree(source);
  const body = tree.elements.findIndex((element) => element.literal === 'body');
  const spinner = tree.elements.findIndex((element) => element.literal === 'spinner');

  // BOTH templates of the method are mounted at the call site — the one before the `if` and the one
  // after it. Before this, only the first was.
  assert.ok(tree.links.some((link) => link.root === spinner), 'the early-return template');
  assert.ok(tree.links.some((link) => link.root === body), 'and the one after the `if`');

  const resolved = resolveStructuralAnchor(tree, domPathFor(tree, 'body', 'wrap'));
  assert.equal(resolved.ok, true);
  assert.equal(resolved.ok && resolved.element.literal, 'body');
});

test('a helper called from inside an expression is linked, and counted as one of its arms', () => {
  // `${done ? html`…` : this.renderForm()}` renders exactly as often as that arm does. Linking it
  // without saying so would make the source claim a sibling the screen may not have.
  const source = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap">',
    '      ${this.done ? html`<div class="ok">pronto</div>` : this.renderForm()}',
    '    </section>`;',
    '  }',
    '  renderForm() {',
    '    return html`<div class="form">formulário</div>`;',
    '  }',
    '}',
  ].join('\n');

  const tree = scanTemplateTree(source);
  const form = tree.elements.findIndex((element) => element.literal === 'form');
  const link = tree.links.find((candidate) => candidate.root === form);
  assert.ok(link, 'the conditional call is linked');
  assert.ok(link.expression > 0, 'and the link says which ${…} holds it');

  // The two arms are alternatives, so the literal is what tells them apart — and it does.
  const asForm = resolveStructuralAnchor(tree, domPathFor(tree, 'form', 'wrap'));
  assert.equal(asForm.ok && asForm.element.literal, 'form');
  const asOk = resolveStructuralAnchor(tree, domPathFor(tree, 'ok', 'wrap'));
  assert.equal(asOk.ok && asOk.element.literal, 'ok');
});

test('two arms with the SAME literal are refused, not guessed', () => {
  // The item this task exists to close. The path is IDENTICAL whichever arm rendered, so any answer
  // other than a refusal is a coin toss — and the editor's guard (`element.literal !== literal`) does
  // not catch it, because the wrong answer carries the right literal. It would write the edit into
  // the other branch of the code, silently.
  const source = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap">',
    '      ${this.done ? html`<div class="panel">pronto</div>` : this.renderForm()}',
    '    </section>`;',
    '  }',
    '  renderForm() {',
    '    return html`<div class="panel">formulário</div>`;',
    '  }',
    '}',
  ].join('\n');

  const tree = scanTemplateTree(source);
  const resolved = resolveStructuralAnchor(tree, domPathFor(tree, 'panel', 'wrap'));
  assert.equal(resolved.ok, false, 'ambiguous is ambiguous — say so');
  assert.deepEqual(resolved.ok === false && resolved.reason, NOT_LOCATED);
});

test('an unconditional call still counts as markup that always renders', () => {
  // The case that already worked, and the premise the whole grouping rests on: `${this.renderX()}`
  // with nothing around it renders once, every time, so it is a STATIC sibling. Loosening this is how
  // the fix would have broken what it was meant to help.
  const source = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap">',
    '      <div class="head">t</div>',
    '      ${this.renderBody()}',
    '    </section>`;',
    '  }',
    '  renderBody() {',
    '    return html`<div class="body">b</div>`;',
    '  }',
    '}',
  ].join('\n');

  const tree = scanTemplateTree(source);
  const body = tree.elements.findIndex((element) => element.literal === 'body');
  assert.equal(tree.links.find((link) => link.root === body)?.expression, -1, 'unconditional');

  // Two divs under the section, both always there: position alone identifies each.
  const second = resolveStructuralAnchor(tree, [
    { tag: 'section', index: 0, count: 1, literal: 'wrap', literalIndex: 0, literalCount: 1 },
    { tag: 'div', index: 1, count: 2, literal: 'body', literalIndex: 0, literalCount: 1 },
  ]);
  assert.equal(second.ok && second.element.literal, 'body');
});

test('a call in plain code is not a mount point', () => {
  // `const body = this.renderForm();` says nothing about where the result lands. Inventing a parent
  // for it would invent nesting, which is worse than leaving the helper unlinked.
  const source = [
    'class X {',
    '  render() {',
    '    const extra = this.renderForm();',
    '    return html`<section class="wrap">${extra}</section>`;',
    '  }',
    '  renderForm() {',
    '    return html`<div class="form">f</div>`;',
    '  }',
    '}',
  ].join('\n');

  const tree = scanTemplateTree(source);
  const form = tree.elements.findIndex((element) => element.literal === 'form');
  assert.equal(tree.links.some((link) => link.root === form), false);
});

test('the block keywords are named, and `render` is not among them', () => {
  const CORE = readFileSync(new URL('studioClassEdit.ts', import.meta.url), 'utf8');
  const list = /const BLOCK_KEYWORDS = new Set\(\[([^\]]+)\]\)/u.exec(CORE)?.[1] ?? '';
  for (const keyword of ['if', 'for', 'while', 'switch', 'catch', 'do']) {
    assert.ok(list.includes(`'${keyword}'`), keyword);
  }
  assert.equal(list.includes("'render'"), false, 'a real method name must never be in there');
});

// ── The i18n key as the last tiebreaker (TASK-102020-anchor-i18n-tiebreak) ───────────────────────
//
// The shape that survived every other rule: a ternary whose arms are the same tag with the same class
// — or with none at all, which is how the "Nenhum registro encontrado" paragraph of the 102047 stayed
// unreachable. Nothing in the markup separates them except the sentence each one writes.

/** The real page11/ticketCatalogue shape: a nested ternary with two class-less `<p>`. */
const TERNARY_ARMS = [
  'class X {',
  '  render() {',
  "    const msg = { 'common.loading': 'Carregando...', 'list.empty': 'Nenhum registro encontrado' };",
  '    return html`<section class="wrap">',
  "      ${this.loading ? html`<p>${msg['common.loading']}</p>`",
  "        : this.rows.length === 0 ? html`<p>${msg['list.empty']}</p>`",
  '        : html`<div class="table">…</div>`}',
  '    </section>`;',
  '  }',
  '}',
].join('\n');

const armsPath = (keys?: readonly string[]): IDomPathStep[] => [
  { tag: 'section', index: 0, count: 1, literal: 'wrap', literalIndex: 0, literalCount: 1 },
  {
    tag: 'p', index: 0, count: 1, literal: null, literalIndex: 0, literalCount: 1,
    ...(keys ? { i18nKeys: keys } : {}),
  },
];

test('the arm the screen is showing is the one that resolves', () => {
  const tree = scanTemplateTree(TERNARY_ARMS);

  const empty = resolveStructuralAnchor(tree, armsPath(['list.empty']));
  assert.equal(empty.ok, true);
  assert.ok(empty.ok && TERNARY_ARMS.slice(empty.element.openStart, empty.element.end).includes('list.empty'));

  const loading = resolveStructuralAnchor(tree, armsPath(['common.loading']));
  assert.equal(loading.ok, true);
  assert.ok(loading.ok && TERNARY_ARMS.slice(loading.element.openStart, loading.element.end).includes('common.loading'));
});

test('a sentence written under several keys still resolves', () => {
  // The real case: "Nenhum registro encontrado" is the value of THREE keys in one page11 file, so the
  // screen text maps to three. The question asked of each arm is "does it interpolate ANY of these".
  const tree = scanTemplateTree(TERNARY_ARMS);
  const resolved = resolveStructuralAnchor(tree, armsPath([
    'list.empty', 'intent.qryLocateTicket.list.empty', 'intent.qryGetTicket.list.empty',
  ]));
  assert.equal(resolved.ok, true);
  assert.ok(resolved.ok && TERNARY_ARMS.slice(resolved.element.openStart, resolved.element.end).includes('list.empty'));
});

test('without the key the same path is still refused — the signal is what changed, not the rule', () => {
  const tree = scanTemplateTree(TERNARY_ARMS);
  const resolved = resolveStructuralAnchor(tree, armsPath());
  assert.equal(resolved.ok, false, 'two identical arms and nothing to tell them apart');
});

test('arms with no key at all stay refused', () => {
  // Two arms the markup writes identically ARE identical. Refusing is the right answer, and a key
  // that matches neither must not turn a refusal into a guess.
  const source = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap">',
    '      ${this.a ? html`<p>um</p>` : html`<p>dois</p>`}',
    '    </section>`;',
    '  }',
    '}',
  ].join('\n');
  const tree = scanTemplateTree(source);
  assert.equal(resolveStructuralAnchor(tree, armsPath()).ok, false);
  assert.equal(resolveStructuralAnchor(tree, armsPath(['nothing.matches.this'])).ok, false);
});

test('the key never overrides what position already answered', () => {
  // The order is the guarantee: the tiebreaker runs only where the positional rules gave up, so a
  // step carrying a key can never resolve differently from the same step without one.
  const source = [
    'class X {',
    '  render() {',
    '    const msg = { a: "A", b: "B" };',
    '    return html`<section class="wrap">',
    "      <p class=\"one\">${msg['a']}</p>",
    "      <p class=\"two\">${msg['b']}</p>",
    '    </section>`;',
    '  }',
    '}',
  ].join('\n');
  const tree = scanTemplateTree(source);

  const step = (literal: string, index: number, keys?: readonly string[]): IDomPathStep[] => [
    { tag: 'section', index: 0, count: 1, literal: 'wrap', literalIndex: 0, literalCount: 1 },
    {
      tag: 'p', index, count: 2, literal, literalIndex: 0, literalCount: 1,
      ...(keys ? { i18nKeys: keys } : {}),
    },
  ];

  // A key that points at the OTHER element does not move the answer: position already decided.
  const withoutKey = resolveStructuralAnchor(tree, step('one', 0));
  const withWrongKey = resolveStructuralAnchor(tree, step('one', 0, ['b']));
  assert.equal(withoutKey.ok && withoutKey.element.literal, 'one');
  assert.equal(withWrongKey.ok && withWrongKey.element.literal, 'one');
});

test('the element carries the keys of its OWN text, not of its children', () => {
  // A child's sentence belongs to the child. Inheriting it upwards would make every ancestor look
  // like every one of its descendants, and the tiebreaker would start matching the wrong level.
  const source = [
    'class X {',
    '  render() {',
    '    const msg = { outer: "O", inner: "I", title: "T" };',
    "    return html`<section class=\"wrap\" title=${msg['title']}>${msg['outer']}",
    "      <p class=\"kid\">${msg['inner']}</p>",
    '    </section>`;',
    '  }',
    '}',
  ].join('\n');
  const tree = scanTemplateTree(source);
  const wrap = tree.elements.find((element) => element.literal === 'wrap');
  const kid = tree.elements.find((element) => element.literal === 'kid');

  assert.deepEqual(wrap?.i18nKeys, ['outer'], 'not the child, and not the attribute');
  assert.deepEqual(kid?.i18nKeys, ['inner']);
});

test('an element whose text is not i18n carries no key', () => {
  // `<p>${item.title}</p>` has text and no key. Nothing on the step, nothing changes — and the test
  // exists so that "no signal" never quietly becomes "no result".
  const source = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap"><p class="row">${item.title}</p></section>`;',
    '  }',
    '}',
  ].join('\n');
  const tree = scanTemplateTree(source);
  assert.deepEqual(tree.elements.find((element) => element.literal === 'row')?.i18nKeys, []);
});

test('the editor asks the catalog with the language on screen, and only where it is needed', () => {
  const EDITOR = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8');
  const body = EDITOR.slice(EDITOR.indexOf('private i18nKeysOf('), EDITOR.indexOf('private locateLiteral('));

  assert.ok(body.includes('findAllI18nMatches('), 'the text goes back through the catalog');
  assert.ok(body.includes('currentLanguage()'), 'in the language the document is in');
  // Own text only, matching the rule on the source side.
  assert.ok(body.includes('Node.TEXT_NODE'), 'direct text nodes, not the subtree');
});

test('the key is read even when the element looks unique on screen', () => {
  // The regression that shipped once: the lookup was gated on the element having a same-tag rival IN
  // THE DOM, as an optimisation. But the rival of a ternary arm lives in the SOURCE and exactly one
  // arm renders — so the gate switched the tiebreaker off precisely in the case it exists for, and
  // the reported `<p>` went on being unreachable with the fix supposedly in.
  const EDITOR = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8');
  const call = /const i18nKeys = this\.i18nKeysOf\(([^)]*)\);/u.exec(EDITOR);
  assert.ok(call, 'domPathOf asks for the keys');
  assert.equal(call[1].trim(), 'node', 'the node, and nothing about how many siblings it has');

  const body = EDITOR.slice(EDITOR.indexOf('private i18nKeysOf('), EDITOR.indexOf('private locateLiteral('));
  for (const gate of ['siblings.length', 'sameLiteral.length', 'worthAsking']) {
    assert.equal(body.includes(gate), false, `the lookup must not depend on ${gate}`);
  }
});

// ── Attributes as the source writes them (TASK-102020-attribute-text) ────────────────────────────

/** The open tag of the element whose tag name is given, as the scanner found it. */
function openStartOf(source: string, tag: string): number {
  const element = scanTemplateTree(source).elements.find((candidate) => candidate.tag === tag);
  assert.ok(element, tag);
  return element.openStart;
}

const ATTR_MARKUP = [
  'class X {',
  '  render() {',
  '    const msg = this.msg;',
  '    return html`<div>',
  '      <input placeholder=${msg[\'search.hint\']} class="w-full" aria-label="busca">',
  '      <button @click=${() => this.reload()} title=${msg[\'refresh\']}>ok</button>',
  '      <span data-title="nope" title=${this.formatDate(row.at)}>x</span>',
  '      <img alt="logo" src="/l.svg">',
  '      <section aria-label="${msg[\'health\']}"></section>',
  '      <p title="Total: ${n}"></p>',
  '    </div>`;',
  '  }',
  '}',
].join('\n');

test('an attribute bound to a catalog key is read as an expression', () => {
  const found = readAttribute(ATTR_MARKUP, openStartOf(ATTR_MARKUP, 'input'), 'placeholder');

  assert.equal(found.kind, 'expression');
  if (found.kind !== 'expression') return;
  assert.equal(found.expression, `msg['search.hint']`);
});

test('an arrow in an event binding does not end the open tag', () => {
  // `@click=${() => this.reload()}` carries a `>`. Cutting the tag there would read the attributes
  // of whatever came next — the same trap findOpenTagEnd exists for.
  const found = readAttribute(ATTR_MARKUP, openStartOf(ATTR_MARKUP, 'button'), 'title');

  assert.equal(found.kind, 'expression');
  if (found.kind !== 'expression') return;
  assert.equal(found.expression, `msg['refresh']`);
});

test('a quoted attribute is a literal, and a missing one is absent', () => {
  const literal = readAttribute(ATTR_MARKUP, openStartOf(ATTR_MARKUP, 'img'), 'alt');
  assert.deepEqual(literal, { kind: 'literal', value: 'logo' });

  assert.deepEqual(readAttribute(ATTR_MARKUP, openStartOf(ATTR_MARKUP, 'img'), 'title'), { kind: 'absent' });
  assert.deepEqual(readAttribute(ATTR_MARKUP, -1, 'title'), { kind: 'absent' });
});

test('the name is matched whole: data-title is not title', () => {
  // The `<span>` carries `data-title="nope"` AND a real `title` binding. Reading the first would
  // offer the wrong text — and `data-*` is deliberately out of the closed list.
  const found = readAttribute(ATTR_MARKUP, openStartOf(ATTR_MARKUP, 'span'), 'title');

  assert.equal(found.kind, 'expression');
  if (found.kind !== 'expression') return;
  assert.equal(found.expression, 'this.formatDate(row.at)', 'the binding, not the data- literal');
});

test('an aria-label written in the markup is a literal, not a key', () => {
  const found = readAttribute(ATTR_MARKUP, openStartOf(ATTR_MARKUP, 'input'), 'aria-label');
  assert.deepEqual(found, { kind: 'literal', value: 'busca' });
});

test('a QUOTED interpolation is a binding, not markup', () => {
  // How 8 of the 102046's aria-labels are written. Read as markup, they told the user their text was
  // not editable when it is the catalog's.
  const found = readAttribute(ATTR_MARKUP, openStartOf(ATTR_MARKUP, 'section'), 'aria-label');

  assert.equal(found.kind, 'expression');
  if (found.kind !== 'expression') return;
  assert.equal(found.expression, `msg['health']`);
});

test('a quoted value that MIXES text and code stays markup', () => {
  // Half of it is a literal, and rewriting markup is another operation — so the honest answer is the
  // one that sends the user to the source.
  const found = readAttribute(ATTR_MARKUP, openStartOf(ATTR_MARKUP, 'p'), 'title');

  assert.deepEqual(found, { kind: 'literal', value: 'Total: ${n}' });
});

