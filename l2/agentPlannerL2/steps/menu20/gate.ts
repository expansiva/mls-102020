/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/gate.ts" enhancement="_blank"/>

import type { P2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  isP2MenuItemKind,
  type P2MenuDraft,
  type P2ProcessView,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

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

export function validateP2Menu(
  draft: P2MenuDraft,
  sources: P2L4Sources,
  processes: readonly P2ProcessView[],
): P2MenuGateResult {
  const issues: P2MenuGateIssue[] = [];
  const journeyIds = new Set(sources.journeys.map(journey => journey.journeyId).filter(Boolean));
  const entityIds = new Set(sources.entities.map(entity => entity.entityId).filter(Boolean));
  const actorIds = new Set(sources.actors.map(actor => actor.actorId).filter(Boolean));
  const processIds = new Set(processes.map(process => process.processId).filter(Boolean));
  const itemIds = new Set<string>();
  const citedJourneys = new Set<string>();

  draft.menu.forEach((actorMenu, actorPosition) => {
    const actorBase = `menu[${actorPosition}]`;
    if (!MEMBER_ID.test(actorMenu.actorRef)) {
      error(issues, 'P2_MENU_ACTOR_ID', 'actorRef must be lowerCamel.', `${actorBase}.actorRef`);
    } else if (!actorIds.has(actorMenu.actorRef)) {
      error(issues, 'P2_MENU_ACTOR_UNKNOWN', `Unknown actorRef ${actorMenu.actorRef}.`, `${actorBase}.actorRef`);
    }

    const placeIds = new Set(
      actorMenu.items.filter(item => item.kind === 'place' && item.itemId).map(item => item.itemId),
    );

    actorMenu.items.forEach((item, itemPosition) => {
      const base = `${actorBase}.items[${itemPosition}]`;
      if (!MEMBER_ID.test(item.itemId)) {
        error(issues, 'P2_MENU_ITEM_ID', 'itemId must be lowerCamel.', `${base}.itemId`);
      }
      if (item.itemId && itemIds.has(item.itemId)) {
        error(issues, 'P2_MENU_ITEM_ID_DUPLICATE', `Duplicate itemId ${item.itemId}.`, `${base}.itemId`);
      }
      if (item.itemId) itemIds.add(item.itemId);

      if (!isP2MenuItemKind(item.kind)) {
        error(issues, 'P2_MENU_KIND', "kind must be 'place' or 'action'.", `${base}.kind`);
      }

      if (item.kind === 'action') {
        if (!item.placeRef) {
          error(issues, 'P2_MENU_PLACE_REF', 'action requires placeRef.', `${base}.placeRef`);
        } else if (!placeIds.has(item.placeRef)) {
          error(
            issues,
            'P2_MENU_PLACE_REF_UNKNOWN',
            `placeRef ${item.placeRef} is not a place of this actor.`,
            `${base}.placeRef`,
          );
        }
      }

      item.origins.journeys.forEach((journeyRef, journeyPosition) => {
        const path = `${base}.origins.journeys[${journeyPosition}]`;
        if (!journeyIds.has(journeyRef)) {
          error(issues, 'P2_MENU_JOURNEY_UNKNOWN', `Unknown journey ${journeyRef}.`, path);
        } else {
          citedJourneys.add(journeyRef);
        }
      });
      item.origins.entities.forEach((entityRef, entityPosition) => {
        if (!entityIds.has(entityRef)) {
          error(
            issues,
            'P2_MENU_ENTITY_UNKNOWN',
            `Unknown entity ${entityRef}.`,
            `${base}.origins.entities[${entityPosition}]`,
          );
        }
      });
      item.origins.processes.forEach((processRef, processPosition) => {
        if (!processIds.has(processRef)) {
          error(
            issues,
            'P2_MENU_PROCESS_UNKNOWN',
            `Unknown process ${processRef}.`,
            `${base}.origins.processes[${processPosition}]`,
          );
        }
      });
    });
  });

  for (const journey of sources.journeys) {
    if (!citedJourneys.has(journey.journeyId)) {
      warning(
        issues,
        'P2_MENU_JOURNEY_UNUSED',
        `Journey ${journey.journeyId} is not cited by any menu item.`,
        'menu',
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

function error(issues: P2MenuGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}

function warning(issues: P2MenuGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'warning', code, message, path });
}
