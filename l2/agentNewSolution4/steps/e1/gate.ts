/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e1/gate.ts" enhancement="_blank"/>

import {
  NS4_FLOW_ID,
  NS4_FLOW_VERSION,
  NS4_MODULE_SCHEMA_VERSION,
  NS4_PLAN_IDS,
  Ns4ModuleArtifact,
  normalizeNs4Languages,
  normalizeNs4ModuleName,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { policyFor } from '/_102020_/l2/agentNewSolution4/steps/e1/contracts.js';

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
  if (!artifact.presentation.userLanguage.trim()) error(issues, 'presentation.language.missing', 'Presentation language is required.', 'presentation.userLanguage');
  for (const planId of NS4_PLAN_IDS) {
    if (!artifact.presentation.stepTitles[planId]?.trim()) {
      error(issues, 'presentation.title.missing', `Friendly step title is required for ${planId}.`, `presentation.stepTitles.${planId}`);
    }
  }
  if (artifact.module.moduleName !== normalizeNs4ModuleName(artifact.module.moduleName)) {
    error(issues, 'module.name.notNormalized', 'moduleName must be normalized lower camel case.', 'module.moduleName');
  }
  if (!/^[a-z][A-Za-z0-9]*$/.test(artifact.module.moduleName)) error(issues, 'module.name.invalid', 'moduleName is invalid.', 'module.moduleName');
  if (!artifact.module.title.trim()) error(issues, 'module.title.missing', 'Module title is required.', 'module.title');
  if (!artifact.module.purpose.trim()) error(issues, 'module.purpose.missing', 'Module purpose is required.', 'module.purpose');
  if (artifact.module.languages.length === 0 || artifact.module.languages.some(language => language.trim().length < 2)) {
    error(issues, 'module.language.missing', 'At least one valid language is required.', 'module.languages');
  }
  const normalizedLanguages = normalizeNs4Languages(artifact.module.languages);
  if (normalizedLanguages.length !== artifact.module.languages.length
    || normalizedLanguages.some((language, index) => language !== artifact.module.languages[index])) {
    error(issues, 'module.language.notNormalized', 'Product languages must be unique normalized BCP-47 tags.', 'module.languages');
  }
  if (!artifact.designContext.initialPrompt.trim()) error(issues, 'designContext.prompt.missing', 'Initial prompt is required.', 'designContext.initialPrompt');
  if (!['guided', 'smart', 'automatic'].includes(artifact.reviewPolicy.mode)) {
    error(issues, 'reviewPolicy.invalid', 'reviewPolicy.mode is invalid.', 'reviewPolicy.mode');
  }
  if (artifact.solutionStrategy.databaseChangePolicy !== policyFor(artifact.solutionStrategy.mode)) {
    error(issues, 'strategy.policy.invalid', 'Database policy must match the selected solution strategy.', 'solutionStrategy.databaseChangePolicy');
  }
  if (!artifact.solutionStrategy.rationale.trim()) {
    error(issues, 'strategy.rationale.missing', 'The selected solution strategy requires a rationale.', 'solutionStrategy.rationale');
  }
  if (artifact.solutionStrategy.mode !== 'newSolution') {
    if (!artifact.solutionStrategy.modernization?.sourceSystemName.trim()) {
      error(issues, 'strategy.source.missing', 'Modernization requires sourceSystemName.', 'solutionStrategy.modernization.sourceSystemName');
    }
    if (!artifact.solutionStrategy.modernization?.schemaAvailability) {
      error(issues, 'strategy.schema.missing', 'Modernization requires schemaAvailability.', 'solutionStrategy.modernization.schemaAvailability');
    }
  }
  if (!artifact.businessScope.mainGoal.trim()) error(issues, 'scope.goal.missing', 'Main business goal is required.', 'businessScope.mainGoal');
  if (!artifact.businessScope.actors.length) error(issues, 'scope.actors.missing', 'At least one business actor is required.', 'businessScope.actors');
  if (!artifact.businessScope.expectedOutcomes.length) error(issues, 'scope.outcomes.missing', 'At least one expected outcome is required.', 'businessScope.expectedOutcomes');
  if (!artifact.localization.productLanguages.includes(artifact.localization.defaultLanguage)) {
    error(issues, 'localization.default.invalid', 'Default language must belong to productLanguages.', 'localization.defaultLanguage');
  }
  const inScope = new Set(artifact.businessScope.inScope.map(item => item.trim().toLowerCase()));
  if (artifact.businessScope.outOfScope.some(item => inScope.has(item.trim().toLowerCase()))) {
    error(issues, 'scope.contradiction', 'The same scope item cannot be both included and excluded.', 'businessScope');
  }
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
