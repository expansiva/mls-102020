/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentChangeFrontend.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/cfeCreateShared.js';

type CliCommand = { kind: 'rebuildAll' } | { kind: 'help'; reason: string };
type RootPayload = { type?: string; result?: string; help?: string };

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentChangeFrontend',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Stage 2 frontend reconciler. Create-only frontend defs and config from l4.',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const command = parseCliCommand(userPrompt);
  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt(command) },
        { type: 'human', content: normalizePrompt(userPrompt) },
      ],
      taskTitle: 'agentChangeFrontend',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'agentChangeFrontend', flowName: 'agentChangeFrontend', version: 'create-v1', cliCommand: command.kind },
    },
  };
  return [addMessageAI];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${agent.agentName}] task invalid`);
  const payload = step.interaction?.payload?.[0] as RootPayload | undefined;
  if (!payload || payload.type !== 'result' || payload.result !== 'rebuild_all') {
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', payload?.help || HELP_TEXT)];
  }

  const reset = await resetFrontendDoneStatuses();
  console.log(`[${agent.agentName}] /rebuild all reset ${reset.updated} owner(s) from done to toCreate`);
  const scanStep = createAgentStepPayload(
    'scan-create-l4',
    'agentCfeCreateScanL4',
    'Ler L4 e criar paginas pendentes',
    { command: '/rebuild all', reset },
    [],
    'sequential',
    'waiting_human_input',
  );
  return [createAddStepIntent(context, step, scanStep)];
}

function parseCliCommand(prompt: string): CliCommand {
  const normalized = normalizePrompt(prompt);
  if (normalized === '/rebuild all') return { kind: 'rebuildAll' };
  return { kind: 'help', reason: normalized ? `Comando desconhecido: ${normalized}` : 'Comando ausente.' };
}

function normalizePrompt(prompt: string): string {
  return String(prompt || '')
    .trim()
    .replace(/^@@(?:agentChangeFrontend|changeFrontend)\s+/i, '')
    .replace(/\s+/g, ' ');
}

function systemPrompt(command: CliCommand): string {
  const result = command.kind === 'rebuildAll'
    ? { type: 'result', result: 'rebuild_all' }
    : { type: 'result', result: 'help', help: HELP_TEXT };
  return `
<!-- modelType: codefast -->

Return only this exact JSON object:
${JSON.stringify(result)}

agentChangeFrontend is a strict CLI-like agent. It accepts only /rebuild all.
`;
}

async function resetFrontendDoneStatuses(): Promise<{ updated: number; owners: string[] }> {
  const owners: string[] = [];
  const project = mls.actualProject || 0;
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted' || file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    if (folder !== 'operations' && folder !== 'workflows') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!parsed || parsed.data.statusFrontend !== 'done') continue;
    parsed.data.statusFrontend = 'toCreate';
    await saveConstDefault(file, parsed.exportName, parsed.data);
    owners.push(`${folder.slice(0, -1)}:${readString(parsed.data.operationId) || readString(parsed.data.workflowId) || file.shortName}`);
  }
  return { updated: owners.length, owners };
}

function parseDefsSource(content: string): { exportName: string; data: Record<string, unknown> } | null {
  const exportMatch = content.match(/export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/);
  if (!exportMatch) return null;
  const json = extractJsonLiteral(content, exportMatch.index || 0);
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    return data && typeof data === 'object' && !Array.isArray(data) ? { exportName: exportMatch[1], data } : null;
  } catch {
    return null;
  }
}

function extractJsonLiteral(content: string, fromIndex: number): string {
  const firstObject = content.indexOf('{', fromIndex);
  if (firstObject === -1) return '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = firstObject; index < content.length; index += 1) {
    const char = content[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return content.slice(firstObject, index + 1);
    }
  }
  return '';
}

async function saveConstDefault(file: any, exportName: string, data: Record<string, unknown>): Promise<void> {
  const header = `/// <mls fileReference="${toDisplayRef(file)}" enhancement="_blank"/>\n\n`;
  const content = `${header}export const ${exportName} = ${JSON.stringify(data, null, 2)} as const;\n\nexport default ${exportName};\n`;
  await mls.stor.localStor.setContent(file, { contentType: 'string', content });
}

function toDisplayRef(file: any): string {
  const folder = file.folder ? `${file.folder}/` : '';
  return `_${file.project}_/l${file.level}/${folder}${file.shortName}${file.extension}`;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

const HELP_TEXT = `agentChangeFrontend

Uso:
@@changeFrontend /rebuild all

Comportamento:
- altera l4 operations/workflows com statusFrontend = done para toCreate
- nao deleta arquivos gerados
- a geracao seguinte sobrescreve os .defs.ts e atualiza config.json

Qualquer outro comando apenas mostra este help.`;
