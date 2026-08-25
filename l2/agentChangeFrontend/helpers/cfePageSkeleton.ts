/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageSkeleton.ts" enhancement="_blank"/>

/**
 * Deterministic page skeleton§3).
 *
 * The page LLM used to write the whole file from scratch and re-derive the mechanical parts every time —
 * and got them wrong: relative imports (run18), module-prefixed DTO names, `nothing` used without being
 * imported. Worse, the i18n vocabulary lived in the shared `.d.ts`, an indirection that produced 34
 * hardcoded English literals in a file that compiled clean the moment the vocabulary went missing.
 *
 * Here the mechanical parts are emitted mechanically: header, imports, the i18n block for EVERY locale the
 * shared declares, and the language-cached `msg` getter. The model fills the markers and returns the file.
 *
 * A page too large for one call is SPLIT into organisms: each becomes `<page>_O<n>.ts` exporting ONE render
 * function, and the page imports and composes them. Organisms are plain functions taking the page as
 * `host` — no class, no inheritance: every shared member they need is public, and the i18n catalog lives in
 * module scope, so nothing about the page's own shape changes.
 *
 * PURE — no `mls.*`, no filesystem. Both callers use it (Studio agentCfeMaterializeGen and the Node CLI
 * nodejsMaterializeL2) and it is unit-tested with `node --test` without any runtime, which is what makes
 * the skeleton verifiable before touching an agent.
 */

import { parsePreviousI18n, parseSharedI18nCatalogue } from './cfeSharedScaffold.js';

/** One organism of a split page. The FILE is `<page>_O<n>.ts`; the name lives here, not in the file name. */
export interface PageOrganism {
  /** 1-based position, and the only thing in the file name. */
  n: number;
  /** Short organism name — drives the exported function name (`delayRisk` -> `renderDelayRisk`). */
  organism: string;
  /** dataBinding commands this organism owns. */
  bindings: string[];
}

export interface PageSkeletonInput {
  /** mls ref of the PAGE: _<project>_/l2/<module>/web/desktop/<genome>/<page>.ts */
  outputPath: string;
  /** The page defs `definition` — object (page21/31) or prose string (page11). */
  data: unknown;
  /** mls ref of the shared .ts this page extends. */
  sharedTsRef: string;
  /** Content of the shared .ts — read for the DTO types the page imports from it. */
  sharedSource: string;
  /**
   * The shared `.defs.ts` `definition` object. The i18n catalogue lives in the pages
   * now, but it is still PLANNED in the shared defs, so this is where the locales and
   * the default-language text come from. Without it the skeleton cannot be built:
   * inventing the text is what put hardcoded English in files that compiled clean.
   */
  sharedDefsData?: unknown;
  /**
   * Content of the file being overwritten — the PAGE's own `.ts`, or the ORGANISM's
   * `.ts` when building an organism. Translations already made are carried over per
   * key from it; regenerating must never drop a hand-made translation.
   */
  previousSource?: string;
  /** Set when the page was split; every organism, in order. */
  organisms?: PageOrganism[];
  /** Build the skeleton for THIS organism instead of for the page. */
  current?: number;
}

export interface PageSkeletonResult {
  code: string | null;
  reason?: string;
}

const MARKER = '/* to implement */';

/**
 * Marks a locale const whose text is still the default language. `@@addLanguage` queues a file when a
 * requested locale is missing OR carries this marker, and REMOVES the marker when it writes the
 * translated block back — the translation is what consumes it.
 *
 * The skeleton only ever PROPAGATES it. It cannot recompute it: after the first generation every key
 * exists in every locale const, so "the key was not carried over" is only ever true once. And comparing
 * the text to the default would misread a legitimately identical translation ('Status' in pt).
 */
export const I18N_UNTRANSLATED_MARKER = 'collab_untranslated';

/** Locales whose const in `source` still carries the untranslated marker. */
export function untranslatedLocales(source: string | undefined, constPrefix: string): Set<string> {
  const out = new Set<string>();
  if (!source) return out;
  const start = source.indexOf('/// **collab_i18n_start**');
  const end = source.indexOf('/// **collab_i18n_end**');
  if (start < 0 || end < 0 || end < start) return out;
  const re = new RegExp(`const\\s+${constPrefix}_([A-Za-z0-9_]+)[^\\n]*${I18N_UNTRANSLATED_MARKER}`, 'gu');
  for (const match of source.slice(start, end).matchAll(re)) {
    out.add(match[1].replace(/_/gu, '-').toLowerCase());
  }
  return out;
}

/** `<page>_O<n>` — the file name carries the position only; the organism name lives in the pipeline item. */
export function organismShortName(pageShortName: string, n: number): string {
  return `${pageShortName}_O${n}`;
}

/**
 * `delayRisk` -> `renderDelayRisk`. DETERMINISTIC on both sides, which is the whole point: the page can
 * import and call it without ever reading the generated organism. When the page had to guess the names it
 * re-implemented every organism from scratch and timed out (paginaDividida.md §9).
 */
export function organismRenderName(organism: string): string {
  const safe = organism.replace(/[^A-Za-z0-9]+/gu, ' ').trim().split(/\s+/u).map(capitalize).join('');
  return `render${safe || 'Organism'}`;
}

export function buildPageSkeleton(input: PageSkeletonInput): PageSkeletonResult {
  const parsed = parseOutputPath(input.outputPath);
  if (!parsed) return { code: null, reason: `outputPath is not an l2 page ref: ${input.outputPath}` };

  const data = isRecord(input.data) ? input.data : {};
  const shared = isRecord(input.sharedDefsData) ? input.sharedDefsData : {};
  const baseClassName = stringOf(data.baseClassName) || stringOf(shared.baseClassName);
  if (!baseClassName) return { code: null, reason: 'defs has no baseClassName' };

  // The catalogue is planned in the shared DEFS and emitted here: the shared .ts no
  // longer carries an i18n block, so reading the locale list from it would silently
  // fall through to "model writes the whole file", i18n included.
  const catalogue = parseSharedI18nCatalogue(input.sharedDefsData);
  if (!catalogue) return { code: null, reason: `shared defs of ${input.sharedTsRef} has no i18n catalogue` };
  const locales = catalogue.runtimeLocales;
  if (locales.length === 0) return { code: null, reason: `shared defs of ${input.sharedTsRef} declares no locale` };

  const organisms = input.organisms ?? [];
  const current = input.current ? organisms.find(item => item.n === input.current) : undefined;
  if (input.current && !current) return { code: null, reason: `no organism ${input.current} in the split plan` };

  // LEADING SLASH is mandatory: mls refs travel without it ('_102045_/l2/…') but a runtime import must be
  // '/_102045_/l2/…'. Emitting it unrooted made the module unresolvable (TS2307), which then took down the
  // decorator (TS1238) and every member access in the file — 577 errors from one missing character.
  const sharedImport = `/${input.sharedTsRef.replace(/^\/+/u, '').replace(/\.ts$/u, '.js')}`;
  const fileRef = current
    ? `_${parsed.project}_/l2/${parsed.folder}/${organismShortName(parsed.shortName, current.n)}.ts`
    : input.outputPath;
  const prefix = current ? `o${current.n}` : 'page';
  const msgType = current ? `O${current.n}Msg` : 'PageMessageType';

  const lines: string[] = [
    `/// <mls fileReference="${fileRef}" enhancement="_102020_/l2/enhancementAura"/>`,
    '',
    `import { html, nothing } from 'lit';`,
  ];
  if (!current) lines.push(`import { customElement } from 'lit/decorators.js';`);
  // An organism takes the page as `host`: every shared member it needs (@property fields, handlers) is
  // public, so a plain function reaches them and no class — and no inheritance — is required.
  lines.push(current
    ? `import { type ${baseClassName} as Host } from '${sharedImport}';`
    : `import { ${baseClassName} } from '${sharedImport}';`);
  for (const organism of current ? [] : organisms) {
    lines.push(`import { ${organismRenderName(organism.organism)} } from '/_${parsed.project}_/l2/${parsed.folder}/${organismShortName(parsed.shortName, organism.n)}.js';`);
  }
  lines.push(`// to implement: add \`import type { … } from '${sharedImport}';\` for the DTO types you use.`);
  // Charts are one import away, and the model has no other way to learn the path. The directive carries
  // the whole lifecycle (init, resize, dispose), which is what lets a render-only page draw one at all.
  lines.push(`// to implement (only if this file charts something): \`import { chart } from '/_102033_/l2/shared/chartRuntime.js';\``);
  lines.push('');
  lines.push('/// **collab_i18n_start**');
  // The whole catalogue is emitted here, one const per locale, straight from the shared defs. The model
  // adds only the keys it invents: a literal it copies is text that stops being translated.
  lines.push('// The catalogue of this page. The keys below come from the module plan — do NOT edit their');
  lines.push('// text and do NOT inline a string in the template: reference a key, or add your own SHORT');
  lines.push(`//   key here (in EVERY locale) — 'orders.empty': 'No orders yet',`);
  const previousText = parsePreviousI18n(input.previousSource, `${prefix}Message`);
  const stillUntranslated = untranslatedLocales(input.previousSource, `${prefix}Message`);
  locales.forEach((locale, index) => {
    const isDefault = index === 0;
    const suffix = constSuffix(locale);
    // Carried over per key: a translation already made in this file survives the regenerate. A key with
    // no prior translation starts as the default-locale text, which @@addLanguage then translates.
    const previous = previousText.get(locale) || {};
    const body: string[] = [];
    // A key with no prior text starts as the default-locale text; a locale with NO prior catalogue at all
    // is untranslated by construction. Otherwise the marker is whatever the previous file said: only
    // @@addLanguage clears it, because only it knows a translation actually happened.
    let untranslated = !isDefault && (Object.keys(previous).length === 0 || stillUntranslated.has(locale));
    for (const [key, text] of Object.entries(catalogue.i18n)) {
      const carried = isDefault ? undefined : previous[key];
      if (!isDefault && carried === undefined) untranslated = true;
      body.push(`  '${escapeSingle(key)}': '${escapeSingle(carried ?? text)}',`);
    }
    // The marker is how @@addLanguage knows this locale still holds default-language text. Detecting it
    // by "the const is missing" cannot work: every locale is emitted from birth, so a half-translated
    // catalogue looked complete and was skipped whole — that is why a Portuguese catalogue kept English
    // column labels.
    const marker = untranslated ? ` // ${I18N_UNTRANSLATED_MARKER}` : '';
    lines.push(`const ${prefix}Message_${suffix}${isDefault ? '' : `: ${msgType}`} = {${marker}`);
    lines.push(...body);
    lines.push(isDefault
      ? '  // The copy you invent, with short keys. Only this part repeats per language.'
      : `  // The SAME invented keys as ${prefix}Message_${constSuffix(locales[0])}, translated to ${locale}.`);
    lines.push(`  ${MARKER}`);
    lines.push('};');
    // Only the default locale is inferred; the others are annotated so a forgotten key is TS2741 and a
    // typo is TS2353 — the compiler enforces locale parity instead of a gate.
    if (isDefault) lines.push(`type ${msgType} = typeof ${prefix}Message_${suffix};`);
  });

  const entries = locales.map(locale => `'${locale}': ${prefix}Message_${constSuffix(locale)}`).join(', ');
  lines.push(`const ${prefix}Messages: { [key: string]: ${msgType} } = { ${entries} };`);
  lines.push('/// **collab_i18n_end**');
  lines.push('');
  lines.push(`const ${prefix}Fallback = ${prefix}Messages[Object.keys(${prefix}Messages)[0]];`);
  lines.push('');

  if (current) {
    lines.push(`/** ${current.organism} — ${current.bindings.join(', ')} */`);
    // NO explicit return type, on purpose: a branch returning the Lit sentinel `nothing` is not a
    // TemplateResult (TS2322), and the model gets that annotation wrong every time it is asked for one.
    lines.push(`export function ${organismRenderName(current.organism)}(host: Host) {`);
    lines.push(`  const msg = ${prefix}Messages[host.getMessageKey(${prefix}Messages)] || ${prefix}Fallback;`);
    lines.push('  // State and handlers come from `host` (host.<state>, host.handle<X>) — the shared owns them.');
    lines.push(`  ${MARKER}`);
    lines.push('  return html``;');
    lines.push('}');
    lines.push('');
    lines.push('/* Helpers stay INSIDE this file and are NOT exported: exactly one render function leaves it. */');
    lines.push('');
    return { code: lines.join('\n') };
  }

  lines.push(`@customElement('${convertFileToTag(parsed)}')`);
  lines.push(`export class ${pageClassName(parsed, baseClassName)} extends ${baseClassName} {`);
  lines.push('  #msgLang: string | null = null;');
  lines.push(`  #msgCache: ${msgType} = ${prefix}Fallback;`);
  lines.push('');
  lines.push('  /** i18n catalog — resolved once per language, refreshed only when the document language changes. */');
  lines.push(`  protected get msg(): ${msgType} {`);
  lines.push(`    const lang = (document.documentElement.lang || '').toLowerCase();`);
  lines.push('    if (lang !== this.#msgLang) {');
  lines.push('      this.#msgLang = lang;');
  lines.push(`      this.#msgCache = ${prefix}Messages[this.getMessageKey(${prefix}Messages)] || ${prefix}Fallback;`);
  lines.push('    }');
  lines.push('    return this.#msgCache;');
  lines.push('  }');
  lines.push('');
  lines.push(organisms.length
    ? '  /** Main render. Compose the page from the organisms — never re-implement what they already render. */'
    : '  /** Main render. Split the page into render<Name>() methods and call them from here. */');
  lines.push('  render() {');
  lines.push('    const msg = this.msg;');
  if (organisms.length) {
    lines.push('    // Already implemented and imported above — CALL them, in the order that composes the page:');
    for (const organism of organisms) {
      lines.push(`    //   ${organismRenderName(organism.organism)}(this)   [${organism.bindings.join(', ')}]`);
    }
  }
  lines.push(`    ${MARKER}`);
  lines.push('    return html``;');
  lines.push('  }');
  lines.push('');
  lines.push(organisms.length
    ? '  /* to implement: ONLY what no organism covers (page title, layout chrome). No return type. */'
    : '  /* to implement: one render<Name>() per organism, called from render(). No return type: let TypeScript infer it. */');
  lines.push('}');
  lines.push('');
  return { code: lines.join('\n') };
}

/** Locales the module declares, default first — read from the shared DEFS, which is where they are planned. */
export function localesOf(sharedDefsData: unknown): string[] {
  return parseSharedI18nCatalogue(sharedDefsData)?.runtimeLocales ?? [];
}

/** The i18n keys the page catalogue is built from, for the prompt to list as the vocabulary it references. */
export function sharedI18nKeys(sharedDefsData: unknown): string[] {
  const catalogue = parseSharedI18nCatalogue(sharedDefsData);
  return catalogue ? Object.keys(catalogue.i18n) : [];
}

/** Single quotes are the emission's own delimiter, so only they (and the escape) need escaping. */
function escapeSingle(value: string): string {
  return value.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'");
}

interface ParsedPagePath { project: number; folder: string; shortName: string; genome: string }

function parseOutputPath(ref: string): ParsedPagePath | null {
  const match = /^_(\d+)_\/l2\/(.+)\/([A-Za-z0-9_]+)\.ts$/u.exec(ref);
  if (!match) return null;
  const folder = match[2];
  const genome = folder.split('/').pop() || '';
  if (!/^page\d+$/u.test(genome)) return null;
  return { project: Number(match[1]), folder, shortName: match[3], genome };
}

/**
 * Same rule as mls-102041 `convertFileToTag` (legacy form, since generated shortNames are camelCase):
 * kebab(folder) with '/' -> '--', then kebab(shortName)-<project>.
 */
function convertFileToTag(parsed: ParsedPagePath): string {
  return `${toKebab(parsed.folder).replace(/\//gu, '--')}--${toKebab(parsed.shortName)}-${parsed.project}`;
}

/** `<Base without trailing 'Base'><Desktop><Page11>…Page` — matches what the LLM has been emitting. */
function pageClassName(parsed: ParsedPagePath, baseClassName: string): string {
  const root = baseClassName.replace(/Base$/u, '');
  const page = capitalize(parsed.shortName);
  const stem = root.endsWith(page) ? root.slice(0, root.length - page.length) : root;
  const surface = parsed.folder.split('/').slice(-2).map(capitalize).join('');
  return `${stem}${surface}${page}Page`;
}

function toKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function constSuffix(locale: string): string {
  return locale.replace(/[^a-zA-Z0-9]+/gu, '_');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
