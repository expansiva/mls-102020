/// <mls fileReference="_102020_/l2/skills/molecules/groupSelectFileForUpload/usage.ts" enhancement="_blank"/>

export const skill = `
# select + fileForUpload — Usage

> Quick reference for using molecules in the **select + fileForUpload** group.
> Use this when you need the user to **select files to be uploaded**.

---


## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Label displayed above or beside the field |
| \`Helper\` | Descriptive text shown below the field when there is no error |
| \`Trigger\` | Custom content for the file selection button or drop zone |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`File[]\` | \`[]\` | Currently selected files, bound to state |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`multiple\` | \`boolean\` | \`false\` | Allow selecting more than one file |
| \`accept\` | \`string\` | \`''\` | Accepted file types (e.g. \`'image/*'\`, \`'.pdf,.docx'\`) |
| \`max-size-kb\` | \`number\` | \`0\` | Maximum file size in KB per file (0 = no limit) |
| \`max-files\` | \`number\` | \`0\` | Maximum number of files when \`multiple=true\` (0 = no limit) |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator (e.g. upload in progress) |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`reject\` | \`{ files: File[], reason: 'size' \| 'type' \| 'count' }\` | Fired when files are rejected due to validation |

---

## Value Contract

- \`value\` holds the current \`File[]\` bound to the global state
- Files are added on selection/drop and removed via the file list UI
- The page reads \`value\` from state and is responsible for uploading via BFF
- Use the \`loading\` property to block interaction while an upload is in progress


---

## Examples

### Simple file button

\`\`\`html
<molecules--file-button-102020
  value="{{ui.form.attachments}}"
  accept=".pdf,.docx"
  error="{{ui.form.attachmentError}}">
  <Label>Attachment</Label>
  <Helper>PDF or Word, up to 5MB</Helper>
</molecules--file-button-102020>
\`\`\`

### Multi-file drag-drop zone

\`\`\`html
<molecules--dropzone-102020
  value="{{ui.upload.files}}"
  multiple="true"
  accept="image/*"
  max-size-kb="2048"
  max-files="5"
  loading="{{ui.upload.loading}}"
  error="{{ui.upload.error}}">
  <Label>Product Images</Label>
  <Trigger>Drop images here or click to browse</Trigger>
  <Helper>Up to 5 images, max 2MB each</Helper>
</molecules--dropzone-102020>
\`\`\`

---

## Customization via data-class

### On the component host

Pass extra CSS classes via \`data-class\`:

\`\`\`html
<component data-class="w-full mt-4">
  <Label>Text</Label>
</component>
\`\`\`

### On slot tags

Pass CSS classes on slot tags via \`data-class\`:

\`\`\`html
<component>
  <Label data-class="uppercase tracking-wide">Text</Label>
  <Helper data-class="italic">Help text</Helper>
</component>
\`\`\`

---

## Design Tokens

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom properties on a parent element:

\`\`\`css
.my-container {
  --ml-primary: #7c3aed;
  --ml-radius-sm: 10px;
  --ml-font-family: 'Inter', sans-serif;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-surface\` | \`#ffffff\` | Component background |
| \`--ml-surface-dim\` | \`#f5f5f5\` | Hover background |
| \`--ml-on-surface\` | \`#1c1b1f\` | Primary text |
| \`--ml-on-surface-muted\` | \`#49454f\` | Secondary text |
| \`--ml-on-surface-faint\` | \`#79747e\` | Placeholder |
| \`--ml-primary\` | \`#3b82f6\` | Primary action color |
| \`--ml-on-primary\` | \`#ffffff\` | Text on primary |
| \`--ml-error\` | \`#ef4444\` | Error color |
| \`--ml-on-error\` | \`#ffffff\` | Text on error |
| \`--ml-outline-variant\` | \`#e2e8f0\` | Default border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-radius-sm\` | \`6px\` | Default radius |
| \`--ml-shadow-1\` | \`0 1px 3px rgba(0,0,0,0.1)\` | Subtle shadow |
| \`--ml-font-family\` | \`system-ui, sans-serif\` | Font family |
| \`--ml-font-weight-medium\` | \`500\` | Medium weight |
| \`--ml-transition\` | \`200ms ease\` | Transition |
| \`--ml-focus-ring-color\` | \`rgba(59,130,246,0.4)\` | Focus ring |
| \`--ml-disabled-opacity\` | \`0.5\` | Disabled opacity |

`;