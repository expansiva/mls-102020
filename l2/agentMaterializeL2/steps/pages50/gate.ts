/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/pages50/gate.ts" enhancement="_blank"/>

// Pure gate of a generated page .ts, run BEFORE the file is written and compiled. It checks what the
// compiler cannot: the page renders every section and organism of its page11, uses the molecules it was
// given (and only those), calls every intent, makes no backend call, keeps every visible word in the
// i18n catalogue and colors only through design tokens. Compilation in the Studio comes after, in run.ts.

import type { L2Page11Definition, L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { moleculeGroupFolder } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import type { L2SharedDefinition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';

export interface M4PageTarget {
  project: number;
  module: string;
  pageId: string;
  device: L2Page11Device;
  page11: L2Page11Definition;
  sharedClassName: string;
  /** Two-letter catalogue keys, default first ('pt', 'en'). */
  locales: string[];
  /** Color token names of the project design system (base names, no -hover/-focus/-disabled). */
  tokens: string[];
  /** Intent names → the shared method that serves them (input20); absent → the intent id itself. */
  methods?: Record<string, string>;
  /**
   * Molecule tag → the events its .ts dispatches (m4MoleculeEvents). A tag absent here is not checked (its
   * source could not be read): the event check only refuses what it can prove.
   */
  moleculeEvents?: Record<string, string[]>;
  /** The journey functions only the page can start (m4PageJourneyFunctions); each must be called by the page. */
  journeyFunctions?: M4JourneyFunction[];
}

export interface M4JourneyFunction { fn: string; steps: string[] }

/**
 * The functions of the page's journeys that nothing but the page can call: each one listed in a journey step and
 * declared by the shared, except those the shared starts by itself (the request of an onLoad trigger, or any
 * function its own code calls: this.fn( in the shared .ts). agendaClinica/consultas (09/10/2026): the scheduling
 * journey lists localizarProfissionaisParaAgendamento, and no control of the page called it.
 */
export function m4PageJourneyFunctions(shared: L2SharedDefinition, sharedSource: string): M4JourneyFunction[] {
  const steps = new Map<string, string[]>();
  for (const journey of shared.journeys) {
    for (const fn of journey.functions) {
      if (shared.functions[fn]) steps.set(fn, [...(steps.get(fn) ?? []), journey.step]);
    }
  }
  const startedByShared = (fn: string): boolean => {
    const calls = shared.functions[fn].calls;
    if (calls && shared.requests[calls]?.trigger === 'onLoad') return true;
    return new RegExp(`\\bthis\\.${fn}\\s*(?:<[^>\\n]*>)?\\s*\\(`, 'u').test(sharedSource);
  };
  return [...steps.entries()]
    .filter(([fn]) => !startedByShared(fn))
    .map(([fn, list]) => ({ fn, steps: [...new Set(list)] }))
    .sort((a, b) => a.fn.localeCompare(b.fn));
}

/**
 * DOM events that bubble out of any element inside a molecule (a click, a key), whether or not the molecule
 * dispatches them itself. The value events are NOT here: `change` is stopped by moleculeBase, and `input` is
 * stopped by molecules that only filter their own list (ml-select-one-autocomplete, 09/10/2026), so the page
 * hears a typed value only when the molecule dispatches it. `focus`/`blur` do not bubble at all.
 */
const NATIVE_EVENTS = new Set([
  'click', 'dblclick', 'auxclick', 'contextmenu', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'mousemove', 'mouseenter', 'mouseleave',
  'pointerdown', 'pointerup', 'pointerover', 'pointerout', 'pointermove', 'pointerenter', 'pointerleave', 'pointercancel',
  'touchstart', 'touchend', 'touchmove', 'touchcancel', 'wheel', 'scroll',
  'keydown', 'keyup', 'keypress', 'focusin', 'focusout', 'submit', 'reset',
  'dragstart', 'drag', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop', 'copy', 'cut', 'paste',
]);

/**
 * The events a molecule .ts dispatches: the literal names of `new CustomEvent('…')` / `new Event('…')`. When it
 * builds an event from a variable (`new CustomEvent(name, …)`), the literal first argument of its own emit/dispatch
 * helpers too (`this.emitRowEvent('save')`). Leaning to more names keeps the check from refusing a real event.
 */
export function m4MoleculeEvents(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/\bnew\s+(?:Custom)?Event\s*(?:<[^>]*>)?\(\s*['"`]([A-Za-z][\w:.-]*)['"`]/gu)) names.add(match[1]);
  if (/\bnew\s+(?:Custom)?Event\s*(?:<[^>]*>)?\(\s*[A-Za-z_$]/u.test(source)) {
    for (const match of source.matchAll(/\bthis\.(?:emit|dispatch|fire|notify)\w*\s*\(\s*['"`]([A-Za-z][\w:.-]*)['"`]/gu)) names.add(match[1]);
  }
  return [...names].sort();
}

/** Every `@event=` bound on the opening tag of a molecule element, outside the `${…}` expressions of that tag. */
export function m4BoundEvents(code: string, tag: string): string[] {
  const found: string[] = [];
  // Only `.` needs escaping: a tag is [a-z0-9-.], and `\-` outside a class is a SyntaxError under the u flag.
  const open = new RegExp(`<${tag.replace(/\./gu, '\\.')}(?![\\w-])`, 'gu');
  for (const match of code.matchAll(open)) {
    let i = (match.index ?? 0) + match[0].length;
    let depth = 0;
    let quote = '';
    for (; i < code.length; i += 1) {
      const ch = code[i];
      if (quote) { if (ch === '\\') i += 1; else if (ch === quote) quote = ''; continue; }
      if (depth > 0) {
        if (ch === '\'' || ch === '"' || ch === '`') quote = ch;
        else if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        continue;
      }
      if (ch === '$' && code[i + 1] === '{') { depth = 1; i += 1; continue; }
      if (ch === '"' || ch === '\'') { quote = ch; continue; }
      if (ch === '>') break;
      if (ch === '@') {
        const name = /^@([A-Za-z][\w:.-]*)\s*=/u.exec(code.slice(i, i + 80))?.[1];
        if (name) found.push(name);
      }
    }
  }
  return found;
}
/**
 * `error` breaks the contract (the app or the pipeline) and refuses the page. `advisory` is a design
 * observation: recorded in the receipt, never a refusal. Design belongs to the page LLM (Guilherme,
 * 01/10/2026: too many rules made every screen the same).
 */
export interface M4PageIssue {
  code: string;
  message: string;
  severity: 'error' | 'advisory';
  /** Refuses even while the gate is not enforced (M4_PAGE_GATE_ENFORCED = false). */
  always?: boolean;
}

export const M4_SCENARY_TAG = 'molecules--ml-scenary-102020';
export const M4_SCENARY_IMPORT = '/_102020_/l2/molecules/ml-scenary.js';
const PALETTE ='slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';
const FALLBACKS = new Set(['transparent', 'currentColor', 'inherit']);
const TOKEN_VARIANTS = /-(?:hover|focus|disabled)$/u;

const pascal = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`;
const kebab = (value: string) => value.replace(/[A-Z]/gu, char => `-${char.toLowerCase()}`);

export function m4PageClassName(module: string, device: L2Page11Device, pageId: string): string {
  return `${pascal(module)}${pascal(device)}Page11${pascal(pageId)}Page`;
}
/** `controleEstoque/web/desktop/page11/produtos.ts` in 102047 → `controle-estoque--web--desktop--page11--produtos-102047`. */
export function m4PageTag(project: number, module: string, device: L2Page11Device, pageId: string): string {
  return `${kebab(module)}--web--${device}--page11--${kebab(pageId)}-${project}`;
}
export function m4PagePath(target: Pick<M4PageTarget, 'project' | 'module' | 'device' | 'pageId'>): string {
  return `_${target.project}_/l2/${target.module}/web/${target.device}/page11/${target.pageId}.ts`;
}
export function m4SharedImport(target: Pick<M4PageTarget, 'project' | 'module' | 'pageId'>): string {
  return `/_${target.project}_/l2/${target.module}/web/shared/${target.pageId}.js`;
}
/** `groupviewtable--ml-data-table` → `/_102040_/l2/molecules/groupviewtable/ml-data-table.js`. */
export function m4MoleculeImport(tag: string): string {
  return `/_102040_/l2/molecules/${moleculeGroupFolder(tag)}/${tag.slice(tag.indexOf('--') + 2)}.js`;
}
export function m4PageMoleculeTags(page11: L2Page11Definition): string[] {
  return [...new Set(Object.values(page11.molecules).flatMap(list => list.flatMap(item => [item.preferred, item.alternative].filter((tag): tag is string => Boolean(tag)))))].sort();
}

export function gateM4PageSource(source: string, target: M4PageTarget): M4PageIssue[] {
  const issues: M4PageIssue[] = [];
  const push = (code: string, message: string) => issues.push({ code, message, severity: 'error' });
  const advise = (code: string, message: string) => issues.push({ code, message, severity: 'advisory' });
  const text = source.replace(/\r\n/gu, '\n');
  const code = stripComments(text);
  const className = m4PageClassName(target.module, target.device, target.pageId);
  const tag = m4PageTag(target.project, target.module, target.device, target.pageId);

  const header = `/// <mls fileReference="${m4PagePath(target)}" enhancement="_102020_/l2/enhancementAura"/>`;
  if (text.split('\n')[0] !== header) push('M4_PAGE_HEADER', `The first line must be exactly: ${header}`);

  // Imports: lit, the given molecules and the shared module only.
  const moleculeTags = m4PageMoleculeTags(target.page11);
  const allowed = new Set(['lit', 'lit/decorators.js', m4SharedImport(target), M4_SCENARY_IMPORT, ...moleculeTags.map(m4MoleculeImport)]);
  const imported = new Set<string>();
  for (const match of code.matchAll(/\bimport\s+(?:[^'";]*?\bfrom\s+)?['"]([^'"]+)['"]/gu)) {
    imported.add(match[1]);
    if (!allowed.has(match[1])) push('M4_PAGE_IMPORT', `Import ${match[1]} is not allowed. Use only lit, lit/decorators.js, ${m4SharedImport(target)} and the molecule paths of this page.`);
  }
  if (/\bimport\s*\(/u.test(code)) push('M4_PAGE_IMPORT', 'Dynamic import() is not allowed.');
  if (/\bexecBff\b|\bfetch\s*\(|XMLHttpRequest/u.test(code)) push('M4_PAGE_BACKEND', 'The page must not call the backend; call the shared functions.');

  // Class shape.
  if (!code.includes(`@customElement('${tag}')`) && !code.includes(`@customElement("${tag}")`)) push('M4_PAGE_TAG', `The class must be registered as @customElement('${tag}').`);
  if (!new RegExp(`\\bexport\\s+class\\s+${className}\\s+extends\\s+${target.sharedClassName}\\b`, 'u').test(code)) push('M4_PAGE_CLASS', `The file must declare export class ${className} extends ${target.sharedClassName}.`);
  for (const [pattern, what] of [
    [/@(?:property|state|query)\s*\(/u, 'a @property/@state/@query member (state belongs to the shared)'],
    [/\b(?:connectedCallback|disconnectedCallback|firstUpdated|updated|willUpdate)\s*\(/u, 'a lifecycle method'],
    [/\basync\s+[A-Za-z_$]/u, 'an async method or function'],
    [/\bstatic\s+styles\b/u, 'static styles'],
    [/\bconsole\.\w+\s*\(/u, 'console output'],
    [/\bTODO\b/u, 'a TODO'],
    [/\bthis\s*\[/u, 'this[...] access (read members by name)'],
  ] as const) {
    if (pattern.test(code)) push('M4_PAGE_FORBIDDEN', `The page must not contain ${what}.`);
  }

  // Sections present and organisms wrapped. The declared order binds a single view only: with scenes, the
  // code follows the scenes, not the page11 order (false refusal on movimentacoes/mobile, 01/10/2026).
  const usesScenes = code.includes(`<${M4_SCENARY_TAG}`);
  let last = -1;
  for (const section of target.page11.sections) {
    const at = code.search(new RegExp(`data-section-id=["']${section.id}["']`, 'u'));
    if (at < 0) advise('M4_PAGE_SECTION', `Section ${section.id} needs an element with data-section-id="${section.id}".`);
    else if (!usesScenes && at < last) advise('M4_PAGE_SECTION', `Section ${section.id} must come after the previous section, in the declared order.`);
    else last = at;
  }
  for (const organism of Object.keys(target.page11.organisms)) {
    if (!new RegExp(`data-organism-id=["']${organism}["']`, 'u').test(code)) push('M4_PAGE_ORGANISM', `Organism ${organism} needs a wrapper with data-organism-id="${organism}".`);
  }

  // Molecules: every entry rendered with one of its two tags; no tag outside the list; every tag imported.
  for (const [organism, list] of Object.entries(target.page11.molecules)) {
    for (const entry of list) {
      const options = [entry.preferred, entry.alternative].filter((item): item is string => Boolean(item));
      if (!options.some(option => code.includes(`<${option}`))) advise('M4_PAGE_MOLECULE_UNUSED', `Organism ${organism} (${entry.role}) renders neither <${options.join('> nor <')}>.`);
    }
  }
  const usedTags = new Set([...code.matchAll(/<([a-z][a-z0-9]*--ml-[a-z0-9-]+)\b/gu)].map(match => match[1]).filter(used => used !== M4_SCENARY_TAG));
  for (const used of usedTags) {
    if (!moleculeTags.includes(used)) push('M4_PAGE_MOLECULE', `Molecule <${used}> is not in this page's list.`);
    else if (!imported.has(m4MoleculeImport(used))) push('M4_PAGE_MOLECULE_IMPORT', `Molecule <${used}> is used but ${m4MoleculeImport(used)} is not imported.`);
  }
  // A listener for an event the molecule never dispatches compiles and does nothing (agendaClinica/consultas,
  // 08/10/2026: @search on ml-combobox, which emits input). Listening to only some of its events is fine.
  // Enforced even while the rest of the gate is off.
  for (const [tag, events] of Object.entries(target.moleculeEvents ?? {})) {
    const dispatched = new Set(events);
    for (const name of new Set(m4BoundEvents(code, tag))) {
      if (dispatched.has(name) || NATIVE_EVENTS.has(name)) continue;
      issues.push({ code: 'M4_PAGE_EVENT_UNKNOWN', severity: 'error', always: true, message: `<${tag}> never dispatches "${name}", so @${name} never runs. It dispatches ${events.length ? events.map(event => `"${event}"`).join(', ') : 'no event of its own'}${events.length ? '' : ' (only native DOM events such as click reach the page)'}; listen to the one that carries what the page needs, as its skill describes.` });
    }
  }

  // Scenes: optional, decided by the page (Guilherme, 01/10/2026); when used, the host is wired to the shared.
  const hosts = code.split(`<${M4_SCENARY_TAG}`).length - 1;
  // Views switch ONLY through the host (Guilherme, 02/10/2026: a page switched views by hand, without
  // ml-scenary). Enforced even while the rest of the gate is off.
  const scenaryReads = code.replace(/\.value=\$\{\s*this\.scenary\b/gu, '').match(/\bthis\.scenary\b/gu)?.length ?? 0;
  if (scenaryReads > 0) {
    issues.push({ code: 'M4_PAGE_SCENARY_CUSTOM', severity: 'error', always: true, message: `The page switches views by hand (this.scenary is read outside the host's .value). Views switch only through <${M4_SCENARY_TAG}>: wrap each view in a <Scene value="…" title=…>, bind .value=\${this.scenary || '<first>'} and @change → this.setScenario(e.detail.value), import '${M4_SCENARY_IMPORT}', and remove the conditional rendering.` });
  }
  if (hosts === 0 && /\bthis\.setScenario\s*\(/u.test(code)) {
    issues.push({ code: 'M4_PAGE_SCENARY_CUSTOM', severity: 'error', always: true, message: `The page calls this.setScenario(…) but has no <${M4_SCENARY_TAG}>: views switch only through the scene host. Put the views in <Scene> elements inside it.` });
  }
  // No `any` (Guilherme, 02/10/2026): produtos read `(produto: any) => produto?.name` while the rows are
  // ProdutoLoad (`details.identification.name`); it compiled and rendered "—" in every cell. The shared
  // types are the only guard of the row shape, so this one is enforced even while the gate is off.
  const anyUses = code.match(/:\s*any\b|\bas\s+any\b|<any>|\bany\[\]/gu)?.length ?? 0;
  if (anyUses > 0) {
    issues.push({ code: 'M4_PAGE_ANY', severity: 'error', always: true, message: `The page uses \`any\` (${anyUses}×), which hides the row shape and renders empty cells. Type every helper with the shared types (for example \`(item: ProdutoLoad) => item.details.identification.name\`, imported as a type from the shared module) and read the nested paths of the projection.` });
  }
  if (hosts > 0) {
    // Only what makes the host work (05/10/2026: the rest was design opinion and is gone).
    if (!imported.has(M4_SCENARY_IMPORT)) push('M4_PAGE_SCENARY', `The scene host needs import '${M4_SCENARY_IMPORT}';`);
    if (!/\.value=\$\{\s*this\.scenary\b/u.test(code)) push('M4_PAGE_SCENARY', "Bind the host value to the shared state: .value=${this.scenary || '<first scene id>'}.");
    if (!/@change=\$\{[\s\S]{0,240}?\bthis\.setScenario\s*\(/u.test(code)) push('M4_PAGE_SCENARY', 'The host @change must call this.setScenario(e.detail.value).');
    // `change` of a molecule inside a scene bubbles (composed) to the host: unguarded, a Tab out of
    // ml-number-input (change on blur) set the scene to the typed number and went back (produtos, 02/10/2026).
    else if (!/@change=\$\{[\s\S]{0,240}?\be\.target\s*===\s*e\.currentTarget[\s\S]{0,80}?\bthis\.setScenario\s*\(/u.test(code)) {
      issues.push({ code: 'M4_PAGE_SCENARY_BUBBLE', severity: 'error', always: true, message: "The host @change must ignore the change events that bubble from the molecules inside its scenes: @change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) this.setScenario(e.detail.value); }}." });
    }
  } else if (/<Scene\b/u.test(code)) {
    push('M4_PAGE_SCENARY', `<Scene> only exists inside <${M4_SCENARY_TAG}>.`);
  }
  // Design choices about scenes (one view or many, where a task form lives) belong to the page LLM and to
  // the review step; no check here (05/10/2026).

  // Journeys: a step only the page can start, wired to nothing, leaves its list empty or its action dead
  // (agendaClinica/consultas, 09/10/2026). Enforced even while the rest of the gate is off.
  for (const item of target.journeyFunctions ?? []) {
    const method = target.methods?.[item.fn] ?? item.fn;
    if (new RegExp(`\\bthis\\.${method}\\s*\\(`, 'u').test(code)) continue;
    const named = item.steps.map(step => `"${step}"`).join(', ');
    issues.push({ code: 'M4_PAGE_JOURNEY_UNCALLED', severity: 'error', always: true, message: `The journey step${item.steps.length > 1 ? 's' : ''} ${named} need${item.steps.length > 1 ? '' : 's'} ${method}, and nothing calls it: the shared does not start it and the page never calls this.${method}(…). Wire it to the control that does that step (the typed value of a search field, a load-more action, a button), as its JSDoc in the shared declaration describes.` });
  }

  // Intents.
  for (const [organism, row] of Object.entries(target.page11.organisms)) {
    for (const intent of row.intents) {
      const method = target.methods?.[intent.id] ?? intent.id;
      if (!new RegExp(`\\bthis\\.${method}\\s*\\(`, 'u').test(code)) push('M4_PAGE_INTENT', `Intent ${intent.id} of ${organism} must call this.${method}(…).`);
    }
  }

  // i18n.
  const start = text.indexOf('/// **collab_i18n_start**');
  const end = text.indexOf('/// **collab_i18n_end**');
  if (start < 0 || end < start) push('M4_PAGE_I18N', 'The catalogue must sit between /// **collab_i18n_start** and /// **collab_i18n_end**.');
  for (const locale of target.locales) {
    if (!new RegExp(`\\bconst\\s+pageMessage_${locale}\\b`, 'u').test(code)) push('M4_PAGE_I18N', `Locale ${locale} needs const pageMessage_${locale}.`);
  }
  const extra = [...code.matchAll(/\bconst\s+pageMessage_([a-z]{2})\b/gu)].map(match => match[1]).filter(locale => !target.locales.includes(locale));
  if (extra.length) push('M4_PAGE_I18N', `Locales [${extra.join(', ')}] are not product languages; declare only ${target.locales.join(', ')}.`);
  // The NAMES are the contract (@@addLanguage and the Studio text editor look for them); the compiler checks
  // the types. Any declaration form is accepted (01/10/2026: the exact-text check refused valid variants).
  if (!/\btype\s+PageMessageType\b/u.test(code)) push('M4_PAGE_I18N', 'Declare the catalogue type: type PageMessageType = typeof pageMessage_<default locale>;');
  if (!/\b(?:const|let)\s+pageMessages\b/u.test(code)) push('M4_PAGE_I18N', "Declare the catalogue map: const pageMessages: { [key: string]: PageMessageType } = { '<lang>': pageMessage_<lang> };");
  if (!/^[ \t]*(?:(?:private|protected|public|readonly)\s+)*msg\s*[!?]?\s*[:=]/mu.test(code)) push('M4_PAGE_I18N', 'Declare the catalogue field in the class: private msg: PageMessageType = pageMessage_<default locale>;');
  if (!/\brender\s*\(\s*\)\s*(?::[^{]+)?\{\s*this\.msg\s*=\s*pageMessages\[\s*this\.getMessageKey\(\s*pageMessages\s*\)\s*\]\s*;/u.test(code)) push('M4_PAGE_I18N', 'The first statement of render() must be this.msg = pageMessages[this.getMessageKey(pageMessages)];');
  if (start >= 0 && end > start && /\bas\s+const\b/u.test(text.slice(start, end))) push('M4_PAGE_I18N', 'Never as const on a catalogue.');

  // Visible literal text outside the catalogue.
  const body = start >= 0 && end > start ? code.replace(stripComments(text.slice(start, end)), '') : code;
  for (const template of htmlTemplates(body)) {
    const outsideExpressions = withoutExpressions(template);
    for (const match of outsideExpressions.matchAll(/>([^<>]*\p{L}{2,}[^<>]*)</gu)) push('M4_PAGE_TEXT', `Literal text "${match[1].trim()}" in a template; use this.msg['…'].`);
    for (const match of outsideExpressions.matchAll(/\b(title|aria-label|placeholder|alt|header|label)=["']([^"']*\p{L}{2,}[^"']*)["']/gu)) push('M4_PAGE_TEXT', `Literal ${match[1]}="${match[2]}"; use \${this.msg['…']}.`);
  }

  // Style.
  if (new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|divide|placeholder|shadow|accent|caret|decoration)-(?:${PALETTE})(?:-\\d{2,3})?\\b`, 'u').test(code)) push('M4_PAGE_STYLE', 'Palette color classes are not allowed; use the design tokens.');
  if (/\bdark:/u.test(code)) push('M4_PAGE_STYLE', 'No dark: variants; dark mode lives in the tokens.');
  if (/-\[#|#[0-9a-fA-F]{3,8}\b/u.test(body.replace(/'#[^']*'|"#[^"]*"/gu, ''))) push('M4_PAGE_STYLE', 'No #hex colors; use var(--token, transparent|currentColor).');
  if (/\bstyle=["'][^"']*(?:color|background|border)/u.test(code)) push('M4_PAGE_STYLE', 'No inline style colors; use Tailwind classes with tokens.');
  if (/\.(?:less|css)['"]/u.test(code)) push('M4_PAGE_STYLE', 'No stylesheet import.');
  const tokens = new Set(target.tokens);
  for (const match of code.matchAll(/var\(--([a-z0-9-]+)(?:\s*,\s*([^)\]]+))?\)/gu)) {
    const name = match[1].replace(TOKEN_VARIANTS, '');
    if (!name.startsWith('ml-') && !tokens.has(name)) push('M4_PAGE_TOKEN', `Token --${match[1]} is not in the design system.`);
    if (match[2] !== undefined && !FALLBACKS.has(match[2].trim())) push('M4_PAGE_TOKEN', `Fallback "${match[2].trim()}" of --${match[1]} assumes a theme; use transparent for -bg and currentColor for text and borders.`);
  }
  return dedupe(issues);
}

/** Contents of the html`…` templates of comment-free code (nested templates are separate entries). */
export function htmlTemplates(code: string): string[] {
  const found: string[] = [];
  const re = /\bhtml`/gu;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code))) {
    let i = match.index + match[0].length;
    let depth = 0;
    let out = '';
    while (i < code.length) {
      const ch = code[i];
      if (ch === '\\') { out += ch + (code[i + 1] ?? ''); i += 2; continue; }
      if (depth === 0 && ch === '`') break;
      if (ch === '$' && code[i + 1] === '{') { depth += 1; out += '${'; i += 2; continue; }
      if (depth > 0 && ch === '{') depth += 1;
      if (depth > 0 && ch === '}') depth -= 1;
      out += ch;
      i += 1;
    }
    found.push(out);
  }
  return found;
}

/**
 * The Scenes of the host in order, each with the code reachable from it: its inline content plus the
 * bodies of the `this.render…()` methods it calls, transitively.
 */
export function sceneContents(code: string): Array<{ id: string; reachable: string }> {
  const out: Array<{ id: string; reachable: string }> = [];
  for (const match of code.matchAll(/<Scene\b[^>]*\bvalue=["']([A-Za-z0-9_-]+)["'][^>]*>([\s\S]*?)<\/Scene>/gu)) {
    const parts = [match[2]];
    const seen = new Set<string>();
    const queue = [...match[2].matchAll(/\bthis\.(render[A-Za-z0-9_]*)\s*\(/gu)].map(call => call[1]);
    while (queue.length) {
      const name = queue.shift()!;
      if (seen.has(name)) continue;
      seen.add(name);
      const body = renderMethodBody(code, name);
      if (body === null) continue;
      parts.push(body);
      for (const call of body.matchAll(/\bthis\.(render[A-Za-z0-9_]*)\s*\(/gu)) queue.push(call[1]);
    }
    out.push({ id: match[1], reachable: parts.join('\n') });
  }
  return out;
}

function renderMethodBody(code: string, name: string): string | null {
  const head = new RegExp(`^[ \\t]*(?:public\\s+|private\\s+|protected\\s+)?${name}\\s*\\([^)]*\\)\\s*(?::[^{\\n]+)?\\{`, 'mu').exec(code);
  if (!head) return null;
  let depth = 1;
  let i = head.index + head[0].length;
  const start = i;
  while (i < code.length && depth > 0) { if (code[i] === '{') depth += 1; else if (code[i] === '}') depth -= 1; i += 1; }
  return code.slice(start, i - 1);
}

/** The static part of a template: every `${…}` (at any nesting depth) becomes one space. */
export function withoutExpressions(template: string): string {
  let out = '';
  let depth = 0;
  for (let i = 0; i < template.length; i += 1) {
    const ch = template[i];
    if (ch === '$' && template[i + 1] === '{') { if (depth === 0) out += ' '; depth += 1; i += 1; continue; }
    if (depth > 0) {
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      continue;
    }
    out += ch;
  }
  return out;
}

function stripComments(code: string): string {
  let out = '';
  let i = 0;
  let quote = '';
  while (i < code.length) {
    const ch = code[i];
    if (quote) {
      out += ch;
      if (ch === '\\') { out += code[i + 1] ?? ''; i += 2; continue; }
      if (ch === quote) quote = '';
      i += 1;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; out += ch; i += 1; continue; }
    if (ch === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i += 1; continue; }
    if (ch === '/' && code[i + 1] === '*') { const close = code.indexOf('*/', i + 2); i = close < 0 ? code.length : close + 2; continue; }
    out += ch;
    i += 1;
  }
  return out;
}

function dedupe(issues: M4PageIssue[]): M4PageIssue[] {
  const seen = new Set<string>();
  return issues.filter(item => { const key = `${item.code}|${item.message}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
