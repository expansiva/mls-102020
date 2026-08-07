/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/nodejsLiveE2.ts" enhancement="_blank"/>

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Ns4ModuleArtifact } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { validateNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/gate.js';
import {
  normalizeNs4E2CoverageVerdict,
  validateNs4E2CoverageVerdict,
} from '/_102020_/l2/agentNewSolution4/steps/e2/coverageJudge.js';

interface CliArgs {
  project: number;
  moduleName: string;
  write: boolean;
  approve: boolean;
  judgeExisting: boolean;
}

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
  const [moduleSource, promptTemplate, platformSkill] = await Promise.all([
    readFile(path.join(moduleDir, 'module.defs.ts'), 'utf8'),
    readFile(path.join(
      ROOT,
      args.judgeExisting
        ? 'mls-102020/l2/agentNewSolution4/steps/e2/coverageJudge.md'
        : 'mls-102020/l2/agentNewSolution4/steps/e2/prompt.md',
    ), 'utf8'),
    readFile(path.join(ROOT, 'mls-102020/l2/agentNewSolution4/skills/platform.md'), 'utf8'),
  ]);
  const moduleArtifact = parseDefs(moduleSource) as Ns4ModuleArtifact;
  if (moduleArtifact.module.moduleName !== args.moduleName) {
    throw new Error(`module.defs.ts belongs to ${moduleArtifact.module.moduleName}, not ${args.moduleName}`);
  }

  if (args.judgeExisting) {
    await judgeExistingDraft(args, moduleDir, moduleArtifact, promptTemplate);
    return;
  }

  const systemPrompt = promptTemplate.replace('{{platformSkill}}', platformSkill);
  const model = parseModelType(promptTemplate);
  const humanPrompt = [
    '## Approved E1 module contract',
    JSON.stringify(moduleArtifact, null, 2),
    '',
    '## Required review round',
    '1',
  ].join('\n');

  const config = await loadLlmConfig();
  const startedAt = new Date().toISOString();
  const response = await callCollabLlm(config, { model, systemPrompt, humanPrompt });
  const finishedAt = new Date().toISOString();
  const content = response.choices?.[0]?.message?.content;
  const parsed = parseJsonContent(content);
  const payload = isRecord(parsed) && parsed.type === 'flexible' ? parseJsonContent(parsed.result) : parsed;
  if (!isRecord(payload) || payload.planId !== 'e2-review') {
    await writeLiveTrace(pipelineDir, args, { startedAt, finishedAt, model, response, parsed: payload, gate: null });
    throw new Error('collab-llm returned no valid E2 internal review payload');
  }

  const review = normalizeNs4E2Review(payload, args.moduleName);
  review.moduleName = args.moduleName;
  review.reviewRound = 1;
  const gate = validateNs4E2Review(review);
  if (args.write) {
    await mkdir(pipelineDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(pipelineDir, 'e2-live-review.json'), `${JSON.stringify(review, null, 2)}\n`),
      writeLiveTrace(pipelineDir, args, { startedAt, finishedAt, model, response, parsed: payload, gate }),
    ]);
  }
  if (!gate.ok) {
    throw new Error(gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  }

  if (args.write && args.approve) runSmokeWrite(moduleDir, path.join(pipelineDir, 'e2-live-review.json'));
  process.stdout.write(`${JSON.stringify({
    ok: true,
    mode: args.write ? (args.approve ? 'write-and-approve' : 'write-draft') : 'dry-run',
    project: args.project,
    moduleName: args.moduleName,
    model,
    journeyCount: review.journeys.length,
    journeyIds: review.journeys.map(item => item.journeyId),
    usage: response.usage || null,
  }, null, 2)}\n`);
}

function runSmokeWrite(moduleDir: string, reviewFile: string): void {
  const tsx = path.join(ROOT, 'node_modules/.bin/tsx');
  execFileSync(tsx, [
    '--import', path.join(ROOT, 'test/register-hooks.mjs'),
    '--import', path.join(ROOT, 'test/setup-l2.ts'),
    path.join(ROOT, 'mls-102020/l2/agentNewSolution4/steps/e2/nodejsSmoke.ts'),
    moduleDir,
    reviewFile,
    '--write',
  ], { cwd: ROOT, stdio: 'inherit' });
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
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
        'X-Title': 'agentNewSolution4 E2 live test',
        'X-Collab-Origin': 'agentNewSolution4',
        'X-User-Id': 'agentNewSolution4-live-test',
        'X-Org-Id': config.orgId,
        'X-Agent-Name': 'agentNewSolution4',
      },
      body: JSON.stringify({
        model: input.model,
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: input.humanPrompt },
        ],
        stream: false,
        temperature: 0,
        max_tokens: 65_536,
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
  if (!baseUrl || !token) throw new Error('COLLAB_LLM_BASE_URL and COLLAB_LLM_TOKEN are required');
  return { baseUrl, token, orgId };
}

function parseArgs(argv: string[]): CliArgs {
  const positional = argv.filter(item => !item.startsWith('--'));
  const project = Number(positional[0]);
  const moduleName = positional[1] || '';
  if (!Number.isInteger(project) || project < 1 || !/^[a-z][A-Za-z0-9]*$/.test(moduleName)) {
    throw new Error('Usage: nodejsLiveE2.ts <project> <moduleName> [--write] [--approve] [--judge-existing]');
  }
  const approve = argv.includes('--approve');
  return {
    project, moduleName, write: argv.includes('--write') || approve, approve,
    judgeExisting: argv.includes('--judge-existing'),
  };
}

async function judgeExistingDraft(
  args: CliArgs,
  moduleDir: string,
  moduleArtifact: Ns4ModuleArtifact,
  promptTemplate: string,
): Promise<void> {
  const draft = JSON.parse(await readFile(path.join(moduleDir, 'pipeline/e2-journeys.draft.json'), 'utf8'));
  const model = parseModelType(promptTemplate);
  const config = await loadLlmConfig();
  const response = await callCollabLlm(config, {
    model,
    systemPrompt: promptTemplate,
    humanPrompt: [
      '## Approved E1 product contract',
      JSON.stringify(moduleArtifact, null, 2),
      '',
      '## Complete E2 journey draft to judge',
      JSON.stringify(draft, null, 2),
      '',
      `## Required review round\n${draft.reviewRound || 1}`,
    ].join('\n'),
  });
  const parsed = parseJsonContent(response.choices?.[0]?.message?.content);
  const payload = isRecord(parsed) && parsed.type === 'flexible' ? parseJsonContent(parsed.result) : parsed;
  const verdict = normalizeNs4E2CoverageVerdict(payload, args.moduleName, draft.reviewRound || 1);
  const validation = validateNs4E2CoverageVerdict(verdict, args.moduleName, draft.reviewRound || 1);
  if (!validation.ok) throw new Error(`Invalid coverage verdict: ${validation.errors.join(' ')}`);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    mode: 'judge-existing-dry-run',
    project: args.project,
    moduleName: args.moduleName,
    model,
    complete: verdict.complete,
    summary: verdict.summary,
    issues: verdict.issues,
    usage: response.usage || null,
  }, null, 2)}\n`);
}

function parseModelType(prompt: string): string {
  return /<!--\s*modelType:\s*([^\s]+)\s*-->/i.exec(prompt)?.[1] || 'reasoning';
}

function parseJsonContent(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); }
  catch { return value; }
}

function parseDefs(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', assignment);
  if (assignment < 0 || start < 0) throw new Error('Invalid module.defs.ts export');
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
  throw new Error('Unterminated module.defs.ts object');
}

function parseEnv(source: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const raw = match[2].trim();
    env[match[1]] = ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
      ? raw.slice(1, -1)
      : raw;
  }
  return env;
}

async function writeLiveTrace(pipelineDir: string, args: CliArgs, value: unknown): Promise<void> {
  if (!args.write) return;
  await mkdir(pipelineDir, { recursive: true });
  await writeFile(path.join(pipelineDir, 'e2-live-llm-response.json'), `${JSON.stringify(value, null, 2)}\n`);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

void main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
