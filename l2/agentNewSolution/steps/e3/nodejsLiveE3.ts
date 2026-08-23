/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e3/nodejsLiveE3.ts" enhancement="_blank"/>

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Ns4ModuleArtifact } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import { normalizeNs4E3Review } from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import { validateNs4E3Review } from '/_102020_/l2/agentNewSolution/steps/e3/gate.js';

interface OpenAiResponse {
  model?: string;
  usage?: Record<string, unknown>;
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: string };
}

const ROOT = path.resolve(path.dirname(path.resolve(process.argv[1] || '.')), '../../../../..');

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const moduleDir = path.join(ROOT, `mls-${args.project}`, 'l4', args.moduleName);
  const pipelineDir = path.join(moduleDir, 'pipeline');
  const [moduleSource, journeysSource, promptTemplate, platformSkill] = await Promise.all([
    readFile(path.join(moduleDir, 'module.defs.ts'), 'utf8'),
    readFile(path.join(pipelineDir, 'e2-journeys-draft.json'), 'utf8'),
    readFile(path.join(ROOT, 'mls-102020/l2/agentNewSolution/steps/e3/prompt.md'), 'utf8'),
    readFile(path.join(ROOT, 'mls-102020/l2/agentNewSolution/skills/platform.md'), 'utf8'),
  ]);
  const moduleArtifact = parseDefs(moduleSource) as Ns4ModuleArtifact;
  const journeys = normalizeNs4E2Review(JSON.parse(journeysSource), args.moduleName);
  if (moduleArtifact.module.moduleName !== args.moduleName || journeys.moduleName !== args.moduleName) {
    throw new Error(`Module or E2 draft does not belong to ${args.moduleName}.`);
  }
  const systemPrompt = promptTemplate.replace('{{platformSkill}}', platformSkill);
  const model = parseModelType(promptTemplate);
  const humanPrompt = [
    '## Approved module contract', JSON.stringify(moduleArtifact), '',
    '## Approved E2 journeys', JSON.stringify(journeys), '',
    '## Required review round', '1',
  ].join('\n');

  const config = await loadLlmConfig();
  const startedAt = new Date().toISOString();
  const response = await callCollabLlm(config, { model, systemPrompt, humanPrompt });
  const finishedAt = new Date().toISOString();
  const parsed = parseJsonContent(response.choices?.[0]?.message?.content);
  const payload = isRecord(parsed) && parsed.type === 'flexible' ? parseJsonContent(parsed.result) : parsed;
  if (!isRecord(payload) || payload.type !== 'clarification' || !isRecord(payload.json)) {
    if (args.write) await writeTrace(pipelineDir, { startedAt, finishedAt, model, response, parsed: payload, gate: null });
    throw new Error('collab-llm returned no valid E3 clarification payload.');
  }
  const review = normalizeNs4E3Review(payload.json, args.moduleName);
  review.moduleName = args.moduleName;
  review.reviewRound = 1;
  const gate = validateNs4E3Review(review, journeys);
  if (args.write) {
    await mkdir(pipelineDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(pipelineDir, 'e3-live-review.json'), `${JSON.stringify(review, null, 2)}\n`),
      writeTrace(pipelineDir, { startedAt, finishedAt, model, response, parsed: payload, gate }),
    ]);
  }
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  process.stdout.write(`${JSON.stringify({
    ok: true, mode: args.write ? 'write-draft' : 'dry-run', project: args.project,
    moduleName: args.moduleName, model, profileCount: review.profiles.length,
    authorityCount: review.authorities.length, grantCount: review.grants.length,
    usage: response.usage || null,
  }, null, 2)}\n`);
}

async function callCollabLlm(
  config: { baseUrl: string; token: string; orgId: string },
  input: { model: string; systemPrompt: string; humanPrompt: string },
): Promise<OpenAiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 200_000);
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', Authorization: `Bearer ${config.token}`,
        'X-Title': 'agentNewSolution E3 live test', 'X-Collab-Origin': 'agentNewSolution',
        'X-User-Id': 'agentNewSolution-live-test', 'X-Org-Id': config.orgId, 'X-Agent-Name': 'agentNewSolution',
      },
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: 'system', content: input.systemPrompt }, { role: 'user', content: input.humanPrompt }],
        stream: false, temperature: 0, max_tokens: 65_536,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    let body: OpenAiResponse;
    try { body = JSON.parse(text) as OpenAiResponse; }
    catch { throw new Error(`collab-llm returned non-JSON HTTP ${response.status}: ${text.slice(0, 500)}`); }
    if (!response.ok) throw new Error(`collab-llm HTTP ${response.status}: ${body.error?.message || text.slice(0, 500)}`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadLlmConfig(): Promise<{ baseUrl: string; token: string; orgId: string }> {
  const envSource = await readFile(path.join(ROOT, '.env'), 'utf8');
  const fileEnv = parseEnv(envSource);
  const env = { ...fileEnv, ...process.env };
  const baseUrl = String(env.COLLAB_LLM_BASE_URL || '').trim();
  const token = String(env.COLLAB_LLM_TOKEN || '').trim();
  const orgId = String(env.COLLAB_LLM_ORG_ID || 'collab').trim();
  if (!baseUrl || !token) throw new Error('COLLAB_LLM_BASE_URL and COLLAB_LLM_TOKEN are required.');
  return { baseUrl, token, orgId };
}

function parseArgs(argv: string[]): { project: number; moduleName: string; write: boolean } {
  const positional = argv.filter(item => !item.startsWith('--'));
  const project = Number(positional[0]);
  const moduleName = positional[1] || '';
  if (!Number.isInteger(project) || project < 1 || !/^[a-z][A-Za-z0-9]*$/.test(moduleName)) {
    throw new Error('Usage: nodejsLiveE3.ts <project> <moduleName> [--write]');
  }
  return { project, moduleName, write: argv.includes('--write') };
}

function parseModelType(prompt: string): string {
  return /<!--\s*modelType:\s*([^\s]+)\s*-->/i.exec(prompt)?.[1] || 'reasoning';
}

function parseJsonContent(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function parseDefs(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', assignment);
  if (assignment < 0 || start < 0) throw new Error('Invalid module.defs.ts export.');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return JSON.parse(source.slice(start, index + 1));
  }
  throw new Error('Unterminated module.defs.ts object.');
}

function parseEnv(source: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const raw = match[2].trim();
    env[match[1]] = ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
      ? raw.slice(1, -1) : raw;
  }
  return env;
}

async function writeTrace(pipelineDir: string, value: unknown): Promise<void> {
  await mkdir(pipelineDir, { recursive: true });
  await writeFile(path.join(pipelineDir, 'e3-live-llm-response.json'), `${JSON.stringify(value, null, 2)}\n`);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

void main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
