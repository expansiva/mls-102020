/// <mls fileReference="_102020_/l2/skills/design/minimalist.ts" enhancement="_blank"/>

export const skill = `
# Skill: Minimalist

## Philosophy

> "The component exists. Nothing more."

Everything that doesn't communicate is removed.  
No decorative shadows, no gradients, no unnecessary borders.  
White space is not empty — it is the design itself.

---

## Tokens

### Color

| Token            | Light    | Dark     |
|------------------|----------|----------|
| Background       | zinc-50  | zinc-950 |
| Surface          | white    | zinc-900 |
| Border           | zinc-200 | zinc-800 |
| Text Primary     | zinc-900 | zinc-50  |
| Text Secondary   | zinc-500 | zinc-400 |
| Accent           | zinc-900 | zinc-50  |

**Note:**  
Accent is the text itself. No separate accent color.

---

### Typography

| Token             | Value                  |
|-------------------|------------------------|
| Font family       | font-sans (system-ui)  |
| Body size         | text-base              |
| Label size        | text-sm                |
| Heading size      | text-lg                |
| Body weight       | font-normal            |
| Emphasis weight   | font-medium            |
| Heading tracking  | tracking-tight         |

**Rule:**  
Never use \`font-bold\` or \`font-semibold\`.

---

### Spacing

| Token             | Value                |
|-------------------|----------------------|
| Component padding | p-6 or p-8           |
| Element gap       | gap-4 or gap-6       |
| Section gap       | gap-8 or gap-12      |

**Rule:**  
When in doubt, add more space.

---

### Shape

| Token         | Value                                      |
|---------------|--------------------------------------------|
| Border radius | rounded-none or rounded-sm                 |
| Border width  | border (1px)                               |
| Border color  | border-zinc-200 / dark:border-zinc-800     |
| Shadow        | none                                       |

---

### Interaction

| State        | Value                                                                 |
|--------------|-----------------------------------------------------------------------|
| Hover (bg)   | hover:bg-zinc-100 / dark:hover:bg-zinc-800                           |
| Hover (text) | hover:text-zinc-600                                                  |
| Focus ring   | focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 |
| Transition   | transition-colors duration-150                                       |
| Active       | active:bg-zinc-200                                                   |

**Rule:**  
No scale, translate, or transform effects.

---

## Rules

### ✅ Do

- Use generous white space as a design element  
- Use zinc scale exclusively for neutrals  
- Separate sections with space, not dividers  
- Use line-style icons (stroke, not fill)  
- Keep a single level of visual hierarchy per component  
- Prefer border over shadows for surface separation  

### ❌ Never

- Decorative shadows (\`shadow-*\`)  
- Gradients (\`bg-gradient-*\`)  
- Vibrant or saturated colors  
- Large border radius (\`rounded-lg\` or above)  
- \`font-bold\` or \`font-semibold\`  
- Filled or colorful icons  
- Animations beyond \`transition-colors\`  
- More than 2 font sizes in a single component  

---

## Iconography

- **Style:** outline / stroke  
- **Stroke width:** 1 or 1.5 (never 2+)  
- **Size:** size-4 or size-5  
- **Color:** inherits from text (\`currentColor\`)  

---

## Tone

Cold. Precise. Confident through restraint.  
The absence of decoration is the statement.
`