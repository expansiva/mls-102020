/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2_219.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { D2BffDesign, D2BffEndpoint, D2BffLeaf, D2BffType } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { buildD2ContractFromBff } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures/d2_219');
const bindings: D2BffDesign['bindings'] = { organisms: [], commands: [], selections: [], journeys: [], updates: [] };
const access = { actors: ['clerk'], grants: ['manage'], scope: 'organization' };
const jsdoc = { purpose: 'open', input: 'none', processing: 'all', output: 'row' };

const leaf = (name: string, type: string, path: string, extra: Partial<D2BffLeaf> = {}): D2BffLeaf => ({
  name, type, origin: { kind: 'field', paths: [path] }, ...extra,
});
const named = (name: string, type: string, extra: Partial<D2BffLeaf> = {}): D2BffLeaf => ({ name, type, ...extra });
const type = (name: string, fields: D2BffLeaf[]): D2BffType => ({ name, description: '', fields });
const qry = (output: D2BffLeaf[]): D2BffEndpoint => ({
  id: 'load', kind: 'qry', when: 'onLoad', input: [], output, rules: [], jsdoc,
});

function sourceOf(design: D2BffDesign, pageId = 'rows'): string {
  return renderD2ContractV2(
    { project: 1, module: 'alpha', pageId },
    buildD2ContractFromBff({ module: 'alpha', pageId, design, access, entities: {}, userLanguage: 'en' }),
  );
}

function interfaceBlock(source: string, name: string): string {
  const start = source.indexOf(`export interface ${name} {`);
  assert.ok(start >= 0, `missing interface ${name}`);
  const end = source.indexOf('\nexport ', start + 1);
  return source.slice(start, end < 0 ? undefined : end);
}

void test('d2_219: a ref leaf of another entity is optional on the contract', () => {
  const design: D2BffDesign = {
    types: [
      type('Bot', [leaf('id', 'string', 'TelegramBot.id'), leaf('name', 'string', 'TelegramBot.name')]),
      type('Conversation', [
        leaf('id', 'string', 'TelegramConversation.id'),
        named('telegramBot', 'Bot'),
      ]),
    ],
    endpoints: [qry([named('row', 'Conversation')])],
    bindings,
  };
  const body = interfaceBlock(sourceOf(design), 'Conversation');
  assert.match(body, /telegramBot\?: Bot;/u);
  assert.match(body, /id: string;/u);
});

void test('d2_219: a child list and a type with empty root stay required', () => {
  const design: D2BffDesign = {
    types: [
      type('Message', [leaf('id', 'string', 'TelegramMessage.id'), leaf('text', 'string', 'TelegramMessage.text')]),
      type('Totals', [{ name: 'count', type: 'number', origin: { kind: 'aggregate', paths: ['TelegramConversation'] } }]),
      type('Conversation', [
        leaf('id', 'string', 'TelegramConversation.id'),
        named('messages', 'Message[]'),
        named('totals', 'Totals'),
      ]),
    ],
    endpoints: [qry([named('row', 'Conversation')])],
    bindings,
  };
  const body = interfaceBlock(sourceOf(design), 'Conversation');
  assert.match(body, /messages: Message\[\];/u);
  assert.doesNotMatch(body, /messages\?:/u);
  assert.match(body, /totals: Totals;/u);
  assert.doesNotMatch(body, /totals\?:/u);
});

void test('d2_219: a related ref already optional stays optional', () => {
  const design: D2BffDesign = {
    types: [
      type('Bot', [leaf('id', 'string', 'TelegramBot.id')]),
      type('Conversation', [
        leaf('id', 'string', 'TelegramConversation.id'),
        named('telegramBot', 'Bot', { optional: true }),
      ]),
    ],
    endpoints: [qry([named('row', 'Conversation')])],
    bindings,
  };
  assert.match(interfaceBlock(sourceOf(design), 'Conversation'), /telegramBot\?: Bot;/u);
});

void test('d2_219: telegram fixture conversations and audit mark related bots optional; bots already optional stays', () => {
  const load = (pageId: string): D2BffDesign => JSON.parse(readFileSync(path.join(FIXTURE, `${pageId}.json`), 'utf8')) as D2BffDesign;
  const render = (pageId: string): string => {
    const design = load(pageId);
    return renderD2ContractV2(
      { project: 102047, module: 'telegram', pageId },
      buildD2ContractFromBff({ module: 'telegram', pageId, design, access: { actors: ['companyAdmin'], grants: ['adminManageBots'], scope: 'organization' }, entities: {}, userLanguage: 'en' }),
    );
  };
  const conversations = render('conversations');
  assert.match(interfaceBlock(conversations, 'ConversationRow'), /telegramBot\?: Bot;/u);
  assert.match(interfaceBlock(conversations, 'Conversation'), /telegramBot\?: Bot;/u);

  const audit = render('audit');
  assert.match(interfaceBlock(audit, 'AuditRow'), /telegramBot\?: AuditBotRef;/u);
  assert.match(interfaceBlock(audit, 'AuditRow'), /telegramConversation\?: AuditConversationRef;/u);
  assert.match(interfaceBlock(audit, 'AuditTimelineEntry'), /telegramBot\?: /u);
  assert.match(interfaceBlock(audit, 'AuditRecordDetail'), /telegramBot\?: AuditRecordBot;/u);

  const bots = render('bots');
  const summary = interfaceBlock(bots, 'BotSummary');
  const detail = interfaceBlock(bots, 'BotDetail');
  assert.match(summary, /cmAgent\?: CmAgentOption;/u);
  assert.match(detail, /cmAgent\?: CmAgentOption;/u);
  assert.match(summary, /status: 'notConfigured' \| 'active' \| 'paused' \| 'deactivated';/u);
  assert.match(detail, /id: string;/u);
});
