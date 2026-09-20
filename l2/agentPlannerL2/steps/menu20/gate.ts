/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/gate.ts" enhancement="_blank"/>

import type { P2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  actorAuthorityKey,
  collectBeyondJourneys,
  collectRecordsMaintained,
  isMechanicalEffectTask,
  isMenuNodeKind,
  isMenuOrganismKind,
  type MenuNode,
  type MenuOrganismKind,
  type MenuPageNode,
  type MenuV2,
  type P2ActorMustSeeDerived,
  type P2GrantView,
  type P2ProcessView,
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

export interface P2MenuGateInput {
  sources: P2L4Sources;
  grants: readonly P2GrantView[];
  processes: readonly P2ProcessView[];
}

export function validateP2Menu(draft: MenuV2, input: P2MenuGateInput): P2MenuGateResult {
  const { sources, grants, processes } = input;
  const issues: P2MenuGateIssue[] = [];
  const journeyIds = new Set(sources.journeys.map(journey => journey.journeyId).filter(Boolean));
  const processIds = new Set(processes.map(process => process.processId).filter(Boolean));
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
            "organism kind must be list, detail, form, summary, highlights, timeline, actions, inbox or alerts.",
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

  for (const process of processes) {
    if (!Object.prototype.hasOwnProperty.call(draft.meta.processes, process.processId)
      || draft.meta.processes[process.processId].length === 0) {
      warning(
        issues,
        'P2_MENU_PROCESS_UNMAPPED',
        `Process ${process.processId} has no page.`,
        `$.meta.processes.${process.processId}`,
      );
    }
  }

  Object.entries(draft.meta.processes).forEach(([processId, pages]) => {
    if (!processIds.has(processId)) {
      error(issues, 'P2_MENU_PROCESS_UNKNOWN', `Unknown process ${processId}.`, `$.meta.processes.${processId}`);
    }
    pages.forEach((pageId, pagePosition) => {
      const found = byId.get(pageId);
      if (!found) {
        error(
          issues,
          'P2_MENU_PROCESS_PAGE_UNKNOWN',
          `Unknown page ${pageId}.`,
          `$.meta.processes.${processId}[${pagePosition}]`,
        );
      } else if (found.node.kind !== 'page') {
        error(
          issues,
          'P2_MENU_PROCESS_NOT_PAGE',
          `${pageId} is not a page.`,
          `$.meta.processes.${processId}[${pagePosition}]`,
        );
      }
    });
  });

  const pagesByActor = new Map<string, MenuPageNode[]>();
  for (const actor of sources.actors) {
    pagesByActor.set(actor.actorId, pagesVisibleToActor(draft, byId, actor.actorId));
  }
  const beyond = collectBeyondJourneys(sources, grants, processes);
  for (const row of beyond) {
    const visible = pagesByActor.get(row.actorRef) || [];
    for (const task of row.alerts) {
      if (!hasOrganismKind(visible, 'alerts')) {
        warning(
          issues,
          'P2_MENU_ALERT_MISSING',
          `Alert ${task.taskId} of ${task.processId} has no alerts page for actor ${row.actorRef}.`,
          `$.authorities[${JSON.stringify(actorAuthorityKey(row.actorRef))}]`,
        );
      }
    }
    for (const task of row.human) {
      if (!hasOrganismKind(visible, 'inbox')) {
        warning(
          issues,
          'P2_MENU_HUMAN_NO_INBOX',
          `Human task ${task.taskId} of ${task.processId} has no inbox for actor ${row.actorRef}.`,
          `$.authorities[${JSON.stringify(actorAuthorityKey(row.actorRef))}]`,
        );
      }
      if (!hasOrganismKind(visible, 'actions')) {
        warning(
          issues,
          'P2_MENU_HUMAN_NO_ACTIONS',
          `Human task ${task.taskId} of ${task.processId} has no actions page for actor ${row.actorRef}.`,
          `$.authorities[${JSON.stringify(actorAuthorityKey(row.actorRef))}]`,
        );
      }
    }
  }

  const mechanicalSeen = new Set<string>();
  for (const process of processes) {
    for (const task of process.tasks) {
      if (!isMechanicalEffectTask(task) || !task.entityRef) continue;
      const key = `${process.processId}:${task.taskId}`;
      if (mechanicalSeen.has(key)) continue;
      mechanicalSeen.add(key);
      const actorsWithGrant = beyond.filter(row => (
        row.mechanicalEffects.some(item => item.processId === process.processId && item.taskId === task.taskId)
      ));
      const anyTimeline = actorsWithGrant.some(row => hasOrganismKind(pagesByActor.get(row.actorRef) || [], 'timeline'));
      if (actorsWithGrant.length && !anyTimeline) {
        warning(
          issues,
          'P2_MENU_MECHANICAL_NO_TIMELINE',
          `Mechanical effect ${task.taskId} of ${process.processId} on ${task.entityRef} has no timeline.`,
          `$.meta.processes.${process.processId}`,
        );
      }
    }
  }

  const derivedSeen = new Set<string>();
  for (const row of beyond) {
    for (const derived of row.derived) {
      const key = derivedKey(derived);
      if (derivedSeen.has(key)) continue;
      derivedSeen.add(key);
      const actors = beyond.filter(item => item.derived.some(entry => derivedKey(entry) === key));
      const cited = actors.some(item => hasCitation(pagesByActor.get(item.actorRef) || []));
      if (actors.length && !cited) {
        warning(
          issues,
          'P2_MENU_DERIVED_NOT_CITED',
          `Derived ${key} is not cited in summary, highlights or detail.`,
          `$.tree`,
        );
      }
    }
  }

  const maintained = collectRecordsMaintained(sources, grants);
  for (const row of maintained) {
    if (!Object.prototype.hasOwnProperty.call(draft.meta.entities, row.entityRef)
      || draft.meta.entities[row.entityRef].length === 0) {
      warning(
        issues,
        'P2_MENU_ENTITY_UNMAPPED',
        `Entity ${row.entityRef} has no page.`,
        `$.meta.entities.${row.entityRef}`,
      );
    }
  }

  Object.entries(draft.meta.entities).forEach(([entityId, pages]) => {
    if (!entityIds.has(entityId)) {
      error(issues, 'P2_MENU_ENTITY_UNKNOWN', `Unknown entity ${entityId}.`, `$.meta.entities.${entityId}`);
    }
    pages.forEach((pageId, pagePosition) => {
      const found = byId.get(pageId);
      if (!found) {
        error(
          issues,
          'P2_MENU_ENTITY_PAGE_UNKNOWN',
          `Unknown page ${pageId}.`,
          `$.meta.entities.${entityId}[${pagePosition}]`,
        );
      } else if (found.node.kind !== 'page') {
        error(
          issues,
          'P2_MENU_ENTITY_NOT_PAGE',
          `${pageId} is not a page.`,
          `$.meta.entities.${entityId}[${pagePosition}]`,
        );
      }
    });
  });

  const formSeen = new Set<string>();
  for (const row of maintained) {
    const key = `${row.actorRef}:${row.entityRef}`;
    if (formSeen.has(key)) continue;
    formSeen.add(key);
    const authorityPath = `$.authorities[${JSON.stringify(actorAuthorityKey(row.actorRef))}]`;
    const mapped = Object.prototype.hasOwnProperty.call(draft.meta.entities, row.entityRef)
      ? draft.meta.entities[row.entityRef]
      : undefined;
    if (!mapped || mapped.length === 0) {
      warning(
        issues,
        'P2_MENU_ENTITY_NO_FORM',
        `Record ${row.entityRef} maintained by ${row.actorRef} is not mapped in meta.entities`,
        authorityPath,
      );
      continue;
    }
    const visibleIds = new Set((pagesByActor.get(row.actorRef) || []).map(page => page.id));
    const visibleMapped: MenuPageNode[] = [];
    for (const pageId of mapped) {
      if (!visibleIds.has(pageId)) continue;
      const found = byId.get(pageId);
      if (!found || found.node.kind !== 'page') continue;
      visibleMapped.push(found.node);
    }
    if (!visibleMapped.length) {
      warning(
        issues,
        'P2_MENU_ENTITY_NO_FORM',
        `Record ${row.entityRef} maintained by ${row.actorRef} is mapped only to pages ${row.actorRef} cannot reach`,
        authorityPath,
      );
      continue;
    }
    if (!visibleMapped.some(page => hasFormOrActions(page))) {
      warning(
        issues,
        'P2_MENU_ENTITY_NO_FORM',
        `Record ${row.entityRef} maintained by ${row.actorRef} has no form or actions on ${visibleMapped[0].id}`,
        authorityPath,
      );
    }
  }

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

function pagesVisibleToActor(
  draft: MenuV2,
  byId: Map<string, { node: MenuNode; path: string }>,
  actorRef: string,
): MenuPageNode[] {
  const ids = draft.authorities[actorAuthorityKey(actorRef)] || [];
  const pages: MenuPageNode[] = [];
  const seen = new Set<string>();
  const collect = (node: MenuNode) => {
    if (node.kind === 'page') {
      if (node.id && !seen.has(node.id)) {
        seen.add(node.id);
        pages.push(node);
      }
      return;
    }
    for (const child of node.children) collect(child);
  };
  for (const id of ids) {
    const found = byId.get(id);
    if (found) collect(found.node);
  }
  return pages;
}

function hasOrganismKind(pages: readonly MenuPageNode[], kind: MenuOrganismKind): boolean {
  return pages.some(page => page.organisms.some(organism => organism.kind === kind));
}

function hasFormOrActions(page: MenuPageNode): boolean {
  return page.organisms.some(organism => organism.kind === 'form' || organism.kind === 'actions');
}

function hasCitation(pages: readonly MenuPageNode[]): boolean {
  return hasOrganismKind(pages, 'summary')
    || hasOrganismKind(pages, 'highlights')
    || hasOrganismKind(pages, 'detail');
}

function derivedKey(derived: P2ActorMustSeeDerived): string {
  return derived.fieldId ? `${derived.entityRef}.${derived.fieldId}` : derived.entityRef;
}

function error(issues: P2MenuGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}

function warning(issues: P2MenuGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'warning', code, message, path });
}
