/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asPlan.ts" enhancement="_blank"/>

// The conversation as a pure state machine (only the BFF is injected). Each round:
//   planNext(state)      -> what the current action needs now: pick the action, confirm the plan,
//                           fill fields, confirm, or 'ready' (decided and authorized)
//   applyAnswers(state)  -> the human's answers folded back into the state
//   advance(state)       -> runs every ready action in order (the only place a command is sent)
//   buildWireInput(state)-> the exact params of the command once everything is decided
// Nothing here guesses business meaning: field roles, labels and record targets come from the
// catalog (l4 ontology + l2 contract); the model only proposed values and search terms.

import type {
  AsActionResult,
  AsAnswer,
  AsBffCall,
  AsCandidate,
  AsCatalog,
  AsCommand,
  AsFinal,
  AsInputField,
  AsLookup,
  AsMode,
  AsNext,
  AsPending,
  AsPicked,
  AsQuestion,
  AsRefIntent,
  AsRow,
  AsState,
} from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { AS_STATE_SCHEMA } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { humanize, lookupNeedsParams, lookupsFor } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { AS_LOOKUP_PAGE_SIZE, matchRows, normalizeText, runLookup, setPath } from '/_102020_/l2/agentAssistant/helpers/asLookup.js';
import { asLabelsFor, type AsLabels } from '/_102020_/l2/agentAssistant/helpers/asLabels.js';
import { formatDateForUser, formatTimestampForUser, parseDateInput, parseTimestampInput } from '/_102020_/l2/agentAssistant/helpers/asDates.js';

export const AS_ROUTE_QUESTION = '__route';
export const AS_CONFIRM_QUESTION = '__confirm';
export const AS_CONFIRM_OPTION = 'confirm';
export const AS_MAX_OPTIONS = 15;

export function createState(
  project: number,
  userText: string,
  userLanguage: string,
  reply: string,
  candidates: AsCandidate[],
  mode: AsMode = 'alternatives',
): AsState {
  return {
    schema: AS_STATE_SCHEMA,
    project,
    userText,
    userLanguage,
    reply,
    round: 0,
    mode: mode === 'question' ? 'question' : candidates.length > 1 ? mode : 'alternatives',
    candidates: mode === 'question' ? candidates.slice(0, 1) : candidates,
    queue: [],
    // a question only reads: nothing to confirm
    authorized: mode === 'question',
    results: [],
    final: null,
    manual: null,
    route: '',
    title: '',
    values: {},
    refs: {},
    picked: {},
    pending: null,
  };
}

export function parseState(raw: unknown): AsState | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as AsState;
    return parsed && parsed.schema === AS_STATE_SCHEMA ? parsed : null;
  } catch {
    return null;
  }
}

// Commands and queries share the resolution machinery; the gate already put each where it belongs.
export function findCommand(catalog: AsCatalog, route: string): AsCommand | undefined {
  return catalog.commands.find(command => command.route === route) || catalog.queries.find(query => query.route === route);
}

export const AS_ANSWER_DATA_MAX = 12000;

// What a query returned, small enough for the task memory and the answer prompt.
export function compactData(data: unknown): unknown {
  const text = JSON.stringify(data ?? null);
  if (text.length <= AS_ANSWER_DATA_MAX) return data ?? null;
  return `${text.slice(0, AS_ANSWER_DATA_MAX)}... (truncated: ${text.length} chars)`;
}

function adoptCandidate(state: AsState, candidate: AsCandidate): AsState {
  return {
    ...state,
    route: candidate.route,
    title: candidate.title,
    values: { ...candidate.values },
    refs: { ...candidate.refs },
    picked: {},
  };
}

function ask(state: AsState, pending: AsPending): { state: AsState; next: AsNext } {
  return { state: { ...state, pending }, next: { kind: 'ask', pending } };
}

function actionLabel(candidate: AsCandidate): string {
  return candidate.title || humanize(candidate.route.split('.').pop() || candidate.route);
}

// What the current action needs now. Never runs anything: 'ready' means decided AND authorized.
export async function planNext(state: AsState, catalog: AsCatalog, bff: AsBffCall): Promise<{ state: AsState; next: AsNext }> {
  const labels = asLabelsFor(state.userLanguage);
  let current = state;

  if (!current.route) {
    const candidates = current.candidates.filter(candidate => findCommand(catalog, candidate.route));
    if (!candidates.length) {
      return { state: { ...current, pending: null }, next: { kind: 'reply', text: current.reply || labels.notUnderstood } };
    }
    if (current.mode === 'sequence' && candidates.length > 1) {
      // one confirmation for the whole plan; each action is resolved only when its turn comes,
      // because it may need what the previous one creates
      if (!current.authorized) {
        return ask(current, {
          kind: 'confirm',
          title: labels.planTitle,
          intro: labels.planIntro,
          questions: [{
            id: AS_CONFIRM_QUESTION,
            title: labels.planTitle,
            question: candidates.map((candidate, index) => `${index + 1}. ${actionLabel(candidate)}`).join('\n'),
            options: [{ id: AS_CONFIRM_OPTION, label: labels.planOption, recommended: true }],
          }],
          picks: {},
          freeRefs: [],
        });
      }
      current = { ...adoptCandidate(current, candidates[0]), queue: candidates.slice(1) };
    } else if (candidates.length > 1) {
      return ask(current, {
        kind: 'questions',
        title: labels.chooseActionTitle,
        intro: labels.chooseActionQuestion,
        questions: [{
          id: AS_ROUTE_QUESTION,
          question: labels.chooseActionQuestion,
          options: candidates.map((candidate, index) => ({
            id: candidate.route,
            label: actionLabel(candidate),
            description: candidate.reason || findCommand(catalog, candidate.route)?.purpose || '',
            recommended: index === 0,
          })),
        }],
        picks: {},
        freeRefs: [],
      });
    } else {
      current = adoptCandidate(current, candidates[0]);
    }
  }

  const command = findCommand(catalog, current.route);
  if (!command) {
    return { state: { ...current, pending: null }, next: { kind: 'reply', text: current.reply || labels.notUnderstood } };
  }
  const questions: AsQuestion[] = [];
  const picks: AsPending['picks'] = {};
  const freeRefs: string[] = [];
  const picked = { ...current.picked };

  for (const input of command.inputs) {
    if (input.role === 'version') continue;
    if (input.role === 'ref') {
      if (picked[input.path]) continue;
      // an optional record the user did not mention is simply not sent (never asked)
      if (!input.required && !current.refs[input.path]) continue;
      const resolved = await resolveRef(catalog, command, input, current.refs[input.path], bff, labels);
      if ('picked' in resolved) {
        picked[input.path] = resolved.picked;
        continue;
      }
      questions.push(resolved.question);
      picks[resolved.question.id] = resolved.picks;
      if (resolved.free) freeRefs.push(resolved.question.id);
      continue;
    }
    const raw = current.values[input.path];
    if (raw !== undefined && raw.trim() !== '') {
      if (validateValue(input, raw).ok) continue;
      questions.push(valueQuestion(input, labels, labels.invalidValue(input.label, raw)));
      continue;
    }
    if (input.required) questions.push(valueQuestion(input, labels));
  }

  current = { ...current, picked };
  if (questions.length) {
    return ask(current, { kind: 'questions', title: current.title || labels.completeTitle, intro: progressIntro(current, labels), questions, picks, freeRefs });
  }
  if (current.authorized) return { state: { ...current, pending: null }, next: { kind: 'ready' } };
  return ask(current, {
    kind: 'confirm',
    title: labels.confirmTitle,
    intro: labels.confirmIntro,
    questions: [{
      id: AS_CONFIRM_QUESTION,
      title: current.title,
      question: [current.title, ...summaryLines(current, command, labels)].filter(Boolean).join('\n'),
      options: [{ id: AS_CONFIRM_OPTION, label: labels.confirmOption, recommended: true }],
    }],
    picks: {},
    freeRefs: [],
  });
}

// Inside an authorized sequence the round says what is done, what runs now, and that answering runs it.
function progressIntro(state: AsState, labels: AsLabels): string {
  if (!state.authorized) return labels.completeIntro;
  return [
    ...state.results.map(result => labels.doneAction(result.title)),
    labels.nowAction(state.title),
    labels.runsOnContinue,
  ].join('\n');
}

// Runs every action that is decided and authorized, in order, until one needs the user, one
// fails, or nothing is left. The only place a command is sent.
export async function advance(state: AsState, catalog: AsCatalog, bff: AsBffCall): Promise<{ state: AsState; next: AsNext }> {
  const labels = asLabelsFor(state.userLanguage);
  let current = state;
  for (let guard = 0; guard <= current.candidates.length + 1; guard += 1) {
    const planned = await planNext(current, catalog, bff);
    if (planned.next.kind !== 'ready') return planned;
    current = planned.state;
    const command = findCommand(catalog, current.route) as AsCommand;
    const params = buildWireInput(current, command);
    const response = await bff(command.route, params);
    const result: AsActionResult = {
      route: command.route,
      title: current.title || command.route,
      params,
      summary: summaryLines(current, command, labels),
      ok: response.ok,
      // a command's response is shown in the result step; only a query's data feeds the answer
      data: command.kind === 'qry' ? compactData(response.data) : null,
      error: response.ok ? null : { code: response.error?.code || 'ERROR', message: response.error?.message || '' },
    };
    current = { ...current, results: [...current.results, result] };
    if (!response.ok || !current.queue.length) {
      return { state: { ...current, pending: null }, next: { kind: 'finished', results: current.results } };
    }
    const [following, ...rest] = current.queue;
    current = { ...adoptCandidate(current, following), queue: rest };
  }
  throw new Error('[agentAssistant] the action sequence did not settle');
}

// What the user must SEE before the task closes (the 'answer' step), or null when the result step
// of a command run is enough. Questions always end in an answer or in a readable message, and so
// does a sentence nothing fits: a terminal result alone went unnoticed.
export function finalFor(state: AsState, next: AsNext, labels: AsLabels): AsFinal | null {
  if (next.kind === 'reply') return { kind: 'message', text: next.text };
  if (next.kind !== 'finished' || state.mode !== 'question') return null;
  const result = next.results[0];
  if (result?.ok) return { kind: 'answer', text: '' };
  return { kind: 'message', text: result ? outcomeTitle(next.results, labels) : labels.notUnderstood };
}

// One line for the task: everything done, or where it stopped and why.
export function outcomeTitle(results: AsActionResult[], labels: AsLabels): string {
  const failed = results.find(result => !result.ok);
  if (!failed) return `${labels.done}: ${results.map(result => result.title).join(' · ')}`;
  const reason = failed.error?.message || failed.error?.code || '';
  const done = results.filter(result => result.ok).length;
  return `${labels.failed}: ${failed.title}${reason ? ` — ${reason}` : ''}${done ? ` (${labels.doneCount(done)})` : ''}`;
}

type RefResolution =
  | { picked: AsPicked }
  | { question: AsQuestion; picks: Record<string, AsPicked>; free: boolean };

async function resolveRef(
  catalog: AsCatalog,
  command: AsCommand,
  input: AsInputField,
  intent: AsRefIntent | undefined,
  bff: AsBffCall,
  labels: AsLabels,
): Promise<RefResolution> {
  const questionId = `ref:${input.path}`;
  const lookup = chooseLookup(lookupsFor(catalog, command.module, input.ref), intent);
  if (!lookup) {
    // no list query reaches this entity: the only way left is the identifier itself
    return {
      question: { id: questionId, title: input.label, question: labels.typeValue(input.label), options: [], allowNotes: true, notesPlaceholder: labels.valuePlaceholder },
      picks: {},
      free: true,
    };
  }
  const params = intent && intent.lookupRoute === lookup.route ? intent.lookupParams : {};
  let rows = await runLookup(catalog, lookup, params, bff);
  if (!rows.length && Object.keys(params).length) rows = await runLookup(catalog, lookup, {}, bff);

  const text = intent?.matchText?.trim() || '';
  if (text) {
    const entity = intent?.matchEntity && lookupReaches(lookup, intent.matchEntity) ? intent.matchEntity : '';
    const matches = matchRows(rows, entity, text);
    if (matches.length === 1) return { picked: toPicked(matches[0]) };
    if (matches.length > 1) return optionsQuestion(questionId, input, matches, labels.pickOne(input.label, text), labels);
    return optionsQuestion(questionId, input, rows, labels.notFound(input.label, text), labels);
  }
  if (rows.length === 1) return { picked: toPicked(rows[0]) };
  return optionsQuestion(questionId, input, rows, rows.length ? labels.pickAny(input.label) : labels.notFound(input.label, ''), labels);
}

// The model's pick when it is a valid list query for the entity; otherwise the first query that
// needs no filter, preferring one that also returns the entity the user named.
export function chooseLookup(lookups: AsLookup[], intent: AsRefIntent | undefined): AsLookup | undefined {
  const chosen = intent ? lookups.find(lookup => lookup.route === intent.lookupRoute) : undefined;
  if (chosen) return chosen;
  const usable = lookups.filter(lookup => !lookupNeedsParams(lookup));
  if (intent?.matchEntity) {
    const reaching = usable.find(lookup => lookupReaches(lookup, intent.matchEntity));
    if (reaching) return reaching;
  }
  return usable[0];
}

function lookupReaches(lookup: AsLookup, entityId: string): boolean {
  return lookup.entity === entityId || lookup.related.some(related => related.entity === entityId);
}

function toPicked(row: AsRow): AsPicked {
  return { id: row.id, label: row.label, ...(row.version !== undefined ? { version: row.version } : {}) };
}

function optionsQuestion(questionId: string, input: AsInputField, rows: AsRow[], question: string, labels: AsLabels): RefResolution {
  const shown = rows.slice(0, AS_MAX_OPTIONS);
  const picks: Record<string, AsPicked> = {};
  for (const row of shown) picks[row.id] = toPicked(row);
  return {
    question: {
      id: questionId,
      title: input.label,
      question,
      options: shown.map(row => ({ id: row.id, label: row.label })),
      allowNotes: true,
      notesPlaceholder: labels.searchPlaceholder,
    },
    picks,
    free: false,
  };
}

function valueQuestion(input: AsInputField, labels: AsLabels, error?: string): AsQuestion {
  const options = input.enumValues.length
    ? input.enumValues.map(item => ({ id: item.value, label: item.label }))
    : input.wireType === 'boolean'
      ? [{ id: 'true', label: labels.yes }, { id: 'false', label: labels.no }]
      : [];
  return {
    id: `val:${input.path}`,
    title: input.label,
    question: error || labels.typeValue(input.label),
    options,
    allowNotes: options.length === 0,
    notesPlaceholder: input.valueType === 'date' ? labels.datePlaceholder
      : input.valueType === 'timestamp' ? labels.timestampPlaceholder
        : input.description || labels.valuePlaceholder,
  };
}

// ---- answers ----

export function applyAnswers(state: AsState, answers: AsAnswer[]): { state: AsState; confirmed: boolean } {
  const pending = state.pending;
  let next: AsState = { ...state, values: { ...state.values }, refs: { ...state.refs }, picked: { ...state.picked } };
  let confirmed = false;
  for (const answer of answers) {
    const notes = (answer.notes || '').trim();
    if (answer.id === AS_ROUTE_QUESTION) {
      const candidate = state.candidates.find(item => item.route === answer.optionId);
      if (candidate) next = adoptCandidate(next, candidate);
      continue;
    }
    if (answer.id === AS_CONFIRM_QUESTION) {
      confirmed = answer.optionId === AS_CONFIRM_OPTION;
      if (confirmed) next.authorized = true;
      continue;
    }
    if (answer.id.startsWith('ref:')) {
      const path = answer.id.slice(4);
      if (pending?.freeRefs.includes(answer.id)) {
        if (notes) next.picked[path] = { id: notes, label: notes };
        continue;
      }
      if (notes) {
        // typed text is a new search over every display value of the rows
        const previous = next.refs[path];
        next.refs[path] = { lookupRoute: previous?.lookupRoute || '', lookupParams: {}, matchEntity: '', matchText: notes };
        delete next.picked[path];
        continue;
      }
      const pick = pending?.picks[answer.id]?.[answer.optionId];
      if (pick) next.picked[path] = pick;
      continue;
    }
    if (answer.id.startsWith('val:')) {
      const value = notes || answer.optionId;
      if (value) next.values[answer.id.slice(4)] = value;
    }
  }
  next.pending = null;
  return { state: next, confirmed };
}

// ---- values ----

export function validateValue(input: AsInputField, raw: string): { ok: true; value: unknown } | { ok: false } {
  const text = raw.trim();
  if (!text) return { ok: false };
  if (input.enumValues.length) {
    const term = normalizeText(text);
    const found = input.enumValues.find(item => normalizeText(item.value) === term || normalizeText(item.label) === term);
    if (!found) return { ok: false };
    return { ok: true, value: input.wireType === 'number' ? Number(found.value) : found.value };
  }
  if (input.wireType === 'boolean') {
    if (/^(true|sim|yes|s|y|1)$/i.test(text)) return { ok: true, value: true };
    if (/^(false|nao|não|no|n|0)$/i.test(text)) return { ok: true, value: false };
    return { ok: false };
  }
  if (input.valueType === 'date') {
    const iso = parseDateInput(text);
    return iso ? { ok: true, value: iso } : { ok: false };
  }
  if (input.valueType === 'timestamp') {
    const iso = parseTimestampInput(text);
    return iso ? { ok: true, value: iso } : { ok: false };
  }
  if (input.valueType === 'money') {
    const amount = parseDecimal(text.replace(/[^\d.,-]/g, ''));
    if (amount === null || amount < 0) return { ok: false };
    return { ok: true, value: input.wireType === 'number' ? amount : amount.toFixed(2) };
  }
  if (input.wireType === 'number') {
    const value = parseDecimal(text);
    if (value === null) return { ok: false };
    if (input.valueType === 'integer' && !Number.isInteger(value)) return { ok: false };
    return { ok: true, value };
  }
  return { ok: true, value: text };
}

// "25", "25,9", "1.234,56", "1,234.56" -> number
export function parseDecimal(text: string): number | null {
  let value = text.trim();
  if (!value || !/^-?[\d.,]+$/.test(value)) return null;
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  if (lastComma > lastDot) value = value.replace(/\./g, '').replace(',', '.');
  else value = value.replace(/,/g, '');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildWireInput(state: AsState, command: AsCommand): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (command.pageParam) setPath(out, command.pageParam, 1);
  if (command.pageSizeParam) setPath(out, command.pageSizeParam, AS_LOOKUP_PAGE_SIZE);
  const target = command.inputs.find(input => input.role === 'ref' && input.ref === command.entity);
  for (const input of command.inputs) {
    if (input.role === 'ref') {
      const pick = state.picked[input.path];
      if (pick) setPath(out, input.path, input.wireType === 'number' ? Number(pick.id) : pick.id);
      continue;
    }
    if (input.role === 'version') {
      const version = target ? state.picked[target.path]?.version : undefined;
      if (typeof version === 'number') setPath(out, input.path, version);
      continue;
    }
    const raw = state.values[input.path];
    if (raw === undefined || raw.trim() === '') continue;
    const checked = validateValue(input, raw);
    if (checked.ok) setPath(out, input.path, checked.value);
  }
  return out;
}

export function summaryLines(state: AsState, command: AsCommand, labels: AsLabels): string[] {
  const lines: string[] = [];
  for (const input of command.inputs) {
    if (input.role === 'version') continue;
    if (input.role === 'ref') {
      const pick = state.picked[input.path];
      if (pick) lines.push(`${input.label}: ${pick.label}`);
      continue;
    }
    const raw = state.values[input.path];
    if (raw === undefined || raw.trim() === '') continue;
    lines.push(`${input.label}: ${shownValue(input, raw, state.userLanguage, labels)}`);
  }
  return lines;
}

function shownValue(input: AsInputField, raw: string, userLanguage: string, labels: AsLabels): string {
  const checked = validateValue(input, raw);
  if (input.wireType === 'boolean') return checked.ok && checked.value === true ? labels.yes : labels.no;
  if (checked.ok && input.valueType === 'date') return formatDateForUser(String(checked.value), userLanguage);
  if (checked.ok && input.valueType === 'timestamp') return formatTimestampForUser(String(checked.value), userLanguage);
  return input.enumValues.find(item => item.value === raw)?.label || raw.trim();
}
