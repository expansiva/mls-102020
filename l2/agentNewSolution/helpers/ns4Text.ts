/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4Text.ts" enhancement="_blank"/>

/**
 * Deterministic user-facing phrases of agentNewSolution. English is the only text in code.
 * The root planner translates the catalogue once per run into `presentation.phrases`; readers
 * fall back to this object when a key is missing. Placeholders `{name}` stay verbatim in every
 * language. Internal messages (throw, statusTask, trace) are English literals, not keys.
 */

import { NS4_WIDGET_KEYS, NS4_WIDGET_PHRASES } from '/_102020_/l2/agentNewSolution/helpers/ns4WidgetPhrases.js';

export const NS4_PHRASE_MAX_LENGTH = 200 as const;

export const NS4_PHRASES = {
  'catalogue.list.title': 'List {entity}',
  'catalogue.list.story': 'Find the record.',
  'catalogue.create.title': 'Create {entity}',
  'catalogue.create.story': 'Fill in the new record.',
  'catalogue.update.title': 'Update {entity}',
  'catalogue.update.story': 'Correct the chosen record.',
  'catalogue.section.recordList.intent': 'Find {entity}.',
  'catalogue.section.recordForm.create.intent': 'Create {entity}.',
  'catalogue.section.recordForm.edit.intent': 'Create or correct {entity}.',
  'catalogue.purpose': '{entity} record catalogue.',
  'catalogue.delete.title': 'Delete {entity}',
  'catalogue.delete.story': 'Remove the chosen record.',
  'catalogue.inactivate.title': 'Deactivate {entity}',
  'catalogue.inactivate.story': 'Deactivate the record (history and references are preserved).',
  'catalogue.reactivate.title': 'Reactivate {entity}',
  'catalogue.reactivate.story': 'Reactivate a deactivated record.',
  'catalogue.get.title': 'Get {entity}',
  'catalogue.get.story': 'Read the record by id.',
  'catalogue.audience.question': 'No journey operates {entity}: who maintains this catalogue?',
  'catalogue.audience.changeHint': 'Add an E3 authority over {entity} to restrict this catalogue to a named profile.',
  'catalogue.list.search': 'Search by {field}.',
  'catalogue.list.sortBy': 'Field to sort the listing by.',
  'catalogue.list.sortOrder': 'Sort direction.',
  'catalogue.list.page': 'Listing page (1-based).',
  'catalogue.list.pageSize': 'Page size (default 20, cap 200).',
  'journey.decide.description': 'The decision taken.',
  'hub.purpose': '{entity} command centre.',
  'hub.section.collection.intent': 'Portfolio and search.',
  'hub.section.record.intent': 'The selected record and what revolves around it.',
  'projection.unjoined.question': 'Use case {useCaseId} reads projection {projectionId} with no derived relationship to {entity}: E4 cannot join them. Omit from the output?',
  'projection.unjoined.changeHint': 'Declare an E4 relationship with realization.kind derived between {projectionId} and {entity}.',
  'hub.composition.question': 'The proposed composition for the {entity} dashboard did not respect the catalogue; use the default order?',
  'hub.composition.changeHint': 'Review the order and highlights of the {entity} dashboard in the next round.',
  'workflow.unreachable.question': 'How should the unreachable {entity}.{state} lifecycle state be handled?',
  'workflow.unreachable.changeHint': 'Add an explicit E2 journey/operation that reaches {entity}.{state} before restoring it to the compiled workflow; the E4 ontology remains unchanged.',
  'workflow.predicate.question': 'The {predicateId} criterion has no effect in this version — none of its states is reachable.',
  'workflow.predicate.changeHint': 'Add an E2 journey that reaches one of {states}; the E5 rule and E4 ontology remain unchanged.',
  'workflow.omit.question': '{entity} has no operated state flow in this version.',
  'workflow.omit.changeHint': 'Add an E2 journey that operates a {entity} transition; the E4 ontology remains unchanged.',
  'demotion.chosen': 'Standard {entity} record catalogue',
  'demotion.alternative': 'Keep {journey} as its own journey',
  'demotion.question': '{journey} has no decision and no handoff: should it become the standard {entity} record catalogue?',
  'dormant.question': 'The {title} action stays visible, but transition {transitions} is not reachable in this version.',
  'route.ambiguous.question': 'Which record should the {title} screen open directly?',
  'route.ambiguous.changeHint': 'The {title} screen opens without a direct record link in this version; define a single target context to enable it.',
  ...NS4_WIDGET_PHRASES,
} as const;

export type Ns4PhraseKey = keyof typeof NS4_PHRASES;

const PHRASE_KEYS = new Set<string>(Object.keys(NS4_PHRASES));

export function isNs4PhraseKey(value: string): value is Ns4PhraseKey {
  return PHRASE_KEYS.has(value);
}

export interface Ns4PhraseHolder {
  phrases?: Partial<Record<Ns4PhraseKey, string>>;
}

export interface Ns4PhrasesNormalization {
  phrases: Partial<Record<Ns4PhraseKey, string>>;
  warnings: string[];
}

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

export function ns4Text(
  presentation: Ns4PhraseHolder | undefined,
  key: Ns4PhraseKey,
  params?: Record<string, string>,
): string {
  const template = presentation?.phrases?.[key] || NS4_PHRASES[key];
  return substitute(template, params);
}

type Ns4WidgetName = keyof typeof NS4_WIDGET_KEYS;
export type Ns4WidgetLabelMap<W extends Ns4WidgetName> = { [K in (typeof NS4_WIDGET_KEYS)[W][number]]: string };

export function ns4WidgetLabels<W extends Ns4WidgetName>(
  presentation: Ns4PhraseHolder | undefined,
  widget: W,
): Ns4WidgetLabelMap<W> {
  const out: Record<string, string> = {};
  for (const key of NS4_WIDGET_KEYS[widget]) {
    out[key] = ns4Text(presentation, `widget.${widget}.${key}` as Ns4PhraseKey);
  }
  return out as Ns4WidgetLabelMap<W>;
}

export function normalizeNs4Phrases(value: unknown): Ns4PhrasesNormalization {
  const warnings: string[] = [];
  const phrases: Partial<Record<Ns4PhraseKey, string>> = {};
  if (value == null) return { phrases, warnings };
  if (typeof value !== 'object' || Array.isArray(value)) {
    warnings.push('phrases is not an object; using English catalogue.');
    return { phrases, warnings };
  }
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!isNs4PhraseKey(key)) {
      warnings.push(`unknown phrase key ${key}; ignored.`);
      continue;
    }
    const accepted = acceptTranslatedPhrase(key, raw[key], warnings);
    if (accepted !== undefined) phrases[key] = accepted;
  }
  return { phrases, warnings };
}

export function ns4PlannerPhrasesAppendix(): string {
  return [
    '## Phrase catalogue',
    'Translate the values only; keep every key and every `{placeholder}` verbatim; when the prompt language is English return the values unchanged.',
    'Return the translated catalogue as `phrases` on the result envelope, with the same keys.',
    JSON.stringify(NS4_PHRASES, null, 2),
  ].join('\n');
}

function acceptTranslatedPhrase(key: Ns4PhraseKey, value: unknown, warnings: string[]): string | undefined {
  if (typeof value !== 'string') {
    warnings.push(`phrase ${key} is not a string; using English.`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    warnings.push(`phrase ${key} is empty; using English.`);
    return undefined;
  }
  if (trimmed.length >= NS4_PHRASE_MAX_LENGTH) {
    warnings.push(`phrase ${key} is ${trimmed.length} chars (>= ${NS4_PHRASE_MAX_LENGTH}); using English.`);
    return undefined;
  }
  if (!samePlaceholders(NS4_PHRASES[key], trimmed)) {
    warnings.push(`phrase ${key} dropped or altered a {placeholder}; using English.`);
    return undefined;
  }
  return trimmed;
}

function samePlaceholders(english: string, translated: string): boolean {
  return placeholdersOf(english).join('\0') === placeholdersOf(translated).join('\0');
}

function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map(match => match[1]).sort();
}

function substitute(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => (
    Object.prototype.hasOwnProperty.call(params, name) ? params[name] : match
  ));
}
