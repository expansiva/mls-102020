/// <mls fileReference="_102020_/l2/pluginCollabCoreIndex.ts" enhancement="_blank"/>

import { PluginBaseIndex } from '/_102027_/l2/pluginBaseIndex.js';

export class PluginCollabCoreIndex extends PluginBaseIndex {
    public getMenus(): mls.plugin.MenuAction[] {

        return [
            {
                category: 'Services',
                scope: ['l2ServicesRight', 'l3ServicesRight', 'l4ServicesRight'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_servicePreview'
            },
            {
                category: 'Services',
                scope: ['l3ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_serviceGenome'
            },
            {
                category: 'Services',
                scope: ['l6ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_serviceExploreProjects'
            },
            {
                category: 'Services',
                scope: ['l5ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_serviceProject'
            },
            {
                category: 'Services',
                scope: ['l4ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_aura/service/serviceBehavior'
            },
            {
                category: 'Services',
                scope: ['l7ServicesLeft', 'l6ServicesLeft', 'l5ServicesLeft', 'l4ServicesLeft', 'l3ServicesLeft', 'l2ServicesLeft', 'l1ServicesLeft'],
                priority: 10,
                auth: ['*'],
                widget: '_102020_serviceCollabMessages'
            }
        ];
    }


    public getHooks(): mls.plugin.HookAction[] {
        return [];
    }

    public getServices(): mls.plugin.ServiceAction[] {
        return [];
    }

}

export default new PluginCollabCoreIndex();
