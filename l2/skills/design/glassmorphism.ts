/// <mls fileReference="_102020_/l2/skills/design/glassmorphism.ts" enhancement="_blank"/>

export const skill = `

# Skill: Glassmorphism

## Philosophy
> "Depth through transparency. Light caught in layers."

Components float above a dark gradient canvas, simulating frosted glass. The background bleeds through every surface. Hierarchy is built with opacity and blur, not color or shadow.

---

## Canvas

This skill is **dark only**. Components must always render over a dark gradient canvas.

The canvas color palette is **free** — chosen by the implementer. What is required is the structure:

\`\`\`html
<!-- Required canvas structure -->
<div class="bg-gradient-to-br from-[your-color-950] via-[your-color-950] to-[your-color-950]">

  <!-- Ambient orbs: optional but recommended for depth -->
  <div class="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none bg-[--your-color]/20" />
  <div class="absolute w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[your-color]/20" />

</div>
\`\`\`

## Canvas rules
- Background must be **dark** (\`*-900\` to \`*-950\` range)
- Gradient must have **at least 2 stops** for depth
- Ambient orbs use the same hue family as the gradient, at low opacity (\`/15\` to \`/25\`)
- Orbs must be \`pointer-events-none\` and positioned absolutely

> Components rendered without a dark canvas will lose their visual effect entirely.

---

## Tokens

### Glass Surface (Moderate — default)
| Token | Value |
|---|---|
| Background | \`bg-white/10\` |
| Backdrop blur | \`backdrop-blur-md\` |
| Border | \`border border-white/20\` |
| Border highlight | \`border-t-white/30\` (top edge only) |
| Inner glow | \`shadow-inner shadow-white/5\` |

> **Intensity scale for reference:**
> - Subtle: \`bg-white/5\` + \`backdrop-blur-sm\` + \`border-white/10\`
> - **Moderate: \`bg-white/10\` + \`backdrop-blur-md\` + \`border-white/20\`** ← default
> - Intense: \`bg-white/15\` + \`backdrop-blur-xl\` + \`border-white/30\`

### Color
| Token | Value |
|---|---|
| Text Primary | \`white\` |
| Text Secondary | \`white/60\` |
| Text Muted | \`white/40\` |
| Accent | inherits from canvas palette |
| Danger | inherits from implementer |
| Success | inherits from implementer |

> All semantic colors are defined by the implementer. Use \`*-300\` or \`*-400\` lightness range to ensure legibility on dark backgrounds.

### Typography
| Token | Value |
|---|---|
| Font family | \`font-sans\` |
| Body size | \`text-base\` |
| Label size | \`text-sm\` |
| Heading size | \`text-xl\` |
| Body weight | \`font-normal\` |
| Heading weight | \`font-semibold\` |
| Heading tracking | \`tracking-wide\` |
| Text rendering | \`antialiased\` |

### Spacing
| Token | Value |
|---|---|
| Component padding | \`p-6\` |
| Element gap | \`gap-4\` |
| Section gap | \`gap-8\` |

### Shape
| Token | Value |
|---|---|
| Border radius | \`rounded-2xl\` |
| Border width | \`border\` (1px) |
| Outer glow | \`shadow-lg shadow-black/30\` |

### Interaction
| State | Value |
|---|---|
| Hover (surface) | \`hover:bg-white/15\` |
| Hover (border) | \`hover:border-white/30\` |
| Focus ring | \`focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-offset-0\` |
| Transition | \`transition-all duration-200\` |
| Active | \`active:bg-white/20\` |

> \`ring-offset-0\` is intentional — offset creates visual glitching on glass surfaces.

---

## Layering System

Glass components gain depth through stacking. Use opacity to signal hierarchy:

| Layer | bg | blur | border |
|---|---|---|---|
| Base (canvas) | gradient | — | — |
| Card / Panel | \`white/10\` | \`backdrop-blur-md\` | \`white/20\` |
| Elevated (modal, popover) | \`white/15\` | \`backdrop-blur-lg\` | \`white/25\` |
| Tooltip / Badge | \`white/20\` | \`backdrop-blur-sm\` | \`white/30\` |

---

## Rules

### ✅ Do
- Always render over a dark gradient canvas
- Use \`border-t-white/30\` on the top edge to simulate light hitting glass
- Use ambient orbs (\`blur-3xl\`) behind key components to add depth
- Keep text \`white\` or \`white/60\` — never dark text on glass
- Use \`rounded-2xl\` consistently
- Prefer \`transition-all\` for smooth glass state changes
- Use \`pointer-events-none\` on all decorative elements
- Derive accent color from the canvas palette

### ❌ Never
- Render components on a white or light background
- Use opaque backgrounds (\`bg-zinc-900\`, \`bg-slate-800\`, etc.)
- Use colored borders — only \`white/*\` opacity borders
- Use \`ring-offset\` on focus states
- Use \`font-bold\` — weight feels heavy against transparent surfaces
- Stack more than 3 glass layers
- Use drop shadows with color — only \`shadow-black/*\`

---

## Iconography
- Style: **outline / stroke**
- Stroke width: \`1.5\`
- Size: \`size-5\`
- Color: \`text-white/70\` default, accent color for emphasis

---

## Tone
Ethereal. Expensive. Cinematic.  
Light passes through every surface. The canvas is always part of the component.

`