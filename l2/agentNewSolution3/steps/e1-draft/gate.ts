/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e1-draft/gate.ts" enhancement="_blank"/>

import {
  Ns3GateCheck,
  Ns3GateIssue,
  errorIssue,
  warningIssue,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  collectDuplicateIds,
  normalizeModuleFolderName,
  reserveModuleFolderName,
  uniqueNs3Id,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';

export const E1_DRAFT_SCHEMA_VERSION = '2026-07-05-ns3-e1-v1';

export interface Ns3E1Actor {
  actorId: string;
  name: string;
  assumption: string;
}

export interface Ns3E1OpenQuestion {
  questionId: string;
  question: string;
  classification: 'blocking' | 'assumed';
  defaultAnswer?: string;
  impact: string;
}

export interface Ns3E1DraftArtifact {
  schemaVersion: typeof E1_DRAFT_SCHEMA_VERSION;
  moduleName: string;
  moduleTitle: string;
  userLanguage: string;
  sourcePrompt: string;
  problem: string;
  actors: Ns3E1Actor[];
  scope: { in: string[]; out: string[] };
  openQuestions: Ns3E1OpenQuestion[];
  assumptions: string[];
  createdAt: string;
}

export interface E1GateOptions {
  existingModules?: Iterable<string>;
  requestedModuleFallback?: string;
}

export function prepareE1DraftArtifact(input: unknown, options: E1GateOptions = {}): Ns3E1DraftArtifact {
  const record = asRecord(input, 'artifact');
  const usedActors = new Set<string>();
  const usedQuestions = new Set<string>();
  const sourcePrompt = readString(record.sourcePrompt) || readString(record.prompt) || options.requestedModuleFallback || 'module';
  const moduleName = reserveModuleFolderName(record.moduleName, sourcePrompt, options.existingModules || []);

  return {
    schemaVersion: E1_DRAFT_SCHEMA_VERSION,
    moduleName,
    moduleTitle: readString(record.moduleTitle) || humanizeModuleName(moduleName),
    userLanguage: readString(record.userLanguage) || 'en',
    sourcePrompt,
    problem: readString(record.problem) || 'Problem not described.',
    actors: readArray(record.actors).map((item, index) => {
      const actor = asRecord(item, `actors[${index}]`);
      const name = readString(actor.name) || readString(actor.actorId) || `Actor ${index + 1}`;
      return {
        actorId: uniqueNs3Id(actor.actorId || name, usedActors, `actor${index + 1}`),
        name,
        assumption: readString(actor.assumption) || 'Presumed from the initial prompt.',
      };
    }),
    scope: normalizeScope(record.scope),
    openQuestions: readArray(record.openQuestions).map((item, index) => {
      const question = asRecord(item, `openQuestions[${index}]`);
      const classification = question.classification === 'blocking' ? 'blocking' : 'assumed';
      const normalized: Ns3E1OpenQuestion = {
        questionId: uniqueNs3Id(question.questionId || question.question, usedQuestions, `question${index + 1}`),
        question: readString(question.question) || `Open question ${index + 1}`,
        classification,
        impact: readString(question.impact) || 'Impacts the next planning step.',
      };
      const defaultAnswer = readString(question.defaultAnswer);
      if (defaultAnswer) normalized.defaultAnswer = defaultAnswer;
      return normalized;
    }),
    assumptions: readArray(record.assumptions).map(item => readString(item)).filter((item): item is string => !!item),
    createdAt: readString(record.createdAt) || new Date().toISOString(),
  };
}

export function validateE1DraftInvariants(
  artifact: Ns3E1DraftArtifact,
  options: E1GateOptions = {},
): Ns3GateCheck<Ns3E1DraftArtifact> {
  const issues: Ns3GateIssue[] = [];
  const normalizedModuleName = normalizeModuleFolderName(artifact.moduleName);
  if (artifact.moduleName !== normalizedModuleName) {
    issues.push(errorIssue('module_name_not_normalized', `moduleName must be ${normalizedModuleName}`, 'moduleName'));
  }

  const existing = new Set(Array.from(options.existingModules || []).map(item => normalizeModuleFolderName(item)));
  if (existing.has(artifact.moduleName)) {
    issues.push(errorIssue('module_name_collision', `module ${artifact.moduleName} already exists`, 'moduleName'));
  }

  const duplicateActors = collectDuplicateIds(artifact.actors.map(actor => actor.actorId));
  if (duplicateActors.length > 0) {
    issues.push(errorIssue('duplicate_actor_ids', `duplicated actors: ${duplicateActors.join(', ')}`, 'actors'));
  }

  const duplicateQuestions = collectDuplicateIds(artifact.openQuestions.map(question => question.questionId));
  if (duplicateQuestions.length > 0) {
    issues.push(errorIssue('duplicate_question_ids', `duplicated questions: ${duplicateQuestions.join(', ')}`, 'openQuestions'));
  }

  artifact.openQuestions.forEach((question, index) => {
    if (question.classification !== 'blocking' && question.classification !== 'assumed') {
      issues.push(errorIssue('question_classification', 'question must be blocking or assumed', `openQuestions[${index}].classification`));
    }
    if (question.classification === 'assumed' && !question.defaultAnswer) {
      issues.push(errorIssue('assumed_question_without_default', 'assumed question must include defaultAnswer', `openQuestions[${index}].defaultAnswer`));
    }
    if (question.classification === 'blocking') {
      issues.push(errorIssue('blocking_question', question.question, `openQuestions[${index}]`));
    }
  });

  if (artifact.scope.in.length === 0) {
    issues.push(warningIssue('empty_scope_in', 'scope.in is empty', 'scope.in'));
  }

  return { artifact, issues, needsHumanInput: issues.some(issue => issue.code === 'blocking_question') };
}

export function renderE1DraftMarkdown(artifact: Ns3E1DraftArtifact): string {
  const lines = [
    `# ${artifact.moduleTitle}`,
    '',
    `Module: \`${artifact.moduleName}\``,
    `Language: ${artifact.userLanguage}`,
    '',
    '## Problem',
    artifact.problem,
    '',
    '## Presumed Actors',
    ...artifact.actors.map(actor => `- ${actor.name} (\`${actor.actorId}\`): ${actor.assumption}`),
    '',
    '## Scope In',
    ...(artifact.scope.in.length ? artifact.scope.in.map(item => `- ${item}`) : ['- Not provided.']),
    '',
    '## Scope Out',
    ...(artifact.scope.out.length ? artifact.scope.out.map(item => `- ${item}`) : ['- Not provided.']),
    '',
    '## Open Questions',
    ...(artifact.openQuestions.length
      ? artifact.openQuestions.map(question => `- [${question.classification}] ${question.question}${question.defaultAnswer ? ` Default: ${question.defaultAnswer}` : ''}`)
      : ['- No open questions.']),
    '',
    '## Assumptions',
    ...(artifact.assumptions.length ? artifact.assumptions.map(item => `- ${item}`) : ['- No additional assumptions.']),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function normalizeScope(value: unknown): { in: string[]; out: string[] } {
  const record = asRecord(value, 'scope', true);
  return {
    in: readArray(record.in).map(item => readString(item)).filter((item): item is string => !!item),
    out: readArray(record.out).map(item => readString(item)).filter((item): item is string => !!item),
  };
}

function asRecord(value: unknown, path: string, allowEmpty = false): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  if (allowEmpty) return {};
  throw new Error(`${path} must be an object`);
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function humanizeModuleName(moduleName: string): string {
  const spaced = moduleName.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.slice(0, 1).toUpperCase() + spaced.slice(1);
}
