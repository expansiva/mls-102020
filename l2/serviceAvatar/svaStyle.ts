/// <mls fileReference="_102020_/l2/serviceAvatar/svaStyle.ts" enhancement="_blank"/>

// Styles of the floating avatar and its chat box. Light DOM on purpose: the clarification widgets
// the agents mount inside the chat carry global styles, which a shadow root would cut off.
// The mark is the Collab logo (_102041_/l2/collab-logo: two half rings, blue #4285F4 and red
// #EA4335) in miniature; each conversation state is one movement of the two C's.

export const SVA_STYLE = `
.sva-root {
  --sva-bg: #ffffff; --sva-fg: #1f2328; --sva-muted: #6b7280; --sva-line: #e5e7eb;
  --sva-me: #e8f0fe; --sva-blue: #4285F4; --sva-red: #EA4335;
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--sva-fg);
}
@media (prefers-color-scheme: dark) {
  .sva-root { --sva-bg: #1e1f22; --sva-fg: #e6e6e6; --sva-muted: #9aa0a6; --sva-line: #33363b; --sva-me: #263a5c; }
}

/* ---- avatar ---- */
.sva-avatar {
  width: 56px; height: 56px; border-radius: 50%; border: 1px solid var(--sva-line);
  background: var(--sva-bg); box-shadow: 0 6px 20px rgba(0, 0, 0, .18);
  display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; padding: 0;
  transition: transform .15s ease;
}
.sva-avatar:hover { transform: translateY(-2px); }
.sva-avatar:focus-visible { outline: 2px solid var(--sva-blue); outline-offset: 3px; }
.sva-mark { position: relative; width: 34px; height: 24px; }
.sva-c { position: absolute; top: 0; width: 24px; height: 24px; border-radius: 50%; box-sizing: border-box; border: 5px solid; clip-path: inset(0 0 0 50%); transform: scaleX(-1); }
.sva-c1 { left: 0; border-color: var(--sva-blue); }
.sva-c2 { left: 10px; border-color: var(--sva-red); transition: left .2s ease; }
.sva-avatar:hover .sva-c2, .sva-root[data-open="true"] .sva-c2 { left: 13px; }
.sva-dot { position: absolute; top: 4px; right: 4px; width: 11px; height: 11px; border-radius: 50%; background: var(--sva-red); border: 2px solid var(--sva-bg); display: none; }
.sva-root[data-attention="true"] .sva-dot { display: block; }

.sva-root[data-state="thinking"] .sva-mark { animation: sva-orbit 1.4s linear infinite; }
.sva-root[data-state="waiting"] .sva-c1 { animation: sva-pulse 1.2s ease-in-out infinite; }
.sva-root[data-state="done"] .sva-mark { animation: sva-pop .45s ease; }
.sva-root[data-state="error"] .sva-c2 { animation: sva-shake .4s ease 2; }
@keyframes sva-orbit { to { transform: rotate(360deg); } }
@keyframes sva-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes sva-pop { 0% { transform: scale(1); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes sva-shake { 0%, 100% { margin-left: 0; } 25% { margin-left: -3px; } 75% { margin-left: 3px; } }
@media (prefers-reduced-motion: reduce) {
  .sva-root .sva-mark, .sva-root .sva-c1, .sva-root .sva-c2 { animation: none !important; transition: none !important; }
  .sva-root[data-state="thinking"] .sva-mark { opacity: .55; }
}

/* ---- chat box ---- */
.sva-panel {
  position: absolute; right: 0; bottom: 70px; width: 380px; max-width: calc(100vw - 32px);
  height: 520px; max-height: calc(100vh - 120px);
  background: var(--sva-bg); border: 1px solid var(--sva-line); border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .22); display: none; flex-direction: column; overflow: hidden;
}
.sva-root[data-open="true"] .sva-panel { display: flex; }
.sva-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--sva-line); font-weight: 600; font-size: 14px; }
.sva-head .sva-mark { transform: scale(.75); }
.sva-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; line-height: 1.45; }
.sva-msg { max-width: 88%; padding: 8px 12px; border-radius: 12px; white-space: pre-wrap; word-break: break-word; }
.sva-me { align-self: flex-end; background: var(--sva-me); border-bottom-right-radius: 4px; }
.sva-bot { align-self: flex-start; border: 1px solid var(--sva-line); border-bottom-left-radius: 4px; }
.sva-bot.sva-error { border-color: var(--sva-red); }
/* items keep their own height: the list scrolls instead of squeezing them (an overflow-x:auto
   child would otherwise be allowed to shrink to nothing) */
.sva-list > * { flex-shrink: 0; }
.sva-widget { align-self: stretch; border: 1px solid var(--sva-line); border-radius: 12px; padding: 6px 8px; overflow-x: auto; }
/* an answered question leaves the conversation */
.sva-widget[data-answered="true"] { display: none; }
.sva-thinking { align-self: flex-start; color: var(--sva-muted); font-style: italic; }
.sva-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--sva-line); }
.sva-input { flex: 1; resize: none; min-height: 38px; max-height: 120px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--sva-line); background: transparent; color: inherit; font: inherit; }
.sva-input:disabled { opacity: .6; }
.sva-send { padding: 0 14px; border-radius: 10px; border: 0; background: var(--sva-blue); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
.sva-send:disabled { opacity: .5; cursor: default; }

@media (max-width: 520px) {
  .sva-root { right: 12px; bottom: 12px; }
  .sva-panel { position: fixed; inset: 8px 8px 80px 8px; width: auto; max-width: none; height: auto; max-height: none; }
}
`;
