/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPageTemplateHygieneIssues, collectMissingImageRenderIssues } from './cfeMaterializeCore.js';

// bugpage21: the EXACT shape generated into
// mls-102051/l2/cafeFlow/web/desktop/page21/shiftWorkspace.ts — `: nothing` in the template with a
// module-level `function nothing()` at the bottom. It compiles and typechecks, and Lit paints the
// function's own source code on screen.
const BROKEN_NOTHING = `
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('cafe-flow--web--desktop--page21--shift-workspace-102051')
export class CafeFlowDesktopPage21ShiftWorkspacePage extends Base {
  render() {
    return html\`
      <section>
        \${this.reportState === 'error' ? html\`<p>err</p>\` : nothing}
      </section>
    \`;
  }
}
function nothing() {
  return html\`\`;
}
`;

// The second real variant found in the same app (page11/stockManagement.ts): a differently named
// invented helper. It IS called, so it renders '' rather than source text — still an invented
// module-level helper the skills forbid, and the next name might not be called.
const BROKEN_NAMED_HELPER = `
import { html } from 'lit';
export class P extends Base {
  render() {
    return html\`\${this.editStockItemState === 'error' ? html\`<p>e</p>\` : nothingOrEmpty('x')}\`;
  }
}
function nothingOrEmpty(_s: string): unknown {
  return '';
}
`;

test('bugpage21: a module-level helper rendered by NAME is reported with the concrete remedy', () => {
  const issues = collectPageTemplateHygieneIssues(BROKEN_NOTHING);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /module-level helper 'nothing' is passed to a template without being called/u);
  assert.match(issues[0], /Lit renders the function source as text/u);
  assert.match(issues[0], /use the Lit sentinel/u);
});

test('bugpage21: any invented module-level helper is reported, whatever its name', () => {
  const issues = collectPageTemplateHygieneIssues(BROKEN_NAMED_HELPER);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /module-level function 'nothingOrEmpty' is not allowed in a page/u);
});

test('bugpage21: the CORRECT page (nothing imported from lit) is accepted', () => {
  // The shape page21/kitchenWorkspace.ts already uses, and what the skills now prescribe.
  const good = `
import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('x-y-102051')
export class P extends Base {
  render() {
    const fmt = (v: number) => v.toFixed(2);          // const helper INSIDE render(): allowed
    return html\`\${this.state === 'error' ? html\`<p>e</p>\` : nothing} \${fmt(1)}\`;
  }
}
`;
  assert.deepEqual(collectPageTemplateHygieneIssues(good), []);
});

test('bugpage21: `null` in the empty branch is also accepted (the page11 style)', () => {
  const good = `
import { html } from 'lit';
export class P extends Base {
  render() { return html\`\${this.ready ? html\`<p>ok</p>\` : null}\`; }
}
`;
  assert.deepEqual(collectPageTemplateHygieneIssues(good), []);
});

test('bugpage21: `nothing` used without the lit import is reported (helper deleted, import forgotten)', () => {
  const halfFixed = `
import { html } from 'lit';
export class P extends Base {
  render() { return html\`\${this.ready ? html\`<p>ok</p>\` : nothing}\`; }
}
`;
  const issues = collectPageTemplateHygieneIssues(halfFixed);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /uses `nothing` for an empty branch but it is not imported/u);
});

test('bugpage21: no false positive on empty input or a page with no conditionals', () => {
  assert.deepEqual(collectPageTemplateHygieneIssues(''), []);
  assert.deepEqual(collectPageTemplateHygieneIssues(`
import { html } from 'lit';
export class P extends Base { render() { return html\`<p>\${this.title}</p>\`; } }
`), []);
});

// ── bugimage.md: a page that binds an image field must render it ────────────────
const DEFS_WITH_IMAGE = `export const menuManagementPage = { pageId: 'menuManagement', layout: { sections: [
  { organisms: [{ intentions: [{ id: 'list', fields: [{ field: 'imageUrl' }, { field: 'name' }] }] }] },
] } } as const;`;

test('bugimage: a page binding imageUrl but rendering no <img> is reported', () => {
  const codeWithoutImg = `render() { return html\`\${this.rows.map(item => html\`<span>\${item.imageUrl}</span>\`)}\`; }`;
  const issues = collectMissingImageRenderIssues(DEFS_WITH_IMAGE, codeWithoutImg);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /binds the image field 'imageUrl' but renders no <img> tag/u);
});

test('bugimage: rendering an <img> satisfies the rule', () => {
  const good = `render() { return html\`\${this.rows.map(item => item.imageUrl ? html\`<img src=\${item.imageUrl} alt=\${item.name} loading="lazy">\` : nothing)}\`; }`;
  assert.deepEqual(collectMissingImageRenderIssues(DEFS_WITH_IMAGE, good), []);
});

test('bugimage: a page whose contract has NO image field is never asked for an <img>', () => {
  const defs = `export const p = { pageId: 'x', layout: { sections: [{ organisms: [{ intentions: [{ fields: [{ field: 'name' }] }] }] }] } } as const;`;
  assert.deepEqual(collectMissingImageRenderIssues(defs, 'render() { return html`<p>x</p>`; }'), []);
  // photoUrl / logoUrl / avatarUrl variants ARE recognised.
  for (const field of ['photoUrl', 'logoUrl', 'avatarUrl', 'thumbnailUrl']) {
    const d = `export const p = { pageId: 'x', fields: [{ field: '${field}' }] } as const;`;
    assert.equal(collectMissingImageRenderIssues(d, 'render() { return html`<p>x</p>`; }').length, 1, field);
  }
});

test('bugimage: empty inputs never throw or report', () => {
  assert.deepEqual(collectMissingImageRenderIssues('', 'code'), []);
  assert.deepEqual(collectMissingImageRenderIssues(DEFS_WITH_IMAGE, ''), []);
});
