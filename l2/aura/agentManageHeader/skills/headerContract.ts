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
- \`this.renderLogo()\` — the mark ALONE, from the config profile: it inlines \`brand.logoSvg\` (already
  sanitized) or renders the \`<img>\` of \`brand.logoUrl\`, and nothing when there is neither. Use this
  whenever you want the mark and the text arranged your own way. You CANNOT inline the markup
  yourself: a lit template interpolates a string as TEXT, never as markup, so
  \`svg\`\${this.brand.logoSvg}\`\` renders nothing — and \`bandHtml\` may not import a directive.
- \`this.renderBrand()\` — logo + title + subtitle, taken from the CONFIG profile. Use it instead of
  writing the brand name: \`this.brand.title\`, \`this.brand.logoUrl\`, \`this.brand.subtitle\` are
  available if you need a custom arrangement.
- \`this.renderNavLinks()\` — the module's navigation entries as links, with the active one marked.
  **Only when the request says navigation links are wanted.** By default they are NOT: the aside owns
  the menu, and a header repeating it shows the same list twice. If the request does not offer routes,
  do not call this and do not write a path anywhere.
- \`this.renderActions()\` — the optional actions the profile enabled (language / design system /
  module links). Render it once, on the right.
- \`this.renderUserAvatar()\` — the logged user as a round avatar: the IdP photo when there is one,
  else the initials on a brand-colored circle, else a neutral silhouette (a photo that fails to load
  falls back too). Clicking opens the identity panel the base owns — name, email and sign out — and
  also announces the \`user\` action so the app can react. \`this.renderActions()\` already includes it
  when the profile asked for \`user\`; call it directly only to place it elsewhere in the band.
  Override \`userMenuLabels\` to translate the panel ("Sair" / "Não autenticado").
- \`this.hasAction('search')\` — true when the profile asked for an action the base does not implement;
  render it yourself as a \`<button>\` that calls \`this.emitHeaderAction('search')\`. It has NO route:
  the app listens to the event and decides. Inventing a path like \`/profile\` is rejected.
- \`this.navigateTo(href)\` / \`@click=\\\${this.handleNavigate}\` — SPA navigation.
- \`this.localized(messages).<key>\` — the copy for the current language.
- \`this.userName\` / \`this.userFirstName\` / \`this.userEmail\` — the logged user, for a greeting
  ("Bem-vindo, \${this.userFirstName}"). Reading them starts the session probe by itself, so a header
  that greets the user does NOT have to ask for the avatar. They are EMPTY on the first paint (the
  session is asked over the network) and fill in when it answers — so write markup that reads fine
  empty, e.g. render the greeting only when \`this.userName\` is truthy.

Ready-made classes from the base's CSS (use them and you inherit the band's spacing and tokens):
\`aura-header-side\`, \`aura-header-brand\`, \`aura-header-title\`, \`aura-header-subtitle\`,
\`aura-header-nav\`, \`aura-header-link\`, \`aura-header-select\`, \`aura-header-toggle\`.

## MUST
1. Call \`this.renderAsideToggle()\` exactly once.
2. For the user, call \`this.renderUserAvatar()\` — NEVER build your own user button. The base's avatar
   has the photo -> initials -> silhouette fallback (yours would render an empty box while the session
   is still loading) and opens the identity panel with email and sign out. \`this.renderActions()\`
   already includes it when the profile asked for \`user\`, so calling both renders it twice.
3. Take the brand from the config (\`this.renderBrand()\` or \`this.brand.*\`) — never a literal name.
4. Scope EVERY \`bandCss\` selector with \`\\\${tag}\` (e.g. \`\\\${tag} .my-part { … }\`). Rules inside
   \`@media\` blocks too.
5. Colors, only through DS role tokens with a fallback: \`var(--ds-color-nav-bg, #fff)\`. The same for
   any inline style.
6. Navigate with \`this.handleNavigate\` / \`this.navigateTo\`, and ONLY to a route given to you in the
   navigation entries. You cannot know which routes exist — so never write a path that was not
   handed to you.
7. Put every fixed word in \`messages\` and read it with \`this.localized(messages)\`. A label the user
   can see is never a literal in the markup.
8. Layout freely INSIDE the band with flex/grid — the base gives you a flex row (left group / right
   group), but you may regroup, stack, center, or build a 3-column grid. What you may not do is grow
   taller: the shell clips the region to the fixed band height, so anything outside it is cut off.
9. Motion is welcome when it is subtle and scoped: CSS \`transition\` on your own parts, and
   \`@keyframes\` you define in \`bandCss\` (the keyframe steps do not need the tag; every real selector
   does). Wrap anything continuous in \`@media (prefers-reduced-motion: reduce)\` to stop it. Animate
   \`transform\`/\`opacity\` — animating layout properties on a 66px band costs a reflow per frame.

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
7. No layout that needs more than the band's height, and no dropdown/menu that opens outside it: the
   shell sets \`overflow: hidden\` on the header region, so it would be clipped, not shown. Long text
   ellipsizes (\`aura-header-subtitle\` already does).
8. No animation on the mobile aside toggle's visibility, and nothing that moves on every render — a
   header that pulses forever is noise in a workspace people keep open all day.

## Example (format reference)
{"type":"flexible","result":{
"bandHtml":"<div class=\\"aura-header-side\\">\\n  \\\${this.renderAsideToggle()}\\n  \\\${this.renderBrand()}\\n</div>\\n<div class=\\"aura-header-side app-header-right\\">\\n  \\\${this.renderNavLinks()}\\n  <span class=\\"app-header-hint\\">\\\${this.localized(messages).hint}</span>\\n  \\\${this.renderActions()}\\n</div>",
"bandCss":"\\\${tag} .app-header-right {\\n  gap: 16px;\\n}\\n\\n\\\${tag} .app-header-hint {\\n  color: var(--ds-color-text-muted, #52606d);\\n  font-size: 0.85rem;\\n}",
"messages":{"en":{"hint":"Shift open"},"pt":{"hint":"Turno aberto"}}
}}
`;
