/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2ModuleConsistency.ts" enhancement="_blank"/>

import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution2/ns2Plan.js';

export interface ModuleArtifactPresence {
  moduleName: string;
  levels: number[];
}

export interface ModuleConsistencyInput {
  projectJsonPresent: boolean;
  projectModules: string[];
  artifactModules: ModuleArtifactPresence[];
  allowPendingModuleName?: string;
}

export interface ModuleConsistencyIssue {
  code:
    | 'project-module-missing-artifacts'
    | 'artifact-module-missing-project'
    | 'project-module-duplicate';
  moduleName: string;
  levels?: number[];
}

export function collectModuleConsistencyIssues(
  input: ModuleConsistencyInput,
): ModuleConsistencyIssue[] {
  if (!input.projectJsonPresent) {
    return [];
  }

  const issues: ModuleConsistencyIssue[] = [];
  const allowedPending = input.allowPendingModuleName
    ? normalizeModuleFolderName(input.allowPendingModuleName, 'module')
    : '';
  const projectCounts = new Map<string, number>();
  for (const moduleName of input.projectModules.map((name) => normalizeModuleFolderName(name, 'module'))) {
    projectCounts.set(moduleName, (projectCounts.get(moduleName) ?? 0) + 1);
  }

  const projectSet = new Set(projectCounts.keys());
  const artifactMap = new Map<string, Set<number>>();
  for (const artifact of input.artifactModules) {
    const moduleName = normalizeModuleFolderName(artifact.moduleName, 'module');
    const levels = artifactMap.get(moduleName) ?? new Set<number>();
    for (const level of artifact.levels) {
      levels.add(level);
    }
    artifactMap.set(moduleName, levels);
  }

  for (const [moduleName, count] of projectCounts) {
    if (count > 1) {
      issues.push({ code: 'project-module-duplicate', moduleName });
    }
    if (!artifactMap.has(moduleName)) {
      issues.push({ code: 'project-module-missing-artifacts', moduleName });
    }
  }

  for (const [moduleName, levels] of artifactMap) {
    if (moduleName !== allowedPending && !projectSet.has(moduleName)) {
      issues.push({
        code: 'artifact-module-missing-project',
        moduleName,
        levels: [...levels].sort((a, b) => a - b),
      });
    }
  }

  return issues;
}

export function formatModuleConsistencyIssues(issues: ModuleConsistencyIssue[]): string {
  const details = issues.map((issue) => {
    if (issue.code === 'project-module-missing-artifacts') {
      return `module '${issue.moduleName}' is declared in l5/project.json but has no l1/l2/l4/l5 module artifacts`;
    }
    if (issue.code === 'artifact-module-missing-project') {
      return `module '${issue.moduleName}' has artifacts in l${(issue.levels ?? []).join('/l')} but is not declared in l5/project.json`;
    }
    return `module '${issue.moduleName}' is declared more than once in l5/project.json`;
  });

  return [
    'l5/project.json is inconsistent with generated module folders.',
    ...details.map((detail) => `- ${detail}`),
    'Fix by deleting stale l5/project.json module entries or restoring/deleting the matching module folders before running agentNewModule2.',
  ].join('\n');
}
