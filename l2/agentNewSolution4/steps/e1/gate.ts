/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e1/gate.ts" enhancement="_blank"/>

import {
  NS4_FLOW_ID,
  NS4_FLOW_VERSION,
  NS4_MODULE_SCHEMA_VERSION,
  Ns4ModuleArtifact,
  normalizeNs4ModuleName,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';

export interface Ns4GateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns4E1GateResult {
  ok: boolean;
  issues: Ns4GateIssue[];
}

export function validateNs4E1Module(artifact: Ns4ModuleArtifact): Ns4E1GateResult {
  const issues: Ns4GateIssue[] = [];
  if (artifact.schemaVersion !== NS4_MODULE_SCHEMA_VERSION) error(issues, 'schema.version', 'Unexpected module schemaVersion.', 'schemaVersion');
  if (artifact.module.moduleName !== normalizeNs4ModuleName(artifact.module.moduleName)) {
    error(issues, 'module.name.notNormalized', 'moduleName must be normalized lower camel case.', 'module.moduleName');
  }
  if (!/^[a-z][A-Za-z0-9]*$/.test(artifact.module.moduleName)) error(issues, 'module.name.invalid', 'moduleName is invalid.', 'module.moduleName');
  if (!artifact.module.title.trim()) error(issues, 'module.title.missing', 'Module title is required.', 'module.title');
  if (!artifact.module.purpose.trim()) error(issues, 'module.purpose.missing', 'Module purpose is required.', 'module.purpose');
  if (artifact.module.languages.length === 0 || artifact.module.languages.some(language => language.trim().length < 2)) {
    error(issues, 'module.language.missing', 'At least one valid language is required.', 'module.languages');
  }
  if (!artifact.designContext.initialPrompt.trim()) error(issues, 'designContext.prompt.missing', 'Initial prompt is required.', 'designContext.initialPrompt');
  if (artifact.specStatus.flowId !== NS4_FLOW_ID || artifact.specStatus.flowVersion !== NS4_FLOW_VERSION) {
    error(issues, 'status.flow.invalid', 'specStatus must identify agentNewSolution4 and its flow version.', 'specStatus');
  }
  const e1 = artifact.specStatus.completedSteps.find(step => step.stepId === 'e1');
  if (!e1 || e1.status !== 'approved') error(issues, 'status.e1.notApproved', 'E1 must be approved.', 'specStatus.completedSteps');
  if (artifact.specStatus.nextStep !== 'e2-journeys') error(issues, 'status.next.invalid', 'The next step after E1 must be e2-journeys.', 'specStatus.nextStep');
  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

function error(issues: Ns4GateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}
