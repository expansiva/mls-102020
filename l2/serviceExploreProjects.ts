/// <mls fileReference="_102020_/l2/serviceExploreProjects.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';

@customElement('service-explore-projects-102020')
export class ServiceExploreProjects102020 extends ServiceBase {
    public details: IService = {
        icon: '&#xf15b',
        state: 'foreground',
        position: 'right',
        tooltip: 'Service Example',
        visible: true,
        widget: '_102020_serviceExploreProjects',
        level: [5]
    }

    public onClickMain(op: string): void {
        if (this.menu.setMode) this.menu.setMode('initial');
    }

    public menu: IServiceMenu = {
        title: 'Example',
        main: {},
        tools: {},
        tabs: undefined,
        onClickMain: this.onClickMain.bind(this),
    }

    onServiceClick(visible: boolean, reinit: boolean, el: IToolbarContent | null) {

    }


    @property() 
    name: string = 'Somebody';

    render() {
        return html`<p> Hello, ${ this.name } !</p>`;
    }
}
