/// <mls fileReference="_102020_/l2/aura/molecules/skills/moleculeGeneration.ts" enhancement="_blank"/>

export const skill = `# Molecule Generation Skill

> Skill for generating UI Molecule components in the Collab system.

---


## 1. Metadata

| Field       | Value                                                           |
|-------------|-----------------------------------------------------------------|
| **Name**    | moleculeGeneration                                              |
| **Version** | 2.7.0                                                           |
| **Category**| ui-generation                                                   |

---

## 2. Core Principles

Molecules are **UI-first** components that follow these rules:

| Principle              | Description                                                      |
|------------------------|------------------------------------------------------------------|
| **No Business Logic**  | Molecules do NOT contain business logic                          |
| **No Shadow DOM**      | Molecules do NOT use Shadow Root                                 |
| **Independence**       | Molecules must function independently                            |
| **Data Flow**          | Data flows DOWN from Organisms via properties; events flow UP    |
| **Slot Tags**          | Use Slot Tags (unknown HTML elements) for internal structure     |
| **Contract-Based**     | Each molecule belongs to a Skill Group with a defined contract   |
| **Interchangeable**    | Molecules in the same group can be swapped without breaking      |

---

## 3. Naming Conventions


### Class Name
\`\`\`
PascalCase + Molecule
\`\`\`
**Example:** \`SelectMolecule\`

---

## 4. Import Structure

\`\`\`typescript

// Lit core (templating)
import { html, nothing, svg, TemplateResult } from 'lit';
// Lit decorators
import { customElement, state, property } from 'lit/decorators.js';
// Lit directives — each directive has its OWN module; NEVER import from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// Data Binding decorators
import { propertyDataSource, propertyCompositeDataSource } from '/_102029_/l2/collabDecorators.js';

// Base Class
import { MoleculeAuraElement } from '/_102033_/l2/moleculeBase.js';
\`\`\`

> Import only what you actually use, but **always from the correct module**. The two most common mistakes are using \`@state()\` without importing \`state\`, and importing \`unsafeHTML\` from \`'lit'\` (it is a directive — wrong module).

### Symbol → module reference

| Symbol(s) | Module |
|-----------|--------|
| \`html\`, \`nothing\`, \`svg\`, \`TemplateResult\` | \`'lit'\` |
| \`customElement\`, \`state\`, \`property\` | \`'lit/decorators.js'\` |
| \`unsafeHTML\` | \`'lit/directives/unsafe-html.js'\` |
| \`propertyDataSource\`, \`propertyCompositeDataSource\` | \`'/_102029_/l2/collabDecorators.js'\` |
| \`MoleculeAuraElement\` | \`'/_102033_/l2/moleculeBase.js'\` |

**Rule:** every decorator (\`@state\`, \`@customElement\`, \`@property\`, \`@propertyDataSource\`) and directive (\`unsafeHTML\`) you use MUST appear in the imports, from the module above.


> **Note:** Do NOT import \`classMap\`. Use template strings for CSS classes instead (see Section 7).

---


## 5. Property Decorators

### \`@propertyDataSource\`
Binds the property to a **single dynamic state**.

> ⚠️ **Contract — this is a TWO-WAY binding, not a plain field.**
> When bound to \`{{...}}\`, \`@propertyDataSource\` behaves differently from \`@property\`/\`@state\`:
> - **getter** resolves the value **live** from \`getState(stateKey)\` — reading \`this.prop\` always returns the current state value. Syncing it by assignment is **redundant**.
> - **setter** (when the attribute is \`{{...}}\`) **writes back** to global state via \`setState(stateKey, value)\`. So assigning \`this.prop = ...\` has a **side effect**: it fires an ICA notification to all subscribers.
>
> **Rule:** never reassign a \`@propertyDataSource\` inside \`handleIcaStateChange\` (see §11) — it re-fires \`setState\` and causes an **infinite render loop**.

\`\`\`typescript
@propertyDataSource({ type: String })
value: string | undefined;
\`\`\`
**Binding:** \`{{page1.selectedId}}\`

> ⚠️ **Rule — bound props can be \`undefined\`: every formatter/derivation must tolerate it.**
> When the attribute is \`{{...}}\` and the state key does not exist yet (page still seeding,
> key never set), the getter returns \`undefined\` — the field's declared default (\`value = ''\`)
> does NOT apply. Any member access on it (\`.replace\`, \`.length\`, \`.toFixed\`, \`.map\`, ...)
> throws during \`render\`/\`updated\`/\`firstUpdated\` and leaves the component blank.
> Normalize at the entry point of the formatting/derivation chain:
>
> \`\`\`typescript
> // string formatters — normalize the input
> private formatCpf(raw: string): string {
>   const digits = String(raw ?? '').replace(/\\D/g, '');
>   ...
> }
>
> // number/object props — bail out explicitly (canonical example: ml-number-input)
> this.rawValue = this.value === null || this.value === undefined
>   ? ''
>   : this.formatToDisplay(this.value);
>
> // array props
> if (!Array.isArray(this.value)) return;
> \`\`\`

---

### \`@propertyCompositeDataSource\`
Binds the property to **multiple composed states**.

\`\`\`typescript
@propertyCompositeDataSource({ type: String }) 
label: string = '';
\`\`\`
**Binding:** \`Hello {{page1.userId}} - {{page1.userName}}\`

### Attribute mapping (important for non-string types)

All properties with **camelCase names** (more than one word) and type \`Boolean\`, \`Number\`, or \`Object\` **must** declare the \`attribute\` explicitly in kebab-case to ensure correct attribute reflection across all environments.

\`\`\`typescript
@propertyDataSource({ type: Boolean, attribute: 'is-editing' })
isEditing: boolean = false;

@propertyDataSource({ type: Number, attribute: 'max-length' })
maxLength: number | null = null;

@propertyDataSource({ type: Number, attribute: 'min-duration-minutes' })
minDurationMinutes: number = 0;
\`\`\`

Rule: \`camelCase\` property name → \`kebab-case\` attribute name, always.

Single-word properties of any type can omit the \`attribute\` field.

---

### \`@state\`
**Internal** reactive state (not exposed as an attribute).

\`\`\`typescript
@state() 
private isOpen = false;
\`\`\`

---

## 6. Slot Tags

### What are Slot Tags?

Slot Tags are **unknown HTML elements** that define the molecule's internal structure. The user writes them declaratively, and the molecule reads and interprets them.

\`\`\`html
<molecules--ml-example attr1="a">
  <SlotTagExampe></SlotTagExampe>
  <SlotTagExampe2></SlotTagExampe2>
  
</molecules--ml-example>
\`\`\`

### Defining Slot Tags
Each molecule must declare which Slot Tags it uses. Use ONLY the tags defined in the group contract. Do NOT create new tags.

\`\`\`typescript
slotTags = ['Trigger', 'Value', 'Content', 'Group', 'Item', 'Empty'];
\`\`\`

The base class automatically hides these tags so they don't appear on screen.

### Reading Slot Tags

Use the helper methods from \`MoleculeAuraElement\`:

| Method | Returns | Description |
|--------|---------|-------------|
| \`getSlot(tag)\` | \`Element \\| null\` | Single slot tag element |
| \`getSlots(tag)\` | \`Element[]\` | All elements of a slot tag |
| \`getSlotAttr(tag, attr)\` | \`string \\| null\` | Attribute value from a slot tag |
| \`getSlotContent(tag)\` | \`string\` | innerHTML of a slot tag |
| \`hasSlot(tag)\` | \`boolean\` | Check if slot tag exists |

---

## 7. Naming Rules

### Do NOT use \`protected\` or \`override\` in herdeded functions

All methods and properties should be \`private\` or without access modifier:

\`\`\`typescript
// ❌ WRONG
protected firstUpdated() { }
protected override updated() { }

// ✅ CORRECT

firstUpdated() {
  // ...
}

private handleSelect(value: string) {
  // ...
}
\`\`\`

### Reserved Method Names - Do NOT Use

These names are used by Lit internally. Using them for other purposes will cause errors:

| Reserved Name | Reason |
|---------------|--------|
| \`renderOptions\` | Lit internal |
| \`renderRoot\` | Lit internal |
| \`createRenderRoot\` | Lit internal |
| \`connectedCallback\` | Lifecycle (use only for override) |
| \`disconnectedCallback\` | Lifecycle (use only for override) |
| \`attributeChangedCallback\` | Lifecycle (use only for override) |
| \`requestUpdate\` | Lit internal |
| \`performUpdate\` | Lit internal |
| \`shouldUpdate\` | Lit internal |
| \`willUpdate\` | Lit internal |
| \`update\` | Lit internal |
| \`updated\` | Lifecycle (use only for override) |
| \`firstUpdated\` | Lifecycle (use only for override) |

### Use descriptive prefixes for custom methods

\`\`\`typescript
// ❌ WRONG - may conflict with Lit
renderOptions() { }
updateValue() { }

// ✅ CORRECT - clear custom method names
renderItemList() { }
renderDropdownContent() { }
renderTriggerButton() { }
handleValueChange() { }
onItemSelect() { }
\`\`\`

---

## 8. CSS Classes Pattern

### Do NOT use \`classMap\` with multiple classes

The \`classMap\` directive expects **one class per key**. Using multiple classes as a key causes errors:

\`\`\`typescript
// ❌ WRONG - causes DOMTokenList error
classMap({
  'border-slate-300 bg-white': !isSelected,  // Multiple classes as key
})

// ❌ WRONG - same problem with variable
const base = 'w-full rounded-md px-3 py-2';
classMap({
  [base]: true,  // Multiple classes as key
})
\`\`\`

### Use template strings instead

Build CSS classes using arrays and \`join()\`:

\`\`\`typescript
// ✅ CORRECT - template strings with semantic ml-* classes
const classes = [
  // Layout classes (Tailwind)
  'w-full px-3 py-2 text-sm',
  // Semantic class (visual styling via .less)
  'ml-input-container',
  // Conditional semantic classes
  this.error ? 'ml-input-container-error' : '',
  // State
  disabled ? 'ml-disabled' : 'cursor-pointer',
].filter(Boolean).join(' ');

return html\\\`<div class=\\\${classes}>...</div>\\\`;
\`\`\`

### cn() — class merge utility

Import \`cn\` from the project's molecules directory. Use it to merge component classes with consumer-provided classes:

\`\`\`typescript
import { cn } from '/_102033_/l2/cn.js';
\`\`\`

The base class \`MoleculeAuraElement\` provides:
- **\`this.cssClass\`** — reads the \`data-class\` attribute from the host element
- **\`this.getSlotClass(tag)\`** — reads the \`data-class\` attribute from a slot tag

Apply \`cn()\` on the root element and on slot wrappers:

\`\`\`typescript
// Root element — merge with consumer's data-class
return html\\\`<button class="\\\${cn(this.getButtonClasses(), this.cssClass)}">...</button>\\\`;

// Slot wrapper — merge with consumer's slot data-class
return html\\\`<div class="\\\${cn('mb-2 text-sm ml-label', this.getSlotClass('Label'))}">
  \\\${unsafeHTML(this.getSlotContent('Label'))}
</div>\\\`;
\`\`\`

Consumer usage:
\`\`\`html
<my-component data-class="w-full mt-4">
  <Label data-class="uppercase tracking-wide">Text</Label>
</my-component>
\`\`\`

### Pattern for complex states

\`\`\`typescript
private getItemClasses(item: ParsedItem, isSelected: boolean): string {
  return [
    // Layout (Tailwind)
    'w-full px-3 py-2 text-sm',
    // Semantic classes (visual via .less)
    'ml-item',
    isSelected ? 'ml-item-selected' : '',
    // State
    item.disabled ? 'ml-disabled' : '',
  ].filter(Boolean).join(' ');
}
\`\`\`

---
## 9. Using \`nothing\` Correctly

### Understanding Lit's \`nothing\`

The \`nothing\` sentinel from Lit is **NOT** a \`TemplateResult\`. It has its own type: \`typeof nothing\`.

**Type definitions:**
- \`TemplateResult\` — returned by \`html\` tagged template
- \`typeof nothing\` — the type of the \`nothing\` constant

### Do NOT return \`nothing\` directly from methods typed as \`TemplateResult\`

Solution 1: Wrap\`nothing\` in \`html\` template


---

## 10. Rendering Slot Tag Content

Slot Tag content may contain HTML. To render it properly, use \`unsafeHTML\` directive.

### Do NOT use dynamic template strings

\`\`\`typescript
// ❌ WRONG - causes "invalid template strings array" error
html([content] as unknown as TemplateStringsArray)

// ❌ WRONG - same error
html(content)

// ❌ WRONG - HTML will be escaped, not rendered
const content = '<strong>Bold</strong>';
html\\\`\\\${content}\\\`  // Outputs: "<strong>Bold</strong>" as text
\`\`\`

### Use \`unsafeHTML\` for Slot Tag content

\`unsafeHTML\` is a Lit **directive** — import it from its own module (NEVER from \`'lit'\`):

\`\`\`typescript
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
\`\`\`

\`\`\`typescript

// ✅ CORRECT - HTML is rendered properly
private renderItem(item: ParsedItem): TemplateResult {
  return html\\\`
    <div class="item">
      \\\${unsafeHTML(item.label)}
    </div>
  \\\`;
}

// ✅ CORRECT - with fallback
private renderEmpty(): TemplateResult {
  const content = this.getSlotContent('Empty') || this.msg.noResults;
  return html\\\`
    <div class="text-slate-500 dark:text-slate-400">
      \\\${unsafeHTML(content)}
    </div>
  \\\`;
}
\`\`\`

### When to use each approach

| Content Type | Approach | Example |
|--------------|----------|---------|
| Plain text (i18n messages) | Direct interpolation | \`\\\${this.msg.loading}\` |
| Slot Tag content (may have HTML) | \`unsafeHTML\` | \`\\\${unsafeHTML(item.label)}\` |
| User input (untrusted) | Never render as HTML | Always escape |

> **Note:** Slot Tag content comes from the developer (trusted), so \`unsafeHTML\` is safe to use.

\`\`\`typescript
/// **collab_i18n_start**
const message_en = {
  placeholder: 'Select an option',
  noResults: 'No results found',
  loading: 'Loading...',
};
type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    placeholder: 'Selecione uma opção',
    noResults: 'Nenhum resultado encontrado',
    loading: 'Carregando...',
  },
};
/// **collab_i18n_end**
\`\`\`

### Usage
\`\`\`typescript
render() {
  const lang = this.getMessageKey(messages);
  this.msg = messages[lang];
  
  return html\\\`\\\${this.msg.placeholder}\\\`;
}
\`\`\`

---

## 11. Derived State and \`handleIcaStateChange\`

### The Problem

When a property is bound to a state via \`@propertyDataSource\`, and you have a **derived value** (a value computed from that property), the derived value won't automatically update when the state changes externally.

**Example:** In an \`enter-money\` component:
- \`value\` is bound to state: \`value="{{playground.basic.value}}"\`
- \`rawValue\` is derived from \`value\`: \`this.rawValue = this.formatNumberToRaw(this.value)\`
- When state changes externally, \`value\` updates but \`rawValue\` does NOT recalculate

### Why It Happens

The \`@propertyDataSource\` decorator updates the property value when state changes, but it doesn't trigger Lit's \`willUpdate\` or \`updated\` lifecycle hooks automatically.

### The Solution: \`handleIcaStateChange\`

Override \`handleIcaStateChange\` to recalculate derived values when state changes:

\`\`\`typescript
// ===========================================================================
// STATE CHANGE HANDLER
// ===========================================================================

handleIcaStateChange(key: string, value: any) {
  // Check if this state key is bound to 'value' property
  const valueAttr = this.getAttribute('value');
  if (valueAttr === \\\`{{\\\${key}}}\\\`) {
    // Recalculate derived value
    this.rawValue = this.formatNumberToRaw(value);
  }
  
  // Always request update to re-render
  this.requestUpdate();
}
\`\`\`

> ⚠️ **Critical rule:** inside \`handleIcaStateChange\`, only assign to **derived** \`@state()\`. **Never** reassign a \`@propertyDataSource\` property (e.g. \`this.value = ...\`, \`this.isEditing = ...\`): its setter calls \`setState\`, which re-notifies and **re-enters this handler → infinite loop**. The value is already synced by the getter (reads from \`getState\`), so the assignment is redundant as well as dangerous.
>
> The base implementation (\`StateLitElement.handleIcaStateChange\`, in \`/_102029_/l2/stateLitElement.js\`) already syncs the property and has an equality guard (\`isEqual\`) that breaks re-entrancy. When overriding, **keep the handler side-effect-light** (recalculate a derived value and/or propagate) — do not redo the base's work.

### Case: propagation to children (no derived value)

When the handler only needs to **propagate** a state to child components (e.g. \`is-editing\` in a table), do NOT assign the property — just propagate. The \`value\` parameter is intentionally unused; read \`this.prop\` (already updated by the getter):

\`\`\`typescript
handleIcaStateChange(key: string, value: any) {
  const isEditingAttr = this.getAttribute('is-editing');
  if (isEditingAttr === \`{{\${key}}}\`) {
    this.propagateEditing();   // propagate only; NEVER do this.isEditing = ...
  }
  this.requestUpdate();
}
\`\`\`

To also react to a direct Lit binding (\`.is-editing=\${...}\`), combine with \`firstUpdated()\` + \`updated(changedProps)\` (see §11-B).

### When to Use

Use \`handleIcaStateChange\` when your molecule has:

| Situation | Example | Action |
|-----------|---------|--------|
| Derived/computed values | \`rawValue\` from \`value\` | Recalculate in handler |
| Formatted display values | \`displayText\` from \`value\` | Recalculate in handler |
| Internal state that depends on props | \`isOpen\` (must be \`@state\`) based on \`value\` | Update in handler — **only if the target is \`@state\`, NEVER a \`@propertyDataSource\`** |

### When NOT to Use

Do NOT use \`handleIcaStateChange\` for:

| Situation | Why |
|-----------|-----|
| Simple property → render | Lit handles this automatically |
| No derived values | No need for the handler |
| Business logic | Molecules should NOT have business logic |

### Complete Example

\`\`\`typescript
@customElement('groupxxxyyy--enter-money')
export class EnterMoneyMolecule extends MoleculeAuraElement {

  // Property bound to state
  @propertyDataSource({ type: Number }) 
  value: number | null = null;

  // Derived value (formatted for input display)
  @state()
  private rawValue: string = '';

  // ===========================================================================
  // STATE CHANGE HANDLER
  // ===========================================================================

  handleIcaStateChange(key: string, value: any) {
    // Check if 'value' property changed
    const valueAttr = this.getAttribute('value');
    if (valueAttr === \\\`{{\\\${key}}}\\\`) {
      this.rawValue = this.formatNumberToRaw(value);
    }
    
    this.requestUpdate();
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private formatNumberToRaw(num: number | null): string {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

  private parseRawToNumber(raw: string): number | null {
    const cleaned = raw.replace(/\\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  render() {
    return html\\\`
      <input 
        type="text"
        .value=\\\${this.rawValue}
        @input=\\\${this.handleInput}
      />
    \\\`;
  }

  private handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.rawValue = input.value;
    this.value = this.parseRawToNumber(input.value);
  }
}
\`\`\`

### Multiple Derived Values

If you have multiple properties with derived values:

\`\`\`typescript
handleIcaStateChange(key: string, value: any) {
  // Check each property that might have derived values
  const valueAttr = this.getAttribute('value');
  const minAttr = this.getAttribute('min');
  const maxAttr = this.getAttribute('max');
  
  if (valueAttr === \\\`{{\\\${key}}}\\\`) {
    this.rawValue = this.formatNumberToRaw(value);
  }
  
  if (minAttr === \\\`{{\\\${key}}}\\\`) {
    this.minDisplay = this.formatNumberToRaw(value);
  }
  
  if (maxAttr === \\\`{{\\\${key}}}\\\`) {
    this.maxDisplay = this.formatNumberToRaw(value);
  }
  
  this.requestUpdate();
}
\`\`\`

### 11-B. Supplement: \`updated()\` for Lit property bindings

\`handleIcaStateChange\` only covers ICA bindings (\`value="{{key}}"\`). For direct Lit bindings (\`.value=\${...}\`), use \`updated(changedProps)\`:

\`\`\`typescript
updated(changedProps: Map<string, unknown>) {
  if (changedProps.has('value')) {
    this.rawValue = this.value === null || this.value === undefined
      ? ''
      : this.formatNumberToRaw(this.value);
  }
}
\`\`\`

#### Guard against overwriting while typing

For inputs where the user may be typing, use a guard that avoids overwriting internal state if \`rawValue\` already represents the current \`value\`:

\`\`\`typescript
updated(changedProps: Map<string, unknown>) {
  if (changedProps.has('value')) {
    if (this.value === null || this.value === undefined) {
      this.rawValue = '';
    } else {
      const parsed = this.parseRawToNumber(this.rawValue);
      if (parsed !== this.value) {
        this.rawValue = this.formatNumberToRaw(this.value);
      }
    }
  }
}
\`\`\`

#### Rule: use BOTH when you have derived state

| Binding | Sync mechanism |
|---|---|
| \`value="{{state.key}}"\` (ICA) | \`handleIcaStateChange\` |
| \`.value=\${this.prop}\` (Lit property) | \`updated(changedProps)\` |

Molecules that accept both binding types must implement **both mechanisms**.

#### Checklist before finishing the molecule

- [ ] Does the molecule have any \`@state()\` derived from a \`@propertyDataSource\`?
  - **Yes** → implement \`handleIcaStateChange\` + \`updated(changedProps)\`
  - **No** → neither is needed
- [ ] Does the molecule need to **propagate** state to child components (e.g. \`is-editing\`)?
  - **Yes** → a handler that **only** calls \`propagate...()\` + \`firstUpdated()\`/\`updated()\`; **never** reassign the bound property
- [ ] In \`handleIcaStateChange\`, I confirmed that I do **not** assign to any \`@propertyDataSource\` property (only to derived \`@state\`)
- [ ] Every decorator (\`@customElement\`, \`@state\`, \`@property\`, \`@propertyDataSource\`) and directive (\`unsafeHTML\`) I use is imported, from the correct module (see §4)

---

## 12. Design System — Styling via Tokens

Molecules MUST use CSS custom properties (design tokens) for all visual styling. Colors, borders, typography, radius, shadows, and focus are defined in the component's \`.less\` file using \`var(--ml-*, fallback)\`. The \`.ts\` file uses semantic \`ml-*\` CSS classes — never hardcoded Tailwind color classes.

### Rules

1. **Never use hardcoded Tailwind color classes** — no \`bg-sky-600\`, \`text-slate-700\`, \`border-red-500\`, etc.
2. **Never use \`dark:\` variant classes** — dark mode is handled via token override by the consuming project.
3. **Use semantic \`ml-*\` classes in the .ts** — these classes are defined in the component's \`.less\` file.
4. **Tailwind is ONLY for layout and animation** — \`flex\`, \`grid\`, \`gap\`, \`p-\`, \`m-\`, \`w-\`, \`h-\`, \`items-center\`, \`animate-spin\`, \`transition-all\`, \`duration-200\`, etc.
5. **All visual styling goes in the .less file** using \`var(--ml-*, fallback)\`.
6. **Every \`var()\` MUST have a concrete fallback** so the component renders without external configuration.

### Token vocabulary

| Category | Token | Fallback | Purpose |
|----------|-------|----------|---------|
| Surface | \`--ml-surface\` | \`#ffffff\` | Component background |
| | \`--ml-surface-dim\` | \`#f5f5f5\` | Secondary background, hover |
| Text | \`--ml-on-surface\` | \`#1c1b1f\` | Primary text |
| | \`--ml-on-surface-muted\` | \`#49454f\` | Secondary text, labels |
| | \`--ml-on-surface-faint\` | \`#79747e\` | Placeholder, tertiary text |
| Action | \`--ml-primary\` | \`#3b82f6\` | Primary action color |
| | \`--ml-on-primary\` | \`#ffffff\` | Text on primary |
| Feedback | \`--ml-error\` | \`#ef4444\` | Error color |
| | \`--ml-on-error\` | \`#ffffff\` | Text on error |
| | \`--ml-success\` | \`#22c55e\` | Success color |
| Border | \`--ml-outline-variant\` | \`#e2e8f0\` | Default border |
| | \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| | \`--ml-outline-error\` | \`#ef4444\` | Error border |
| Shape | \`--ml-radius-sm\` | \`6px\` | Inputs, buttons |
| | \`--ml-radius-md\` | \`8px\` | Cards |
| | \`--ml-radius-lg\` | \`12px\` | Modals |
| | \`--ml-radius-full\` | \`9999px\` | Circular (toggle, avatar) |
| Elevation | \`--ml-shadow-0\` | \`none\` | No shadow |
| | \`--ml-shadow-1\` | \`0 1px 3px rgba(0,0,0,0.1)\` | Subtle |
| | \`--ml-shadow-2\` | \`0 4px 6px rgba(0,0,0,0.1)\` | Medium |
| Typography | \`--ml-font-family\` | \`system-ui, -apple-system, sans-serif\` | Font |
| | \`--ml-font-weight-medium\` | \`500\` | Medium weight |
| Border | \`--ml-border-width\` | \`1px\` | Border thickness |
| | \`--ml-border-style\` | \`solid\` | Border style |
| Motion | \`--ml-transition\` | \`200ms ease\` | Default transition |
| Focus | \`--ml-focus-ring-color\` | \`rgba(59,130,246,0.4)\` | Focus ring color |
| | \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| State | \`--ml-disabled-opacity\` | \`0.5\` | Disabled opacity |

### Shared semantic classes (available to all groups)

These classes appear across multiple groups. Their styling is defined in each component's \`.less\`:

| Class | Purpose |
|-------|---------|
| \`ml-label\` | Field labels |
| \`ml-helper\` | Helper text below fields |
| \`ml-error-text\` | Error messages |
| \`ml-text\` | Default text |
| \`ml-text-muted\` | Secondary text |
| \`ml-text-faint\` | Tertiary text, placeholder |
| \`ml-disabled\` | Disabled state (opacity + cursor) |
| \`ml-skeleton\` | Loading placeholder |
| \`ml-spinner\` | Loading spinner |

### Example — .ts file (semantic classes only)

\`\`\`typescript
private getContainerClasses(): string {
  return [
    // Layout (Tailwind)
    'relative flex w-full items-center gap-2 py-2 px-3',
    // Visual (semantic — defined in .less)
    'ml-input-container',
    this.error ? 'ml-input-container-error' : '',
    this.disabled ? 'ml-disabled' : 'cursor-text',
  ].filter(Boolean).join(' ');
}
\`\`\`

### Example — .less file (tokens with fallbacks)

\`\`\`less
my-component-tag {

  .ml-input-container {
    background: var(--ml-surface, #ffffff);
    border: var(--ml-border-width, 1px) var(--ml-border-style, solid) var(--ml-outline-variant, #e2e8f0);
    border-radius: var(--ml-radius-sm, 6px);
    transition: border-color var(--ml-transition, 200ms ease), box-shadow var(--ml-transition, 200ms ease);
    &:focus-within {
      border-color: var(--ml-outline-focus, #3b82f6);
      box-shadow: 0 0 0 var(--ml-focus-ring-width, 2px) var(--ml-focus-ring-color, rgba(59, 130, 246, 0.4));
    }
  }

  .ml-input-container-error {
    border-color: var(--ml-outline-error, #ef4444) !important;
  }

  .ml-label {
    font-family: var(--ml-font-family, system-ui, -apple-system, sans-serif);
    font-weight: var(--ml-font-weight-medium, 500);
    color: var(--ml-on-surface, #1c1b1f);
  }

  .ml-error-text {
    color: var(--ml-error, #ef4444);
    font-family: var(--ml-font-family, system-ui, -apple-system, sans-serif);
  }

  .ml-disabled {
    opacity: var(--ml-disabled-opacity, 0.5);
    cursor: not-allowed;
    pointer-events: none;
  }

}
\`\`\`

### Example — feedback rendering

\`\`\`typescript
private renderFeedback(): TemplateResult {
  if (this.error) {
    return html\\\`<p class="\\\${cn('mt-1 text-xs ml-error-text')}">\\\${unsafeHTML(String(this.error))}</p>\\\`;
  }
  if (this.hasSlot('Helper')) {
    return html\\\`<p class="\\\${cn('mt-1 text-xs ml-helper', this.getSlotClass('Helper'))}">\\\${unsafeHTML(this.getSlotContent('Helper'))}</p>\\\`;
  }
  return html\\\`\\\`;
}
\`\`\`

---

13. ## SVG Rendering

When rendering SVG elements inside a Lit template, use the \`svg\` tagged template for all elements **inside** the \`<svg>\` tag. The outer \`<svg>\` element stays inside \`html\`.

### Import

\`\`\`typescript
import { html, svg, TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
\`\`\`

### Usage

\`\`\`typescript
// ❌ WRONG — SVG children inside html\`\` are created in HTML namespace
render() {
  return html\`
    <svg viewBox="0 0 100 100">
      \${items.map(item => html\`
        <circle cx="\${item.x}" cy="\${item.y}" r="5" fill="\${item.color}"></circle>
      \`)}
    </svg>
  \`;
}

// ✅ CORRECT — SVG children use svg\`\` for proper SVG namespace
render() {
  return html\`
    <svg viewBox="0 0 100 100">
      \${items.map(item => svg\`
        <circle cx="\${item.x}" cy="\${item.y}" r="5" fill="\${item.color}"></circle>
      \`)}
    </svg>
  \`;
}
\`\`\`

### Rule

- \`html\`\`\` → for the outer \`<svg>\` and all non-SVG elements
- \`svg\`\`\` → for everything **inside** the \`<svg>\` (path, g, circle, text, rect, line, etc.)
- Without this, the browser creates HTMLUnknownElement instead of SVGElement and nothing renders visually

## 14. Component Template

\`\`\`typescript
/// <mls fileReference="[file-reference]" enhancement="_102020_/l2/enhancementAura"/>

// =============================================================================
// [COMPONENT NAME] MOLECULE
// =============================================================================
// Skill Group: [group-name] (e.g., select + one)
// This molecule does NOT contain business logic.

import { html, nothing, TemplateResult } from 'lit';                 // add svg only if rendering SVG
import { customElement, state } from 'lit/decorators.js';            // state only if you declare @state()
import { unsafeHTML } from 'lit/directives/unsafe-html.js';          // only if rendering Slot Tag HTML
import { propertyDataSource } from '/_102029_/l2/collabDecorators.js';
import { MoleculeAuraElement } from '/_102033_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  placeholder: 'Select an option',
  noResults: 'No results found',
  loading: 'Loading...',
};
type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
  en: message_en,
};
/// **collab_i18n_end**

@customElement('groupname--[component-name]')
export class [ComponentName]Molecule extends MoleculeAuraElement {

  private msg: MessageType = messages.en;

  // ===========================================================================
  // SLOT TAGS
  // ===========================================================================

  slotTags = ['Trigger', 'Value', 'Content', 'Group', 'Item', 'Empty'];

  // ===========================================================================
  // PROPERTIES — From Contract
  // ===========================================================================
  
  @propertyDataSource({ type: String }) 
  value: string | null = null;

  @property({ type: Boolean }) 
  disabled = false;

  @property({ type: Boolean }) 
  readonly = false;

  @property({ type: Boolean }) 
  loading = false;

  @property({ type: Boolean }) 
  required = false;

  @property({ type: String }) 
  error: string | boolean = false;

  @property({ type: String }) 
  name = '';

  // ===========================================================================
  // INTERNAL STATE
  // ===========================================================================
  
  @state() 
  private isOpen = false;

  // ===========================================================================
  // STATE CHANGE HANDLER — only if molecule has derived @state() (see section 11)
  // ===========================================================================

  // handleIcaStateChange(key: string, value: any) {
  //   const valueAttr = this.getAttribute('value');
  //   if (valueAttr === \\\`{{\\\${key}}}\\\`) {
  //     this.derivedState = this.computeFromValue(value);
  //   }
  //   this.requestUpdate();
  // }

  // updated(changedProps: Map<string, unknown>) {
  //   if (changedProps.has('value')) {
  //     this.derivedState = !this.value ? defaultValue : this.computeFromValue(this.value);
  //   }
  // }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================
  
  private handleSelect(value: string) {
    if (this.disabled || this.readonly) return;

    this.value = value;
    this.isOpen = false;
    
    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      composed: true,
      detail: { value }
    }));
  }

  private handleBlur() {
    this.dispatchEvent(new CustomEvent('blur', {
      bubbles: true,
      composed: true,
    }));
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  
  render() {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    if (this.loading) {
      return html\\\`<div class="loading">\\\${this.msg.loading}</div>\\\`;
    }

    const placeholder = this.getSlotAttr('Value', 'placeholder') || this.msg.placeholder;

    return html\\\`
        /// Implementation here
    \\\`;
  }
}
\`\`\`

---

## 15. Skill Groups

Each molecule belongs to a **Skill Group** that defines its contract:

The contract defines:
- **Properties** (value, disabled, etc.)
- **Events** (change, blur, etc.)
- **Slot Tags** (Trigger, Content, Item, etc.)
- **Validation Rules**

---


## 16. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial skill definition |
| 2.0.0 | 04/01/2026 | Added Slot Tags system, contracts, interchangeability |
| 2.1.0 | 04/02/2026 | Replaced classMap with template strings pattern for CSS classes |
| 2.2.0 | 04/02/2026 | Added unsafeHTML for rendering Slot Tag content |
| 2.3.0 | 04/02/2026 | Added naming rules: no protected/override, reserved method names |
| 2.4.0 | 04/13/2026 | Added section 9: correct usage of \`nothing\` with proper return types |
| 2.5.0 | 04/16/2026 | Added section 11: handleIcaStateChange for derived values |
| 2.6.0 | 04/22/2026 | Added section 12: dark mode — semantic color pairs and required dark: variants |
| 2.7.0 | 06/11/2026 | Added section 11-B: \`updated()\` for Lit property bindings; updated section 14 template with both sync mechanisms |
| 2.8.0 | 06/15/2026 | §5/§11: documented \`@propertyDataSource\` as a two-way binding; anti-loop rule (no reassigning inside \`handleIcaStateChange\`); propagation-only pattern for children |
| 2.9.0 | 06/15/2026 | §4: explicit imports + symbol→module table (\`state\`, \`unsafeHTML\`); fixed wrong \`unsafeHTML\` import in §13; added correct import in §8 and §14 skeleton; import-completeness checklist item; removed invalid \`@@state\`/\`@state({ type })\` block |
`