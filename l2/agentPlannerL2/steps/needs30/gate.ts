/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/gate.ts" enhancement="_blank"/>

import type { P2MenuFile } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import type { P2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  P2_NEEDS_FAMILIES,
  P2_NEEDS_OPERATIONS,
  P2_NEEDS_SCOPES,
  P2_NEEDS_SCHEMA_VERSION,
  isP2NeedsFamily,
  isP2NeedsOperation,
  isP2NeedsScope,
  type P2NeedsFile,
} from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';

export interface P2NeedsGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P2NeedsGateResult {
  ok: boolean;
  issues: P2NeedsGateIssue[];
}

export function validateP2Needs(
  file: P2NeedsFile,
  menu: P2MenuFile,
  sources: P2L4Sources,
): P2NeedsGateResult {
  const issues: P2NeedsGateIssue[] = [];
  if (file.schemaVersion !== P2_NEEDS_SCHEMA_VERSION) {
    error(issues, 'P2_NEEDS_SCHEMA', `schemaVersion must be ${P2_NEEDS_SCHEMA_VERSION}.`, '$.schemaVersion');
  }
  const entityIds = new Set(sources.entities.map(entity => entity.entityId).filter(Boolean));
  const pageIds = collectMenuPageIds(menu);
  const transitionsByEntity = new Map(
    sources.entities.map(entity => [entity.entityId, new Set(entity.transitions.map(item => item.transitionId))]),
  );

  file.pages.forEach((page, pageIndex) => {
    const path = `$.pages[${pageIndex}]`;
    if (!pageIds.has(page.pageId)) {
      error(issues, 'P2_NEEDS_PAGE_UNKNOWN', `Unknown page ${page.pageId}.`, `${path}.pageId`);
    }
    page.reads.forEach((read, readIndex) => {
      const at = `${path}.reads[${readIndex}]`;
      if (!entityIds.has(read.entity)) {
        error(issues, 'P2_NEEDS_ENTITY_UNKNOWN', `Unknown entity ${read.entity}.`, `${at}.entity`);
      }
      if (!isP2NeedsFamily(read.family)) {
        error(issues, 'P2_NEEDS_FAMILY', `family must be ${P2_NEEDS_FAMILIES.join('|')}.`, `${at}.family`);
      }
      if (!isP2NeedsScope(read.scope)) {
        error(issues, 'P2_NEEDS_SCOPE', `scope must be ${P2_NEEDS_SCOPES.join('|')}.`, `${at}.scope`);
      }
    });
    page.writes.forEach((write, writeIndex) => {
      const at = `${path}.writes[${writeIndex}]`;
      if (!entityIds.has(write.entity)) {
        error(issues, 'P2_NEEDS_ENTITY_UNKNOWN', `Unknown entity ${write.entity}.`, `${at}.entity`);
      }
      if (!isP2NeedsOperation(write.operation)) {
        error(issues, 'P2_NEEDS_OPERATION', `operation must be ${P2_NEEDS_OPERATIONS.join('|')}.`, `${at}.operation`);
      }
      if (write.operation === 'transition') {
        const known = transitionsByEntity.get(write.entity);
        if (!write.transitionRef) {
          error(issues, 'P2_NEEDS_TRANSITION_UNKNOWN', `transitionRef is required for operation transition.`, `${at}.transitionRef`);
        } else if (known && !known.has(write.transitionRef)) {
          error(
            issues,
            'P2_NEEDS_TRANSITION_UNKNOWN',
            `Unknown transition ${write.transitionRef} on ${write.entity}.`,
            `${at}.transitionRef`,
          );
        }
      }
    });
  });

  return { ok: issues.every(issue => issue.severity !== 'error'), issues };
}

export function formatP2NeedsGate(issues: readonly P2NeedsGateIssue[]): string {
  return issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
}

function collectMenuPageIds(menu: P2MenuFile): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: P2MenuFile['tree']) => {
    for (const node of nodes) {
      if (node.kind === 'page') out.add(node.id);
      else walk(node.children);
    }
  };
  walk(menu.tree);
  return out;
}

function error(issues: P2NeedsGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}
