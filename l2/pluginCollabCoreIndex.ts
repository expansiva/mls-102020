/// <mls fileReference="_102020_/l2/pluginCollabCoreIndex.ts" enhancement="_blank"/>

import { PluginBaseIndex } from '/_102027_/l2/pluginBaseIndex.js';

export class PluginCollabCoreIndex extends PluginBaseIndex {
    public getMenus(): mls.plugin.MenuAction[] {

        return [
            {
                // L2 only: the preview is where a molecule is tested in isolation. Pages (l3/l4) are
                // viewed in the app (serviceClient, 102033) with the in-place editor.
                category: 'Services',
                scope: ['l2ServicesRight'],
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
                // Prototype: jobs and component packs in one list, fictitious data in memory.
                // Proposal: collabMyFiles/marketplaceIdea.md.
                category: 'Services',
                scope: ['l6ServicesRight'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceMarketplace'
            },
            {
                // The l5/config.json of the project as sections, next to the 100555 items of the L6
                // project panel (selectProject). Declared here, not in 100554: 102020 is what knows
                // what a client app is. Proposal: collabMyFiles/configideia.md.
                category: 'Details',
                scope: ['l5Project'],
                priority: 1,
                auth: ['admin'],
                widget: '_102020_/l2/aura/plugins/pluginAppConfig'
            },
            {
                // Every module of the project and where it is (spec, pages, backend, routes, tests),
                // next to the App Config. Proposal: collabMyFiles/DashboardIdea.md.
                category: 'Details',
                scope: ['l5Project'],
                priority: 1,
                auth: ['admin'],
                widget: '_102020_/l2/aura/plugins/pluginModulesDashboard'
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
                scope: ['l2ServicesLeft', 'l2ServicesRight', 'l5ServicesRight'],
                priority: 2,
                auth: ['*'],
                widget: '_100554_serviceHistories'
            },
            {
                category: 'Services',
                scope: ['l0ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_100554_serviceUser'
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
                scope: ['l2ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/services/serviceComponentExplorer'
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
                widget: '_102020_/l2/aura/services/serviceDraft'
            },
            {
                category: 'Services',
                scope: ['l5ServicesLeft'],
                priority: 1,
                auth: ['*'],
                widget: '_100554_serviceSave2' // teste: serviceSave2 no lugar do serviceSave
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
            },
            {
                // NOT a panel: a module that plugs into the running app's edit slot (studioEditSlot,
                // in the master frontend) and brings the in-place editor with it. Declared here so
                // that 102033 never has to name this project — it asks the plugins what exists, the
                // same way it does for services. See TASK-102033-studio-to-102020.
                category: 'StudioTools',
                scope: ['studioTools'],
                priority: 1,
                auth: ['*'],
                widget: '_102020_/l2/aura/studio/studioEditTool'
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
