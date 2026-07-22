/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentChangeFrontend.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgentStepPayload, createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

type CliCommand =
  | { kind: 'rebuild-all'; materialize: true; reset: true; module?: string }
  | { kind: 'rebuild-defs'; materialize: false; reset: true; module?: string }
  | { kind: 'run'; materialize: true; reset: false; module?: string }
  | { kind: 'help'; reason: string };

// CLI keywords are never module names — 'all'/'defs' etc. after a command are options, not modules.
const CLI_KEYWORDS = new Set(['rebuild', 'all', 'defs', 'run', 'help']);

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
  const raw = userPrompt || context.message.content || '';
  const command = parseCliCommand(raw);
  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentChangeFrontend deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
        { type: 'human', content: normalizePrompt(raw) || 'agentChangeFrontend' },
      ],
      taskTitle: 'agentChangeFrontend',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'agentChangeFrontend', flowName: 'agentChangeFrontend', version: 'create-v1', cliCommand: command.kind },
    },
  };

  if (command.kind === 'help') {
    return [addMessageAI, createBootstrapAddStepIntent(context, createHelpStep(command.reason))];
  }

  const reset = command.reset ? await resetFrontendDoneStatuses() : { updated: 0, owners: [] };
  const scanStep = createAgentStepPayload(
    'scan-create-l4',
    'agentCfeCreateScanL4',
    'Ler L4 e criar paginas pendentes',
    { command: command.kind, reset, materialize: command.materialize, forceMaterialize: command.kind === 'rebuild-all', module: command.module },
    [],
    'sequential',
    'waiting_human_input',
  );
  return [addMessageAI, createBootstrapAddStepIntent(context, scanStep)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${agent.agentName}] task invalid`);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed without using the model payload.')];
}

function parseCliCommand(prompt: string): CliCommand {
  const tokens = stripAgentPrefix(prompt).split(' ').filter(Boolean);
  const keywords = new Set(tokens.map(token => token.replace(/^\//, '').toLowerCase()).filter(token => CLI_KEYWORDS.has(token)));
  // Optional module: the first non-command token (no leading slash, not a CLI keyword). Case is
  // preserved because module names are canonical camelCase. "all"/"defs" are never modules.
  const module = tokens.find(token => !token.startsWith('/') && !CLI_KEYWORDS.has(token.toLowerCase())) || undefined;

  if (keywords.has('help')) return { kind: 'help', reason: '' };
  if (keywords.has('rebuild')) {
    if (keywords.has('defs')) return { kind: 'rebuild-defs', materialize: false, reset: true, module };
    return { kind: 'rebuild-all', materialize: true, reset: true, module };
  }
  return { kind: 'run', materialize: true, reset: false, module };
}

// Strip the @@changeFrontend / @@agentChangeFrontend prefix, preserving original case (module names).
function stripAgentPrefix(prompt: string): string {
  return String(prompt || '')
    .trim()
    .replace(/^@@(?:agentChangeFrontend|changeFrontend)(?:\s+|$)/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePrompt(prompt: string): string {
  return stripAgentPrefix(prompt).toLowerCase();
}

// Reset generation status in l5/{module}/todoFrontend.defs.ts (done -> toCreate). The l4 owner
// defs are read-only for this agent; status lives only in the todo (mirrors agentChangeBackend).
async function resetFrontendDoneStatuses(): Promise<{ updated: number; owners: string[] }> {
  const owners: string[] = [];
  const project = mls.actualProject || 0;
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted' || file.extension !== '.defs.ts') continue;
    if (String(file.shortName || '') !== 'todoFrontend') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!parsed) continue;
    const todoOwners = Array.isArray(parsed.data.owners)
      ? parsed.data.owners.filter((o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o))
      : [];
    let changed = false;
    for (const owner of todoOwners) {
      if (readString(owner.status) !== 'done') continue;
      owner.status = 'toCreate';
      owners.push(`${readString(owner.ownerType)}:${readString(owner.ownerId)}`);
      changed = true;
    }
    if (changed) {
      parsed.data.updatedAt = new Date().toISOString();
      await saveConstDefault(file, parsed.exportName, parsed.data);
    }
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

function createBootstrapAddStepIntent(context: mls.msg.ExecutionContext, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step,
  };
}

function createHelpStep(reason: string): mls.msg.AIPayload {
  return createAgentStepPayload('help', 'agentCfeHelp', 'Help', { reason, helpText: HELP_TEXT }, [], 'sequential', 'waiting_human_input');
}

const HELP_TEXT = `agentChangeFrontend

Uso:
@@changeFrontend /run [module]
@@changeFrontend /rebuild all [module]
@@changeFrontend /rebuild defs [module]
@@changeFrontend /help

Comandos:
- /run          : default. Varre o todoFrontend por status = toCreate e materializa .ts quando o .defs.ts for mais novo ou o .ts nao existir. O l4 e read-only.
- /rebuild all  : altera owners do todoFrontend com status = done para toCreate, regenera .defs.ts e materializa .ts/config por updatedAt.
- /rebuild defs : altera owners do todoFrontend com status = done para toCreate e regenera somente os .defs.ts. Nao materializa .ts/config.
- /help         : mostra esta ajuda.

Modulo (opcional): cada run processa um unico modulo. Informe o nome do modulo apos o comando
(ex: @@changeFrontend /rebuild all cafeFlow) para escolher qual; sem ele, assume o primeiro modulo
com pendencias. 'all'/'defs' sao palavras do comando, nunca nome de modulo.`;
