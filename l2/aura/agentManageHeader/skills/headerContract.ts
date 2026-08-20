/// <mls fileReference="_102020_/l2/aura/agentManageHeader/skills/headerContract.ts" enhancement="_blank"/>

// The client-header contract, as prose for the generate-header agent's prompt. The machine-readable
// counterparts are `AuraHeaderBase` (_102033_/l2/shared/layout/aura-header-base.ts), which owns the
// invariants, and `validateHeaderParts` (../helpers/generateHeaderCore.ts), which rejects a
// violation before anything is written. Keep the three in sync.

export const skill = `
# Client header contract (mandatory)

Every client app renders ONE header inside a fixed band of the shell. You are writing the band's
CONTENT for a specific project. You are NOT writing a file: the surrounding class, tag, imports and
\`customElements.define\` are generated for you.

## What you return
- \`bandHtml\`: the body of \`renderBand()\` — a lit template WITHOUT the enclosing \`html\` tag and
  backticks. It is inlined inside \`return html\\\`…\\\`\`.
- \`bandCss\` (optional): extra CSS for this header. It is inlined inside a template literal where
  \`\\\${tag}\` is this header's own tag name.
- \`messages\` (optional): locale -> key -> text, for any FIXED copy you render.

## The base already does this — call it, never reimplement it
- \`this.renderAsideToggle()\` — the mobile hamburger that opens the aside. **Mandatory**: it is the
  only way to reach the menu on mobile. Put it first in the left group.
- \`this.renderBrand()\` — logo + title + subtitle, taken from the CONFIG profile. Use it instead of
  writing the brand name: \`this.brand.title\`, \`this.brand.logoUrl\`, \`this.brand.subtitle\` are
  available if you need a custom arrangement.
- \`this.renderNavLinks()\` — the module's navigation entries as links, with the active one marked.
  **Only when the request says navigation links are wanted.** By default they are NOT: the aside owns
  the menu, and a header repeating it shows the same list twice. If the request does not offer routes,
  do not call this and do not write a path anywhere.
- \`this.renderActions()\` — the optional actions the profile enabled (language / design system /
  module links). Render it once, on the right.
- \`this.hasAction('search' | 'user')\` — true when the profile asked for an action the base does not
  implement; those you render yourself, as a \`<button>\` that calls
  \`this.emitHeaderAction('<action>')\`. They have NO route: the app listens to the event and decides.
  Inventing a path like \`/profile\` produces a dead link and is rejected.
- \`this.navigateTo(href)\` / \`@click=\\\${this.handleNavigate}\` — SPA navigation.
- \`this.localized(messages).<key>\` — the copy for the current language.

Ready-made classes from the base's CSS (use them and you inherit the band's spacing and tokens):
\`aura-header-side\`, \`aura-header-brand\`, \`aura-header-title\`, \`aura-header-subtitle\`,
\`aura-header-nav\`, \`aura-header-link\`, \`aura-header-select\`, \`aura-header-toggle\`.

## MUST
1. Call \`this.renderAsideToggle()\` exactly once.
2. Take the brand from the config (\`this.renderBrand()\` or \`this.brand.*\`) — never a literal name.
3. Scope EVERY \`bandCss\` selector with \`\\\${tag}\` (e.g. \`\\\${tag} .my-part { … }\`). Rules inside
   \`@media\` blocks too.
4. Colors, only through DS role tokens with a fallback: \`var(--ds-color-nav-bg, #fff)\`. The same for
   any inline style.
5. Navigate with \`this.handleNavigate\` / \`this.navigateTo\`, and ONLY to a route given to you in the
   navigation entries. You cannot know which routes exist — so never write a path that was not
   handed to you.
6. Put every fixed word in \`messages\` and read it with \`this.localized(messages)\`. A label the user
   can see is never a literal in the markup.
7. Layout with flex/grid inside the band; the band is a flex row already (left group / right group).

## NEVER
1. No \`createRenderRoot\`, no \`attachShadow\`, no \`static styles\`, no \`<style>\` or \`<script>\` tag,
   no \`customElements.define\`, no imports, no class declaration.
2. No \`height\`, \`min-height\` or \`max-height\` on the host rule (\`\\\${tag} { … }\`) — the shell fixes
   the band height and a header that disagrees shifts the whole page.
3. No \`position: fixed\` — it escapes the band.
4. No literal colors (\`#hex\`, \`rgb()\`, \`hsl()\`) except as the fallback INSIDE a \`var()\`.
5. No \`window.location\`, no bare \`href\` navigation for in-app routes, and no invented route
   (\`/profile\`, \`/settings\`, \`/account\`, …) — not in an \`href\`, not in \`navigateTo\`.
6. No dependency on a molecule/web component from another project: the header must render with the
   base and plain HTML only.
7. No overflow-driven layout: the band is one line high, so keep the content to a single row and let
   long text ellipsize (\`aura-header-subtitle\` already does).

## Example (format reference)
{"type":"flexible","result":{
"bandHtml":"<div class=\\"aura-header-side\\">\\n  \\\${this.renderAsideToggle()}\\n  \\\${this.renderBrand()}\\n</div>\\n<div class=\\"aura-header-side app-header-right\\">\\n  \\\${this.renderNavLinks()}\\n  <span class=\\"app-header-hint\\">\\\${this.localized(messages).hint}</span>\\n  \\\${this.renderActions()}\\n</div>",
"bandCss":"\\\${tag} .app-header-right {\\n  gap: 16px;\\n}\\n\\n\\\${tag} .app-header-hint {\\n  color: var(--ds-color-text-muted, #52606d);\\n  font-size: 0.85rem;\\n}",
"messages":{"en":{"hint":"Shift open"},"pt":{"hint":"Turno aberto"}}
}}
`;
