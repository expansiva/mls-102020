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

import { parsePreviousI18n } from './cfeSharedScaffold.js';

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
  /** The page defs `definition` object (reduced shape: pageId, baseClassName, actor, purpose, …). */
  data: unknown;
  /** mls ref of the shared .ts this page extends. */
  sharedTsRef: string;
  /** Content of the shared .ts — read for its locale list. */
  sharedSource: string;
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
  const baseClassName = stringOf(data.baseClassName);
  if (!baseClassName) return { code: null, reason: 'defs has no baseClassName' };

  const locales = localesOf(input.sharedSource);
  if (locales.length === 0) return { code: null, reason: `shared ${input.sharedTsRef} has no i18n block` };

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
    ? `import { type ${baseClassName} as Host, messages as sharedMessages, type MessageType } from '${sharedImport}';`
    : `import { ${baseClassName}, messages as sharedMessages, type MessageType } from '${sharedImport}';`);
  for (const organism of current ? [] : organisms) {
    lines.push(`import { ${organismRenderName(organism.organism)} } from '/_${parsed.project}_/l2/${parsed.folder}/${organismShortName(parsed.shortName, organism.n)}.js';`);
  }
  lines.push(`// to implement: add \`import type { … } from '${sharedImport}';\` for the DTO types you use.`);
  // Charts are one import away, and the model has no other way to learn the path. The directive carries
  // the whole lifecycle (init, resize, dispose), which is what lets a render-only page draw one at all.
  lines.push(`// to implement (only if this file charts something): \`import { chart } from '/_102033_/l2/shared/chartRuntime.js';\``);
  lines.push('');
  lines.push('const sharedFallback = sharedMessages[Object.keys(sharedMessages)[0]];');
  lines.push('');
  lines.push('/// **collab_i18n_start**');
  // Shared text is mapped ONCE with the locale as a parameter. Writing the mapping per locale cost 48
  // near-identical lines in a single organism (16 keys x 3 locales) — mechanical text paid for three times.
  lines.push('// Text from the shared catalog, mapped ONCE — the locale is the parameter. Reference it, never');
  lines.push('// inline the string: the reference is what keeps this file translated. Use SHORT keys:');
  lines.push(`//   'orders.empty': m['intent.<page>.<bff>.list.empty'],`);
  lines.push('const fromShared = (m: MessageType) => ({');
  lines.push(`  ${MARKER}`);
  lines.push('});');

  locales.forEach((locale, index) => {
    const isDefault = index === 0;
    const suffix = constSuffix(locale);
    lines.push(`const ${prefix}Message_${suffix}${isDefault ? '' : `: ${msgType}`} = {`);
    lines.push(`  ...fromShared(sharedMessages['${locale}'] ?? sharedFallback),`);
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

/** Locales declared by the shared i18n block, default first (its `message_*` consts are emitted in order). */
export function localesOf(sharedSource: string): string[] {
  return Array.from(parsePreviousI18n(sharedSource).keys());
}

/** The i18n keys the shared offers, for the prompt to list as the menu the page picks from. */
export function sharedI18nKeys(sharedSource: string): string[] {
  const byLocale = parsePreviousI18n(sharedSource);
  const first = byLocale.values().next();
  return first.done ? [] : Object.keys(first.value);
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
