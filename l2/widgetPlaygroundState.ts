/// <mls fileReference="_102020_/l2/widgetPlaygroundState.ts" enhancement="_102020_/l2/enhancementAura.ts"/>

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { initState, setState} from '/_102029_/l2/collabState.js';

@customElement('widget-playground-state-102020')
export class WidgetPlaygroundState extends LitElement { 

    @property({ type: String }) state: string = '';

    connectedCallback() {
        setState('playground', {});
        // Seed SÍNCRONO, antes de qualquer 1º render das moléculas da página: os upgrades
        // só agendam o render como microtask, então semear aqui elimina a corrida em que
        // uma molécula lê {{playground.*}} antes do estado existir (era no firstUpdated).
        this.initStatePlayground();
        super.connectedCallback();
    }

    render() {
        return html``;
    }

    private initStatePlayground() {
        try {
            // getAttribute: a property pode ainda não ter sido sincronizada pelo Lit aqui.
            const raw = this.getAttribute('state') || this.state;
            if (!raw) return;
            const js = JSON.parse(raw);
            Object.keys({ ...js }).forEach((k) => {
                initState(k, js[k]);
            });
            
        } catch (e: any) {
            console.info(e.message);
        }
    }

}