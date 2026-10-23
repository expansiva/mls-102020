/// <mls fileReference="_102020_/l2/agentAssistant/steps/interpret/tool.ts" enhancement="_blank"/>

// Pure prompt/tool assembly of the interpret call (unit-testable without mls).

import { buildVToolInstruction, createVToolSchema, type VLlmTool } from '/_102020_/l2/aura/molecules/shared/llmTool.js';
import type { AsCatalog } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import type { AsToday } from '/_102020_/l2/agentAssistant/helpers/asDates.js';
import { catalogForPrompt } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';

export const AS_INTERPRET_TOOL = 'submitAssistantPlan';
export const AS_INTERPRET_RESULT_KEYS = ['userLanguage', 'reply', 'mode', 'candidates', 'manual'];

export function buildInterpretTool(schema: Record<string, unknown>): VLlmTool {
  return createVToolSchema(AS_INTERPRET_TOOL, 'Submit the candidate app actions for the user sentence', schema);
}

export function buildInterpretSystemPrompt(promptMd: string): string {
  return `${promptMd}\n\n${buildVToolInstruction(AS_INTERPRET_TOOL, 'the catalog is empty or unreadable')}`;
}

// appMap: manualIndex() of the app's defs; absent when the manual could not be read (the
// 'manual' mode is then simply not offered).
export function buildInterpretHumanPrompt(userText: string, catalog: AsCatalog, today: AsToday, appMap?: Record<string, unknown> | null): string {
  return [
    `## Today\n${today.date} (${today.weekday}), ${today.time} local time`,
    `## User sentence\n${userText}`,
    `## Catalog\n${JSON.stringify(catalogForPrompt(catalog))}`,
    appMap ? `## App map\n${JSON.stringify(appMap)}` : '## App map\n(not available: do not use mode "manual")',
  ].join('\n\n');
}
