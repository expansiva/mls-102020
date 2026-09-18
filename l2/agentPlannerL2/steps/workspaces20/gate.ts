/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/workspaces20/gate.ts" enhancement="_blank"/>

import {
  collectP2WorkspaceCandidates,
  isP2WorkspaceKind,
  type P2L4Sources,
  type P2WorkspacesDraft,
  type P2WorkspaceCandidate,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;

export interface P2WorkspaceGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P2WorkspaceGateResult {
  ok: boolean;
  issues: P2WorkspaceGateIssue[];
}

export function validateP2Workspaces(
  draft: P2WorkspacesDraft,
  sources: P2L4Sources,
): P2WorkspaceGateResult {
  const issues: P2WorkspaceGateIssue[] = [];
  const candidates = collectP2WorkspaceCandidates(sources);
  const journeyById = new Map(sources.journeys.map(journey => [journey.journeyId, journey]));
  const entityIds = new Set(sources.entities.map(entity => entity.entityId).filter(Boolean));
  const actorIds = new Set(sources.actors.map(actor => actor.actorId).filter(Boolean));
  const stepById = new Map<string, { journeyId: string }>();
  for (const journey of sources.journeys) {
    for (const step of journey.steps) {
      stepById.set(step.stepId, { journeyId: journey.journeyId });
    }
  }

  if (!draft.workspaces.length) {
    error(issues, 'P2_WORKSPACE_NONE', 'At least one workspace is required.', 'workspaces');
  }

  const workspaceIds = new Set<string>();
  const journeyOwner = new Map<string, string>();

  draft.workspaces.forEach((workspace, position) => {
    const base = `workspaces[${position}]`;
    if (!MEMBER_ID.test(workspace.workspaceId)) {
      error(issues, 'P2_WORKSPACE_ID', 'workspaceId must be lowerCamel.', `${base}.workspaceId`);
    }
    if (workspace.workspaceId && workspaceIds.has(workspace.workspaceId)) {
      error(issues, 'P2_WORKSPACE_ID_DUPLICATE', `Duplicate workspaceId ${workspace.workspaceId}.`, `${base}.workspaceId`);
    }
    if (workspace.workspaceId) workspaceIds.add(workspace.workspaceId);

    if (!workspace.title.trim()) {
      error(issues, 'P2_WORKSPACE_TITLE', 'Workspace title is required.', `${base}.title`);
    }
    if (!isP2WorkspaceKind(workspace.kind)) {
      error(issues, 'P2_WORKSPACE_KIND', "kind must be 'catalogue', 'hub' or 'command'.", `${base}.kind`);
    }
    if (!ENTITY_ID.test(workspace.entityRef)) {
      error(issues, 'P2_WORKSPACE_ENTITY', 'entityRef must be UpperCamel.', `${base}.entityRef`);
    } else if (entityIds.size && !entityIds.has(workspace.entityRef)) {
      error(issues, 'P2_WORKSPACE_ENTITY_UNKNOWN', `Unknown entityRef ${workspace.entityRef}.`, `${base}.entityRef`);
    }

    if (!workspace.actorRefs.length) {
      error(issues, 'P2_WORKSPACE_ACTOR', 'actorRefs must list at least one actor.', `${base}.actorRefs`);
    }
    workspace.actorRefs.forEach((actorRef, actorPosition) => {
      if (!MEMBER_ID.test(actorRef)) {
        error(issues, 'P2_WORKSPACE_ACTOR_ID', 'actorRef must be lowerCamel.', `${base}.actorRefs[${actorPosition}]`);
      } else if (!actorIds.has(actorRef)) {
        error(issues, 'P2_WORKSPACE_ACTOR_UNKNOWN', `Unknown actorRef ${actorRef}.`, `${base}.actorRefs[${actorPosition}]`);
      }
    });

    if (!workspace.journeyRefs.length) {
      error(issues, 'P2_WORKSPACE_JOURNEY', 'journeyRefs must list at least one journey.', `${base}.journeyRefs`);
    }
    workspace.journeyRefs.forEach((journeyRef, journeyPosition) => {
      const path = `${base}.journeyRefs[${journeyPosition}]`;
      if (!MEMBER_ID.test(journeyRef)) {
        error(issues, 'P2_WORKSPACE_JOURNEY_ID', 'journeyRef must be lowerCamel.', path);
        return;
      }
      if (!journeyById.has(journeyRef)) {
        error(issues, 'P2_WORKSPACE_JOURNEY_UNKNOWN', `Unknown journeyRef ${journeyRef}.`, path);
        return;
      }
      const owner = journeyOwner.get(journeyRef);
      if (owner) {
        error(
          issues,
          'P2_WORKSPACE_JOURNEY_DUP',
          `Journey ${journeyRef} already belongs to workspace ${owner}.`,
          path,
        );
      } else {
        journeyOwner.set(journeyRef, workspace.workspaceId || base);
      }
    });

    if (!workspace.stepRefs.length) {
      error(issues, 'P2_WORKSPACE_STEP', 'stepRefs must list at least one step.', `${base}.stepRefs`);
    }
    const cited = new Set(workspace.journeyRefs);
    workspace.stepRefs.forEach((stepRef, stepPosition) => {
      const path = `${base}.stepRefs[${stepPosition}]`;
      if (!MEMBER_ID.test(stepRef)) {
        error(issues, 'P2_WORKSPACE_STEP_ID', 'stepRef must be lowerCamel.', path);
        return;
      }
      const found = stepById.get(stepRef);
      if (!found) {
        error(issues, 'P2_WORKSPACE_STEP_UNKNOWN', `Unknown stepRef ${stepRef}.`, path);
        return;
      }
      if (cited.size && !cited.has(found.journeyId)) {
        error(
          issues,
          'P2_WORKSPACE_STEP_JOURNEY',
          `stepRef ${stepRef} belongs to journey ${found.journeyId}, which is not in this workspace.`,
          path,
        );
      }
    });

    addCandidateIssues(issues, workspace, candidates, base);
  });

  for (const journey of sources.journeys) {
    if (!journeyOwner.has(journey.journeyId)) {
      error(
        issues,
        'P2_WORKSPACE_JOURNEY_MISSING',
        `Journey ${journey.journeyId} is not assigned to any workspace.`,
        'workspaces',
      );
    }
  }

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatP2WorkspaceGate(issues: P2WorkspaceGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

function addCandidateIssues(
  issues: P2WorkspaceGateIssue[],
  workspace: P2WorkspacesDraft['workspaces'][number],
  candidates: P2WorkspaceCandidate[],
  base: string,
): void {
  const cited = new Set(workspace.journeyRefs);
  const overlapping = candidates.filter(candidate =>
    candidate.journeyRefs.some(journeyRef => cited.has(journeyRef)),
  );
  if (!overlapping.length) return;

  const entityOk = overlapping.some(candidate => candidate.entityRef === workspace.entityRef);
  if (workspace.entityRef && !entityOk) {
    error(
      issues,
      'P2_WORKSPACE_ENTITY_INVENTED',
      `entityRef ${workspace.entityRef} is not among the candidates of the cited journeys.`,
      `${base}.entityRef`,
    );
  }

  const candidateActors = new Set(overlapping.map(candidate => candidate.actorRef));
  workspace.actorRefs.forEach((actorRef, actorPosition) => {
    if (actorRef && !candidateActors.has(actorRef)) {
      error(
        issues,
        'P2_WORKSPACE_ACTOR_INVENTED',
        `actorRef ${actorRef} is not among the candidates of the cited journeys.`,
        `${base}.actorRefs[${actorPosition}]`,
      );
    }
  });

  const kinds = new Set(overlapping.filter(candidate => candidate.entityRef === workspace.entityRef).map(candidate => candidate.kind));
  if (!kinds.size) {
    overlapping.forEach(candidate => kinds.add(candidate.kind));
  }
  if (isP2WorkspaceKind(workspace.kind) && kinds.size && !kinds.has(workspace.kind)) {
    error(
      issues,
      'P2_WORKSPACE_KIND_CANDIDATE',
      `kind ${workspace.kind} is not among the candidate kinds for this cut (${[...kinds].join(', ')}).`,
      `${base}.kind`,
    );
  }
}

function error(issues: P2WorkspaceGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}
