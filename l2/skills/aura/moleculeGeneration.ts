/// <mls fileReference="_102020_/l2/skills/aura/moleculeGeneration.ts" enhancement="_blank"/>

export const skill = `


# Molecule Generation Skill

> Skill for generating UI Molecule components in the MLS system.

---

## 1. Metadata

| Field       | Value                                                                 |
|-------------|-----------------------------------------------------------------------|
| **Name**    | \`moleculeGeneration\`                                                  |
| **Version** | \`1.0.0\`                                                               |
| **Category**| \`ui-generation\`                                                       |
| **Triggers**| \`create molecule\`, \`generate ui component\`, \`new component\`, \`build molecule\` |

---

## 2. Core Principles

Molecules are **UI-first** components that follow these rules:

| Principle              | Description                                                      |
|------------------------|------------------------------------------------------------------|
| **No Business Logic**  | Molecules do NOT contain business logic                          |
| **No Shadow DOM**      | Molecules do NOT use Shadow Root                                 |
| **Independence**       | Molecules must function independently                            |
| **Data Flow**          | Data flows DOWN from Organisms via properties; events flow UP    |
| **No Slots**           | Do NOT use the \`<slot>\` system                                   |

---

## 3. Naming Conventions

### Tag Name (Custom Element)
\`\`\`
kebab-case(folder)--kebab-case(component)-(projectId)
\`\`\`
**Example:** \`molecules--button-102020\`

### Class Name
\`\`\`
PascalCase + Molecule
\`\`\`
**Example:** \`ButtonMolecule\`

### File Name
\`\`\`
camelCase.ts
\`\`\`
**Example:** \`buttonMolecule.ts\`

---

## 4. Import Structure

\`\`\`typescript
// Lit and directives — ALWAYS from 'lit'
import {
    html,
    HTMLTemplateResult,
    classMap,
    ifDefined,
    repeat,
    until,
    choose,
    guard,
    keyed,
    live,
    ref
} from 'lit';

// Lit decorators
import { customElement, property, state } from 'lit/decorators.js';

// Data Binding decorators
import { propertyDataSource, propertyCompositeDataSource } from '/_100554_/l2/collabDecorators';

// Base Class
import { StateLitElement } from '/_100554_/l2/stateLitElement.js';
\`\`\`

---

## 5. Property Decorators

### \`@propertyDataSource\`
Binds the property to a **single dynamic state**.

\`\`\`typescript
@propertyDataSource({ type: String }) 
value: string | undefined;
\`\`\`
**Binding:** \`{{page1.name}}\`

---

### \`@propertyCompositeDataSource\`
Binds the property to **multiple composed states**.

\`\`\`typescript
@propertyCompositeDataSource({ type: String }) 
label: string = '';
\`\`\`
**Binding:** \`Hello {{page1.userId}} - {{page1.userName}}\`

---

### \`@property\`
Standard Lit property for **static configuration or local UI state**.

\`\`\`typescript
@property({ type: Boolean }) 
loading = false;

@property({ type: String }) 
variant: 'primary' | 'secondary' = 'primary';
\`\`\`

---

### \`@state\`
**Internal** reactive state (not exposed as an attribute).

\`\`\`typescript
@state() 
private isOpen = false;
\`\`\`

---

## 6. Internationalization (i18n) Structure

\`\`\`typescript
/// **collab_i18n_start**
const message_en = {
    loading: 'Loading...',
    // add more messages as needed
};
type MessageType = typeof message_en;

const messages: Record = {
    en: message_en,
    pt: {
        loading: 'Carregando...',
    },
    // add more languages as requested
};
/// **collab_i18n_end**
\`\`\`

### Usage in Component
\`\`\`typescript
render() {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];
    
    return html\`\${this.msg.loading}\`;
}
\`\`\`

---

## 7. Complete Structural Template

\`\`\`typescript
/// <mls fileReference="[file-reference]" enhancement="_102020_/l2/enhancementAura"/>

// =============================================================================
// [COMPONENT NAME] MOLECULE — UI-FIRST COMPONENT
// =============================================================================
// [Brief description of the component]
// This molecule does NOT contain business logic.

import {
    html,
    HTMLTemplateResult,
    classMap,
    ifDefined,
} from 'lit';

import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource, propertyCompositeDataSource } from '/_100554_/l2/collabDecorators';
import { StateLitElement } from '/_100554_/l2/stateLitElement.js';

/// **collab_i18n_start**
const message_en = {
    loading: 'Loading...',
};
type MessageType = typeof message_en;

const messages: Record = {
    en: message_en,
};
/// **collab_i18n_end**

@customElement('molecules--[component-name]-102020')
export class [ComponentName]Molecule extends StateLitElement {

    private msg: MessageType = messages.en;

    // =========================================================================
    // PROPERTIES — Data from Organisms
    // =========================================================================
    
    @propertyDataSource({ type: String }) 
    value: string | undefined;

    @propertyCompositeDataSource({ type: String }) 
    label: string = '';

    @property({ type: Boolean }) 
    loading = false;

    // =========================================================================
    // INTERNAL STATE
    // =========================================================================
    
    @state() 
    private isActive = false;

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================
    
    private handleClick(e: Event) {
        this.dispatchEvent(new CustomEvent('component-click', {
            bubbles: true,
            composed: true,
            detail: { /* event data */ }
        }));
    }

    // =========================================================================
    // RENDER
    // =========================================================================
    
    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        if (this.loading) {
            return html\`\${this.msg.loading}\`;
        }

        return html\`
            
                
            
        \`;
    }
}
\`\`\`


`