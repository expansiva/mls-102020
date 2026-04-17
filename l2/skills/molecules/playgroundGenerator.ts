/// <mls fileReference="_102020_/l2/skills/molecules/playgroundGenerator.ts" enhancement="_blank"/>

export const skill = `
# Skill — Molecule Playground Generator
> Gera páginas HTML interativas de demonstração para Molecules do sistema Collab Aura.

---

## 1. Metadata

| Field       | Value                              |
|-------------|------------------------------------|
| **Name**    | \`moleculePlaygroundGenerator\`    |
| **Version** | \`2.4.0\`                          |

---

## 2. Tag Name — CRITICAL RULE

**The component tag name MUST be copied verbatim from the \`@customElement(...)\` decorator in the \`.ts\` file.**

\`\`\`typescript
// In the .ts file:
@customElement('molecules--group-enter-datetime--datetime-popup-picker-102020')
\`\`\`

\`\`\`html
<!-- In the playground — use EXACTLY the same string, opening AND closing tag: -->
<molecules--group-enter-datetime--datetime-popup-picker-102020 ...>
</molecules--group-enter-datetime--datetime-popup-picker-102020>
\`\`\`

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

---

## 4. State

### 3.1 Formato

\`\`\`html
<widget-playground-state-102020 state='{"playground":{"basic":{"value":0,"error":""}}}'>
</widget-playground-state-102020>
\`\`\`

### 3.2 Posição no HTML

O \`widget-playground-state-102020\` DEVE vir ANTES de qualquer demo no HTML.

### 3.3 Regras

- JSON válido
- Uma linha
- Apenas propriedades @propertyDataSource
- Sempre usar valores default (nunca null ou undefined)

### 3.4 Valores Default por Tipo

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
| string | \`widget-playground-state-text-102020\` |
| string \\| null | \`widget-playground-state-text-102020\` |
| number | \`widget-playground-state-number-102020\` |
| number \\| null | \`widget-playground-state-number-102020\` |
| boolean | \`widget-playground-state-boolean-102020\` |

### 4.2 Exemplos

**String:**
\`\`\`html
<widget-playground-state-text-102020 label="error" value="{{playground.basic.error}}"></widget-playground-state-text-102020>
\`\`\`

**Number:**
\`\`\`html
<widget-playground-state-number-102020 label="value" value="{{playground.basic.value}}"></widget-playground-state-number-102020>
\`\`\`

**Boolean:**
\`\`\`html
<widget-playground-state-boolean-102020 label="showIcon" value="{{playground.basic.showIcon}}"></widget-playground-state-boolean-102020>
\`\`\`

---

## 6. Styling (Tailwind)

| Elemento | Classes |
|----------|---------|
| Container | \`mx-auto p-8 font-sans\` |
| Header | \`text-center mb-12\` |
| Title | \`text-3xl font-semibold text-slate-800 mb-2\` |
| Badge | \`inline-block px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm font-medium\` |
| Grid | \`grid grid-cols-1 md:grid-cols-2 gap-6 mb-12\` |
| Card | \`bg-white border border-slate-200 rounded-xl p-6\` |
| Card Title | \`text-lg font-semibold text-slate-800 mb-4\` |
| Details | \`mt-4\` |
| Summary | \`cursor-pointer text-sm font-medium text-slate-500\` |
| Details Content | \`mt-2 p-4 border border-slate-200 rounded-lg\` |

---

## 7. HTML Structure

### 6.1 Ordem dos Elementos

1. Container
2. Header
3. \`widget-playground-state-102020\` (SEMPRE antes das demos)
4. Section com demos

### 6.2 Demo Card

\`\`\`html
<div class="mx-auto p-8 font-sans">

  <header class="text-center mb-12">
    <h1 class="text-3xl font-semibold text-slate-800 mb-2">Component Name</h1>
    <span class="inline-block px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">skill group</span>
  </header>

  <widget-playground-state-102020 state='{"playground":{"basic":{"value":0,"error":""}}}'>
  </widget-playground-state-102020>

  <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
    <article class="bg-white border border-slate-200 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-4">Basic</h3>
      <demo id="demo-basic">
        <molecules--component-102020 
          value="{{playground.basic.value}}"
          error="{{playground.basic.error}}"
          disabled="false"
          isEditing="true">
          <Label>Field</Label>
        </molecules--component-102020>
      </demo>
      <details class="mt-4">
        <summary class="cursor-pointer text-sm font-medium text-slate-500">Properties</summary>
        <div class="mt-2 p-4 border border-slate-200 rounded-lg">
          <widget-playground-state-number-102020 label="value" value="{{playground.basic.value}}"></widget-playground-state-number-102020>
          <widget-playground-state-text-102020 label="error" value="{{playground.basic.error}}"></widget-playground-state-text-102020>
        </div>
      </details>
      <details class="mt-2">
        <summary class="cursor-pointer text-sm font-medium text-slate-500">HTML</summary>
        <div class="mt-2">
          <widget-playground-state-preview-code-102020 target="demo-basic">
            <template>
<molecules--component-102020 
  value="{{playground.basic.value}}"
  error="{{playground.basic.error}}"
  disabled="false"
  isEditing="true">
  <Label>Field</Label>
</molecules--component-102020>
            </template>
          </widget-playground-state-preview-code-102020>
        </div>
      </details>
    </article>
  </section>

</div>
\`\`\`

### 6.3 Demo Element

O elemento \`<demo>\` DEVE:
- Ter um \`id\` único (ex: demo-basic, demo-disabled)
- Conter o HTML do componente (funciona independente do editor)

\`\`\`html
<demo id="demo-basic">
  <molecules--component-102020 
    value="{{playground.basic.value}}"
    error="{{playground.basic.error}}">
    <Label>Field</Label>
  </molecules--component-102020>
</demo>
\`\`\`

### 6.4 HTML Editor Widget

O \`widget-playground-state-preview-code-102020\` recebe:
- \`target\`: id do elemento demo (para atualizar ao editar)
- \`<template>\`: código HTML fonte (para exibir formatado no editor)

**IMPORTANTE:** O HTML deve estar duplicado - no \`<demo>\` E no \`<template>\`.

\`\`\`html
<widget-playground-state-preview-code-102020 target="demo-basic">
  <template>
<molecules--component-102020 
  value="{{playground.basic.value}}"
  error="{{playground.basic.error}}">
  <Label>Field</Label>
</molecules--component-102020>
  </template>
</widget-playground-state-preview-code-102020>
\`\`\`

O widget:
1. Lê o HTML do \`<template>\` (código fonte, não compilado)
2. Exibe formatado no editor com syntax highlighting
3. Ao editar, atualiza o innerHTML do \`<demo>\` target em tempo real

---

## 8. Demos

| Demo | Namespace | @property |
|------|-----------|-----------|
| Basic | playground.basic | defaults |
| Disabled | playground.disabled | disabled="true" |
| Loading | playground.loading | loading="true" |
| Error | playground.error | defaults |
| View Mode | playground.viewMode | isEditing="false" |

---

## 9. Checklist

- [ ] Tag name copied verbatim from \`@customElement(...)\` in the \`.ts\` file
- [ ] Opening tag and closing tag are identical strings
- [ ] State contém APENAS @propertyDataSource
- [ ] State é JSON válido
- [ ] State usa valores default (string="", number=0, boolean=false)
- [ ] State NUNCA usa null ou undefined
- [ ] widget-playground-state-102020 vem ANTES das demos
- [ ] Cada demo tem namespace próprio
- [ ] Cada \`<demo>\` tem id único e contém o HTML do componente
- [ ] string → widget-playground-state-text-102020
- [ ] number → widget-playground-state-number-102020
- [ ] boolean → widget-playground-state-boolean-102020
- [ ] HTML duplicado: no \`<demo>\` E no \`<template>\` do editor
- [ ] \`<demo>\` sem class/style

---

## 10. Changelog

| Version | Date       | Description |
|---------|------------|-------------|
| 2.1.0   | 2026-04-15 | Using dedicated widgets with -102020 suffix |
| 2.2.0   | 2026-04-16 | Added HTML editor widget for live code editing |
| 2.3.0   | 2026-04-16 | HTML editor uses template element for source code |
| 2.4.0   | 2026-04-16 | HTML duplicated in demo AND template - demo works independently |
| 2.5.0   | 2026-04-17 | Added §2 explicit rule: tag name must be copied from @customElement, never derived |

`