# serviceAvatar — collabStudio floating chat (test)

A studio service that puts a floating avatar (the Collab logo's two C's) in the bottom-right
corner of the running app. Clicking it opens a chat box, and clicking again closes it. A message
goes to `agentAssistant` the same way the messages panel sends an `@@agent` message. The chat then
follows the task: the avatar spins while the agent works, the agent's own clarification widget
(options, fields, confirmation, answer + OK) appears inside the chat, and the final result is shown
as a message.

## Open it

Studio mode on the app (Ctrl+Alt+S), level 7, tab **collabStudio** on the left. The tab mounts the
avatar on `document.body`. It stays when you leave the tab, until the page reloads. The tab has a
button to hide/show it.

Registered in `l2/pluginCollabCoreIndex.ts` (scope `l7ServicesLeft`). That is the only file outside
this folder, because plugin indexes are read from the root of `l2`.

## Files

```
serviceAvatar.ts   the service (tab): mounts the avatar, show/hide button
svaBubble.ts       avatar + chat box (light DOM on body), avatar states, message list
svaChat.ts         user, the "agentAssistant" thread (server + local cache), send, task-change follow-up, message cache
svaView.ts         task -> thinking | waiting (clarification to mount) | done | failed   (pure, tested)
svaStyle.ts        styles; prefers-reduced-motion and dark scheme handled
svaLabels.ts       pt/en texts
```

Avatar states (`data-state` on the root): `idle`, `thinking` (the C's orbit), `waiting` (blue C
pulses; a red dot when the box is closed), `done` (pop), `error` (red C shakes).

## Limits (test version)

- Studio mode only. A client session never loads studio services.
- Needs the collab session and `/execBff` of the app, so it runs in the app on the runtime VM.
- Closing the box only hides it. A running task goes on, and its question waits.
- Every conversation runs in one thread named after the agent (`agentAssistant`), found by name in
  the local cache or created once (server + IndexedDB + thread list). So each task can also be
  opened in the messages panel, which helps when something fails. The message the backend creates
  for each task is written to IndexedDB by the chat, because the clarification widgets are mounted
  from it.
