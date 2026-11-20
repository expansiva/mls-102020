# App navigation — one model for the whole app

The rules every generated module follows to move between pages. Templates
(`templates/<category>/<experience>.md`) shape what happens *inside* one page. This file shapes how a
person *reaches* a page, what the page needs to open, and how they get back. Readers: the L2 menu
planner (`agentPlannerL2` step `menu20`), the page defs (`agentDefsL2`) and the menu writer
(`agentMaterializeL2` step `finalize70`).

Decided by Wagner on 20/11/2026, after the review of the `agents` module: the menu linked pages that
need a chosen record, so they opened with an error, and the pages opened from a list had no way back.

## 1. The model: list → record → action

1. **List.** The menu entry of a context opens its list (the `locate` step of the journeys). The list
   is the only way in to the record.
2. **Record.** Picking an item opens the record: its details and the actions the person may do on it,
   in one place.
3. **Action.** An action that needs its own screen opens it with a visible **back** to the record.
   Back returns to the record as it was. Back from the record returns to the list, with the
   same filters, page and scroll position.

On a phone each level is a full screen, and back is in the header. On desktop the record may open beside the list
(master-detail) when the category template is a list category. The levels stay the same.

## 2. Menu

- A `hub` (a node with `context`, an l4 entity) appears in the menu as **one** entry: its list. Its
  children are the record's actions. They never become menu items of their own, because a menu
  item has no record.
- A page that needs no chosen record is a menu item as it is.
- When the person's grant is anchored on themselves (their own record), the hub opens straight on
  that record, with no list.

## 3. Page entry

- A page that needs a record declares it: the URL parameter that carries it (`?<entity>Id=`), and the page it
  came from (its **back**).
- Opened without the record (old link, bookmark, typed URL): show "choose a <entity>" with a link
  to the list. Never show a load error.
- Every navigation to a record page keeps the way back. The back target is the page of the level
  above (§1), never the browser history alone.

## 4. Scenes inside one page

A form that needs a side screen (pick a date, choose from a long list, fill a sub-record) uses a
**scene**: same page, another view, with back to the main view. It keeps what was already typed. A scene is
declared in the page defs: its id, what opens it, and what it returns. Use a scene when the side
screen has no meaning alone. Use a page when it does, for example when it can be linked or opened
from another place.
