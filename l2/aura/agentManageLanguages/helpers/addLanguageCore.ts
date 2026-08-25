/// <mls fileReference="_102020_/l2/aura/agentManageLanguages/helpers/addLanguageCore.ts" enhancement="_blank"/>

/**
 * Pure decisions of agentAddLanguage: which files hold a translatable catalogue, which locales of one
 * still need translating, and how a translated block replaces the old one.
 *
 * PURE — no `mls.*`, no filesystem, no model. The agent keeps the IO; this file is what a unit test can
 * exercise, which is the only way the queueing rule gets verified before a run touches 100 files.
 *
 * The marker contract is owned by the emitter (`agentChangeFrontend/helpers/cfePageSkeleton.ts`) and
 * imported from there on purpose: two copies of the same literal would drift the moment one side changed.
 */

import { I18N_UNTRANSLATED_MARKER, untranslatedLocales } from '/_102020_/l2/agentChangeFrontend/helpers/cfePageSkeleton.js';

export { I18N_UNTRANSLATED_MARKER };

const START_MARKER = '/// **collab_i18n_start**';
const END_MARKER = '/// **collab_i18n_end**';

/** Const prefixes a page catalogue uses: the page itself, and one per organism of a split page. */
const CATALOGUE_CONST_RE = /const\s+(pageMessage|o\d+Message)_[A-Za-z0-9_]+\s*(?::\s*[A-Za-z0-9_]+\s*)?=/u;

/**
 * The folders a module's catalogues live in. The i18n block moved from `<module>/web/shared` to the
 * pages, and organisms of a split page live in the same page folders — so the target is every
 * `<module>/web/desktop/page*`, never the shared (it has no catalogue any more).
 */
export function isPageCatalogueFolder(folder: string, moduleName: string): boolean {
  return new RegExp(`^${escapeRegExp(moduleName)}/web/desktop/page\\d+$`, 'u').test(folder);
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
  const next = extractI18nBlock(translatedBlock);
  if (!next) throw new TranslatedBlockError('the translated block is not delimited by the i18n markers');

  for (const declaration of constDeclarations(previous)) {
    if (!next.includes(declaration)) {
      throw new TranslatedBlockError(`the translated block dropped or renamed \`${declaration}\``);
    }
  }

  const cleaned = stripUntranslatedMarkers(next);
  return source.replace(/\/\/\/\s\*\*collab_i18n_start\*\*[\s\S]*?\/\/\/\s\*\*collab_i18n_end\*\*/gu, cleaned);
}

/** `const pageMessage_pt_br: PageMessageType =` — the name AND the annotation that enforces parity. */
export function constDeclarations(block: string): string[] {
  return [...block.matchAll(/const\s+(?:pageMessage|o\d+Message)_[A-Za-z0-9_]+\s*(?::\s*[A-Za-z0-9_]+\s*)?=/gu)]
    .map(match => match[0].replace(/\s+/gu, ' ').trim());
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
