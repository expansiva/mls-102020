/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/gate.ts" enhancement="_blank"/>

import type { P2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  isMenuNodeKind,
  isMenuOrganismKind,
  type MenuNode,
  type MenuV2,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';

const ACTOR_KEY = /^actor:([a-z][A-Za-z0-9]*)$/;

export interface P2MenuGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P2MenuGateResult {
  ok: boolean;
  issues: P2MenuGateIssue[];
}

export function validateP2Menu(draft: MenuV2, sources: P2L4Sources): P2MenuGateResult {
  const issues: P2MenuGateIssue[] = [];
  const journeyIds = new Set(sources.journeys.map(journey => journey.journeyId).filter(Boolean));
  const entityIds = new Set(sources.entities.map(entity => entity.entityId).filter(Boolean));
  const actorIds = new Set(sources.actors.map(actor => actor.actorId).filter(Boolean));
  const byId = new Map<string, { node: MenuNode; path: string }>();
  const pageIds = new Set<string>();

  walkTree(draft.tree, '$.tree', (node, path) => {
    if (!isMenuNodeKind(node.kind)) {
      error(issues, 'P2_MENU_KIND', "kind must be 'hub', 'page' or 'group'.", `${path}.kind`);
    }
    if (node.id && byId.has(node.id)) {
      error(issues, 'P2_MENU_ID_DUPLICATE', `Duplicate id ${node.id}.`, `${path}.id`);
    }
    if (node.id) byId.set(node.id, { node, path });
    if (node.kind === 'hub') {
      if (!node.context) {
        error(issues, 'P2_MENU_HUB_CONTEXT', 'hub requires context.', `${path}.context`);
      } else if (!entityIds.has(node.context)) {
        error(issues, 'P2_MENU_HUB_CONTEXT_UNKNOWN', `Unknown entity ${node.context}.`, `${path}.context`);
      }
      if (!node.children.length) {
        error(issues, 'P2_MENU_HUB_EMPTY', `Hub ${node.id} has no children.`, `${path}.children`);
      }
    }
    if (node.kind === 'page') {
      pageIds.add(node.id);
      node.organisms.forEach((organism, organismPosition) => {
        const organismPath = `${path}.organisms[${organismPosition}]`;
        if (!isMenuOrganismKind(organism.kind)) {
          error(
            issues,
            'P2_MENU_ORGANISM_KIND',
            "organism kind must be list, detail, form, summary, highlights, timeline or actions.",
            `${organismPath}.kind`,
          );
        }
        if (!organism.text) {
          error(issues, 'P2_MENU_ORGANISM_TEXT', 'organism text must be non-empty.', `${organismPath}.text`);
        }
      });
    }
  });

  const reachablePages = new Set<string>();
  Object.entries(draft.authorities).forEach(([key, nodeIds]) => {
    const actorPath = `$.authorities[${JSON.stringify(key)}]`;
    const match = ACTOR_KEY.exec(key);
    if (!match) {
      error(issues, 'P2_MENU_ACTOR_KEY', 'authority key must be actor:<lowerCamel>.', actorPath);
      return;
    }
    const actorRef = match[1];
    if (!actorIds.has(actorRef)) {
      error(issues, 'P2_MENU_ACTOR_UNKNOWN', `Unknown actor ${actorRef}.`, actorPath);
    }
    nodeIds.forEach((nodeId, nodePosition) => {
      const path = `${actorPath}[${nodePosition}]`;
      const found = byId.get(nodeId);
      if (!found) {
        error(issues, 'P2_MENU_AUTHORITY_UNKNOWN', `Unknown node ${nodeId}.`, path);
        return;
      }
      collectPages(found.node, reachablePages);
    });
  });

  for (const pageId of pageIds) {
    if (!reachablePages.has(pageId)) {
      const found = byId.get(pageId);
      error(
        issues,
        'P2_MENU_PAGE_UNREACHABLE',
        `Page ${pageId} is not reachable from any actor.`,
        found?.path || pageId,
      );
    }
  }

  for (const journey of sources.journeys) {
    if (!Object.prototype.hasOwnProperty.call(draft.meta.journeys, journey.journeyId)
      || draft.meta.journeys[journey.journeyId].length === 0) {
      warning(
        issues,
        'P2_MENU_JOURNEY_UNMAPPED',
        `Journey ${journey.journeyId} has no page.`,
        `$.meta.journeys.${journey.journeyId}`,
      );
    }
  }

  Object.entries(draft.meta.journeys).forEach(([journeyId, pages]) => {
    if (!journeyIds.has(journeyId)) {
      error(issues, 'P2_MENU_JOURNEY_UNKNOWN', `Unknown journey ${journeyId}.`, `$.meta.journeys.${journeyId}`);
    }
    pages.forEach((pageId, pagePosition) => {
      const found = byId.get(pageId);
      if (!found) {
        error(
          issues,
          'P2_MENU_JOURNEY_PAGE_UNKNOWN',
          `Unknown page ${pageId}.`,
          `$.meta.journeys.${journeyId}[${pagePosition}]`,
        );
      } else if (found.node.kind !== 'page') {
        error(
          issues,
          'P2_MENU_JOURNEY_NOT_PAGE',
          `${pageId} is not a page.`,
          `$.meta.journeys.${journeyId}[${pagePosition}]`,
        );
      }
    });
  });

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatP2MenuGate(issues: P2MenuGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

export function formatP2MenuWarnings(issues: P2MenuGateIssue[]): string[] {
  return issues
    .filter(issue => issue.severity === 'warning')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    });
}

function walkTree(nodes: readonly MenuNode[], path: string, visit: (node: MenuNode, path: string) => void): void {
  nodes.forEach((node, index) => {
    const at = `${path}[${index}]`;
    visit(node, at);
    if (node.kind === 'hub' || node.kind === 'group') walkTree(node.children, `${at}.children`, visit);
  });
}

function collectPages(node: MenuNode, into: Set<string>): void {
  if (node.kind === 'page') {
    if (node.id) into.add(node.id);
    return;
  }
  for (const child of node.children) collectPages(child, into);
}

function error(issues: P2MenuGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}

function warning(issues: P2MenuGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'warning', code, message, path });
}
