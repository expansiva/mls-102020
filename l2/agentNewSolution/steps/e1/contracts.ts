/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e1/contracts.ts" enhancement="_blank"/>

import {
  NS4_FLOW_ID,
  NS4_FLOW_VERSION,
  NS4_MODULE_SCHEMA_VERSION,
  normalizeNs4Languages,
  normalizeNs4ModuleName,
  Ns4ApprovedBy,
  Ns4ModuleArtifact,
  Ns4Presentation,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';

export type Ns4ReviewPolicy = 'guided' | 'smart' | 'automatic';
export type Ns4SolutionStrategy = 'newSolution' | 'modernizePreserveDatabase' | 'modernizeEvolveDatabase' | 'replaceAndMigrateData';
export type Ns4DatabaseChangePolicy = 'new' | 'forbidden' | 'additiveControlled' | 'replacement';

export interface Ns4E1Review {
  planId: 'e1-review';
  reviewRound: number;
  userLanguage: string;
  reviewPolicy: { mode: Ns4ReviewPolicy };
  module: { moduleName: string; title: string; purpose: string };
  strategy: {
    mode: Ns4SolutionStrategy;
    rationale: string;
    databaseChangePolicy: Ns4DatabaseChangePolicy;
    modernization?: { sourceSystemName: string; sourceTechnology?: string; databaseEngine?: string; databaseVersion?: string; schemaAvailability: 'uploadAtE4' | 'metadataAtE4' | 'notAvailableYet'; notes?: string };
  };
  businessScope: {
    mainGoal: string;
    actors: Array<{ actorId: string; title: string; kind: 'internal' | 'external' | 'system'; expectedOutcome: string }>;
    expectedOutcomes: Array<{ outcomeId: string; title: string; description: string }>;
    inScope: string[];
    outOfScope: string[];
  };
  localization: { productLanguages: string[]; defaultLanguage: string; defaultLocale?: string; currency?: string; timeZone?: string; primaryMarket?: string };
  declaredConstraints: {
    mandatoryIntegrations: Array<{ dependencyId: string; title: string; kind: 'externalSystem' | 'platform' | 'unknown'; reason: string }>;
    regulatoryNotes?: string;
    criticalNotes?: string;
  };
  changeSummary: string[];
  /**
   * Product languages the normalizer discarded for lacking user provenance (run02 102047: the LLM
   * invented en/es for a pt-BR-only request). Trace-only: never copied into the l4 artifact.
   */
  i18nWarnings?: string[];
}

export interface Ns4E1ReviewEvent {
  action: 'approve' | 'requestChanges' | 'cancel';
  adjustment: string;
  review: Ns4E1Review;
}

export interface Ns4E1ReviewIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns4E1ReviewGate {
  ok: boolean;
  issues: Ns4E1ReviewIssue[];
}

export function normalizeNs4E1Review(value: unknown, fallback: { userLanguage?: string; moduleName?: string; productLanguages?: string; mainActors?: string; mainGoal?: string; boundaries?: string; sourcePrompt?: string } = {}): Ns4E1Review {
  const root = record(value);
  const module = record(root.module);
  const strategy = record(root.strategy);
  const scope = record(root.businessScope);
  const localization = record(root.localization);
  const reviewPolicy = record(root.reviewPolicy);
  const legacy = record(root.questions);
  const moduleName = normalizeNs4ModuleName(text(module.moduleName) || text(legacy.moduleName?.answer) || fallback.moduleName || fallback.sourcePrompt || 'newModule');
  const userLanguage = normalizeNs4Languages(root.userLanguage || fallback.userLanguage || 'en')[0];
  const clarificationLanguagesAnswer = text(legacy.productLanguages?.answer) || text(fallback.productLanguages);
  const requestedLanguages = normalizeNs4Languages(localization.productLanguages || clarificationLanguagesAnswer || userLanguage, userLanguage);
  // Languages are a user decision, never an LLM guess. When the caller supplies the provenance
  // context (clarification answer and/or the original prompt), every language the user did not cite
  // is discarded with a warning instead of silently reaching the l4 — run02 of 102047 shipped en/es
  // for a pt-BR-only request and the CF finalize auto-dispatched @@addLanguage for both.
  const provenanceKnown = fallback.sourcePrompt !== undefined || fallback.productLanguages !== undefined || Boolean(clarificationLanguagesAnswer);
  const i18nWarnings: string[] = [];
  const languages = provenanceKnown
    ? filterNs4LanguagesByProvenance(requestedLanguages, userLanguage, clarificationLanguagesAnswer, text(fallback.sourcePrompt), i18nWarnings)
    : requestedLanguages;
  const declaredDefault = normalizeNs4Languages(localization.defaultLanguage || languages[0], languages[0])[0];
  // A default that was itself discarded follows the list; any other mismatch keeps failing the gate.
  const defaultLanguage = !languages.some(language => sameNs4Language(language, declaredDefault))
    && requestedLanguages.some(language => sameNs4Language(language, declaredDefault))
    ? languages[0]
    : declaredDefault;
  const requestedMode = strategy.mode;
  const mode: Ns4SolutionStrategy = requestedMode === 'modernizePreserveDatabase' || requestedMode === 'modernizeEvolveDatabase' || requestedMode === 'replaceAndMigrateData' ? requestedMode : 'newSolution';
  const actors = list(scope.actors).map((item, index) => {
    const actor = record(item);
    return { actorId: stableId(text(actor.actorId) || text(actor.title), `actor${index + 1}`), title: text(actor.title), kind: actor.kind === 'external' || actor.kind === 'system' ? actor.kind : 'internal' as const, expectedOutcome: text(actor.expectedOutcome) };
  }).filter(actor => actor.title);
  const legacyActors = text(legacy.mainActors?.answer) || fallback.mainActors || '';
  const safeActors = actors.length ? actors : legacyActors ? [{ actorId: 'primaryActor', title: legacyActors, kind: 'internal' as const, expectedOutcome: text(scope.mainGoal) || text(legacy.mainGoal?.answer) || fallback.mainGoal || '' }] : [];
  const outcomes = list(scope.expectedOutcomes).map((item, index) => {
    const outcome = record(item);
    return { outcomeId: stableId(text(outcome.outcomeId) || text(outcome.title), `outcome${index + 1}`), title: text(outcome.title), description: text(outcome.description) };
  }).filter(outcome => outcome.title);
  const mainGoal = text(scope.mainGoal) || text(legacy.mainGoal?.answer) || fallback.mainGoal || '';
  const safeOutcomes = outcomes.length ? outcomes : mainGoal ? [{ outcomeId: 'primaryOutcome', title: mainGoal, description: mainGoal }] : [];
  const modernization = record(strategy.modernization);
  const policy = policyFor(mode);
  return {
    planId: 'e1-review', reviewRound: positive(root.reviewRound, 1), userLanguage,
    reviewPolicy: { mode: reviewPolicy.mode === 'guided' || reviewPolicy.mode === 'automatic' ? reviewPolicy.mode : 'smart' },
    module: { moduleName, title: text(module.title) || humanize(moduleName), purpose: text(module.purpose) || mainGoal },
    strategy: {
      mode, rationale: text(strategy.rationale), databaseChangePolicy: policy,
      ...(mode !== 'newSolution' ? { modernization: { sourceSystemName: text(modernization.sourceSystemName), sourceTechnology: text(modernization.sourceTechnology), databaseEngine: text(modernization.databaseEngine), databaseVersion: text(modernization.databaseVersion), schemaAvailability: modernization.schemaAvailability === 'metadataAtE4' || modernization.schemaAvailability === 'notAvailableYet' ? modernization.schemaAvailability : 'uploadAtE4', notes: text(modernization.notes) } } : {}),
    },
    businessScope: { mainGoal, actors: safeActors, expectedOutcomes: safeOutcomes, inScope: strings(scope.inScope), outOfScope: strings(scope.outOfScope) },
    localization: { productLanguages: languages, defaultLanguage, defaultLocale: text(localization.defaultLocale), currency: text(localization.currency), timeZone: text(localization.timeZone), primaryMarket: text(localization.primaryMarket) },
    declaredConstraints: { mandatoryIntegrations: list(record(root.declaredConstraints).mandatoryIntegrations).map((item, index) => { const dependency = record(item); return { dependencyId: stableId(text(dependency.dependencyId) || text(dependency.title), `dependency${index + 1}`), title: text(dependency.title), kind: dependency.kind === 'externalSystem' || dependency.kind === 'platform' ? dependency.kind : 'unknown' as const, reason: text(dependency.reason) }; }).filter(item => item.title || item.reason), regulatoryNotes: text(record(root.declaredConstraints).regulatoryNotes), criticalNotes: text(record(root.declaredConstraints).criticalNotes) },
    changeSummary: strings(root.changeSummary),
    ...(i18nWarnings.length ? { i18nWarnings } : {}),
  };
}

export function policyFor(mode: Ns4SolutionStrategy): Ns4DatabaseChangePolicy {
  if (mode === 'modernizePreserveDatabase') return 'forbidden';
  if (mode === 'modernizeEvolveDatabase') return 'additiveControlled';
  if (mode === 'replaceAndMigrateData') return 'replacement';
  return 'new';
}

export function validateNs4E1Review(review: Ns4E1Review): Ns4E1ReviewGate {
  const issues: Ns4E1ReviewIssue[] = [];
  const add = (code: string, message: string, path?: string, severity: 'error' | 'warning' = 'error') => {
    issues.push({ severity, code, message, ...(path ? { path } : {}) });
  };
  if (review.planId !== 'e1-review') add('NS4_E1_PLAN', 'The E1 review planId is invalid.', 'planId');
  if (!/^[a-z][A-Za-z0-9]*$/.test(review.module.moduleName)
    || review.module.moduleName !== normalizeNs4ModuleName(review.module.moduleName)) {
    add('NS4_E1_MODULE_ID', 'The technical module name must be normalized lower camel case.', 'module.moduleName');
  }
  if (!review.module.title.trim()) add('NS4_E1_MODULE_TITLE', 'The friendly module title is required.', 'module.title');
  if (!review.module.purpose.trim()) add('NS4_E1_MODULE_PURPOSE', 'The module objective is required.', 'module.purpose');
  if (!review.userLanguage.trim()) add('NS4_E1_USER_LANGUAGE', 'The conversation language is required.', 'userLanguage');
  const normalizedLanguages = normalizeNs4Languages(review.localization.productLanguages);
  if (!review.localization.productLanguages.length) {
    add('NS4_E1_LANGUAGES', 'At least one product language is required.', 'localization.productLanguages');
  } else if (normalizedLanguages.length !== review.localization.productLanguages.length
    || normalizedLanguages.some((language, index) => language !== review.localization.productLanguages[index])) {
    add('NS4_E1_LANGUAGES_NORMALIZED', 'Product languages must be unique normalized BCP-47 tags.', 'localization.productLanguages');
  }
  if (!review.localization.defaultLanguage
    || !review.localization.productLanguages.includes(review.localization.defaultLanguage)) {
    add('NS4_E1_DEFAULT_LANGUAGE', 'The default language must belong to the product language list.', 'localization.defaultLanguage');
  }
  for (const warning of review.i18nWarnings || []) {
    add('NS4_E1_LANGUAGES_PROVENANCE', warning, 'localization.productLanguages', 'warning');
  }
  if (!review.businessScope.mainGoal.trim()) add('NS4_E1_MAIN_GOAL', 'The main business goal is required.', 'businessScope.mainGoal');
  validateMembers(review.businessScope.actors, 'actorId', 'businessScope.actors', issues);
  validateMembers(review.businessScope.expectedOutcomes, 'outcomeId', 'businessScope.expectedOutcomes', issues);
  if (!review.businessScope.actors.length) add('NS4_E1_ACTORS', 'At least one business actor is required.', 'businessScope.actors');
  if (!review.businessScope.expectedOutcomes.length) add('NS4_E1_OUTCOMES', 'At least one expected outcome is required.', 'businessScope.expectedOutcomes');
  review.businessScope.actors.forEach((actor, index) => {
    if (!actor.title.trim()) add('NS4_E1_ACTOR_TITLE', 'Every actor needs a friendly title.', `businessScope.actors[${index}].title`);
    if (!actor.expectedOutcome.trim()) add('NS4_E1_ACTOR_OUTCOME', 'Every actor needs an expected outcome.', `businessScope.actors[${index}].expectedOutcome`);
  });
  review.businessScope.expectedOutcomes.forEach((outcome, index) => {
    if (!outcome.title.trim()) add('NS4_E1_OUTCOME_TITLE', 'Every outcome needs a title.', `businessScope.expectedOutcomes[${index}].title`);
    if (!outcome.description.trim()) add('NS4_E1_OUTCOME_DESCRIPTION', 'Every outcome needs a description.', `businessScope.expectedOutcomes[${index}].description`);
  });
  const inScope = new Set(review.businessScope.inScope.map(item => item.trim().toLowerCase()).filter(Boolean));
  review.businessScope.outOfScope.forEach((item, index) => {
    if (inScope.has(item.trim().toLowerCase())) add('NS4_E1_SCOPE_CONTRADICTION', 'The same item cannot be both in and out of scope.', `businessScope.outOfScope[${index}]`);
  });
  if (review.strategy.databaseChangePolicy !== policyFor(review.strategy.mode)) {
    add('NS4_E1_DATABASE_POLICY', 'The database change policy does not match the selected strategy.', 'strategy.databaseChangePolicy');
  }
  if (!review.strategy.rationale.trim()) {
    add('NS4_E1_STRATEGY_RATIONALE', 'Explain why the selected solution strategy fits this module.', 'strategy.rationale');
  }
  if (review.strategy.mode === 'newSolution') {
    if (review.strategy.modernization?.sourceSystemName) add('NS4_E1_NEW_WITH_LEGACY', 'A new solution must not declare a mandatory legacy source system.', 'strategy.modernization');
  } else {
    if (!review.strategy.modernization?.sourceSystemName.trim()) add('NS4_E1_SOURCE_SYSTEM', 'Modernization requires the source system name.', 'strategy.modernization.sourceSystemName');
    if (!review.strategy.modernization?.schemaAvailability) add('NS4_E1_SCHEMA_AVAILABILITY', 'Modernization requires schema availability.', 'strategy.modernization.schemaAvailability');
  }
  validateMembers(review.declaredConstraints.mandatoryIntegrations, 'dependencyId', 'declaredConstraints.mandatoryIntegrations', issues);
  review.declaredConstraints.mandatoryIntegrations.forEach((dependency, index) => {
    if (!dependency.title.trim()) add('NS4_E1_DEPENDENCY_TITLE', 'Every mandatory integration needs a title.', `declaredConstraints.mandatoryIntegrations[${index}].title`);
    if (!dependency.reason.trim()) add('NS4_E1_DEPENDENCY_REASON', 'Every mandatory integration needs a reason.', `declaredConstraints.mandatoryIntegrations[${index}].reason`);
  });
  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function buildNs4ModuleArtifactFromReview(
  review: Ns4E1Review,
  sourcePrompt: string,
  approvedBy: Ns4ApprovedBy,
  presentation: Ns4Presentation,
  now = new Date().toISOString(),
): Ns4ModuleArtifact {
  const gate = validateNs4E1Review(review);
  if (!gate.ok) throw new Error(gate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  return {
    schemaVersion: NS4_MODULE_SCHEMA_VERSION,
    presentation,
    module: {
      moduleName: review.module.moduleName,
      title: review.module.title,
      purpose: review.module.purpose,
      languages: [...review.localization.productLanguages],
    },
    designContext: {
      initialPrompt: sourcePrompt.trim() || review.module.moduleName,
      clarification: {
        mainActors: review.businessScope.actors.map(actor => actor.title).join(', '),
        mainGoal: review.businessScope.mainGoal,
        boundaries: [
          ...review.businessScope.inScope.map(item => `in: ${item}`),
          ...review.businessScope.outOfScope.map(item => `out: ${item}`),
        ].join('; '),
      },
    },
    reviewPolicy: { ...review.reviewPolicy },
    solutionStrategy: {
      ...review.strategy,
      ...(review.strategy.modernization ? { modernization: { ...review.strategy.modernization } } : {}),
    },
    businessScope: {
      ...review.businessScope,
      actors: review.businessScope.actors.map(actor => ({ ...actor })),
      expectedOutcomes: review.businessScope.expectedOutcomes.map(outcome => ({ ...outcome })),
      inScope: [...review.businessScope.inScope],
      outOfScope: [...review.businessScope.outOfScope],
    },
    localization: { ...review.localization, productLanguages: [...review.localization.productLanguages] },
    declaredConstraints: {
      ...review.declaredConstraints,
      mandatoryIntegrations: review.declaredConstraints.mandatoryIntegrations.map(item => ({ ...item })),
    },
    specStatus: {
      flowId: NS4_FLOW_ID,
      flowVersion: NS4_FLOW_VERSION,
      state: 'inProgress',
      artifactCompleteness: 'partial',
      completedSteps: [{ stepId: 'e1', status: 'approved', approvedBy, approvedAt: now }],
      nextStep: 'e2-journeys',
      updatedAt: now,
    },
  };
}

function validateMembers(
  values: readonly unknown[],
  idKey: string,
  path: string,
  issues: Ns4E1ReviewIssue[],
): void {
  const ids = new Set<string>();
  values.forEach((value, index) => {
    const source = record(value);
    const id = typeof source[idKey] === 'string' ? String(source[idKey]) : '';
    if (!/^[a-z][A-Za-z0-9]*$/.test(id)) issues.push({ severity: 'error', code: 'NS4_E1_MEMBER_ID', message: `${idKey} must be lower camel case.`, path: `${path}[${index}].${idKey}` });
    if (ids.has(id)) issues.push({ severity: 'error', code: 'NS4_E1_MEMBER_DUPLICATE', message: `Duplicate ${idKey} ${id}.`, path: `${path}[${index}].${idKey}` });
    if (id) ids.add(id);
  });
}

/**
 * Keeps only the product languages the user actually cited: the tag itself in the clarification
 * answer, or the tag/language name in the answer or original prompt. Everything else is discarded
 * with a warning — when in doubt, discard; the human can add the language back in the E1 review.
 */
function filterNs4LanguagesByProvenance(
  languages: string[],
  userLanguage: string,
  clarificationAnswer: string,
  sourcePrompt: string,
  warnings: string[],
): string[] {
  const answerTags = clarificationAnswer ? normalizeNs4Languages(clarificationAnswer, userLanguage) : [];
  const citedText = foldNs4Text(`${clarificationAnswer}\n${sourcePrompt}`);
  const kept: string[] = [];
  const discarded: string[] = [];
  for (const language of languages) {
    const cited = sameNs4Language(language, userLanguage)
      || answerTags.some(tag => sameNs4Language(tag, language))
      || ns4LanguageMentioned(language, userLanguage, citedText);
    (cited ? kept : discarded).push(language);
  }
  if (discarded.length) {
    warnings.push(`localization.productLanguages: discarded ${discarded.join(', ')} — languages are a user decision and the user did not cite them in the clarification answer or in the original prompt; kept ${(kept.length ? kept : [userLanguage]).join(', ')}.`);
  }
  return kept.length ? kept : normalizeNs4Languages(userLanguage);
}

function sameNs4Language(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase() || primaryNs4Subtag(a) === primaryNs4Subtag(b);
}

function primaryNs4Subtag(tag: string): string { return tag.split('-')[0].toLowerCase(); }

function ns4LanguageMentioned(language: string, userLanguage: string, foldedText: string): boolean {
  if (!foldedText.trim()) return false;
  const tag = language.toLowerCase();
  // A bare two-letter code is a common word elsewhere ('en' in Spanish, 'de' in Portuguese): only a
  // tag with a region or with three letters counts as a textual citation.
  if ((tag.includes('-') || tag.length >= 3) && ns4WordMentioned(foldedText, foldNs4Text(tag))) return true;
  return ns4LanguageNames(language, userLanguage).some(name => ns4WordMentioned(foldedText, name));
}

/** Display names of the language in the user's language, its own language and English. */
function ns4LanguageNames(language: string, userLanguage: string): string[] {
  const primary = primaryNs4Subtag(language);
  const names = new Set<string>();
  for (const displayLanguage of [userLanguage, primary, 'en']) {
    let displayNames: Intl.DisplayNames;
    try { displayNames = new Intl.DisplayNames([displayLanguage], { type: 'language' }); } catch { continue; }
    for (const target of [language, primary]) {
      try {
        const name = displayNames.of(target);
        // `of` echoes unknown tags back: an echoed tag must not bypass the two-letter token rule.
        if (name && name.toLowerCase() !== target.toLowerCase()) names.add(foldNs4Text(name));
      } catch { /* invalid tag: it has no display name, only a literal tag citation can keep it */ }
    }
  }
  return [...names];
}

function ns4WordMentioned(text: string, token: string): boolean {
  if (!token) return false;
  let index = text.indexOf(token);
  while (index !== -1) {
    const before = index > 0 ? text[index - 1] : ' ';
    const after = index + token.length < text.length ? text[index + token.length] : ' ';
    if (!/[\p{L}\p{N}-]/u.test(before) && !/[\p{L}\p{N}-]/u.test(after)) return true;
    index = text.indexOf(token, index + 1);
  }
  return false;
}

/** Lower case without diacritics, so 'inglês' also matches 'ingles'. */
function foldNs4Text(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function record(value: unknown): Record<string, any> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function strings(value: unknown): string[] { return list(value).map(text).filter(Boolean); }
function positive(value: unknown, fallback: number): number { return typeof value === 'number' && value > 0 ? Math.floor(value) : fallback; }
function stableId(value: string, fallback: string): string { return normalizeNs4ModuleName(value || fallback, fallback); }
function humanize(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, item => item.toUpperCase()); }
