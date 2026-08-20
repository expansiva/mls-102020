/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c2-clarify/gate.ts" enhancement="_blank"/>

// Gate + pure logic of the collision checkpoint (unit-testable, no DOM).
// The step itself only mounts the widget and applies intents; everything that DECIDES lives
// here: which options exist for this mode, whether an answer is admissible, and what the
// answer does to the context.

import type { CopyContext, CopyItem, CopyMode } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';

export interface CGateIssue {
  code: string;
  message: string;
}

// Option ids are the contract between the widget and this logic.
export const SINGLE_OPTIONS = ['replace', 'cancel', 'rename'] as const;
export const BATCH_OPTIONS = ['replace-all', 'ignore-existing', 'cancel'] as const;
export type CollisionChoice = typeof SINGLE_OPTIONS[number] | typeof BATCH_OPTIONS[number];

export const COLLISION_QUESTION_ID = 'collision.policy';

export function optionsFor(mode: CopyMode): readonly string[] {
  return mode === 'single' ? SINGLE_OPTIONS : BATCH_OPTIONS;
}

// Rename exists only for one molecule: renaming item by item does not scale to 12, and the
// widget says so (control decision 1).
export function renameAllowed(mode: CopyMode): boolean {
  return mode === 'single';
}

export interface CClarifyAnswer {
  choice: string;
  newShortName?: string;   // free-text of the widget, only meaningful for 'rename'
}

export interface CClarifyInputs {
  context: CopyContext;
  answer: CClarifyAnswer;
  // Destination shortNames that already exist in the group, so a rename can be validated
  // against a FRESH collision (renaming into another existing molecule is not a fix).
  existingShortNames: string[];
}

export function runClarifyGate(inputs: CClarifyInputs): CGateIssue[] {
  const issues: CGateIssue[] = [];
  const { context: ctx, answer } = inputs;
  const colliding = ctx.items.filter(item => !!item.collision);

  if (!colliding.length) {
    issues.push({ code: 'no_collision', message: 'o checkpoint não deveria ter perguntado: nenhuma colisão no contexto' });
    return issues;
  }
  if (!optionsFor(ctx.mode).includes(answer.choice)) {
    issues.push({ code: 'choice', message: `escolha '${answer.choice}' não é válida no modo ${ctx.mode}` });
    return issues;
  }
  if (answer.choice !== 'rename') return issues;

  if (!renameAllowed(ctx.mode)) {
    issues.push({ code: 'rename_mode', message: 'renomear existe apenas ao copiar uma molécula — em lote, rode item a item' });
    return issues;
  }
  const newShortName = (answer.newShortName || '').trim();
  if (!newShortName) {
    issues.push({ code: 'rename_empty', message: 'renomear exige o novo nome da molécula (campo de texto do widget)' });
    return issues;
  }
  if (!/^ml-[a-z0-9]+(-[a-z0-9]+)*$/.test(newShortName)) {
    issues.push({ code: 'rename_format', message: `nome inválido '${newShortName}' — use kebab-case começando com 'ml-'` });
  }
  if (newShortName === colliding[0].origin.shortName) {
    issues.push({ code: 'rename_same', message: 'o novo nome é igual ao da origem — não resolveria a colisão' });
  }
  if (inputs.existingShortNames.includes(newShortName)) {
    issues.push({ code: 'rename_collision', message: `'${newShortName}' também já existe no grupo do projeto atual — escolha outro nome` });
  }
  return issues;
}

// What the answer DOES to the context. Pure: the step writes the result to disk.
// 'cancel' never reaches here — it fails the step with nothing written (decision 5).
export function applyChoiceToContext(ctx: CopyContext, answer: CClarifyAnswer): CopyContext {
  const choice = answer.choice;
  const items = ctx.items.map(item => {
    if (!item.collision) return item;
    if (choice === 'ignore-existing') return { ...item, skip: true };
    if (choice === 'rename') return { ...item, rename: (answer.newShortName || '').trim() };
    return item;  // replace / replace-all: the copy is written over the existing files
  });
  return { ...ctx, items };
}

export function collisionSummary(ctx: CopyContext, choice: string): string {
  const colliding = ctx.items.filter(item => !!item.collision);
  if (!colliding.length) return 'sem colisão';
  return `${colliding.length} colisão(ões) -> ${choice}`;
}

// The items a user-visible message should name, with the date of the copy that is at risk.
export function collisionLines(ctx: CopyContext): string[] {
  return ctx.items
    .filter(item => !!item.collision)
    .map((item: CopyItem) => {
      const when = item.collision?.copiedFrom ? ` (cópia atual: ${item.collision.copiedFrom})` : '';
      return `${item.destination.files.ts}${when}`;
    });
}
