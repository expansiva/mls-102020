/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeCreatePage.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  cfePageLayoutToolName,
  cfePageLayoutToolSchema,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  extractCfePageLayoutOutput,
  parseCreatePageArgs,
  preparePageCreate,
  readCreateContext,
  saveContractSharedDefs,
  savePageLayoutDefs,
} from '/_102020_/l2/agentChangeFrontend/cfeCreateShared.js';

const AGENT_NAME = 'agentCfeCreatePage';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreatePage',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Create contract/shared defs deterministically and page layout defs with LLM',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const { pageId } = parseCreatePageArgs(args || step.prompt);
    const createContext = await readCreateContext();
    const page = createContext.pages.find(item => item.pageId === pageId);
    if (!page) throw new Error(`page not found for create: ${pageId}`);
    const prepared = await preparePageCreate(page);
    await saveContractSharedDefs(prepared);
    console.log(`[${agent.agentName}] prepared contract/shared for ${page.moduleName}/${page.pageId}`);
    return [
      createPromptReadyIntent(
        context,
        parentStep,
        hookSequential,
        args || step.prompt || JSON.stringify({ pageId }),
        systemPrompt,
        `## Page selector\n${pageId}\n\n## Reduced L4 + contract/shared context\n${JSON.stringify(prepared.promptContext, null, 2)}\n`,
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
  try {
    const { pageId } = parseCreatePageArgs(step.prompt);
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing LLM payload');
    const output = extractCfePageLayoutOutput(payload);
    if (output.status !== 'ok') throw new Error(output.questions.join('; ') || `${AGENT_NAME} returned ${output.status}`);

    const createContext = await readCreateContext();
    const page = createContext.pages.find(item => item.pageId === pageId);
    if (!page) throw new Error(`page not found for layout save: ${pageId}`);
    const prepared = await preparePageCreate(page);
    await savePageLayoutDefs(prepared, output.result.pageLayout);
    console.log(`[${agent.agentName}] created page layout defs for ${page.moduleName}/${page.pageId}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME}, the page-layout agent for collab.codes Stage 2 frontend creation.

Create the semantic layout for exactly ONE page11 .defs.ts file. Call the "${cfePageLayoutToolName}"
tool with { status, result, questions, trace }. Do not return prose.

The result must preserve the section -> organism structure:
- result.pageLayout.sections[] is the source of truth for page sections.
- every section contains organisms[].
- every organism contains molecules[].
- keep compatibility fields sectionName, mode, organismName, userActions, requiredEntities,
  readsFields, writesFields and rulesApplied.

Layout rules:
- Stable ids are required for sections, organisms, molecules, fields, columns and actions.
- Use order numbers in increments of 10.
- Use semantic molecule types such as "form", "groupviewtable.mlDataTable", "summaryPanel",
  "statusTimeline", "actionBar" or similarly descriptive registered intent names.
- Use fields/columns/filters/action references only from the provided contract/shared context.
- Do not invent actions, entities, commands or payloads.
- Do not output HTML, CSS, web component slots, raw DOM or design-system implementation details.
- All visible text must be referenced by titleKey, labelKey or emptyKey and declared in i18n.
- Prefer useful operational layouts: list/search/table for query/view commands, form/action panel for
  create/update/delete commands, status/timeline/summary molecules for workflows.
`;
