/// <mls fileReference="_102020_/l2/agents/templates/molecule.ts" enhancement="_102020_/l2/enhancementAura"/>

// =============================================================================
// MOLECULE TEMPLATE — EXECUTION-SAFE CONTRACT
// =============================================================================


// This file defines how an Molecule must be generated.

// CORE PRINCIPLES:
// - Molecules are UI-first components.
// - Molecules do NOT own business logic.
// - Molecules it should function independently.
// - Molecules NO use shadow root

// LLM must replace fileReference to new molecule name
// LLM must add clear and concise comments to improve code readability for humans.

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
} from 'lit'; // import lit and all directives always from 'lit'

import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource, propertyCompositeDataSource } from '/_100554_/l2/collabDecorators';
import { StateLitElement } from '/_100554_/l2/stateLitElement.js';


/**
 * =============================================================================
 * I18N SECTION - 
 * =============================================================================
 */

/// **collab_i18n_start**
const message_en = {
    loading: 'Loading...',
};
type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
    en: message_en,
    /// add more languagues if requested 
};
/// **collab_i18n_end**


/*
## Web Component tag rule
`kebab-case(folder)--kebab-case(component)-(project)`
*/
@customElement('agents--templates--molecule-102020')
export class TemplateMolecule extends StateLitElement {

    private msg: MessageType = messages.en;

    /**
  * =========================================================================
  * INPUT DATA (FROM ORGANISMS)
  * =========================================================================
  * Molecules SHOULD receive business data via @propertyDataSource or propertyCompositeDataSource when possible.
  */

    @propertyDataSource({ type: String }) value: number | undefined;
    @propertyCompositeDataSource({ type: String }) hint: string = '';
    @propertyCompositeDataSource({ type: String }) label: string = '';


    // @propertyDataSource: A property bound to a single dynamic state. Example binding: "{{page1.name}}".
    // @propertyCompositeDataSource: A property composed of multiple dynamic states. Example: "Hello {{page1.userId}} - {{page1.userName}}".

    @property({ type: Boolean })
    loading = false;

    render() {


        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        if (this.loading) {
            return html`<div>${this.msg.loading}</div>`;
        }

        return html`

            // Dont use slot system

            <div>
                <label>${this.label}</label>
                <input type="text" value=${this.value}></input>
                <small>${this.hint}</small>
            </div>
        `
    }

}
