/// <mls fileReference="_102020_/l2/agentAssistant/steps/interpret/gate.ts" enhancement="_blank"/>

// Deterministic gate of the interpret call. The model only proposes; every piece is checked
// against the catalog and what does not fit is DROPPED with an issue (never repaired into
// something else): an unknown route, a value on a path the command does not have, an id
// smuggled into a value, a lookup that does not list the referenced entity, a filter the lookup
// does not accept. What survives is safe to resolve.

import type { AsCandidate, AsCatalog, AsManualSelection, AsMode, AsRefIntent } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import type { AsManual } from '/_102020_/l2/agentAssistant/helpers/asManual.js';
import { asArray, asRecord, asString } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';

export const AS_MAX_CANDIDATES = 4;      // alternatives the user picks from
export const AS_MAX_SEQUENCE = 6;        // actions run in one sentence

export interface AsGateIssue {
  code: string;
  message: string;
}

export interface AsInterpretation {
  userLanguage: string;
  reply: string;
  mode: AsMode;
  candidates: AsCandidate[];
  manual: AsManualSelection | null;   // set only in mode 'manual'
}

export function gateInterpretation(
  result: Record<string, unknown>,
  catalog: AsCatalog,
  manual: AsManual | null = null,
): { interpretation: AsInterpretation; issues: AsGateIssue[] } {
  const issues: AsGateIssue[] = [];
  if (asString(result.mode) === 'manual') {
    if (manual) return { interpretation: gateManual(result, manual, issues), issues };
    issues.push({ code: 'manual_unavailable', message: 'mode manual without an app manual' });
  }
  const candidates: AsCandidate[] = [];
  const seen = new Set<string>();
  // a sequence may run the same command twice ("um bife e dois sucos"); alternatives may not repeat
  const rawMode = asString(result.mode);
  const requestedMode: AsMode = rawMode === 'sequence' || rawMode === 'question' ? rawMode : 'alternatives';
  const limit = requestedMode === 'sequence' ? AS_MAX_SEQUENCE : requestedMode === 'question' ? 1 : AS_MAX_CANDIDATES;
  // a question is answered by a query; every other mode runs commands
  const pool = requestedMode === 'question' ? catalog.queries : catalog.commands;

  for (const raw of asArray(result.candidates)) {
    const item = asRecord(raw);
    const route = asString(item.route).trim();
    const command = pool.find(item => item.route === route);
    if (!command) {
      const kind = requestedMode === 'question' ? 'query' : 'command';
      issues.push({ code: 'unknown_route', message: `route '${route}' is not a ${kind} of this app` });
      continue;
    }
    if (requestedMode === 'alternatives' && seen.has(route)) {
      issues.push({ code: 'duplicate_route', message: `route '${route}' proposed twice` });
      continue;
    }
    if (candidates.length >= limit) {
      issues.push({ code: 'too_many_candidates', message: `route '${route}' exceeds ${limit} candidates` });
      continue;
    }
    seen.add(route);

    const values: Record<string, string> = {};
    for (const rawValue of asArray(item.values)) {
      const entry = asRecord(rawValue);
      const path = asString(entry.path).trim();
      const value = asString(entry.value).trim();
      const input = command.inputs.find(field => field.path === path);
      if (!input || input.role !== 'value') {
        issues.push({ code: 'invalid_value_path', message: `${route}: '${path}' is not a value input` });
        continue;
      }
      if (value) values[path] = value;
    }

    const refs: Record<string, AsRefIntent> = {};
    for (const rawRef of asArray(item.refs)) {
      const entry = asRecord(rawRef);
      const path = asString(entry.path).trim();
      const input = command.inputs.find(field => field.path === path);
      if (!input || input.role !== 'ref') {
        issues.push({ code: 'invalid_ref_path', message: `${route}: '${path}' is not a record input` });
        continue;
      }
      let lookupRoute = asString(entry.lookupRoute).trim();
      const lookup = catalog.lookups.find(item2 => item2.route === lookupRoute && item2.module === command.module && item2.entity === input.ref);
      if (lookupRoute && !lookup) {
        issues.push({ code: 'invalid_lookup', message: `${route}: '${lookupRoute}' does not list ${input.ref}` });
        lookupRoute = '';
      }
      const lookupParams: Record<string, string> = {};
      for (const rawParam of asArray(entry.lookupParams)) {
        const param = asRecord(rawParam);
        const name = asString(param.name).trim();
        const value = asString(param.value).trim();
        if (!lookup || !lookup.filters.some(filter => filter.path === name)) {
          issues.push({ code: 'invalid_lookup_param', message: `${route}: '${name}' is not a filter of '${lookupRoute || '(none)'}'` });
          continue;
        }
        if (value) lookupParams[name] = value;
      }
      let matchEntity = asString(entry.matchEntity).trim();
      if (matchEntity && !catalog.entities.some(entity => entity.module === command.module && entity.entityId === matchEntity)) {
        issues.push({ code: 'invalid_match_entity', message: `${route}: '${matchEntity}' is not an entity of ${command.module}` });
        matchEntity = '';
      }
      const matchText = asString(entry.matchText).trim();
      if (!matchText && !Object.keys(lookupParams).length) continue;
      refs[path] = { lookupRoute, lookupParams, matchEntity, matchText };
    }

    candidates.push({
      route,
      title: asString(item.title).trim(),
      reason: asString(item.reason).trim(),
      values,
      refs,
    });
  }

  return {
    interpretation: {
      userLanguage: asString(result.userLanguage).trim() || 'en',
      reply: asString(result.reply).trim(),
      // a "sequence" of one action is just that action
      mode: requestedMode === 'question' ? (candidates.length ? 'question' : 'alternatives') : candidates.length > 1 ? requestedMode : 'alternatives',
      candidates,
      manual: null,
    },
    issues,
  };
}

// The manual selection keeps only items that exist in the app map; an empty selection is valid and
// means "the app as a whole".
function gateManual(result: Record<string, unknown>, manual: AsManual, issues: AsGateIssue[]): AsInterpretation {
  const raw = asRecord(result.manual);
  const moduleOf = (id: string) => manual.modules.find(item => item.module === id);
  const modules = asArray(raw.modules).map(item => asString(item).trim()).filter(id => {
    if (moduleOf(id)) return true;
    issues.push({ code: 'unknown_manual_module', message: `module '${id}' is not in the app map` });
    return false;
  });
  const pages = asArray(raw.pages).map(asRecord).map(item => ({ module: asString(item.module).trim(), pageId: asString(item.pageId).trim() })).filter(ref => {
    if (moduleOf(ref.module)?.pages.some(page => page.pageId === ref.pageId)) return true;
    issues.push({ code: 'unknown_manual_page', message: `page '${ref.module}/${ref.pageId}' is not in the app map` });
    return false;
  });
  const journeys = asArray(raw.journeys).map(asRecord).map(item => ({ module: asString(item.module).trim(), journeyId: asString(item.journeyId).trim() })).filter(ref => {
    if (moduleOf(ref.module)?.journeys.some(journey => journey.journeyId === ref.journeyId)) return true;
    issues.push({ code: 'unknown_manual_journey', message: `journey '${ref.module}/${ref.journeyId}' is not in the app map` });
    return false;
  });
  return {
    userLanguage: asString(result.userLanguage).trim() || 'en',
    reply: '',
    mode: 'manual',
    candidates: [],
    manual: { modules: [...new Set(modules)], pages, journeys },
  };
}
