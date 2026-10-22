# documentManagement — experience `thumbnailGallery`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A **wall of pictures**: the documents as a grid of thumbnails, the preview leading and the
name under it, so the user finds by sight — "the scanned invoice with the blue logo", "the
floor plan", "the signed page" — and opens a large viewer to confirm before acting. The
question is "which one is it? I will know it when I see it". Where `libraryList` finds by
metadata worn on the row and `folderExplorer` finds by walking places, this page finds by
recognition: the image is the finding aid and the metadata is the caption. Target: spot the
document in a glance, confirm it large, act or download — and land back on the same wall.

## How to instantiate from the defs (the slots)

- **The grid is the documents query**: one tile per document, all tiles the same size. The
  tile is the thumbnail or preview the contract exposes (an image URL, a preview field, a
  first-page render), then the name under it on at most two lines, then ONE quiet fact
  (type or updated date) when declared.
- **Without a thumbnail** for a document, the tile shows a calm placeholder by file type
  (from the declared type or extension) with the type in words — same size, same place.
  If the contract exposes no preview at all, the tiles still lead with that type mark and
  the name; the grid shape stays.
- **Filters come from the declared query inputs** (type, status, owner) and search, when
  declared, in one quiet row above the grid. Never invent a facet.
- **Opening a tile shows the viewer** over the grid: the preview as large as the screen
  allows, the name, the full metadata as labeled facts, then the commands valid for the
  document's status (download, approve, archive, new version), outcome-named. Previous and
  next move through the grid's current order without closing the viewer.
- **Upload, when declared, is one primary control above the grid**; the new tile appears at
  the position the current order gives it, in view.
- **Session/context inputs never render as fields**; ids are never typed — a document is a
  tile chosen by sight.

## Attention hierarchy (the spine of this experience)

1. The thumbnails — the pictures themselves.
2. The viewer — the chosen document large, then its facts and commands.
3. Filters and search — the lens, quiet until touched.
4. Names and the one fact, as captions; upload, demoted.

## Loops

- Scan the wall → recognize → open the viewer → confirm it is the one → act or download →
  close → the wall is exactly where it was, the visited tile briefly marked.
- Flip loop: inside the viewer, previous / next (buttons and arrow keys) walk neighbouring
  tiles, so comparing similar pictures needs no return to the grid.
- Narrowing: one filter or a search term → the grid re-fills, tile size unchanged; a filter
  with no match says so in words naming the filter, never an empty wall.

## Feedback & feedforward

- Thumbnails load lazily into fixed-size tiles; a loading tile keeps its shape, so the grid
  never jumps while pictures arrive.
- A thumbnail that fails falls back to the type placeholder silently; a viewer preview that
  fails says so in the viewer and still shows the facts and commands.
- Commands requiring input collect it inside the viewer, validated at the field; archive and
  other irreversible ones confirm once, naming the document.
- Failure of a command reports inside the viewer above its commands, with retry; success is
  the viewer restating the new status and the tile updating behind it — no page banner.

## Disciplines (transversal — always)

- The page name appears once, in the header; the viewer's heading is the document's name, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: a tile opens the viewer, viewer commands act,
  download is a link only; no tile carries a command.
- Link color only on real links; captions and type marks are muted.
- Every tile has the same anatomy and size; a picture is never stretched or cropped into a
  different shape.
- Every thumbnail carries a text alternative with the document's name.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the grid loads more at its end.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the picture as the finding aid, the same-size tiles, the large viewer
before any action, the flip loop and the disciplines. The grid narrows to two tiles per row so each
picture stays large enough to recognize. Where this section and the layout described above differ,
this section wins on mobile.

- **Two tiles per row**, filling the width, the picture first and the name under it on at most two
  lines; the one fact is dropped if it does not fit. Never three tiny tiles, never a carousel.
- **Filters and search** sit in one quiet row on top, wrapping to a second line rather than
  scrolling sideways; upload, when declared, is one clear control beside them.
- **The viewer is a view of its own** with back, inside this page: the preview at full width, then
  the facts one per line, then the commands at the bottom where the thumb reaches.
- **Flipping** uses previous / next buttons at the viewer's foot; a swipe may also flip, but never
  alone.
- **Back** returns to the grid at the same scroll place, the visited tile marked.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the thumbnails, 2. the viewer's preview and facts, 3. its commands.

Forbidden on mobile:
- a list of names without pictures as the home view;
- tiles so small the picture cannot be recognized, or any horizontal scroll;
- swipe as the only way to flip or act;
- commands on the tiles themselves.

## Forbidden

- A metadata-first list of rows with a side panel as the page's structure — that is
  `libraryList`, not this one; here the picture leads and the facts are captions.
- Folders, breadcrumbs or a tree as the way to find — that is `folderExplorer`.
- Tiles of varying size or a masonry layout; captions longer than two lines.
- Commands on tiles (approve or archive from the grid); acting before the viewer was opened.
- Hiding a document because it has no thumbnail.
- Page-level toasts carrying validation; redirects after an action; inventing thumbnails,
  statuses or facets the contract does not declare.

## Signals (how to check the generated page)

1. **S1 grid of tiles:** the documents render as a grid of equal-size tiles; no table and no
   row list as the main collection.
2. **S2 picture first:** each tile's first element is an image or a type placeholder, with the
   name after it.
3. **S3 viewer before action:** document commands appear only inside the opened viewer, never
   on tiles.
4. **S4 flip:** the viewer offers previous and next controls that move to neighbouring
   documents without closing.
