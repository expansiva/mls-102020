/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/effort40/gate.ts" enhancement="_blank"/>

import type { MenuStampedNode, MenuStampedPageNode, P2MenuFile } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import {
  P2_EFFORT_ENDPOINT_KINDS,
  P2_EFFORT_REMOVED_KINDS,
  P2_EFFORT_SCHEMA_VERSION,
  P2_EFFORT_STATUSES,
  countP2EffortStatuses,
  isP2EffortEndpointKind,
  isP2EffortRemovedKind,
  isP2EffortStatus,
  p2StatusFromMenuAction,
  type P2EffortFile,
  type P2EffortTotalsBucket,
} from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';

export interface P2EffortGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P2EffortGateResult {
  ok: boolean;
  issues: P2EffortGateIssue[];
}

export function validateP2Effort(
  file: P2EffortFile,
  menu: P2MenuFile,
  options?: { screenStatusFromAction?: boolean },
): P2EffortGateResult {
  const issues: P2EffortGateIssue[] = [];
  if (file.schemaVersion !== P2_EFFORT_SCHEMA_VERSION) {
    error(issues, 'P2_EFFORT_SCHEMA', `schemaVersion must be ${P2_EFFORT_SCHEMA_VERSION}.`, '$.schemaVersion');
  }

  const fromAction = options?.screenStatusFromAction !== false;
  const menuPages = stampedPages(menu.tree);
  const screenIds = new Set(file.screens.map(screen => screen.pageId));
  for (const page of menuPages) {
    const screen = file.screens.find(item => item.pageId === page.id);
    if (!screen) {
      error(issues, 'P2_EFFORT_SCREEN_MISSING', `Menu page ${page.id} is missing from screens.`, '$.screens');
      continue;
    }
    if (!fromAction) continue;
    const expected = p2StatusFromMenuAction(page.action);
    if (screen.status !== expected) {
      error(
        issues,
        'P2_EFFORT_SCREEN_STATUS',
        `Screen ${page.id} status must be ${expected} from action ${page.action}.`,
        `$.screens[pageId=${page.id}].status`,
      );
    }
  }
  if (fromAction) {
    for (const page of stampedPages(menu.meta.removed)) {
      if (screenIds.has(page.id) && menuPages.some(item => item.id === page.id)) continue;
      const screen = file.screens.find(item => item.pageId === page.id);
      if (!screen) {
        error(issues, 'P2_EFFORT_SCREEN_MISSING', `Removed page ${page.id} is missing from screens.`, '$.screens');
      } else if (screen.status !== 'toRemove') {
        error(
          issues,
          'P2_EFFORT_SCREEN_STATUS',
          `Removed page ${page.id} status must be toRemove.`,
          `$.screens[pageId=${page.id}].status`,
        );
      }
    }
  }

  const usecaseIds = new Set(file.usecases.map(item => item.usecaseId));
  file.endpoints.forEach((endpoint, index) => {
    const path = `$.endpoints[${index}]`;
    if (!isP2EffortEndpointKind(endpoint.kind)) {
      error(issues, 'P2_EFFORT_KIND', `kind must be ${P2_EFFORT_ENDPOINT_KINDS.join('|')}.`, `${path}.kind`);
    }
    if (!isP2EffortStatus(endpoint.status)) {
      error(issues, 'P2_EFFORT_STATUS', `status must be ${P2_EFFORT_STATUSES.join('|')}.`, `${path}.status`);
    }
    if (!usecaseIds.has(endpoint.usecaseRef)) {
      error(issues, 'P2_EFFORT_USECASE_REF', `Unknown usecaseRef ${endpoint.usecaseRef}.`, `${path}.usecaseRef`);
    }
  });

  file.screens.forEach((screen, index) => {
    if (!isP2EffortStatus(screen.status)) {
      error(issues, 'P2_EFFORT_STATUS', `status must be ${P2_EFFORT_STATUSES.join('|')}.`, `$.screens[${index}].status`);
    }
  });
  file.usecases.forEach((usecase, index) => {
    if (!isP2EffortStatus(usecase.status)) {
      error(issues, 'P2_EFFORT_STATUS', `status must be ${P2_EFFORT_STATUSES.join('|')}.`, `$.usecases[${index}].status`);
    }
  });
  file.tables.forEach((table, index) => {
    if (!isP2EffortStatus(table.status)) {
      error(issues, 'P2_EFFORT_STATUS', `status must be ${P2_EFFORT_STATUSES.join('|')}.`, `$.tables[${index}].status`);
    }
  });
  file.removed.forEach((row, index) => {
    const path = `$.removed[${index}]`;
    if (!isP2EffortRemovedKind(row.kind)) {
      error(issues, 'P2_EFFORT_REMOVED_KIND', `kind must be ${P2_EFFORT_REMOVED_KINDS.join('|')}.`, `${path}.kind`);
    }
    if (row.status !== 'toRemove') {
      error(issues, 'P2_EFFORT_STATUS', 'removed status must be toRemove.', `${path}.status`);
    }
  });

  checkTotals(issues, 'screens', file.totals.screens, countP2EffortStatuses(file.screens));
  checkTotals(issues, 'endpoints', file.totals.endpoints, countP2EffortStatuses(file.endpoints));
  checkTotals(issues, 'usecases', file.totals.usecases, countP2EffortStatuses(file.usecases));
  checkTotals(issues, 'tables', file.totals.tables, countP2EffortStatuses(file.tables));

  return { ok: issues.every(issue => issue.severity !== 'error'), issues };
}

export function formatP2EffortGate(issues: readonly P2EffortGateIssue[]): string {
  return issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
}

function checkTotals(
  issues: P2EffortGateIssue[],
  name: string,
  actual: P2EffortTotalsBucket,
  expected: P2EffortTotalsBucket,
): void {
  for (const status of P2_EFFORT_STATUSES) {
    if (actual[status] !== expected[status]) {
      error(
        issues,
        'P2_EFFORT_TOTALS',
        `totals.${name}.${status} is ${actual[status]}, expected ${expected[status]}.`,
        `$.totals.${name}.${status}`,
      );
    }
  }
}

function stampedPages(nodes: readonly MenuStampedNode[]): MenuStampedPageNode[] {
  const out: MenuStampedPageNode[] = [];
  const walk = (list: readonly MenuStampedNode[]) => {
    for (const node of list) {
      if (node.kind === 'page') out.push(node);
      else walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

function error(issues: P2EffortGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}
