/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/steps/t1-plan/gate.ts" enhancement="_blank"/>

// t1-plan gate (pure — unit-testable). Normalizes the cheap classifier payload into an
// NtPlan and validates it. flow.json t1-plan: NO retry — a failure here is readable and
// immediate (the plan is what the whole pipeline reads from l4/agentNewTheme/plan.json).

import {
  NtBackgroundKind,
  NtPlan,
  NtQuestion,
  NtQuestionOption,
  NtThemeFields,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';

export interface NtGateIssue {
  code: string;
  message: string;
}

// The canonical fields the checkpoint may ask about. surface / on-surface text are DERIVED
// from background.kind and are never asked (flow.json conventions.themeFields).
// 'extra' is not a theme field: it is the free-text slot where the user pastes what the
// coarse enums cannot express (exact values, signature interactions, things to avoid).
// It never appears in `known` — only as the last question.
export const NT_EXTRA_FIELD = 'extra';

export const NT_QUESTION_FIELDS = [
  'name',
  'displayName',
  NT_EXTRA_FIELD,
  'background.kind',
  'background.css',
  'primary',
  'corners',
  'border.style',
  'border.color',
  'shadow',
  'motion',
  'typography.family',
  'typography.uppercaseLabels',
] as const;

// Worst case is every canonical field asked (7 closed + 2 identity + 3 open) plus the
// free-text slot = 13; the cap is only a runaway guard. It used to be 8, from when the
// checkpoint asked ONLY the missing fields — with confirmation of inferred values that
// would silently drop questions (the slice keeps the first N).
export const NT_MAX_QUESTIONS = 14;

// Fields with a closed set of answers: the question MUST offer them as options, using
// these ids. Every other canonical field (name, primary, border.color, background.css)
// is OPEN — answered by typing, so it may come with no options at all.
const ENUMS: Record<string, readonly string[]> = {
  'background.kind': ['light', 'dark', 'image'],
  corners: ['sharp', 'rounded', 'pill'],
  'border.style': ['none', 'thin', 'thick'],
  shadow: ['none', 'soft', 'offset'],
  motion: ['smooth', 'instant', 'none'],
  'typography.family': ['sans', 'mono', 'serif'],
  'typography.uppercaseLabels': ['true', 'false'],
};

// Tolerant extraction: the cheap call may come back raw, wrapped in the 'flexible'
// envelope, or as a JSON string. Unknown/invalid members are dropped, not guessed.
export function normalizeNtPlan(payload: unknown): NtPlan {
  const parsed = parseMaybeJson(payload);
  const record = isRecord(parsed) ? parsed : {};
  const inner = record.type === 'flexible' || record.result !== undefined ? parseMaybeJson(record.result) : record;
  const result = isRecord(inner) ? inner : record;

  const questions = Array.isArray(result.questions)
    ? result.questions.map(normalizeQuestion).filter((item): item is NtQuestion => item !== null).slice(0, NT_MAX_QUESTIONS)
    : [];

  return {
    validInput: result.validInput !== false,
    invalidReason: readString(result.invalidReason),
    userLanguage: readString(result.userLanguage) || 'pt',
    title: readString(result.title) || 'New theme',
    known: normalizeKnown(result.known),
    questions,
  };
}

export function runPlanGate(plan: NtPlan): NtGateIssue[] {
  const issues: NtGateIssue[] = [];

  if (!plan.validInput) {
    return [{ code: 'invalid_input', message: plan.invalidReason || 'the request is not a theme description' }];
  }

  const seen = new Set<string>();
  for (const question of plan.questions) {
    if (!NT_QUESTION_FIELDS.includes(question.field as typeof NT_QUESTION_FIELDS[number])) {
      issues.push({ code: 'question_field', message: `unknown question field '${question.field}' — ask only about the canonical theme fields` });
      continue;
    }
    if (seen.has(question.field)) {
      issues.push({ code: 'question_duplicate', message: `field '${question.field}' asked more than once` });
    }
    seen.add(question.field);

    const ids = new Set(question.options.map(option => option.id));
    if (ids.size !== question.options.length) {
      issues.push({ code: 'option_ids', message: `question '${question.field}' has duplicate option ids` });
    }
    const allowed = ENUMS[question.field];
    if (allowed) {
      if (question.options.length < 2) {
        issues.push({ code: 'question_options', message: `question '${question.field}' has a closed set of answers — offer at least 2 options (with one recommended default)` });
      }
      const invalid = question.options.map(option => option.id).filter(id => !allowed.includes(id));
      if (invalid.length) {
        issues.push({ code: 'option_enum', message: `question '${question.field}' options must be ids from [${allowed.join(', ')}] (got ${invalid.join(', ')})` });
      }
    } else if (question.options.length < 2 && !question.allowNotes) {
      // Open fields are answered by typing; suggestions are welcome but optional. What
      // is NOT acceptable is a question the widget can never mark as answered.
      issues.push({ code: 'question_unanswerable', message: `question '${question.field}' is open (free text): either offer 2+ suggestions or set allowNotes: true` });
    }
    if (question.options.filter(option => option.recommended).length > 1) {
      issues.push({ code: 'option_recommended', message: `question '${question.field}' marks more than one option as recommended` });
    }
  }

  // A field may be asked even when `known` carries a value — that is how the human gets to
  // SEE and correct it (the theme that came out named 'brutalismo' did so because the plan
  // inferred the name and the checkpoint was forbidden from showing it). What is not
  // acceptable is asking without pre-selecting: the human would have to retype a decision
  // that is already made.
  for (const question of plan.questions) {
    const knownValue = readKnownField(plan.known, question.field);
    if (knownValue === undefined) continue;
    const preselected = question.options.some(option => option.id === knownValue && option.recommended);
    if (!preselected) {
      issues.push({
        code: 'question_not_preselected',
        message: `question '${question.field}' asks about a value that is already decided ('${knownValue}') — offer it as an option with recommended: true so the human only has to confirm it`,
      });
    }
  }

  for (const [field, allowed] of Object.entries(ENUMS)) {
    const value = readKnownField(plan.known, field);
    if (value !== undefined && !allowed.includes(value)) {
      issues.push({ code: 'known_enum', message: `known.${field} must be one of [${allowed.join(', ')}] (got '${value}')` });
    }
  }

  return issues;
}

// ---- helpers ----

function normalizeKnown(value: unknown): NtThemeFields {
  if (!isRecord(value)) return {};
  const known: NtThemeFields = {};
  const name = readString(value.name);
  if (name) known.name = name;
  const displayName = readString(value.displayName);
  if (displayName) known.displayName = displayName;
  const suffix = readString(value.suffix);
  if (suffix) known.suffix = suffix.startsWith('-') ? suffix : `-${suffix}`;
  const primary = readString(value.primary);
  if (primary) known.primary = primary;

  if (isRecord(value.background)) {
    const kind = readString(value.background.kind);
    const css = readString(value.background.css);
    const background: NonNullable<NtThemeFields['background']> = {};
    if (kind) background.kind = kind as NtBackgroundKind;
    if (css) background.css = css;
    if (background.kind || background.css) known.background = background;
  }
  if (isRecord(value.border)) {
    const style = readString(value.border.style);
    const color = readString(value.border.color);
    const border: NonNullable<NtThemeFields['border']> = {};
    if (style) border.style = style as NonNullable<NtThemeFields['border']>['style'];
    if (color) border.color = color;
    if (border.style || border.color) known.border = border;
  }
  if (isRecord(value.typography)) {
    const family = readString(value.typography.family);
    const typography: NonNullable<NtThemeFields['typography']> = {};
    if (family) typography.family = family as NonNullable<NtThemeFields['typography']>['family'];
    if (typeof value.typography.uppercaseLabels === 'boolean') typography.uppercaseLabels = value.typography.uppercaseLabels;
    if (typography.family !== undefined || typography.uppercaseLabels !== undefined) known.typography = typography;
  }
  const corners = readString(value.corners);
  if (corners) known.corners = corners as NtThemeFields['corners'];
  const shadow = readString(value.shadow);
  if (shadow) known.shadow = shadow as NtThemeFields['shadow'];
  const motion = readString(value.motion);
  if (motion) known.motion = motion as NtThemeFields['motion'];
  return known;
}

function normalizeQuestion(value: unknown): NtQuestion | null {
  if (!isRecord(value)) return null;
  const field = readString(value.field);
  const question = readString(value.question);
  if (!field || !question) return null;
  const options = Array.isArray(value.options)
    ? value.options.map(normalizeOption).filter((item): item is NtQuestionOption => item !== null)
    : [];
  return { field, question, options, allowNotes: value.allowNotes !== false };
}

function normalizeOption(value: unknown): NtQuestionOption | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  const label = readString(value.label);
  if (!id || !label) return null;
  const option: NtQuestionOption = { id, label };
  const description = readString(value.description);
  if (description) option.description = description;
  if (value.recommended === true) option.recommended = true;
  return option;
}

// 'background.kind' -> known.background?.kind, as the string an option id would carry
// (booleans included: uppercaseLabels true -> 'true').
function readKnownField(known: NtThemeFields, field: string): string | undefined {
  const [head, tail] = field.split('.');
  const container = (known as unknown as Record<string, unknown>)[head];
  const value = tail ? (isRecord(container) ? container[tail] : undefined) : container;
  if (typeof value === 'boolean') return String(value);
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}
