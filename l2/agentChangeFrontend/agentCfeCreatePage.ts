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
  saveContractDefs,
  savePageLayoutDefs,
  saveSharedDefs,
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
    consumeCreateDiagnostics();
    const { pageId } = parseCreatePageArgs(args || step.prompt);
    const createContext = await readCreateContext();
    const page = createContext.pages.find(item => item.pageId === pageId);
    if (!page) throw new Error(`page not found for create: ${pageId}`);
    const prepared = await preparePageCreate(page);
    await saveContractDefs(prepared);
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
    consumeCreateDiagnostics();
    const { pageId } = parseCreatePageArgs(step.prompt);
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing LLM payload');
    const output = extractCfePageLayoutOutput(payload);
    if (output.status !== 'ok') throw new Error(output.questions.join('; ') || `${AGENT_NAME} returned ${output.status}`);

    const createContext = await readCreateContext();
    const page = createContext.pages.find(item => item.pageId === pageId);
    if (!page) throw new Error(`page not found for layout save: ${pageId}`);
    const prepared = await preparePageCreate(page);
    const layout = await savePageLayoutDefs(prepared, output.result.pageLayout);
    await saveSharedDefs(prepared, layout);
    const diagnostics = consumeCreateDiagnostics();
    const trace = diagnostics.length ? formatCreateDiagnostics(diagnostics) : undefined;
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function consumeCreateDiagnostics(): string[] {
  const w = window as any;
  const diagnostics = Array.isArray(w.__agentChangeFrontendCreateDiagnostics) ? w.__agentChangeFrontendCreateDiagnostics : [];
  w.__agentChangeFrontendCreateDiagnostics = [];
  return diagnostics.map(String);
}

function formatCreateDiagnostics(diagnostics: string[]): string {
  return `Warnings:\n${diagnostics.map(item => `- ${item}`).join('\n')}`;
}

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME}, the page-layout agent for collab.codes Stage 2 frontend creation.

Create the semantic layout for exactly ONE page11 .defs.ts file. Call the "${cfePageLayoutToolName}"
tool with { status, result, questions, trace }. Do not return prose.

Tool argument shape:
- status must be "ok".
- result must contain only { pageLayout }.
- questions must be [] when there are no questions.
- trace must be [] when there is no trace to report.
- Do not put i18n, dataBindings or any pageLayout field beside result.pageLayout.

The result must preserve the section -> organism structure:
- result.pageLayout.sections[] is the source of truth for page sections.
- every section contains organisms[].
- every organism contains intentions[].
- keep compatibility fields sectionName, mode, organismName, userActions, requiredEntities,
  readsFields, writesFields and rulesApplied.

Layout rules:
- Stable ids are required for sections, organisms, intentions, fields, columns and actions.
- Every section must include sectionName.
- Prefer including result.pageLayout.i18n and result.pageLayout.dataBindings; use {} and [] when empty.
- result.pageLayout.i18n must be a flat object of "key": "localized text for the project default locale";
  do not hard-code locale keys in the shape and do not return empty strings.
- Before creating sections, read promptContext.userJourney. Use operationsInOrder and recommendedStages as the main sequence for the page.
- If userJourney.isMultiStep is true, create distinct intentions for the stages instead of one generic form.
- For parent-child flows such as orders with items, separate the parent/header command, item management, totals/summary and status/conclusion actions.
- Query/list/selection intentions should appear before dependent create/update/status command intentions when both exist.
- Use order numbers in increments of 10.
- Always include fields, columns, filters, toolbar, rowActions and actions arrays on every intention;
  use [] when a list is empty.
- Use plain page11 intentions such as "queryList", "commandForm", "summary", "workflowStatus",
  "actionList" or another short semantic intent.
- Do not reference molecule groups, molecule tags, web-component tags, DOM slots or package-specific component names.
- Use fields/columns/filters/action references only from the provided contract/shared context.
- Do not invent actions, entities, commands or payloads.
- The only legal BFF action values are shared.availableActions from the prompt. This applies to
  organism.userActions, intention.action, intention.submitAction, toolbar[].action, rowActions[].action
  and actions[].action.
- Use shared.baseStateKeys only when you need to reference an existing state explicitly.
- Do not invent stateKey values. If a layout element needs state and no shared.baseStateKeys entry fits,
  omit stateKey; the agent will reconcile page11 state references into shared after layout generation.
- Do not use UI-only action names such as select*, cancel, close, open, edit, view, remove or clear
  unless the exact name appears in shared.availableActions. Row selection and cancel/reset gestures
  should be represented as state/display intent or omitted, not as BFF actions.
- Treat all filters, form fields, selections, loaded data and action statuses as shared state.
- Do not describe local page variables; page11 will only render shared state and call shared handlers.
- Do not output HTML, CSS, web component slots, raw DOM or design-system implementation details.
- All visible text must be referenced by titleKey, labelKey or emptyKey and declared in i18n.
- Prefer useful operational layouts: list/search/table for query/view commands, form/action panel for
  create/update/delete commands, status/summary/action intentions for workflows.
`;
