import { Ns4ModuleArtifact } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { Ns4E6Review } from '/_102020_/l2/agentNewSolution4/steps/e6/contracts.js';

export interface Ns4E6GateIssue { code: string; path: string; message: string; }
export interface Ns4E6GateResult { ok: boolean; issues: Ns4E6GateIssue[]; }

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const KINDS = new Set(['horizontalModule', 'plugin']);
const DECISIONS = new Set(['include', 'defer']);

export function validateNs4E6Review(review: Ns4E6Review, module: Ns4ModuleArtifact): Ns4E6GateResult {
  const issues: Ns4E6GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (review.moduleName !== module.module.moduleName) add('NS4_E6_MODULE', 'moduleName', 'Must match the approved module.');
  if (!review.analysisSummary) add('NS4_E6_SUMMARY', 'analysisSummary', 'A short analysis summary is required.');
  const ids = new Set<string>();
  review.recommendations.forEach((item, index) => {
    const path = `recommendations[${index}]`;
    if (!MEMBER_ID.test(item.id)) add('NS4_E6_ID', `${path}.id`, 'Must be a lower-camel id.');
    if (ids.has(item.id)) add('NS4_E6_DUPLICATE', `${path}.id`, `Duplicate recommendation ${item.id}.`);
    if (item.id) ids.add(item.id);
    if (!KINDS.has(item.kind)) add('NS4_E6_KIND', `${path}.kind`, 'Must be horizontalModule or plugin.');
    if (!DECISIONS.has(item.decision)) add('NS4_E6_DECISION', `${path}.decision`, 'Must be include or defer.');
    if (!item.title) add('NS4_E6_TITLE', `${path}.title`, 'A title is required.');
    if (!item.purpose) add('NS4_E6_PURPOSE', `${path}.purpose`, 'A business purpose is required.');
  });
  return { ok: issues.length === 0, issues };
}
