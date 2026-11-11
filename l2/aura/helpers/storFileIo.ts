/// <mls fileReference="_102020_/l2/aura/helpers/storFileIo.ts" enhancement="_blank" />

// Read / write a stor file by file reference (`_<project>_/l2/…`), for the Aura agents and plugins
// that edit generated sources (header, logo).

import { createStorFile } from '/_102027_/l2/libStor.js';

/** Raw file content by file reference ('' when missing). */
export async function readRawSource(ref: string): Promise<string> {
    const norm = ref.startsWith('/') ? ref.slice(1) : ref;
    const info = mls.stor.convertFileReferenceToFile(norm);
    const key = mls.stor.getKeyToFile(info);
    const sf = mls.stor.files[key];
    if (!sf) return '';
    const content = await sf.getContent();
    return typeof content === 'string' ? content : '';
}

/** Create or overwrite a file by file reference (model, when open, and local stor). */
export async function saveFile(ref: string, src: string): Promise<void> {
    const info = mls.stor.convertFileReferenceToFile(ref);
    const key = mls.stor.getKeyToFile(info);
    let sf = mls.stor.files[key];
    if (!sf) {
        sf = await createStorFile({ ...info, source: src } as any, true, true, true);
    } else {
        const m = await sf.getOrCreateModel();
        if (m && m.model) m.model.setValue(src);
    }
    await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
}
