/// <mls fileReference="_102020_/l2/widgetPlaygroundState.ts" enhancement="_102027_/l2/enhancementLit"/>


import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { initState, setState} from '/_102027_/l2/collabState.js';

@customElement('widget-playground-state-102020')
export class WidgetPlaygroundState extends LitElement { 

    @property({ type: String }) state: string = '';

    connectedCallback() {
        setState('playground', {});
        super.connectedCallback();
    }

    firstUpdated() {
        this.initStatePlayground();
    }

    render() {
        return html``;
    }

    private initStatePlayground() {
        try {
            if (!this.state) return;
            const js = JSON.parse(this.state);
            Object.keys({ ...js }).forEach((k) => {
                initState(k, js[k]);
            });
            
        } catch (e: any) {
            console.info(e.message);
        }
    }

}