/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.ts" enhancement="_blank"/>

// Deterministic renderers for the variant's shell files (Strategy D) and the
// demo-state substitution. Pure string functions — the templates mirror the
// hand-made variants of mls-102054/102055 (fase 0 findings, todo 0.2).

import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { toShellTitle } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.js';

export function renderShellTs(ctx: VariantContext): string {
  const title = toShellTitle(ctx.origin.shortName);
  const themeUpper = ctx.theme.info.displayName.toUpperCase();
  const portalBlock = ctx.origin.portal
    ? `\n  // O container do portal (document.body) recebe este data-widget — o .less do\n  // tema escopa o painel por div[data-widget="..."].\n  protected portalWidgetName = '${ctx.variant.tag}';\n`
    : '';
  const inherits = ctx.origin.portal ? 'inclusive render() e getPortalTemplate()' : 'inclusive render()';
  const body = ctx.origin.portal ? `{${portalBlock}}` : '{}';
  return `/// <mls fileReference="_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}.ts" enhancement="_102020_/l2/enhancementAura"/>
// =============================================================================
// ${title} — ${themeUpper} (mls-${ctx.theme.project})
// =============================================================================
// Skill Group: ${ctx.origin.groupCanonical}
// Casca (estratégia D): herda tudo de ${ctx.origin.className} (mls-${ctx.origin.project}),
// ${inherits} — o markup base emite classes semânticas ml-*; a aparência
// vem do .less irmão, escopado sob esta tag.
// This molecule does NOT contain business logic.
import { customElement } from 'lit/decorators.js';
import { ${ctx.origin.className} } from '${ctx.origin.importPath}';

@customElement('${ctx.variant.tag}')
export class ${ctx.variant.className} extends ${ctx.origin.className} ${body}
`;
}

export function renderShellDefs(ctx: VariantContext): string {
  const info = ctx.theme.info;
  return `/// <mls fileReference="_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code.

export const group = '${ctx.origin.groupCanonical}';
export const skill = \`# Metadata
- TagName: ${ctx.variant.tag}

# Objective
${info.displayName} variant (by inheritance) of ${ctx.origin.shortName} for the ${ctx.origin.groupCanonical} group. Inherits all logic from mls-${ctx.origin.project} and overrides only the presentation.

# Notes
- Visual model: ${info.name} (mls-${ctx.theme.project}, by inheritance). Logic inherited from mls-${ctx.origin.project}; appearance lives in the scoped .less. ${info.background.note}\`;
`;
}

// Minimal group index page created only when the group folder has no index.ts
// yet (same shape as the hand-made ones, reduced to the registration concern).
export function renderNewGroupIndexTs(ctx: VariantContext): string {
  const indexTag = `molecules--${ctx.variant.group}--index-${ctx.theme.project}`;
  const className = `${ctx.origin.groupCanonical.replace(/^g/, 'G')}Index`;
  return `/// <mls fileReference="_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/index.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';

// Registra as moléculas do grupo (side-effect import)
import '/_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}';

@customElement('${indexTag}')
export class ${className} extends StateLitElement {
  render(): TemplateResult {
    return html\`
      <div style="min-height:100vh; padding:2rem; ${ctx.theme.info.background.css}">
        <h1>${ctx.origin.groupCanonical} · ${ctx.theme.info.name} · ${ctx.theme.project}</h1>
        <${ctx.variant.tag}></${ctx.variant.tag}>
      </div>
    \`;
  }
}
`;
}

export function renderGroupIndexHtml(ctx: VariantContext): string {
  const indexTag = `molecules--${ctx.variant.group}--index-${ctx.theme.project}`;
  return `<${indexTag}></${indexTag}>`;
}

// Insert the variant's side-effect import after the LAST molecule import of the
// existing index.ts (the clearly-delimited registration block). Returns null when
// the file has no recognizable molecule import to anchor on — caller reports,
// never guesses (flow.json v4-index gate).
export function insertIndexImport(indexSource: string, ctx: VariantContext): string | null {
  const importLine = `import '/_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}';`;
  if (indexSource.includes(importLine)) return indexSource;
  // No trailing \s*$: with the m flag it swallows newlines and shifts the
  // insertion point past blank lines (caught by gate.test).
  const importPattern = new RegExp(`^import '/_\\d+_/l2/molecules/${ctx.variant.group}/[a-z0-9-]+';`, 'gm');
  const matches = Array.from(indexSource.matchAll(importPattern));
  if (!matches.length) return null;
  const last = matches[matches.length - 1];
  const insertAt = (last.index || 0) + last[0].length;
  return `${indexSource.slice(0, insertAt)}\n${importLine}${indexSource.slice(insertAt)}`;
}

// Port of agentNewMoleculePlayground.generatePlaygroundState (fase 0.3): the demo
// html carries a 'playgroundDinamicState' placeholder that is replaced
// DETERMINISTICALLY by the state assembled from the LLM examples.
export interface VDemoExample {
  name: string;
  state: { stateName: string; value: string }[];
}

export function substituteDemoState(html: string, examples: VDemoExample[]): string {
  const playground: Record<string, Record<string, unknown>> = {};
  for (const scenario of examples) {
    for (const entry of scenario.state || []) {
      const parts = entry.stateName.split('.');
      if (parts.length !== 3 || parts[0] !== 'playground') continue;
      const key = parts[1];
      const prop = parts[2];
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry.value);
      } catch {
        parsed = entry.value;
      }
      if (!playground[key]) playground[key] = {};
      playground[key][prop] = parsed;
    }
  }
  return html.replace('playgroundDinamicState', JSON.stringify({ playground }));
}
