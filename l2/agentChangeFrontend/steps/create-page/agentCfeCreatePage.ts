/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-page/agentCfeCreatePage.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  cfePageLayoutToolName,
  cfePageLayoutToolSchema,
  CfePageQualityError,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  extractCfePageLayoutOutput,
  parseCreatePageArgs,
  preparePageCreate,
  readCreateContext,
  saveContractDefs,
  savePageVariants,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import { readCfePrompt } from '/_102020_/l2/agentChangeFrontend/steps/create-page/cfePromptFiles.js';
import { skill as uxGuidanceSkill } from '/_102020_/l2/agentChangeFrontend/skills/uxGuidance.js';

const AGENT_NAME = 'agentCfeCreatePage';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreatePage',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/create-page',
    agentDescription: 'Create contract/shared defs deterministically and page layout defs with LLM',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    consumeCreateDiagnostics();
    const { pageId, qualityFeedback } = parseCreatePageArgs(args || step.prompt);
    const createContext = await readCreateContext();
    const page = createContext.pages.find(item => item.pageId === pageId);
    if (!page) throw new Error(`page not found for create: ${pageId}`);
    const prepared = await preparePageCreate(page);
    await saveContractDefs(prepared);
    const systemPrompt = await buildSystemPrompt();
    return [
      createPromptReadyIntent(
        context,
        parentStep,
        hookSequential,
        args || step.prompt || JSON.stringify({ pageId }),
        systemPrompt,
        `## Page selector\n${pageId}\n\n## Reduced L4 + contract/shared context\n${JSON.stringify(prepared.promptContext, null, 2)}${qualityFeedback ? `\n\n## Deterministic quality feedback (repair every item)\n${qualityFeedback}` : ''}\n`,
        cfePageLayoutToolSchema,
        cfePageLayoutToolName,
      ),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let pageId = '';
  let qualityAttempt = 0;
  let pageResult: Parameters<typeof savePageVariants>[1] | undefined;
  try {
    consumeCreateDiagnostics();
    ({ pageId, qualityAttempt } = parseCreatePageArgs(step.prompt));
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing LLM payload');
    const output = extractCfePageLayoutOutput(payload);
    if (output.status !== 'ok') throw new Error(output.questions.join('; ') || `${AGENT_NAME} returned ${output.status}`);
    pageResult = output.result;

    const createContext = await readCreateContext();
    const page = createContext.pages.find(item => item.pageId === pageId);
    if (!page) throw new Error(`page not found for layout save: ${pageId}`);
    const prepared = await preparePageCreate(page);
    await savePageVariants(prepared, pageResult);
    const diagnostics = consumeCreateDiagnostics();
    const trace = diagnostics.length ? formatCreateDiagnostics(diagnostics) : undefined;
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    if (error instanceof CfePageQualityError && pageId && pageResult) {
      const createContext = await readCreateContext();
      const page = createContext.pages.find(item => item.pageId === pageId);
      if (page) {
        const prepared = await preparePageCreate(page);
        await savePageVariants(prepared, pageResult, true);
        const diagnostics = consumeCreateDiagnostics();
        const trace = [
          `UX-QUALITY-PENDING attempt=${qualityAttempt}: ${message}`,
          ...(diagnostics.length ? [formatCreateDiagnostics(diagnostics)] : []),
        ].join('\n');
        return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
      }
    }
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `PAGE-CREATE-PENDING: ${message}`)];
  }
}

function consumeCreateDiagnostics(): string[] {
  const w = window as any;
  const diagnostics = Array.isArray(w.__agentChangeFrontendCreateDiagnostics) ? w.__agentChangeFrontendCreateDiagnostics : [];
  w.__agentChangeFrontendCreateDiagnostics = [];
  return diagnostics.map(String);
}

function formatCreateDiagnostics(diagnostics: string[]): string {
  return `Generation trace:\n${diagnostics.map(item => `- ${item}`).join('\n')}`;
}

async function buildSystemPrompt(): Promise<string> {
  const prompt = await readCfePrompt('steps/create-page', 'prompt');
  return prompt
    .split('{{agentName}}').join(AGENT_NAME)
    .split('{{toolName}}').join(cfePageLayoutToolName)
    .split('{{uxGuidance}}').join(uxGuidanceSkill);
}
