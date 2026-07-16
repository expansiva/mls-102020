/// <mls fileReference="_102020_/l2/skills/molecules/playgroundGenerator.ts" enhancement="_blank"/>

export const skill = `
# Skill — Molecule Playground Generator
> Gera páginas HTML interativas de demonstração para Molecules do sistema Collab Aura.

---
## 1. Metadata

| Field       | Value                              |
|-------------|------------------------------------|
| **Name**    | \`moleculePlaygroundGenerator\`    |
| **Version** | \`2.6.0\`                          |

---

## 2. Tag Name — CRITICAL RULE

**Extract the component tag name MUST be copied verbatim from the \`@customElement(...)\` decorator in the \`.ts\` file.**
Use same tag in playground example

### Rules

- **Never derive** the tag name from the file name, class name, or folder path
- **Never reconstruct** the tag name using the naming convention formula
- **Always read** the \`@customElement(...)\` value from the \`.ts\` source
- Opening tag and closing tag MUST be **identical strings**

### Why

The naming convention formula (\`kebab-case(folder)--kebab-case(component)-(projectId)\`) is used when **creating** a new molecule. When **generating a playground** for an existing molecule, the tag already exists in the \`.ts\` — use it directly.

---

## 3. Property Analysis (was §2)

### 2.1 Classificação por Decorator

| Decorator | Vai no State? | Binding |
|-----------|---------------|---------|
| \`@propertyDataSource\` | ✓ SIM | \`{{playground.demo.prop}}\` |
| \`@propertyCompositeDataSource\` | ✓ SIM | \`{{playground.demo.prop}}\` |
| \`@property\` | ✗ NÃO | Valor direto |
| \`@state\` | ✗ NÃO | Não aparece |

## Attribute Names in HTML (non-string properties)

Properties decorated with \`@propertyDataSource\` that have type \`Boolean\`, \`Number\`, or \`Object\` and a camelCase name **must use the kebab-case \`attribute\` name in HTML**, not the TypeScript property name.

Always check the decorator in the \`.ts\` file to find the correct attribute name:

\`\`\`typescript
// Declared in the .ts
@propertyDataSource({ type: Boolean, attribute: 'is-editing' })
isEditing: boolean = false;

@propertyDataSource({ type: Number, attribute: 'max-length' })
maxLength: number | null = null;
\`\`\`

\`\`\`html
<!-- ❌ WRONG — TypeScript property name used as HTML attribute -->
<molecules--my-component isEditing="true" maxLength="100">

<!-- ✅ CORRECT — kebab-case attribute name from the decorator -->
<molecules--my-component is-editing="true" max-length="100">
\`\`\`

This applies to all HTML in the playground: \`<demo>\` element and \`<template>\` block.

---

## 4. State

### 3.1 Formato

\`\`\`html
<aura--molecules--playground--widget-playground-state-102020 state='playgroundDinamicState'></aura--molecules--playground--widget-playground-state-102020> // playgroundDinamicState will be replaced after, dont change
\`\`\`

### 3.2 Posição no HTML

O \`aura--molecules--playground--widget-playground-state-102020\` DEVE vir ANTES de qualquer demo no HTML.

### 3.3 Valores Default por Tipo

| Tipo | Default |
|------|---------|
| string | \`""\` |
| number | \`0\` |
| boolean | \`false\` |

---

## 5. Property Editors

### 4.1 Widget por Tipo

| Tipo da Propriedade | Widget |
|---------------------|--------|
| string | \`aura--molecules--playground--widget-playground-state-text-102020\` |
| string \| null | \`aura--molecules--playground--widget-playground-state-text-102020\` |
| number | \`aura--molecules--playground--widget-playground-state-number-102020\` |
| number \| null | \`aura--molecules--playground--widget-playground-state-number-102020\` |
| boolean | \`aura--molecules--playground--widget-playground-state-boolean-102020\` |

### 4.2 Exemplos

**String:**
\`\`\`html
<aura--molecules--playground--widget-playground-state-text-102020 label="error" value="{{playground.basic.error}}"></aura--molecules--playground--widget-playground-state-text-102020>
\`\`\`

**Number:**
\`\`\`html
<aura--molecules--playground--widget-playground-state-number-102020 label="value" value="{{playground.basic.value}}"></aura--molecules--playground--widget-playground-state-number-102020>
\`\`\`

**Boolean:**
\`\`\`html
<aura--molecules--playground--widget-playground-state-boolean-102020 label="showIcon" value="{{playground.basic.showIcon}}"></aura--molecules--playground--widget-playground-state-boolean-102020>
\`\`\`

---

## 6. Styling (Tailwind)

All elements MUST include \`dark:\` variants so the playground renders correctly in both light and dark themes.

| Elemento | Classes |
|----------|---------|
| Page root | \`bg-white dark:bg-slate-900 min-h-screen\` |
| Container | \`mx-auto p-8 font-sans\` |
| Header | \`text-center mb-12\` |
| Title | \`text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-2\` |
| Badge | \`inline-block px-3 py-1 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 rounded-full text-sm font-medium\` |
| Grid | \`grid grid-cols-1 md:grid-cols-2 gap-6 mb-12\` |
| Card | \`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6\` |
| Card Title | \`text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4\` |
| Details | \`mt-4\` |
| Summary | \`cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400\` |
| Details Content | \`mt-2 p-4 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900\` |

---

## 7. HTML Structure

### 6.1 Ordem dos Elementos

1. Container
2. Header
3. \`aura--molecules--playground--widget-playground-state-102020\` (SEMPRE antes das demos)
4. Section com demos

### 6.2 Demo Card

\`\`\`html
<div class="bg-white dark:bg-slate-900 min-h-screen">
<div class="mx-auto p-8 font-sans">

  <header class="text-center mb-12">
    <h1 class="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Component Name</h1>
    <span class="inline-block px-3 py-1 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 rounded-full text-sm font-medium">skill group</span>
  </header>

  <aura--molecules--playground--widget-playground-state-102020 state='playgroundDinamicState'>
  </aura--molecules--playground--widget-playground-state-102020>

  <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
    <article class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Basic</h3>
      <demo id="demo-basic">
        <molecules--ml-component 
          value="{{playground.basic.value}}"
          error="{{playground.basic.error}}"
          disabled="false"
          is-editing="true">
          <Label>Field</Label>
        </molecules--ml-component>
      </demo>
      <details class="mt-4">
        <summary class="cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400">Properties</summary>
        <div class="mt-2 p-4 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900">
          <aura--molecules--playground--widget-playground-state-number-102020 label="value" value="{{playground.basic.value}}"></aura--molecules--playground--widget-playground-state-number-102020>
          <aura--molecules--playground--widget-playground-state-text-102020 label="error" value="{{playground.basic.error}}"></aura--molecules--playground--widget-playground-state-text-102020>
        </div>
      </details>
      <details class="mt-2">
        <summary class="cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400">HTML</summary>
        <div class="mt-2">
          <aura--molecules--playground--widget-playground-state-preview-code-102020 target="demo-basic">
            <template>
<molecules--ml-component 
  value="{{playground.basic.value}}"
  error="{{playground.basic.error}}"
  disabled="false"
  is-editing="true">
  <Label>Field</Label>
</molecules--ml-component>
            </template>
          </aura--molecules--playground--widget-playground-state-preview-code-102020>
        </div>
      </details>
    </article>
  </section>

</div>
</div>
\`\`\`

### 6.3 Demo Element

O elemento \`<demo>\` DEVE:
- Ter um \`id\` único (ex: demo-basic, demo-disabled)
- Conter o HTML do componente (funciona independente do editor)

\`\`\`html
<demo id="demo-basic">
  <molecules--ml-component 
    value="{{playground.basic.value}}"
    error="{{playground.basic.error}}">
    <Label>Field</Label>
  </molecules--ml-component>
</demo>
\`\`\`

### 6.4 HTML Editor Widget

O \`aura--molecules--playground--widget-playground-state-preview-code-102020\` recebe:
- \`target\`: id do elemento demo (para atualizar ao editar)
- \`<template>\`: código HTML fonte (para exibir formatado no editor)

**IMPORTANTE:** O HTML deve estar duplicado - no \`<demo>\` E no \`<template>\`.

\`\`\`html
<aura--molecules--playground--widget-playground-state-preview-code-102020 target="demo-basic">
  <template>
<molecules--ml-component 
  value="{{playground.basic.value}}"
  error="{{playground.basic.error}}">
  <Label>Field</Label>
</molecules--ml-component>
  </template>
</aura--molecules--playground--widget-playground-state-preview-code-102020>
\`\`\`

O widget:
1. Lê o HTML do \`<template>\` (código fonte, não compilado)
2. Exibe formatado no editor com syntax highlighting
3. Ao editar, atualiza o innerHTML do \`<demo>\` target em tempo real

---

## 8. Checklist

- [ ] Tag name copied verbatim from \`@customElement(...)\` in the \`.ts\` file
- [ ] Opening tag and closing tag are identical strings
- [ ] aura--molecules--playground--widget-playground-state-102020 vem ANTES das demos
- [ ] Cada demo tem namespace próprio
- [ ] Cada \`<demo>\` tem id único e contém o HTML do componente
- [ ] string → aura--molecules--playground--widget-playground-state-text-102020
- [ ] number → aura--molecules--playground--widget-playground-state-number-102020
- [ ] boolean → aura--molecules--playground--widget-playground-state-boolean-102020
- [ ] HTML duplicado: no \`<demo>\` E no \`<template>\` do editor
- [ ] \`<demo>\` sem class/style
- [ ] Page root tem \`dark:bg-slate-900\`
- [ ] Todos os elementos de cor têm variante \`dark:\`

---

## 9. Changelog

| Version | Date       | Description |
|---------|------------|-------------|
| 2.1.0   | 2026-04-15 | Using dedicated widgets with -102020 suffix |
| 2.2.0   | 2026-04-16 | Added HTML editor widget for live code editing |
| 2.3.0   | 2026-04-16 | HTML editor uses template element for source code |
| 2.4.0   | 2026-04-16 | HTML duplicated in demo AND template - demo works independently |
| 2.5.0   | 2026-04-17 | Added §2 explicit rule: tag name must be copied from @customElement, never derived |
| 2.6.0   | 2026-04-22 | Added dark mode: dark: variants on all styling elements, page root wrapper, updated Demo Card example and checklist |

`