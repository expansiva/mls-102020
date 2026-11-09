/// <mls fileReference="_102020_/l2/aura/helpers/moleculeTagSwap.ts" enhancement="_blank"/>

import { resolveTagToFile } from '/_102020_/l2/utils.js';
import { scanTemplateElements, type ITemplateElement } from '/_102020_/l2/aura/studio/studioClassEdit.js';

/**
 * moleculeTagSwap.ts
 *
 * Swaps one molecule (web component tag) for another in a page source, keeping the imports in
 * step — the write behind the genome's molecule knob (serviceGenome).
 *
 * Moved out of the former `services/preview/previewTextEditor.ts` (the preview no longer edits; it
 * is an L2 viewer only), so the genome does not depend on the preview service.
 */

export interface ITagReplaceResult {
  success: boolean;
  newSource?: string;
  /** Número de ocorrências substituídas (abertura + fechamento) */
  replacements?: number;
  error?: string;
}

/**
 * Substitui uma ocorrência específica ou todas as ocorrências de uma tag
 * de web component no template do render().
 * 
 * Também gerencia os imports:
 * - Se oldTag ainda existe no template após a troca → mantém import antigo E adiciona novo
 * - Se oldTag não existe mais → remove import antigo e adiciona novo
 * - Se import do newTag já existe → não duplica
 * 
 * @param oldTag - Tag atual (ex: 'ml-floating-text-input')
 * @param newTag - Nova tag (ex: 'ml-new-text-input')
 * @param source - Conteúdo completo do arquivo .ts
 * @param selectorPath - Path do elemento selecionado no DOM
 * @param mode - 'selected' troca só o selecionado, 'all' troca todas as ocorrências
 * @param targetOpenStart - offset exato do `<` do elemento a trocar, quando quem chama já resolveu
 *   QUAL elemento é (a âncora estrutural do studio). Vence o selectorPath, que é um índice e conta
 *   na ordem errada. Sem ele, nada muda para quem já chamava.
 * @returns Resultado com o novo source
 */
export function replaceComponentTag(
  oldTag: string,
  newTag: string,
  source: string,
  selectorPath?: string,
  mode: 'selected' | 'all' = 'selected',
  targetOpenStart?: number,
): ITagReplaceResult {
  if (!oldTag || !newTag) {
    return { success: false, error: 'oldTag and newTag are required' };
  }

  if (oldTag === newTag) {
    return { success: false, error: 'oldTag and newTag are the same' };
  }

  if (!oldTag.includes('-') || !newTag.includes('-')) {
    return { success: false, error: 'Tags must be custom elements (contain a hyphen)' };
  }

  // EVERY html`` template of the file, not the first one of `render()`.
  //
  // It used to take `render()`'s first template and search inside it. The generated pages split the
  // screen into helper methods — the 102047's ticketCatalogue has 25 templates and `render()` holds
  // only the dispatcher — so a molecule anywhere else was simply not found, and the swap answered
  // "could not replace" for a tag that was right there. `scanTemplateElements` is the studio's own
  // scanner: it knows a template from TypeScript (an `Array<string>` in a `${…}` is not an element),
  // it delimits an open tag past an arrow function's `>`, and it is tested.
  const elements = scanTemplateElements(source).filter((element) => element.tag === oldTag.toLowerCase());
  if (elements.length === 0) {
    return { success: false, error: `Tag "${oldTag}" not found in any html\`\` template of this file` };
  }

  const totalOccurrences = elements.length;

  // WHICH ELEMENTS the swap rewrites — elements, not two parallel lists of offsets.
  //
  // The opening and the closing used to be picked from two separate arrays with the SAME index,
  // and the closing one was FILTERED (only the occurrences whose `</tag>` is literally there). One
  // self-closed or unclosed occurrence earlier in the file shifted them apart, and index N then
  // meant a different element on each side: the opening of one rewritten together with the closing
  // of another. Keeping the element itself makes the pair impossible to mismatch.
  let targets: ITemplateElement[];

  if (mode === 'all') {
    targets = elements;
  } else if (typeof targetOpenStart === 'number') {
    // AN EXACT POSITION, from a caller that resolved the element itself — the studio's structural
    // anchor. An occurrence index cannot do this job: it counts elements on SCREEN while this
    // function counts them in the TEXT, and the two orders are unrelated (the render helpers are
    // declared in one order and composed in another). On 102047/consultas that mismatch put the
    // swap of the header button inside the table's `renderActions`.
    const exact = elements.find((element) => element.openStart === targetOpenStart);
    if (!exact) {
      return { success: false, error: `No <${oldTag}> element starts at offset ${targetOpenStart}` };
    }
    targets = [exact];
  } else {
    // No exact position: fall back to the occurrence index carried by the selector (`:nth-of-type`).
    const occurrenceIndex = getOccurrenceFromPath(oldTag, selectorPath);
    const inRange = occurrenceIndex >= 0 && occurrenceIndex < elements.length;
    targets = [elements[inRange ? occurrenceIndex : 0]];
  }

  // The NAME is what changes — `<oldTag` becomes `<newTag` and `</oldTag>` becomes `</newTag>`, with
  // every attribute, binding and child left exactly where they are.
  const replacements: { srcStart: number; srcEnd: number; replacement: string }[] = [];

  for (const element of targets) {
    replacements.push({
      srcStart: element.openStart,
      srcEnd: element.openStart + oldTag.length + 1,
      replacement: `<${newTag}`,
    });
    // A self-closed or unclosed element has no `</tag>` to rewrite, and that is not a failure.
    const closeStart = element.end - (oldTag.length + 3);
    if (source.slice(closeStart, element.end) === `</${oldTag}>`) {
      replacements.push({
        srcStart: closeStart,
        srcEnd: element.end,
        replacement: `</${newTag}>`,
      });
    }
  }

  if (replacements.length === 0) {
    return { success: false, error: `Tag "${oldTag}" not found in template` };
  }

  // Ordena de trás pra frente para não invalidar offsets
  replacements.sort((a, b) => b.srcStart - a.srcStart);

  let newSource = source;
  for (const r of replacements) {
    newSource = newSource.substring(0, r.srcStart) + r.replacement + newSource.substring(r.srcEnd);
  }

  // Verifica se ainda restam ocorrências da oldTag no template após a substituição
  const remainingOldTags = totalOccurrences - targets.length;
  const oldTagStillExists = remainingOldTags > 0;

  // Gerencia imports
  newSource = updateImportsForTagReplace(oldTag, newTag, newSource, oldTagStillExists);

  return {
    success: true,
    newSource,
    replacements: replacements.length,
  };
}

/**
 * Gerencia os imports ao trocar uma tag de web component.
 * 
 * - Se oldTag ainda existe no template → mantém import antigo E adiciona o novo
 * - Se oldTag não existe mais → remove import antigo e adiciona o novo
 * - Se o import do newTag já existe → não duplica
 */
function updateImportsForTagReplace(oldTag: string, newTag: string, source: string, oldTagStillExists: boolean): string {
  const oldFile = resolveTagToFile(oldTag);
  const newFile = resolveTagToFile(newTag);

  if (!oldFile || !newFile) return source;

  const oldImportPath = buildImportPath(oldFile);
  const newImportPath = buildImportPath(newFile);

  if (!oldImportPath || !newImportPath) return source;

  // Verifica se o import do newTag já existe no source
  const newImportExists = source.includes(newImportPath);

  // Encontra a linha de import da oldTag
  const escapedOldPath = escapeRegex(oldImportPath);
  const importRegex = new RegExp(`^(import\\s+(?:[^;]*?from\\s+)?['"])${escapedOldPath}(['"]\\s*;?)\\s*$`, 'gm');
  const importMatch = importRegex.exec(source);

  if (!importMatch) {
    // Import antigo não encontrado — apenas adiciona o novo se não existe
    if (!newImportExists) {
      return addImport(source, newImportPath);
    }
    return source;
  }

  const oldImportLine = importMatch[0];
  const newImportLine = `${importMatch[1]}${newImportPath}${importMatch[2]}`;

  if (oldTagStillExists) {
    // Mantém import antigo E adiciona o novo (se não existe)
    if (!newImportExists) {
      const insertPos = importMatch.index + oldImportLine.length;
      return source.substring(0, insertPos) + '\n' + newImportLine + source.substring(insertPos);
    }
    return source;
  } else {
    // Remove import antigo e adiciona o novo (se não existe)
    if (newImportExists) {
      // Apenas remove o antigo
      return source.replace(oldImportLine, '').replace(/\n\n\n+/g, '\n\n');
    } else {
      // Substitui o antigo pelo novo
      return source.replace(oldImportLine, newImportLine);
    }
  }
}

/**
 * Adiciona uma linha de import no source, após o último import existente.
 */
function addImport(source: string, importPath: string): string {
  const newImportLine = `import '${importPath}';`;

  // Encontra a posição do último import no source
  const importRegex = /^import\s+.+;?\s*$/gm;
  let lastImportEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(source)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }

  if (lastImportEnd > 0) {
    return source.substring(0, lastImportEnd) + '\n' + newImportLine + source.substring(lastImportEnd);
  }

  // Sem imports — insere no topo (após a primeira linha)
  const firstNewline = source.indexOf('\n');
  if (firstNewline >= 0) {
    return source.substring(0, firstNewline + 1) + newImportLine + '\n' + source.substring(firstNewline + 1);
  }

  return newImportLine + '\n' + source;
}

/**
 * Monta o path de import a partir de um fileInfo.
 * Padrão: /_${project}_/l2/${folder}/${shortName}.js
 */
function buildImportPath(fileInfo: { project: number; shortName: string; folder: string }): string {
  const { project, shortName, folder } = fileInfo;
  if (folder) {
    return `/_${project}_/l2/${folder}/${shortName}.js`;
  }
  return `/_${project}_/l2/${shortName}.js`;
}

/**
 * Determina qual ocorrência da tag no template corresponde ao selectorPath.
 * 
 * Analisa o path para extrair o nth-of-type se presente, ou conta a posição.
 * Ex: "page > main > ml-input:nth-of-type(2)" → ocorrência 1 (0-indexed)
 * Ex: "page > main > ml-input" → ocorrência 0 (primeira)
 * 
 * @returns Índice da ocorrência (0-based), ou -1 se não determinável (troca todas)
 */
function getOccurrenceFromPath(oldTag: string, selectorPath?: string): number {
  if (!selectorPath) return -1;

  // Pega o último segmento do path
  const segments = selectorPath.split('>').map(s => s.trim());
  const lastSegment = segments[segments.length - 1];

  if (!lastSegment) return -1;

  // Verifica se o último segmento é a tag que estamos procurando
  const tagLower = oldTag.toLowerCase();
  const segLower = lastSegment.toLowerCase();

  if (!segLower.startsWith(tagLower)) return -1;

  // Extrai nth-of-type se presente
  const nthMatch = lastSegment.match(/:nth-of-type\((\d+)\)/i);
  if (nthMatch) {
    return parseInt(nthMatch[1], 10) - 1; // CSS é 1-based, queremos 0-based
  }

  // Sem nth-of-type → primeira ocorrência
  return 0;
}

/**
 * Escapa caracteres especiais de regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}