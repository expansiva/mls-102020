/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/helpers/ntAnswers.ts" enhancement="_blank"/>

// Merges what the prompt already pinned down (`plan.known`) with the checkpoint answers into
// ONE decided field set plus ONE block of free-text guidance. Pure — unit-testable.
//
// Why the free text is collected separately and never dropped: the canonical fields are
// coarse enums (`border.style: thick`), so they cannot carry the exact values, signature
// interactions and negative constraints that make a theme recognizable ('3px', '4px 4px 0
// #000', 'slides 2px into its own shadow', 'no blur anywhere'). Those arrive as the `extra`
// slot and as per-question notes, and both feed the generation verbatim.

import {
  NtAnswer,
  NtBackgroundKind,
  NtCorners,
  NtMotion,
  NtShadowStyle,
  NtThemeFields,
  NtTypographyFamily,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';

export const NT_EXTRA_ANSWER_FIELD = 'extra';

export interface NtResolvedInput {
  fields: NtThemeFields;   // known + answers, with suffix derived from name
  guidance: string;        // the extra slot + every per-question note, one per line
}

export function ntResolveAnswers(known: NtThemeFields, answers: NtAnswer[]): NtResolvedInput {
  const fields: NtThemeFields = cloneFields(known);
  const guidance: string[] = [];

  for (const answer of answers || []) {
    const field = (answer.field || '').trim();
    if (!field) continue;
    const notes = (answer.notes || '').trim();
    const value = (answer.value || '').trim();

    if (field === NT_EXTRA_ANSWER_FIELD) {
      if (notes) guidance.push(notes);
      else if (value) guidance.push(value);
      continue;
    }

    // An OPEN field is answered by typing, so its notes ARE the value; a CLOSED field
    // answers with an option id and its notes are extra nuance worth keeping.
    const chosen = value || notes;
    if (chosen) applyField(fields, field, chosen);
    if (notes && value) guidance.push(`${field}: ${notes}`);
  }

  if (fields.name && !fields.suffix) fields.suffix = `-${kebab(fields.name)}`;
  return { fields, guidance: guidance.join('\n') };
}

// 'background.kind' -> fields.background.kind, with the enum casts the model expects.
function applyField(fields: NtThemeFields, field: string, value: string): void {
  switch (field) {
    case 'name': fields.name = kebab(value); return;
    case 'displayName': fields.displayName = value; return;
    case 'primary': fields.primary = value; return;
    case 'corners': fields.corners = value as NtCorners; return;
    case 'shadow': fields.shadow = value as NtShadowStyle; return;
    case 'motion': fields.motion = value as NtMotion; return;
    case 'background.kind':
      fields.background = { ...(fields.background || {}), kind: value as NtBackgroundKind };
      return;
    case 'background.css':
      fields.background = { ...(fields.background || {}), css: value };
      return;
    case 'border.style':
      fields.border = { ...(fields.border || {}), style: value as NonNullable<NtThemeFields['border']>['style'] };
      return;
    case 'border.color':
      fields.border = { ...(fields.border || {}), color: value };
      return;
    case 'typography.family':
      fields.typography = { ...(fields.typography || {}), family: value as NtTypographyFamily };
      return;
    case 'typography.uppercaseLabels':
      fields.typography = { ...(fields.typography || {}), uppercaseLabels: value === 'true' };
      return;
    default:
      return; // unknown field ids were already rejected by the t1 gate
  }
}

// A theme id is a kebab token: 'Neo Brutal' -> 'neo-brutal'. Keeps name and the derived
// suffix consistent with the t3 gate (suffix === '-' + name).
function kebab(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function cloneFields(known: NtThemeFields): NtThemeFields {
  return {
    ...known,
    ...(known.background ? { background: { ...known.background } } : {}),
    ...(known.border ? { border: { ...known.border } } : {}),
    ...(known.typography ? { typography: { ...known.typography } } : {}),
  };
}
