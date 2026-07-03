/// <mls fileReference="_102020_/l2/enhancementStyleAura.ts" enhancement="_blank"/>

import { convertFileToTag } from '/_102020_/l2/utils.js'
import { removeTokensFromSource, removeCommentLines } from '/_102027_/l2/libCompileStyle.js';

export const requires: mls.l2.enhancement.IRequire[] = [];

export const onAfterChange = (models: mls.editor.IModels) => {

    const modelStyle: mls.editor.IModelStyle | undefined = models.style;
    if (!modelStyle) return '';
    try {
        validateStyle(modelStyle);
        return '';
    } catch (e: any) {
        throw new Error(e)
    }
};

export const onAfterMarkersChange = (models: mls.editor.IModels) => {
    const modelStyle: mls.editor.IModelStyle | undefined = models.style;
    if (!modelStyle) return '';
    try {
        verifyMarkersError(modelStyle);
        return '';
    } catch (e: any) {
        throw new Error(e)
    }
};

export const onAfterCompile = async (modelStyle: mls.editor.IModelStyle): Promise<void> => {
    return;
}


export async function verifyMarkersError(modelStyle: mls.editor.IModelStyle) {
    if (modelStyle && modelStyle.model) {
        const markers = monaco.editor.getModelMarkers({ resource: modelStyle.model.uri });
        const hasError = markers.some(marker => marker.severity === monaco.MarkerSeverity.Error);
        modelStyle.storFile.hasError = hasError;
    }
}

export async function validateStyle(modelStyle: mls.editor.IModelStyle) {

    const model: monaco.editor.ITextModel = modelStyle.model;
    const { project, shortName, folder } = modelStyle.storFile;
    const keyToStorFileLess = mls.stor.getKeyToFiles(project, 2, shortName, folder, '.less');
    const storFileLess = mls.stor.files[keyToStorFileLess];
    if (!model || !storFileLess) return;

    storFileLess.hasError = false;
    const formated = await formatTextInMemory(model);
    let text = removeTokensFromSource(formated);
    text = removeCommentLines(text);

    const markers: monaco.Position[] = [];
    const fileName = `_${project}_${shortName}`;
    const tagName = convertFileToTag({project, shortName, folder});
    const nav3MenuSelector = `collab-nav-3-service[data-service="${fileName}"]`
    const rootSelectorRegex = /^[^\s].*?{/gm;
    const errors: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = rootSelectorRegex.exec(text)) !== null) {
        const selector = match[0].trim().replace(/\{$/, "").trim();
        const isValid =
            selector === nav3MenuSelector ||
            selector === tagName ||
            new RegExp(`^${tagName}\\.[a-zA-Z0-9_-]+$`).test(selector) ||
            new RegExp(`^(\\.[a-zA-Z0-9_-]+|[a-zA-Z][a-zA-Z0-9-]*)\\[data-widget=["']${tagName}["']\\]$`).test(selector);
        if (!isValid) {
            const position = getLineSelectorByText(model, selector);
            if (position) markers.push(position);
            errors.push(`Invalid root selector: "${selector}"`);
        }
    }

    if (markers.length > 0 || ( modelStyle.styleResults && modelStyle.styleResults.errors.length > 0)) storFileLess.hasError = true;
    setErrorOnEditor(markers, model, tagName);
}

async function formatTextInMemory(model: monaco.editor.ITextModel) {

    const tempModel = monaco.editor.createModel(model.getValue(), 'less');
    const tempEditor = monaco.editor.create(document.createElement("div"), {
        model: tempModel,
    });

    try {
        await tempEditor.getAction('editor.action.formatDocument')?.run();
        const formattedText = tempModel.getValue();
        return formattedText;
    } finally {
        tempEditor.dispose();
    }
}

function setErrorOnEditor(position: monaco.Position[], model: monaco.editor.ITextModel, tag: string) {
    monaco.editor.setModelMarkers(model, 'markerSource', []);
    const markers: monaco.editor.IMarkerData[] = [];
    position.forEach((pos) => {
        const markerOptions = {
            severity: monaco.MarkerSeverity.Error,
            message: `Invalid selector, must starting with tag, tag.class, .class[data-widget="tag"] or element[data-widget="tag"] ex: '${tag} {', '${tag}.myclass {', '.myclass[data-widget="${tag}"] {' or 'div[data-widget="${tag}"] {'`,
            startLineNumber: pos.lineNumber,
            startColumn: pos.column,
            endLineNumber: pos.lineNumber,
            endColumn: pos.column,
        };
        markers.push(markerOptions);
    })
    monaco.editor.setModelMarkers(model, 'markerSource', markers);
}

function getLineByText(model: monaco.editor.ITextModel, searchText: string) {
    const lineCount = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
        const lineContent = model.getLineContent(lineNumber);
        if (lineContent.trim() === searchText) {
            return new monaco.Position(lineNumber, 1);
        }
    }
    return null;
}

function getLineSelectorByText(model: monaco.editor.ITextModel, searchText: string) {
    const lineCount = model.getLineCount();
    const s1 = searchText + '{';
    const s2 = s1.replace(/\s+/g, '');
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
        const lineContent = model.getLineContent(lineNumber);
        const ln = lineContent.replace(/\s+/g, '').trim();
        if (ln === s2) {
            return new monaco.Position(lineNumber, 1);
        }
    }
    return null;
}



