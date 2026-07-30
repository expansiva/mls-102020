/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetDefsClarificationLogic.ts" enhancement="_blank"/>

// Pure logic for the Defs Clarification widget — the human checkpoint that confirms a new
// molecule's requirements BEFORE the .defs.ts is written. Kept separate from the Lit component
// so it is unit-testable without a DOM.
//
// Contract deliberately mirrors agentsManageMolecules/agentNewMoleculePlannerClarification
// (decision D2): same fields, same click-to-edit behaviour, same 'clarification-finish' event
// carrying { tagName, ...data }. Users of the old flow see no change. Two additions:
// - `group` is DERIVED from the fileReference folder and read-only (decision Q1);
// - `themeLabel` names the detected theme in a read-only line (decision Q3).

import { tagFromFileReference } from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';

export interface DefsClarificationData {
  fileReference: string;
  description: string;
  prompt: string;
  group: string;                     // derived from the folder; read-only in the widget
  functionalRequirements: string[];
  visualRequirements: string[];
  // Layout-rule axes the molecule candidates for: axis key -> chosen value. An axis absent from the
  // bag is a WILDCARD ("works under any value"). The caller supplies the offered axes in
  // `DefsClarificationValue.axes`; the widget only ever writes values from those enums.
  layoutConfig: Record<string, string>;
}

// One axis offered by the checkpoint, derived from the DS vocabulary by the caller.
export interface DefsAxisOption {
  key: string;
  label: string;
  values: readonly string[];
  /** the vocabulary default, shown as a hint */
  default?: string;
}

export interface DefsClarificationValue {
  planId?: string;
  title?: string;
  intro?: string;
  userLanguage?: string;
  // Read-only line describing the detected theme, e.g. 'glass (-glass)'. Empty/absent in a
  // project with no theme — the widget then shows nothing, which is the honest signal.
  themeLabel?: string;
  // Layout axes to offer, in vocabulary order. Absent/empty => the group has no governing axis and
  // the section is not rendered at all (5 of the 31 groups).
  axes?: DefsAxisOption[];
  data: DefsClarificationData;
}

export type DefsAction = 'continue' | 'cancel';

export type DefsEditableField = 'fileReference' | 'description' | 'prompt';
export type DefsRequirementKind = 'functional' | 'visual';

export interface DefsClarificationResult extends DefsClarificationData {
  tagName: string;
}

export function emptyDefsData(): DefsClarificationData {
  return { fileReference: '', description: '', prompt: '', group: '', functionalRequirements: [], visualRequirements: [], layoutConfig: {} };
}

// The select's empty option: the molecule works under ANY value of this axis, so the axis is omitted.
export const DEFS_AXIS_WILDCARD = '';

// Writes an axis value, dropping the axis when the wildcard is chosen. Values outside the offered enum
// are ignored — the widget must never invent a value the DS vocabulary does not know.
export function applyDefsAxisValue(
  data: DefsClarificationData,
  axes: DefsAxisOption[],
  key: string,
  value: string,
): DefsClarificationData {
  const axis = axes.find(item => item.key === key);
  if (!axis) return data;
  const next = { ...data, layoutConfig: { ...data.layoutConfig } };
  if (value === DEFS_AXIS_WILDCARD) {
    delete next.layoutConfig[key];
    return next;
  }
  if (!axis.values.includes(value)) return data;
  next.layoutConfig[key] = value;
  return next;
}

const REQUIREMENT_KEY: Record<DefsRequirementKind, 'functionalRequirements' | 'visualRequirements'> = {
  functional: 'functionalRequirements',
  visual: 'visualRequirements',
};

// The group always follows the fileReference folder, so editing the path renames the group too.
export function groupFromFileReference(reference: string, fallback = ''): string {
  const tag = tagFromFileReference(reference);
  if (!tag.includes('--')) return fallback;
  return tag.split('--')[0];
}

export function applyDefsFieldEdit(data: DefsClarificationData, field: DefsEditableField, value: string): DefsClarificationData {
  const next: DefsClarificationData = { ...data, [field]: value };
  if (field === 'fileReference') next.group = groupFromFileReference(value, data.group);
  return next;
}

export function applyDefsRequirementEdit(
  data: DefsClarificationData,
  kind: DefsRequirementKind,
  index: number,
  value: string,
): DefsClarificationData {
  const key = REQUIREMENT_KEY[kind];
  const list = [...data[key]];
  if (index < 0 || index >= list.length) return data;
  list[index] = value;
  return { ...data, [key]: list };
}

export function addDefsRequirement(data: DefsClarificationData, kind: DefsRequirementKind, value: string): DefsClarificationData {
  const key = REQUIREMENT_KEY[kind];
  return { ...data, [key]: [...data[key], value] };
}

export function removeDefsRequirement(data: DefsClarificationData, kind: DefsRequirementKind, index: number): DefsClarificationData {
  const key = REQUIREMENT_KEY[kind];
  return { ...data, [key]: data[key].filter((_, i) => i !== index) };
}

// Confirm stays disabled until the checkpoint can actually produce artifacts: a derivable tag,
// a description, and at least one functional requirement (the .defs.ts Responsibilities come
// from it). Blank requirement lines are rejected — they reach the .defs.ts as empty bullets.
//
// `axes`, when offered, add one more: at least one of them must be chosen. An empty layoutConfig makes
// the molecule the group's fallback wildcard, picked by alphabetical order (decision D7).
export function defsBlockingIssues(data: DefsClarificationData, axes: DefsAxisOption[] = []): string[] {
  const issues: string[] = [];
  if (!tagFromFileReference(data.fileReference)) issues.push('fileReference');
  if (!data.description.trim()) issues.push('description');
  const functional = data.functionalRequirements.filter(item => item.trim());
  if (!functional.length) issues.push('functionalRequirements');
  if (data.functionalRequirements.some(item => !item.trim()) || data.visualRequirements.some(item => !item.trim())) {
    issues.push('emptyRequirement');
  }
  if (axes.length && !axes.some(axis => !!data.layoutConfig[axis.key])) issues.push('layoutConfig');
  return issues;
}

export function canConfirmDefs(data: DefsClarificationData, axes: DefsAxisOption[] = []): boolean {
  return defsBlockingIssues(data, axes).length === 0;
}

// The emitted value: the confirmed data plus the DERIVED tag (never authored by hand). Axes not in the
// offered set are dropped — a stale value from a previous group must not travel to the plan.
export function buildDefsResult(data: DefsClarificationData, axes: DefsAxisOption[] = []): DefsClarificationResult {
  const offered = new Set(axes.map(axis => axis.key));
  const layoutConfig: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.layoutConfig || {})) {
    if (!value) continue;
    if (axes.length && !offered.has(key)) continue;
    layoutConfig[key] = value;
  }
  return {
    ...data,
    group: groupFromFileReference(data.fileReference, data.group),
    functionalRequirements: data.functionalRequirements.map(item => item.trim()).filter(Boolean),
    visualRequirements: data.visualRequirements.map(item => item.trim()).filter(Boolean),
    layoutConfig,
    tagName: tagFromFileReference(data.fileReference),
  };
}
