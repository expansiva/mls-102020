/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/nodejsLiveE4.ts" enhancement="_blank"/>

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Ns4ModuleArtifact } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { normalizeNs4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import {
  assembleNs4E4Review,
  applyNs4E4RelationshipBindings,
  normalizeNs4E4EntityDraft,
  normalizeNs4E4PlanDraft,
  normalizeNs4E4RelationshipBindings,
  Ns4E4EntityDraft,
  Ns4E4PlanDraft,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import {
  validateNs4E4EntityDraft,
  validateNs4E4Plan,
  validateNs4E4RelationshipBindings,
  validateNs4E4Review,
} from '/_102020_/l2/agentNewSolution4/steps/e4/gate.js';

interface OpenAiResponse {
  model?: string;
  usage?: Record<string, unknown>;
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: string };
}

const ROOT = path.resolve(path.dirname(path.resolve(process.argv[1] || '.')), '../../../../..');

async function main(): Promise<void> {
  const [projectArg, moduleName] = process.argv.slice(2);
  const project = Number(projectArg);
  if (!Number.isInteger(project) || !/^[a-z][A-Za-z0-9]*$/.test(moduleName || '')) {
    throw new Error('Usage: nodejsLiveE4.ts <project> <moduleName>');
  }
  const moduleDir = path.join(ROOT, `mls-${project}`, 'l4', moduleName);
  const pipelineDir = path.join(moduleDir, 'pipeline');
  const [moduleSource, journeysSource, accessSource, promptTemplate, entityPrompt, relationshipPrompt, platformSkill] = await Promise.all([
    readFile(path.join(moduleDir, 'module.defs.ts'), 'utf8'),
    readFile(path.join(pipelineDir, 'e2-journeys.draft.json'), 'utf8'),
    readFile(path.join(pipelineDir, 'e3-access-matrix.draft.json'), 'utf8'),
    readFile(path.join(ROOT, 'mls-102020/l2/agentNewSolution4/steps/e4/prompt.md'), 'utf8'),
    readFile(path.join(ROOT, 'mls-102020/l2/agentNewSolution4/steps/e4/promptEntity.md'), 'utf8'),
    readFile(path.join(ROOT, 'mls-102020/l2/agentNewSolution4/steps/e4/promptRelationships.md'), 'utf8'),
    readFile(path.join(ROOT, 'mls-102020/l2/agentNewSolution4/skills/platform.md'), 'utf8'),
  ]);
  const moduleArtifact = parseDefs(moduleSource) as Ns4ModuleArtifact;
  const journeys = normalizeNs4E2Review(JSON.parse(journeysSource), moduleName);
  const access = normalizeNs4E3Review(JSON.parse(accessSource), moduleName);
  const systemPrompt = promptTemplate.replace('{{platformSkill}}', platformSkill);
  const humanPrompt = [
    '## Explicit delivery mode for this run\nnew solution; new persistence design; no legacy database contract', '',
    '## Approved module contract', JSON.stringify(moduleArtifact), '',
    '## Approved E2 journeys', JSON.stringify(journeys), '',
    '## Approved E3 access matrix', JSON.stringify(access), '',
    '## Required review round\n1',
  ].join('\n');
  const model = /<!--\s*modelType:\s*([^\s]+)\s*-->/i.exec(promptTemplate)?.[1] || 'reasoning';
  const config = await loadLlmConfig();
  const responses: OpenAiResponse[] = [];
  let response = await callCollabLlm(config, { model, systemPrompt, humanPrompt, maxTokens: 16_384 });
  responses.push(response);
  let plan = parsePlan(response, moduleName);
  let gate = validateNs4E4Plan(plan, journeys, access);
  if (!gate.ok) {
    const feedback = gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
    response = await callCollabLlm(config, {
      model, systemPrompt,
      humanPrompt: `${humanPrompt}\n\n## Deterministic gate repair required\n${feedback}\n\n## Previous E4 overview\n${JSON.stringify(plan)}`,
      maxTokens: 16_384,
    });
    responses.push(response);
    plan = parsePlan(response, moduleName);
    gate = validateNs4E4Plan(plan, journeys, access);
  }
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  const details = await mapParallel(plan.entities, 20, async entity => {
    const relationships = plan.relationships.filter(item => item.fromEntity === entity.entityId || item.toEntity === entity.entityId);
    const relatedJourneys = journeys.journeys.filter(item => entity.sourceRefs.journeyIds.includes(item.journeyId));
    const relatedFeatures = journeys.features.filter(item => entity.sourceRefs.featureIds.includes(item.featureId));
    const relatedAuthorities = access.authorities.filter(item => entity.sourceRefs.authorityRefs.includes(item.authorityRef));
    const relatedGrants = access.grants.filter(item => entity.sourceRefs.authorityRefs.includes(item.authorityRef));
    const entityHumanPrompt = [
      '## Frozen target entity overview', JSON.stringify(entity),
      '## All valid entity ids and storage targets', JSON.stringify(plan.entities.map(item => ({ entityId: item.entityId, storage: item.storage.target }))),
      '## Relationships touching this entity', JSON.stringify(relationships),
      '## Related E2 journeys and features', JSON.stringify({ journeys: relatedJourneys, features: relatedFeatures }),
      '## Related E3 authorities and grants', JSON.stringify({ authorities: relatedAuthorities, grants: relatedGrants }),
      `## Required identity\nmoduleName=${moduleName}; reviewRound=1; entityId=${entity.entityId}; userLanguage=${plan.userLanguage}`,
    ].join('\n\n');
    let detailResponse = await callCollabLlm(config, { model, systemPrompt: entityPrompt, humanPrompt: entityHumanPrompt, maxTokens: 8_192 });
    responses.push(detailResponse);
    let detail = parseEntity(detailResponse, plan, entity.entityId);
    let detailGate = validateNs4E4EntityDraft(plan, detail);
    if (!detailGate.ok) {
      const feedback = detailGate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
      detailResponse = await callCollabLlm(config, {
        model, systemPrompt: entityPrompt, maxTokens: 8_192,
        humanPrompt: `${entityHumanPrompt}\n\n## Entity gate repair required\n${feedback}\n\n## Current entity draft\n${JSON.stringify(detail)}`,
      });
      responses.push(detailResponse);
      detail = parseEntity(detailResponse, plan, entity.entityId);
      detailGate = validateNs4E4EntityDraft(plan, detail);
    }
    if (!detailGate.ok) throw new Error(detailGate.issues.map(issue => `${entity.entityId} ${issue.code}: ${issue.message}`).join('\n'));
    return detail;
  });
  const unboundReview = assembleNs4E4Review(plan, details);
  const bindingHumanPrompt = [
    `## Required identity\nmoduleName=${moduleName}; reviewRound=1`,
    '## Frozen entities and their exact available fields', JSON.stringify(unboundReview.entities.map(entity => ({
      entityId: entity.entityId, kind: entity.kind, storage: entity.storage,
      fields: entity.fields.map(field => ({ fieldId: field.fieldId, type: field.type, required: field.required, description: field.description })),
    }))),
    '## Frozen semantic relationships to bind', JSON.stringify(unboundReview.relationships),
  ].join('\n\n');
  let bindingResponse = await callCollabLlm(config, { model, systemPrompt: relationshipPrompt, humanPrompt: bindingHumanPrompt, maxTokens: 16_384 });
  responses.push(bindingResponse);
  let bindings = parseBindings(bindingResponse, moduleName);
  let bindingGate = validateNs4E4RelationshipBindings(unboundReview, bindings, journeys, access);
  if (!bindingGate.ok) {
    const feedback = bindingGate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
    bindingResponse = await callCollabLlm(config, {
      model, systemPrompt: relationshipPrompt, maxTokens: 16_384,
      humanPrompt: `${bindingHumanPrompt}\n\n## Deterministic binding gate repair required\n${feedback}`,
    });
    responses.push(bindingResponse);
    bindings = parseBindings(bindingResponse, moduleName);
    bindingGate = validateNs4E4RelationshipBindings(unboundReview, bindings, journeys, access);
  }
  if (!bindingGate.ok) throw new Error(bindingGate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  const review = applyNs4E4RelationshipBindings(unboundReview, bindings);
  const finalGate = validateNs4E4Review(review, journeys, access);
  if (!finalGate.ok) throw new Error(finalGate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  process.stdout.write(`${JSON.stringify({
    ok: true, mode: 'dry-run', project, moduleName, model: response.model || null,
    calls: responses.length, maxParallel: 20,
    entityCount: review.entities.length, relationshipCount: review.relationships.length,
    fieldCount: review.entities.reduce((sum, entity) => sum + entity.fields.length, 0),
    informationAuthorities: access.authorities.filter(authority => authority.informationNeeds.length).map(authority => authority.authorityRef),
    usage: responses.map(item => item.usage || null),
  }, null, 2)}\n`);
}

function parsePlan(response: OpenAiResponse, moduleName: string): Ns4E4PlanDraft {
  const parsed = parseJsonContent(response.choices?.[0]?.message?.content);
  const payload = isRecord(parsed) && parsed.type === 'flexible' ? parseJsonContent(parsed.result) : parsed;
  if (!isRecord(payload)) throw new Error('collab-llm returned no valid E4 overview payload.');
  const plan = normalizeNs4E4PlanDraft(payload, moduleName);
  plan.moduleName = moduleName; plan.reviewRound = 1;
  return plan;
}

function parseEntity(response: OpenAiResponse, plan: Ns4E4PlanDraft, entityId: string): Ns4E4EntityDraft {
  const parsed = parseJsonContent(response.choices?.[0]?.message?.content);
  const payload = isRecord(parsed) && parsed.type === 'flexible' ? parseJsonContent(parsed.result) : parsed;
  if (!isRecord(payload)) throw new Error(`collab-llm returned no valid E4 entity payload for ${entityId}.`);
  return normalizeNs4E4EntityDraft(payload, plan.moduleName, plan.reviewRound, entityId);
}

function parseBindings(response: OpenAiResponse, moduleName: string) {
  const parsed = parseJsonContent(response.choices?.[0]?.message?.content);
  const payload = isRecord(parsed) && parsed.type === 'flexible' ? parseJsonContent(parsed.result) : parsed;
  if (!isRecord(payload)) throw new Error('collab-llm returned no valid E4 relationship binding payload.');
  return normalizeNs4E4RelationshipBindings(payload, moduleName, 1);
}

async function callCollabLlm(
  config: { baseUrl: string; token: string; orgId: string },
  input: { model: string; systemPrompt: string; humanPrompt: string; maxTokens: number },
): Promise<OpenAiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240_000);
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', Authorization: `Bearer ${config.token}`,
        'X-Title': 'agentNewSolution4 E4 live test', 'X-Collab-Origin': 'agentNewSolution4',
        'X-User-Id': 'agentNewSolution4-live-test', 'X-Org-Id': config.orgId, 'X-Agent-Name': 'agentNewSolution4',
      },
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: 'system', content: input.systemPrompt }, { role: 'user', content: input.humanPrompt }],
        stream: false, temperature: 0, max_tokens: input.maxTokens,
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    let body: OpenAiResponse;
    try { body = JSON.parse(raw) as OpenAiResponse; }
    catch { throw new Error(`collab-llm returned non-JSON HTTP ${response.status}: ${raw.slice(0, 500)}`); }
    if (!response.ok) throw new Error(`collab-llm HTTP ${response.status}: ${body.error?.message || raw.slice(0, 500)}`);
    return body;
  } finally { clearTimeout(timeout); }
}

async function mapParallel<T, R>(items: T[], maxParallel: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(maxParallel, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadLlmConfig(): Promise<{ baseUrl: string; token: string; orgId: string }> {
  const fileEnv = parseEnv(await readFile(path.join(ROOT, '.env'), 'utf8'));
  const env = { ...fileEnv, ...process.env };
  const baseUrl = String(env.COLLAB_LLM_BASE_URL || '').trim();
  const token = String(env.COLLAB_LLM_TOKEN || '').trim();
  const orgId = String(env.COLLAB_LLM_ORG_ID || 'collab').trim();
  if (!baseUrl || !token) throw new Error('COLLAB_LLM_BASE_URL and COLLAB_LLM_TOKEN are required.');
  return { baseUrl, token, orgId };
}

function parseDefs(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', assignment);
  if (assignment < 0 || start < 0) throw new Error('Invalid module.defs.ts export.');
  let depth = 0; let inString = false; let escaped = false;
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

function parseJsonContent(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function parseEnv(source: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const raw = match[2].trim();
    env[match[1]] = ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) ? raw.slice(1, -1) : raw;
  }
  return env;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

void main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
