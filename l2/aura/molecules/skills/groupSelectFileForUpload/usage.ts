/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSelectFileForUpload/usage.ts" enhancement="_blank"/>

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

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom
properties on a parent element. The values below are this group's current defaults —
copy the block and change them:

\`\`\`css
.my-container {
  --ml-primary-container: rgba(59, 130, 246, 0.1);
  --ml-primary: #3b82f6;
  --ml-outline-focus: #3b82f6;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-border-style\` | \`solid\` | Border style |
| \`--ml-border-width\` | \`1px\` | Border width |
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-primary\` | \`#3b82f6\` | Primary action color |
| \`--ml-primary-container\` | \`rgba(59, 130, 246, 0.1)\` | Subtle primary fill (selected row, active chip) |

`;