/// <mls fileReference="_102020_/l2/agents/newModule/agentToBePage.ts" enhancement="_102027_/l2/enhancementAgent" />

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import { updateVariableJson } from '/_102027_/l2/defsAST.js';



export function createAgent(): IAgentAsync {
    return {
        agentName: "agentToBePage",
        agentProject: 102020,
        agentFolder: "agents/newModule",
        agentDescription: "Implement Page",
        visibility: "public",
        beforePromptImplicit,
        beforePromptStep,
        afterPromptStep

    };
}

async function beforePromptImplicit(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

    if (!userPrompt) throw new Error('invalid prompt');

    // userPrompt contains all we need
    const info = JSON.parse(userPrompt);

    const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
        type: "add-message-ai",
        request: {
            action: 'addMessageAI',
            agentName: agent.agentName,
            inputAI: [
                { type: 'system', content: system1 },
                { type: 'human', content: userPrompt }
            ],
            taskTitle: agent.agentDescription,
            threadId: context.message.threadId,
            userMessage: info.page,
            longTermMemory: { moduleName: info.moduleName }
        }

    };

    return [addMessageAI];

}

async function beforePromptStep(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    step: mls.msg.AIAgentStep,
    hookSequential: number,
    args?: string
): Promise<mls.msg.AgentIntent[]> {

    if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args invalid`);

    if (args.startsWith("[agentToBePages]")) {

        const continueParallel1: mls.msg.AgentIntentPromptReady = {
            type: "prompt_ready",
            args,
            messageId: context.message.orderAt,
            threadId: context.message.threadId,
            taskId: context.task?.PK || '',
            hookSequential,
            parentStepId: 1,
            humanPrompt: '',
            systemPrompt: system1
        }
        return [continueParallel1];

    }

    const continueParallel: mls.msg.AgentIntentPromptReady = {
        type: "prompt_ready",
        args,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        hookSequential,
        parentStepId: parentStep.stepId,
        humanPrompt: args,
        //systemPrompt: system1
    }

    return [continueParallel];
}


async function afterPromptStep(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    step: mls.msg.AIAgentStep,
    hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

    if (step.status === 'waiting_after_prompt_with_error') {
        console.info('[' + agent.agentName + '] Chegou com erro:', step);
        return [];
    }

    if (!agent || !context || !step || !step.interaction || !step.interaction.payload) throw new Error(`[afterPromptStep] invalid params, agent:${!!agent}, context:${!!context}, step:${!!step}`);

    const payload = step.interaction.payload[0] as Output | undefined;
    if (!payload || payload.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload`);

    const output = payload.result as ToBePages;
    const intents = await processOutput(context, output, agent, step);


    const updateStatus: mls.msg.AgentIntentUpdateStatus = {
        type: 'update-status',
        hookSequential,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: parentStep.stepId,
        stepId: step.stepId,
        cleaner: 'input_output',
        status: 'completed'
    };
    return [...intents, updateStatus];

}

async function processOutput(context: mls.msg.ExecutionContext, output: any, agent: IAgentMeta, parentStep: mls.msg.AIAgentStep): Promise<mls.msg.AgentIntent[]> {

    // preciso do modulo
    let module = context.task?.iaCompressed?.longMemory['moduleName'];
    if (!module) throw new Error('Not found moduleName:' + agent.agentName);
    output.status = 'draft';
    const pageName = `_${mls.actualProject || 0}_/l2/${module}/${output.pages[0].pageName}.ts`;

    const refDef = `_${mls.actualProject || 0}_/l2/${module}/${output.pages[0].pageName}.defs.ts`;
    const srcDefs = updateVariableJson('/// <mls fileReference="' + refDef + '"  enhancement="_blank"/>\n\n', 'definition', output);

    await saveFile(refDef, srcDefs);
    await saveFile(pageName, '');

    /*const newStep: mls.msg.AgentIntentAddStep = {
      type: "add-step",
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: parentStep.stepId,
      stepTitle: 'Creating definition',
      step:
      { 
        type: 'agent',
        stepId: 0,
        interaction: null,
        status: 'waiting_human_input',
        nextSteps: [],
        agentName: 'agentToBePage2',
        prompt: JSON.stringify({ outputPath:refDef, folder:`/_${mls.actualProject || 0}_/l2/${module}/web/` , definition: output }),
        rags: [],
        onFailure:'wait_after_prompt'
      }
    };
  
    return [newStep];*/
    return [];

}

async function saveFile(ref: string, src: string) {

    const info = mls.stor.convertFileReferenceToFile(ref);
    const k = mls.stor.getKeyToFile(info);
    let sf = mls.stor.files[k];

    if (!sf) {
        const param: IReqCreateStorFile = {
            ...info,
            source: src
        }

        sf = await createStorFile(param, true, true, true);

    } else {

        const m = await sf.getOrCreateModel();
        if (m && m.model) m.model.setValue(src);

    }

    await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
}

const system1 = `
<!-- modelType: codeinstruct -->
<!-- modelTypeList: geminiChat ?/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) ?/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) ?/10, code2 (kimi 2.5) ?/10 -->

You are a senior Frontend Architect and Staff Software Engineer with 20+ years of experience building large-scale web applications.

You must read the page definitions from the user prompt and **enrich the input data with additional relevant information**, including all necessary details, best practices, and technical considerations to create a complete and high-quality implementation.

## Output format
You must return the object strictly as JSON, no spaces, no indent, minified
[[OutputSection]]
`

//#region OutputSection
export type Output = {
    type: "flexible";
    result: ToBePages;
};
export interface ToBePages {
    pages: Page[];
}
export interface Page {
    screenId: string;
    pageName: string; // ex: listProducts
    actor: string; // "customer" | "staff" | "admin"
    purpose: string;
    sections: Section[];

    /** Page-level action states (loading, saving, error) */
    actionStates: ActionStateDef[];

    /** Page-level temporary states (filters, selections, toggles) */
    tempStates: TempStateDef[];
}
export interface Section {
    sectionName: string; // main, aside, header, footer, ...
    mode: "stack" | "exclusive";
    organisms: Organism[];
}
export interface Organism {
    organismName: string;  // e.g. "listProductsTop5", always prefixed with pageName in camelCase
    purpose: string;       // Short description of the organism's single responsibility
    rulesApplied: string[];

    /**
     * How this organism receives data from BFF.
     * Determines stateKey structure.
     */
    dataShape: DataShapeDef;

    /** Temporary states owned by this organism */
    tempStates: TempStateDef[];

    /** Computed fields derived from other data */
    computedFields: ComputedFieldDef[];

    /** Navigation actions triggered from this organism */
    navigationFields: NavigationFieldDef[];

    /** Events emitted by this organism */
    emits: EmitDef[];
}
export type DataShapeDef =
    | DataShapeFields      // flat fields — current model
    | DataShapeObject      // single object state
    | DataShapeCollection; // array of objects

/**
 * Flat fields — each field is an independent state.
 * Use when: simple entity display/edit with few fields.
 * stateKey per field: db.[entity].[field]
 */
export interface DataShapeFields {
    shape: 'fields';
    entityFields: EntityFieldRef[];
}
/**
 * Single object — the entire response is one state.
 * Use when: BFF returns a projected object, or entity has
 * nested sub-objects that must stay together.
 * stateKey: db.[entity] or db.[pageName].[routineAlias]
 */
export interface DataShapeObject {
    shape: 'object';
    stateKey: string;              // ex: 'db.catalogProducts.productDetail'
    sourceRoutine: string;         // ex: 'productDetail.getProduct'
    fields: ObjectFieldRef[];      // declares what's inside for layout agent
    params: DataShapeParam[];
}
/**
 * Collection — array of objects, each with same structure.
 * Use when: lists, tables, grids, sub-entity arrays (addresses).
 * stateKey: db.[entity][] or db.[pageName].[alias][]
 */
export interface DataShapeCollection {
    shape: 'collection';
    stateKey: string;              // ex: 'db.product[]'
    sourceRoutine: string;         // ex: 'catalogProducts.listProducts'
    itemFields: ObjectFieldRef[];  // fields per item
    /** Does the collection support inline editing? */
    params: DataShapeParam[];
    editable: boolean;
}
/**
 * Parameter needed to call the sourceRoutine.
 * Declares WHERE the value comes from at runtime.
 */
export interface DataShapeParam {
    /** Param name as expected by the BFF routine */
    paramName: string;
    /** Type of the param value */
    type: string;
    /** Where the value comes from at runtime */
    source: ParamSource;
}
export type ParamSource =
    | { from: 'route'; routeParam: string }          // /store/:storeInfoId
    | { from: 'state'; stateKey: string }             // picked in another organism
    | { from: 'context'; contextKey: string }           // user.storeId, user.companyId
    | { from: 'config'; configKey: string }            // module.defaultStoreId
    | { from: 'parent'; parentStateKey: string }       // parent organism selection
    | { from: 'fixed'; value: string | number | boolean };  // hardcoded

/**
 * A field inside an object or collection item.
 * No individual stateKey — accessed via parent.
 */
export interface ObjectFieldRef {
    entityField: string;
    entity: string;
    priority: FieldPriority;
    usage: 'display' | 'edit' | 'filter' | 'sort' | 'group';
    /** Marks array sub-fields: addresses[].street */
    isNested?: boolean;
    /** For nested sub-arrays within an item */
    nestedCollection?: {
        stateKeySuffix: string;    // ex: '.addresses[]'
        itemFields: ObjectFieldRef[];
    };
    priorityReason?: string;
}
export type FieldPriority = 'required' | 'recommended' | 'optional' | 'future';
export interface EntityFieldRef {
    entity: string;
    entityField: string;
    stateKey: string; // e.g. 'db.[entity].[entidyField]' or 'db.[entity].[entidyField][]'
    priority: FieldPriority;
    /** How this field is used in the organism */
    usage: 'display' | 'edit' | 'filter' | 'sort' | 'group';
    /** Brief note on why this priority was chosen */
    priorityReason?: string;
}
export interface ActionStateDef {
    stateKey: string; // e.g. 'ui.[page].cancel'
    description: string;
    /** Possible values — typically 'idle' | 'loading' | 'success' | 'error' */
    values: string[];
}
export interface TempStateDef {
    stateKey: string; // e.g. 'ui.[page].filter.name'
    type: string;
    description: string;
    priority: FieldPriority;
    /** Initial value expression */
    initialValue?: string;
}
export interface ComputedFieldDef {
    fieldId: string;
    derivedFrom: string[];
    description: string;
    priority: FieldPriority;
}
export interface NavigationFieldDef {
    fieldId: string;
    target: string;
    params: string[];
    priority: FieldPriority;
    /** 'internal' = route change, 'external' = new tab/whatsapp/etc */
    navigationType: 'internal' | 'external';
}
export interface EmitDef {
    event: string;
    payload: string;
    writesState?: string;
}

//#endregion

