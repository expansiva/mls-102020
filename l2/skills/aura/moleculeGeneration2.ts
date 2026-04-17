/// <mls fileReference="_102020_/l2/skills/aura/moleculeGeneration2.ts" enhancement="_blank"/>

export const skill = `# Molecule Generation Skill

> Skill for generating UI Molecule components in the Collab system.

---

## 1. Metadata

| Field       | Value                                                           |
|-------------|-----------------------------------------------------------------|
| **Name**    | moleculeGeneration                                              |
| **Version** | 2.5.0                                                           |
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

### Tag Name (Custom Element)
\`\`\`
kebab-case(folder)--kebab-case(component)-(projectId)
\`\`\`
**Example:** folder/subfolder/molecule1 => 'folder--subfolder--molecule1-102020'

### Class Name
\`\`\`
PascalCase + Molecule
\`\`\`
**Example:** \`SelectMolecule\`

### File Name
\`\`\`
camelCase.ts
\`\`\`
**Example:** \`selectMolecule.ts\`

---

## 4. Import Structure

\`\`\`typescript
// Lit and directives — ALWAYS from 'lit'
import {
    html,
    TemplateResult,
    ifDefined,
    nothing,
    unsafeHTML,
    ...
} from 'lit';

// Lit decorators
import { customElement, property, state } from 'lit/decorators.js';

// Data Binding decorators
import { propertyDataSource, propertyCompositeDataSource } from '/_102027_/l2/collabDecorators';

// Base Class
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';
\`\`\`

### Import Rules — CRITICAL

\`\`\`typescript
// ❌ WRONG — Do NOT import directives from separate paths
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';

// ✅ CORRECT — Import ALL directives from 'lit'
import { html, nothing, unsafeHTML, ifDefined, repeat } from 'lit';
\`\`\`

> **Note:** Do NOT import \`classMap\`. Use template strings for CSS classes instead (see Section 7).

---


## 5. Property Decorators

### \`@propertyDataSource\`
Binds the property to a **single dynamic state**.

\`\`\`typescript
@propertyDataSource({ type: String }) 
value: string | undefined;
\`\`\`
**Binding:** \`{{page1.selectedId}}\`

---

### \`@propertyCompositeDataSource\`
Binds the property to **multiple composed states**.

\`\`\`typescript
@propertyCompositeDataSource({ type: String }) 
label: string = '';
\`\`\`
**Binding:** \`Hello {{page1.userId}} - {{page1.userName}}\`

---

### \`@@state\`
Standard Lit state for ** local UI state**.

\`\`\`typescript
@state({ type: Boolean }) 
loading = false;
\`\`\`

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
<molecules--select-102020 value="a">
  <Trigger>
    <Value placeholder="Select..." />
  </Trigger>
  <Content>
    <Group label="Fruits">
      <Item value="apple">Apple</Item>
      <Item value="banana">Banana</Item>
    </Group>
    <Item value="other">Other</Item>
  </Content>
</molecules--select-102020>
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
| \`getItems(selector?)\` | \`ParsedItem[]\` | Parsed items with value, label, disabled |
| \`getGroups(selector?)\` | \`ParsedGroup[]\` | Parsed groups with label and items |
| \`getStandaloneItems(selector?)\` | \`ParsedItem[]\` | Items not inside groups |
| \`findItem(value)\` | \`ParsedItem \\| undefined\` | Find item by value |

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
// ✅ CORRECT - template strings
const classes = [
  // Base classes (always applied)
  'w-full rounded-md px-3 py-2 text-sm border transition',
  // Conditional classes
  isSelected ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white hover:bg-slate-50',
  // State classes
  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
].join(' ');

return html\\\`<button class=\\\${classes}>...</button>\\\`;
\`\`\`

### Pattern for complex states

\`\`\`typescript
private getItemClasses(item: ParsedItem, isSelected: boolean): string {
  return [
    // Base
    'w-full rounded-md px-3 py-2 text-sm border transition',
    // Selection state
    isSelected 
      ? 'border-sky-500 bg-sky-50 text-sky-900' 
      : 'border-slate-200 bg-white text-slate-900',
    // Hover (only when not disabled)
    !item.disabled && !isSelected ? 'hover:bg-slate-50' : '',
    // Disabled state
    item.disabled ? 'opacity-50 cursor-not-allowed' : '',
    // Focus state
    !item.disabled ? 'focus:outline-none focus:ring-2 focus:ring-sky-500' : '',
  ].filter(Boolean).join(' ');
}

render() {
  const items = this.getItems();

  return html\\\`
    \\\${items.map(item => {
      const isSelected = item.value === this.value;
      
      return html\\\`
        <button 
          class=\\\${this.getItemClasses(item, isSelected)}
          @click=\\\${() => this.handleSelect(item.value)}
        >
          \\\${item.label}
        </button>
      \\\`;
    })}
  \\\`;
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
    <div class="text-slate-500">
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

### When to Use

Use \`handleIcaStateChange\` when your molecule has:

| Situation | Example | Action |
|-----------|---------|--------|
| Derived/computed values | \`rawValue\` from \`value\` | Recalculate in handler |
| Formatted display values | \`displayText\` from \`value\` | Recalculate in handler |
| Internal state that depends on props | \`isOpen\` based on \`value\` | Update in handler |

### When NOT to Use

Do NOT use \`handleIcaStateChange\` for:

| Situation | Why |
|-----------|-----|
| Simple property → render | Lit handles this automatically |
| No derived values | No need for the handler |
| Business logic | Molecules should NOT have business logic |

### Complete Example

\`\`\`typescript
@customElement('molecules--enter-money-102020')
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

---

## 12. Component Template

\`\`\`typescript
/// <mls fileReference="[file-reference]" enhancement="_102020_/l2/enhancementAura"/>

// =============================================================================
// [COMPONENT NAME] MOLECULE
// =============================================================================
// Skill Group: [group-name] (e.g., select + one)
// This molecule does NOT contain business logic.

import { html, TemplateResult, classMap, nothing, unsafeHTML } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_102027_/l2/collabDecorators';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';

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

@customElement('molecules--[component-name]-102020')
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
  // STATE CHANGE HANDLER (if needed for derived values)
  // ===========================================================================

  // handleIcaStateChange(key: string, value: any) {
  //   const valueAttr = this.getAttribute('value');
  //   if (valueAttr === \\\`{{\\\${key}}}\\\`) {
  //     // Recalculate derived values here
  //   }
  //   this.requestUpdate();
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
    const items = this.getItems();
    const selectedItem = this.findItem(this.value);

    return html\\\`
      <div class="relative w-full">
        
        <!-- Trigger -->
        <button 
          type="button"
          class="w-full px-4 py-2 text-left border rounded-lg bg-white"
          ?disabled=\\\${this.disabled}
          @click=\\\${() => this.isOpen = !this.isOpen}
          @blur=\\\${this.handleBlur}
        >
          \\\${selectedItem ? selectedItem.label : placeholder}
        </button>

        <!-- Content -->
        \\\${this.isOpen ? html\\\`
          <div class="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
            \\\${items.length > 0 ? items.map(item => html\\\`
              <div 
                class=\\\${classMap({
                  'px-4 py-2 cursor-pointer': true,
                  'hover:bg-gray-100': !item.disabled,
                  'bg-blue-50': item.value === this.value,
                  'opacity-50 cursor-not-allowed': item.disabled,
                })}
                @click=\\\${() => !item.disabled && this.handleSelect(item.value)}
              >
                \\\${item.label}
              </div>
            \`) : html\\\`
              <div class="px-4 py-2 text-gray-500">
                \\\${this.getSlotContent('Empty') || this.msg.noResults}
              </div>
            \\\`}
          </div>
        \\\` : nothing}

      </div>
    \\\`;
  }
}
\`\`\`

---

## 13. Skill Groups

Each molecule belongs to a **Skill Group** that defines its contract:

| Group | Category | Contract File |
|-------|----------|---------------|
| \`select + one\` | Data Entry | \`contract-select-one.md\` |
| \`select + many\` | Data Entry | \`contract-select-many.md\` |
| \`toggle + state\` | Data Entry | \`contract-toggle-state.md\` |
| \`enter + text\` | Data Entry | \`contract-enter-text.md\` |
| \`enter + number\` | Data Entry | \`contract-enter-number.md\` |
| \`enter + money\` | Data Entry | \`contract-enter-money.md\` |

The contract defines:
- **Properties** (value, disabled, etc.)
- **Events** (change, blur, etc.)
- **Slot Tags** (Trigger, Content, Item, etc.)
- **Validation Rules**

---


## 14. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial skill definition |
| 2.0.0 | 04/01/2026 | Added Slot Tags system, contracts, interchangeability |
| 2.1.0 | 04/02/2026 | Replaced classMap with template strings pattern for CSS classes |
| 2.2.0 | 04/02/2026 | Added unsafeHTML for rendering Slot Tag content |
| 2.3.0 | 04/02/2026 | Added naming rules: no protected/override, reserved method names |
| 2.4.0 | 04/13/2026 | Added section 9: correct usage of \`nothing\` with proper return types |
| 2.5.0 | 04/16/2026 | Added section 11: handleIcaStateChange for derived values |
`