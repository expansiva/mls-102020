/// <mls fileReference="_102020_/l2/aura/agentManageLanguages/helpers/addLanguageCore.ts" enhancement="_blank"/>

/**
 * Pure decisions of agentAddLanguage: which files hold a translatable catalogue, which locales of one
 * still need translating, and how a translated block replaces the old one.
 *
 * PURE — no `mls.*`, no filesystem, no model. The agent keeps the IO; this file is what a unit test can
 * exercise, which is the only way the queueing rule gets verified before a run touches 100 files.
 *
 * The marker contract is owned by the emitter (`agentMaterializeL2/helpers/cfePageSkeleton.ts`) and
 * imported from there on purpose: two copies of the same literal would drift the moment one side changed.
 */

import { I18N_UNTRANSLATED_MARKER, untranslatedLocales } from '/_102020_/l2/agentMaterializeL2/helpers/cfePageSkeleton.js';

export { I18N_UNTRANSLATED_MARKER };

const START_MARKER = '/// **collab_i18n_start**';
const END_MARKER = '/// **collab_i18n_end**';

/** Const prefixes a page catalogue uses: the page itself, and one per organism of a split page. */
const CATALOGUE_CONST_RE = /const\s+(pageMessage|o\d+Message)_[A-Za-z0-9_]+\s*(?::\s*[A-Za-z0-9_]+\s*)?=/u;

/**
 * The folders a module's catalogues live in. The i18n block moved from `<module>/web/shared` to the
 * pages, and organisms of a split page live in the same page folders — so the target is every
 * `<module>/web/{desktop,mobile}/page*`, never the shared (it has no catalogue any more). Mobile pages
 * carry their own catalogue, in the same format as desktop.
 */
export function isPageCatalogueFolder(folder: string, moduleName: string): boolean {
  return new RegExp(`^${escapeRegExp(moduleName)}/web/(?:desktop|mobile)/page\\d+$`, 'u').test(folder);
}

/** A generated page or organism, never a typecheck test or a defs file. */
export function isPageCatalogueFileName(shortName: string, extension: string): boolean {
  return extension === '.ts' && !shortName.endsWith('.test') && !shortName.endsWith('.defs');
}

/** The file carries a catalogue this agent can translate. */
export function hasPageCatalogue(source: string): boolean {
  const block = extractI18nBlock(source);
  return block !== null && CATALOGUE_CONST_RE.test(block);
}

export interface QueueDecision {
  /** Locales to send to the translator; empty means the file is skipped. */
  languages: string[];
  reason: 'missing' | 'untranslated' | 'force' | 'complete' | 'noCatalogue';
}

/**
 * Which of the requested locales still need translating.
 *
 * A locale qualifies when its const is ABSENT or still carries the untranslated marker. Presence alone
 * is not evidence of translation: the emitter writes EVERY runtime locale from birth, copying the
 * default text, so the old "is the locale missing?" test skipped every file it should have translated —
 * that is the root cause of English column labels inside a Portuguese catalogue.
 */
export function decideQueue(source: string, requested: string[], force = false): QueueDecision {
  if (!hasPageCatalogue(source)) return { languages: [], reason: 'noCatalogue' };
  if (force) return { languages: [...requested], reason: 'force' };

  const block = extractI18nBlock(source) || '';
  const pending = new Set<string>();
  for (const prefix of cataloguePrefixes(block)) {
    for (const locale of untranslatedLocales(source, prefix)) pending.add(locale);
  }

  const missing = requested.filter(locale => !hasLocaleInBlock(block, locale));
  const untranslated = requested.filter(locale => pending.has(normalizeLocale(locale)));
  const languages = requested.filter(locale => missing.includes(locale) || untranslated.includes(locale));
  if (languages.length === 0) return { languages: [], reason: 'complete' };
  return { languages, reason: missing.length > 0 ? 'missing' : 'untranslated' };
}

export interface PageSource {
  fileReference: string;
  source: string;
}

export interface PendingPage {
  languages: string[];
  fileReference: string;
}

export interface PendingScan {
  pending: PendingPage[];
  /** Files that hold a catalogue — the module's translatable pages. */
  pages: number;
  complete: number;
  noCatalogue: number;
  /** Pages whose written block is broken (see `isBrokenBlock`): repaired in place, never sent to the model. */
  broken: string[];
}

/** `decideQueue` over every page of a module: what the agent queues and how many pages the module has. */
export function collectPending(pages: PageSource[], requested: string[], force = false): PendingScan {
  const scan: PendingScan = { pending: [], pages: 0, complete: 0, noCatalogue: 0, broken: [] };
  for (const page of pages) {
    if (!page.source) continue;
    const block = extractI18nBlock(page.source);
    if (block && isBrokenBlock(block)) {
      scan.pages += 1;
      scan.broken.push(page.fileReference);
      continue;
    }
    const decision = decideQueue(page.source, requested, force);
    if (decision.reason === 'noCatalogue') { scan.noCatalogue += 1; continue; }
    scan.pages += 1;
    if (decision.languages.length === 0) { scan.complete += 1; continue; }
    scan.pending.push({ languages: decision.languages, fileReference: page.fileReference });
  }
  return scan;
}

/**
 * What adding languages does to one module:
 * - `noDefs`: no `module.defs.ts` (or one without languages) — ignored, there is nowhere to record the language;
 * - `noPages`: no page holds a catalogue yet — ignored, the materializer writes every locale at birth;
 * - `complete`: the defs lists every language and no page is pending — nothing to do;
 * - `configOnly`: the pages are translated, only the defs lacks the language — write the defs, no agent;
 * - `translate`: pages pending — run the agent, and write the defs when `addToDefs` is not empty.
 *
 * `broken` pages are repaired in place before anything else, whatever the kind: a module with broken
 * pages and nothing else to do is `translate`-free but still actionable (see `isPlanActionable`).
 */
export type ModuleLanguagePlanKind = 'noDefs' | 'noPages' | 'complete' | 'configOnly' | 'translate';

export interface ModuleLanguagePlan {
  moduleName: string;
  kind: ModuleLanguagePlanKind;
  /** Requested languages the module's defs does not list yet. */
  addToDefs: string[];
  pages: number;
  pending: PendingPage[];
  broken: string[];
  /**
   * The languages the module will list once the run is done (defs + `addToDefs`). The app shows what
   * l5/config.json lists, so `runtimeStale` says that list differs and must be written too.
   */
  languages: string[];
  runtimeStale: boolean;
}

export function isPlanActionable(plan: ModuleLanguagePlan): boolean {
  return plan.kind === 'translate' || plan.kind === 'configOnly' || plan.broken.length > 0 || plan.runtimeStale;
}

/**
 * `defsLanguages` is the module's own list (`null` when the defs is missing or carries no language) — never
 * the legacy project fallback, which would make a module without defs look configured.
 */
export function planModuleLanguages(input: {
  moduleName: string;
  defsLanguages: string[] | null;
  requested: string[];
  pages: PageSource[];
  force?: boolean;
  /** The module's list in l5/config.json; `null` when the module is not registered there (nothing to keep in step). */
  runtimeLanguages?: string[] | null;
}): ModuleLanguagePlan {
  const { moduleName, defsLanguages, requested } = input;
  const empty = { moduleName, addToDefs: [], pages: 0, pending: [], broken: [], languages: defsLanguages ?? [], runtimeStale: false };
  if (!defsLanguages || defsLanguages.length === 0) return { ...empty, kind: 'noDefs' };

  const scan = collectPending(input.pages, requested, input.force === true);
  if (scan.pages === 0) return { ...empty, kind: 'noPages' };

  const addToDefs = requested.filter(code => !defsLanguages.includes(code));
  const languages = [...defsLanguages, ...addToDefs];
  const runtime = input.runtimeLanguages ?? null;
  const runtimeStale = runtime !== null && JSON.stringify(runtime) !== JSON.stringify(languages);
  const base = { moduleName, addToDefs, pages: scan.pages, pending: scan.pending, broken: scan.broken, languages, runtimeStale };
  if (scan.pending.length > 0) return { ...base, kind: 'translate' };
  return { ...base, kind: addToDefs.length > 0 ? 'configOnly' : 'complete' };
}

/**
 * The file a translation step writes to. It comes from the step's own args (`{ languages, fileReference }`,
 * set when the step was queued), never from the model: the model only echoes it and has been seen moving it
 * out of `result`. The model's echo — in `result` or beside it — is a fallback for a step without args.
 */
export function stepFileReference(stepPrompt: string | undefined, payload: unknown): string {
  try {
    const args = stepPrompt ? JSON.parse(stepPrompt) : null;
    if (args && typeof args.fileReference === 'string' && args.fileReference) return args.fileReference;
  } catch { /* not the args JSON: fall back to the model's echo */ }
  const p = (payload ?? {}) as { fileReference?: unknown; result?: { fileReference?: unknown } };
  const echoed = p.result?.fileReference ?? p.fileReference;
  return typeof echoed === 'string' ? echoed : '';
}

/** Every catalogue const prefix present in the block — a split page organism file uses `o<n>Message`. */
export function cataloguePrefixes(block: string): string[] {
  const found = new Set<string>();
  for (const match of block.matchAll(/const\s+(pageMessage|o\d+Message)_[A-Za-z0-9_]+/gu)) found.add(match[1]);
  return [...found];
}

export function extractI18nBlock(source: string): string | null {
  const start = source.indexOf(START_MARKER);
  const end = source.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) return null;
  return source.substring(start, end) + END_MARKER;
}

/** Locale key as written in the catalogue map (`{ 'pt-br': pageMessage_pt_br }`) or as a const suffix. */
export function hasLocaleInBlock(block: string, locale: string): boolean {
  const normalized = normalizeLocale(locale);
  const constSuffix = normalized.replace(/[^a-z0-9]+/gu, '_');
  return new RegExp(`['"]${escapeRegExp(normalized)}['"]\\s*:`, 'mu').test(block)
    || new RegExp(`const\\s+(?:pageMessage|o\\d+Message)_${escapeRegExp(constSuffix)}\\b`, 'mu').test(block);
}

export class TranslatedBlockError extends Error {
  readonly code = 'invalid_translated_block';
}

/**
 * Replaces the i18n block and CONSUMES the untranslated markers: the translation is what clears them, so
 * a translated file stops being queued on the next run.
 *
 * Guards what the model returns, because writing a broken block over a good file is worse than failing:
 * the block must still declare every catalogue const the previous one did, with its parity annotation.
 * That annotation is what turns a forgotten translation into a compile error instead of a silent hole.
 */
export function applyTranslatedI18nBlock(source: string, translatedBlock: string): string {
  const previous = extractI18nBlock(source);
  if (!previous) throw new TranslatedBlockError('the file has no i18n block to replace');
  const extracted = extractI18nBlock(translatedBlock);
  if (!extracted) throw new TranslatedBlockError('the translated block is not delimited by the i18n markers');
  // The model has been seen escaping the line breaks twice: the JSON string then decodes to `\` `n`.
  const next = unflattenBlock(extracted);
  if (!next.includes('\n')) {
    throw new TranslatedBlockError('the translated block has no line breaks: written on one line it would be a comment');
  }

  for (const declaration of constDeclarations(previous)) {
    if (!next.includes(declaration)) {
      throw new TranslatedBlockError(`the translated block dropped or renamed \`${declaration}\``);
    }
  }
  // A model keeps repeating `type PageMessageType = …` after the new locale. An exact repeat is dropped (it
  // changes nothing); a second, different declaration is still a duplicate identifier and is rejected.
  const deduped = restoreMissingTypeDeclarations(dropRepeatedTypeLines(next));
  const duplicated = duplicateDeclarations(deduped);
  if (duplicated.length > 0) {
    throw new TranslatedBlockError(`the translated block declares \`${duplicated[0]}\` more than once`);
  }
  // Every type the previous block declared must still be declared, and nothing used may be undeclared.
  for (const name of declaredTypeNames(previous)) {
    if (!declaredTypeNames(deduped).includes(name)) {
      throw new TranslatedBlockError(`the translated block dropped \`type ${name}\``);
    }
  }
  const undeclared = missingTypeDeclarations(deduped);
  if (undeclared.length > 0) {
    throw new TranslatedBlockError(`the translated block uses \`${undeclared[0].name}\` without declaring it`);
  }

  const cleaned = stripUntranslatedMarkers(deduped);
  return source.replace(/\/\/\/\s\*\*collab_i18n_start\*\*[\s\S]*?\/\/\/\s\*\*collab_i18n_end\*\*/gu, cleaned);
}

/** `const pageMessage_pt_br: PageMessageType =` — the name AND the annotation that enforces parity. */
export function constDeclarations(block: string): string[] {
  return [...block.matchAll(/const\s+(?:pageMessage|o\d+Message)_[A-Za-z0-9_]+\s*(?::\s*[A-Za-z0-9_]+\s*)?=/gu)]
    .map(match => match[0].replace(/\s+/gu, ' ').trim());
}

/**
 * A block whose line breaks are the two characters `\` `n` instead of real ones — what a model that escaped
 * its JSON twice produces. Written to a page, the whole block sits on the `/// **collab_i18n_start**` line and
 * becomes a comment: the page loses its catalogue while the locale still looks present.
 */
export function isFlattenedBlock(block: string): boolean {
  return !block.includes('\n') && block.includes('\\n');
}

/** Decodes a flattened block back to its lines; any other block is returned as is. */
export function unflattenBlock(block: string): string {
  if (!isFlattenedBlock(block)) return block;
  try {
    const decoded = JSON.parse(`"${block}"`);
    if (typeof decoded === 'string') return decoded;
  } catch { /* not valid JSON string content: decode the common escapes by hand */ }
  return block
    .replace(/\\r\\n|\\n/gu, '\n')
    .replace(/\\t/gu, '\t')
    .replace(/\\"/gu, '"');
}

/**
 * Types a locale const is annotated with (`const pageMessage_ja: PageMessageType =`) that the block never
 * declares — the model has been seen dropping `type PageMessageType = typeof …`, which breaks the compile.
 * `base` is the const the type is `typeof`: the first const of the same prefix WITHOUT an annotation (the
 * default locale, by the materializer's convention), or `null` when there is none.
 */
export function missingTypeDeclarations(block: string): { name: string; base: string | null }[] {
  const declared = new Set([...block.matchAll(/\btype\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gu)].map(m => m[1]));
  const missing = new Map<string, string | null>();
  for (const match of block.matchAll(/const\s+((pageMessage|o\d+Message)_[A-Za-z0-9_]+)\s*:\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gu)) {
    const [, , prefix, typeName] = match;
    if (declared.has(typeName) || missing.has(typeName)) continue;
    const base = block.match(new RegExp(`const\\s+(${prefix}_[A-Za-z0-9_]+)\\s*=`, 'u'));
    missing.set(typeName, base ? base[1] : null);
  }
  return [...missing.entries()].map(([name, base]) => ({ name, base }));
}

/** Declares every missing type right after the object of the const it is `typeof`; unrepairable ones stay missing. */
export function restoreMissingTypeDeclarations(block: string): string {
  let result = block;
  for (const { name, base } of missingTypeDeclarations(block)) {
    if (!base) continue;
    const start = result.search(new RegExp(`const\\s+${escapeRegExp(base)}\\s*=`, 'u'));
    if (start === -1) continue;
    // Catalogue objects are flat: the base const ends at the first `};` after it.
    const end = result.indexOf('};', start);
    if (end === -1) continue;
    const eol = result.includes('\r\n') ? '\r\n' : '\n';
    const at = end + 2;
    result = `${result.slice(0, at)}${eol}type ${name} = typeof ${base};${result.slice(at)}`;
  }
  return result;
}

/** A written block that would not compile or not be read: flattened, or a type used but never declared. */
export function isBrokenBlock(block: string): boolean {
  return isFlattenedBlock(block) || missingTypeDeclarations(block).length > 0;
}

/**
 * The page with its broken block repaired in place (decoded, exact type repeats dropped, missing types
 * declared), or `null` when there was nothing to repair. No model involved: the translations are kept.
 */
export function repairI18nBlock(source: string): string | null {
  const block = extractI18nBlock(source);
  if (!block || !isBrokenBlock(block)) return null;
  const fixed = restoreMissingTypeDeclarations(dropRepeatedTypeLines(unflattenBlock(block)));
  if (isBrokenBlock(fixed)) return null;
  return source.replace(block, () => fixed);
}

export function declaredTypeNames(block: string): string[] {
  return [...new Set([...block.matchAll(/\btype\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gu)].map(m => m[1]))];
}

/** Drops a one-line `type X = …;` that repeats, word for word, an earlier declaration of the same type. */
export function dropRepeatedTypeLines(block: string): string {
  const seen = new Map<string, string>();
  return block.split('\n').filter(line => {
    const match = line.match(/^\s*type\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=.*;\s*$/u);
    if (!match) return true;
    const normalized = line.replace(/\s+/gu, ' ').trim();
    const first = seen.get(match[1]);
    if (first === undefined) { seen.set(match[1], normalized); return true; }
    return first !== normalized;
  }).join('\n');
}

/** Names declared more than once (`const X` / `type X`) in the block. */
export function duplicateDeclarations(block: string): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const match of block.matchAll(/\b(const|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[:=]/gu)) {
    const name = `${match[1]} ${match[2]}`;
    if (seen.has(name)) duplicated.add(name); else seen.add(name);
  }
  return [...duplicated];
}

export function stripUntranslatedMarkers(block: string): string {
  return block
    .replace(new RegExp(`\\s*//\\s*${I18N_UNTRANSLATED_MARKER}\\s*$`, 'gmu'), '')
    .replace(new RegExp(`\\s*//\\s*${I18N_UNTRANSLATED_MARKER}`, 'gu'), '');
}

function normalizeLocale(locale: string): string {
  return locale.trim().replace(/_/gu, '-').toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
