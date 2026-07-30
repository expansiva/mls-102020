/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n3-defs/gate.ts" enhancement="_blank"/>

// n3-defs gate (pure — unit-testable). It validates the FINAL rendered .defs.ts, not the model's
// raw markdown: the file is what other collab routines read, so the skeleton the template produced
// is checked together with the content the model wrote.
//
// Nothing validates the .defs.ts in the old flow — a missing section or an unescaped backtick ships
// silently (the backtick does not even compile).

import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { NmGateIssue } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import { NM_SKILL_SECTIONS } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.js';
import { hasUnescapedTemplateChars, unescapeSkillLiteral } from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';
import { runNmLayoutConfigGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmLayoutAxes.js';

// Tokens that only exist in CODE. The old prompt asked for "no implementation detail" in prose and
// got framework names anyway; each pattern below is unambiguous, so a false positive is unlikely.
const CODE_TOKENS: { pattern: RegExp; label: string }[] = [
  { pattern: /```/, label: 'a markdown code fence' },
  // Statement SHAPES, not the bare words: prose like "must not export events" is legitimate, and
  // the leak can arrive inside a bullet ("- import { html } from 'lit';"), so no line anchor.
  { pattern: /\bimport\s+[\w{*][^\n]*\bfrom\b/, label: 'an import statement' },
  { pattern: /\bexport\s+(const|function|class|default)\b/, label: 'an export statement' },
  { pattern: /@customElement|@property|@propertyDataSource/, label: 'a decorator' },
  { pattern: /\bextends\s+[A-Z]\w*/, label: 'a class declaration' },
  { pattern: /var\(--ml-/, label: 'a CSS token reference' },
  { pattern: /class(Name)?\s*=\s*["'`]/, label: 'a class attribute' },
  { pattern: /\bTemplateResult\b|\bhtml`/, label: 'a Lit construct' },
];

export function runNm2DefsGate(source: string, plan: MoleculePlan, expectedHeader: string): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const text = (source || '').replace(/^﻿/, '');

  if (!text.trim()) {
    return [{ code: 'empty', message: 'the .defs.ts came out empty' }];
  }

  const firstLine = text.split('\n')[0].trim();
  if (firstLine !== expectedHeader) {
    issues.push({ code: 'header', message: `the first line must be the deterministic mls header for this file — got '${firstLine}'` });
  }

  if (!new RegExp(`^export const group = '${escapeRegExp(plan.groupCanonical)}';$`, 'm').test(text)) {
    issues.push({ code: 'group', message: `missing or wrong "export const group = '${plan.groupCanonical}';"` });
  }

  // The layout axes confirmed at the checkpoint (decision D7). The file must carry exactly what
  // plan.json says — and the vocabulary is re-checked here, so a hand-edited plan cannot ship an axis
  // the DS catalog would silently drop.
  const emitted = parseEmittedLayoutConfig(text);
  if (emitted === null) {
    issues.push({
      code: 'layout_config',
      message: 'missing "export const layoutConfig = {...};" — the DS catalog requires the export, and an absent one breaks Object.keys() in the matcher',
    });
  } else {
    const expected = plan.layoutConfig || {};
    const emittedKeys = Object.keys(emitted).sort();
    const expectedKeys = Object.keys(expected).sort();
    const same = emittedKeys.length === expectedKeys.length
      && emittedKeys.every((key, index) => key === expectedKeys[index] && emitted[key] === expected[key]);
    if (!same) {
      issues.push({
        code: 'layout_config',
        message: `layoutConfig must carry exactly the axes confirmed at the checkpoint (${JSON.stringify(expected)}) — got ${JSON.stringify(emitted)}`,
      });
    }
    issues.push(...runNmLayoutConfigGate(emitted, plan.groupCanonical));
  }

  const raw = extractSkillLiteral(text);
  if (raw === null) {
    issues.push({ code: 'skill_literal', message: 'could not find the "export const skill = `...`;" template literal' });
    return issues;
  }

  // Escaping is checked on the RAW literal (an unescaped backtick or ${ does not compile, and
  // nothing in the old flow checked it); the CONTENT checks below run on the unescaped markdown,
  // otherwise an escaped code fence (\`\`\`) slips past the code detector.
  if (hasUnescapedTemplateChars(raw)) {
    issues.push({ code: 'skill_escaping', message: 'the skill literal carries an unescaped backtick or ${ — the file would not compile' });
  }
  const skill = unescapeSkillLiteral(raw);

  let cursor = -1;
  for (const section of NM_SKILL_SECTIONS) {
    const index = skill.indexOf(`${section}\n`) >= 0 ? skill.indexOf(`${section}\n`) : skill.indexOf(section);
    if (index < 0) {
      issues.push({ code: 'section_missing', message: `the contract is missing the '${section}' section` });
      continue;
    }
    if (index < cursor) {
      issues.push({ code: 'section_order', message: `'${section}' is out of order — the sections must appear as ${NM_SKILL_SECTIONS.join(', ')}` });
    }
    cursor = index;
  }

  const tagLine = /^\s*-\s*TagName:\s*(.+)$/m.exec(skill);
  if (!tagLine) {
    issues.push({ code: 'tagname', message: "the '# Metadata' section must carry a '- TagName:' line" });
  } else if (tagLine[1].trim() !== plan.tag) {
    issues.push({ code: 'tagname', message: `TagName must be the derived tag '${plan.tag}' — got '${tagLine[1].trim()}'` });
  }

  // Only the body is scanned for code: the Metadata tag itself contains '--ml-'.
  const body = sliceFromSection(skill, '# Objective');
  for (const token of CODE_TOKENS) {
    if (token.pattern.test(body)) {
      issues.push({ code: 'implementation_detail', message: `the contract states observable behaviour only — found ${token.label}` });
    }
  }

  for (const section of ['# Objective', '# Responsibilities', '# Constraints'] as const) {
    if (!sectionHasContent(skill, section)) {
      issues.push({ code: 'section_empty', message: `the '${section}' section has no content` });
    }
  }

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') && trimmed.endsWith('?')) {
      issues.push({ code: 'requirement_question', message: `the contract must be declarative, not a question: '${trimmed}'` });
    }
  }

  return issues;
}

// The emitted `layoutConfig` object as a flat map, or null when the export is absent. Only the
// `key: "value"` shape the template writes is understood — anything else comes back as an unknown axis
// and is caught by the vocabulary gate.
export function parseEmittedLayoutConfig(source: string): Record<string, string> | null {
  const match = /export const layoutConfig\s*=\s*\{([\s\S]*?)\}\s*;/.exec(source);
  if (!match) return null;
  const config: Record<string, string> = {};
  for (const pair of match[1].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*["']([^"']*)["']/g)) {
    config[pair[1]] = pair[2];
  }
  return config;
}

// The content between "export const skill = `" and the closing "`;" — null when absent.
export function extractSkillLiteral(source: string): string | null {
  const opener = 'export const skill = `';
  const start = source.indexOf(opener);
  if (start < 0) return null;
  const from = start + opener.length;
  const end = source.lastIndexOf('`;');
  if (end <= from) return null;
  return source.slice(from, end);
}

function sliceFromSection(skill: string, section: string): string {
  const index = skill.indexOf(section);
  return index < 0 ? skill : skill.slice(index);
}

function sectionHasContent(skill: string, section: string): boolean {
  const index = skill.indexOf(section);
  if (index < 0) return false;
  const rest = skill.slice(index + section.length);
  const nextSection = rest.search(/\n#\s/);
  const body = nextSection < 0 ? rest : rest.slice(0, nextSection);
  return body.trim().length > 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
