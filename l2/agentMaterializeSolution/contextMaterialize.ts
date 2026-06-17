/// <mls fileReference="_102020_/l2/agentMaterializeSolution/contextMaterialize.ts" enhancement="_blank"/>

import { collabImport } from '/_102027_/l2/collabImport.js';
import {
  getContentByMlsPath,
  parseDefinitionFromContent,
  parsePipelineFromContent,
  parseMlsPath,
  readProjectJson,
  toMlsPath,
  loadModuleByBuild,
  loadRulesForIds,
  getDtsForFile,
  getFileImports,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type {
  PipelineItem,
  L1FileType,
  L2FileType,
  ProjectJson,
  VisualStyle,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GenContext {
  pipelineItem: PipelineItem;
  fileType: L1FileType | L2FileType;
  definition: string;
  skillSections: string[];    // content blocks for the system prompt
  contextSections: string[];  // def-context + dep blocks for the human prompt
  resolvedRules: Record<string, unknown>[];
  visualStyle?: VisualStyle;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function buildGenContext(defPath: string): Promise<GenContext> {
  const parsed = parseMlsPath(defPath);
  if (!parsed) throw new Error(`[contextMaterialize] invalid defPath: ${defPath}`);
  const { project, folder } = parsed;
  const moduleName = folder.split('/')[0];

  // Read .defs.ts
  const defsContent = await getContentByMlsPath(defPath);
  if (!defsContent) throw new Error(`[contextMaterialize] .defs.ts not found: ${defPath}`);

  const definition = parseDefinitionFromContent(defsContent);
  const pipeline = parsePipelineFromContent(defsContent);
  if (!pipeline?.length) throw new Error(`[contextMaterialize] no pipeline in: ${defPath}`);
  const pipelineItem = pipeline[0];
  const fileType = resolveFileType(pipelineItem.type);

  // Project data
  const projectJson = await readProjectJson();
  const moduleExports = await loadModuleExports(project, moduleName);

  // Skills
  const skillPaths = resolveSkillPaths(fileType, moduleExports, projectJson);
  const skillSections: string[] = [];
  const defContextSections: string[] = [];
  for (const sp of skillPaths) {
    const clean = sp.startsWith('/') ? sp.slice(1) : sp;
    if (/^_\d+_$/.test(clean)) {
      const content = await loadProjectDefinition(clean);
      if (content) defContextSections.push(`### Project Definition (${clean})
\`\`\`typescript
${content}
\`\`\``);
    } else {
      const content = await loadSkillContent(sp);
      if (content) skillSections.push(`<!-- skill: ${sp} -->
${content}`);
    }
  }

  // Visual style (page only)
  const visualStyle = fileType === 'page' && projectJson
    ? projectJson.modules.find(m => m.moduleName === moduleName)?.module?.visualStyle
    : undefined;

  // Business rules
  let resolvedRules: Record<string, unknown>[] = [];
  if (pipelineItem.rulesApplied?.length) {
    resolvedRules = await loadRulesForIds(project, moduleName, pipelineItem.rulesApplied);
  }

  // dependsFiles — prefer .d.ts; include first-level same-project imports; deduplicate
  const seen = new Set<string>();
  const depSections: string[] = [];

  async function addDep(path: string): Promise<void> {
    if (seen.has(path)) return;
    seen.add(path);
    const p = parseMlsPath(path);
    const content = p
      ? await getDtsForFile(p.project, p.level, p.folder, p.shortName)
      : await getContentByMlsPath(path) ?? '';
    if (content) depSections.push(`### ${path}
\`\`\`typescript
${content}
\`\`\``);
  }

  for (const dep of pipelineItem.dependsFiles) {
    await addDep(dep);
    const p = parseMlsPath(dep);
    if (p) {
      for (const imp of getFileImports(p.project, p.level, p.folder, p.shortName)) {
        await addDep(imp);
      }
    }
  }

  return {
    pipelineItem,
    fileType,
    definition,
    skillSections,
    contextSections: [...defContextSections, ...depSections],
    resolvedRules,
    visualStyle,
  };
}

// ─── File type resolver ───────────────────────────────────────────────────────

export function resolveFileType(itemType: string): L1FileType | L2FileType {
  const map: Record<string, L1FileType | L2FileType> = {
    layer_1_external:    'layer1',
    layer_4_entities:    'layer4',
    layer_3_usecases:    'layer3',
    layer_2_controllers: 'layer2',
    l2_contract:         'contract',
    l2_shared:           'shared',
    l2_page:             'page',
  };
  return (map[itemType] ?? 'layer1') as L1FileType | L2FileType;
}

// ─── Skill resolution ─────────────────────────────────────────────────────────

const NEEDS_DEFINITION: string[] = ['layer1', 'layer4'];

function resolveSkillPaths(
  fileType: L1FileType | L2FileType,
  moduleExports: any,
  projectJson: ProjectJson | null,
): string[] {
  if (!moduleExports) return [];

  if (fileType === 'contract') return moduleExports.skills?.contract?.skillPath ?? [];

  if (fileType === 'shared') {
    const p = moduleExports.shared?.web?.sharedSkill as string | undefined;
    return p ? [p] : [];
  }

  if (fileType === 'page') {
    const genome = moduleExports.moduleGenome?.['web/desktop/page11'];
    if (!genome) return [];
    const paths: string[] = [];
    if (genome.layout && projectJson) {
      const entry = Object.values(projectJson.layouts ?? {}).find(l => l.name === genome.layout);
      if (entry?.skill) paths.push(entry.skill);
    }
    if (genome.designSystem && projectJson) {
      const entry = Object.values(projectJson.designSystems ?? {}).find(d => d.name === genome.designSystem);
      if (entry?.skill) paths.push(entry.skill);
    }
    return paths;
  }

  // L1 types: layer1, layer2, layer3, layer4
  const paths: string[] = [...(moduleExports.skills?.[fileType]?.skillPath ?? [])];
  if (NEEDS_DEFINITION.includes(fileType)) {
    const defPaths: string[] = moduleExports.skills?.definition?.skillPath ?? [];
    paths.push(...defPaths);
  }
  return paths;
}

// ─── Module loader ────────────────────────────────────────────────────────────

async function loadModuleExports(project: number, moduleName: string): Promise<any> {
  const path = toMlsPath(project, 2, moduleName, 'module', '.ts');
  const f = mls.stor.convertFileReferenceToFile(path);
  if (!f) return null;
  try {
    return await collabImport(f);
  } catch {
    return await loadModuleByBuild(path);
  }
}

// ─── Skill content loaders ────────────────────────────────────────────────────

async function loadProjectDefinition(projectRef: string): Promise<string> {
  const models = (mls as any).editor?.models;
  if (!models?.[projectRef]?.ts) return '';
  return models[projectRef].ts.model?.getValue?.() ?? '';
}

async function loadSkillContent(skillPath: string): Promise<string> {
  const clean = skillPath.startsWith('/') ? skillPath.slice(1) : skillPath;

  if (clean.endsWith('.md')) return await getContentByMlsPath(clean) ?? '';

  const f = mls.stor.convertFileReferenceToFile(clean);
  if (!f) return '';

  let mod: any;
  try {
    mod = await collabImport(f);
  } catch {
    mod = await loadModuleByBuild(clean);
  }

  if (typeof mod?.skill === 'string') return mod.skill;
  return await getContentByMlsPath(clean) ?? '';
}


"## Definition

## Definition
\\`\\`\\`JSON
[
  {
    \"commandName\": \"listarItensCardapio\",
    \"purpose\": \"Exibir itens do cardápio\",
    \"kind\": \"query\",
    \"input\": [
      {
        \"name\": \"categoriaId\",
        \"type\": \"string\",
        \"required\": false
      },
      {
        \"name\": \"disponivel\",
        \"type\": \"boolean\",
        \"required\": false
      }
    ],
    \"output\": [
      {
        \"name\": \"menuItemId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"nome\",
        \"type\": \"string\"
      },
      {
        \"name\": \"preco\",
        \"type\": \"number\"
      },
      {
        \"name\": \"categoriaId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"ativo\",
        \"type\": \"boolean\"
      }
    ],
    \"readsEntities\": [
      \"MenuItem\",
      \"MenuCategory\"
    ],
    \"writesEntities\": [],
    \"readsTables\": [],
    \"writesTables\": [],
    \"usecaseRefs\": [
      \"listarItensCardapio\"
    ],
    \"layerContract\": {
      \"controllerLayer\": \"layer_2_controllers\",
      \"mustCallLayer\": \"layer_3_usecases\",
      \"directTableAccessForbidden\": true
    },
    \"rulesApplied\": []
  },
  {
    \"commandName\": \"listarCategoriasCardapio\",
    \"purpose\": \"Exibir categorias do cardápio para seleção\",
    \"kind\": \"query\",
    \"input\": [],
    \"output\": [
      {
        \"name\": \"categoriaId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"nome\",
        \"type\": \"string\"
      },
      {
        \"name\": \"ativo\",
        \"type\": \"boolean\"
      }
    ],
    \"readsEntities\": [
      \"MenuCategory\"
    ],
    \"writesEntities\": [],
    \"readsTables\": [],
    \"writesTables\": [],
    \"usecaseRefs\": [
      \"listarCategoriasCardapio\"
    ],
    \"layerContract\": {
      \"controllerLayer\": \"layer_2_controllers\",
      \"mustCallLayer\": \"layer_3_usecases\",
      \"directTableAccessForbidden\": true
    },
    \"rulesApplied\": []
  },
  {
    \"commandName\": \"criarOuAtualizarItemCardapio\",
    \"purpose\": \"Criar ou atualizar item do cardápio\",
    \"kind\": \"command\",
    \"input\": [
      {
        \"name\": \"menuItemId\",
        \"type\": \"string\",
        \"required\": false
      },
      {
        \"name\": \"nome\",
        \"type\": \"string\",
        \"required\": true
      },
      {
        \"name\": \"preco\",
        \"type\": \"number\",
        \"required\": true
      },
      {
        \"name\": \"categoriaId\",
        \"type\": \"string\",
        \"required\": true
      },
      {
        \"name\": \"ativo\",
        \"type\": \"boolean\",
        \"required\": true
      }
    ],
    \"output\": [
      {
        \"name\": \"menuItemId\",
        \"type\": \"string\"
      }
    ],
    \"readsEntities\": [
      \"MenuCategory\"
    ],
    \"writesEntities\": [
      \"MenuItem\"
    ],
    \"readsTables\": [],
    \"writesTables\": [],
    \"usecaseRefs\": [
      \"criarOuAtualizarItemCardapio\"
    ],
    \"layerContract\": {
      \"controllerLayer\": \"layer_2_controllers\",
      \"mustCallLayer\": \"layer_3_usecases\",
      \"directTableAccessForbidden\": true
    },
    \"rulesApplied\": [
      \"menuItemRequiresCategory\"
    ]
  },
  {
    \"commandName\": \"listarItensEstoque\",
    \"purpose\": \"Exibir itens de estoque com quantidades\",
    \"kind\": \"query\",
    \"input\": [
      {
        \"name\": \"categoriaId\",
        \"type\": \"string\",
        \"required\": false
      },
      {
        \"name\": \"status\",
        \"type\": \"string\",
        \"required\": false
      }
    ],
    \"output\": [
      {
        \"name\": \"stockItemId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"nome\",
        \"type\": \"string\"
      },
      {
        \"name\": \"quantidadeAtual\",
        \"type\": \"number\"
      },
      {
        \"name\": \"unidadeMedidaId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"quantidadeMinima\",
        \"type\": \"number\"
      },
      {
        \"name\": \"status\",
        \"type\": \"string\"
      }
    ],
    \"readsEntities\": [
      \"StockItem\",
      \"UnitOfMeasure\"
    ],
    \"writesEntities\": [],
    \"readsTables\": [],
    \"writesTables\": [],
    \"usecaseRefs\": [
      \"listarItensEstoque\"
    ],
    \"layerContract\": {
      \"controllerLayer\": \"layer_2_controllers\",
      \"mustCallLayer\": \"layer_3_usecases\",
      \"directTableAccessForbidden\": true
    },
    \"rulesApplied\": []
  },
  {
    \"commandName\": \"criarOuAtualizarItemEstoque\",
    \"purpose\": \"Criar ou atualizar item de estoque\",
    \"kind\": \"command\",
    \"input\": [
      {
        \"name\": \"stockItemId\",
        \"type\": \"string\",
        \"required\": false
      },
      {
        \"name\": \"nome\",
        \"type\": \"string\",
        \"required\": true
      },
      {
        \"name\": \"unidadeMedidaId\",
        \"type\": \"string\",
        \"required\": true
      },
      {
        \"name\": \"quantidadeMinima\",
        \"type\": \"number\",
        \"required\": true
      },
      {
        \"name\": \"ativo\",
        \"type\": \"boolean\",
        \"required\": true
      }
    ],
    \"output\": [
      {
        \"name\": \"stockItemId\",
        \"type\": \"string\"
      }
    ],
    \"readsEntities\": [
      \"UnitOfMeasure\"
    ],
    \"writesEntities\": [
      \"StockItem\"
    ],
    \"readsTables\": [],
    \"writesTables\": [],
    \"usecaseRefs\": [
      \"criarOuAtualizarItemEstoque\"
    ],
    \"layerContract\": {
      \"controllerLayer\": \"layer_2_controllers\",
      \"mustCallLayer\": \"layer_3_usecases\",
      \"directTableAccessForbidden\": true
    },
    \"rulesApplied\": []
  },
  {
    \"commandName\": \"registrarMovimentacaoEstoque\",
    \"purpose\": \"Registrar entrada/saída/ajuste de estoque\",
    \"kind\": \"command\",
    \"input\": [
      {
        \"name\": \"stockItemId\",
        \"type\": \"string\",
        \"required\": true
      },
      {
        \"name\": \"movementType\",
        \"type\": \"string\",
        \"required\": true
      },
      {
        \"name\": \"quantity\",
        \"type\": \"number\",
        \"required\": true
      },
      {
        \"name\": \"reason\",
        \"type\": \"string\",
        \"required\": false
      },
      {
        \"name\": \"occurredAt\",
        \"type\": \"date\",
        \"required\": true
      }
    ],
    \"output\": [
      {
        \"name\": \"stockMovementId\",
        \"type\": \"string\"
      }
    ],
    \"readsEntities\": [
      \"StockItem\",
      \"UnitOfMeasure\"
    ],
    \"writesEntities\": [
      \"StockMovement\",
      \"LowStockAlert\"
    ],
    \"readsTables\": [],
    \"writesTables\": [
      \"stock_movements\",
      \"low_stock_alerts\",
      \"low_stock_metrics\"
    ],
    \"usecaseRefs\": [
      \"registrarMovimentacaoEstoque\"
    ],
    \"layerContract\": {
      \"controllerLayer\": \"layer_2_controllers\",
      \"mustCallLayer\": \"layer_3_usecases\",
      \"directTableAccessForbidden\": true
    },
    \"rulesApplied\": [
      \"lowStockThresholdRule\"
    ]
  },
  {
    \"commandName\": \"listarMovimentacoesEstoque\",
    \"purpose\": \"Exibir histórico de movimentações\",
    \"kind\": \"query\",
    \"input\": [
      {
        \"name\": \"stockItemId\",
        \"type\": \"string\",
        \"required\": false
      },
      {
        \"name\": \"dataInicio\",
        \"type\": \"date\",
        \"required\": false
      },
      {
        \"name\": \"dataFim\",
        \"type\": \"date\",
        \"required\": false
      }
    ],
    \"output\": [
      {
        \"name\": \"stockMovementId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"stockItemId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"movementType\",
        \"type\": \"string\"
      },
      {
        \"name\": \"quantity\",
        \"type\": \"number\"
      },
      {
        \"name\": \"reason\",
        \"type\": \"string\"
      },
      {
        \"name\": \"occurredAt\",
        \"type\": \"date\"
      }
    ],
    \"readsEntities\": [
      \"StockMovement\"
    ],
    \"writesEntities\": [],
    \"readsTables\": [
      \"stock_movements\"
    ],
    \"writesTables\": [],
    \"usecaseRefs\": [
      \"listarMovimentacoesEstoque\"
    ],
    \"layerContract\": {
      \"controllerLayer\": \"layer_2_controllers\",
      \"mustCallLayer\": \"layer_3_usecases\",
      \"directTableAccessForbidden\": true
    },
    \"rulesApplied\": []
  },
  {
    \"commandName\": \"listarAlertasEstoqueBaixo\",
    \"purpose\": \"Exibir alertas de estoque baixo\",
    \"kind\": \"query\",
    \"input\": [
      {
        \"name\": \"status\",
        \"type\": \"string\",
        \"required\": false
      }
    ],
    \"output\": [
      {
        \"name\": \"lowStockAlertId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"stockItemId\",
        \"type\": \"string\"
      },
      {
        \"name\": \"triggeredAt\",
        \"type\": \"date\"
      },
      {
        \"name\": \"currentQuantity\",
        \"type\": \"number\"
      },
      {
        \"name\": \"minimumQuantity\",
        \"type\": \"number\"
      },
      {
        \"name\": \"status\",
        \"type\": \"string\"
      }
    ],
    \"readsEntities\": [
      \"LowStockAlert\"
    ],
    \"writesEntities\": [],
    \"readsTables\": [
      \"low_stock_alerts\"
    ],
    \"writesTables\": [],
    \"usecaseRefs\": [
      \"listarAlertasEstoqueBaixo\"
    ],
    \"layerContract\": {
      \"controllerLayer\": \"layer_2_controllers\",
      \"mustCallLayer\": \"layer_3_usecases\",
      \"directTableAccessForbidden\": true
    },
    \"rulesApplied\": [
      \"lowStockThresholdRule\"
    ]
  }
]
\\`\\`\\`

## Business Rules

```json
[
  {
    \"ruleId\": \"lowStockThresholdRule\",
    \"title\": \"Regra de estoque baixo\",
    \"description\": \"Gerar alerta quando nível de estoque ficar abaixo do mínimo definido.\",
    \"appliesTo\": [
      \"StockItem\",
      \"LowStockAlert\",
      \"StockMovement\"
    ],
    \"layer\": \"layer_3\"
  },
  {
    \"ruleId\": \"menuItemRequiresCategory\",
    \"title\": \"Item do cardápio deve ter categoria\",
    \"description\": \"Todo item do cardápio deve estar associado a uma categoria ativa.\",
    \"appliesTo\": [
      \"MenuItem\",
      \"MenuCategory\"
    ],
    \"layer\": \"layer_1\"
  }
]
```

## Context Files

### _102043_/l1/cafeFlow/layer_3_usecases/listarItensCardapio.ts
```typescript
import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { type CardapioRecord } from '/_102043_/l1/cafeFlow/layer_4_entities/cardapioEntity.js';
export interface ListarItensCardapioInput {
}
export interface ListarItensCardapioOutput {
    itensCardapio: CardapioRecord[];
}
export declare function listarItensCardapio(ctx: RequestContext, _input: ListarItensCardapioInput): Promise<ListarItensCardapioOutput>;
export declare const implementation: {
    readonly functionName: \"listarItensCardapio\";
    readonly inputTypeName: \"ListarItensCardapioInput\";
    readonly outputTypeName: \"ListarItensCardapioOutput\";
    readonly tsFileRef: \"_102043_/l1/cafeFlow/layer_3_usecases/listarItensCardapio.ts\";
};

```
### _102043_/l1/cafeFlow/layer_3_usecases/listarCategoriasCardapio.ts
```typescript
import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { type MenuCategory } from '/_102043_/l1/cafeFlow/layer_4_entities/cardapioEntity.js';
export interface ListarCategoriasCardapioInput {
}
export interface ListarCategoriasCardapioOutput {
    categorias: MenuCategory[];
}
export declare function listarCategoriasCardapio(ctx: RequestContext, _input: ListarCategoriasCardapioInput): Promise<ListarCategoriasCardapioOutput>;

```
### _102043_/l1/cafeFlow/layer_3_usecases/criarOuAtualizarItemCardapio.ts
```typescript
import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { type CardapioRecord, type CreateCardapioInput, type UpdateCardapioInput } from '/_102043_/l1/cafeFlow/layer_4_entities/cardapioEntity.js';
export type CriarOuAtualizarItemCardapioEntityInput = CreateCardapioInput | UpdateCardapioInput;
export interface CriarOuAtualizarItemCardapioInput {
    cardapioEntity: CriarOuAtualizarItemCardapioEntityInput;
}
export interface CriarOuAtualizarItemCardapioOutput {
    cardapioEntity: CardapioRecord;
}
export declare function criarOuAtualizarItemCardapio(ctx: RequestContext, input: CriarOuAtualizarItemCardapioInput): Promise<CriarOuAtualizarItemCardapioOutput>;

```
### _102043_/l1/cafeFlow/layer_3_usecases/listarItensEstoque.ts
```typescript
import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { type EstoqueRecord } from '/_102043_/l1/cafeFlow/layer_4_entities/estoqueEntity.js';
export interface ListarItensEstoqueInput {
}
export interface ListarItensEstoqueOutput {
    itensEstoque: EstoqueRecord[];
}
export declare function listarItensEstoque(ctx: RequestContext, _input: ListarItensEstoqueInput): Promise<ListarItensEstoqueOutput>;

```
### _102043_/l1/cafeFlow/layer_3_usecases/criarOuAtualizarItemEstoque.ts
```typescript
import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { type CreateEstoqueInput, type EstoqueRecord, type UpdateEstoqueInput } from '/_102043_/l1/cafeFlow/layer_4_entities/estoqueEntity.js';
export interface CriarOuAtualizarItemEstoqueInput {
    estoqueEntity: CreateEstoqueInput | UpdateEstoqueInput;
}
export interface CriarOuAtualizarItemEstoqueOutput {
    estoqueEntity: EstoqueRecord;
}
export declare function criarOuAtualizarItemEstoque(ctx: RequestContext, input: CriarOuAtualizarItemEstoqueInput): Promise<CriarOuAtualizarItemEstoqueOutput>;

```
### _102043_/l1/cafeFlow/layer_3_usecases/registrarMovimentacaoEstoque.ts
```typescript
import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { type EstoqueMovementType } from '/_102043_/l1/cafeFlow/layer_4_entities/estoqueEntity.js';
export interface RegistrarMovimentacaoEstoqueInput {
    stockItemId: string;
    movementType: EstoqueMovementType;
    quantity: number;
    unitOfMeasureId: string;
    movementDate?: string | Date;
    reason?: string;
}
export interface RegistrarMovimentacaoEstoqueOutput {
    stockItemId: string;
    quantity: number;
}
export declare function registrarMovimentacaoEstoque(ctx: RequestContext, input: RegistrarMovimentacaoEstoqueInput): Promise<RegistrarMovimentacaoEstoqueOutput>;

```
### _102043_/l1/cafeFlow/layer_3_usecases/listarMovimentacoesEstoque.ts
```typescript
import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { type EstoqueRecord } from '/_102043_/l1/cafeFlow/layer_4_entities/estoqueEntity.js';
export interface ListarMovimentacoesEstoqueInput {
}
export interface ListarMovimentacoesEstoqueOutput {
    movimentacoes: EstoqueRecord[];
}
export declare function listarMovimentacoesEstoque(ctx: RequestContext, _input: ListarMovimentacoesEstoqueInput): Promise<ListarMovimentacoesEstoqueOutput>;

```
### _102043_/l1/cafeFlow/layer_3_usecases/listarAlertasEstoqueBaixo.ts
```typescript
import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { EstoqueRecord } from '/_102043_/l1/cafeFlow/layer_4_entities/estoqueEntity.js';
export interface ListarAlertasEstoqueBaixoInput {
}
export interface ListarAlertasEstoqueBaixoOutput {
    alertas: EstoqueRecord[];
}
export declare function listarAlertasEstoqueBaixo(_ctx: RequestContext, _input: ListarAlertasEstoqueBaixoInput): Promise<ListarAlertasEstoqueBaixoOutput>;

```

Generate the file `_102043_/l1/cafeFlow/layer_2_controllers/cardapioEstoque.ts` and call submitGeneratedTs with the complete code."