# CHANGELOG — i3-edit

## 2026-08-06 — first version

- **Targeted edits instead of rewritten files.** The first design followed `n4-render` and asked
  for the whole new artifact. It is the right shape for creation and the wrong one here: n4-render's
  own history records retries coming back as different, shorter files that failed on something else
  (`nmFs.ts:96-106`), and there the file was disposable. Three invariants — read-before-write,
  header preservation, no foreign write — became structural instead of checked.
- **An ambiguous `find` is rejected, not applied to the first match.** Applying it would silently
  edit a place the model was not looking at.
- **Rollback on a rejected attempt**, against NM2's convention. Recorded here because the
  divergence will look like an oversight later: NM2 keeps the failed file so the retry can see it;
  this agent edits molecules that already work, and a twice-failed run must not leave one worse
  than it found. The retry reads the gate errors and the original files, which is the state its
  `find` strings must match anyway.
- **Delta rule for every detector.** The appearance/discipline checks are imported from
  `n4-render/gate.ts` rather than copied, and each runs on the before and the after. A molecule
  that already hardcodes `bg-black` must not block a padding fix — flow.json's last principle.
- Same rule for compilation, which costs a second compile per touched file. Measured trade: the
  alternative is refusing every edit to a molecule that already has an error, and the repo baseline
  is 193 errors, so those molecules exist.
- **One call, `code` model, for `.ts` and `.less` alike**, though flow.json's goal line says the
  `.less` uses the design model. A step emits one `prompt_ready`, so honouring that would mean
  splitting i3 into two steps or a dispatcher/worker pair. Deferred on purpose: the design model
  earns its keep writing a whole stylesheet (n5-less), and an improve run changes a spacing or a
  token. Revisit if `.less` edits start coming back weak.
- The files are shown with `----- FILE: … -----` delimiters, not fenced with backticks: a
  `.defs.ts` carries a markdown skill full of them and a fence would end mid-file.
- `EDITABLE` excludes `html` and `groupIndex` so the model cannot reach into what i5 and i6 own.
