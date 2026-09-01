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
                widget: '_102020_/l2/aura/services/preview/servicePreview'
            },
            {
                category: 'Services',
                scope: ['l3ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceGenome'
            },
            {
                category: 'Services',
                scope: ['l6ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceExploreProjects'
            },
            {
                category: 'Services',
                scope: ['l1ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceApiExplorer'
            },
            {
                category: 'Services',
                scope: ['l1ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceL1Validator'
            },
            {
                category: 'Services',
                scope: ['l4ServicesRight'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceSpecExplorer'
            },
            {
                category: 'Services',
                scope: ['l2ServicesLeft', 'l2ServicesRight'],
                priority: 1,
                auth: ['*'],
                widget: '_100554_serviceUnit'
            },
            {
                category: 'Services',
                scope: ['l2ServicesLeft', 'l2ServicesRight'],
                priority: 1,
                auth: ['*'],
                widget: '_100554_serviceSource' 
            },
            {
                category: 'Services',
                scope: ['l2ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceL2Validator'
            },
            {
                category: 'Services',
                scope: ['l5ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceProject'
            },
            {
                category: 'Services',
                scope: ['l1ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_100554_serviceProject'
            },
            {
                category: 'Services',
                scope: ['l1ServicesLeft', 'l1ServicesRight'],
                priority: 1,
                auth: ['*'],
                widget: '_100554_serviceSourceL1'
            },
            {
                category: 'Services',
                scope: ['l5ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_100554_serviceSave'
            },
            {
                category: 'Services',
                scope: ['l4ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceBehavior'
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
