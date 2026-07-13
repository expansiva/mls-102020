/// <mls fileReference="_102020_/l2/collabMessagesEnvironment.ts" enhancement="_blank"/>

import { CollabMessagesEnvironment, CollabProgramMenu, CollabProgramMenuItem } from '/_102036_/l2/environmentContract.js';
import { IAgentMeta, IOpenClawIntegration, Thread, ToolsBeforeSendMessage, ExecutionContext, TaskData, Message } from '/_102036_/l2/shared/interfaces.js';

import { loadAgent, executeBeforePrompt } from '/_102027_/l2/aiAgentOrchestration.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { openElementInServiceDetails, saveOpenedFile } from '/_102027_/l2/libCommom.js';
import { createModel } from '/_102027_/l2/libModel.js';
import { collabImport } from '/_102027_/l2/collabImport.js';
import { setAuraState, saveAuraProject, getAuraState, type IAuraPage } from '/_102020_/l2/aura/helpers/auraState.js';

export const collabEnvironment: CollabMessagesEnvironment = {
    getAgents,
    getIntegrationsOpenClaw,
    setIntegrationsOpenClaw: (integrations: IOpenClawIntegration[]) => setIntegrationsOpenClaw(integrations),
    notifications: {
        getFCMTokenForBackend,
        getNotifySoundUrl,
        sendACK: (id: string) => sendACK(id),
        sendRequestMissed,
    },
    bots: {
        getArgsToBots,
        getBotContextVarsBeforeMessageSend,
        getBotContextVarsBeforeMessageSend2
    },
    agents: {
        generateSvgAvatar: (threadId: string, userId: string, promptToAvatar: string) => generateSvgAvatar(threadId, userId, promptToAvatar),
        executeAgent: (agent: string, context: ExecutionContext) => executeAgent(agent, context),
        loadAgent: (agentName: string) => loadAgent2(agentName)
    },
    tasks: {
        openTaskDetails: (messageId: string, taskId: string, task: TaskData, message: Message) => openTaskDetails(messageId, taskId, task, message)
    },
    apps: {
        getProgramMenu: () => getProgramMenu(),
        openProgram: (item: CollabProgramMenuItem & { project?: number; module?: string; path?: string }) => openProgram(item)
    },
    config: {
        getMenuMode: () => 'custom',
        generateSvgAvatarEnabled: () => true
    }
}

// --- Apps menu, sourced from the workspace config.json (moved to <project>/l5/config.json) ---

interface IConfigNavItem { id: string; label?: string; href?: string; description?: string; icon?: string }
interface IConfigPage { pageId?: string; route?: string; source?: string; title?: string }
interface IConfigModule {
    moduleId: string;
    basePath?: string;
    navigation?: IConfigNavItem[];
    frontend?: { pages?: IConfigPage[] };
}
interface IConfigProject { modules?: IConfigModule[] }
interface IWorkspaceConfig { defaultProjectId?: string; projects?: Record<string, IConfigProject> }

// External/master modules keep their frontend definition (nav + routes) in their own
// module.ts (moduleFrontendDefinition), not in this project's config.json.
interface IModuleRoute { path: string; entrypoint?: string; title?: string }
interface IModuleFrontendDef { navigation?: IConfigNavItem[]; routes?: IModuleRoute[] }

// Loads the workspace runtime config for a project.
// Prefers the new typed module <project>/l5/runtimeConfig.ts (imported → versioned cache +
// web service). Falls back to the legacy <project>/l5/config.json (raw text + JSON.parse)
// while the l5 build/serve is being wired up.
async function readWorkspaceConfig(project: number): Promise<IWorkspaceConfig | undefined> {
    // 1) New format: l5/runtimeConfig.ts (module import).
    try {
        const storFile = mls.stor.files[mls.stor.getKeyToFiles(project, 5, 'runtimeConfig', '', '.ts')];
        const isDev = !!storFile?.inLocalStorage;
        const url = `/_${project}_/l5/runtimeConfig.js${isDev ? `?t=${Date.now()}` : ''}`;
        const mod = await import(/* @vite-ignore */ url);
        if (mod?.runtimeConfig?.projects) return mod.runtimeConfig as IWorkspaceConfig;
    } catch (err) {
        console.info('[readWorkspaceConfig] l5/runtimeConfig.ts not available, falling back to config.json', err);
    }

    // 2) Legacy fallback: l5/config.json (raw text).
    try {
        const key = mls.stor.getKeyToFiles(project, 5, 'config', '', '.json');
        const storFile = mls.stor.files[key];
        if (!storFile) return undefined;
        const content = await storFile.getContent();
        if (!content || typeof content !== 'string') return undefined;
        return JSON.parse(content) as IWorkspaceConfig;
    } catch (err) {
        console.info('[readWorkspaceConfig] failed', err);
        return undefined;
    }
}

// Reads <project>/l2/<moduleId>/module.ts and returns its moduleFrontendDefinition.
// Used for external modules whose nav/routes are not in the client config.json.
async function readModuleFrontendDef(project: number, moduleId: string): Promise<IModuleFrontendDef | undefined> {
    try {
        const mod = await collabImport({ folder: moduleId, project, shortName: 'module', extension: '.ts' });
        return mod?.moduleFrontendDefinition as IModuleFrontendDef | undefined;
    } catch (err) {
        console.info('[readModuleFrontendDef] failed ' + moduleId, err);
        return undefined;
    }
}


// Builds the Apps menu tree from config.json:
// first level = module (per project), children = the module's navigation links.
// Modules with no links are skipped (e.g. backend / not-yet-generated modules like mdm),
// so the menu only shows modules that actually have pages to open.
async function getProgramMenu(): Promise<CollabProgramMenu[]> {

    const project = mls.actualProject as number;
    if (!project) return [];

    const config = await readWorkspaceConfig(project);
    if (!config || !config.projects) return [];

    const menus: CollabProgramMenu[] = [];

    for (const projectId of Object.keys(config.projects)) {
        const modules = config.projects[projectId]?.modules ?? [];
        for (const module of modules) {
            let navigation = module.navigation ?? [];

            // External modules (e.g. audit/monitor) keep their navigation in module.ts.
            if (navigation.length === 0) {
                const def = await readModuleFrontendDef(Number(projectId), module.moduleId);
                navigation = def?.navigation ?? [];
            }

            const items: CollabProgramMenuItem[] = navigation.map((nav) => ({
                title: nav.label ?? nav.id,
                icon: nav.icon ?? '',
                url: nav.href ?? '',
                pageName: nav.id,
                target: undefined
            }));

            if (items.length === 0) continue;

            menus.push({
                name: module.moduleId,
                icon: '',
                project: Number(projectId),
                path: module.basePath ?? '',
                menu: items
            });
        }
    }

    return menus;
}

// Splits a config "source" path (e.g. "l2/cafeFlow/web/desktop/page11/kitchenQueue.ts")
// into the stor coordinates used to open the file.
function parseSource(source: string): { level: number; folder: string; shortName: string; extension: string } {
    let s = source.replace(/^\.?\//, '');
    let level = 2;
    const m = s.match(/^l(\d)\//);
    if (m) { level = Number(m[1]); s = s.slice(m[0].length); }

    const dot = s.lastIndexOf('.');
    const extension = dot >= 0 ? s.slice(dot) : '.ts';
    s = dot >= 0 ? s.slice(0, dot) : s;

    const slash = s.lastIndexOf('/');
    const folder = slash >= 0 ? s.slice(0, slash) : '';
    const shortName = slash >= 0 ? s.slice(slash + 1) : s;
    return { level, folder, shortName, extension };
}

// Opens the selected page in the Aura preview. Resolves the real page file from
// config.json (frontend.pages[].source), then mirrors the proven aura open flow
// (serviceGenome._openPage): editor models + mls.actual[3/4] + aura state + 'open' event.
async function openProgram(item: CollabProgramMenuItem & { project?: number; module?: string; path?: string }): Promise<void> {

    const project = item.project ?? (mls.actualProject as number);
    if (!project) return;

    let target = { level: 2, folder: item.path ?? '', shortName: item.pageName, extension: '.ts' };

    // 1) Client's own module: resolve the .ts source from its config.json (frontend.pages[].source).
    const config = await readWorkspaceConfig(mls.actualProject as number);
    const modules = config?.projects?.[String(project)]?.modules ?? [];
    const module = modules.find(m => m.basePath === item.path || m.moduleId === item.module);
    const page = (module?.frontend?.pages ?? []).find(p => p.pageId === item.pageName || p.route === item.url);

    if (page?.source) {
        target = parseSource(page.source);
    } else {
        // 2) External module: the client only declares that it USES the module (single reference,
        // no page list). The pages are owned by the module's own project (e.g. 102034) and follow
        // the convention <moduleId>/web/desktop/page11/<pageName>. Deriving it here means a client
        // never duplicates — nor needs to know about — the external module's pages.
        const moduleId = item.module ?? '';
        if (!moduleId || !item.pageName) {
            console.info('[openProgram] cannot resolve external page: ' + moduleId + '/' + item.pageName);
            return;
        }
        target = { level: 2, folder: `${moduleId}/web/desktop/page11`, shortName: item.pageName, extension: '.ts' };
    }
    if (!target.shortName) return;

    // Swap the source's variation segment (e.g. page11) for the current layout/design system,
    // BUT only if that variation file actually exists. Modules generated per layout/DS
    // (e.g. cafeFlow) have page<layout><ds>; single-variation modules (e.g. the audit pilot)
    // only have the source folder (page11), so fall back to it instead of a missing page31.
    const layout = getAuraState().actualLayout ?? 1;
    const ds = getAuraState().actualDesignSystem ?? 1;
    const variationFolder = target.folder.replace(/page\d+(\/|$)/, `page${layout}${ds}$1`);
    const variationKey = mls.stor.getKeyToFiles(project, target.level, target.shortName, variationFolder, target.extension);
    const folder = mls.stor.files[variationKey] ? variationFolder : target.folder;

    console.info('[openProgram] opening', {
        module: item.module, pageName: item.pageName, project,
        source: page?.source ?? '(convention)', sourceFolder: target.folder, variationFolder, chosenFolder: folder,
        shortName: target.shortName, level: target.level
    });

    const file = { project, level: target.level, folder, shortName: target.shortName, extension: target.extension } as mls.stor.IFileInfo;
    const fullName = folder ? `_${project}_${folder}/${target.shortName}` : `_${project}_${target.shortName}`;

    // Bind the editor levels used by the preview and load the monaco models.
    for (const lv of [3, 4]) {
        mls.actual[lv].setFullName(fullName);
        (mls.actual[lv] as any).right = file;
    }

    const files = await mls.stor.getFiles({ project, shortName: target.shortName, folder, loadContent: false });
    if (files?.ts) await createModel(files.ts);
    if (files?.less) await createModel(files.less);
    if (files?.html) await createModel(files.html);

    saveOpenedFile(project, 4, mls.actual[4].getFullName());
    saveOpenedFile(project, 3, mls.actual[3].getFullName());

    // Aura preview repaints from the actualPage state.
    const pageRef: IAuraPage = { project, shortName: target.shortName, folder, level: target.level, extension: target.extension };
    setAuraState('actualPage', pageRef);
    saveAuraProject();

    // Fire the standard 'open' action the preview listens to.
    const params = {} as mls.events.IFileAction;
    (params.action as any) = 'open';
    params.level = mls.actualLevel;
    params.project = project;
    params.shortName = target.shortName;
    params.extension = target.extension;
    params.folder = folder;
    params.position = 'right';

    mls.events.fire([mls.actualLevel], ['FileAction'], JSON.stringify(params), 0);
}

async function getAgents(): Promise<IAgentMeta[]> {

    const keys = Object.keys(mls.stor.files);
    const ret: IAgentMeta[] = [];
    for await (const k of keys) {
        if (k.indexOf('agent') < 0) continue;
        const file = mls.stor.files[k];
        const path = `/_${file.project}_${file.folder ? file.folder + '/' : ''}${file.shortName}`;
        if (file.extension !== '.ts' || !file.shortName.startsWith('agent')) continue;
        try {
            const mdl = await import(path);
            if (!mdl.createAgent) continue;
            const agent = mdl.createAgent() as IAgentMeta
            ret.push(agent);
        } catch (err) {
            console.info(err)
            continue;
        }
    }
    return ret;

}

async function getIntegrationsOpenClaw(): Promise<IOpenClawIntegration[]> {

    if (mls.l5.actualOrg === undefined) return [];
    const actualOrgDetails = getOrgDetails(mls.l5.actualOrg);
    if (!actualOrgDetails || !actualOrgDetails.value) return [];
    try {
        const data = JSON.parse(actualOrgDetails.value);
        return data.integrations || []

    } catch (err: any) {
        throw new Error(err.message)
    }

}

async function setIntegrationsOpenClaw(integrations: IOpenClawIntegration[]): Promise<void> {

    if (mls.l5.actualOrg === undefined) throw new Error(`Invalid org actual: ${mls.l5.actualOrg}`);

    const actualOrgDetails = getOrgDetails(mls.l5.actualOrg);
    if (!actualOrgDetails) throw new Error(`Invalid org details: ${mls.l5.actualOrg}`);

    try {
        let data: any = {};

        if (actualOrgDetails.value) {
            data = JSON.parse(actualOrgDetails.value);
        }

        data = { ...data, integrations };

        await mls.api.cbeAddOrUpdateOrgValue(
            actualOrgDetails.sett.name,
            JSON.stringify(data)
        );

    } catch (err: any) {
        throw new Error(err.message);
    }

}

async function getNotifySoundUrl() {
    return './l3/_100529_/audio/collabNotification.mp3';
}

async function getFCMTokenForBackend() {
    const token = await mls.events.getFCMTokenForBackend();
    return token;
}

async function sendRequestMissed() {
    return await mls.stor.cache.sendRequestMissed();
}

async function sendACK(id: string) {
    return await mls.stor.cache.sendACK(id);
}

async function getArgsToBots(): Promise<Record<string, any>> {
    const data = {}
    return data;
}

async function getBotContextVarsBeforeMessageSend(thread: Thread, prompt: string): Promise<string[]> {
    return mls.bots.getBotContextVarsBeforeMessageSend(thread, prompt);
}

async function getBotContextVarsBeforeMessageSend2(vars: string[], myArgs: Record<string, any>): Promise<ToolsBeforeSendMessage[]> {
    return mls.bots.getBotContextVarsBeforeMessageSend2(vars, myArgs);
}

async function generateSvgAvatar(threadId: string, userId: string, promptToAvatar: string) {
    const agentName = '_102020_/l2/agents/agentGenerateAvatarSvg';
    const agent = await loadAgent(agentName);
    if (!agent) throw new Error('Invalid agent');
    const context = getTemporaryContext(threadId, userId, promptToAvatar);
    await executeBeforePrompt(agent, context);
    const svg = extractSvgFromContext(context);
    return svg;

}

async function loadAgent2(agentName: string) {
    const agent = await loadAgent(agentName);
    if (!agent) return null;
    return agent as IAgentMeta
}

async function executeAgent(agentToCall: string, context: ExecutionContext) {
    const agent = await loadAgent(agentToCall);
    if (!agent) throw new Error('Invalid agent' + agentToCall)
    await executeBeforePrompt(agent, context);
}

async function openTaskDetails(messageId: string, taskId: string, task: TaskData, message: Message): Promise<{
    openLocal: boolean;
    element: HTMLElement | undefined;
}> {

    await import('/_102025_/l2/collabMessagesTaskInfo.js');
    const el = document.createElement('collab-messages-task-info-102025');
    el.setAttribute('messageId', messageId);
    if (task && task.PK) el.setAttribute('taskId', task.PK);
    (el as any)['task'] = task;
    (el as any)['message'] = message;
    openElementInServiceDetails(el);
    return { openLocal: false, element: undefined }

}

function extractSvgFromContext(context: any): string | null {
    return context?.task?.iaCompressed?.nextSteps?.[0]?.interaction?.payload?.[0]?.result ?? null;
}

function getOrgDetails(orgIndex: number) {
    const actualOrgName = Object.keys(mls.stor.orgs)[orgIndex];
    const actualOrgDetails = mls.stor.orgs[actualOrgName];
    return actualOrgDetails;
}
