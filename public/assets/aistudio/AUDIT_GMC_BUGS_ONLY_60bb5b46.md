# GMC Audit — Bugs Only (design & feature-change findings removed)

**What this is:** the final combined GMC audit (`AUDIT_GMC_FINAL_COMBINED.md`) with everything removed whose "fix" would change how GMC looks, how it is designed, or what features it has. What is left is only this: **places where the app fails at what it already claims and intends to do** — it loses or corrupts your data, crashes, exposes your data, invents numbers, or gives you wrong numbers to act on.

**The rule used, in one line:** if a finding only stands by changing what the app is *supposed* to do or look like, it was cut. If the app breaks its *own* promise, it stayed — even when it sits inside a design-named section (the Settings data-wipe stays; the Settings font card goes).

**Counts (published basis, so the numbers add up exactly):**

| | |
|---|---|
| Combined audit, Round 1 published findings | 544 |
| Already struck by Round 2 (wrong / by-design / dead code) | −18 (Appendix A) |
| Cut by this filter (design / feature-change / no-live-effect) | −120 |
| **Left in this file from Round 1** | **406 — 49 critical, 146 high, 163 medium, 48 low** |
| Round 2 fresh-eyes additions | 32 → 1 cut (below), **31 kept** |
| **Total in this file** | **437 findings** |

Note what did *not* get cut: not one critical finding fell to this filter. Every critical in the audit is a data-loss, corruption, exposure, crash or wrong-decision bug — none of them was a design opinion.

---

## What was cut — and why

### Cut completely (whole areas)

- **sr-science (10 findings)** — How the revision science *should* work — changing it means redesigning the algorithm, not fixing a bug.
- **feature-manifest (21 findings)** — The app's own sales-talk / feature descriptions to AI tools — fixing it means rewriting claims or building the described features.
- **header-theme (10 findings)** — Header, themes and CSS — look and visual design. (Includes the theme placebo: themes doing nothing is real, but making them work is a design change, so it is out under this rule.)
- **design-system (12 findings)** — Design system — colours, type, visual consistency. Pure design.
- **hardware-te (8 findings)** — The on-screen 'hardware' knobs/sliders as designed objects — interaction/visual design. (Its already-dead internals were withdrawn in Round 2 and are listed separately.)
- **confidence-color (5 findings)** — Confidence colour utilities — which colour/label a status gets. Design presentation.
- **accessibility-responsive (13 findings)** — Accessibility and responsiveness — changing the interface for other devices/needs is a design change.
- **dead-code (14 findings)** — Dead and unwired code — it does nothing live today; acting on it means deleting code or wiring up new features, not fixing live behaviour.

### Cut partly (mixed areas — kept the data/crash items, cut the rest)

- **settings (cut 3)** — Kept: the data-wipe/import items and scheduling/status bugs in Settings. Cut: #4 (asking for a new editor — a new feature), #9 (fabricated numbers inside the typography *preview card* — design surface), #10 (copy-a-hex feedback in the design tokens).
- **mcp-modal (cut 9)** — Kept only #1: the playground running fake example data against your live data with no warning — that can corrupt real records. Cut: the console's own UI directory/counts/tabs/controls — interface completeness of a secondary screen.
- **tutorial-misc (cut 8)** — Kept: #3 (closing the tutorial never marks it seen — an existing button failing at its own job) and #6 (the sound engine can crash the whole app on a storage error — a crash is a crash, wherever it lives). Cut: tutorial content, sound design, fullscreen behaviour — experience/design.
- **print-schedule (cut 7)** — Kept: items where the printed sheet states wrong facts (real max marks ignored, wrong chapter counts, wrong next-exam, negative 'due in' labels, duplicate scores, unescaped name in exported HTML) and the broken export itself. Cut: layout/toggle/density presentation of the print layouts.

### Also cut

- **The Round 2 manifest scorecard** (the app's 123 self-descriptions: 32 true / 53 partly / 37 false) — it is a claims-and-features list, not a bug list. The real bugs hiding underneath those claims are still in this file under their own sections.
- **1 of the 32 fresh-eyes additions:** *"No delete-score path"* — true, but fixing it means **adding a feature** (a delete button the app never had). Out under the rule. It is listed in Appendix B like everything else cut.
- **The started-vs-completed question is not in this file as a finding** — it never was one. It is a design decision that is yours to make, so a bugs-only audit has nothing to say about it.

### Borderline calls — stated honestly

- **Theme placebo (in header-theme, cut):** themes genuinely do nothing when you switch them. It is a real defect, but the only fix is a design change, so your rule removes it. Cutting it does not mean it works.
- **Dead code (cut):** includes finished-but-unwired pieces like the two dead screens. They harm nothing today; they are in Appendix B in case you ever want the cleanup list.
- **Print schedule (split):** the printed sheet's *layout* findings are cut; the items where the sheet prints wrong facts about your tests are kept.
- **Security stays in.** Locking the open server/Firestore is not a design or feature change to your study app — the exposure was accidental (Round 2's intentionality check), and the findings describe your existing data being readable/writable by strangers, not a new feature request.

---

## The kept audit in short

Everything the combined audit headlined is still here, because all of it is bugs, not design:

1. **Revision counter frozen at 1** — a 100% revision is processed by the first-pass branch, so the 3/7/14/30 ladder never climbs, on any date (there is no time gate in the code either).
2. **Three data stores overwrite each other** — no freshness checks; stale copies win, MCP-written logs get wiped by merely opening the app, deletions resurrect.
3. **One-click wipes in Settings** — "Load 1-Year Testing Data" and Factory Reset erase everything with no confirmation, and push the wipe to the cloud; the generator's 230 fabricated logs are labelled "Official exam log".
4. **No lock anywhere** — open server, open MCP tools (including delete/reset), open Firestore rules, one shared guest document, and your real data file committed to the public repo.
5. **Score form invents 590/720** — pre-filled fake subject marks are saved with your real total; you still have 0 real scores, so this trap is still waiting.
6. **No crash net** — one bad record white-screens the app on every boot; corrupt storage silently resets to seed and overwrites the evidence.
7. **Wrong numbers to act on** — pacing invents 1.5 chapters/week at zero completions; weak-spot diagnosis ranks never-studied chapters as your worst; duplicate and resurrected scores double-count.

---

# Kept findings — full evidence

*Every finding below is reproduced in full from the combined audit (file, line, evidence, impact), minus the cut and withdrawn items. Section and scope names are the original ones.*


## 1. Data loss, sync & storage — the three stores fight, and the wrong one wins

### App sync & auth effects (`app-sync`)

**[CRITICAL] Opening the app silently wipes MCP/server-side study logs: the mount-time POST to /api/state overwrites server state with stale localStorage state**
- File: `src/App.tsx:188-198 (effect) and server.ts:278-288 (POST /api/state)`
- Evidence: App.tsx:188-198: a useEffect on [appState] schedules `fetch('/api/state', {method:'POST', body: JSON.stringify(appState)})` 1200ms after EVERY state change — including the very first render, whose appState comes from loadAppState() (localStorage, App.tsx:56). It never fetches server state first (refreshStateFromServer is only invoked manually via the MCP modal, App.tsx:981). server.ts:278-288: POST /api/state blindly does `serverState = {...req.body, updatedAt: Date.now()}; saveStateToDisk()` with no version/updatedAt comparison. Concrete break: an MCP client (or Sarthak via an AI assistant) calls log_study_session while the browser is closed — server-state.json now has the new log. He opens the app; 1.2s later the browser POSTs its older localStorage snapshot and the MCP-logged session is deleted from the server's only persistent copy, with no warning anywhere.
- Impact: The MCP interface is a headline feature (~30 tools), but its writes are guaranteed to be destroyed by the next browser session unless the user manually refreshes from the MCP modal within 1.2 seconds of opening the app. Study logs — his revision truth — vanish silently.
- Also found independently by: error-crash

**[HIGH] A pending debounced cloud save is never cancelled when a remote update arrives, so a stale pre-merge snapshot overwrites the other device's changes in Firestore**
- File: `src/App.tsx:248-262 and 287-308`
- Evidence: The subscription callback (App.tsx:253-258) merges remote state and sets isRemoteUpdateRef, but never touches debounceTimerRef. The save effect (App.tsx:293-300) captures `appState` in the setTimeout closure. Sequence: user edits on device A (debounce timer armed to save snapshot S1 in 300ms) → a remote snapshot from device B arrives and is merged into state M → the effect run for M consumes isRemoteUpdateRef and returns early, leaving the armed timer alive → the timer fires and calls saveStateToFirestore(uid, S1), writing the pre-merge snapshot over B's newer Firestore document. saveStateToFirestore replaces the chapters/studyLogs/tests arrays wholesale, so B's changes are lost, not merged.
- Impact: In genuine multi-device use (phone + laptop), the sync system can silently roll back the other device's latest session — the opposite of the 'zero data loss' guarantee the merge code advertises.

**[HIGH] Login sync is an unguarded read-modify-write: changes saved by another device during the initial load are overwritten by the merged snapshot**
- File: `src/App.tsx:205-246`
- Evidence: The auth callback does `const cloudData = await loadStateFromFirestore(user.uid)` (App.tsx:219), merges with localData read afterwards, then unconditionally `await saveStateToFirestore(user.uid, unifiedState)` (App.tsx:237). There is no transaction, version field, or re-read. Any write committed to Firestore between the getDoc inside loadStateFromFirestore and this setDoc — e.g. a second tab/device saving a just-logged session — is absent from unifiedState and is clobbered by the save. The real-time subscription that might have caught it is only established after the save completes (App.tsx:248).
- Impact: Every sign-in (including the automatic anonymous sign-in on every fresh browser, and the anon→Google transition) is a window where another device's newest work can be silently erased.

**[HIGH] State and MCP endpoints are unauthenticated, CORS-open to any origin, and bound to 0.0.0.0 — anyone on the network (or any website, via the permissive CORS/preflight) can read or overwrite his entire study record**
- File: `server.ts:81-99, 274-288, 319-322`
- Evidence: server.ts:81-87 sets `Access-Control-Allow-Origin: *` with GET/POST/PUT/DELETE and answers OPTIONS with 200 for all routes. GET /api/state (line 274) returns the full serverState (all chapters, logs, tests, scores) with no auth; POST /api/state (line 278) replaces it, also with no auth. The MCP endpoints (SSE, /api/mcp/message, direct JSON-RPC at lines ~105-175) expose mutating tools including import_restore_data and log_study_session, likewise unauthenticated. The server listens on 0.0.0.0:3000 (line 319).
- Impact: Any device on his LAN, and any other local process, can download his complete study history or POST a fabricated state that the app will then adopt via refresh and propagate to Firestore. His personal data has no access control at the one layer that serves it over the network.

**[HIGH] Guest cloud identity is a shared global slot: App's guest fallback writes/reads collide across devices and can restore a stranger's (or a stale device's) state as his**
- File: `src/App.tsx:341, 355, 668, 676`
- Evidence: handleManualCloudSync, handleRestoreFromCloud, handleResetSeedData and handleImportState all compute `targetUserId = currentUser?.uid || 'guest_' + getDeviceClientId()`. getDeviceClientId is a random value in localStorage (firebase.ts:33-44) — a different browser/profile/cleared storage mints a different guest ID. Worse, the callees App relies on collapse all guests into one document: saveStateToFirestore additionally writes every guest payload to cloudBackups/guest_latest (firebase.ts:560-563), and loadStateFromFirestore falls back to reading cloudBackups/guest_latest for any guest ID with no own backup (firebase.ts:588-591). So a Restore on a fresh browser can return whichever guest backup was written last globally — not necessarily his — and App.tsx:360-365 applies it wholesale via setAppState + saveAppState with no identity check or confirmation.
- Impact: The guest backup path can silently substitute someone else's syllabus state (or an old device's) for his real record, and his own guest backups overwrite the shared slot other guests read. Backup/restore — the safety net — is itself a corruption vector.

**[MEDIUM] The beforeunload/visibility 'flush' cannot work as claimed: it fires an async multi-write Firestore save the browser will not wait for, and it can push pre-merge local state over the cloud if the tab closes during initial sync**
- File: `src/App.tsx:311-337`
- Evidence: handleBeforeUnload and the visibilitychange handler call `saveStateToFirestore(currentUser.uid, appStateRef.current).catch(() => {})` — an async function performing multiple awaited setDoc calls (firebase.ts primary + backup writes). Browsers do not keep the page alive for ordinary async work during unload; there is no sendBeacon/keepalive path. The handlers also do not check isInitialCloudLoadDone: if the tab is hidden/closed while the login load+merge (App.tsx:218-237) is still in flight, the flush writes the un-merged local snapshot directly over Firestore. Meanwhile the genuinely pending debounced save (300ms timer) is neither flushed nor cancelled by these handlers, so two unordered writes to the same document can race.
- Impact: The code presents tab-close as a guaranteed save point; it is not. Last-moment edits can be lost, and a fast close during sign-in can roll the cloud back to stale local data.

**[MEDIUM] Remote-merge echo suppression strands local-only data in localStorage: contributions folded into a merged state are never pushed to Firestore until an unrelated later edit**
- File: `src/App.tsx:253-258 and 279-285`
- Evidence: When a remote snapshot arrives, App merges it with appStateRef.current (line 253) — a merge that can add local-only logs/chapters into the combined state — then sets isRemoteUpdateRef so the save effect returns early (lines 282-285) without scheduling any cloud save. The server POST effect still fires, but Firestore — the actual cross-device store — never receives the local-only records incorporated by that merge. They exist only in this browser's localStorage until the user happens to make another edit.
- Impact: If that browser's storage is cleared (or the browser is abandoned) before any further edit, records the UI presented as synced were never in the cloud. The 'synced' status set in the subscription callback (line 258) overstates what actually happened.

**[MEDIUM] Pacing-settings edits never bump updatedAt, and the cloud save reuses the stale timestamp — so merge freshness logic can silently revert his exam/syllabus target dates**
- File: `src/App.tsx:815-817, 830-832, and 293-300`
- Evidence: Both onUpdatePacingSettings handlers do `setAppState((prev) => ({ ...prev, pacingSettings: settings }))` with no `updatedAt: Date.now()` — unlike every other handler in the file. The save effect then builds `stateToSave = { ...appState, updatedAt: appState.updatedAt || Date.now(), ... }` (line ~296), persisting the new pacingSettings under the OLD state timestamp. mergeLocalAndCloudState chooses settings/pacingSettings by comparing state-level updatedAt (firebase.ts isCloudNewer check), so at the next login a device holding older pacing settings but a newer unrelated updatedAt wins, and the pacing edit is silently discarded.
- Impact: His target syllabus date (31 Dec 2026) and exam date drive pacing/decay displays; an edit to them can appear saved, sync as 'synced', and later revert without any error.

**[MEDIUM] Restore-from-cloud is not marked as a remote update, so the restored (older) state is immediately re-uploaded with its stale updatedAt, and local-only records are dropped without warning**
- File: `src/App.tsx:353-371`
- Evidence: handleRestoreFromCloud sets appStateRef and setAppState(cloudData) but never sets isRemoteUpdateRef.current = true and never merges with current local state. The save effect therefore treats the restore as a fresh local edit and re-saves cloudData to Firestore within 300ms — with cloudData's own older updatedAt intact (saveStateToFirestore uses state.updatedAt). Locally logged sessions that were never backed up are silently discarded by the wholesale replacement, and the re-upload stamps the account with a backwards-moving timestamp that corrupts later isCloudNewer merge decisions.
- Impact: Restore behaves as a silent two-way overwrite rather than a one-way recovery: it destroys un-backed-up local work and poisons the freshness signal future merges depend on.

**[MEDIUM] Concurrent auth callbacks can leak a Firestore subscription and double-run the merge/save; logout silently re-signs-in as a brand-new anonymous user, orphaning the previous cloud identity**
- File: `src/App.tsx:205-262, 386-395`
- Evidence: Inside the auth callback, unsubscribeFirestore is only assigned after the awaited load+save completes (line 248), while the callback's own guard (`if (unsubscribeFirestore) unsubscribeFirestore()`) runs at entry. Overlapping invocations (initial anonymous sign-in racing a Google sign-in from handleGoogleLogin, which also calls setCurrentUser independently at line 388) can each establish a subscription, with the earlier handle overwritten and never unsubscribed — duplicate merge/setState loops for the session. Separately, handleLogout (lines 391-395) sets status 'offline', but initAuthListener's callee automatically signs in anonymously on sign-out, firing the callback again with a NEW anonymous uid: the user's cloud data under the previous anonymous uid is abandoned and subsequent syncs write to the fresh identity, with the UI briefly claiming 'offline' before flipping to the new account.
- Impact: Duplicate listeners multiply merge churn and make sync behaviour nondeterministic after login/logout transitions; a user who logs out believing his data is parked finds later work syncing under a different, empty cloud identity.

**[LOW] POST /api/state accepts an empty chapters array as valid, letting any caller wipe the server's persisted state to zero chapters**
- File: `server.ts:278-288`
- Evidence: Validation is only `if (req.body && Array.isArray(req.body.chapters))` — an empty array passes. `serverState = {...req.body, updatedAt: Date.now()}; saveStateToDisk()` then persists the empty state to data/server-state.json. Only refreshStateFromServer's client-side `chapters.length > 0` check (App.tsx:178) prevents the app itself from adopting the husk; the server's disk copy — the MCP tools' data source — is already destroyed.
- Impact: A single malformed or malicious POST permanently empties the server-side record that MCP clients read and write, with no backup or rejection.

### Three-way sync truth (localStorage × server file × Firestore) (`sync-three-way`)

**[CRITICAL] Firestore save path is a blind whole-document overwrite — closing a stale tab deletes newer cloud data**
- File: `src/App.tsx`
- Evidence: Effect 2 (App.tsx:276-307) debounces 300ms then calls saveStateToFirestore(currentUser.uid, whole appState); the beforeunload/visibilitychange flush (App.tsx:310-336) unconditionally calls saveStateToFirestore(currentUser.uid, appStateRef.current) on tab close. firebase.ts saveStateToFirestore (400-567) does setDoc(docRef, cleanPayload, {merge:true}) at line 553 with no transaction, no updatedAt/etag precondition, and no merge with existing cloud content. Saving never merges — only loading does.
- Impact: Device/tab A is left open with yesterday's state. Device B logs 5 sessions today (cloud now newer). A is closed — or A makes one trivial edit — and A's stale whole state overwrites Firestore, permanently deleting B's logs/scores from the cloud copy. The deletion then propagates back to B on its next initial merge because B's local and cloud now agree on the stale version for chapters (per-chapter last-writer-wins).

**[CRITICAL] Server file store blindly overwrites and is blindly obeyed — stale server-state.json destroys newer local/cloud data, and vice versa**
- File: `src/App.tsx`
- Evidence: Broadcast effect (App.tsx:188-199) POSTs the entire appState to /api/state 1200ms after EVERY state change, including the very first mount (pre-cloud-merge localStorage/seed state). server.ts POST /api/state (278-289) unconditionally does serverState = {...req.body, updatedAt: Date.now()} and saveStateToDisk() — no version comparison. refreshStateFromServer (App.tsx:173-186) GETs /api/state and, if chapters.length>0, does setAppState(serverData); saveAppState(serverData) with NO mergeLocalAndCloudState and NO updatedAt check. It is wired as McpModal's onStateRefresh (App.tsx:981; McpModal.tsx:308-324 fires it after log_study_session, add_test_score, import_restore_data, etc.).
- Impact: Two failure directions: (1) Merely opening the app posts possibly-stale local state over data/server-state.json, wiping edits an MCP client just made directly to the server. (2) After any MCP tool call, the refresh pulls the server's whole snapshot — which started from the committed, frozen data/server-state.json (86 chapters, 21 logs, 49 tests, 0 scores) plus that one edit — over the browser's newer local state, and effect 2 then auto-saves that regressed state to Firestore within 300ms. One MCP log entry can roll back days of browser-side study data in all three stores.

**[CRITICAL] Google sign-in race: pre-merge local state is written to the new account's Firestore doc before the merge ever reads it**
- File: `src/App.tsx`
- Evidence: isInitialCloudLoadDone is declared false (146), set true once in the first auth callback's finally (244), and never reset on user change (only other reference is the gate at 287). handleGoogleLogin (373-376) calls setCurrentUser(user) directly. Effect 2 depends on [appState, currentUser] (276-307), so the currentUser change alone re-runs it; with the stale gate still true it schedules saveStateToFirestore(newGoogleUid, current local state) after 300ms. The auth listener's loadStateFromFirestore + merge for the Google uid (218-237) runs concurrently over the network with no gate blocking that save.
- Impact: Signing in with Google can overwrite the Google account's existing cloud document — e.g. study data logged on a second device under that Google account and never present locally — with this device's local state ~300ms after sign-in, before loadStateFromFirestore returns. The listener then 'merges' local with the just-overwritten document, so the other device's cloud-only data is unrecoverable. The same race fires on the automatic anonymous re-login after logout (new uid, same stale gate).

**[CRITICAL] Deletions never sync: union-by-id merge resurrects deleted logs and replaced test scores forever**
- File: `src/services/firebase.ts`
- Evidence: mergeLocalAndCloudState builds studyLogs (251-261), tests (263-281) and testScores (283-293) as pure unions by id — cloud entries are inserted first, local entries overwrite same-id, and nothing is ever removed; there are no tombstones anywhere in AppState (types.ts:153-164). Concrete trigger 1: App.tsx handleSaveTestScore (620-631) deliberately replaces a test's old score by filtering prev.testScores on testId and adding a new id — the old score id still exists in Firestore, so the next login/remote merge unions it back, leaving two scores for one test. Concrete trigger 2: handleDeleteStudyLog (App.tsx:438-470) removes a log locally, but the cloud copy re-enters via the same union on next sync and the recalculated chapter is then re-merged against it.
- Impact: Any record he deletes or replaces returns on the next login or cross-device sync, in every store. Corrected test scores revert to double-counting (old + new score for the same Allen mock), and deleted study logs reappear, corrupting revision counts, due dates and analytics he acts on.
- Also found independently by: app-sync, firebase

**[CRITICAL] Firestore is world-readable and world-writable, and every guest save copies his full state to a single global 'guest_latest' document**
- File: `firestore.rules`
- Evidence: firestore.rules lines 5-18: match /users/{userId} and /cloudBackups/{backupId} both 'allow read, write: if true' — no auth check at all. The project is identifiable from the committed firebase-applet-config.json imported at firebase.ts:22 (projectId weekwise-pr7wl, apiKey in repo). firebase.ts saveStateToFirestore (555-563) writes the full payload to cloudBackups/{userId} and, for guest ids, additionally to the single shared document cloudBackups/guest_latest; loadStateFromFirestore (588-592) reads guest_latest as a fallback for ANY guest_ caller.
- Impact: Anyone who finds the public repo/config can read, overwrite, or delete his complete study history, test scores and settings in Firestore with no credentials — and can read his entire state from the predictable cloudBackups/guest_latest document. A stranger's guest save also overwrites guest_latest, so a guest-mode restore can pull a stranger's state (or an attacker's payload) over his.

**[CRITICAL] Express state and MCP endpoints have no authentication, wildcard CORS, and listen on all interfaces**
- File: `server.ts`
- Evidence: CORS middleware sets Access-Control-Allow-Origin: * for all routes (80-89). GET /api/state returns the full serverState to anyone (274-276); POST /api/state replaces it for anyone (278-289). POST /api/mcp (149-169) exposes all MCP tools — including log_study_session, add_test_score and import_restore_data — with no auth. The server binds 0.0.0.0 (319-323). Any website he visits can also POST to localhost:3000/api/state from his browser under the wildcard CORS policy.
- Impact: Anyone on his network (hostel/café Wi-Fi) — or any web page open in his browser — can download his full study record or overwrite/corrupt the server copy, which then propagates into localStorage and Firestore via refreshStateFromServer and the auto-save effect. His data is exposed to strangers and to drive-by browser attacks.

**[HIGH] Chapter merge undoes resets and discards the losing device's edits wholesale; pillars and cleared fields can never be unset via sync**
- File: `src/services/firebase.ts`
- Evidence: Chapter merge (306-381): one 'base' chapter wins and the result is {...base, ...} (370-380), so the loser's currentConfidence, nextRevisionDate, revisionCount and learningStage edits are dropped even when the two devices edited different fields. When updatedAt is equal or 0 on either side (seed chapters carry updatedAt 0/undefined), the winner is chosen by progress score revisionCount*100 + completionPercentage + totalStudySessions*10, ties favouring cloud (320-336). Pillars are OR-merged (338-346). Milestone fields use base||other fallback (349-368): firstPassCompletedDate, startedDate, targetDeadline, notes.
- Impact: handleResetChapterHistory (App.tsx:474-506) zeroes a chapter (revisionCount 0, completion 0) — exactly the state that scores lowest — so the next cloud merge picks the stale cloud chapter as base and silently resurrects the progress he just reset. Un-completing a pillar on one device is reversed by the other device's true. Clearing a deadline or note never propagates (empty falls back to the old value). Two devices editing different aspects of the same chapter lose one side's work with no conflict signal.

**[HIGH] actionHistory is silently dropped by every Firestore hop, then the loss is broadcast over the server's MCP audit trail**
- File: `src/services/firebase.ts`
- Evidence: storage.ts loadAppState preserves actionHistory (line 44) and AppState defines it (types.ts:158), but saveStateToFirestore's payload (firebase.ts:410-548) contains no actionHistory field, parseFirestoreState (175-238) returns no actionHistory, and mergeLocalAndCloudState's return object (385-394) omits it. App.tsx's initial merge therefore replaces local state with a history-less object and saveAppState persists that loss; the broadcast effect (App.tsx:188-199) then POSTs the history-less state to server.ts, whose POST handler replaces serverState wholesale (server.ts:280-284) — erasing actionHistory entries the MCP server recorded directly in server state.
- Impact: The audit/action history (used by McpModal's entry counter and MCP get_action_history) is wiped from localStorage and Firestore on the first cloud sync after app start, and MCP-side history is wiped from the server file on the next UI state change. The loss is silent in all three stores.

**[HIGH] updatedAt is manufactured at every sync hop, so every timestamp-based precedence decision is meaningless**
- File: `src/services/firebase.ts`
- Evidence: server.ts POST stamps updatedAt: Date.now() regardless of the payload's real edit time (282). App.tsx initial merge stamps unifiedState.updatedAt = Math.max(..., Date.now()) (229). mergeLocalAndCloudState stamps every merged chapter updatedAt: Math.max(local, cloud, Date.now()) (379) and the merged top-level updatedAt the same way (393). saveStateToFirestore stamps any chapter with falsy updatedAt to the save time: updatedAt: Number(ch.updatedAt) || currentTimestamp (445). storage.ts loadAppState defaults a missing top-level updatedAt to Date.now() (48). Settings/pacing choice in the merger is decided by comparing these values (firebase.ts:383, 390-391).
- Impact: Merely opening the app, syncing, or saving re-dates untouched chapters and whole states to 'now'. A stale device that simply launches the app acquires the freshest timestamps in the system and thereafter wins settings selection and per-chapter comparisons against devices that actually edited more recently. Last-writer-wins throughout the sync layer is decided by who synced last, not who studied last.

**[HIGH] Logout does not log out: sign-out instantly re-authenticates anonymously and keeps uploading his data under a new identity**
- File: `src/services/firebase.ts`
- Evidence: initAuthListener (firebase.ts:107-130): onAuthStateChanged with user==null immediately calls signInAnonymously and reports that new user via onUserChanged (118-121). App.tsx handleLogout (378-382) only calls logoutFirebaseAuth() (signOut, firebase.ts:141-145) and sets local UI state to null/'offline' — the listener then fires with a brand-new anonymous user, re-enters the merge branch (App.tsx:204-267), re-uploads the merged local state to users/{newAnonUid}/consoleData/state, and restores status to 'synced'.
- Impact: The Logout button is functionally dead: cloud sync never stops, the 'offline' status is immediately overwritten, and a full copy of his study data is written under yet another anonymous uid he does not control or know. Anyone expecting logout to stop cloud exposure is misled.

**[HIGH] Anonymous identity fragmentation orphans his cloud data: clearing site data makes existing Firestore backups unreachable**
- File: `src/services/firebase.ts`
- Evidence: Identity is an auto-created anonymous Firebase user (firebase.ts:114-126) with no credential linking in loginWithGoogle (132-139, plain signInWithPopup replaces the user). Cloud data is keyed strictly by uid: users/{uid}/consoleData/state (405, 579). loadStateFromFirestore's fallbacks (572-608) try cloudBackups/{userId} and, only if userId starts with 'guest_', cloudBackups/guest_latest (588-592) — an anonymous uid gets no fallback. App.tsx treats a null load as 'no cloud data' and uses local only (218-227).
- Impact: Clear cookies/site data (or use a fresh browser profile) and Firebase mints a new anonymous uid: the previous uid's Firestore document still exists but nothing will ever query it, and if localStorage was cleared in the same action his cloud 'backup' is effectively gone despite the app presenting cloud sync as protection. Each identity change also strands another full copy of his data in Firestore.

**[HIGH] Restore-from-cloud and backup import replace state wholesale and are immediately pushed to all three stores with a forged-fresh timestamp**
- File: `src/App.tsx`
- Evidence: handleRestoreFromCloud (353-371) does setAppState(cloudData); saveAppState(cloudData) with no merge — local-only work since the last cloud save is discarded — and because isRemoteUpdateRef is not set, effect 2 and the broadcast effect then push the restored snapshot to Firestore and the server file. storage.ts importBackupJSON (94-123) validates only that chapters/studyLogs/tests exist, drops actionHistory and deviceClientId (104-113), and stamps updatedAt: Date.now() (112); App.tsx handleImportState (672-682) immediately saves the import to localStorage and Firestore, and the broadcast effect posts it to the server.
- Impact: Restoring or importing an old backup silently destroys newer logs/scores everywhere: the imported state carries Date.now() as its timestamp, so it out-ranks genuinely newer data in every updatedAt comparison, and it is replicated to localStorage, Firestore and server-state.json within ~1.2s with no confirmation and no pre-restore snapshot kept.

**[MEDIUM] Firestore save rewrites pacing settings with wrong fallback dates — syllabus target 2026-12-31 becomes 2026-03-31**
- File: `src/services/firebase.ts`
- Evidence: saveStateToFirestore rebuilds pacingSettings field-by-field (539-546): targetSyllabusDate fallback '2026-03-31', targetExamDate fallback '2026-05-03', studyDaysPerWeek fallback Number(...)||6. The canonical defaults in src/data/seedData.ts (33-40) are targetSyllabusDate '2026-12-31', targetExamDate '2027-05-02', studyDaysPerWeek 7. The fallback fires whenever the in-memory field is empty/missing (e.g. state that arrived via storage import, server refresh, or an older backup lacking a field).
- Impact: A single cloud save of a state with a missing/blank pacing field permanently writes a syllabus deadline ~9 months early and an exam date a year early into Firestore; parseFirestoreState then returns those as his real settings on every device, so all pacing/flight-plan calculations silently target dates already in the past instead of 31 Dec 2026 / 2 May 2027.

**[MEDIUM] Two tabs in the same browser silently overwrite each other — device id is per-browser, same-device remote updates are ignored**
- File: `src/services/firebase.ts`
- Evidence: getDeviceClientId (33-44) stores one id in localStorage ('pcb01_device_client_id'), shared by all tabs of the browser. subscribeToStateFromFirestore computes isFromOtherDevice = data.deviceClientId !== myDeviceId (641-643), and App.tsx's subscription handler does nothing when isFromOtherDevice is false (248-267). No 'storage' event listener exists anywhere in App.tsx, so tabs do not see each other's localStorage writes either.
- Impact: Open the app in two tabs (e.g. phone-synced desktop with a duplicate tab): edits in tab 1 are invisible to tab 2, tab 2's per-tab in-memory state is stale, and tab 2's next edit, debounced save, or beforeunload flush overwrites Firestore and localStorage with the stale whole state, deleting tab 1's work via the blind save path.

**[MEDIUM] Cross-device merged state is never written back to Firestore, but is written to the server — the three stores diverge after every remote merge**
- File: `src/App.tsx`
- Evidence: The subscription handler (248-267) merges remote into local, sets isRemoteUpdateRef=true, and saves only to localStorage. Effect 2 (282-286) sees the flag, clears it, and returns before the Firestore save — so the union result (e.g. local-only logs now combined with remote-only logs) is never persisted to the cloud. The broadcast effect (188-199) has no such guard and POSTs the merged state to the server file 1200ms later.
- Impact: After a cross-device merge, server-state.json holds the union while Firestore still holds only the remote device's version. If this browser's localStorage is lost before its next local edit triggers a cloud save, the local-only records that existed solely in the merged copy survive only in the server file — a store the app never reads on fresh load — and are effectively lost to the normal sync loop.

**[MEDIUM] Redundant cloud backup can silently diverge and is never consulted while a primary document exists**
- File: `src/services/firebase.ts`
- Evidence: saveStateToFirestore writes the primary doc (553) then the cloudBackups copy inside a try/catch that demotes failure to a console.warn 'non-fatal warning' (556-566) while the caller still reports status 'synced'. loadStateFromFirestore (577-592) only reads cloudBackups/{userId} when the primary snapshot does NOT exist (!snap.exists()) — not when it is older, truncated, or corrupt-but-present; parseable-but-empty chapters also just return null (599-601).
- Impact: If backup writes start failing (rules change, quota), he is told sync succeeded while his fallback copy goes stale indefinitely. If the primary document is later damaged but still exists, restore returns the damaged/empty result or null and never falls back to the healthy redundant copy the UI advertises as multi-device insurance.

### Firebase sync layer (`firebase`)

**[CRITICAL] Entire cloud study record is world-readable/writable, and every guest save overwrites one global 'guest_latest' document any stranger can read**
- File: `src/services/firebase.ts`
- Evidence: saveStateToFirestore (lines 555-563) writes the full state payload to cloudBackups/{userId} and, for any userId starting 'guest_', also to the single fixed document cloudBackups/guest_latest. loadStateFromFirestore (lines 588-591) restores from guest_latest whenever a guest's own doc is missing. firestore.rules lines 5-18 grant 'allow read, write: if true' on /users/{userId}/** and /cloudBackups/{backupId}/** — no auth check at all. guest_latest is a guess-free, fixed path.
- Impact: Anyone on the internet can read, overwrite, or wipe Sarthak's complete syllabus progress, study logs and test scores via the cloudBackups/guest_latest or users/{uid} paths without any credential. Any other guest user of the same deployed app overwrites his guest backup with their state, and his next guest restore can pull a stranger's state in as his own record.

**[HIGH] Merge fabricates freshness: every merged chapter is re-stamped updatedAt = Date.now(), and saving stamps never-edited chapters with now**
- File: `src/services/firebase.ts`
- Evidence: Chapter merge return (line 379): 'updatedAt: Math.max(localUpdatedAt, cloudUpdatedAt, Date.now())' — applied to ALL merged chapters, changed or not. Whole-state merge does the same (line 393). In saveStateToFirestore (line 445) a chapter with no updatedAt is written as 'updatedAt: Number(ch.updatedAt) || currentTimestamp'. parseFirestoreState line 235 likewise defaults a missing state updatedAt to Date.now().
- Impact: Timestamps stop meaning 'when this chapter last changed' and start meaning 'when a sync last happened'. Concrete failure: device A merely opens the app (merge stamps all its stale chapters 'now'); device B had genuinely edited a chapter an hour earlier. On the next merge A's stale content has the newer timestamp and wins last-writer-wins, silently reverting B's real edit. The longer sync runs, the less the timestamp law can be trusted.

**[HIGH] Chapter merge is winner-take-all for the fields that drive revision scheduling — the loser's newer progress is silently dropped**
- File: `src/services/firebase.ts`
- Evidence: When chapter updatedAt values differ (lines ~318-322) one side becomes 'base' and the return (lines ~368-380) is '{...base, pillars, startedDate, firstPassCompletedDate, daysTakenToComplete, targetDeadline, notes, lastStudiedDate, updatedAt}'. revisionCount, nextRevisionDate, currentConfidence, completionPercentage, learningStage and totalStudySessions come only from base; the other side's values are never compared or maxed. Only when timestamps are equal/zero does a progress-score heuristic (lines ~324-335) run.
- Impact: If the side with the older chapter timestamp happens to hold the higher revisionCount or the corrected nextRevisionDate (e.g. a revision logged on a device whose chapter updatedAt was 0, missing, or clock-skewed), that progress vanishes in the merge and is then saved to the cloud as truth. He can be shown a chapter as less revised, or due on the wrong date, with no trace the other value ever existed.

**[HIGH] Same-ID conflicts in logs, tests and scores are resolved 'local always wins' with no recency check**
- File: `src/services/firebase.ts`
- Evidence: Study logs: cloud entries are put in logMap first, then local entries overwrite them unconditionally (lines ~250-258). Test scores: identical pattern (lines ~284-291). Tests: 'testMap.set(t.id, { ...existing, ...t, linkedChapterIds: merged })' (lines ~270-280) — every local field overwrites the cloud field. StudyLog/TestScore carry no updatedAt, and merge never compares their timestamp fields before overwriting.
- Impact: Edit a test score or correct a log on his phone, then open a laptop holding a stale copy of the same id: the merge keeps the laptop's old version, discards the phone's correction, and the result is saved back to the cloud. Corrections to scores — the numbers his error analysis depends on — can be silently reverted by whichever device syncs last, regardless of which edit is newer.

**[HIGH] Settings and pacing are chosen wholesale by the whole-state updatedAt, which sync itself inflates — the losing side's gap/multiplier changes vanish**
- File: `src/services/firebase.ts`
- Evidence: Lines 383, 390-391: 'isCloudNewer = (cloud.updatedAt||0) >= (local.updatedAt||0)' decides the ENTIRE settings and pacingSettings objects from one side. But merge line 393 and App.tsx line 229 both bump state updatedAt to Date.now() on every load/merge, and parseFirestoreState line 235 treats a missing cloud updatedAt as Date.now() (brand new).
- Impact: Settings hold defaultGaps [3,7,14,30] and confidenceMultipliers — the numbers that compute every revision due date. A device that merely opened the app later (stamping updatedAt=now without touching settings) beats a device that deliberately changed gaps/multipliers earlier while offline. His spacing configuration can revert without any warning, shifting all future revision dates.

**[HIGH] Logout is defeated: the auth listener instantly re-signs-in anonymously, fragmenting his data under a fresh anonymous uid**
- File: `src/services/firebase.ts`
- Evidence: initAuthListener (lines 114-127): onAuthStateChanged fires with null user and immediately calls signInAnonymously, calling onUserChanged with the new anonymous user. logoutFirebaseAuth (lines 141-145) is a bare signOut. There is no flag distinguishing 'never signed in' from 'just signed out'.
- Impact: Clicking logout does not log him out: a brand-new anonymous account is created instantly, and subsequent auto-saves/subscription bind to that new uid's document. His Google-account cloud state stops receiving updates while the UI flow continues as if signed in — his record silently splits across accounts, and the anonymous copy is stranded if that browser's session is lost.

**[HIGH] Cloud save fabricates pacing targets: hardcoded fallback dates '2026-03-31' / '2026-05-03' and 6 study days contradict the real defaults**
- File: `src/services/firebase.ts`
- Evidence: saveStateToFirestore lines 540-545: targetSyllabusDate falls back to '2026-03-31', targetExamDate to '2026-05-03', studyDaysPerWeek to 6, targetRevisionPasses via '|| 3'. The canonical DEFAULT_PACING_SETTINGS in src/data/seedData.ts lines 33-40 are '2026-12-31', '2027-05-02' and studyDaysPerWeek 7. parseFirestoreState line 233 returns data.pacingSettings as-is, so whatever was saved comes back as truth.
- Impact: Whenever pacingSettings reaches a save with any field missing/empty (partial object, older doc, import), the cloud is written with an exam date over a year early and already in the past, and a 6-day week he never chose. On next load those fabricated dates are his pacing baseline — pacing/progress verdicts computed against a deadline that has already passed.

**[MEDIUM] Pillars can never be un-marked and milestone dates/notes can never be cleared across a merge**
- File: `src/services/firebase.ts`
- Evidence: Merged pillars are a pure OR of both sides (lines 338-346): 'lectures: !!(base.pillars?.lectures || other.pillars?.lectures)' etc. Milestone dates use 'base.firstPassCompletedDate || other.firstPassCompletedDate' (lines 349-352) and notes 'base.notes || other.notes' (line ~358), so an empty/null correction on one side always loses to any non-empty value on the other.
- Impact: Tick a pillar (e.g. Anki) by mistake on one device and untick it on another: after merge it is ticked again, permanently — pillar completion feeds his picture of what a chapter still needs. Likewise a wrongly set firstPassCompletedDate or a note he deleted reappears. False progress can never be cleaned up once two copies exist.

**[MEDIUM] Cloud round-trip silently drops fields: actionHistory is never saved, parsed or merged, and tests lose updatedAt/timestamp**
- File: `src/services/firebase.ts`
- Evidence: AppState (src/types.ts) includes actionHistory?: ActionLog[], but the saveStateToFirestore payload (lines ~417-548) has no actionHistory key, parseFirestoreState (lines 229-237) never reads it, and mergeLocalAndCloudState's return (lines 385-394) omits it. The test serializer (lines 482-491) also drops the Test type's updatedAt and timestamp fields, keeping only createdAt.
- Impact: Every cloud restore or cross-device merge wipes his action history audit trail from the active state, and test edit recency is destroyed in the cloud copy, making any future timestamp-based test conflict resolution impossible. Data he can see locally is not actually in his cloud backup despite the backup claiming to be complete.

**[MEDIUM] Anonymous-to-Google sign-in never migrates the anonymous cloud data; load is keyed strictly by the new uid**
- File: `src/services/firebase.ts`
- Evidence: loginWithGoogle (lines 132-138) uses signInWithPopup, not linkWithPopup/linkWithCredential, so the anonymous uid is abandoned rather than upgraded. loadStateFromFirestore (lines 575-604) only ever looks under the passed userId (plus cloudBackups/{userId}); nothing enumerates or merges a previous anonymous uid's document.
- Impact: Study state backed up under the auto-created anonymous account (e.g. from another browser where he never signed in) is invisible after Google login on that browser if local storage was cleared or the local copy diverges — the cloud copy exists but no code path can ever reach it again once the anonymous session is gone.

**[MEDIUM] Remote updates are silently ignored when the writer did not stamp deviceClientId, and the backup collection is never subscribed**
- File: `src/services/firebase.ts`
- Evidence: subscribeToStateFromFirestore line 642: 'isFromOtherDevice = !!data.deviceClientId && data.deviceClientId !== myDeviceId'. App.tsx's callback only merges when isFromOtherDevice is true. The subscription (lines 622-652) listens only to users/{userId}/consoleData/state, never to cloudBackups/{userId}, even though loadStateFromFirestore treats the backup as a valid source.
- Impact: A state written by any path that omits deviceClientId (a restored/imported doc, the redundant backup copy, an older client) parses fine but is classified as 'not from another device' and dropped — the receiving device keeps showing stale state while reporting 'synced'. Changes that land only in the backup document never propagate live at all.

**[MEDIUM] parseFirestoreState validates chapters but passes studyLogs, tests, testScores and settings through raw and unmerged with defaults**
- File: `src/services/firebase.ts`
- Evidence: Lines 229-233: 'studyLogs: Array.isArray(data.studyLogs) ? data.studyLogs : INITIAL_STUDY_LOGS', same pattern for tests/testScores, and 'settings: data.settings || DEFAULT_SETTINGS' — no per-field coercion (contrast the chapter branch, lines ~185-228, which coerces every field). A settings object present but missing confidenceMultipliers keys is returned as-is.
- Impact: A malformed or partial cloud document (hand-edited backup, older schema, the guest_latest doc from another app version) injects string scores, missing multipliers or undefined gaps straight into the app's maths, producing NaN revision intervals or wrong totals with no validation error — the parse layer claims to return 'a clean, complete AppState' and does not for four of its six collections.

**[LOW] Guest identity is a random localStorage string: clearing storage orphans the guest backup, and save-time ID fabrication can collapse distinct tests/scores into one**
- File: `src/services/firebase.ts`
- Evidence: getDeviceClientId (lines 33-44) mints 'dev_' + Math.random().toString(36) + Date.now() stored only in localStorage key 'pcb01_device_client_id'; App.tsx builds guest ids as 'guest_' + this value. In saveStateToFirestore, id-less tests get `test-${Date.now()}` (line 483) and id-less scores `score-${Date.now()}` (line 493) — identical for every item serialized in the same millisecond. Also confidenceRating is fabricated as 'Number(l.confidenceRating) || 3' (line 477) and totalMarks as '|| 720' (line 489).
- Impact: A new browser/profile or cleared storage creates a new guest identity whose own cloudBackups/{guest_id} is unreachable (only the shared guest_latest remains). Two id-less tests or scores saved together receive the same id and are deduplicated into a single entry by the next merge's union-by-ID, losing one record; a genuinely recorded confidence of 0 is rewritten as a mid-scale 3 in the backup.

**[LOW] sanitizeForFirestore silently deletes undefined array elements, shifting positions instead of preserving the array**
- File: `src/services/firebase.ts`
- Evidence: Lines 158-161: arrays are processed with '.filter((item) => item !== undefined)' before mapping, so [3, 7, undefined, 30] becomes [3, 7, 30] rather than keeping length or nulling the slot. The doc comment (lines 147-150) claims values are 'transformed into null or omitted' without noting positional loss.
- Impact: For positional arrays such as settings.defaultGaps, one undefined entry silently shortens the revision ladder — the chapter's later revision rounds use the wrong gaps after a cloud round-trip, with no error anywhere. The corruption is invisible until due dates drift.

### Storage & seed data (`storage-seed`)

**[CRITICAL] Any localStorage parse error silently wipes all his data, and the next auto-save makes it permanent**
- File: `src/services/storage.ts:51-54`
- Evidence: storage.ts:12 `const parsed = JSON.parse(raw)` inside a try whose catch (lines 51-54) is `console.error(...); return getInitialState();` — no attempt to preserve, back up, or partially salvage the raw string. App.tsx's persistence effect ('Save to local storage synchronously on every state transition', ~line 279) then calls saveAppState(appState) with that fresh seed state, overwriting the stored value. One truncated/corrupted write therefore converts a recoverable bad string into permanent loss of all study logs, test scores, and chapter progress.
- Impact: A single corrupted localStorage value silently resets him to the June seed state and then destroys the original data on the first auto-save — total, unrecoverable loss of his syllabus/revision/test record with no warning shown.

**[HIGH] saveAppState swallows quota/blocked-storage failures — logging appears to work while nothing is saved**
- File: `src/services/storage.ts:57-63`
- Evidence: storage.ts:57-63: `export function saveAppState(state: AppState): void { try { localStorage.setItem(...) } catch (err) { console.error('Error saving state to localStorage:', err); } }` — the function returns void, exposes no success flag, and the only signal is a console message the user never sees. Every caller (App.tsx persistence effect, import, reset) proceeds as if the write succeeded.
- Impact: Once localStorage is full (state includes the ever-growing actionHistory plus logs/scores) or blocked, every subsequent study log and score is silently never persisted; he only discovers the loss on reload, with the app having appeared to work throughout.

**[HIGH] Chapter load migration forces bookReading and ncertReading to always be equal, falsifying pillar completion**
- File: `src/services/storage.ts:24-33`
- Evidence: storage.ts:27-28: `bookReading: !!(ch.pillars.bookReading ?? ch.pillars.ncertReading), ncertReading: !!(ch.pillars.bookReading ?? ch.pillars.ncertReading)` — both pillars are computed from the identical expression, so they can never differ after a load. Input {bookReading:false, ncertReading:true}: `false ?? true` evaluates to false, so a completed NCERT pillar loads as false. Input {bookReading:true, ncertReading:false} loads as both true.
- Impact: On every reload, one of his six study pillars is either silently un-completed or falsely completed, corrupting the pillar-derived completion percentages he uses to judge whether a chapter's first pass is actually done.

**[HIGH] Deleting all tests or chapters resurrects the full seed set on next load**
- File: `src/services/storage.ts:13,42`
- Evidence: storage.ts:13 `Array.isArray(parsed.chapters) && parsed.chapters.length > 0 ? ... : INITIAL_CHAPTERS` and line 42 `tests: Array.isArray(parsed.tests) && parsed.tests.length > 0 ? parsed.tests : INITIAL_TESTS` — while studyLogs (line 41) and testScores (line 43) correctly accept an empty array. Tests are deletable (TEST_DELETED exists in the app), so an intentionally emptied test list is a legitimate state this code cannot represent.
- Impact: If he deletes all tests (or all chapters are removed), the next reload resurrects all 49 seed tests / 86 seed chapters as if never deleted — deleted items return and any state built on their absence is wrong.
- Also found independently by: error-crash, sync-three-way

**[HIGH] importBackupJSON overwrites live state after only a truthiness check and skips all load-time normalisation**
- File: `src/services/storage.ts:94-118`
- Evidence: storage.ts:102-114: validation is only `if (!parsed.chapters || !parsed.studyLogs || !parsed.tests) throw` — truthiness, so a non-array object for chapters passes. The imported chapters are used raw (`chapters: parsed.chapters`) with none of loadAppState's normalisation (pillar migration, updatedAt synthesis, learningStage/completion defaults), actionHistory and deviceClientId from the backup are dropped entirely, and saveAppState(state) overwrites the current good state before any deeper shape check.
- Impact: Restoring an older or hand-edited backup silently loses his audit history, reintroduces pre-migration chapter shapes that downstream sync/render code does not expect, and can replace a healthy state with a malformed one that crashes or mis-syncs — with the previous state already overwritten.

**[MEDIUM] getInitialState and resetToSeedData hand out the shared seed constants by reference, so the seed itself can be poisoned**
- File: `src/services/storage.ts:65-82`
- Evidence: storage.ts:65-75 getInitialState returns `chapters: INITIAL_CHAPTERS, tests: INITIAL_TESTS, settings: DEFAULT_SETTINGS, pacingSettings: DEFAULT_PACING_SETTINGS` by reference with no clone; loadAppState line 37 likewise returns the INITIAL_CHAPTERS array itself, and resetToSeedData (lines 78-82) saves getInitialState()'s result. The 'seed' the user resets to and the live working state are the same objects in memory.
- Impact: Any in-place mutation of chapter/test/settings objects during a session mutates the canonical seed constants, so 'reset to seed data' can restore already-mutated data instead of the pristine seed, and two fresh states alias each other.

**[MEDIUM] Stored settings are accepted wholesale with no merge against defaults, so missing keys silently change revision maths**
- File: `src/services/storage.ts:45-46`
- Evidence: storage.ts:45-46: `settings: parsed.settings || DEFAULT_SETTINGS, pacingSettings: parsed.pacingSettings || DEFAULT_PACING_SETTINGS` — a present-but-partial stored object is accepted whole, never merged key-by-key with defaults. Proof of consequence: src/services/spacedRepetition.ts:23 computes the gap multiplier as `settings.confidenceMultipliers?.[confidenceRating] ?? 1.0`, so a stored settings object missing confidenceMultipliers silently yields multiplier 1.0 for every confidence level.
- Impact: A settings object saved by an older version (or a partial backup import) silently flattens all confidence-based revision gaps to the base gap — wrong next-revision dates he will act on, with no indication anything is missing.

**[MEDIUM] No migration path: state under any previous storage key is treated as a fresh install**
- File: `src/services/storage.ts:4-11`
- Evidence: storage.ts:4 hard-codes `STORAGE_KEY = 'pcb01_study_console_state_v4'` and loadAppState reads only that key (line 8); the saved JSON carries no schema-version field, and there is no code anywhere in storage.ts that looks for or migrates data stored under any earlier key. Anything not under the exact v4 key is indistinguishable from a first run and gets getInitialState().
- Impact: Any state written under a previous key version is silently abandoned: the app opens on the pristine seed and his logs appear gone, even though the data still sits in localStorage under the old key.

**[MEDIUM] Backup export uses a data: URI for the entire pretty-printed state, which silently truncates as the state grows**
- File: `src/services/storage.ts:84-92`
- Evidence: storage.ts:85-92 builds the backup as `'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2))` in an anchor href — pretty-printed full state (chapters, logs, scores, actionHistory) in a data URI, a mechanism browsers cap at far smaller sizes than a Blob download, with no size check and no success feedback.
- Impact: As his history grows, the exported 'backup' can be truncated or fail to download while appearing to succeed; he discovers his only local backup is unusable (import rejects it) at the moment he needs to restore from it.

**[LOW] Seed chapters are born with updatedAt = 0 (epoch-stale) after load normalisation**
- File: `src/data/seedData.ts:50-75`
- Evidence: seedData.ts:50-75 createRawChapter never sets updatedAt (nor firstPassCompletedDate/targetDeadline), so all 86 seed chapters start with updatedAt undefined; storage.ts:23 then synthesises `updatedAt: Number(ch.updatedAt) || (ch.lastStudiedDate ? ... : 0)`, i.e. 0 for every unstudied chapter.
- Impact: Every seed chapter carries epoch-0 freshness, so in any updatedAt-based conflict resolution a never-touched local chapter is maximally stale by construction rather than by fact — the seed starts life losing freshness comparisons it never actually contested.

**[LOW] Atoms is labelled 'Modern Physics III' and Nuclei 'Modern Physics II', in that order**
- File: `src/data/seedData.ts:106-107`
- Evidence: seedData.ts:106-107: `createRawChapter('ch-phy-28', 'Atoms (Modern Physics III)', ...)` immediately followed by `createRawChapter('ch-phy-29', 'Nuclei & Radioactivity (Modern Physics II)', ...)` — the Modern Physics sequence numbers run III before II in chapter order.
- Impact: Minor mislabel: the chapter list presents the modern-physics sequence out of order (III before II), a small but real source of confusion when scanning or searching his Physics syllabus by those labels.

### Express server (server.ts) (`server`)

**[CRITICAL] State file written non-atomically; a torn write silently resets him to seed data on next boot**
- File: `server.ts:57-63, 30-52`
- Evidence: server.ts:59 `fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(serverState, null, 2), 'utf-8')` writes directly over the only copy — no temp file, no rename, no fsync, no backup. server.ts:30-52: if JSON.parse then throws, getInitialState only console.warns (line 39) and returns seed data (INITIAL_CHAPTERS/INITIAL_STUDY_LOGS/INITIAL_TESTS) stamped with a FRESH `updatedAt: Date.now()` (line 51), indistinguishable from real state.
- Impact: A crash, kill, or power loss mid-write truncates server-state.json (currently ~137KB, his only server-side copy). On next boot the corrupt file is silently replaced in memory by seed data with a brand-new updatedAt, so it looks like the newest state to any timestamp-based merge and to GET /api/state consumers; the first subsequent client POST or MCP update then overwrites the file permanently. His 21 study logs and 49 tests are gone with no error surfaced in the UI.
- Also found independently by: error-crash, sync-three-way

**[CRITICAL] Entire state and MCP mutation API exposed unauthenticated on 0.0.0.0 with wildcard CORS**
- File: `server.ts:80-89, 274-289, 156-175, 319`
- Evidence: server.ts:319 binds `app.listen(PORT, '0.0.0.0', ...)`; server.ts:81-83 sets `Access-Control-Allow-Origin: *`, allows GET/POST/PUT/DELETE and the Content-Type/Authorization headers, and answers every OPTIONS preflight with 200 (lines 84-87). No route checks any credential: GET /api/state returns the full state (274-276), POST /api/state replaces it (278-289), and POST /api/mcp (156-175) executes mutating tools including delete_test, log_study_session and import_restore_data (tool list advertised at lines 211-243).
- Impact: Anyone on his LAN (cafe/dorm/hostel Wi-Fi) can read his entire study record with one GET, or wipe/corrupt it with one POST. Because CORS is '*' and preflights are auto-approved, any website open in his browser can also fetch and overwrite the state and call the MCP mutation tools cross-origin. This is unauthenticated read + destructive write access to his syllabus/test truth, exposed on all network interfaces.

**[CRITICAL] POST /api/state is unconditional last-writer-wins whole-state replacement — stale browser snapshots silently erase MCP/server-side changes**
- File: `server.ts:278-289`
- Evidence: server.ts:278-285: POST /api/state does `serverState = { ...req.body, updatedAt: Date.now() }` unconditionally — it never compares req.body.updatedAt (or any version) against the current serverState.updatedAt before replacing the whole object, and it overwrites the client's timestamp with server receipt time, destroying the ordering information. Meanwhile MCP tools mutate the same serverState incrementally via updateState (server.ts:69-73), and the browser client POSTs its full appState snapshot on a 1200ms debounce after every local change (src/App.tsx, the useEffect posting to /api/state).
- Impact: Concrete loss sequence: an MCP client (or a second tab/device) logs a study session directly on the server; a browser tab holding a pre-session snapshot then fires its debounced whole-state POST and silently erases that session — and saveStateToDisk persists the erasure. There is no conflict response, no merge, and no log. Stale writers always win over newer server-side changes.

**[HIGH] State validation checks only that `chapters` is an array — partial payloads wipe every other collection**
- File: `server.ts:278-289, 30-41`
- Evidence: server.ts:279 accepts any body where `Array.isArray(req.body.chapters)` and spreads it wholesale: a body of `{chapters: [...]}` with no studyLogs/tests/testScores/settings replaces serverState with those collections undefined, and `{chapters: []}` is accepted, wiping all chapters server-side; both are immediately persisted (line 284) and later served by GET /api/state. Same shallowness at boot: server.ts:35 returns the parsed file if only `parsed.chapters` is an array, with no check that studyLogs/tests/testScores/settings exist or are the right types.
- Impact: One malformed or partial payload (buggy client, curl typo, an MCP playground experiment) destroys every collection except chapters on disk, or boots the server with corrupt-shaped state that downstream code assumes are arrays — producing crashes or silently empty revision/test views he will read as 'nothing due'.

**[HIGH] Disk-write failures are swallowed and the API still reports success — data believed saved is lost on restart**
- File: `server.ts:57-63, 69-73, 284-285`
- Evidence: server.ts:57-63: saveStateToDisk catches all write errors and only console.errors them, returning void. Callers cannot tell: updateState (69-73) returns the new state as if persisted, and POST /api/state responds `{ success: true, updatedAt }` at line 285 regardless of whether the write succeeded.
- Impact: Disk full, a read-only/permission-broken data directory, or an I/O error means every log he records appears saved (client told success:true) but is held only in RAM; the next server restart silently reverts to the last good file. Silent non-persistence of study logs with a success response is worse than an honest error.

**[HIGH] Server persists his real study data to a git-tracked file inside the repo**
- File: `server.ts:22`
- Evidence: server.ts:22 resolves persistence to `path.resolve(__dirname, 'data', 'server-state.json')` — inside the repository working tree. Verified: `git ls-files data/` lists data/server-state.json as tracked, and .gitignore contains no entry for it (only node_modules/, build/, dist/, coverage/, *.log, .env*). The committed file contains his real state: 86 chapters, 21 studyLogs, 49 tests.
- Impact: Every commit/push of this repo carries his live personal study record — logs, tests, settings — to GitHub, where the repo is fetchable by others. The server design guarantees the data file lives in the one directory guaranteed to be published, instead of an ignored or out-of-tree location.

**[MEDIUM] Every mutation synchronously rewrites the entire pretty-printed state file on the main thread**
- File: `server.ts:57-63, 69-73`
- Evidence: server.ts:59 serialises the entire state with `JSON.stringify(serverState, null, 2)` (pretty-printed, ~137KB today and growing with every log) and writes it with blocking writeFileSync on the event-loop thread. updateState (69-73) calls this on every single mutation, so multi-item MCP operations that call updateState per item rewrite the whole file once per item, and the client's debounced POST /api/state triggers the same full rewrite continuously while he studies.
- Impact: Each keystroke-driven sync and each MCP tool call stalls the server (including live SSE streams) for a full synchronous 137KB+ write, and the cost grows linearly with his history. On a low-end machine this is visible UI/MCP latency during exactly the logging flow he uses daily; the pretty-print indentation inflates every write for zero benefit.
- Also found independently by: performance

**[MEDIUM] SSE sessions have no cap, timeout, or reaping — stale transports accumulate forever**
- File: `server.ts:91-119`
- Evidence: server.ts:92 creates `sseSessions = new Map()`; GET /api/mcp/sse (97-119) inserts one entry per connection with no maximum count, no idle timeout, and no heartbeat/reaping — removal depends solely on transport.onclose firing (lines 109-111). If mcpServer.connect(transport) throws after the entry is set, cleanup likewise depends on that callback. GET /api/mcp/info (line 196) reports sseSessions.size as the live session count.
- Impact: Abandoned or half-open SSE connections (sleeping laptop, dropped Wi-Fi, crashed MCP client) accumulate transports and McpServer instances indefinitely, leaking memory over a long-running server, and the /api/mcp/info session count he might use to judge server health can report ghosts as active sessions.

**[LOW] SPA catch-all swallows unknown API routes with 200 HTML instead of 404**
- File: `server.ts:301-311, 313-317`
- Evidence: Production branch server.ts:314-316 registers `app.get('*', ...)` sending dist/index.html for every unmatched GET, including typos under /api/ (e.g. GET /api/stat returns 200 HTML instead of a 404 JSON error). The dev branch is broader: server.ts:301 `app.use('*', ...)` intercepts all methods for unmatched paths and attempts to serve/transform index.html.
- Impact: API client bugs and endpoint typos are masked as successful HTML responses, so failures surface downstream as JSON parse errors or mysteriously empty data rather than at the actual mistake — making sync problems (in an app whose whole value is trustworthy state) harder to detect and debug.

**[LOW] Port is hardcoded and listen failures crash outside the fatal-error handler**
- File: `server.ts:21, 319-329`
- Evidence: server.ts:21 `const PORT = 3000;` — no process.env.PORT override. server.ts:319 calls app.listen with only a success callback; no 'error' handler is attached, and listen errors (e.g. EADDRINUSE) are emitted asynchronously, so the startServer().catch at lines 326-329 never sees them.
- Impact: If port 3000 is already taken (a second dev instance, another local tool), the process dies with an unhandled error event and no clear message, and there is no supported way to run the console on a different port without editing source — a recurring friction/crash path for a tool he launches daily.

### Error & crash paths (`error-crash`)

**[CRITICAL] No error boundary anywhere: any render throw is a permanent white-screen boot loop**
- File: `src/main.tsx:1-10`
- Evidence: main.tsx renders <App/> directly under StrictMode; grep for ErrorBoundary/componentDidCatch/window.onerror across src/ and index.html returns zero hits. Bad state is persisted before it is rendered (App.tsx:279 saveAppState on every state change, and importBackupJSON saves before resolve), so the same throwing state is reloaded and re-thrown on every refresh with no recovery UI, no 'reset/clear storage' escape hatch, and no fallback message.
- Impact: One malformed record (from import, Firestore, or the MCP server) bricks the console indefinitely for Sarthak; his only recovery is manually clearing site data in devtools, which destroys the very logs he is trying to save.

**[CRITICAL] Corrupt localStorage JSON silently resets him to seed data, then the seed overwrites the corrupt copy**
- File: `src/services/storage.ts:7-54`
- Evidence: loadAppState wraps JSON.parse AND the chapter .map() in one try; any throw goes to catch (51-54) which only console.errors and returns getInitialState() (seed: INITIAL_CHAPTERS/LOGS/TESTS). A single bad element suffices: chapters=[null] throws at ch.startedDate in the map (14-40), discarding otherwise-valid logs/tests in the same payload; JSON.parse('null') throws at parsed.chapters. App.tsx:279 then saveAppState(appState) on the first effect, overwriting the original raw string with seed — no quarantine copy, no backup key, no user-visible warning.
- Impact: A truncated/partially-corrupted write (browser crash, quota, power loss) silently erases his real study history and replaces it with seed data (e.g. the committed server-state's 21 logs/49 tests pattern), and the evidence needed to recover it is destroyed on first load.

**[CRITICAL] importBackupJSON accepts hostile/wrong-shape files, persists them, pushes them to Firestore, and only then crashes**
- File: `src/services/storage.ts:93-123`
- Evidence: Validation is only truthiness: `if (!parsed.chapters || !parsed.studyLogs || !parsed.tests) throw`. chapters='x', chapters=[null], studyLogs=42, tests=[{id:'t1'}] (no linkedChapterIds/date/name), settings={} all pass. The object is cast verbatim to AppState, saveAppState(state) persists it (112), SettingsModal shows 'Backup restored successfully' and closes, and App.tsx:672-680 handleImportState also saveStateToFirestore()s it. Concrete downstream breaks: SettingsModal.tsx:95 `[...appState.settings.defaultGaps]` throws for settings={}; spacedRepetition.ts:158 crashes on the test above.
- Impact: Restoring an old/partial/hand-edited backup — his main disaster-recovery path — can white-screen the app, poison localStorage AND the cloud copy, and make the bad state sync to other devices, instead of being rejected with the file left untouched.

**[HIGH] Tests, logs, scores and settings are loaded with zero per-record normalisation, so one missing field crashes the core loop**
- File: `src/services/storage.ts:35-44`
- Evidence: loadAppState carefully rebuilds chapters but takes `studyLogs/tests/testScores/settings` verbatim if merely Array.isArray. parseFirestoreState does the same (firebase.ts:229-232). A test missing linkedChapterIds makes getChapterRevisionInfo throw `t.linkedChapterIds.includes` (spacedRepetition.ts:158) — a function called by ChapterList, TestRadarFocus, CriticalRiskList, generator and pacing, i.e. every main tab. A test missing name/date/subjectOrScope throws in TestManager.tsx:105,138-140,151 (t.date.localeCompare, t.name.toLowerCase); a chapter missing name throws in ChapterList search (c.name.toLowerCase, ChaperList.tsx:133).
- Impact: Data written by any older version, the Express/MCP path, or a hand repair that omits one optional-looking field does not degrade one card — it takes down revision due dates, radar and test views entirely, with no indication which record is at fault.

**[HIGH] localStorage quota/write failures are swallowed — he is never told his logs stopped persisting**
- File: `src/services/storage.ts:57-63`
- Evidence: saveAppState: `try{ localStorage.setItem(...) }catch(err){ console.error(...) }` — no return value, no flag, no UI surface. It is the sole local persistence call (App.tsx:279,313,321) and callers cannot distinguish success from QuotaExceededError. Header/Settings cloud status is driven only by Firestore, so the UI can display 'synced' while the local copy is frozen at an older state; the beforeunload Firestore flush (App.tsx:313-317) is fire-and-forget .catch(()=>{}) and is not awaited.
- Impact: Once storage fills or the browser rejects writes, every new log/score appears to save, then vanishes on reload on any device/flow that restores from the stale local copy — with zero warning at the moment of loss.

**[HIGH] Realtime Firestore path throws uncaught on one malformed remote record and silently stops syncing while status stays 'synced'**
- File: `src/services/firebase.ts:626-652`
- Evidence: onSnapshot success callback calls parseFirestoreState(data) at 641 and App's handler calls mergeLocalAndCloudState (App.tsx:250-262) — neither is wrapped in try/catch; only subscription-level errors reach onError (648-651), and App's onError (263-266) merely console.errors without setting cloudSyncStatus='error'. parseFirestoreState throws on a null chapter element (ch.id, ~187); mergeLocalAndCloudState maps chapters unguarded `c.id` (~290) although it guards logs/tests with `if (log && log.id)`.
- Impact: A single bad document written by another device/tool kills live cross-device sync for the session with no visible change in the sync indicator — he keeps studying on divergent copies believing they are merging, and the eventual merge (progress-score tie-breaking) can discard the loser's chapter fields.

**[MEDIUM] Unguarded localStorage access at module-import and render time can white-screen the app when storage is blocked**
- File: `src/services/soundEffects.ts:30-44,515`
- Evidence: SoundEngine's constructor reads localStorage.getItem twice with no try/catch, and `export const sound = new SoundEngine()` (515) executes at import time — soundEffects is imported by nearly every component, so a SecurityError (blocked cookies/storage, restrictive webview) aborts the whole module graph before React mounts. App.tsx repeats the pattern: theme useState initializer getItem (63-73), font/theme effects setItem (94,129), tutorial getItem/setItem (386,393) — all unguarded, in contrast to ShadowArmyMatrix.tsx:734-741 which wraps the same calls in try/catch.
- Impact: In any browser context that throws on storage access, the console is a blank page rather than a degraded-but-usable app, and the failure occurs too early for any in-app message to explain it.

**[MEDIUM] A chapter with any subject outside the 4-value union crashes the print/schedule modal (and the whole app with it)**
- File: `src/components/TestSchedulePrintModal.tsx:1552-1560`
- Evidence: subjectGroups is a fixed Record<Subject,Chapter[]> {Physics,Chemistry,Botany,Zoology} and line 1559 does `subjectGroups[ch.subject].push(ch)` unguarded — repeated at 1780 and 2008. For an imported/legacy chapter with subject 'Biology' or '' (import and load paths never validate subject — storage.ts:95-112, 13-40 defaults only some fields), subjectGroups[ch.subject] is undefined and .push throws TypeError during render.
- Impact: Opening Print Schedule — e.g. to print his Allen test plan — whites out the entire console (compounded by the missing error boundary) over one chapter whose subject string differs from the hardcoded four.

**[LOW] McpModal copy button reports success without awaiting the clipboard, and fails silently where clipboard permission is denied**
- File: `src/components/McpModal.tsx:499-503`
- Evidence: copyToClipboard: `navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(...)` — the promise is neither awaited nor .catch()ed, and the 'copied' indicator is set unconditionally. Contrast SettingsModal.tsx:114-122 and TestSchedulePrintModal.tsx:678 which at least attach .then/.catch handlers. In non-secure contexts navigator.clipboard itself is undefined, throwing synchronously inside the click handler.
- Impact: He can be shown a copied confirmation for MCP client configs/JSON that never reached the clipboard (or throw on click in an insecure context), sending him to Claude/Cursor setup with missing or stale configuration and no error to explain why the connection fails.

### Demo / fabricated-data paths (`demo-data`)

**[CRITICAL] One click on 'Load 1-Year Testing Data' irreversibly overwrites the entire real record — no confirmation, no backup, instant local + cloud persistence**
- File: `src/components/SettingsModal.tsx:1140-1167 (call site); src/App.tsx:672-681 (handler)`
- Evidence: The button's onClick directly runs generateOneYearTestingData(appState) then onImportState(oneYearState) and closes the modal after 800ms. There is no confirm() — unlike cloud restore in the same file at line 173, which does confirm. App.tsx handleImportState (672-681) does setAppState(imported), saveAppState(imported) to localStorage and saveStateToFirestore(uid, imported); App's effects additionally POST every state change to /api/state (server-state.json) and auto-save to Firestore within 300ms. No pre-load backup/export is taken, and the returned state omits actionHistory, so there is no undo path; the only other button beside it, Factory Reset, also destroys the real data.
- Impact: A single curious or accidental click in Settings > Backup & Restore permanently replaces Sarthak's real study logs, test scores and chapter progress in localStorage, Firestore and the MCP server state with fabricated data. Recovery is possible only if he happens to hold an earlier exported JSON backup.

**[CRITICAL] Generator discards all real study logs and test scores and all past real tests instead of merging**
- File: `src/services/oneYearData.ts:124-127,316-325`
- Evidence: Return value is studyLogs: generatedLogs (230 fabricated logs only) and testScores: generatedScores (24 fabricated scores only) — currentState.studyLogs/testScores are never read. For tests, line 125 keeps only (currentState?.tests || INITIAL_TESTS).filter(t => t.date > todayStr) and returns [...generatedTests, ...futureTests], so every past real test (including real Allen/Aakash tests he actually sat) is dropped. Chapters are likewise wholly replaced by updatedChapters derived from baseChapters.
- Impact: His real revision history and real mock scores — the truth the app exists to hold — are silently deleted, not supplemented. What remains looks like a complete, fuller record, so he may not notice the real entries are gone until he goes looking for a specific real result.

**[CRITICAL] Fabricated data is indistinguishable from real data, is labelled 'Official exam log', and union-merge sync resurrects it after any cleanup**
- File: `src/services/oneYearData.ts:118,28,82,147; src/services/firebase.ts:253-295`
- Evidence: Simulated scores carry notes: `Official exam log · Scaled yield: ${totalScore} / 720` (line 118) and use real coaching names (Allen, Aakash — line 22) and plausible test names. The only marker is the id prefix test-/score-/log-1yr-sim-, and a repo-wide grep shows no code outside oneYearData.ts ever checks for '1yr-sim' — no UI badge, filter, or exclusion anywhere. mergeLocalAndCloudState (firebase.ts) merges studyLogs and testScores as a union by id, so once the sim state has been pushed to Firestore, restoring a clean local backup and syncing re-adds all 230 sim logs and 24 sim scores from the cloud copy; deleting them locally cannot remove them while the cloud copy exists.
- Impact: Even a deliberate cleanup fails: the fake history keeps coming back on every login/merge and is thereafter presented everywhere (heatmap, streaks, test tracker, weak-spot and MCP/AI queries, which read the same state via /api/state) as his genuine record, driving revision and pacing decisions.

**[HIGH] Every fabricated mock score is internally inconsistent: totalScore never equals NEET marking (4×correct − incorrect), and tests 22-24 contain 181 questions**
- File: `src/services/oneYearData.ts:64-99`
- Evidence: totalScore (line 66), subject scores (69-72, Zoology as a remainder), correctQ (76) and incorrectQ (77) are computed from independent formulas and never reconciled. Verified by executing the exact JS arithmetic: test 1 totalScore=485 but 124 correct / 34 incorrect implies 462; test 24 total=681 vs implied 674; all 24 tests mismatch. For tests 22-24 correct+incorrect exceeds 180 (167+14=181) so unattempted=max(0,180-181)=0 and correct+incorrect+unattempted=181, not the stated 180. Per-subject subjectQuestions (lines 94-99) also fail to sum to the headline counts, e.g. test 1 subject correct sum 122 vs correctQuestions 124, subject incorrect sum 35 vs 34.
- Impact: If this data is ever loaded, every downstream view that derives accuracy, per-subject weakness or score trend from question counts contradicts the headline score, so error-taxonomy and weak-chapter decisions are computed from numbers that cannot all be true.

**[HIGH] Chapter mastery is fabricated from array index alone and contradicts both the generator's own logs and basic chronology**
- File: `src/services/oneYearData.ts:175-313,131-171`
- Evidence: updatedChapters assigns Grade S/A/B/C/D/E purely by idx/totalCh ratio (lines 178, 197, 217, 237...): first ~32% of the array become 100% complete, confidence 5, revisionCount 3-4 regardless of any log. The generated logs touch only 81 of 86 chapters, at most 5 logs per chapter (chIndex=(i*3+(i%7))%86), yet S chapters claim totalStudySessions 6-9 and chapters with zero generated logs still claim mastery. Chronology is impossible: Grade B (lines 222-232) sets firstPassCompletedDate = today + (-90 + idx*2), which is +18 to +46 days in the future for idx 54-68, while lastStudiedDate is 8-21 days in the past and stage is IN_REVISION; Grade C (lines 242-256) sets startedDate = today + (-60+idx) = +9 to +17 days in the future while firstPassCompletedDate = a past lastStudiedDate — the chapter is 'completed' before it is started.
- Impact: Syllabus-completion %, mastery grades, started/first-pass dates and daysTakenToComplete (hard-coded 10-16) presented after a load are fiction keyed to seed ordering, not to anything studied — and the future dates will corrupt any pacing/deadline maths that consumes them.

**[HIGH] Fabricated nextRevisionDate values ignore the spaced-repetition settings entirely**
- File: `src/services/oneYearData.ts:181-190,201-210,221-230,241-250,280-289`
- Evidence: Due dates are hard-coded offsets from today by grade tier — S: today+(24-daysSince), A: today+(18-daysSince), B: today+(12-daysSince), C: today+4, E: today-12 (comment: 'Overdue by 12 days!') — never computed from the chapter's revisionCount, confidence, or the user's settings.defaultGaps [3,7,14,30] × confidenceMultipliers, and the spacedRepetition engine in src/services/spacedRepetition.ts is not called (only addDaysToDateStr/getTodayStr are imported, line 2).
- Impact: After a load, the due/overdue queue — the app's core daily decision — shows chapters due on invented dates, so he would revise the wrong chapters on the wrong days while believing the schedule came from his SM-2 settings.

**[HIGH] 230 fabricated logs invent 460 hoursSpent that then feed real hour totals**
- File: `src/services/oneYearData.ts:142,162`
- Evidence: Every generated log sets hoursSpent = 1.2 + (i%5)*0.4 (1.2-2.8h, line 142), totalling exactly 460.0 fabricated hours across the 230 logs. hoursSpent is summed as real elsewhere, e.g. src/services/featureManifest.ts:94 and :463 total (l.hoursSpent || 0) over logs, and MCP extensions sum the same field — nothing excludes 1yr-sim logs from those sums.
- Impact: Any hours total, per-subject hour breakdown or AI/MCP summary produced after loading the sim silently includes 460 hours he never studied, attributed to specific chapters and dates.

**[MEDIUM] Error taxonomy in fabricated scores does not add up: category totals neither match incorrectQuestions nor their own per-subject breakdowns**
- File: `src/services/oneYearData.ts:84-115`
- Evidence: sillyMistakes/conceptualGaps/memoryRecall/timePressure (lines 84-87) are independent rounded formulas, and bySubject entries (lines 103-108) are independent roundings of fractions of them. Verified with the code's arithmetic: test 1 errors sum to 8+14+9+5=36 against incorrectQuestions=34; its bySubject sums are 7/14/10/4 against headline 8/14/9/5. Similar mismatches occur across the set (e.g. test 22: error sum 11 vs 14 incorrect; bySubject timePressure sums to 0 vs headline 1).
- Impact: Error-classification charts (silly vs conceptual vs recall vs time) shown for these tests are mutually contradictory, so any 'fix your silly mistakes' style conclusion drawn from them is based on numbers that cannot describe the same test.


## 2. Security & exposure — his record is open to the network


## 2. Security & exposure — his record is open to the network

### Attack surface (`security-surface`)

**[CRITICAL] Unauthenticated GET /api/state dumps his entire study state to any stranger**
- File: `server.ts:274-276`
- Evidence: app.get('/api/state', (req,res)=>{ res.json(serverState); }) — no auth, session, or origin check. serverState is the full AppState loaded from data/server-state.json (server.ts:29-72): 86 chapters, 21 studyLogs, 49 tests, settings and pacingSettings (verified by parsing the committed file).
- Impact: Anyone who finds the deployed URL (server binds 0.0.0.0:3000, server.ts:319) runs curl <url>/api/state and gets his complete syllabus progress, confidences, revision dates, logs and test schedule — the exact data the task says is his study truth.

**[CRITICAL] Unauthenticated POST /api/state overwrites and persists his entire state — empty chapters array wipes it**
- File: `server.ts:278-289`
- Evidence: app.post('/api/state', ...) only checks `req.body && Array.isArray(req.body.chapters)`, then does `serverState = {...req.body, updatedAt: Date.now()}; saveStateToDisk();`. saveStateToDisk (server.ts:61-67) synchronously writes to data/server-state.json. No auth, no schema check on studyLogs/tests/scores, no backup of the prior state.
- Impact: A stranger POSTs {"chapters":[]} and the server state is replaced with zero chapters and persisted to disk; on next boot getInitialState() returns that wiped state. Or POSTs fabricated chapters/confidences/nextRevisionDates and he thereafter studies from the attacker's schedule. This is one curl to total, durable data loss/corruption.

**[CRITICAL] Unauthenticated POST /api/mcp (direct JSON-RPC) exposes all 32 MCP tools including delete, reset and full replace-restore**
- File: `server.ts:149-169; src/services/mcpServer.ts:1055-1095,1591-1670,3301-3398`
- Evidence: app.post('/api/mcp') passes req.body straight to executeMcpDirect(item,getState,updateState) with no auth; batch arrays are executed via Promise.all (server.ts:151-155). executeMcpDirect dispatches tools/call to, among others, delete_test (mcpServer.ts:2926ff), reset_chapter_progress (3235ff, sets learningStage NOT_STARTED, revisionCount 0, dates null), log/add/update/batch tools, export_backup_data (full dump), and import_restore_data (3301ff) where mode='replace' does nextChapters=data.chapters etc. and persists via updateState->saveStateToDisk.
- Impact: Without opening the UI or knowing any credential, a stranger can read everything (get_everything/export_backup_data), delete every test, reset every chapter's progress, falsify scores (add_test_score), move his exam/syllabus dates (update_pacing_settings), change SM-2 gaps (update_spaced_repetition_settings), or replace the whole dataset with a crafted backup. Core log->revise->test loop is remotely writable by anyone.

**[CRITICAL] Unauthenticated MCP SSE transport (GET /api/mcp/sse + POST /api/mcp/message) is a second, equivalent full read/write path**
- File: `server.ts:97-143`
- Evidence: app.get('/api/mcp/sse') creates `new SSEServerTransport('/api/mcp/message',res)` and `createStudyConsoleMcpServer(getState,updateState)` and connects it with no auth check; the returned sessionId is the only gate for POST /api/mcp/message, and that sessionId is issued freely to anyone who opens the SSE stream (transport.sessionId stored in sseSessions, server.ts:103-104). createStudyConsoleMcpServer registers the same destructive tools (delete_test, reset_chapter_progress, import_restore_data) over this transport.
- Impact: Closing or token-gating only the direct /api/mcp endpoint would leave this path fully open: any MCP client (Claude Desktop/Cursor config is helpfully returned by /api/mcp/info, server.ts:245-267) pointed at the URL gets the same unauthenticated read/delete/replace power as the direct endpoint.

**[CRITICAL] Firestore rules allow any unauthenticated stranger to read, write and delete every user's state and every backup**
- File: `firestore.rules:5-18`
- Evidence: match /users/{userId} { allow read, write: if true; match /{allSubcollections=**} { allow read, write: if true; } } and identically for /cloudBackups/{backupId}. `write` in Firestore includes delete. No request.auth check, no request.auth.uid == userId comparison. The connection identifiers needed to reach it are committed in firebase-applet-config.json (projectId weekwise-pr7wl, apiKey, firestoreDatabaseId) and shipped to every browser by design.
- Impact: A stranger needs no account at all: with the public config they can via Firestore REST/SDK read users/<his-uid>/consoleData/state, overwrite it, or delete it and cloudBackups/<his-uid>. This bypasses the Express server entirely, so fixing server.ts alone does not close the exposure. His cloud sync — his multi-device backup — is world-writable.
- Also found independently by: config-security

**[CRITICAL] Shared cloudBackups/guest_latest document leaks and overwrites data across all guest users**
- File: `src/services/firebase.ts:555-563,588-592; src/App.tsx:341,355,668,676`
- Evidence: saveStateToFirestore: if userId.startsWith('guest_') it also writes the full payload to doc(firestore,'cloudBackups','guest_latest') with setDoc merge:true (firebase.ts:560-562). loadStateFromFirestore: for any guest_ user with no own doc it falls back to reading cloudBackups/guest_latest (588-591). App.tsx builds guest ids as 'guest_'+getDeviceClientId() for manual sync/restore/reset/import when not Google-signed-in. Combined with firestore.rules if:true, this doc is also directly readable by strangers.
- Impact: Two different guest devices/people do not have separate backups: the second guest to sync overwrites guest_latest, and a different guest who restores gets the first guest's chapters, logs and scores merged/restored as their own — cross-user disclosure and silent corruption of his record if he ever uses guest mode on a second device/browser after another guest has synced.

**[CRITICAL] His real study state is committed to git in data/server-state.json**
- File: `data/server-state.json (git-tracked); .gitignore:1-8`
- Evidence: git ls-files lists data/server-state.json as tracked; parsing it shows his live data, not seed: 86 chapters, 21 studyLogs, 49 tests, 0 testScores, pacing targetSyllabusDate 2026-12-31 / targetExamDate 2027-05-02. .gitignore contains only node_modules/, build/, dist/, coverage/, .DS_Store, *.log, .env* / !.env.example — no data/, no server-state.json entry. server.ts:22,60-67 writes the live state back to that same tracked path on every mutation.
- Impact: Anyone with repo access/clone gets his full study history without touching the running app, and every future state change shows up as a git diff of his real progress. If the GitHub repo is or becomes public/shared, this is already-disclosed data that rotating server auth cannot undo; it also means routine commits keep re-publishing updated logs.
- Also found independently by: config-security

**[HIGH] Wildcard CORS plus 0.0.0.0 binding lets any website he visits drive the local/deployed server from his browser**
- File: `server.ts:80-89,319; vite.config.ts:14-20`
- Evidence: Global middleware sets Access-Control-Allow-Origin: *, Allow-Methods GET,POST,OPTIONS,PUT,DELETE, Allow-Headers Content-Type,Authorization,Session-Id and answers OPTIONS with 200 for every route, before any route handler. Server listens on 0.0.0.0:3000 (not 127.0.0.1). Vite config also host 0.0.0.0.
- Impact: There is no origin defence in depth behind the missing auth: a malicious page open in his browser can fetch http://localhost:3000/api/state or a LAN/deployed address, read the response cross-origin (because of *), and POST state/MCP writes — a drive-by attack that does not require the attacker to reach the server directly. It also exposes the server to every device on his local network, not just his own browser.

**[HIGH] Default run command serves the Vite dev server in production — NODE_ENV is never set by start/dev scripts**
- File: `server.ts:294-311; package.json:7-8`
- Evidence: package.json: "dev": "tsx server.ts" and "start": "tsx server.ts" — neither sets NODE_ENV=production. server.ts branches on `if (process.env.NODE_ENV !== 'production')` to create a Vite server in middlewareMode and app.use(vite.middlewares) with transformIndexHtml/ssrFixStacktrace, instead of express.static(dist).
- Impact: The normal way this app is launched (including its AI Studio / Cloud Run deployment described in .env.example) runs the development server in production: larger attack surface (dev middleware, source transformation, HMR/watch defaults from vite.config.ts), no static-only hardening, and behaviour/performance different from what a production build test would show. An operator who thinks they deployed the built app has not.

**[MEDIUM] No rate limiting, unbounded batch and 10 MB bodies with synchronous disk write on every mutation — trivial denial of service / disk churn**
- File: `server.ts:77,149-156,61-67`
- Evidence: express.json({limit:'10mb'}); POST /api/mcp accepts an array of arbitrary length and runs Promise.all over executeMcpDirect for every item; every updateState/save path calls saveStateToDisk() which does fs.writeFileSync of the whole pretty-printed state (JSON.stringify(...,null,2)). No express-rate-limit, helmet, or any throttle dependency exists in package.json. SSE sessions are only removed on transport.onclose (server.ts:106-108), with no timeout or cap, and /api/mcp/info even discloses activeSseSessionsCount.
- Impact: A stranger can flood POST /api/state or batched /api/mcp calls, forcing a full synchronous state-file rewrite per request and blocking the single Node event loop, or hold many SSE sessions open — taking the console (and its MCP access for his own AI tools) offline during study, with no legitimate-user priority.

**[MEDIUM] Backup 'integrity checksum' is never verified — tampered or truncated restores are accepted as valid**
- File: `src/services/mcpExtensions.ts:502-519,533-562`
- Evidence: generateBackupPayload builds integrityChecksum as simpleHash = 'chk-'+chaptersCount+'-'+studyLogsCount+'-'+testsCount+'-'+now.toString(36) — counts plus the export timestamp, containing no content hash. validateAndRestorePayload never reads payload.integrityChecksum at all; its only check is `Array.isArray(data.chapters)` (543-545), then returns success:true. import_restore_data (mcpServer.ts) trusts that validation in both merge and replace modes.
- Impact: The UI/tool copy claims a backup payload 'with verification checksum' (export_backup_data description), but a corrupted, hand-edited, or attacker-substituted payload with a chapters array passes validation and, in replace mode, becomes his state. The checksum gives false assurance precisely on the recovery path he would use after data loss.

### Config & committed secrets (`config-security`)

**[HIGH] Committed Firebase config supplies every identifier needed to reach the open database**
- File: `firebase-applet-config.json`
- Evidence: firebase-applet-config.json lines 2-10 commit projectId 'weekwise-pr7wl', appId '1:605197012106:web:7cfee37385b29592573173', a 39-character apiKey (AIzaSy…), authDomain, the full firestoreDatabaseId 'ai-studio-newpcb01studycon-cd681f38-5501-477e-b812-b8213155a00a', storageBucket, messagingSenderId and oAuthClientId '605197012106-45vu3moktle2qsr0qjd8tanrafsdkfca.apps.googleusercontent.com'. `git ls-files` confirms the file is tracked; `git check-ignore` shows only .env is ignored — .gitignore:1-8 has no entry for this file. src/services/firebase.ts:22 imports it directly into the client bundle.
- Impact: A Firebase web apiKey is an identifier rather than a password in isolation, but here it is the complete locator set for the database — and because firestore.rules allow `if true` access (separate finding), this committed config is functionally the access credential for his data. Committing it to git removes even the need to scrape the deployed site, and rotating it later is undermined by it remaining in history.

**[MEDIUM] Rules enforce none of the blueprint's schema — arbitrary malformed state can be written as his record**
- File: `firestore.rules`
- Evidence: firebase-blueprint.json:16-31 defines ConsoleState with required ["userId","chapters","studyLogs","tests"] and typed properties, and UserProfile (lines 3-15) with required userId — but firestore.rules:5-18 contain no `request.resource.data` checks at all: no hasAll/hasOnly field checks, no type checks, no size limits, no userId==auth binding. Any write of any shape to users/{userId}/consoleData/state is accepted.
- Impact: Even apart from strangers, any buggy client, stale device or MCP/import path can silently persist a malformed or partial ConsoleState (wrong types, missing arrays, oversized payloads) and the database will store it as his truth; the loader in src/services/firebase.ts parseFirestoreState then has to guess/fallback around it. The blueprint creates a false impression that a schema is enforced somewhere — it is enforced nowhere server-side.

**[MEDIUM] Claimed server-side Gemini capability is dead: key, SDK and capability declaration exist, no code uses any of them**
- File: `metadata.json`
- Evidence: metadata.json:5-7 declares majorCapabilities ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"]; package.json:15 depends on "@google/genai": "^2.4.0" and line 19 on "dotenv": "^17.2.3"; .env.example:1-4 tells the user GEMINI_API_KEY is 'required for Gemini AI API calls' and is 'automatically inject[ed]… from user secrets'. But a full-repo grep finds zero imports of @google/genai, zero reads of GEMINI_API_KEY or process.env for it, and zero imports of dotenv (server.ts never loads .env; the only process.env reads are NODE_ENV in server.ts:294 and DISABLE_HMR in vite.config.ts:18-19). No Gemini call exists anywhere in src/ or server.ts.
- Impact: The declared flagship AI capability does not exist: if Sarthak sets a real Gemini key in the AI Studio Secrets panel believing the app uses it server-side, nothing consumes it, and any UI/AI feature he expects from it is fiction. Meanwhile @google/genai (resolved to 2.18.0 in bun.lock, pulling google-auth-library, protobufjs, ws) and dotenv sit as unused attack/supply-chain surface in every install.

**[MEDIUM] Type checking runs with strict mode off, so the only 'lint' gate cannot catch null/undefined data defects**
- File: `tsconfig.json`
- Evidence: tsconfig.json:1-25 sets target/module/lib/skipLibCheck/isolatedModules/allowJs but never sets "strict": true or any of strictNullChecks, noUncheckedIndexedAccess, noImplicitAny, strictFunctionTypes — all default to false. package.json:12 makes this the only quality gate: "lint": "tsc --noEmit". package.json also has no test script at all (scripts lines 6-13 are dev/start/build/preview/clean/lint), and no "engines" or "packageManager" field despite bun.lock being the only lockfile.
- Impact: `npm run lint` can pass while null/undefined date, score and chapter fields flow unchecked through the spaced-repetition and sync code — exactly the class of bug that produces wrong revision dates silently. The repo's one verification command certifies far less than its name suggests, and there is no test command to fall back on.

**[LOW] package.json: production start depends on a dev-only binary, and vite is declared twice**
- File: `package.json`
- Evidence: package.json:8 `"start": "tsx server.ts"` but tsx appears only in devDependencies (line 35, "tsx": "^4.21.0"), not dependencies (lines 14-29). Conversely build tooling is in production dependencies: "@vitejs/plugin-react" line 18, "@tailwindcss/vite" line 17 and "vite" line 27 — and vite is then declared a second time in devDependencies line 37 with the identical range "^6.2.3".
- Impact: A production install that omits devDependencies (npm ci --omit=dev, a slim Docker/Cloud Run install) cannot start the server at all — `npm start` fails with tsx not found — while production images needlessly carry the Vite/React-plugin build chain. The duplicate vite entry invites the two copies drifting apart on a future edit.

**[LOW] Dev server binds 0.0.0.0 and wildcards allowed hosts to all of .ai.studio**
- File: `vite.config.ts`
- Evidence: vite.config.ts:14-20 configures the dev server with `host: '0.0.0.0'` (all network interfaces, not localhost), strictPort 3000, and `allowedHosts: ['goldenmountaincollective.ai.studio', '.ai.studio']` — the leading-dot entry trusts every subdomain of ai.studio, not one named host. index.html and the config define no Content-Security-Policy or other security headers, and vite.config.ts sets no server.headers.
- Impact: When run for development/preview, the console and its dev middleware are reachable from the whole local network and accept any *.ai.studio host header, widening exposure of an app whose backend state endpoints carry no authentication of their own. Low on its own, but it stacks on the unauthenticated state/MCP surface rather than containing it.


## 3. The revision engine — the maths that decides what he studies


## 3. The revision engine — the maths that decides what he studies

### Spaced-repetition engine (`spaced-repetition`)

**[CRITICAL] Omitting completionPercentage on a completed chapter freezes revisionCount and rewrites daysTakenToComplete**
- File: `src/services/spacedRepetition.ts`
- Evidence: Line 216: finalPercentage defaults to '(chapter.completionPercentage ?? 50)' when the caller omits it. Line 219: 'finalPercentage >= 100' enters the first-pass branch, where line 222 newRevisionCount=Math.max(1, chapter.revisionCount===0?1:chapter.revisionCount) never increments, and line 224 unconditionally recomputes daysTakenToComplete = diff(startedDate, dateStudied)+1. Concrete: chapter completed in 5 days (daysTaken=5, revCount=1, completion 100); a later revision logged through any path that omits completionPercentage (App.handleSaveStudyLog passes the argument straight through, it is optional in its signature) re-enters the first-pass branch: revCount stays 1 instead of 2, and daysTakenToComplete is overwritten to e.g. 61 if logged 60 days after starting.
- Impact: Revisions via API/optional-argument callers never advance the schedule (same gap repeats) and the recorded first-pass duration keeps growing — two core history fields corrupt on a normal logging path.

**[CRITICAL] Backdated log overwrites current chapter state with no chronological guard**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 262-285: updatedChapter unconditionally sets lastStudiedDate=dateStudied, currentConfidence=confidenceRating and nextRevisionDate computed from dateStudied; startedDate (line 211) is only 'chapter.startedDate || dateStudied'. There is no comparison with the existing lastStudiedDate. Concrete: chapter last studied/revised 2026-10-29 with next revision 2026-11-12; he backfills a forgotten session dated 2026-09-15 — chapter now claims lastStudied 2026-09-15, confidence of that old session, and a nextRevisionDate in September (already ~6 weeks overdue).
- Impact: Backfilling an old session (a routine catch-up action) rewinds the chapter, resurrects an overdue alarm and discards the effect of his most recent revision from every due/retention view.

**[CRITICAL] Recalculation after deleting the first-pass log invents a phantom revision**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 356-371: firstPassLog = first log with sessionType 'first_pass_complete' OR completionPercentage>=100 — revision logs written by applyStudyLogToChapter carry completionPercentage 100, so they qualify. revisionLogs = logs with sessionType 'revision_round_complete' OR revisionNumber>1, and revisionCount = 1 + revisionLogs.length. Concrete: delete the first-pass log, leaving exactly one revision log (totalStudySessions recalculated to 1): firstPassLog becomes that revision log (firstPassCompletedDate fabricated as the revision date) and revisionCount = 1+1 = 2 for a chapter with one log ever; next gap is then calculateNextGap(2)=7 instead of the first-pass gap.
- Impact: Deleting one log — the supported undo path — invents a revision, fabricates the first-pass completion date and shifts the schedule; history after any deletion cannot be trusted.

**[CRITICAL] Pacing invents a 1.5 chapters/week velocity when he has completed nothing**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 666-672: measuredWeeklyPace = max(recentWeeklyPace, activeWeeklyPace); if <= 0.1, actualWeeklyVelocity is set to a hard-coded 1.5 ('realistic fallback 1.5 ch/wk'). That invented velocity then drives daysNeededAtCurrentPace, projectedCompletionDate (line ~676) and paceDeltaChapters (line ~703). Concrete: fresh state, 0 chapters completed, 86 remaining — app projects completion in round(86/(1.5/7))=401 days and issues an AHEAD/ON_TRACK/BEHIND verdict and a chapter delta, all from a number no study produced.
- Impact: At exactly the start of prep, when pacing guidance matters most, the projected completion date and pace status are fabricated and presented identically to measured ones.

**[HIGH] Recalculation orders logs by entry timestamp, not dateStudied**
- File: `src/services/spacedRepetition.ts`
- Evidence: Line 329 sorts remaining logs by '(a.timestamp||0)-(b.timestamp||0)' only, then lines 331-334 take earliest/latest from that order and set lastStudiedDate=latestLog.dateStudied, currentConfidence=latestLog.confidenceRating. But applyStudyLogToChapter stamps every new log timestamp: Date.now() (line 259) regardless of dateStudied. Concrete: today he enters a session actually studied 2026-08-01 at 50%/conf 2; it has the newest timestamp, so after any later deletion triggers recalc, the chapter's lastStudiedDate becomes 2026-08-01, confidence becomes 2 and (no-first-pass branch, lines 384-388) completion becomes that log's 50% — even if a genuine 2026-10-29 log at 90% remains.
- Impact: Recalculated state reflects entry order, not study order; one backfilled log plus one deletion regresses completion, confidence and last-studied date by months.

**[HIGH] Studied yesterday masks any overdue revision, however old**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 141-150: isRecentlyStudied = lastStudiedDate >= nextRevisionDate OR getDaysDifference(lastStudiedDate, todayStr) <= 1. The second clause is unconditional on the due date. Concrete: nextRevisionDate 2026-10-25 (5 days overdue on 2026-10-30), lastStudiedDate 2026-10-29 because he logged an unrelated progress session yesterday — status returns 'scheduled' instead of 'overdue', daysDiff=-5 is hidden, and isCriticalRisk (lines 176-179, requires status==='overdue' for the low-confidence branch) is suppressed. A future-dated lastStudiedDate also satisfies diff<=1 (negative) permanently.
- Impact: Overdue and critical-risk warnings disappear for a day after any log, however unrelated, exactly when he is actively studying and looking at the list.

**[HIGH] Logs store cumulative pillar snapshots as pillarsCompleted, making deletion-recalc unable to remove pillars**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 255-259 and 268: newLog.pillarsCompleted is set to mergedPillars — the chapter's cumulative pillar map merged with this session's — not the pillars of this session. Recalculation (lines 337-344) then aggregates pillars with some() over those cumulative snapshots. Concrete: log 1 completes Anki only (snapshot {anki:true}); log 2 completes Lectures (snapshot {anki:true, lectures:true}); delete log 1 — Anki survives via log 2's snapshot, so the deletion does not undo the pillar it is supposed to remove, and every log's record misstates what was done in that session.
- Impact: Per-session pillar history is falsified at write time and pillar state can never be correctly reconstructed after a deletion — the recalc feature is defeated by the log format.

**[HIGH] Recalculation cross-wires bookReading and ncertReading — either one resurrects both**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 339-340: bookReading and ncertReading are aggregated with the identical expression 'some(l => !!(l.pillarsCompleted?.bookReading || l.pillarsCompleted?.ncertReading))'. Concrete: a chapter whose only remaining log has bookReading=true, ncertReading=false recalculates to both true; one with only ncertReading=true also recalculates to both true.
- Impact: After any log deletion, one reading pillar is fabricated complete; pillar-based progress (and the no-first-pass completion estimate at lines 376-388 that counts distinct pillars) is overstated.

**[HIGH] Invalid dates silently become today / zero instead of failing**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 32-41: addDaysToDateStr returns getTodayStr() for any unparseable string, and constructs new Date(year, month-1, day) with no range validation, so '2026-02-30' silently rolls to 2026-03-02 and '2026-13-01' to 2027-01-01. Lines 61-68: getDaysDifference returns 0 for invalid input, indistinguishable from same-day. A corrupted/imported nextRevisionDate or dateStudied therefore becomes 'today' (rescheduled from now) or 'due today' (diff 0) instead of an error.
- Impact: Bad dates from imports, sync merges or manual edits silently turn into plausible-looking due dates; he studies to a schedule derived from a typo with no warning anywhere.

**[HIGH] Retention model treats an unfinished chapter as a completed pass and disagrees with the scheduler**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 471-474: passMultiplier = max(1, revisionCount||1), so a chapter with revisionCount=0 (first pass still in progress, merely studied once) gets baseStability 8 days x confidence — the same as a completed first revision pass. Retention also never reads nextRevisionDate: for R1 conf1, S=max(1.5, 8*0.45)=3.6 days, so at the system's own scheduled gap (calculateNextGap(1,1)=round(3*0.5)=2 days) predicted retention is already exp(-2/3.6)=57% ('warning'), and for R1 conf3 gap 3/S 8 gives 69% — the scheduler routinely books revisions after the decay model says memory is in warning territory, and the two subsystems never reconcile.
- Impact: Decay percentages shown in Header/Weekly Audit overstate memory for unfinished chapters and contradict the due list for finished ones; he cannot tell which signal to trust.

**[HIGH] Decay-prevented stats count any 7-day gap between logs as a rescue**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 530-548: a pair of consecutive logs counts as a save if 'gap >= 7 || (prev.confidenceRating <= 2 && curr.confidenceRating >= 3)'. The gap clause ignores retention entirely: a chapter at revision 4/conf 5 (S=126 days, ~95% retained after 7 days) restudied after 8 days counts as 'decay prevented' though nothing was at risk; any second log after a week counts even if it is a partial progress log. totalSavedCount also increments per qualifying pair (a chapter with 3 qualifying pairs counts 3 saves) while rescuedChapters only lists it once, so the headline count and the list cannot be reconciled.
- Impact: The Weekly Audit 'decay prevented' number he reads as evidence his revision system works is an inflated count of calendar gaps, not rescues from critical/warning retention.

**[HIGH] studyDaysPerWeek pacing setting is accepted and completely ignored**
- File: `src/services/spacedRepetition.ts`
- Evidence: Line 598 copies studyDaysPerWeek into safeSettings; no other line in calculateSyllabusPacing reads it — actualDailyVelocity is actualWeeklyVelocity/7 (line ~672) and daysNeeded/projectedCompletionDate use calendar days. Concrete: set studyDaysPerWeek=5 — required velocity, projected completion date and pace status are byte-identical to the 7-day setting; the projection assumes he studies every calendar day.
- Impact: A pacing setting he can change in the UI is dead; if he plans around rest days, every projection is systematically optimistic by up to 2/7 (~29%).

**[HIGH] Required revision velocity counts all passes, subtracts none done, and confines them to the post-syllabus window**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 685-687: totalRevisionOperationsNeeded = totalChapters * targetRevisionPasses (86*3=258) with no subtraction of revision passes already completed (chapters carry revisionCount, never consulted here), divided by weeksFromSyllabusTargetToExam only (2026-12-31 to 2027-05-02). It also assumes all revisions happen after first-pass completion, while calculateNextGap schedules revisions 3/7/14/30 days after each chapter's first pass — most revision work falls inside the first-pass window by the app's own design.
- Impact: The required revision velocity he plans against (258/17.4 weeks ≈ 14.8/week at defaults) is grossly overstated and double-counts work already done; pacing decisions based on it are wrong in the alarming direction.

**[HIGH] Pacing trajectory fabricates linear 'actual' history and hard-codes Jan/Dec 2026 labels**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 730-742: for past trajectory points, actual = round(completed1stPassCount * daysOffset/elapsedDays) — a straight-line interpolation of today's total, labelled 'actual'. Concrete: he completes all 20 of his chapters in the final month; the chart still shows ~10 completed two months earlier. Lines 628 and 781 hard-code baselineStartDate '2026-01-01' and the first/last labels 'Jan 26'/'Dec 26' regardless of pacingSettings target dates, so changing the syllabus target to e.g. 2027-03-31 leaves mislabelled endpoints.
- Impact: The trajectory chart presents an invented, evenly-spread history as his actual progress curve, and its axis labels can contradict his configured target date.

**[MEDIUM] Recalculation never recomputes startedDate from remaining logs**
- File: `src/services/spacedRepetition.ts`
- Evidence: Line 332: 'const startedDate = chapter.startedDate || earliestLog.dateStudied' reuses the chapter's stored start date even when the log that established it was deleted, and line 360 computes daysTakenToComplete from that ghost start. Concrete: chapter started 2026-08-01 (log later deleted), earliest remaining log 2026-10-01, first pass completed 2026-10-10 — recalc reports daysTaken 71 instead of the 10 days the remaining history supports.
- Impact: Start dates and completion durations survive the deletion of the only evidence for them, permanently skewing his per-chapter duration history.

**[MEDIUM] After the target date, pacing clamps days-remaining to 1 and emits absurd required velocities**
- File: `src/services/spacedRepetition.ts`
- Evidence: Line 660: daysUntilSyllabusTarget = Math.max(1, getDaysDifference(todayStr, targetSyllabusDate)) — after 2026-12-31 passes, a true value of e.g. -30 becomes 1, so required1stPassVelocityPerWeek = remaining/(1/7) = remaining x 7 (e.g. 50 remaining chapters => '350/week') instead of reporting the target missed. Line 693 applies the same Math.max(1,...) clamp to days until the exam, so requiredTestFrequencyDays collapses to 1 after exam day.
- Impact: Past the deadline — the moment honest status matters most — the app shows absurd-but-plausible velocities rather than an overdue state, and paceStatus is computed from the clamped numbers.

**[MEDIUM] Gap and stability plateau at revision 4 — intervals never grow beyond 30 days**
- File: `src/services/spacedRepetition.ts`
- Evidence: Lines 19-20: gapIndex = min(max(0, revisionNumber-1), gaps.length-1); with the default 4 gaps every revision from 4 onward returns gaps[3]=30 (x multiplier). calculateMemoryRetention (lines 471-472) has the same ceiling: baseStability is 60 for passMultiplier>=4. Concrete: a chapter on its 8th revision, confidence 3, is still due every 30 days with the same stability as its 4th, through the Jan-May 2027 revision window.
- Impact: Long-lived chapters never earn longer intervals, so the revision queue in the final pre-exam months is denser than his demonstrated retention justifies — workload the pacing view does not predict.

**[MEDIUM] Pacing counts test scores, not distinct tests taken**
- File: `src/services/spacedRepetition.ts`
- Evidence: Line 691: testsCompletedCount = testScores.length — raw score records, not distinct tests. Two scores logged against the same Allen mock (a corrected re-entry) count as 2 completed tests, reducing testsRemainingCount (line 692) and stretching requiredTestFrequencyDays (line 694) accordingly. There is no dedup by test id anywhere in the function.
- Impact: Duplicate or corrected score entries silently shrink his remaining mock-test obligation and relax the required test cadence in the pacing plan.
- Also found independently by: pacing

### Practice generator (`generator`)

**[HIGH] Worst-First is dominated by never-studied chapters: the 100-day sentinel gives every untouched chapter a 300-point floor that known weakest chapters cannot reach**
- File: `src/services/generator.ts`
- Evidence: computeWorstFirstScore lines 87-92: daysSince = info.daysSinceLastStudied ?? 100, score = (5-confidence)*20 + daysSince*2 - revisionCount*4 + overduePenalty + deadlineBoost. An unstudied chapter (confidence 0, revisionCount 0, status not_started so no overdue penalty) scores 100 + 200 = 300. A confidence-1 chapter last revised 20 days ago and 17 days overdue scores 80 + 40 + 85 = 205. An in-progress confidence-1 chapter studied any time in the last 110 days scores at most 80 + 2*110 = 300 and usually far less (60 days ago = 200).
- Impact: The UI button is labelled 'Weakest First' (ChapterSelectionGenerator.tsx line 171), but until essentially every untouched chapter is exhausted, the generator surfaces not-started chapters instead of the chapters he knows he is weakest on and that are overdue. His weakest, exam-critical revisions are silently starved by chapters he has simply never opened.

**[HIGH] Previous-chapter exclusion silently falsifies both 'Strict Worst-First' and 'Pure Random': the second roll returns the second-worst chapter while calling it the highest-urgency one**
- File: `src/services/generator.ts`
- Evidence: generateNextChapter lines 106-110: when previousChapterId is set, pool = activeChapters.filter(c => c.id !== previousChapterId) for ALL modes. Worst-first (lines 126-149) then sorts this reduced pool and its explanation unconditionally claims 'Highest urgency chapter: ...'. Random mode (lines 114-124) claims 'True Random (Uniform distribution)' in its comment and reports relativeProbabilityPercent = 1/pool.length, yet the previous chapter's true probability on a re-roll is 0%. Weighted mode's displayed draw probability is likewise computed over the exclusion pool (lines 186-212) with no disclosure.
- Impact: Clicking 'Roll Next Target' in Weakest First does not give him the worst chapter — it gives the runner-up, mislabelled as the highest urgency. He can repeatedly re-roll away from the single chapter the mode exists to force on him, and every probability the weighted/random modes report is conditional on a hidden exclusion he is never told about.

**[HIGH] Switching mode on the HardwareDeck never re-rolls: the generator keeps showing the old mode's pick under the new mode's label**
- File: `src/components/ChapterSelectionGenerator.tsx`
- Evidence: The only generation effects are useEffect(..., [chapters, tests]) at lines 85-87 and useEffect(..., [rollSignal]) at lines 91-96 — neither depends on activeMode. The component is controlled from App.tsx (mode={deckMode}), and HardwareDeck's handleModeClick only calls onModeChange(m) with no roll trigger. Only the card's own buttons (handleModeSwitch, lines 76-83) call handleGenerate(newMode).
- Impact: He taps 'Weakest First' on the deck, the switch visibly changes, but the displayed target is still the Balanced/Weighted pick until he manually rolls or the chapters/tests arrays change. Two mode switchers controlling the same state behave differently, and the stale pick sits under the new mode's highlighted button with only its old explanation text betraying the mismatch.

**[MEDIUM] Weighted mode's confidence weighting is non-monotonic at zero: an unstudied chapter weighs less than a weak chapter studied a week ago, contradicting the function's own stated priority**
- File: `src/services/generator.ts`
- Evidence: computeChapterWeight lines 33-45: confidence 0 (unstudied) gets baseWeight 4.0, while confidence 1 gets 6.0 and confidence 2 gets 4.5 — despite the header comment (lines 17-21) claiming 'Lower confidence -> higher weight' and 'Unstudied -> high priority'. Lines 48-56: never-studied chapters get daysFactor 2.5, while a studied chapter's factor rises to 1.0 + min(days/10, 3.0). Net weights (no test deadline): unstudied = 4.0 * 2.5 = 10.0; confidence-1 studied 7 days ago, not overdue = 6.0 * 1.7 = 10.2; confidence-1 studied 20 days ago = 6.0 * 3.0 = 18.0.
- Impact: In Balanced mode a chapter he has never opened is less likely to be drawn than a merely weak chapter he touched last week. Untouched syllabus — the largest unknown risk for a first-pass deadline of 31 Dec 2026 — is systematically under-sampled relative to the algorithm's documented intent.

**[MEDIUM] The roll animation displays unfiltered chapters — including archived ones — as if they were the selected target, and the Log button stays live on them**
- File: `src/components/ChapterSelectionGenerator.tsx`
- Evidence: handleGenerate lines 49-64: the animation picks rand = chapters[Math.floor(Math.random() * chapters.length)] from the raw prop array with no isArchived filter (generateNextChapter filters archived at generator.ts line 103, the animation does not) and no regard to the active mode's distribution, then setCurrentResult renders it in the same target card. The 'Roll Next Target' button is disabled while isGenerating (lines 269-271) but the 'Log Practice Round' button (lines 279-287) has no disabled guard and calls onOpenQuickLogForChapter(currentResult.chapter.id).
- Impact: For ~280ms per roll, archived chapters he deliberately shelved are presented as the 'Selected Topic Target', and a click on Log Practice Round in that window opens the quick log for a random/archived interim chapter instead of the algorithm's actual pick — a wrong-chapter log entry waiting to happen.

**[MEDIUM] Any chapters/tests identity change silently re-rolls and discards the target he was about to practise**
- File: `src/components/ChapterSelectionGenerator.tsx`
- Evidence: useEffect lines 85-87 calls handleGenerate(activeMode) whenever the chapters or tests prop references change. In App.tsx lines 687-690, filteredGeneratorChapters is rebuilt with .filter() on every App render whenever a subject channel other than 'All' is selected, producing a new array identity for identical content; any unrelated App state change (opening a modal, editing/adding any test anywhere) therefore fires the effect and replaces currentResult.
- Impact: With a subject selected, actions that have nothing to do with the generator — adding a test, opening a dialog — throw away the target he was reading and substitute a new random one. The 'selected target' is not stable state he can act on; it evaporates under unrelated interactions.

**[MEDIUM] Generation timers are never cancelled: overlapping rolls interleave, and an earlier roll can clear isGenerating and present its stale-mode result mid-animation**
- File: `src/components/ChapterSelectionGenerator.tsx`
- Evidence: handleGenerate lines 46-73 schedules 8 setTimeout animation steps plus a final setTimeout with no stored timer ids, no cleanup, and no generation token; the useEffect hooks return no cleanup either. Mode buttons and the deck roll signal are not disabled during a roll, so a second handleGenerate can start while the first is pending. The first roll's final timer still fires setCurrentResult(its result) and setIsGenerating(false) even if a newer roll is mid-animation.
- Impact: Rapid mode switches or a deck roll during the 310ms animation produce flickering results computed under a mode other than the one now selected, with the Roll button re-enabled while a newer animation is still running — and the Log button remains clickable on whichever transient result is on screen.

**[LOW] Weighted mode's neglect signals saturate almost immediately: 31 days and 300 days of neglect are indistinguishable, as are 10 and 100 days overdue**
- File: `src/services/generator.ts`
- Evidence: computeChapterWeight line 53: daysFactor = 1.0 + Math.min(daysSince/10, 3.0) — capped once daysSince reaches 30. Line 61: urgencyBoost += Math.min(overdueDays * 0.3, 3.0) — capped once overdueDays reaches 10.
- Impact: Beyond one month untouched or ten days overdue, the weighted draw cannot rank a chapter abandoned for a year above one neglected for five weeks. Long-tail decay — exactly what a spaced-repetition safety net should escalate — flattens into a single undifferentiated tier.

**[LOW] Worst-First explanation labels every non-overdue state 'ready for review', including chapters never studied and chapters due today**
- File: `src/services/generator.ts`
- Evidence: Lines 142-149: overdueLabel = info.status === 'overdue' ? `overdue by ${Math.abs(info.daysDiff)} days` : 'ready for review'. For a not_started chapter the produced explanation reads 'Highest urgency chapter: not started yet, never revised, and ready for review.' A due_today chapter gets the same 'ready for review' wording instead of 'due today'.
- Impact: The one piece of prose meant to justify the pick contradicts itself for the most common early-syllabus case (never-studied chapters) and hides genuine due-today urgency, so he cannot trust the explanation to describe the chapter's actual revision state.

**[LOW] Worst-First uses unclamped days-since-studied: a future-dated lastStudiedDate subtracts from the score and prints as a negative age**
- File: `src/services/generator.ts`
- Evidence: computeWorstFirstScore line 88 takes info.daysSinceLastStudied directly (getDaysDifference in spacedRepetition.ts has no clamp), while computeChapterWeight line 51 explicitly clamps with Math.max(0, ...). A lastStudiedDate 10 days in the future (clock change, imported/backdated data) yields daysSince = -10, a -20 score contribution, and the explanation at line 143 prints 'last revised -10 days ago'.
- Impact: A single future-dated chapter is pushed down the Weakest First queue by phantom negative age and described with nonsense text, while the weighted mode treats the same data sanely — the two modes disagree about the same chapter's state.

**[LOW] Computed transparency fields are dead: weightScore and relativeProbabilityPercent for random and worst-first results are never rendered anywhere**
- File: `src/services/generator.ts`
- Evidence: GeneratorResult declares weightScore and relativeProbabilityPercent (lines 8-9); random mode sets relativeProbabilityPercent (line 120) and worst-first sets weightScore (line 150). A codebase-wide search shows no component reads either field — ChapterSelectionGenerator.tsx renders only chapter metadata and the explanation string, so the only probability ever shown is the one embedded in the weighted explanation text (line 208).
- Impact: The worst-first penalty score that decided the pick — the one number that would let him sanity-check why this chapter outranks another — is computed and thrown away. The mode that most needs an auditable justification shows none.


## 4. Logging journeys & the modals he touches daily


## 4. Logging journeys & the modals he touches daily

### App core state & handlers (`app-core`)

**[CRITICAL] Quick stage-mark to FIRST_PASS_DONE completes a chapter but never schedules its first revision**
- File: `src/App.tsx`
- Evidence: App.tsx:562-580 (FIRST_PASS_DONE branch) sets learningStage, completionPercentage:100, firstPassCompletedDate and revisionCount:Math.max(1,...) but never touches nextRevisionDate and creates no StudyLog. In services/spacedRepetition.ts getChapterRevisionInfo, a completed chapter with nextRevisionDate===null returns status 'scheduled' forever (never due_today/overdue). The log path (applyStudyLogToChapter) is the only place that computes nextRevisionDate via calculateNextGap+addDaysToDateStr, and this handler bypasses it entirely. The stage buttons are wired into Radar, ChapterList and ShadowArmyMatrix (App.tsx:722,764,796ff).
- Impact: A chapter he marks done via the quick stage control is counted as a completed first pass by pacing (completionPercentage 100 / revisionCount>=1) yet is never scheduled for revision — it silently drops out of the due/overdue system for the rest of the run to 2 May 2027. The core log→revise loop is broken for exactly the chapters closed through this shortcut, and no study log exists to audit or undo it.

**[CRITICAL] Quick-rate 'confidence calibration' is logged as a completed revision round and pushes the due date out by a full gap**
- File: `src/App.tsx`
- Evidence: App.tsx:532-552: for any chapter with stage FIRST_PASS_DONE/IN_REVISION or revisionCount>=1, handleQuickRateChapter calls handleSaveStudyLog with sessionType 'revision_round_complete' and compPct 100, note 'Confidence calibrated'. Per applyStudyLogToChapter (spacedRepetition.ts) that branch does revisionCount+1 and nextRevisionDate = today + calculateNextGap(newCount, rating) — e.g. rating 5 on a revision-3 chapter pushes the due date out by round(30*1.5)=45 days. For a not-done chapter, compPct = chapter.completionPercentage || 50 fabricates 50% completion from a single rating tap.
- Impact: Merely calibrating confidence on a due chapter records a full revision round that never happened, inflates revisionCount (which also inflates the decay/stability model), and hides the chapter from the due list for weeks — he will skip a real revision believing it done. On untouched chapters a rating tap manufactures half-completion that pacing and progress displays then treat as real.

**[CRITICAL] refreshStateFromServer overwrites local state wholesale with the server snapshot — no merge, no freshness check**
- File: `src/App.tsx`
- Evidence: App.tsx:173-187 refreshStateFromServer: if serverData.chapters is a non-empty array it does setAppState(serverData); saveAppState(serverData) — no updatedAt comparison, no mergeLocalAndCloudState (the Firestore path at App.tsx:224-238 merges specifically 'to guarantee zero data loss'). App.tsx:189-199 shows local state only reaches the server via a 1200ms-debounced POST whose failures are swallowed with .catch(()=>{}). McpModal triggers onStateRefresh after every state-modifying MCP tool call. serverData is also not normalised: a payload missing studyLogs/settings/pacingSettings is installed verbatim.
- Impact: Any local progress not yet broadcast to the Express server — a log saved <1.2s earlier, or anything logged while the POST was failing offline — is silently wiped from both React state and localStorage the moment an MCP action refreshes, reverting him to the server file's snapshot. This is unrecoverable data loss presented as a routine sync refresh.
- Also found independently by: app-sync, dates-time

**[HIGH] Quick stage control fabricates revision counts and its NOT_STARTED/IN_PROGRESS transitions leave stale progress fields behind**
- File: `src/App.tsx`
- Evidence: App.tsx:581-589 IN_REVISION branch: revisionCount: Math.max(2,(c.revisionCount||1)+1) — unconditional +1 on every invocation, with lastStudiedDate kept as c.lastStudiedDate||today and no StudyLog written. App.tsx:590-597 NOT_STARTED branch resets only learningStage/completionPercentage/revisionCount, leaving currentConfidence, lastStudiedDate, nextRevisionDate, firstPassCompletedDate, startedDate, pillars and totalStudySessions intact. The else branch (App.tsx:598-605) demoting to IN_PROGRESS keeps a prior revisionCount>=1 and firstPassCompletedDate while completionPercentage stays 100 if already set.
- Impact: Repeated taps on 'IN_REVISION' mint unlimited revision rounds with zero study, corrupting revisionCount everywhere it is consumed (pacing completion, memory-stability in the decay engine). A chapter reset to NOT_STARTED via this control still carries confidence, a last-studied date and a live nextRevisionDate, and a demoted chapter is still counted as a completed first pass by calculateSyllabusPacing (revisionCount>=1 / completion>=100) — the stage label and the numbers he plans from contradict each other. Only handleResetChapterHistory (App.tsx:470-504) performs a complete reset; this handler looks equivalent and is not.

**[HIGH] handleSaveStudyLog accepts backdated and future-dated logs that regress or strand the chapter's schedule**
- File: `src/App.tsx`
- Evidence: App.tsx:402-436 handleSaveStudyLog passes dateStudied straight into applyStudyLogToChapter with no comparison against chapter.lastStudiedDate and no future-date rejection; the engine unconditionally sets lastStudiedDate: dateStudied, currentConfidence: confidenceRating and recomputes nextRevisionDate from that date. The QuickLogModal date input (type='date', no min/max attributes) imposes no bound either. Concrete breakage: chapter revised yesterday (next due in 14d); backfill a log dated 20 days ago as sessionType 'revision_round_complete' → revisionCount increments again and nextRevisionDate = 20-days-ago + gap, already in the past, and confidence regresses to the old log's rating. A typo'd future date (e.g. 2027 instead of 2026) parks nextRevisionDate a year out.
- Impact: One backdated or mis-typed log silently rewrites the chapter's current confidence, last-studied date and due date, making a freshly revised chapter instantly overdue or making a due chapter vanish for months — wrong revision decisions he will act on, with no warning at save time.

**[MEDIUM] Pacing-settings updates from Strategy/Analytics tabs never bump updatedAt, so sync merge can revert his target dates**
- File: `src/App.tsx`
- Evidence: App.tsx:815-817 and 830-832: both onUpdatePacingSettings callbacks do setAppState((prev)=>({...prev, pacingSettings: settings})) with no updatedAt: Date.now() — unlike every other handler in the file (e.g. handleUpdateSettings App.tsx:656-662, handleSaveStudyLog App.tsx:429-436). mergeLocalAndCloudState (firebase.ts) picks which side's pacingSettings wins by comparing state-level updatedAt (isCloudNewer), and saveStateToFirestore stamps the payload with state.updatedAt.
- Impact: Editing his syllabus target date (31 Dec 2026), exam date or revision-pass target does not mark the state as newer, so a cross-device/login merge can silently discard the new pacing settings in favour of the cloud copy — the pacing dashboard reverts to old target dates while showing no error.

**[MEDIUM] Bulk deadline apply is append-only — chapters can never be unlinked and stale deadlines persist**
- File: `src/App.tsx`
- Evidence: App.tsx:635-654: chapters get targetDeadline overwritten only if included in chapterIdsToLink, and the test's linkedChapterIds is only ever unioned (Array.from(new Set([...t.linkedChapterIds, ...chapterIdsToLink]))). No path in the handler removes a chapter from a test's linkedChapterIds or clears a chapter's targetDeadline. Meanwhile getChapterRevisionInfo derives test urgency from tests' linkedChapterIds, not from chapter.targetDeadline, so the two records can disagree permanently.
- Impact: Re-running Bulk Deadline with a corrected, smaller selection does not unlink the removed chapters: they keep the old test's deadline and still surface as linked/urgent for that test. Deadline and test-link data drift apart with no way in this handler to repair them, distorting the critical-risk and radar lists.

**[MEDIUM] Changing spaced-repetition settings never recalculates existing chapters' nextRevisionDate**
- File: `src/App.tsx`
- Evidence: App.tsx:656-662 handleUpdateSettings replaces appState.settings wholesale and touches nothing else. Every existing chapter's nextRevisionDate was computed by calculateNextGap under the previous defaultGaps/confidenceMultipliers at log time (applyStudyLogToChapter) and is only recomputed on the next study log or a log deletion.
- Impact: After he changes the gap sequence or confidence multipliers in Settings, the entire existing due schedule silently stays on the old numbers — the settings screen claims to govern the engine while the due dates he acts on reflect the discarded configuration until each chapter happens to be logged again.

**[MEDIUM] Tab-close 'flush' of pending cloud saves is an unkept async promise with no keepalive**
- File: `src/App.tsx`
- Evidence: App.tsx:312-337: handleBeforeUnload and the visibilitychange handler call saveStateToFirestore(...).catch(()=>{}) — a plain async Firestore setDoc with no sendBeacon/keepalive, which the browser is free to abort during unload. This is the only rescue for the 300ms-debounced auto-save (App.tsx:289-308): a change made and the tab closed within the debounce window depends entirely on this fire-and-forget promise. The localStorage half of the flush is synchronous and does survive.
- Impact: The last log/score entered before closing the tab can silently never reach Firestore despite the code comment promising a flush on close; on his next device (or after a localStorage loss) that session is missing, with cloudSyncStatus having shown 'saving' and no error surfaced.

**[MEDIUM] handleImportState installs and cloud-pushes imported state with no validation and no pre-import safeguard**
- File: `src/App.tsx`
- Evidence: App.tsx:672-680 handleImportState installs the imported object verbatim (setAppState(imported); saveAppState(imported)) and immediately pushes it to Firestore, with no shape validation in the handler itself (contrast refreshStateFromServer's chapters check and loadAppState's per-field normalisation in storage.ts). Any caller-supplied object lacking arrays — e.g. a hand-edited or truncated backup that still passes the modal's loose chapters/studyLogs/tests presence check — reaches renderers that call chapters.filter/studyLogs.filter unconditionally (e.g. App.tsx:688-691, handleSaveStudyLog).
- Impact: A malformed import either white-screens the console on render or, if merely stale/partial, instantly overwrites both localStorage and the cloud copy with no confirmation in the handler and no retained copy of the pre-import state — his live syllabus record is one bad file away from being replaced everywhere at once.

**[LOW] Saving an edited test score silently re-ids and re-timestamps it, falsifying score recency**
- File: `src/App.tsx`
- Evidence: App.tsx:620-633: handleSaveTestScore always mints a new id and timestamp: Date.now() and replaces the prior record via testScores.filter((s)=>s.testId !== scoreData.testId). LogScoreModal pre-fills the existing score for editing (its testScores.find by testId), so a pure correction of one subject's marks re-timestamps the score as if recorded today.
- Impact: Edited scores sort as newest in every timestamp-ordered view/merge (mergedTestScores in firebase.ts sorts by timestamp desc), so an old mock he merely corrected can displace genuinely recent tests as the 'latest' result in trend displays. Limited blast radius because dateRecorded is preserved, but the recorded-history ordering is falsified by an edit.

### QuickLog flow (`quick-log`)

**[CRITICAL] No-change save fabricates a session from prefilled defaults — one click on a completed chapter logs a full revision he never did**
- File: `src/components/QuickLogModal.tsx`
- Evidence: useEffect L126-147 prefills every field from chapter state on open: completion = chapter.completionPercentage ?? (isAlreadyDone ? 100 : 30), confidence = chapter.currentConfidence || 3, pillars = chapter.pillars (or ALL pillars true if a done chapter has no pillars object, L138-145). handleSubmit L199-214 has no dirty-check, no confirmation, and the submit button is never disabled — it unconditionally calls onSaveLog and closes. For a completed chapter the prefilled 100% derives 'revision_round_complete' (L160-164), so opening the modal and pressing the prominent commit button with zero study done increments revisionCount and reschedules the next revision (spacedRepetition.ts L235-245); for a new chapter it records a 30% progress session with confidence 3 that he never entered.
- Impact: One accidental or exploratory click fabricates a study session: a phantom revision round that defers a due chapter by weeks, or phantom 30% progress + a Moderate confidence rating on a chapter never opened. There is no undo affordance in this flow and the fabricated log also updates lastStudiedDate, resetting decay/overdue calculations.

**[HIGH] Every log forces a confidence rating: unrated chapters default to 3 and old ratings are re-stamped as today's assessment**
- File: `src/components/QuickLogModal.tsx`
- Evidence: Confidence has no 'not rated / unchanged' option: initial state L118 is selectedChapter?.currentConfidence || 3 and the chapter-change effect L146 resets it to selectedChapter.currentConfidence || 3, so an unrated chapter (currentConfidence=0) becomes 3 = 'Moderate / Concepts Clear'. handleSubmit L203-212 always passes this value, and applyStudyLogToChapter writes it as the log's confidenceRating and the chapter's currentConfidence and feeds it to calculateNextGap (spacedRepetition.ts L227/L238), where confidence 1-2 uses multiplier 0.5 and 4-5 uses 1.5 (seedData gaps [3,7,14,30]).
- Impact: Logging mere progress stamps a confidence judgement he never made onto that day's log and the chapter. When the chapter next hits 100%, that inherited/defaulted rating — not a real assessment — decides whether the next gap is halved or stretched by 1.5x, i.e. fabricated input drives real revision dates.

**[HIGH] Ticking a 4th pillar secretly forces completion to 100% (and can display 125-150%), with order-dependent behaviour**
- File: `src/components/QuickLogModal.tsx`
- Evidence: togglePillar L179-194 runs side effects inside the setPillars updater: if Object.values(next).filter(Boolean).length === 4 and completion<100 it calls setCompletionPercentage(100); else if checkedCount>0 and completion===0 it sets completion to checkedCount*25. Nothing in the pillars UI (L492-497, 'Tick items covered') discloses this. The count is over the 6 underlying keys, and the Book Reading button (L523-532) bypasses togglePillar entirely with a direct setPillars, so whether 100% fires is order-dependent: tick Lectures+Notes+Practice+Anki (4 keys, no book) and completion jumps to 100%; tick Book last after 3 others (5 underlying keys) and it never fires. With inherited pillars and completion 0, ticking a key can also set 5*25=125 or 6*25=150, displayed as '125%/150% COMPLETED'.
- Impact: Ticking checkboxes — presented as recording what was covered — silently overrides the completion slider he set, flips the derived sessionType to first_pass_complete/revision_round_complete, and triggers revision scheduling he never chose. The same set of ticks produces different completion depending on click order, so the saved percentage is not a function of what he studied.

**[HIGH] Pressing Enter in the chapter search box submits the log; no guard against duplicate submission**
- File: `src/components/QuickLogModal.tsx`
- Evidence: The whole modal is a <form onSubmit={handleSubmit}> (L278) and the chapter search box (L331-337) is a plain text input inside it with no onKeyDown prevention — pressing Enter while searching implicitly submits the form, invoking handleSubmit L199-214, which logs the currently selected chapter with all prefilled defaults and closes the modal. handleSubmit also has no submitted/in-flight guard and the commit button is never disabled, so a double-click or repeated Enter can call onSaveLog twice before unmount; each call increments totalStudySessions and, at 100%, increments revisionCount and re-schedules (spacedRepetition.ts L235-245, L285).
- Impact: A reflex Enter while searching for a chapter creates a real study log — potentially a phantom revision round — for whatever chapter happened to be selected, and duplicate submissions double-count sessions/revisions. The log history, his record of what he actually did, gains entries for actions that were never study.

**[HIGH] Each log records the chapter's cumulative lifetime pillars as if they were all done in this session**
- File: `src/components/QuickLogModal.tsx`
- Evidence: The modal's pillars state is seeded from the chapter's cumulative pillars (L106-115 initial, L137-145 effect) and submitted as the pillars argument (L210); App passes it as pillarsCompleted, and applyStudyLogToChapter (spacedRepetition.ts L255-259, L266-278) stores mergedPillars — the union of all historical chapter pillars and today's — as the new log's pillarsCompleted. Example: lectures/book done last week, today only Anki ticked on top of the pre-ticked boxes — today's log records lectures, bookReading, ncertReading, classNotes etc. as completed in today's session. Additionally, a completed chapter with pillars===undefined gets all six pillars set true by the effect (L138-145), inventing pillar coverage with no source at all.
- Impact: Per-session history is untrustworthy: every log claims the chapter's entire lifetime pillar coverage as that day's work. Anything that later reads logs per session — pillar analytics, and recalculateChapterFromRemainingLogs which aggregates pillars with some() across logs — inherits the inflation, and deleting a log cannot remove pillar credit that was copied into every other log.

**[MEDIUM] A 0% progress log is silently saved as 10% — the entered percentage is clamped away in the handler callee**
- File: `src/services/spacedRepetition.ts`
- Evidence: For a genuine 'progress' log, applyStudyLogToChapter's else branch (spacedRepetition.ts L246-252) computes finalPercentage = Math.min(95, Math.max(10, finalPercentage)) and stores that clamped value in both the chapter and the log (L266-285). QuickLog's slider explicitly offers 0% (L390-403, min=0 step=5) and handleSubmit passes the raw value with no warning. Input 0% or 5% is saved as 10%; a 0% log also sets stage IN_PROGRESS, startedDate=dateStudied and nextRevisionDate=null rather than returning the chapter to unstarted.
- Impact: He cannot record 'opened it, did nothing / reset to zero' — the system invents 10% progress, marks the chapter started, and counts a study session. The log's completionPercentage field does not contain the number he entered, so any history or pacing math built on logs starts from fabricated progress.

**[MEDIUM] Chapter filter/search does not reset the selection — submit can log a chapter that is not in the filtered list**
- File: `src/components/QuickLogModal.tsx`
- Evidence: filteredChapters (L149-155) excludes archived chapters and applies subject/search filters, but changing subjectFilter/searchQuery never clears or validates selectedChapterId, and the <select> (L358-376) is bound to that stale id — filter to Botany while a Physics chapter is selected and the id points at a chapter not among the options, yet handleSubmit L201 only checks the id is non-empty, so submit logs the hidden previously-selected chapter. The initial default has the same flaw: L78-80 picks chapters[0] with no isArchived check, unlike the filter used for the list.
- Impact: A log can land on the wrong chapter: the intended chapter stays unstudied in the system (and keeps decaying toward overdue) while an unrelated chapter gains progress, a session count, a new lastStudiedDate and possibly a rescheduled revision — two chapters' records corrupted by one save.

**[MEDIUM] Stale chapter snapshot: defaults keyed only to chapter id, and App's handler computes the update outside its state updater**
- File: `src/components/QuickLogModal.tsx`
- Evidence: The sync effect is keyed only on [selectedChapterId] (L147) while reading selectedChapter (derived from the chapters prop), and the initial useState values (L78-118, including an inconsistent 25% default at L98-100 vs the effect's 30% at L135) are computed once at mount. If chapter data changes while the modal is open (e.g. a Firestore cross-device merge updating App state) or arrives after mount, completion/pillars/confidence are never refreshed. App compounds it: handleSaveStudyLog (App.tsx L413-437) computes updatedChapter from the render-closure appState.chapters outside the setAppState updater, then map-replaces the chapter in prev — overwriting any newer chapter state with the stale snapshot plus this log.
- Impact: Saving from a modal left open across a sync silently rolls the chapter back to stale completion/pillars/confidence values, discarding the newer device's progress for that chapter while keeping the new log — a quiet cross-device data-loss path in the exact handler contract this flow depends on.

**[MEDIUM] Date studied is never validated: empty date saves a dateless log, future dates are accepted**
- File: `src/components/QuickLogModal.tsx`
- Evidence: The date input (L588-595) writes e.target.value straight to dateStudied with no validation, and handleSubmit L199-214 checks only selectedChapterId. Clearing the field passes dateStudied='' to onSaveLog: the log is stored with an empty dateStudied, while addDaysToDateStr (spacedRepetition.ts L36-38) silently substitutes today for the revision date, so the log and the schedule disagree. There is also no max on the input, so a future date is accepted and becomes lastStudiedDate/nextRevisionDate basis, pushing the chapter into the future.
- Impact: Backdating is a legitimate need, but unvalidated dates corrupt the timeline he relies on: an empty-date log is invisible to date-sorted history yet still rescheduled a revision, and an accidentally future-dated log makes a chapter look freshly studied (not overdue, high retention) for days it was not.

**[LOW] Milestone preview misstates the schedule: hardcoded '(Day 3)' and a revision number/gap that disagree with the handler when revisionCount is 0**
- File: `src/components/QuickLogModal.tsx`
- Evidence: Two label defects in the milestone box L484-487: (1) the first-pass text hardcodes '(Day 3)' — `Spaced Revision scheduled in ${nextGapDays} days (Day 3)` — even when nextGapDays is 2 (confidence 1-2, 3x0.5 rounded) or 5 (confidence 4-5, 3x1.5), so the sentence contradicts itself. (2) The revision round number/gap use (selectedChapter?.revisionCount || 1) + 1 (L173-177, L485, button L645), while applyStudyLogToChapter uses (revisionCount||0)+1 and calculateNextGap(newRevisionCount): for a FIRST_PASS_DONE chapter with revisionCount=0, the modal promises 'Revision #2, next review in 7 days' but the save creates revision #1 in 3 days (gaps [3,7,14,30], confidence 3).
- Impact: The preview is the only place he can check a scheduling decision before committing it; where it misstates the round number, the gap, or both, he approves a revision plan different from the one actually written to his schedule.

**[LOW] Switching chapter mid-entry carries the previous chapter's comment into the new chapter's log**
- File: `src/components/QuickLogModal.tsx`
- Evidence: The chapter-change effect L126-147 resets only completionPercentage, pillars and confidence when selectedChapterId changes. noteText, showComment, dateStudied, searchQuery and subjectFilter are never reset, so a comment typed while chapter A was targeted ('practiced 40 PYQs, ray optics') is submitted verbatim as chapter B's log note if he switches chapter via 'Change Chapter' before saving (handleSubmit L207 passes noteText unchanged).
- Impact: Notes — his qualitative record of what a session covered — can be attached to the wrong chapter, misleading later revision decisions about what was actually practised where. Limited blast radius (note text only, dates arguably carry over intentionally), but the misattribution is silent.

### Quick-add & bulk modals (`quick-add`)

**[CRITICAL] QuickAddTestModal crashes the whole app on open: required existingTests/onAddTest props are never passed**
- File: `src/components/QuickAddTestModal.tsx`
- Evidence: L10-11 props require existingTests: Test[] and onAddTest (no defaults); L30-31 run during render, before any return: 'const hasDateConflict = existingTests.some((t) => t.date === date)'. App.tsx L883-889 renders it with only chapters and onAdd={handleAddTest} — no existingTests, no onAddTest. So existingTests is undefined and .some throws TypeError on mount. No ErrorBoundary exists anywhere in src, and package.json build is only 'vite build' (no tsc), so the type mismatch ships silently.
- Impact: Clicking 'Schedule Test' blanks/crashes the entire console instead of opening the modal. The core test-planning loop is dead from the UI, the date-conflict warning can never run, and even if the render crash were fixed, L59 onAddTest({...}) would throw on submit because that prop is also undefined.

**[CRITICAL] QuickAddChapterModal can never add a chapter: submit calls an onAddChapter prop the caller never supplies**
- File: `src/components/QuickAddChapterModal.tsx`
- Evidence: L7-16 props require onAddChapter: (chapter) => void; L40 handleSubmit unconditionally calls onAddChapter({name, subject, ...}). App.tsx L876-881 renders it with onAdd={handleAddChapter} — a differently named prop — so onAddChapter destructures to undefined and the call throws 'onAddChapter is not a function'. The setName('')/onClose() at L52-53 sit after the throwing call and never execute.
- Impact: Every attempt to add a chapter through this modal fails: nothing is saved, no error is shown, and the typed name is lost with the crashed submit. Custom/off-syllabus chapters cannot be added from the UI at all.

**[HIGH] Quick-add chapter has no duplicate check at all — re-adding an existing chapter silently creates a second record**
- File: `src/components/QuickAddChapterModal.tsx`
- Evidence: Props L7-11 receive no chapters/existing list, so no comparison is possible; handleSubmit L33-50 validates only 'if (!name.trim()) return' and then emits the chapter. App.tsx handleAddChapter L506-521 appends unconditionally: 'chapters: [...prev.chapters, newChapter]' with a fresh id, no name/subject/cluster dedupe (not even case-insensitive). Input example: adding 'Cell Cycle' when the seed syllabus already contains it, or adding the same new chapter twice.
- Impact: Two records for one chapter split his study logs, confidence and revision dates between them — one copy can show due/overdue while the other looks untouched — and the duplicate inflates the chapter total used as the denominator in syllabus-completion/pacing calculations, so pacing percentages are silently understated.

**[HIGH] Confidence >0 in QuickAdd fabricates 'studied today', schedules no revision, and its revisionCount is silently discarded by the handler**
- File: `src/components/QuickAddChapterModal.tsx`
- Evidence: L45-48: currentConfidence=initialConfidence, lastStudiedDate = initialConfidence>0 ? getTodayStr() : null, nextRevisionDate: null (always), revisionCount = initialConfidence>0 ? 1 : 0. No date input exists and no StudyLog is created. App.tsx L506-515 spreads the data then overwrites 'revisionCount: 0'. spacedRepetition.ts L103-104 then derives a fake 25% completion from lastStudiedDate/confidence>0, and L443+ computes memory retention from lastStudiedDate as if a real session happened today.
- Impact: Onboarding a chapter he actually finished days/weeks ago with confidence 4 records it as studied today, resets its decay/retention clock to day 0, yet sets nextRevisionDate=null so it never enters the revision queue — and the one signal that he had completed a pass (revisionCount 1) is thrown away by the handler. The resulting record (confidence 4, studied today, 0 revisions, 0 logs, no next date) is internally contradictory and will mislead due-date and retention displays.

**[HIGH] BulkDeadline defaults to tests[0] — a long-past test — and offers all past tests unfiltered and unsorted**
- File: `src/components/BulkDeadlineModal.tsx`
- Evidence: L20 initialises selectedTestId to tests[0].id; L25-29 useEffect falls back to tests[0].id again; L104-114 renders every test in raw array order with no date sort, no past-test filter and no past warning. In the seed data tests[0] is dated 2026-06-28 (seedData.ts L196), months before today. App.tsx handleApplyBulkDeadline L635-656 then sets those chapters' targetDeadline to that past date, while spacedRepetition.ts L168 filters deadline candidates with 'daysUntil >= 0', so a past test can never surface as an upcoming deadline.
- Impact: The preselected, easiest path in this modal assigns chapters to a test that has already happened: the modal closes as if successful, but the 'deadline' produces no urgency, no due-soon status and no planning effect. He can believe chapters are covered for an upcoming mock when nothing is actually scheduled.

**[MEDIUM] Quick-add test claims to 'Apply Deadlines' but never sets any chapter's targetDeadline, unlike the bulk and MCP paths**
- File: `src/components/QuickAddTestModal.tsx`
- Evidence: Header L96 'Schedule Test & Set Deadlines', L142 label 'Test Date (Sets chapter deadlines)', submit button L276 'Schedule Test & Apply Deadlines'. But handleSubmit L56-68 only passes linkedChapterIds inside the Test object, and App.tsx handleAddTest L601-614 only appends the test — it never touches chapters. Contrast App.tsx L635-656 (bulk path sets c.targetDeadline = targetTest.date) and mcpServer add-test with syncDeadlines doing the same.
- Impact: Deadline state depends on which door he used: chapters linked via quick-add keep a null/stale targetDeadline in stored, exported and MCP-visible data, while bulk-linked chapters get the date — two sources of truth for the same link, so any view/tool reading targetDeadline (rather than reverse-looking-up linkedChapterIds) shows no deadline for quick-added tests.

**[MEDIUM] Quick-add test can be created with zero linked chapters and a fabricated scope label, despite being sold as deadline-setting**
- File: `src/components/QuickAddTestModal.tsx`
- Evidence: handleSubmit L56-58 guards only 'if (!name.trim() || !date) return' — selectedChapterIds may be []. L63: subjectOrScope: subjectOrScope.trim() || 'Custom Syllabus Scope' invents a scope string when left blank, regardless of which chapters (if any) were selected. The submit button is never disabled for an empty selection.
- Impact: He can schedule a test that sets deadlines on nothing and is labelled with a scope he never wrote; the test later reads as a real planned mock in counts/lists while contributing no chapter deadlines and no truthful scope.

**[MEDIUM] Total Marks accepts negative or absurd values verbatim; an explicit 0 is silently rewritten to 720**
- File: `src/components/QuickAddTestModal.tsx`
- Evidence: Input L188-193 is type=number with no min/max/step; state updates via Number(e.target.value) at L191. Submit L66: 'totalMarks: Number(totalMarks) || 720' — this only rescues 0/NaN. Inputs -180, 10000 or 720.5 pass through unchanged and are stored as the test's totalMarks.
- Impact: A typo such as -720 or 7200 becomes the denominator for that test's score/percentage displays and any target calculations, silently corrupting his Allen mock record; conversely a deliberately cleared/zero field is silently replaced with 720 without telling him.

**[MEDIUM] Quick-add test accepts any past date, which instantly makes the test and its chapter deadlines invisible to the planner**
- File: `src/components/QuickAddTestModal.tsx`
- Evidence: handleSubmit L56-67 checks only that date is non-empty; the date input L157-165 has no min and no past-date warning (the only warning implemented, L166-179, is for same-date conflicts). spacedRepetition.ts L158-168 builds earliestTestDeadline only from linked tests with daysUntil >= 0.
- Impact: A one-digit year/month typo (e.g. 2025 instead of 2026, or last month's date) creates a test that never appears as upcoming, never generates deadline urgency for its linked chapters, and looks identical in the form to a correctly scheduled one — he discovers it only when the mock he planned around never surfaces.

**[MEDIUM] BulkDeadline cannot show or undo existing links, and silently overwrites a chapter's existing targetDeadline with no warning**
- File: `src/components/BulkDeadlineModal.tsx`
- Evidence: selectedChapterIds always initialises to [] (L21) and is never seeded from the selected test's linkedChapterIds, and switching the test dropdown (L100) does not change it — so a test already linked to 20 chapters displays '0 selected' (L125). handleSubmit L54-58 only forwards ids to add. App.tsx L644 overwrites each selected chapter's targetDeadline unconditionally and L649 only unions linkedChapterIds (Set spread) — nothing anywhere in this flow removes a link. 'Clear' L48-50 merely empties the local selection, and submit is disabled at 0 (L186), so Clear cannot unlink anything.
- Impact: He cannot see which chapters a test already covers, cannot repair a mistaken link from this modal, and bulk-applying a later test silently replaces the stored targetDeadline of chapters that had an earlier one — with no list of affected chapters and no confirmation.

**[MEDIUM] BulkDeadline silently does nothing when there are no tests, while leaving its Apply button enabled**
- File: `src/components/BulkDeadlineModal.tsx`
- Evidence: Props L9/L17 default tests to []; selectedTestId then stays '' (L20, and the L25-29 effect only fires when tests.length > 0). The test <select> L95-115 renders empty with no empty-state message. handleSubmit L54-56: 'if (!selectedTestId || selectedChapterIds.length === 0) return;' — a silent return. The submit button L184-186 is disabled only on selectedChapterIds.length === 0, not on a missing test.
- Impact: With zero tests (e.g. after a reset/import state with no tests) he can tick chapters, click 'Apply Deadline to N Chapters', and get no action, no error and no explanation — the modal just stays open, indistinguishable from a bug or a successful-but-unconfirmed apply.

**[LOW] BulkDeadline's cluster filter is dead code: state and filter logic exist but no control can ever set it**
- File: `src/components/BulkDeadlineModal.tsx`
- Evidence: L23 declares clusterFilter/setClusterFilter and L34 applies it in filteredChapters ('String(c.clusterId) !== clusterFilter'), but setClusterFilter is never referenced again in the file; the only filter control rendered is the subject <select> at L137-155. Chapter rows display 'Cluster {c.clusterId}' (L172-174), so the data to filter on is shown but unfilterable.
- Impact: With 86 chapters in a flat scroll list he cannot narrow by NEET cluster (e.g. all of Mechanics II) as the code intends; bulk selection for a unit test requires scrolling and hand-ticking, making Select-All-by-subject over/under-selection more likely.

### Lived journeys (`journeys`)

**[CRITICAL] Revision rounds logged through QuickLog NEVER advance: revisionCount freezes at 1 and the 3→7→14→30 gap ladder never climbs**
- File: `src/services/spacedRepetition.ts:218-222 (with src/components/QuickLogModal.tsx:158-162)`
- Evidence: QuickLogModal derives sessionType='revision_round_complete' at 100% for an already-finished chapter (L158-162), but applyStudyLogToChapter checks the first-pass branch FIRST: `if (sessionType === 'first_pass_complete' || finalPercentage >= 100)` (L218) captures every revision log because its percentage is 100. That branch sets `newRevisionCount = Math.max(1, chapter.revisionCount === 0 ? 1 : chapter.revisionCount)` (L222) — i.e. unchanged — and forces stage back to 'FIRST_PASS_DONE'. The incrementing branch at L229-241 (`newRevisionCount = (chapter.revisionCount || 0) + 1`) is unreachable for any 100% log. The new log's revisionNumber = newRevisionCount (stuck at 1), and calculateNextGap is fed the frozen count.
- Impact: Journey 2's core loop is broken: every revision he logs leaves the chapter at 'Rev #1', reschedules it at the shortest gap forever, and regresses IN_REVISION chapters to FIRST_PASS_DONE. WeeklyAuditModal's getStandardRoundLabel then labels every revision log '1ST PASS' (revisionNumber<=1), so his Sunday audit also misreports revision rounds as first passes.

**[CRITICAL] A partial session on a completed chapter is silently converted into a full revision round, contradicting the modal's own 'NO REVISION TRIGGER' promise**
- File: `src/services/spacedRepetition.ts:229-241 (with src/components/QuickLogModal.tsx:437-440)`
- Evidence: QuickLogModal at <100% completion displays 'DAILY STUDY PROGRESS (NO REVISION TRIGGER)… This chapter will stay in your Active In-Progress Queue' (L437-440) and sends sessionType='progress'. But applyStudyLogToChapter's second branch triggers on chapter state alone: `else if (sessionType === 'revision_round_complete' || chapter.learningStage === 'IN_REVISION' || chapter.learningStage === 'FIRST_PASS_DONE')` (L229-232), then forces `finalPercentage = 100`, stage IN_REVISION, `newRevisionCount = (chapter.revisionCount || 0) + 1` and `nextRevisionDate = addDaysToDateStr(dateStudied, nextGapDays)` (L235-241). The 'progress' branch below it is unreachable for any completed chapter.
- Impact: On a revision-due morning he opens a due chapter, does half the work, logs 50% exactly as the UI invites — and the app counts a completed revision round and pushes the next due date out by a full multiplied gap. The chapter vanishes from the due queue (TestRadarFocus Lane 3) though the revision was never finished; his revision record overstates rounds completed.
- Also found independently by: quick-log, spaced-repetition

**[CRITICAL] LogScoreModal is pre-filled with invented scores (590/720, 140/145/155/150 per subject) — one careless Save records a fictional Allen result as his**
- File: `src/components/LogScoreModal.tsx:74-87,156-166,319-354`
- Evidence: Initial state hard-codes subjectData Physics {score:140, correct:36, incorrect:4…}, Chemistry 145, Botany 155, Zoology 150, quickTotalScore=590, quickCorrect=150/quickIncorrect=10/quickUnattempted=20 and globalErrors {3,3,3,1,0} (L74-87). The useEffect 'no existing score' branch re-installs the identical invented numbers every time the modal opens for an unlogged test (L156-166). handleSubmit (L319-354) unconditionally builds subjectScores/subjectQuestions from subjectData and calls onSaveScore — even in QUICK_TOTAL mode, so typing only a real total still persists the fabricated 140/145/155/150 subject breakdown alongside it.
- Impact: Journey 3 breaks at the final click: opening the score logger for a test he has not yet scored and pressing 'Save Score & Error Forensic Telemetry' (or switching to Quick Total and entering just his total) writes invented subject scores, question counts and error taxonomy into testScores, which then feed TestManager subject averages/trends and the Weekly Audit error forensics. Nothing in the UI marks these numbers as placeholders.

**[CRITICAL] Opening the app in a fresh browser/device overwrites the server's persisted state file with seed data — the app never reads server state on startup**
- File: `src/App.tsx:173-199 (with server.ts:258-269)`
- Evidence: App initialises state purely from loadAppState() (localStorage; seed on a new browser). The only GET of /api/state lives in refreshStateFromServer (L173-186), which is passed solely to McpModal as onStateRefresh (App.tsx:981) and never called on mount. Meanwhile a useEffect fires 1.2s after ANY appState change — including the initial seed render — and POSTs the whole state to /api/state (L189-199). server.ts POST /api/state (L258-269) blindly replaces serverState and writes it to data/server-state.json, the same file the MCP tools read/write.
- Impact: Journey 5: on a new phone/browser (or after clearing site data) served by his own backend, simply opening the console pushes the empty seed (0 logs, 0 scores) over data/server-state.json, wiping the server/MCP copy of his study record before he can sign in or restore. The UI gives no warning that this sync happened.

**[HIGH] Switching the test dropdown to an unlogged test keeps the previous test's numbers in the form, ready to be saved under the wrong test**
- File: `src/components/LogScoreModal.tsx:173-215`
- Evidence: handleTestSelectionChange looks up the newly selected test's existing score and, `if (existing) {...}`, reloads all form fields — there is no else branch. Selecting a test with no saved score leaves selectedTestId changed but subjectData, quickTotalScore, quick counts, globalErrors and notes all still holding the previously viewed test's (or the fabricated defaults') values. handleSubmit then calls onSaveScore with testId=selectedTest.id and those stale numbers, and App.handleSaveTestScore (App.tsx:620-630) stores it under the new test, replacing any score for that testId.
- Impact: Journey 3: reviewing Test A's logged score, then picking Test B in the same modal to enter B's result, starts from A's numbers instead of a blank form; an unnoticed Save corrupts B's record with A's score and error breakdown.

**[HIGH] 'Cloud Synced' is shown while his data sits under a throwaway per-browser anonymous account — a new device silently starts a different empty account**
- File: `src/services/firebase.ts:111-127 (with src/components/Header.tsx:235-240)`
- Evidence: initAuthListener auto-signs-in anonymously whenever no user exists: `signInAnonymously(currentAuth)` then onUserChanged(cred.user) (L118-122). Anonymous UIDs are per browser/device storage, so a new phone gets a brand-new UID whose Firestore document is empty; App's auth effect loads that (null) cloud state and keeps local seed. Yet after saving to that anonymous UID, App sets status 'synced' and Header renders 'Cloud Synced' with title 'Cloud Synced to … account' (Header L235-240), although currentUser.email is null for anonymous users. Google sign-in exists only inside SettingsModal; no first-run step prompts for it.
- Impact: Journey 5's question 'is my data there?' fails deceptively: the header assured him for weeks that he was cloud-synced, but the backup lives under an anonymous identity that a new device, a cleared browser, or a different browser profile can never reclaim. Unless he manually finds the Google sign-in in Settings on the old device first, the new device starts from seed.

**[HIGH] The only screen that shows chapters due in the next 2 days is dead code — 'due soon' chapters are invisible everywhere in the running app**
- File: `src/components/OverdueAndDueList.tsx:21-67 (never imported; cf. src/components/TestRadarFocus.tsx:123-131)`
- Evidence: OverdueAndDueList is the sole component computing due_soon (status==='due_soon') and rendering 'Due in ≤2 Days' filters plus the recent-logs feed; a repo-wide grep shows it is defined at OverdueAndDueList.tsx:21 and imported nowhere — App.tsx's import block (L3-24) omits it entirely. The home screen's substitute, TestRadarFocus Lane 3, filters `info.status === 'overdue' || info.status === 'due_today'` only (L123-131), and its 'Revision Due Today' telemetry box uses the same list.
- Impact: Journey 2 has a blind spot: a chapter due tomorrow or the day after appears on no screen until the morning it is already due (or overdue). He cannot plan revision evenings ahead, despite a finished component existing for exactly that.

**[HIGH] Weekly Audit receipt contradicts itself on marks lost: total uses 1 mark per wrong question, the breakdown multiplies each error by 5**
- File: `src/components/WeeklyAuditModal.tsx:145-158,286-289`
- Evidence: weekNegativeMarks is accumulated as a question COUNT: `weekNegativeMarks += s.incorrectQuestions || 0` (L150), then printed as 'TEST MARKS LOST TO ERRORS: -${weekNegativeMarks} PTS' (L286). The very next receipt lines multiply the error-category tallies by five: `-${weekSillyMistakes * 5} pts`, `-${weekConceptualGaps * 5} pts`, `-${weekMemoryRecall * 5} pts` (L287-289), and the on-screen forensics cards likewise show '-{count * 5} raw marks'. NEET negative marking is −1 per wrong answer (the LogScoreModal itself labels incorrect '(-1)'), and the category tallies are free +/- counters in LogScoreModal that are never capped at the incorrect-question count, so the ×5 lines need not even sum to anything related to the total above them.
- Impact: Journey 4: the Sunday audit he acts on tells him in one breath that he lost, say, −10 pts to errors and in the next that silly slips alone cost −15 pts and concept gaps −15 pts. He cannot tell which errors actually bleed marks, and the inflated category figures push him to fix the wrong weakness.

**[MEDIUM] Dismissing the tutorial with X makes it reappear on every launch, and tutorial completion is never written to the synced state**
- File: `src/components/TutorialModal.tsx:167-172 (with src/App.tsx:385-395)`
- Evidence: The tutorial header X button calls only onClose (TutorialModal L167-172); App's handleCompleteTutorial — the only place that sets localStorage 'pcb01_tutorial_seen' — runs only via the final 'Get Started' step (App L392-394, wired as onComplete at L943). Separately, AppState.tutorialCompleted is never set true by any handler: the gate reads the standalone localStorage key (App L386), while loadAppState/seed keep tutorialCompleted=false and firebase merge ORs the two states' flags (firebase.ts:392), so the synced copy stays false forever.
- Impact: Journey 1: closing the intro the natural way (X) re-opens it on every single reload until he pages through all 4 steps. Journey 5: even after completing it properly, a new device/browser shows the full tutorial again because completion never travelled with his synced state.

**[MEDIUM] The 'past 7 days' weekly audit window actually spans 8 calendar days, double-counting sessions across consecutive Sunday audits**
- File: `src/components/WeeklyAuditModal.tsx:71,85,127`
- Evidence: weekLogs, weekTests and weekScores all filter with `diff >= 0 && diff <= 7` where diff = getDaysDifference(logDate, today) — that admits 8 distinct dates (today plus the 7 preceding days), while the modal brands itself '7-Day Cycle' / 'Past 7 days' throughout. A session logged exactly 7 days ago is counted in this Sunday's audit and, if he audits again the following Sunday is excluded, but auditing on a rolling basis (e.g. Sunday then next Sunday is 7 days later) counts that boundary day twice across the two receipts.
- Impact: Journey 4: weekly velocity, discipline score inputs and session counts are systematically inflated by one extra day (~14%), and the same study session can appear on two consecutive weekly receipts, weakening the audit as a week-over-week comparison.

**[MEDIUM] Ticking any 4 of the 5 pillars in QuickLog silently forces chapter completion to 100% and arms the first-pass milestone**
- File: `src/components/QuickLogModal.tsx:180-193`
- Evidence: togglePillar contains: `if (checkedCount === 4 && completionPercentage < 100) { setCompletionPercentage(100); }` (L185-187). The rendered pillar list has 5 entries (lectures, bookReading, classNotes, questionPractice, anki), so checking a fourth pillar — e.g. while logging an ordinary partial study day — snaps the completion slider to 100% with no confirmation. On submit, derivedSessionType becomes 'first_pass_complete' (QuickLogModal L158-162) and applyStudyLogToChapter records the milestone, sets firstPassCompletedDate/daysTakenToComplete and schedules spaced revision.
- Impact: Journey 1: a first log that was meant to be 'watched lectures, read NCERT, did notes and Anki — still mid-chapter' is committed as a completed first pass; the chapter leaves his in-progress queue and enters the revision schedule on a false premise.


## 5. Tests & scores


## 5. Tests & scores

### TestManager (`test-manager`)

**[HIGH] Attempt Precision maths is broken: numerator and denominator count different scores, and 85% is fabricated when data is missing**
- File: `src/components/TestManager.tsx`
- Evidence: L203-205: `if (score.correctQuestions) totalCorrect += score.correctQuestions; if (score.correctQuestions && score.incorrectQuestions) { totalAttempted += correct + incorrect; }` — the numerator counts a score whenever correctQuestions is non-zero, but the denominator counts it only when BOTH fields are non-zero. L242-243: `accuracyPct = totalAttempted > 0 ? Math.round((totalCorrect/totalAttempted)*100) : 85`. Displayed at L662-666 as 'Attempt Precision {accuracyPct}%' over '{totalCorrect} / {totalAttempted} answered accurately'. Breaking inputs: score A correct=90, incorrect=0 plus score B correct=10, incorrect=10 gives totalCorrect=100, totalAttempted=20, accuracy=500%. A single perfect test (correct=180, incorrect=0) gives totalAttempted=0 and displays a fabricated 85% instead of 100%; any score logged without question counts also shows 85% over '0 / 0'.
- Impact: The headline precision metric he uses to judge attempt strategy can read 500%, or a made-up 85% when no attempt data exists — silently wrong numbers driving real decisions about guessing/attempting.

**[HIGH] Test Manager cannot edit or delete a test — a wrong test date or name is permanent**
- File: `src/components/TestManager.tsx`
- Evidence: Props at L35-43 expose only onOpenAddTest, onOpenLogScore, onOpenQuickLog and onOpenPrintSchedule — no edit-test or delete-test handler exists anywhere in the file, and the only per-test actions rendered are 'Log Score' (L575-582 area), expand, 'Revise' per chapter, and 'Edit' on a score (L1160s, which calls onOpenLogScore(score.testId), i.e. edits the score, not the test). App.tsx passes TestManager exactly these props and defines no test edit/delete handler either. The screen titles itself 'Mock Test Manager' / 'TEST SCHEDULE & MOCK TEST CENTER' (L300-315).
- Impact: A custom test created with a wrong date, name, coaching or scope — or a seeded Allen/Aakash test that gets rescheduled — can never be corrected or removed in the app. The wrong date permanently feeds the pending/unfilled logic in this file and test-deadline calculations elsewhere, so his schedule truth decays with no repair path.

**[HIGH] Analytics hardcode 720 and mix raw marks, so any non-720 test corrupts peak, average, tiers, graph and delta**
- File: `src/components/TestManager.tsx`
- Evidence: Custom tests can carry any totalMarks (QuickAddTestModal stores Number(totalMarks)||720; LogScoreModal L99/L359 sets maxScore = selectedTest.totalMarks || 720), so TestScore.maxScore is not always 720. But TestManager: L676/L680 call getScoreConfidenceTier(highestScore) and getScoreConfidenceTier(avgScoreMarks) with no maxScore (defaulting to 720) and L683 labels the card 'Out of 720 maximum marks'; L733-754 compute the graph's Average/Peak tiers as getScoreConfidenceTier(avg, 720) and (peak, 720) with literal '/720' labels, while L719-726 'Latest Score' correctly uses latest.maxScore; L763 delta = last.totalScore - first.totalScore subtracts raw marks across tests; the chart (L782-785) draws a fixed 0-720 grid while points (L805/L820/L835) are plotted as totalScore/(maxScore||720), i.e. as fractions. Example: a 360-mark test scored 300 (83%) plots near the 600 gridline, its raw 300 drags the 'average /720' down, tiers it as a <420 failure, and delta against a 720-test is meaningless.
- Impact: As soon as he logs any part/chapter test that is not out of 720, Peak/Average cards, their colour tiers, the progression graph and the T1→Now delta all misrepresent his performance — a strong part-test reads as a collapse.

**[MEDIUM] Today's test is simultaneously 'already taken / pending marks', UNFILLED and UPCOMING**
- File: `src/components/TestManager.tsx`
- Evidence: Three different rules for the same day coexist: pendingPastUnfilledTests (L102-105) filters getDaysDifference(todayStr, t.date) <= 0 under the comment 'Only PAST tests that are unfilled (already taken...)' and the card copy says 'These tests have already taken place', rendering '{Math.abs(daysAway)}d ago' (L405) = '0d ago' for today; the status filter (L132) admits a today test to UPCOMING because it only excludes daysAway < 0 or hasScore — and the same today test also passes UNFILLED (L131 excludes only daysAway > 0); the timeline itself treats daysAway===0 as a third state, 'Today!' (L512-513, L547-548).
- Impact: From midnight on test day, before he has sat the exam, the app lists it as a past exam pending marks ('0d ago', 'already taken place') and simultaneously classifies it as both UNFILLED and UPCOMING — inviting a score to be logged for a test not yet taken and making filter counts untrustworthy.

**[MEDIUM] Score progression is ordered by date recorded, not by test, and same-day scores plot in reverse order**
- File: `src/components/TestManager.tsx`
- Evidence: L97-99: sortedScores sorts testScores only by the dateRecorded string (localeCompare), with no tiebreak. The graph, Latest Score (L719), Average and the T1→Now delta (L763) all consume this order, and L905 labels it '{n} Tests Logged Chronologically'. The history table in the same file instead sorts by b.timestamp - a.timestamp (L1093). App.tsx stores testScores newest-first ([newScore, ...prev]), and Array.sort is stable, so two scores recorded the same day keep newest-first order in the 'chronological' graph — the opposite of the history table — and a score backfilled days later for an older test lands at the trajectory's end regardless of when the test was taken.
- Impact: The progression trajectory, 'Latest Score' and Score Delta can show improvement/decline that is purely an artefact of when scores were typed in, not of test order — he reads a trend that never happened.

**[LOW] Broken chapter links are silently dropped while the UI still counts them**
- File: `src/components/TestManager.tsx`
- Evidence: L554-555 prints '· {test.linkedChapterIds.length} chapters linked' and L593-594 heads the expanded panel 'Exam Syllabus Chapters ({test.linkedChapterIds.length}):', but the render loop at L597-599 does `const ch = chapterMap.get(chId); if (!ch) return null;` — ids that no longer resolve to a chapter vanish with no placeholder or warning.
- Impact: If a linked chapter is deleted or its id changes, the header still claims e.g. 6 chapters linked while only 4 render; he prepares for an exam scope that is silently smaller than the count he trusts, with no signal the link is broken.

**[LOW] Per-subject error cards silently omit Wild Guesses that the data tracks**
- File: `src/components/TestManager.tsx`
- Evidence: The accumulator at L222-228 adds se.guessingWild into subjectErrors[sub].wild and into subjectErrors[sub].total, but the per-subject cards (L954-970) render only four rows — Silly Mistakes, Conceptual Gaps, Memory Recall, Time Pressure — with no Wild Guesses row; subjectErrors.total is likewise never displayed. The overall taxonomy section does show Wild Guesses, so the two views disagree about the same data.
- Impact: Per-subject diagnosis hides one of the five error causes: he can see that Physics has wild guesses in the global taxonomy but can never see which subject they belong to from the subject cards, so subject-level corrective action misses them.

### LogScoreModal (`log-score`)

**[CRITICAL] Unlogged test is pre-filled with a fabricated 590/720 score that saves as real**
- File: `src/components/LogScoreModal.tsx`
- Evidence: Lines 74-84 initialise subjectData to Physics 140 (36/4/5), Chemistry 145, Botany 155, Zoology 150; lines 88-92 initialise quickTotalScore=590, quickCorrect=150, quickIncorrect=10, quickUnattempted=20 and globalErrors 3/3/3/1/0. The no-existing-score branch of the useEffect (lines 154-167) re-installs exactly the same numbers instead of blanks. handleSubmit (lines 319-387) has no empty/untouched check, so opening the modal for an unlogged test and pressing 'Save Score & Error Forensic Telemetry' persists a complete invented 590/720 result with invented per-subject scores, question counts and error taxonomy.
- Impact: A single accidental or lazy save creates a fake mock result that enters his averages, subject averages, error forensics and pacing decisions as if he scored 590. Nothing in the saved record marks it as default/placeholder.

**[CRITICAL] Quick Total mode silently saves the stale/default subject-wise breakdown alongside the quick total**
- File: `src/components/LogScoreModal.tsx`
- Evidence: handleSubmit builds subjectScores/subjectQuestions/bySubjectErrors by looping SUBJECTS over subjectData unconditionally (lines 327-337) and saves them at lines 383-385 regardless of entryMode; only totalScore/correct/incorrect totals switch on entryMode (lines 354-382). finalErrors top-level fields use globalErrors in QUICK_TOTAL (lines 340-349) but bySubject always comes from subjectData. Example: in Quick Total he enters total 400 with counts 100/20/60 — the record still carries subjectScores 140+145+155+150=590, subjectQuestions summing 150/10/20, and a bySubject error breakdown he never saw or edited in that mode.
- Impact: Every Quick-Total record is internally contradictory: totalScore disagrees with its own subjectScores sum. TestManager (lines 164-167) and featureManifest average subjectScores, so subject-strength conclusions are computed from scores that were never entered for that test.

**[HIGH] Switching the dropdown to an unlogged test carries over the previous test's score**
- File: `src/components/LogScoreModal.tsx`
- Evidence: handleTestSelectionChange (lines 174-227) only assigns state inside `if (existing) {...}`; there is no else branch resetting dateRecorded, subjectData, quick totals, globalErrors, notes or errorNotes when the newly selected test has no saved score. The useEffect's no-score branch (lines 154-167) does reset, proving the reset is known-necessary but missing here.
- Impact: Workflow: open a logged test (its real numbers load), then switch the dropdown to a pending test — the form still shows the first test's score, counts, errors and notes, and Save writes them under the second test's testId/testName. Two tests end up with the same result and both feed his averages.

**[HIGH] Loading a score-only record invents correct/incorrect counts that contradict the score**
- File: `src/components/LogScoreModal.tsx`
- Evidence: Both score loaders (useEffect lines 119-121 and handleTestSelectionChange lines 189-191) fabricate missing counts: `cor = sq.correct ?? Math.max(0, Math.floor((Number(scoreVal)+5)/4))` and `incor = sq.incorrect ?? 2`. The invented pair need not even reproduce the score: score 100 -> correct 26, incorrect 2 -> implied score 26*4-2=102; score 140 -> 36/2 -> 142; score 0 -> 1/2 -> 2.
- Impact: Scores created without question counts (e.g. via MCP or older records) acquire invented correct/incorrect counts on mere display; re-saving — even just to edit notes — persists the inventions as subjectQuestions and as the aggregated correctQuestions/incorrectQuestions, corrupting accuracy and negative-marking analysis.

**[HIGH] No consistency check between question counts, total questions, and the score they imply**
- File: `src/components/LogScoreModal.tsx`
- Evidence: Subject inputs are bounded only individually (min 0 / max 45 at lines 602-638); nothing in handleSubjectQuestionChange (lines 265-290) or handleSubmit (lines 319-387) checks correct+incorrect+unattempted per subject or in total, and subject-wise totalQuestions is saved as whatever the three fields sum to (lines 360-364) — e.g. 45+45+45 per subject saves totalQuestions=540 for a 180-question paper. In Quick mode the counts inputs (lines 788-809) have no min/max at all and totalScore is independent state (lines 315, 775-781): entering total 500 with quick counts 150/10/20 (which imply 4*150-10=590) saves both, while totalQuestions is forced to Math.round(maxMarks/4)=180 at line 364 regardless of the counts' sum.
- Impact: Saved records can simultaneously claim two different performances (headline score vs question counts). Downstream accuracy (correct/(correct+incorrect)) and marks-bleed figures are then computed from the counts while rankings/trends use totalScore, so the same test tells two different stories.

**[HIGH] Error-breakdown steppers are uncapped and never reconciled with the incorrect count**
- File: `src/components/LogScoreModal.tsx`
- Evidence: The subject card labels its taxonomy '({d.incorrect || 0} Mistakes)' (line 647), implying the categories partition the incorrect questions, but handleSubjectErrorChange (lines 293-305) only floors at 0 — `nextVal = Math.max(0, currentVal + delta)` — with no upper bound, and handleGlobalErrorChange (lines 307-312) is identical. handleSubmit saves the sums unchecked (lines 339-349). E.g. Physics incorrect=1 with conceptualGaps tapped to 20 saves conceptualGaps=20 against 1 wrong question.
- Impact: His error-forensics percentages and 'what to fix first' priorities (TestManager/featureManifest aggregate these fields) can be dominated by counts that exceed the number of questions actually answered wrong, with no warning at entry or save.

**[MEDIUM] The fifth error category, guessingWild, has no input control anywhere in the modal**
- File: `src/components/LogScoreModal.tsx`
- Evidence: guessingWild exists in the data model and in this file's state, aggregation (line 248) and saved finalErrors (lines 348-349), but no stepper for it is rendered in either mode: the subject-wise taxonomy grid (lines 640-760) and the Quick global grid (lines 819 onwards) render only Silly, Conceptual, Memory and Time Pressure controls — grep shows guessingWild appears only in state/load/save code, never in JSX.
- Impact: A wrong answer caused by wild guessing can never be classified as such in the UI, so guessingWild is structurally always 0 for modal-entered scores. Downstream displays that include 'Wild Guesses' totals/percentages will report 0% wild guessing — a false clean bill for a behaviour NEET negative marking punishes.

**[MEDIUM] Clearing both correct and incorrect leaves a stale phantom subject score that still saves**
- File: `src/components/LogScoreModal.tsx`
- Evidence: In handleSubjectQuestionChange, score is only recomputed when a field remains non-empty: for 'incorrect', `if (current.correct !== '' || num !== '')` (lines 278-282), and symmetrically for 'correct' (lines 273-277). Sequence on default Physics (36/4, score 140): clear Incorrect -> score becomes 36*4-0=144; then clear Correct -> both are '' so the guard is false and score stays 144. handleSubmit (lines 329-335) then saves subjectScores.Physics=144 with correct/incorrect undefined. The subjectQuestions emptiness guard at line 385 can also never fire, since line 330 inserts a key for every subject even when all its fields are undefined.
- Impact: Clearing a subject's counts to redo them leaves a phantom score that is saved as a real subject result with no supporting question counts — an orphan number in his subject averages.

**[MEDIUM] Subject-wise entry hardcodes 4 subjects x 45 questions x 180 marks regardless of the test's actual marks/scope**
- File: `src/components/LogScoreModal.tsx`
- Evidence: maxMarks honours the selected test (line 99: selectedTest?.totalMarks || 720) and QuickAddTestModal lets totalMarks be any number, but this modal hardcodes the full-paper shape: summary pills print '/ 180' per subject (line 515), the subject card prints 'Calculated Marks ... / 180' (line 592), each count input caps at max=45 (lines 605, 619, 633), and selectedTest.subjectOrScope is never consulted. For a 360-mark part test, the default subject-wise total 590 yields effectivePercentage = 590/360 = 163.9% (line 316) and can be saved as totalScore 590 with maxScore 360.
- Impact: For any non-720 test (single-subject or part-syllabus mocks, which the test creator explicitly allows), Subject-Wise entry is unusable/wrong and only Quick Total works — and even that still attaches the bogus subject breakdown from the separate finding above.

**[MEDIUM] Prop changes while the modal is open wipe in-progress entry and snap the test selection back**
- File: `src/components/LogScoreModal.tsx`
- Evidence: The sync useEffect depends on [preselectedTestId, isOpen, tests, testScores] (line 170) and unconditionally resets selection and every field: `setSelectedTestId(preselectedTestId || tests[0].id)` (lines 102-104) then reloads existing-or-default data for that test (lines 105-167). It does not distinguish 'modal just opened' from 'props changed while open'.
- Impact: If tests/testScores get a new array identity while he is mid-entry (e.g. a background Firestore sync lands while the modal is open), his in-progress edits are silently wiped and the dropdown snaps back to the preselected/first test — he can lose a half-filled forensic entry or, worse, not notice the test snapped back and save onto the wrong test.

### TestRadarFocus (`test-radar`)

**[HIGH] Test readiness % counts revision-due and weak (confidence <=2) chapters as ready**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: Lines 152-159: testReadinessPercent = (mastered.length + revisionDue.length) / all.length * 100, rendered as 'Test Syllabus Readiness' (line 454). But revisionDue (line 112) is populated precisely by chapters whose info.status is 'overdue'/'due_today' or whose currentConfidence <= 2, and the same screen labels that column '3. Revision Due / Weak' with 'Refresher Needed' (lines 576-578). Worked example: a test linking 10 chapters, all first-pass done but all overdue or confidence <=2, gives mastered=0, revisionDue=10, readiness = 100%.
- Impact: The headline readiness number for his nearest exam can read 100% when every linked chapter is overdue for revision or rated weak — the exact chapters he most needs to revise are counted as readiness, so he can walk into a mock believing he is prepared.

**[HIGH] Archived or deleted chapters linked to a test silently vanish from its readiness denominator**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: chapterMap is built only from activeChapters (non-archived) at lines 43-48. The breakdown maps activeTest.linkedChapterIds through that map and silently drops misses: '.filter((c): c is Chapter => Boolean(c))' (lines 97-99), and readiness divides by that reduced 'all' list (lines 119, 152-159). Meanwhile the card's syllabus line uses the raw linkedChapterIds.length (line 447), so the two numbers on the same card disagree. Example: a test linking 20 chapters with 10 archived/deleted resolves to 10 chapters; if those 10 are mastered, readiness shows 100% with half the exam syllabus invisible and uncounted anywhere.
- Impact: Archiving or deleting a chapter that is still on an upcoming test's syllabus silently shrinks the test's denominator, inflating readiness and removing the chapter from the zero-coverage alert — he loses coverage of real exam material with no warning.

**[MEDIUM] A test with an invalid or empty date is treated as an exam TODAY and becomes the active mission**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: Lines 81-91: daysAway = getDaysDifference(todayStr, t.date); tests are kept when daysAway >= 0 and sorted ascending, activeTest = upcomingTests[0]. getDaysDifference (src/services/spacedRepetition.ts lines 68-77) returns 0 for any unparseable/empty date. A test whose date is empty or garbled (bad import, sync corruption) therefore gets daysAway 0, sorts first, and is rendered with the 'TODAY' badge (lines 427-431), displacing the real nearest test as the radar's mission.
- Impact: One corrupted test date silently hijacks the whole radar: countdown, readiness and coverage columns all re-anchor to a phantom 'exam today' while his actual next exam disappears from the focus view.

**[MEDIUM] 'Mastered / Exam Ready' bucket is a catch-all: includes confidence-3 chapters and chapters falling due before the exam**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: The classification chain (lines 106-117) makes 'mastered' the catch-all else-branch: any completed chapter that is not overdue/due-today today and has confidence > 2 lands there, regardless of when its nextRevisionDate falls relative to the test date, and regardless of confidence 3. The column is headed '4. Exam Ready / Mastered' / 'Locked In' with a '✓ Locked' chip (lines 625-627, 656), yet its own empty state defines the bucket as 'No chapters at ★4–5 yet' (line 632) — a definition the code never applies. Example: exam in 25 days, a confidence-3 chapter with nextRevisionDate in 10 days is 'scheduled' today, so it is counted Exam Ready even though it falls due 15 days before the exam and will be overdue on exam day.
- Impact: Readiness is judged as of today, not as of exam day, and mid-confidence chapters are presented as locked-in mastered — he is told chapters need no further work before the exam when their own revision schedule says otherwise.

**[MEDIUM] Telemetry counts are not mutually exclusive — one chapter can be counted in two buckets at once**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: The three telemetry filters are independent OR-conditions, not a partition: notStarted matches learningStage==='NOT_STARTED' (line 53); inProgress matches stage==='IN_PROGRESS' OR 0<completion<100 (line 60); completed matches FIRST_PASS_DONE/IN_REVISION OR completion>=100 (lines 67-71). getChapterRevisionInfo forces derived completion to 100 whenever revisionCount>=1 while leaving an explicit stage untouched, so a chapter with learningStage 'IN_PROGRESS' and revisionCount>=1 is counted in both box 2 and box 3; a chapter stored as NOT_STARTED with completionPercentage 50 is counted in both box 1 and box 2. The boxes are presented as a numbered 1/2/3 breakdown of the syllabus with syllabusPercent derived from box 3 (lines 75-78, 247-256).
- Impact: The three headline counts can sum to more than the total chapter count, and the same chapter can be simultaneously 'in progress' and '1st pass complete', so the telemetry he uses to judge syllabus coverage does not add up.

**[MEDIUM] Fabricated fallback numbers: 0% shows as 25% done, 0 sessions as 1 logged, revision 0 as Rev #1**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: Lane 1: 'const pct = info.completionPercentage || 25' and 'const daysActive = info.daysActive || 1' (lines 301-302), and '{ch.totalStudySessions || 1} session(s) logged' (line 344) — a chapter with 0% completion and zero logged sessions displays '25% DONE' and '1 session(s) logged'. 'Started: {ch.startedDate || ch.lastStudiedDate || 'Recently'}' (line 342) labels the last-studied date as the start date when startedDate is missing. Lane 2 column 2 repeats 'const pct = ch.completionPercentage || 25' (line 541) but reads the raw chapter field instead of the derived info used in Lane 1, so the same chapter can show two different percentages on one screen. Lane 3 prints 'Rev #{ch.revisionCount || 1}' (line 729), inventing a first revision round for a chapter with revisionCount 0.
- Impact: Progress percentages, session counts and revision numbers he reads on his main dashboard are invented defaults rather than his data, and can contradict each other between lanes — eroding trust in every other number on the page.

**[MEDIUM] Dead wiring: no way to add a test from the empty state or to choose any test other than the nearest**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: The props interface declares onOpenAddTest (line 25), onQuickUpdateStage (line 27) and onNavigateToTests (line 29), and App.tsx passes all three, but the destructuring at lines 32-38 omits them and none is referenced anywhere in the 843 lines. Consequences in-file: the 'No Upcoming Tests Linked' empty state (lines 665-675) offers no Add Test action, and Lane 2 hard-anchors to upcomingTests[0] (line 91, comment line 80 'radar always uses the nearest upcoming exam') with no control to view or select a different test.
- Impact: If the chronologically nearest test is a minor self-test, the radar's readiness, zero-coverage alert and revision columns all target that test and he cannot switch the mission to the major coaching mock a few days later from this screen; with no upcoming tests the lane is a dead end despite an add-test handler existing.

**[MEDIUM] A test with zero resolvable linked chapters shows a vacuous all-clear instead of a no-syllabus warning**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: When the active test resolves to zero chapters (empty linkedChapterIds, or all links archived/deleted per the chapterMap drop at lines 97-99), testReadinessPercent falls back to 0 (lines 152-159) but every column renders a benign/all-clear empty state: column 1 shows '✓ No unstudied chapters! You've started or finished all syllabus.' (line 492), and no alert anywhere states the test has no syllabus linked. Combined with nearest-test anchoring (line 91), an empty test tomorrow becomes the mission and looks clean apart from the unexplained 0%.
- Impact: A test with no linked syllabus presents as 'you've finished all syllabus' rather than 'this test tracks nothing' — false reassurance about coverage for an exam whose chapters were never linked.

**[MEDIUM] Critical-decay lane demands 'revision' for chapters whose first pass is not finished**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: criticalDecayChapters (lines 162-167) filters ALL active chapters purely on calculateMemoryRetention decayStatus==='critical', with no learningStage/completion gate. calculateMemoryRetention (spacedRepetition.ts) returns 'critical' for any studied chapter below 50% retention, including a revisionCount-0 chapter still mid-first-pass with low confidence. Lane 4 copy says these topics 'have exceeded their memory half-life without a spaced revision' with a 'Rescue & Log Revision' button (lines 785, 832), while Lane 3 on the same screen states the revision cycles are 'Active only after 1st pass is finished' (line 692).
- Impact: Chapters he has not finished studying even once are flagged as overdue for spaced revision and pushed toward a revision-round log — the wrong next action for them, contradicting the app's own first-pass-then-revision model on the same page.

**[LOW] Countdown and due counts freeze at render time — no midnight rollover**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: Line 39: 'const todayStr = getTodayStr();' is a plain render-time constant — no state, timer or date-change listener anywhere in the component. Every countdown, overdue status and readiness figure derives from it (useMemo deps at lines 55, 62, 73, 89, 120, 134, 167). If the app tab stays open across midnight, nothing recomputes until some unrelated prop change forces a re-render: yesterday's test remains the active mission with its old 'EXAM IN N DAYS' badge and due/overdue counts stay frozen.
- Impact: A dashboard left open overnight silently shows yesterday's countdown and revision queue — he can start a study day acting on a stale 'due today' list.

**[LOW] '1st Pass Mastered' label overstates the count — it includes confidence-1 first-pass completions**
- File: `src/components/TestRadarFocus.tsx`
- Evidence: Telemetry box 3 is labelled '3. 1st Pass Mastered' (line 247) and its percentage is syllabusPercent, but completedFirstPassChapters (lines 64-73) includes every FIRST_PASS_DONE or IN_REVISION chapter at any confidence — including a chapter finished once at confidence 1 — and Lane 3's header similarly calls all of them '100% Completed Chapters' (line ~688). First-pass completion and mastery are conflated in the label while the underlying count is only the former.
- Impact: The syllabus percentage he tracks against his 31 Dec target is labelled 'Mastered', overstating what the number means: it measures chapters seen once, not chapters mastered, which can mislead his pacing judgement late in the syllabus push.

### TestSchedulePrintModal (`print-schedule`)

**[HIGH] Print/HTML export is not identical to preview: Tailwind v3 CDN + 350ms race + wrong fonts + dead stylesheet links**
- File: `src/components/TestSchedulePrintModal.tsx`
- Evidence: handlePrint comment claims '100% Identical to Preview' (L453) but copies only printAreaRef.current.innerHTML (L485) into a new document that loads <script src="https://cdn.tailwindcss.com"> (L495, repeated L581 in handleDownloadHTML) — the Play CDN is Tailwind v3 while the app builds with tailwindcss ^4.1.14 via @tailwindcss/vite (package.json). It then calls contentWindow.print() on a fixed setTimeout of 350ms (L558-566) regardless of whether the CDN script/fonts have loaded. It also loads Space Mono + Plus Jakarta Sans as 'Google Fonts matching the app' (L496-500) while the app actually uses Sora/Atkinson Hyperlegible/Anonymous Pro. getDocumentStylesHTML (L440-451) copies link[rel=stylesheet] outerHTML verbatim; in the downloaded file those Vite /assets/... URLs do not resolve from file://, so the 'standalone' HTML is not standalone.
- Impact: Offline, on slow network, or if the CDN is blocked, Print and Save HTML produce an unstyled or wrongly-styled schedule — different fonts, spacing and colours from the preview he approved. The wall pin-up he relies on for test dates may not match what he configured.

**[HIGH] Subject-matrix hardcodes /720 and all blank score slots ignore the test's real max marks**
- File: `src/components/TestSchedulePrintModal.tsx`
- Evidence: Subject-matrix renders `Score: ${score.totalScore}/720` (L2030) ignoring score.maxScore, while table (L1750), cards (L1933) and datesheet (L2129) correctly use `${score.totalScore}/${score.maxScore}`. Separately, every blank slot hardcodes 720 — table L1750 '____ / 720', cards L1933 '_____ / 720', matrix L2030, datesheet L2129 — ignoring Test.totalMarks (src/types.ts:68) and TestScore.maxScore (types.ts:103).
- Impact: For a part test out of e.g. 180 or 360, the matrix printout understates his result (e.g. 150/720 instead of 150/180), and blank slots tell him to write a score out of 720 for a test that is not out of 720. Same data, different denominator depending on layout.

**[MEDIUM] Chapter-count column counts dangling IDs that the syllabus list omits**
- File: `src/components/TestSchedulePrintModal.tsx`
- Evidence: Table rows build linkedChapters by mapping linkedChapterIds through chapterMap and filtering out misses (L1547-1550), and the syllabus list prints only those resolved chapters — but the Chs column prints test.linkedChapterIds.length (L1741-1744), the raw unfiltered count. Cards instead print linkedChapters.length (L1805-1807).
- Impact: If any linked chapter ID is dangling (chapter deleted/renamed in GMC), the table's Chs count includes chapters that are not listed anywhere on that row, and table and cards layouts disagree on the chapter count for the same test. He cannot reconcile the count against the printed list.

**[MEDIUM] Header 'Next Exam' stat is wrong for All Dates: it only inspects the earliest test**
- File: `src/components/TestSchedulePrintModal.tsx`
- Evidence: Header stats compute Next Exam from filteredTests[0] only: `filteredTests.length > 0 && getDaysDifference(todayStr, filteredTests[0].date) >= 0 ? ... : '—'` (L1494-1500). filteredTests is sorted ascending by date (L200-202), so with horizonFilter='all' the first entry is the earliest — often a past — test, and the stat shows '—' even when later entries are upcoming.
- Impact: Printing the full-year schedule (All Dates) produces a header claiming there is no next exam, contradicting the upcoming tests listed directly below it on the same sheet.

**[MEDIUM] Countdown/status labels contradict each other across layouts; matrix prints 'Due in -Nd' for past tests**
- File: `src/components/TestSchedulePrintModal.tsx`
- Evidence: Matrix header (L2030): score ? `Score: ...` : showCountdown ? `Due in ${daysAway}d` : 'Score: ____ / 720' — for a past unscored test daysAway is negative, printing e.g. 'Due in -5d', and for today 'Due in 0d'. Status also differs by layout for identical data: table shows 'DONE' whenever a score exists (L1587-1610), cards ignore scores and show DUE TODAY/IN xD/PAST purely by date (L1818-1823), so a completed, scored past test is labelled 'PAST' in cards, 'DONE' in table, and a score in matrix.
- Impact: The same test carries contradictory status labels depending on which layout he prints, including a nonsensical negative countdown in matrix layout. He cannot trust the printed status at a glance.

**[LOW] Duplicate scores for one test are silently overwritten, last-in-array wins**
- File: `src/components/TestSchedulePrintModal.tsx`
- Evidence: scoreMap is built with `testScores.forEach((s) => map.set(s.testId, s))` (L133-137) with no duplicate handling: if two TestScore records exist for the same testId, the later array element silently replaces the earlier one, and every layout, the header 'Tests Logged' count (L1504) and the Markdown export (L648) use that arbitrary winner.
- Impact: Duplicate scores (e.g. from a sync/import duplication) make the printed schedule show whichever score happened to be last in the array, with no indication a conflict existed — a wrong score on his permanent printed record.

**[LOW] Student name is injected unescaped into exported HTML title and filename**
- File: `src/components/TestSchedulePrintModal.tsx`
- Evidence: customStudentName is interpolated unescaped into the generated document title in both export paths: `<title>NEET Test Schedule - ${customStudentName || 'Aspirant'}</title>` (L493, L580), written via frameDoc.write (L489) and a Blob download (L571-635). The download filename sanitises only whitespace: `customStudentName.replace(/\s+/g, '_')` (L631). A name containing '</title>' or '/' breaks the exported document/filename; the name originates from the Google displayName prop (App.tsx studentName={currentUser?.displayName}) or free text input (L1323).
- Impact: A name with markup or path characters corrupts the exported HTML/print document instead of appearing as plain text. React escapes the name in the on-screen preview, so the preview looks fine while the export is broken.


## 6. The MCP server & console — the AI-facing surface

### MCP server tools (`mcp-tools`)

**[CRITICAL] batch_log_study_sessions is not atomic and silently drops unknown chapters while reporting success**
- File: `src/services/mcpServer.ts`
- Evidence: L1427 description promises 'a single atomic operation'. Handler L1455-1515: sessions.forEach only acts 'if (chIndex >= 0)' (L1458) — unknown chapterIds are silently skipped, no error collected. Return L1519-1523 is always {success:true, committedSessionsCount} even when committedCount is 0 or 2 of 5, and the audit entry is written regardless. Partial batches commit the valid subset while reporting success.
- Impact: An AI logging a marathon with one mistyped ID believes every session was recorded; the missed chapters keep stale due dates and he revises the wrong things, with no signal to re-check.

**[CRITICAL] import_restore_data merge mode silently drops tests, scores and all settings, yet reports success**
- File: `src/services/mcpServer.ts`
- Evidence: Merge branch L1694-1712 merges only chapters and studyLogs. nextTests/nextScores are initialised to prev values (L1687-1688) and never assigned from data in merge mode, so a backup's tests and scores are silently discarded. nextState (L1714-1721) also never restores settings, pacingSettings or actionHistory in either mode. Log merge L1706-1710 does logMap.set(l.id, l) unconditionally, so an older backup's log overwrites a newer local log with the same ID (chapters at least check updatedAt, L1700). Return L1735 always {success:true, mode, validation}.
- Impact: Restoring a backup to recover mock tests/scores appears to succeed but restores none of them, and can regress study logs to older versions — silent data loss on the exact operation meant to prevent it.
- Also found independently by: mcp-direct

**[CRITICAL] log_study_session 'progress' sessions fabricate a revision schedule the canonical logic forbids**
- File: `src/services/mcpServer.ts`
- Evidence: L872-878: newRevCount = progress ? ch.revisionCount : ch.revisionCount+1, then gapDays=calculateNextGap(newRevCount,...) and ch.nextRevisionDate=nextDate are set unconditionally for every sessionType, and the log's revisionNumber=newRevCount (L904). Canonical applyStudyLogToChapter (spacedRepetition.ts L261-267) specifies progress => revisionCount 0, nextRevisionDate=null ('NOT in revision yet!'), stage IN_PROGRESS. MCP also never sets startedDate/daysTakenToComplete, which the canonical path sets on first_pass_complete.
- Impact: Logging partial progress on an unfinished chapter instantly invents a revision schedule and revision number for it, so unfinished chapters surface as due revisions and pacing/analytics built on daysTakenToComplete stay permanently null for MCP-logged chapters.

**[HIGH] batch_log_study_sessions counts a first revision as revision 2 and doubles its first gap**
- File: `src/services/mcpServer.ts`
- Evidence: L1463-1467 and L1479: gap and count use (ch.revisionCount || 1) + 1. For a fresh chapter revisionCount=0, (0||1)+1 = 2, so the first-ever revision is stored as revisionNumber 2 and calculateNextGap(2) picks gaps[1]=7 days instead of gaps[0]=3. Single log_study_session L872 correctly uses ch.revisionCount+1 (=1). For first_pass_complete the batch gap is always calculated with revision argument 1 (L1464) regardless of existing revisionCount, resetting the interval ladder.
- Impact: The same session logged via batch vs single produces different revision counts and a 7-day instead of 3-day first gap — first revisions come over twice as late as the spaced-repetition schedule intends.

**[HIGH] hoursSpent is fabricated as 1h at log time and again at export time, inconsistently**
- File: `src/services/mcpServer.ts`
- Evidence: log_study_session schema defaults hoursSpent to 1 (L856) and stores 'hoursSpent: hoursSpent || 1' (L902); batch uses 'item.hoursSpent ?? 1' (L1461). buildEverythingDump re-fabricates on read: 'hoursSpent: l.hoursSpent || 1' (L177), while the same dump's subjectBreakdown sums 'l.hoursSpent || 0' (L274) — the export and its own totals disagree about the same logs.
- Impact: Sessions logged without hours acquire a fictitious 1h everywhere the field is read (exports, daily summaries), inflating any hours-based total with invented data while the dump's own subject totals use a different convention.

**[HIGH] add_test_score accepts scores for nonexistent tests and internally contradictory numbers**
- File: `src/services/mcpServer.ts`
- Evidence: Handler L1184-1240 never checks that testId exists in state.tests, never checks totalScore against the sum of the four subject scores, and never checks correct+incorrect+unattempted against anything. It hardcodes maxScore:720 and totalQuestions:180 (L1201-1202) even for a test whose totalMarks is not 720, sets dateRecorded always to today (L1199, no date input exists), and defaults testName to the raw testId string (L1198) when testName is omitted.
- Impact: Scores can be attached to nonexistent tests, totals can contradict their own subject/question breakdowns and still feed pacing and error analytics, and a score entered a day late is permanently dated to the entry day under an ID-looking name.

**[HIGH] update_spaced_repetition_settings accepts zero, negative or absurd gaps/multipliers with no bounds**
- File: `src/services/mcpServer.ts`
- Evidence: Schema L1247-1252: defaultGaps is z.array(z.number()) with no positivity, length or range bounds; confMultiplier1-5 are bare z.number(). Handler L1259-1268 stores them verbatim. calculateNextGap (spacedRepetition.ts L11-30) only clamps the final result to >=1, so a multiplier of 0 or negative collapses every gap to 1 day, and a multiplier of 100 pushes a 30-day gap to ~3000 days.
- Impact: One bad settings call silently makes every chapter due tomorrow forever, or pushes revisions years past the 2 May 2027 exam, with no warning in the success response.

**[HIGH] delete_test orphans the test's scores, which keep counting in dumps and analytics**
- File: `src/services/mcpServer.ts`
- Evidence: Handler L1067-1092 only filters prev.tests; state.testScores entries with that testId are untouched. The tool description (L1058) claims it will 'unlink chapters', but no chapter or score cleanup occurs. Orphaned scores continue to appear in buildEverythingDump's testScoresHistory (L205-225) and in list_tests' scores slice (L963), and still count wherever scores are aggregated.
- Impact: Deleting a duplicate or wrong test leaves its scores behind, still inflating mock-test counts and score history with results for a test that no longer exists.

**[HIGH] reset_chapter_progress reports success for nonexistent chapters and leaves counters/logs un-reset**
- File: `src/services/mcpServer.ts`
- Evidence: L1607-1636: the map only matches ch.id===chapterId; if nothing matches, chapterName stays '' and the tool still returns {success:true, chapterId, chapterName:''} (L1649) — unlike update_chapter which throws. The reset object omits totalStudySessions (spread keeps the old value) and never touches state.studyLogs, so a 'fresh restart' chapter still carries e.g. totalStudySessions=12 and its full log history in get_chapter_details.
- Impact: A reset of a mistyped ID reports success while doing nothing, and a real reset leaves chapter state, session counts and log history contradicting each other about whether the chapter was ever studied.

**[HIGH] update_chapter_pillars drops ncertReading and completes chapters without scheduling any revision**
- File: `src/services/mcpServer.ts`
- Evidence: L695-705: newPillars is rebuilt with only lectures/bookReading/classNotes/questionPractice/anki — the ncertReading field present on every chapter is dropped from the stored object entirely. L712-720: reaching pct>=100 sets FIRST_PASS_DONE and firstPassCompletedDate but never sets nextRevisionDate or revisionCount, unlike log_study_session's first_pass_complete which schedules the first revision.
- Impact: Completing all pillars via MCP marks a chapter done but it never enters the revision queue (no due date ever), and any NCERT-reading state stored only in ncertReading is silently erased.

**[HIGH] import_restore_data claims get_everything output is restorable, but its keys do not match**
- File: `src/services/mcpServer.ts`
- Evidence: Tool description L1675 invites a payload 'previously exported via export_backup_data or get_everything'. But buildEverythingDump returns study logs under the key studyLogsHistory (L314) and tests/scores under tests/testScoresHistory, with chapters in a reformatted shape (extra currentStatus/urgencyScore fields, L118-168). import reads data.studyLogs/data.testScores (L1691-1696, falling back to prev values), so a get_everything restore silently keeps the current logs/scores while replacing chapters with dump-shaped objects.
- Impact: Following the tool's own documented restore path produces a hybrid state — old logs attached to reformatted chapters — while the response claims a validated successful restore.

**[MEDIUM] link_chapters_to_test counts phantom IDs as linked and silently overwrites existing deadlines**
- File: `src/services/mcpServer.ts`
- Evidence: Schema L1102-1103 and handler L1110-1135: updatedLinkedIds unions chapterIds into the test without checking any ID exists; the audit entry and success message use chapterIds.length as the linked count (L1127, L1139) regardless of how many matched. With syncDeadlines defaulting to true, every matched chapter's existing targetDeadline is overwritten with the test date (L1117-1119) with no record of the previous deadline, and no unlink tool exists in the file.
- Impact: 'Linked 8 chapters' can mean 3 real and 5 phantom IDs now permanently stored on the test, and chapters silently lose earlier deadlines they were paced against.

**[MEDIUM] No date-format validation on any tool that accepts a date string**
- File: `src/services/mcpServer.ts`
- Evidence: add_test date (L1024), add_chapter targetDeadline (L565), update_chapter targetDeadline/nextRevisionDate (L637-640) and update_pacing_settings targetExamDate/targetSyllabusDate (L1320-1321) are all plain z.string() with no format check. getDaysDifference (spacedRepetition.ts L58-70) returns 0 for unparseable dates, so a malformed test date reads as 'due today' and a malformed exam date silently corrupts pacing calculations instead of erroring.
- Impact: A typo'd date (e.g. 2027/05/02 or 02-05-2027) is accepted with success and then interpreted as today/zero-distance, producing wrong test radar and pacing decisions.

**[MEDIUM] get_analytics_breakdown ignores its subject argument and returns unfiltered analytics**
- File: `src/services/mcpServer.ts`
- Evidence: Handler L382-390 destructures {subject} but calls buildAppFeaturesAndAnalytics(state, {includeLiveAnalytics:true}) — subject is never passed or applied, and the full unfiltered analytics are returned under a tool whose description (L376-379) promises subject filtering.
- Impact: Asking for Physics-only analytics returns all-subject numbers labelled as the answer, so subject-level pacing/weakness decisions are made on blended data.
- Also found independently by: mcp-direct

**[MEDIUM] get_study_status 'topUpcomingTests' and 'topDueChapters' are unsorted storage-order slices**
- File: `src/services/mcpServer.ts`
- Evidence: L421: topUpcomingTests is dump.tests.slice(0,3). buildEverythingDump (L190-207) maps tests in raw storage order with no sort by date and no filter for date >= today, so past tests and arbitrarily ordered tests are presented as 'upcoming'. topDueChapters (L422) is likewise the first 5 due/overdue chapters in storage order, not sorted by the urgencyScore that list_due_chapters sorts by.
- Impact: The headline status tool can show a test from last month as an upcoming test and bury the most overdue chapter below less urgent ones.

**[MEDIUM] generate_study_session: 'weighted' mode is unimplemented and never-studied chapters are treated as overdue**
- File: `src/services/mcpServer.ts`
- Evidence: Mode handling L812: only 'random' alters scoring; 'weighted' falls through to exactly the worst_first computation despite being a distinct advertised mode. Never-studied chapters (nextRevisionDate null) get diff=-1 (L806), receiving the overdue bonus (+6, L807) and confidence score via 'currentConfidence || 1', and are recommended revision actions ('NCERT Line-by-Line Review + 25 Core PYQs' for confidence<=2, L830-836). Slot maths L818-819: minsPerSlot=floor(availableMinutes/picked.length), so 119 minutes over 3 slots allocates 117 while the response claims totalMinutes:119; an empty pool returns schedule:[] with totalMinutes still claimed.
- Impact: Generated sessions recommend revision drills for chapters never studied, the 'weighted' choice silently does nothing different, and stated session lengths do not match the allocated slots.

**[MEDIUM] get_chapter_details fuzzy-matches to the first partial name match with no disambiguation**
- File: `src/services/mcpServer.ts`
- Evidence: L519: chapters.find(c => c.id===chapterId || c.name.toLowerCase().includes(chapterId.toLowerCase())) returns the first partial match with no ambiguity check; an empty chapterId matches every name (''.includes) and returns the first chapter in the array. log_study_session by contrast requires exact name equality (L869), so the two tools resolve the same identifier differently.
- Impact: Querying details for 'Cell' can silently return the wrong chapter (first match in array order), and downstream actions taken on that returned ID then modify the wrong chapter.

**[MEDIUM] log_study_session cannot backdate: dateStudied is forced to today**
- File: `src/services/mcpServer.ts`
- Evidence: The schema (L851-858) has no date parameter; the handler sets dateStudied: today from getTodayStr() (L863, L900) and computes the next gap from today (L873-874). The canonical applyStudyLogToChapter accepts an arbitrary dateStudied, so the UI can backfill but the MCP tool cannot.
- Impact: A session actually done yesterday but logged today (or after midnight) is permanently recorded on the wrong day, shifting streaks, daily summaries and the next revision date by a day with no way to correct it via MCP.

### MCP resources, prompts & direct JSON-RPC (`mcp-direct`)

**[CRITICAL] Direct JSON-RPC path has zero argument validation — out-of-range values the SDK rejects are persisted and poison scheduling/analytics**
- File: `src/services/mcpServer.ts`
- Evidence: SDK schemas enforce bounds, e.g. log_study_session at 851-858: confidenceRating z.number().min(1).max(5), hoursSpent .min(0.1).max(12); add_test_score at 1150ff: totalScore .min(0).max(720), subject scores .max(180); update_chapter at 620ff: completionPercentage .min(0).max(100), currentConfidence .min(0).max(5). executeMcpDirect never validates: log handler at 2801 destructures {chapterId, confidenceRating, hoursSpent=1,...} raw and writes ch.currentConfidence=confidenceRating (~2820); add_test_score at 2954ff writes totalScore unchecked; update_chapter at 2650ff writes any learningStage/completionPercentage/nextRevisionDate. Its own tools/list schemas (1925-2327) also drop all numeric min/max.
- Impact: POST /api/mcp with confidenceRating=99 persists currentConfidence=99: urgencyScore (5-99)*4 goes hugely negative in buildEverythingDump, average-confidence and weak-spot maths break, and the chapter effectively vanishes from due priority. totalScore=9999 persists and renders as 1388.9%. An invalid subject in add_chapter (2610ff, subject.toLowerCase() only) creates a chapter no subject filter/breakdown ever counts. Same call via SSE is rejected; via HTTP it silently corrupts his record.

**[HIGH] Direct log_study_session and update_chapter_pillars drop the learning-stage transitions the SDK performs — state depends on which transport logged the work**
- File: `src/services/mcpServer.ts`
- Evidence: SDK log_study_session 883-890: sessionType first_pass_complete sets learningStage='FIRST_PASS_DONE', completionPercentage=100, firstPassCompletedDate; revision_round_complete sets 'IN_REVISION' + 100. Direct log_study_session 2801-2845 sets only lastStudiedDate, nextRevisionDate, currentConfidence, revisionCount, totalStudySessions — no learningStage/completionPercentage/firstPassCompletedDate anywhere. SDK update_chapter_pillars 715-722: pct>=100 -> FIRST_PASS_DONE + firstPassCompletedDate, pct>0 from NOT_STARTED -> IN_PROGRESS + startedDate. Direct pillars handler 2684-2728 sets pillars + completionPercentage + updatedAt only.
- Impact: Logging a completed first pass or revision via the HTTP/playground path leaves the chapter NOT_STARTED/IN_PROGRESS at <100% forever, so syllabus-progress, pacing and panoramic counts under-report work he actually did, while the identical log via an SSE client advances it. Two clients disagree about his syllabus state with no error shown.

**[HIGH] Resource neet://syllabus/overview is advertised and listed but has no handler in executeMcpDirect — reading it via HTTP always errors**
- File: `src/services/mcpServer.ts`
- Evidence: SDK registers it at 1803-1810 returning dump.analytics.syllabusAndCurriculum. Direct resources/list includes it at 2363 ({uri:'neet://syllabus/overview', name:'Syllabus Overview'}), but direct resources/read (2372-2431) handles only features-and-analytics, everything, daily/summary, forecast/decay, weak-spots, due-today, tests/upcoming, history/actions, chapter/* and test/* — no syllabus/overview branch — so it falls to 2431 throw new Error(`Unknown resource URI`) and the outer catch (3388-3395) returns JSON-RPC -32603.
- Impact: Any MCP client using the direct POST endpoint (the in-app playground path) that follows resources/list hits a dead resource; syllabus overview is simply unavailable on that transport while working over SSE.

**[MEDIUM] Direct generate_study_session is a different, weaker algorithm: mode is echoed but ignored, and recommended actions are missing**
- File: `src/services/mcpServer.ts`
- Evidence: SDK handler (~800-848) scores base 50 + min(50, overdueDays*6) + 30 if due today + (5-conf)*12, overwrites score with Math.random()*100 for mode='random', and returns chapterName, revisionCount and a per-chapter recommendedAction. Direct handler 2754-2799: score=(5-(conf||1))*10 plus overdueDays*5 only, no base/due-today term, mode is destructured and echoed in the response but never used in scoring (random and weighted return the identical worst-first ordering), and schedule entries carry name/currentConfidence with no recommendedAction or revisionCount.
- Impact: Asking the HTTP endpoint for a 'random' or 'weighted' session silently gets worst-first ordering, due-today chapters lose their +30 priority, and the AI/client loses the study-technique recommendation the SSE version provides — a different study plan for the same state depending on transport.

**[MEDIUM] Direct resources/read returns different payload shapes than the SDK for tests/upcoming and history/actions (and no cap on history)**
- File: `src/services/mcpServer.ts`
- Evidence: SDK upcoming-tests 1820-1826 returns JSON {tests: dump.tests}; direct 2400-2403 returns JSON.stringify(dump.tests) — a bare array. SDK action-history 1828-1833 returns {actions: (state.actionHistory||[]).slice(0,100)}; direct 2404-2406 returns JSON.stringify(state.actionHistory||[]) — bare array, full unbounded history. Neither path filters tests to upcoming dates, so past tests (daysRemaining<0 in buildEverythingDump) are returned under the 'upcoming' URI on both.
- Impact: A client written against one transport breaks or mis-parses on the other; the history resource can dump his entire audit log without limit, and 'upcoming tests' includes tests already sat, so an AI can plan around a test that already happened.

**[MEDIUM] Chapter/test resource templates exist only in the direct path, and the direct test template silently returns only the first score**
- File: `src/services/mcpServer.ts`
- Evidence: Direct resources/templates/list 2329-2350 advertises neet://chapter/{chapterId} and neet://test/{testId}, and /api/mcp/info (server.ts) advertises them globally — but createStudyConsoleMcpServer registers no resource template at all (only the 9 static server.resource calls, 1771-1843), so SSE clients cannot use them. In direct resources/read, the test template at 2419-2430 uses (state.testScores||[]).find(s=>s.testId===tId) and returns scoreHistory:[score] — one record — whereas the get_test_details tool (2884-2895) correctly uses .filter to return all scores for the test.
- Impact: Template support is transport-dependent despite being advertised as a server feature, and re-logging a score for the same test makes earlier/later score records invisible through the template resource an AI may use for a postmortem.

**[MEDIUM] Direct batch_log_study_sessions silently skips sessions whose chapterId does not match exactly, and still returns success even when nothing was logged**
- File: `src/services/mcpServer.ts`
- Evidence: Handler 3098-3194: sessions.forEach only acts `if (chIndex >= 0)` (findIndex on exact c.id===item.chapterId); unmatched entries fall through with no error, no per-session result and no list of failures. The response is unconditionally {success:true, committedSessionsCount, date} — committedSessionsCount can be 0. Note the single-session direct handler (2808) accepts a name match (c.name.toLowerCase()===chapterId.toLowerCase()) but the batch handler does not, so an identifier accepted by one is silently dropped by the other.
- Impact: A batch log with a typo'd or name-based chapterId reports success while some or all of his study sessions were never recorded — lost logs and wrong revision dates discovered only later, if ever.

**[MEDIUM] Direct delete_test reports success for a test that does not exist; the SDK throws**
- File: `src/services/mcpServer.ts`
- Evidence: SDK delete_test (1058ff) looks up the target and throws `Test not found: ${testId}`, capturing the name for its confirmation message. Direct delete_test 2926-2934 blindly filters (prev.tests||[]).filter(t=>t.id!==testId), writes a TEST_DELETED action-history entry, and returns {success:true, deletedTestId:testId} regardless of whether anything matched.
- Impact: A mistyped ID via HTTP produces a false deletion confirmation plus a false audit-log entry claiming a deletion that never happened; an AI will believe the test is gone while it remains scheduled.

**[LOW] Direct list_tests ignores its limit argument and drops the scores field the SDK returns**
- File: `src/services/mcpServer.ts`
- Evidence: SDK list_tests (953ff) applies limit (default 20, max 50) via dump.tests.slice(0,limit) and includes scores: dump.testScoresHistory.slice(0,5). Direct handler 2875-2883 destructures nothing from toolArgs and returns {count: dump.tests.length, tests: dump.tests} — all tests, no scores key — despite its tools/list entry (2103ff) advertising a limit property.
- Impact: Clients paging tests via HTTP get the full list every time and lose the recent-scores context the SSE version supplies; response contracts differ per transport.

**[LOW] Prompts drift: direct prompts/list advertises a subject argument for diagnose_weak_spots that no implementation honours; direct tools/call also accepts two undocumented tool aliases**
- File: `src/services/mcpServer.ts`
- Evidence: SDK prompt diagnose_weak_spots (1859-1868) takes {} — no arguments. Direct prompts/list 2444-2450 advertises arguments:[{name:'subject', description:'Filter by NEET subject or All'}], and prompts/get (2459-2471) forwards it to renderPromptTemplate, whose diagnose_weak_spots branch (mcpExtensions.ts:625ff) calls diagnoseWeakSpots(state,{limit:8}) and never reads args.subject. Separately, direct tools/call 2481-2489 accepts tool names 'get_app_features' and 'get_features' that appear in neither tools/list nor the SDK server.
- Impact: Requesting a subject-filtered weak-spots prompt via HTTP silently yields the unfiltered diagnosis; and the direct endpoint's real surface is larger than its published tool list, so behaviour cannot be predicted from tools/list alone.

### MCP extensions (summaries, forecasts, weak spots) (`mcp-extensions`)

**[CRITICAL] Weak-spot diagnosis ranks every never-studied chapter (80/100) above genuinely decaying chapters**
- File: `src/services/mcpExtensions.ts`
- Evidence: L398 filters only !isArchived — no learningStage/lastStudiedDate guard. L416 confScore=(5-0)*8=40 for confidence 0; L419 retScore=(100-0)*0.3=30 because calculateMemoryRetention (spacedRepetition.ts L445-457) returns retentionPct 0 for any chapter with no lastStudiedDate; L425-431 adds 10 for all-missing pillars. Total 80/100, passing the >=35 gate at L435, and L442-443 assigns remediation 'High-yield NCERT reading + 50 chapter PYQs…'. Worked input: any never-opened chapter scores 80, while a genuinely studied chapter at confidence 2, 40% retention, 5 days overdue, all pillars done scores 24+18+10+0=52. In his real state 83 of 86 chapters are confidence 0 / never studied, so the top-10 list is filled entirely by unstudied chapters in storage order (ties at 80, L465 sort is stable).
- Impact: The 'weak spots' diagnosis he and any AI assistant act on is dominated by chapters he has never opened, ranked above chapters he learned and is actually forgetting. Following it means doing 'revision' remediation (50 PYQs, recall drills) on unlearned material while real decay goes unlisted, and totalWeakChaptersIdentified reports ~83 as if his whole syllabus were failing.

**[HIGH] Backup 'integrityChecksum' is counts plus a timestamp, and restore never verifies it**
- File: `src/services/mcpExtensions.ts`
- Evidence: L502-510: simpleHash = 'chk-' + chaptersCount + '-' + studyLogsCount + '-' + testsCount + '-' + now.toString(36) — the only inputs are three record counts and the export timestamp; no content of any chapter, log, test or score is hashed, and testScoresCount is not even included. L519 labels this 'integrityChecksum'. validateAndRestorePayload (L533-562) never reads payload.integrityChecksum, payload.version or payload.summary, so nothing on the restore side can detect a payload whose contents were altered, truncated inside an entry, or swapped for different records with identical counts.
- Impact: A corrupted or wrong backup passes as 'verified'. Two completely different study histories with 86 chapters / 21 logs / 49 tests produce the same checksum prefix, so the one safeguard that is supposed to protect his only syllabus/test record detects nothing.

**[HIGH] validateAndRestorePayload validates almost nothing yet returns success and 'ready for restoration'**
- File: `src/services/mcpExtensions.ts`
- Evidence: L538-545 checks only that payload is an object and data.chapters is an array. L547-550 silently coerces missing/malformed studyLogs, tests and testScores to [] and still returns success:true (L552-561). Chapter/log/test entries are never shape-checked (a chapters array of arbitrary non-objects passes), the currentState and mode parameters are used only to interpolate the message string (L554), and restoredCounts reports the coerced counts as if restoration-ready. The MCP caller (mcpServer.ts import_restore_data) trusts this success and writes the payload into live state.
- Impact: A chapters-only or partially garbled backup is 'validated' and can be merged/replaced into his live state, silently dropping or corrupting logs, tests and scores while the tool reports success with authoritative-looking counts. The function name promises a restore protocol; it performs almost no validation and no restore logic of its own.

**[HIGH] Mock-test postmortem can pair one test's name with a different test's score**
- File: `src/services/mcpExtensions.ts`
- Evidence: L660: test = find(t.id===testId) || state.tests?.[0] — an unknown or omitted testId silently substitutes the first test in storage order, not the most recent. L661: score = find(s.testId===test?.id) || state.testScores?.[0] — the two fallbacks are independent, so when the resolved test has no score, a different test's score is used. L663-665 then prints them as one record: `${test.name} … held on ${test.date}` with `Total Score: ${score.totalScore}/… Correct: ${score.correctQuestions}…`. With his real state (49 tests, 0 scores) any postmortem request without an exact testId analyses tests[0] as if it were the test he 'just completed' (prompt text L228 in the template, 'I just completed a NEET mock test').
- Impact: The postmortem handed to the AI can pair Test A's name/date with Test B's score, error taxonomy and question counts, generating a confident forensic analysis and 48-hour remedial plan for a test he did not take / a score he did not get — or for the oldest stored test instead of the latest mock.

**[HIGH] Daily summary fabricates 1 hour and a 'revision_round_complete' type per session while its own total counts 0**
- File: `src/services/mcpExtensions.ts`
- Evidence: L70 computes the day total with (l.hoursSpent || 0), but L78 maps each session to `hours: l.hoursSpent || 1` — the same log contributes 0 to studyHoursToday and a fabricated 1 hour to chaptersReviewedToday.hours (an explicit hoursSpent of 0 also becomes 1). L79 additionally fabricates the session type: (l.sessionType || 'revision_round_complete'), so a log with no recorded type is reported as a completed revision round. In his real server-state.json, 13 of 21 study logs have no hoursSpent at all.
- Impact: The daily summary — the MCP surface an AI reads to tell him what he did today — invents an hour for most of his real sessions and upgrades untyped sessions to 'revision_round_complete', and its per-session hours contradict its own headline total in the same payload.

**[HIGH] Daily summary can never report CRITICAL_LAG — worst pacing is downgraded to SLIGHT_LAG**
- File: `src/services/mcpExtensions.ts`
- Evidence: L151-155 maps the callee's paceStatus: AHEAD→AHEAD_OF_PACE, ON_TRACK→ON_TRACK, BEHIND→SLIGHT_LAG, and the else branch →CRITICAL_LAG. calculateSyllabusPacing's return type (spacedRepetition.ts, SyllabusPacingResult) only ever produces 'AHEAD' | 'ON_TRACK' | 'BEHIND', so the else branch is unreachable and CRITICAL_LAG can never be emitted; the worst real state is relabelled SLIGHT_LAG no matter how large the shortfall (the callee returns BEHIND for projectedDaysDelta <= -7 or velocity < 85% of required, with no magnitude distinction).
- Impact: His daily pacing runway systematically softens the worst case: being months behind the 31 Dec 2026 syllabus target is reported with the same 'SLIGHT_LAG' label as being a week behind, and the CRITICAL_LAG alarm the result type advertises does not exist.

**[MEDIUM] Decay forecast's unstudied test contradicts the retention engine, misclassifying chapters as 'critical' and diluting averages**
- File: `src/services/mcpExtensions.ts`
- Evidence: L291 uses AND: `if (!ch.lastStudiedDate && ch.currentConfidence === 0)` counts a chapter unstudied, but calculateMemoryRetention (spacedRepetition.ts L445) treats EITHER condition as unstudied and returns retentionPct 0 with decayStatus 'unstudied'. A chapter with a lastStudiedDate but confidence 0 (or confidence >0 but no date) therefore falls through: L297 studiedCount++, L298 adds 0 to every retention sum, and L304-306 `if safe … else if warning … else criticalCount++` files decayStatus 'unstudied' under criticalCount. Separately, L348 totalChaptersAnalyzed = chapters.length (including unstudied) while L339-343 average only over studiedCount, with no field disclosing the real denominator.
- Impact: Mixed-state chapters (e.g. confidence reset to 0, or imported/manual edits) are reported as critically decayed memories rather than unstudied, drag all five average-retention figures toward 0, and land in the danger/salvage lists; and every headline average silently excludes unstudied chapters while claiming to analyse the full set.

**[MEDIUM] Decay forecast ignores its daysAhead parameter — every horizon request returns the same 14-day danger list**
- File: `src/services/mcpExtensions.ts`
- Evidence: Signature L259-262 accepts options.daysAhead, and the MCP tool exposes it as a validated 1-90 day 'Projection horizon in days' defaulting to 30 (mcpServer.ts L1398-1402), but the function body never references daysAhead: projections are hardcoded to the callee's 7/14/30/60-day fields (L299-302), the danger list is hardcoded to projectedRetention14d (L309-319, field name projectedDangerWithin14Days), and the salvage sequence is derived from that same 14-day figure (L321).
- Impact: Requesting a 7-day or a 90-day forecast returns byte-identical horizons and the same 14-day danger list; anyone setting the horizon to plan the next week or the run-up to the exam is silently planning on a fixed 14-day window.

**[MEDIUM] Systemic weak-spot diagnosis is computed from the page-size-sliced list, not the actual weak count**
- File: `src/services/mcpExtensions.ts`
- Evidence: L467 slices scored to `limit` first; L473-477 then chooses systemicDiagnosis from highPriorityRemediations.length (the sliced length): >=8 → '3-day dedicated revision freeze', >=4 → 'Moderate weak clusters', otherwise 'healthy'. totalWeakChaptersIdentified (L482, the unsliced scored.length) is computed but not used for the diagnosis. With limit 5 the severe branch is mathematically unreachable; the prompt-template caller passes limit 8 (L625-627 diagnoseWeakSpots(state,{limit:8})), so its systemic verdict hinges on an arbitrary page size.
- Impact: The same syllabus can be diagnosed 'healthy', 'moderate' or 'revision freeze' purely by changing the limit argument, and the 7-day recovery protocol prompt is built on whichever verdict the page size happened to produce.

**[MEDIUM] Revision-plan prompt truncates the backlog in storage order before any worst-first sorting**
- File: `src/services/mcpExtensions.ts`
- Evidence: L580-586: overdue chapters are `.filter(overdue).slice(0, 8)` and due-today `.slice(0, 4)` in raw state.chapters order — no sort by days overdue or confidence (unlike computeDailySummary L105, which does sort), and everything past the 8th overdue chapter is dropped with no indication. The generated prompt then instructs (L616): 'Prioritize worst-first: attack high-weight, low-confidence overdue topics first' — but no chapter weight field exists in the Chapter type (types.ts L15-39) and the LLM is only given the arbitrary eight. L579 also defaults a missing/0 hoursAvailable to 4 hours.
- Impact: His revision plan can silently omit his most overdue chapters entirely (any beyond the first 8 in storage order) while claiming to be a worst-first, high-weight plan, so a generated day plan may spend the session on mild backlog and never mention the worst decay.

**[MEDIUM] Weekly audit window is 8 calendar days, not 7**
- File: `src/services/mcpExtensions.ts`
- Evidence: L754-757 and L763-767 both use getDaysDifference(date, today) with `diff >= 0 && diff <= 7`. getDaysDifference(a,b)=b-a in whole days (spacedRepetition.ts L58-68), so diff 0..7 inclusive spans 8 distinct calendar dates — today plus the seven preceding days — while the receipt labels it '7-day' / 'TESTS IN 7D WINDOW' (L884) / 'WEEKLY AUDIT'.
- Impact: Every weekly receipt over-counts by one day: a session exactly 7 days ago is counted in this week's receipt and again in the receipt generated that day, inflating sessions, chapters touched, tests and the discipline score at every boundary.

**[MEDIUM] Weekly receipt fabricates confidence 3/5 and 100% completion for logs that recorded neither, and mislabels stages**
- File: `src/services/mcpExtensions.ts`
- Evidence: L849 `confidence: l.confidenceRating || 3` prints a fabricated 3/5 for any log whose rating is 0/missing; L850 defaults a missing completionPercentage to 100, presenting partial/progress sessions as fully complete. L836 stage logic checks `l.revisionNumber <= 1` before the revision branch (L838), so a log with sessionType 'revision_round_complete' and revisionNumber 1 is labelled '1ST PASS'; L839 emits `REV ${revisionNumber - 1}` unpadded, contradicting the interface's declared 'REV 01'/'REV 02' formats (L725).
- Impact: The itemized receipt — his durable per-session record — invents a mid confidence rating and 100% completion where none was recorded, and mislabels first revisions as first passes, so the audit history cannot be trusted to reconstruct what he actually did.

**[MEDIUM] Weekly test 'accuracy' uses two different denominators depending on which fields exist**
- File: `src/services/mcpExtensions.ts`
- Evidence: L774-780: when score.totalQuestions is present, accuracy = correctQuestions/totalQuestions*100 (L776) — a denominator that includes unattempted questions; when totalQuestions is absent, the fallback branch (L778) uses correct/(correct+incorrect)*100. Same underlying performance (e.g. 90 correct, 30 incorrect, 60 unattempted of 180) yields 50% under the first branch and 75% under the second.
- Impact: The weekly receipt's per-test 'accuracy' changes meaning depending on which optional fields happen to be filled in, understating attempt accuracy by counting unattempted questions as inaccurate whenever totalQuestions was recorded.

**[MEDIUM] Discipline rating awards 55/100 for a week with zero study sessions**
- File: `src/services/mcpExtensions.ts`
- Evidence: L858 activity component uses raw logs.length, so 7 sessions logged in a single day earn the full 40 points reserved for a week of work. L859 gives 25 of 30 test points when weekTests.length===0 (nothing scheduled). L860 gives the full 30 decay points whenever criticalDecayChapters is empty — and unstudied chapters are never 'critical' (retention engine returns 'unstudied'), so a completely idle week in his current state scores 0 + 25 + 30 = 55/100.
- Impact: The 'OFFICIAL WEEKLY AUDIT' discipline score reports a mid-range rating for a week with zero study, and can be maxed on activity by binge-logging one day — a number presented as measuring the week's discipline that measures neither spread of effort nor, in the no-tests case, any test behaviour at all.

**[MEDIUM] Weekly receipt's rescuedDecayCount is hardcoded to 0**
- File: `src/services/mcpExtensions.ts`
- Evidence: Return object L899-904 sets `rescuedDecayCount: 0` as a literal constant; no code in the function counts rescued chapters, even though the field is declared in WeeklyAuditReceiptResult (L708) alongside genuinely computed counts. A suitable helper, getDecayPreventedStats, exists in spacedRepetition.ts (L522-563) and is not called.
- Impact: Every weekly receipt reports that zero chapters were rescued from decay, however many revisions actually pulled chapters back from critical — a permanently false zero in the record he reviews to judge whether revision is working.

**[MEDIUM] Daily productivity verdict is gated on hoursSpent thresholds his logs mostly don't carry**
- File: `src/services/mcpExtensions.ts`
- Evidence: L158-161: EXEMPLARY_DEEP_WORK requires studyHoursToday >= 6 and the hours route to GOAL_MET requires >= 3.5; the only non-hours route is >= 3 sessions. studyHoursToday (L70) sums hoursSpent, which is absent on 13 of his 21 real logs, so it is ~0 on typical days regardless of rounds completed: a day with 2 full revision rounds and no hours fields is graded PROGRESS_RECORDED, and EXEMPLARY_DEEP_WORK is effectively unreachable from his real logging. L172/181/192 also attach invented recommendedHours constants (2.5/1.5/2.0) to the top-priority chapter based only on a confidence threshold.
- Impact: The daily verdict systematically under-grades his actual days and cannot recognise a strong day, because it is gated on an hours field his workflow does not populate — decisions nudged by 'NO_ACTIVITY_YET / PROGRESS_RECORDED' verdicts are based on missing data, not on his revision rounds.

**[MEDIUM] Panoramic status hardcodes avgScore 0 for every subject and its rank buckets silently drop confidence-5 chapters**
- File: `src/services/mcpExtensions.ts`
- Evidence: subjectsBreakdown hardcodes `avgScore: 0` for all five subjects (L982, L988, L994, L1000, L1006) despite the interface declaring avgScore per subject (L936-940) and confidence data being available on every chapter. ranksDistribution (L1009-1016): S = pinkCount, which requires confidence>=5 AND revisionCount>=3 (L957), while A counts only confidence===4 — so a confidence-5 chapter with 0-2 revisions falls into no bucket at all, and S+A+B+C+D+F sums to less than totalChapters with no remainder shown. nonPinkTargetChapters (L1017) is nonPink.slice(0,20) in storage order, unsorted by confidence or recency.
- Impact: The panoramic radar reports a fabricated 0 average score for every subject, its rank distribution silently drops exactly the near-apex confidence-5 chapters it should celebrate/track, and its 'targets requiring remediation' list is an arbitrary first-20 rather than the weakest chapters.

**[LOW] Daily top-priority pick is unsorted storage order for due-today and 'unstarted' chapters**
- File: `src/services/mcpExtensions.ts`
- Evidence: Overdue branch correctly sorts by urgencyScore (L105) and takes overdue[0] (L166), but the due-today branch takes dueToday[0] (L175) — raw allChapters order, no sort by confidence or any other criterion. The fallback branch comment (L184) claims 'Recommend unstarted chapter with highest NEET weight', but L185 is a plain find() for the first NOT_STARTED / 0%-complete chapter and no weight field exists on Chapter (types.ts L15-39).
- Impact: When nothing is overdue, the single 'top priority' recommendation he is handed is whichever chapter happens to sit first in storage order — a confidence-5 chapter due today beats a confidence-1 chapter due today, and the 'highest NEET weight' claim is fiction.

**[LOW] ASCII receipt fabricates a 23:59:59 timestamp and hardcodes '86-CHAPTER CHASSIS'**
- File: `src/services/mcpExtensions.ts`
- Evidence: L879 prints `DATE: ${today} 23:59:59 IST` regardless of the actual generation time, and L881 prints the constant 'TERMINAL: #001 (86-CHAPTER CHASSIS)' even though computePanoramicMatrixStatus/total chapter counts are derived from state and archived chapters are excluded elsewhere (e.g. L83, L264) — the chassis number never reflects archived/added chapters. The receipt presents both under an 'OFFICIAL WEEKLY AUDIT RECEIPT' header (L876).
- Impact: The receipt he keeps as his weekly record carries a fabricated end-of-day timestamp and a hardcoded syllabus size; if chapters are ever archived or added, the printed record misstates the scope it audited.

**[LOW] Streak grace day applies only to today, so historical daily summaries report 0 for a live streak**
- File: `src/services/mcpExtensions.ts`
- Evidence: L120-125: the one-day grace (fall back to yesterday when today has no log) is applied only `if (!studyDates.has(checkDate) && isToday)`. For any historical dateStr, if that exact date has no log the while loop at L127 never runs and activeStreakDays returns 0, even when a multi-day streak ended the day before the queried date.
- Impact: Asking the daily summary about yesterday (or any past date) on a rest day reports a 0-day streak where the same query for today would report the preserved streak — inconsistent history for the same underlying logs.

### McpModal UI (`mcp-modal`)

**[CRITICAL] Playground executes fabricated example data against the live database with no confirmation**
- File: `src/components/McpModal.tsx`
- Evidence: McpModal.tsx:214 pre-fills add_test_score with {testId: firstTest, totalScore: 650, physicsScore: 165, chemistryScore: 160, botanyScore: 165, zoologyScore: 160}; :196 pre-fills log_study_session with a fabricated session (chapterId: firstCh, confidenceRating: 4, hoursSpent: 1.5, 'Active recall formula drill'); :205 invents 'NEET Grand Mock 08'; :207-208 pre-fills delete_test with {testId: firstTest}; :189-190 pre-fills import_restore_data. executePlaygroundTool (~:245-330) POSTs straight to /api/mcp with no confirmation — grep for confirm/window.confirm in the file returns zero hits. These are live-DB writes, not a sandbox.
- Impact: One exploratory click on RUN TOOL writes an invented 650/720 score onto his first real mock, logs a study session he never did (advancing its SM-2 nextRevisionDate), creates a fake test, deletes his first real test, or merges a restore — silently corrupting the revision/test record he plans from, with no undo offered in the modal.


## 7. Numbers that mislead — analytics, pacing & the feature manifest

### AnalyticsDashboard (`analytics`)

**[HIGH] Pillar Matrix search crashes the whole app: .toLowerCase() called on numeric clusterId**
- File: `src/components/AnalyticsDashboard.tsx:155`
- Evidence: Line 155: `const matchUnit = (c.clusterId || '').toLowerCase().includes(q);` runs for every chapter whenever pillarSearch is non-empty. But clusterId is a number: src/types.ts:20 `clusterId: number; // 1 to 16`, all 86 chapters in data/server-state.json have integer clusterId, and src/services/firebase.ts:183 normalises it with `Number(ch.clusterId)`. For any real chapter, (5 || '') is the number 5, and (5).toLowerCase is not a function -> TypeError thrown inside the useMemo/filter during render. There is no ErrorBoundary/componentDidCatch anywhere in src, and package.json build is plain `vite build` (no tsc), so the type error ships. Secondary: even if it did not crash, the 'unit' search only ever matches the numeric cluster id string, never c.clusterName, despite the placeholder 'Search chapter or unit...' (line ~497).
- Impact: Typing a single character into the Pillar Matrix search box crashes the entire app to a blank screen (state is in-memory, so only a reload recovers). A core navigation aid on the analytics tab is 100% broken with his real data.
- Also found independently by: types-model

**[HIGH] 'High Priority Focus (& Overdue)' list includes due-today/due-soon chapters and labels them 'Overdue by N days'**
- File: `src/components/AnalyticsDashboard.tsx:226,812`
- Evidence: Line 226: criticalRiskChapters keeps chapters whose status is 'overdue' OR 'due_today' OR 'due_soon' (due_soon = nextRevisionDate 1-2 days in the future, per getChapterRevisionInfo in spacedRepetition.ts). The section heading (line ~773) reads 'High Priority Focus (Confidence <= 2 & Overdue)' with the description 'past their scheduled revision date', and every row's badge at line 812 unconditionally renders `Overdue by {Math.abs(info.daysDiff)} days`. A chapter due in 2 days (daysDiff +2) is therefore printed as 'Overdue by 2 days'; a chapter due today prints 'Overdue by 0 days'.
- Impact: Weak chapters that are not yet due are presented as already overdue, inflating the urgent count and distorting which revisions he prioritises today; genuinely overdue and merely upcoming chapters are indistinguishable in the list.

**[MEDIUM] Overdue urgency badge colour is defeated by Math.abs() before calling the signed-days tier function**
- File: `src/components/AnalyticsDashboard.tsx:799`
- Evidence: Line 799: `const overdueTier = getOverdueDaysTier(Math.abs(info.daysDiff));`. getOverdueDaysTier (src/utils/confidenceColor.ts) is written for a SIGNED diff: negative values are overdue (>=5 days -> Tier 1 crimson, >=2 -> Tier 2 orange), positive values are future-due (<=3 -> Tier 4 blue, else Tier 0 gray). Passing Math.abs destroys the sign, so a chapter 10 days overdue gets Tier 0 (gray/inactive) and one 1-3 days overdue gets Tier 4 (blue, the 'due soon' colour). No overdue chapter can ever receive the red/orange urgency colours.
- Impact: The urgency colour coding on the highest-priority list is inverted-to-neutral: the most overdue weak chapters look the least alarming, undermining the visual triage the section exists for.

**[MEDIUM] Subject 'trajectory' trend is not time-based at all and fabricates 'Steady' with insufficient data**
- File: `src/components/AnalyticsDashboard.tsx:181-213,709`
- Evidence: Line 181 comment claims 'confidence delta over recent study logs (last 7 days)', but lines 185-207 contain no date comparison at all: logs are sorted by timestamp and split as recent = slice(0,3) vs older = slice(3,8), however old those logs are (weeks/months apart counts the same as days). If a subject has only 2-3 logs total, `older` is empty, the delta block is skipped, and the card renders 'Steady' (line ~713) even if confidence fell 5 -> 1 across those logs. The stored delta is also stripped of sign (line 213: `trendDelta: Math.abs(trendDelta)`) and the down badge at line 709 renders the unsigned number with only a small arrow to convey direction.
- Impact: The 'Confidence Trajectories' arrows on every subject card can claim improvement/decline based on arbitrarily old logs, or claim 'Steady' when there is no baseline to compare against — fabricated trend signals on the mastery view he uses to judge subject health.

**[MEDIUM] Subject average confidence excludes unstudied chapters and is rounded up into an inflated mastery tier**
- File: `src/components/AnalyticsDashboard.tsx:169-174,692`
- Evidence: Lines 169-174: avgConfidence is averaged only over chapters with currentConfidence > 0 (`studied`), excluding all unstudied chapters from the denominator. Line 692 then colours/labels it via getConfidenceTier(Math.round(sm.avgConfidence)), rounding 4.5 up to Tier 5. Worked example: a subject with 22 chapters where exactly one is studied at L5 shows the headline '5.0 / 5.0 Scale (Mastered (Peak))' in violet; one chapter at L4 with the rest untouched shows '4.0 (Strong (High))'. The coverage count is printed smaller underneath, but the headline number and tier label describe only the studied subset.
- Impact: Subject Mastery cards systematically overstate mastery early in preparation — exactly when most chapters are unstudied — presenting peak/strong labels for subjects that are 95% untouched.

**[MEDIUM] Pillar Matrix '% DONE' badge is not pillar completion — it contradicts the pillar checkboxes in the same row**
- File: `src/components/AnalyticsDashboard.tsx:565,592`
- Evidence: Line 565: `const pct = ch.completionPercentage || 0;` and line 592 renders it as a '{pct}% DONE' badge on each Pillar Matrix row, next to the five pillar checkboxes. completionPercentage is first-pass study completion (set from log session type/percentage in spacedRepetition.ts, including a fabricated 25% default for merely-studied chapters), not a function of the five pillar flags displayed beside it — while the same file's ALL_DONE logic (lines 142, ~568) is computed purely from the pillar flags. A row can therefore read '100% DONE' with the Anki checkbox empty, or '25% DONE' with all five pillars ticked.
- Impact: Inside a matrix whose entire purpose is pillar completeness, the % DONE badge measures a different thing than the checkboxes next to it, so he cannot trust the badge to tell him which chapters have actually completed all five pillars.

**[LOW] Dashboard accepts pacing/test-score props from App but never uses them**
- File: `src/components/AnalyticsDashboard.tsx:28-45`
- Evidence: The props interface (lines 28-36) declares testScores, pacingSettings, onUpdatePacingSettings and onNavigateToStrategy, and App.tsx:824-836 passes all of them (testScores, pacingSettings, an onUpdatePacingSettings that writes back into app state, and a strategy navigation callback). But the component destructures only chapters, studyLogs, tests and onOpenQuickLogForChapter (lines 40-45); none of the other four props is referenced anywhere in the 839 lines, and no pacing or test-score section is rendered.
- Impact: Wiring exists end-to-end for pacing/test analytics on the Analytics tab that silently does nothing — dead surface area that looks supported in the code and props but produces no UI.

### Pacing flight plan (`pacing`)

**[HIGH] Revision cadence credits zero already-done revisions and ignores revision load compounding during the 1st-pass phase**
- File: `src/services/spacedRepetition.ts`
- Evidence: spacedRepetition.ts:686-687: totalRevisionOperationsNeeded = totalChapters * targetRevisionPasses (86*3 = 258) divided only by weeksFromSyllabusTargetToExam. revisionCount, studyLogs and revisions already completed are never consulted, and the function's own gap system (3/7/14/30 days, lines 11-13) means chapters finished in Oct-Nov fall due for revision well before 31 Dec. Simultaneously required1stPassVelocityPerWeek (664) counts only new chapters, so due revisions in the same pre-deadline weeks add zero to the stated weekly load.
- Impact: Both phases are misstated: the post-deadline revision pace is overstated by however many passes he has already banked, while the pre-deadline weekly target understates total work by ignoring revision load that compounds as more chapters finish. He plans his weeks from these two numbers.

**[HIGH] Revision velocity is anchored to the target syllabus date, not the projected completion date**
- File: `src/services/spacedRepetition.ts`
- Evidence: spacedRepetition.ts:682-687 anchors the revision window to safeSettings.targetSyllabusDate, never to projectedCompletionDate (675). Defaults: 31 Dec 2026 to 2 May 2027 = 122 days = 17.4 wks, so 258/17.4 = 14.8 revs/wk is displayed. If his projected finish slips to 28 Feb 2027, the real window is 63 days = 9 wks and the true requirement is 28.7 revs/wk — the plan still shows 14.8.
- Impact: Exactly when he falls behind on 1st pass, the displayed revision requirement is understated by up to ~2x, so the catch-up plan he acts on cannot actually fit 3 revision passes before the exam.

**[HIGH] Projected completion date is fabricated from a hardcoded 1.5 ch/wk fallback when no pace exists**
- File: `src/services/spacedRepetition.ts`
- Evidence: spacedRepetition.ts:669-675: measuredWeeklyPace may be 0, but 'actualWeeklyVelocity = measuredWeeklyPace > 0.1 ? ... : 1.5 // realistic fallback 1.5 ch/wk', and projectedCompletionDate is derived from it. With 0 chapters completed on 2026-10-30, remaining 86 / (1.5/7 per day) = 401 days, projecting completion ~5 Dec 2027. SyllabusPacingFlightPlan.tsx:314 prints that date as 'Projected 100%' with no indication the velocity is invented.
- Impact: A user with zero measured pace is shown a concrete projected finish date and pace status computed from a fabricated 1.5 ch/wk, instead of 'no pace measured yet'. Early planning decisions rest on a number that comes from nowhere.

**[HIGH] Actual velocity takes the maximum of recent and lifetime pace, counts future completions, and never decays a stale pace**
- File: `src/services/spacedRepetition.ts`
- Evidence: spacedRepetition.ts:669 takes Math.max(recentWeeklyPace, activeWeeklyPace) — always the more optimistic. 650-653: recent completions filter is only firstPassCompletedDate >= thirtyDaysAgo, with no <= todayStr bound, so future-dated completions count. 656: activeStudyDays = Math.max(7, diff(earliestStudyDate, today)); a future-dated earliest log (e.g. 2027-01-01) makes the diff negative, clamps the denominator to 7 days, and turns 21 completions into a 21 ch/wk 'pace'. Conversely a chapter set completed by March with nothing since still yields activeWeeklyPace ~0.7/wk in October, and max() projects forward at that stale pace despite 7 months of zero completions.
- Impact: Projected completion, pace status and pace delta are systematically biased early and can be wildly inflated by a single future-dated log or startedDate, telling him he is on/ahead of pace when he is not.

**[HIGH] studyDaysPerWeek is loaded, never used in any pacing maths, and silently reset to 7 on save**
- File: `src/components/SyllabusPacingFlightPlan.tsx`
- Evidence: spacedRepetition.ts:598 loads studyDaysPerWeek into safeSettings and never references it again; required1stPassVelocityPerDay (665) divides by calendar days. SyllabusPacingFlightPlan.tsx:73-82 handleSaveSettings hardcodes studyDaysPerWeek: 7 on every save, silently overwriting any other stored value, and the edit form offers no control for it (nor for targetMockTestsCount, preserved only via '|| 25', line 79). Example: at 5 study days/week with 62 chapters in 62 calendar days, the code states 1.0 ch/day; the true per-study-day requirement is 62 / (62*5/7) = 1.4 ch/day.
- Impact: The setting is dead: anyone who sets studyDaysPerWeek below 7 (other settings paths accept 1-7) gets per-day requirements understated by up to 40%, and merely saving deadline edits in this component destroys the stored value back to 7.

**[HIGH] Past deadlines and inverted date ranges are silently clamped to 1 day instead of flagged**
- File: `src/services/spacedRepetition.ts`
- Evidence: spacedRepetition.ts:660 daysUntilSyllabusTarget = Math.max(1, diff) — 1 day overdue and 100 days overdue both clamp to 1, so 20 remaining chapters show 140 ch/wk in both cases with no OVERDUE state (paceStatus has only AHEAD/ON_TRACK/BEHIND, 697). 682: if targetSyllabusDate is set after targetExamDate, daysFromSyllabusTargetToExam clamps to 1 and requiredRevisionPassVelocityPerWeek becomes 258/0.143 ≈ 1806 revs/wk. SyllabusPacingFlightPlan.tsx:145-190 date inputs and handleSaveSettings (73-82) perform no ordering/past-date validation.
- Impact: A missed deadline or one swapped/typo'd date produces absurd velocities with no signal that the dates themselves are invalid or the deadline has passed, so he cannot distinguish 'work harder' from 'this plan is broken'.

**[HIGH] Burn-up trajectory fabricates a linear 'actual' history and the chart discards the projected curve**
- File: `src/services/spacedRepetition.ts`
- Evidence: spacedRepetition.ts:731-743: for past points, actual = Math.round(completed1stPassCount * (daysOffset / elapsedDays)) — a linear interpolation from the hardcoded 2026-01-01 baseline, ignoring each chapter's real firstPassCompletedDate. If all 30 completions happened in October, the June point still shows ~18 completed. The function computes a 'projected' field for future points (738-743), but SyllabusPacingFlightPlan.tsx:365,381,389 render only p.actual — which the service sets to the flat completed count for future dates — so the chart's line goes flat to December and the projection is never drawn, despite the header claiming 'Ideal Target Line vs Actual Completed 1st-Pass Velocity' (lines 333-345).
- Impact: The burn-up chart presents invented, evenly-spread history as his actual progress and hides the projection it claims to show; judging whether his pace is accelerating or stalling from this chart is impossible.

**[MEDIUM] Trajectory chart hardcodes 86 chapters while totalChapters is dynamic**
- File: `src/components/SyllabusPacingFlightPlan.tsx`
- Evidence: SyllabusPacingFlightPlan.tsx:333 '(86 Chapters Target)', 345 'Actual Progress ({completed}/86)', 365/381/389/390 all divide p.actual by the literal 86. But spacedRepetition.ts:602 sets totalChapters = activeChapters.length || 86, which changes when chapters are archived/added. With 6 archived (total 80), a fully complete 80 maps to y = 110 - (80/86)*100 = 17, never reaching the top of the chart, and the label still reads /86; with total > 86 the y goes negative and points render off-chart. The '|| 86' also fabricates an 86-chapter syllabus when zero active chapters exist.
- Impact: The chart's scale and labels contradict the pacing numbers beside it whenever the active chapter count is not exactly 86.

**[MEDIUM] paceDeltaChapters is not measured against the ideal curve its label claims**
- File: `src/services/spacedRepetition.ts`
- Evidence: spacedRepetition.ts:709-711: paceDeltaChapters = Math.round(projectedDaysDelta * actualDailyVelocity). SyllabusPacingFlightPlan.tsx:309-310 labels it 'ch vs ideal curve'. Worked example, 2026-10-30: baseline window 1 Jan-31 Dec = 364 days, elapsed 302, ideal target = 86*302/364 = 71 chapters; with 50 completed the true ideal-curve delta is -21. At an actual pace of 0.5 ch/day the code instead gives projected delta -10 days x 0.5 = -5 chapters.
- Impact: The headline delta can understate how far behind the ideal curve he is by 4x, and it changes when his velocity changes even if his position versus the ideal curve is identical — it is not the quantity its label claims.

**[MEDIUM] Pace status can read ON_TRACK while the projected finish is after the deadline**
- File: `src/services/spacedRepetition.ts`
- Evidence: spacedRepetition.ts:700-706: AHEAD needs projectedDaysDelta >= 7, BEHIND needs <= -7 OR velocity < 0.85x required, everything else is ON_TRACK. Example: 20 chapters left, 14 days to deadline (required 10/wk), actual 9/wk — daysNeeded rounds to 16, projected finish 2 days after the target, delta -2 and ratio 0.9, so status = ON_TRACK. SyllabusPacingFlightPlan.tsx:~300-314 renders '✓ On Target Pace' on the same card as that post-deadline projected date.
- Impact: The status badge can certify 'On Target Pace' while the projected completion date printed next to it is already after the deadline, so the at-a-glance signal contradicts the detail on the same card.

**[LOW] Progress bars misattribute 1st-pass progress to revision and floor completion at 10%**
- File: `src/components/SyllabusPacingFlightPlan.tsx`
- Evidence: SyllabusPacingFlightPlan.tsx:240 computes revCompPct from completed1stPassCount/totalChapters and 260 uses it as the progress bar inside the 'Revision Cadence' card — it is 1st-pass completion, not revision progress. Line 319: the Trajectory Status bar width is Math.min(100, Math.max(10, completionPercentage)), so at 0% completion the bar still renders 10% full.
- Impact: Two bars on the primary pacing view misrepresent what they measure: revision progress appears to advance with 1st-pass work, and an untouched syllabus still shows a tenth-full trajectory bar.

### StrategicFlightHub (`flight-hub`)

**[HIGH] 'Revision Runway' is the fixed target-to-exam calendar gap, not the runway left after his projected finish**
- File: `src/components/StrategicFlightHub.tsx:351-365,555`
- Evidence: Hub lines 351-365 display Math.round(pacing.weeksFromSyllabusTargetToExam) as 'Revision Runway' weeks and pacing.daysFromSyllabusTargetToExam in the on-schedule text at line 555 ('to guarantee 17 weeks (122 days) of dedicated review runway'). That value in spacedRepetition.ts is computed solely as getDaysDifference(targetSyllabusDate, targetExamDate) (2026-12-31 -> 2027-05-02 = 122 days) and never subtracts slippage in projectedCompletionDate. Input that breaks it: projected finish slips to 2027-03-02 (60 days late) — real runway is 61 days, the hub still prints 17 weeks.
- Impact: He plans his 3 revision passes against a runway that does not shrink when he falls behind — the worse the slip, the more wrong the number, with no warning on the card.

**[HIGH] Required revision velocity charges all 3 passes for every chapter and credits zero revisions already completed**
- File: `src/components/StrategicFlightHub.tsx:365`
- Evidence: spacedRepetition.ts:686-687: totalRevisionOperationsNeeded = totalChapters * targetRevisionPasses (86*3=258) and requiredRevisionPassVelocityPerWeek = 258 / weeksFromSyllabusTargetToExam (~14.8 rev/wk), with no subtraction of revision rounds already logged. Hub line 365 prints it as the required 'rev/wk'. Every first-pass-completed chapter already carries revisionCount>=1 (applyStudyLogToChapter sets revisionCount to at least 1 on first_pass_complete), yet it is still charged the full 3 passes.
- Impact: The required revision cadence is systematically overstated and never improves as he actually revises, so the strategy page tells him the revision phase is harder than it is and gives no credit for revision work already done.

**[HIGH] The 25-mock-test goal is invisible and uneditable in the strategy hub**
- File: `src/components/StrategicFlightHub.tsx:47-48,68,159-176,221-283`
- Evidence: Props tests/testScores are only forwarded into calculateSyllabusPacing (lines 47-48, 76); grep confirms no pacing.testsCompletedCount / testsRemainingCount / requiredTestFrequencyDays / totalTestsPlanned is ever rendered, although spacedRepetition.ts computes all of them. The Adjust Targets form (lines 221-283) contains only syllabus date, exam date and revision passes: editIncludeTests state exists (line 68) and is written on save (line 167) but has no control in the form, and handleSaveSettings line 166 preserves targetMockTestsCount only via 'pacingSettings.targetMockTestsCount || 25' (a stored 0 is rewritten to 25) with no editor for it.
- Impact: The hub named 'Syllabus Flight Plan & Cadence Engine' gives him no signal on whether his 25-mock target is on pace (e.g. 0 of 25 done with 100 days to exam) and no way to change that target or the include-all-tests flag from the settings panel that claims to configure targets.

**[HIGH] Advisory panel redefines BEHIND and contradicts the pacing cards above it**
- File: `src/components/StrategicFlightHub.tsx:416-470`
- Evidence: Line 416: const isPacingBehind = pacing.paceStatus === 'BEHIND' || pacing.projectedDaysDelta < 0. In spacedRepetition.ts paceStatus is BEHIND only when projectedDaysDelta <= -7 or velocity < 0.85x required, and ON_TRACK for a delta of -1..-6. The top cards colour by getPaceTier(pacing.paceStatus) (blue = ON_TRACK) while the advisory section keyed on isPacingBehind renders a pulsing red 'PACING ADVISORY // BEHIND SCHEDULE' header and 'Behind by N Days' badge. Input that breaks it: projected finish 3 days after 2026-12-31 — card 2 says ON_TRACK/blue, the advisory directly below says BEHIND/red for the same numbers. Conversely every non-behind state, including paceStatus AHEAD, is labelled 'ON SCHEDULE'.
- Impact: Two contradictory verdicts on the same screen for the same projection; he cannot tell whether a small slip is 'on track' (ignore) or 'action required' (intervene).

**[HIGH] Invented 1.5 ch/wk fallback velocity is presented as his measured current velocity and drives the projected finish date**
- File: `src/components/StrategicFlightHub.tsx:496,520-522,543`
- Evidence: spacedRepetition.ts:670: actualWeeklyVelocity falls back to a hardcoded 1.5 when measuredWeeklyPace <= 0.1 ('realistic fallback 1.5 ch/wk'). Hub lines 496 and 543 state it as fact — 'At your current velocity of {pacing.actualWeeklyVelocity} chapters/week, you will finish all {total} chapters on {projectedCompletionDate}' — and lines 520-522 repeat it as 'At Current Rate / projected at 1.5 ch/wk', with the behind/ahead verdict and recovery directive all derived from it. There is no 'no data yet' state anywhere in the file.
- Impact: With zero chapters ever completed he is shown a precise projected finish date, a days-ahead/behind verdict and a recovery directive computed from a velocity nobody measured — fabricated pacing he may plan months around.

**[MEDIUM] Recovery milestone date can fall after the syllabus deadline it claims to get him back on schedule for**
- File: `src/components/StrategicFlightHub.tsx:422-423,502-516`
- Evidence: Line 422: const recoveryDays = Math.min(30, Math.max(7, pacing.daysUntilSyllabusTarget)); line 423 recoveryDate = addDaysToDateStr(todayStr, recoveryDays). daysUntilSyllabusTarget is clamped to a minimum of 1 in spacedRepetition.ts, so with 1-6 days left (or the target already passed) recoveryDays is forced to 7 and recoveryDate lands after targetSyllabusDate — yet line 510 still instructs: complete N chapters before {recoveryDate} 'to get back on schedule for your {targetSyllabusDate} 1st-pass target'.
- Impact: In the final week before the 31 Dec deadline — exactly when the directive matters most — the recovery milestone points past the deadline and following it cannot restore the schedule it claims to restore.

**[MEDIUM] Memory Decay Alert card declares 'All Safe' when zero chapters are safe or studied**
- File: `src/components/StrategicFlightHub.tsx:378-395`
- Evidence: Lines 378-392: decayTier = criticalCount>0 ? TIERS[1] : warningCount>0 ? TIERS[2] : TIERS[4], and the badge is criticalCount>0 ? 'N Critical' : 'All Safe'. Input that breaks it: fresh/unstudied state — safeCount 0, warningCount 0, criticalCount 0, unstudiedCount 86 — renders the Strong (tier 4, blue) card with badge 'All Safe' over a big '0 / 86 safe'. The badge also reads 'All Safe' whenever warnings exist but no criticals.
- Impact: The decay alert certifies safety in precisely the state where nothing has been studied or retained, hiding total non-coverage behind a reassuring label.

**[MEDIUM] Unstudied chapters have no filter, wear the safe badge styling, and are offered a 'Revise' button**
- File: `src/components/StrategicFlightHub.tsx:688-700,727-760`
- Evidence: The status filter array (line ~688) offers only ALL/CRITICAL/WARNING/SAFE — unstudied chapters (decayStatus 'unstudied', retentionPct 0 from calculateMemoryRetention) appear only inside ALL. Their status badge at lines 727-737 uses the same else-branch styling as 'safe' (bg-[#141416] text-[#FAF9F6]), the row prints '0% Retention' for material never learned, shows 'Last Studied: Never', and the action button at the row end is labelled 'Revise' for a chapter never studied once.
- Impact: Never-started chapters are visually indistinguishable from safe ones in the risk matrix and cannot be isolated by any filter, so the biggest risk class (not yet started) is the least visible one.

**[MEDIUM] Worst-first decay lists and decay-prevented stats are computed, sorted, and then never rendered**
- File: `src/components/StrategicFlightHub.tsx:94-123,660-670`
- Evidence: Lines 96-104 build criticalList and warningList sorted ascending by retentionPct, and line 112 computes decayPrevented via getDecayPreventedStats; all three are returned at lines 119-122 and never referenced again (grep: no JSX usage). The matrix renders memoryDecayAnalytics.filtered in original chapter order inside a max-h-[460px] scroll box, so the lowest-retention chapters are not surfaced first in the default ALL view.
- Impact: The prioritisation the code already computes is thrown away: to find his most-forgotten chapter he must manually filter or scroll 86 rows, and the 'decay prevented / rescued chapters' statistic is never shown anywhere.

**[MEDIUM] Settings drawer edits go stale and Save silently overwrites fields it does not display**
- File: `src/components/StrategicFlightHub.tsx:64-68,159-176`
- Evidence: Edit fields are initialised once from props at lines 65-68 (useState(pacingSettings...)) and the file contains no useEffect, so reopening the drawer after settings changed elsewhere (or after a cancelled edit) shows stale/unsaved values instead of the saved ones. handleSaveSettings (lines 159-176) hardcodes studyDaysPerWeek: 7, silently discarding any other stored value, and writes includeAllTestsGoal from editIncludeTests, a state variable with no rendered control, so an invisible stale boolean can be persisted over his real setting.
- Impact: Saving an unrelated date change can silently reset studyDaysPerWeek and flip the include-all-tests goal to a value he never chose or saw, and the form cannot be trusted to show his current targets.

**[MEDIUM] No validation that the exam date is after the syllabus date — a typo produces thousand-per-week revision demands**
- File: `src/components/StrategicFlightHub.tsx:225-250,365`
- Evidence: The two date inputs (lines ~231 and ~244) carry only 'required'; there is no check that targetSyllabusDate precedes targetExamDate before handleSaveSettings persists them. spacedRepetition.ts then clamps daysFromSyllabusTargetToExam with Math.max(1, negative diff) and weeks to 0.1, so an exam date on/before the syllabus date yields requiredRevisionPassVelocityPerWeek = 86*3 / 0.14 ≈ 1,800+ rev/wk, which line 365 prints without any error or warning.
- Impact: One transposed date produces absurd, authoritative-looking runway and revision-velocity numbers instead of a validation error, and those settings persist to every other pacing consumer.

**[MEDIUM] Header advertises 'burn-up milestone projections' that the component never renders**
- File: `src/components/StrategicFlightHub.tsx:182-187`
- Evidence: Line 185 subtitle promises 'Real-time syllabus completion velocity, burn-up milestone projections, and memory retention half-life.' calculateSyllabusPacing returns trajectoryPoints (the burn-up series) but grep confirms the hub never reads pacing.trajectoryPoints and renders no chart of any kind — only a single projectedCompletionDate string.
- Impact: A headline feature of the strategy page does not exist on it; he gets one projected date with no burn-up curve to judge whether the trajectory is bending toward or away from the target.

**[LOW] Subject strip fabricates a chapter: a subject with no chapters shows '0 / 1 Chapters Done'**
- File: `src/components/StrategicFlightHub.tsx:129-143,640-650`
- Evidence: Line 138: const total = subChs.length || 1; rendered at line 645 as '{completed} / {sub.total} Chapters Done'. A subject with zero chapters in the data displays '0 / 1 Chapters Done' and 0%. It also conflicts with the header metrics on the same screen, where pacing falls back to totalChapters = 86 when the active list is empty (spacedRepetition.ts) while the strip's four subjects sum to 4.
- Impact: Fabricated denominators make a missing/empty subject look like a real 0-of-1 backlog and make the page's own chapter totals disagree with each other.

**[LOW] Current Velocity progress bar has a fabricated 10% floor at zero completion**
- File: `src/components/StrategicFlightHub.tsx:342`
- Evidence: Line 342 (Current Velocity card): style width uses Math.min(100, Math.max(10, pacing.completionPercentage)), so at 0% completion the bar still renders 10% filled. The adjacent 1st Pass card (line ~312) uses the raw pacing.completionPercentage with no floor, so the two bars on the same row disagree at low completion.
- Impact: Visual progress is fabricated at exactly the early stage where an honest zero matters, and the inconsistency between neighbouring bars undermines trust in both.

### Consistency & revision heatmaps (`heatmaps`)

**[HIGH] Consistency % is divided by ~360 pre-tracking days, so the headline discipline number is structurally near-zero**
- File: `src/components/ConsistencyHeatmap.tsx`
- Evidence: Lines 202-204: elapsedDays = allDays.filter(d => !d.isFuture).length (358-364 days of the fixed 52-week grid, lines 74-77) and consistencyPct = activeDays / elapsedDays. The grid always spans the trailing 364 days regardless of when he started using the app. His real history begins 2026-10-29 (app built/committed then); on 2026-10-30 even a perfect record of studying every day since day one yields roughly 2/360 = ~1%, and a flawless full month caps at ~8%. The result is rendered as the headline badge '{consistencyPercentage}% Consistency' (lines 294-296), and the footer at line 560 claims '364-Day Consistency Grid (Zero Inactive Skew)' — the opposite of what the maths does: every day before he ever opened the app is counted as an inactive day.
- Impact: The one number that summarises his daily discipline — the thing this component exists to show — reads as near-total failure no matter how consistently he studies for the first ~11 months. He will either distrust the app or be demoralised by a fabricated 1-8% score; any pacing decision based on it is based on a wrong denominator.

**[HIGH] 'Sessions Logged' and 'Active Days' are silently 364-day window figures presented as lifetime totals**
- File: `src/components/ConsistencyHeatmap.tsx`
- Evidence: Lines 145-148: activeDays and totalLogsCount are only incremented inside the loop over the 364 grid days (lines 85-156), i.e. only for logs whose dateStudied falls inside the window. Logs older than startSunday (today minus ~363 days) are never counted. The values are then displayed with unqualified total-sounding labels: 'Sessions / {totalSessions} Logged' (lines 337-341) and 'Active Days / {activeDaysCount} Days' (lines 328-333). Nothing in the UI says 'last 52 weeks'.
- Impact: Once his prep crosses the one-year mark (his exam is 2 May 2027 and the window already reaches back to Nov 2025), real logged sessions silently fall off the totals — the counters will appear to shrink/stagnate while he keeps studying, and any log from before the window is invisible in this view with no indication it was excluded.

**[HIGH] A future-dated log vanishes completely: muted cell, no hover, excluded from every stat**
- File: `src/components/ConsistencyHeatmap.tsx`
- Evidence: getDayCellStyle checks day.isFuture first (lines 227-229) and returns the disabled style regardless of day.count, so a future day containing logs looks identical to an empty future day. Hover is suppressed for future days (lines 518-521), so the inspector can never reveal the logs. Stats exclude them too: line 145 requires !isFuture for activeDays/totalLogsCount, and both streak scans ignore/break at future days (lines 174, 191-207). Only the native title tooltip (line 527) betrays the count. A single mis-tap in the QuickLog date picker (or a backdated-clock correction) that lands a log tomorrow makes that session disappear from the grid, streaks, sessions total and consistency with no warning anywhere.
- Impact: Silent data invisibility on the core loop: he logs a session, the heatmap shows nothing, streaks don't move, and there is no UI path in this component to discover the log exists. It reads as 'my log was lost' and can break a streak display even though the data is intact.

**[MEDIUM] Current Streak and Best Streak are computed over different windows, so Best can display lower than Current**
- File: `src/components/ConsistencyHeatmap.tsx`
- Evidence: longestStreak is scanned only over allDays, the 364 grid cells (lines 173-184), so it is capped at the number of non-future days in the window (~358-364) and any streak that began before the window is truncated. currentStreak instead scans the raw logsByDate map backwards from today with guard = 365 (lines 187-208), counting days outside the grid. Example: studying every day for 400 days ending today gives Current Streak ~365 but Best Streak ~360, rendered side by side (lines 308-325) — a self-contradicting telemetry bar. Conversely a personal-best streak that ended just before the window start is invisible and Best Streak understates his record.
- Impact: The two flagship streak numbers can visibly disagree (Best < Current), undermining trust in both, and the 'Best Streak' he uses to judge his record is silently window-capped rather than his actual best.

**[MEDIUM] Selecting a subject filter silently re-scopes every headline stat while the labels stay unqualified**
- File: `src/components/ConsistencyHeatmap.tsx`
- Evidence: The useMemo recomputes weeks, streaks, totalSessions, activeDaysCount and consistencyPercentage from subject-filtered logs (lines 84-90 filter, 145-148 counting, 173-208 streaks, 202-204 percentage; dependency on selectedSubject at line 210). The rendered labels never change: the badge still reads '{consistencyPercentage}% Consistency' (lines 294-296) and the telemetry still reads 'Current Streak', 'Best Streak', 'Active Days', 'Sessions' (lines 311-343) with no 'Physics only' qualifier. With Physics selected, a 12-day all-subject streak can display as e.g. 'Current Streak 3 Days' and 90% consistency as 25%, with only the small filter button's highlight state hinting why.
- Impact: He can read per-subject numbers as his overall discipline numbers (or vice versa) and act on them — e.g. concluding his streak broke when he merely filtered to a subject he didn't study yesterday. The numbers are correct for the filter but the labels he relies on lie about their scope.

### WeeklyAuditModal (`weekly-audit`)

**[HIGH] The '7-day' window is actually 8 days — every weekly count is inflated**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L67-71 weekLogs: `const diff = getDaysDifference(l.dateStudied, todayStr); return diff >= 0 && diff <= 7;` — diff 0..7 inclusive is 8 distinct calendar dates. The identical `diff >= 0 && diff <= 7` filter is repeated for weekTests (L83-85), score-pulled tests (L91-92) and weekScores (L125-127), while the UI stamps it '7-Day Cycle Ending' / '7-Day Window' and the clipboard 'PAST 7 DAYS'. Example: opened 2026-10-30, a log dated 2026-10-23 (diff=7) is counted as this week.
- Impact: Session count, topics touched, discipline score, test list and negative-bleed all silently include an extra day every week, so week-on-week comparisons and the printed 'weekly proof' receipt are systematically overstated and not comparable to a true 7-day week.

**[HIGH] 'Decay Saved' on the weekly receipt is an all-time cumulative count, not this week's rescues**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L141: `const { totalSavedCount } = getDecayPreventedStats(chapters, studyLogs);` — called with the entire log history and no date argument. In spacedRepetition.ts getDecayPreventedStats iterates every pair of logs per chapter (gap >= 7 or confidence jump) with no week filter. The value is then displayed in the 7-day telemetry strip as '+{totalSavedCount} Revisions rescued' (L554-556) and on the clipboard receipt as 'MEMORY RETENTION RESCUES: +N SAVED' (L284).
- Impact: A rescue from months ago is re-credited to every subsequent weekly receipt forever; the number can only grow and tells him nothing about whether he rescued anything this week, yet it sits in the weekly telemetry strip as if it were this week's performance.

**[HIGH] Negative-bleed maths contradicts itself on the same receipt: headline is incorrect-question count, breakdown is errors × 5**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L149-150: `weekNegativeMarks += s.incorrectQuestions || 0;` — a question count, then labelled '-{weekNegativeMarks} PTS' (clipboard L286), '-{weekNegativeMarks} Marks Lost' (L899) and 'Marks lost to slips' (L576-577). The breakdown directly below multiplies a different input by 5: clipboard L287-289 `-{weekSillyMistakes * 5} pts`, `-{weekConceptualGaps * 5} pts`, `-{weekMemoryRecall * 5} pts` (same ×5 in UI L907, L912, L917). Example: 20 incorrect questions with errors 5/5/5 gives headline '-20 PTS' and subtotals -25-25-25 = -75 on the same receipt — the parts sum to nearly 4× the total, and neither figure is derived from the other (errors are entered independently of incorrectQuestions in LogScoreModal).
- Impact: The receipt he keeps as weekly proof contains two irreconcilable 'marks lost' figures. He cannot tell whether he bled 20 or 75 marks, and any week-on-week error trend built on these numbers is meaningless.

**[HIGH] 'Accuracy' is computed as correct ÷ total questions, not correct ÷ attempted — understated whenever anything is unattempted**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L178-182 getScoreAccuracy: `if (s.totalQuestions && s.totalQuestions > 0 && s.correctQuestions !== undefined) { return Math.round((s.correctQuestions / s.totalQuestions) * 100); }` — the primary branch divides by all questions including unattempted; only the fallback branch (L183-186) correctly divides by correct+incorrect (attempted). Example: 100 correct, 20 incorrect, 60 unattempted, totalQuestions=180 → receipt shows 56% Acc; attempted accuracy is 83%. Shown in both the UI test cards and clipboard 'ACC: %' (L240-242).
- Impact: Almost every real NEET mock has unattempted questions, so the displayed accuracy is systematically depressed and conflates 'didn't attempt' with 'attempted and missed' — exactly the distinction his attempt strategy decisions depend on.

**[HIGH] Week-test cards use the first score ever recorded for a test, with no date filter or recency sort**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L101-110: `const score = testScores.find((s) => s.testId === t.id); ... isLogged: !!score` — no dateRecorded window check and no sort by timestamp, so with multiple scores for one testId the array-order first (oldest persisted) wins, and a score recorded outside the week still marks the test logged and supplies its numbers. Compounding it, L90-99 pulls tests into the '7-Day Window' purely because a score was recorded this week, but L104 `daysAgo = getDaysDifference(t.date, todayStr)` can then be 30-60, and the card/receipt prints e.g. '(2026-09-01 · 45d ago)' inside a section headed 'in 7-Day Window' — or a negative '-3d ago' for a future-dated test with an early-entered score.
- Impact: The weekly test radar can present a stale/earlier score as this week's result, count a test as logged on the strength of an out-of-window score, and display out-of-window tests under a 7-day label — corrupting the test section of the receipt and the discipline score's all-logged check that depends on isLogged.

**[HIGH] Discipline score rewards session volume in a single day and gives near-full test credit for taking no test**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L191-198: score = `(weekLogs.length >= 7 ? 40 : (weekLogs.length / 7) * 40) + (weekTests.length > 0 && weekTests.every(t => t.isLogged) ? 30 : weekTests.length === 0 ? 25 : 10) + (criticalDecayChapters.length === 0 ? 30 : max(0, 30 - critical*5))`, rendered as 'COMPOSITE WEEKLY DISCIPLINE LEVEL … Score: N/100 · Protocol: Strict Consistency' (L980-987) under 'STATUS: OFFICIAL VERIFIED' (L541). weekLogs.length counts sessions, not distinct study days — 7 sessions logged on one day earn the full 40 consistency points. A week with zero tests scores 25/30 on the test component, while a week with one real test whose score isn't yet entered scores only 10/30.
- Impact: The headline grade on his weekly receipt can read A/S-tier for a single binge day, and penalises a week where he actually sat a test more than a week where he sat none — a fabricated, gameable 'discipline' verdict presented as certified.

**[MEDIUM] Error forensics silently drops two of the five recorded error categories (time pressure, wild guessing)**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L149-156 sums only `errors.sillyMistakes`, `errors.conceptualGaps`, `errors.memoryRecall`; the forensics section renders exactly three cards (L903-919) and the clipboard ERRORS line prints only those three (L251). But ErrorBreakdown in types.ts also defines timePressure and guessingWild, LogScoreModal records both (global and per-subject), and TestManager displays both. A week whose dominant failure is timePressure=12, guessingWild=4 shows all-zero/omitted forensics here.
- Impact: If his real problem in a mock was rushing or guessing, the weekly audit's diagnostic section and its strategic directives point him at silly/concept/recall fixes instead — the recorded cause of the lost marks is invisible in the one document meant to diagnose the week.

**[MEDIUM] Standardised round label stamps partial revision work and revision-type logs as '1ST PASS'**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L160-168 getStandardRoundLabel: first branch `if (log.sessionType === 'first_pass_complete' || log.sessionType === 'progress' || log.revisionNumber <= 1) return '1ST PASS';` runs before the revision branch, so (a) any 'progress' log is '1ST PASS' regardless of the chapter's stage — and applyStudyLogToChapter (spacedRepetition.ts L265) forces revisionNumber=0 for every progress log, including progress sessions on a chapter already in revision — and (b) a 'revision_round_complete' log with revisionNumber <= 1 is pre-empted into '1ST PASS', making the second branch's `revNum … : 1` fallback dead code. The label is used identically in the on-screen ledger (L785) and clipboard ledger (L272).
- Impact: His itemised weekly ledger — the proof of what stage each session was — under-reports revision work: revision-phase sessions are printed as first-pass sessions, so the receipt misstates the first-pass vs revision mix he is pacing against his 3-pass target.

**[MEDIUM] Receipt fabricates values for missing fields: confidence becomes L3, coverage becomes 100%, clipboard max score becomes 'undefined'**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: L273/L827: `` `L${l.confidenceRating || 3}` `` / `★ L{log.confidenceRating || 3}` — a missing/0 confidence is printed as a confident L3. L275/L787: `log.completionPercentage !== undefined ? … : '100%'` — a log with no recorded coverage is printed as 100% covered. Clipboard L242 prints `${s.totalScore}/${s.maxScore}` with no fallback while the percentage helper (L174) and UI (L716) use `s.maxScore || 720`, so a score lacking maxScore copies as e.g. '650/undefined' at a percentage computed against 720.
- Impact: Imported, MCP-created or older logs with sparse fields are presented on an 'OFFICIAL VERIFIED' receipt with invented confidence and full coverage, and the copied text version can contain a literal 'undefined' denominator — the exported proof does not match the underlying record.

**[MEDIUM] Ledger loses the identity of sessions whose chapter was deleted or renamed, ignoring the log's own snapshot**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: StudyLog itself stores chapterName and subject snapshots (types.ts L46-48), but the ledger never reads them: L79 builds chapterMap only from the current chapters prop, and rows render `ch?.name || 'Syllabus Chapter'` (L783-800 UI) / `(ch?.name || 'Unknown Chapter')` and subject fallback 'TOP' (L269-271 clipboard). The session still counts toward weekLogs.length and weekUniqueChapters even when its chapter no longer exists.
- Impact: Delete or rename a chapter and that week's receipt still charges the sessions to the totals but can no longer say what was studied — the itemised ledger degenerates to repeated 'Syllabus Chapter / TOP' rows, and the UI and clipboard versions don't even agree on the placeholder name.

**[MEDIUM] Receipt stamps false fixed metadata: two different receipt numbers for one receipt, a fabricated 23:59:59 time, and a hard-coded 86-chapter chassis**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: On-screen receipt number is `#REC-7D-${todayStr}` (L540) while the clipboard copy of the same receipt says `#REC-WK7-${todayStr}-NEET` (L222) — the two exports of one audit carry different IDs. Both stamp `DATE: {todayStr} 23:59:59 IST` (L221, and the on-screen header) regardless of the actual time the audit was generated. Terminal/chassis is hard-coded '86-CHAPTER CHASSIS' (L223) / '86-Chapter Mastery Engine' (L532) irrespective of chapters.length or how many chapters are archived.
- Impact: The artefact he keeps/shares as weekly proof is not self-consistent: the PNG/print and the copied text disagree on the receipt's own identifier, claim an end-of-day generation time that may be hours false, and certify a chassis size the code never checks.

**[LOW] Copy-to-clipboard fails silently, and the early return between hooks is a latent crash**
- File: `src/components/WeeklyAuditModal.tsx`
- Evidence: (1) L302-305: `navigator.clipboard.writeText(txt).then(() => { setCopiedReceipt(true); … })` — no .catch; on a non-secure context navigator.clipboard is undefined (synchronous throw) and on permission denial the promise rejects unhandled, so Copy appears to do nothing with no error shown. handleDownloadImage (L413-417) likewise only console.errors on failure. (2) L59-62 declare useState hooks then `if (!isOpen) return null;` before all useMemo hooks at L67+, violating hook order for any mount where isOpen toggles in place; it is currently masked only because App.tsx L947 mounts the component conditionally with isOpen already true.
- Impact: The receipt's main sharing action can silently no-op precisely when he tries to save his weekly proof, and the hooks violation will crash the modal with a React hook-order error if the mounting pattern ever changes.


## 8. The matrix & the lists


## 8. The matrix & the lists

### ShadowArmyMatrix, first half (`shadow-1`)

**[HIGH] Whole-test score is copied onto every linked chapter as if it were that chapter's own test performance**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Lines 948-988: linkedCompletedTests = tests where linkedChapterIds includes ch.id and date <= today; percent per test is (s.totalScore / totalMarks) * 100 (line 968) — the score for the entire test — averaged and stored as this chapter's linkedTestAveragePercent, then converted to testPerformanceFactor -150..+150 in masteryScore (line 1018). TestScore.subjectScores/bySubject exists in types.ts but is never used here. Seed data (data/seedData.ts) links full-syllabus tests to FULL_SYLLABUS_IDS = all 86 chapter ids.
- Impact: One 85%+ full mock adds +150 to every started chapter regardless of how he did in that chapter, and one 30% mock subtracts 150 from all of them. Per-chapter ranks, the displayed linked-test average, and revision priorities move on evidence that says nothing about the individual chapter.

**[HIGH] Test percentage uses Test.totalMarks and ignores TestScore.maxScore, with no clamping**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Lines 955-968: const s = testScores.find(sc => sc.testId === t.id); const totalMarks = t.totalMarks || 720; return (s.totalScore / totalMarks) * 100. The TestScore record's own maxScore field (types.ts: TestScore.maxScore) is never read, and the result is never clamped to 0-100 before averaging at line 975.
- Impact: Wherever the two denominators diverge (test edited after scoring, chapter test scored out of a different maximum, imported/MCP score), the percent is silently wrong: e.g. totalScore 80 with maxScore 100 on a test whose totalMarks is 720 computes 11% (-150 factor) instead of 80% (+100) — a 250-point mastery swing. A totalScore above totalMarks yields >100% and inflates the average.

**[HIGH] Global syllabus pace adds or subtracts 20 points from every chapter, using hardcoded pacing settings this component never receives**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Line 892: calculateSyllabusPacing(chapters, studyLogs, tests, testScores, undefined, todayStr) — pacingSettings is passed as literal undefined, and ShadowArmyMatrixProps (lines ~753-761) has no pacingSettings prop; App.tsx lines 716-724 does not pass appState.pacingSettings. The engine therefore falls back to its defaults (2026-12-31 syllabus / 2027-05-02 exam). Lines 1012-1018: pacingVelocityBonus = +20 if AHEAD, -20 if BEHIND, 0 otherwise, added identically to every chapter's totalPoints.
- Impact: If he changes his syllabus target date in Settings, the Matrix keeps judging pace against the hardcoded date, so its AHEAD/BEHIND verdict can contradict the Flight Plan. The resulting +/-20 is applied to untouched and mastered chapters alike and can by itself push a borderline chapter across the 880/700/500 score gates, changing its rank for a reason unrelated to that chapter.

**[HIGH] Matrix overrides the spaced-repetition engine's overdue verdict if the chapter was touched within 2 days — and any future-dated log cancels overdue indefinitely**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Lines 997-1001: isOverdueResolved = info.status !== 'overdue' || getDaysDifference(effectiveLastStudied, todayStr) <= 2 || (same check on ch.lastStudiedDate) || effectiveLastStudied >= nextRevisionDate. Lines 1003-1006 award overduePenalty only if !isOverdueResolved, and lines 1080-1088 only set status OVERDUE if !isOverdueResolved. getChapterRevisionInfo in spacedRepetition.ts uses a stricter <=1 day recency rule, so the two engines disagree at exactly 2 days. getDaysDifference returns a negative number for a future lastStudiedDate, which also satisfies <= 2.
- Impact: Example: revision due yesterday, last studied 2 days ago (the study that preceded the due date, under a 1-day configured gap) — the engine says overdue, the Matrix says resolved: no penalty, status 'Up to Date', chapter disappears from urgent lists. A mistyped/backfilled log dated in the future suppresses overdue for that chapter until 2 days after that future date.

**[HIGH] todayStr is frozen at mount, so due/overdue/test eligibility silently go stale while the page stays open**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Line 888: const todayStr = useMemo(() => getTodayStr(), []); — computed once with empty deps and never refreshed. It feeds getChapterRevisionInfo (line 900), linked test eligibility t.date <= todayStr (line 949), overdue resolution (lines 997-1001), DUE_TODAY status (line 1083), and calculateSyllabusPacing (line 892). There is no timer, focus, or date-change listener in lines 1-1950.
- Impact: Leave the Matrix open overnight and nothing rolls over: a chapter due today never becomes DUE_TODAY, overdue penalties never accrue, and a test taken today is not counted — all displayed as if it were still yesterday, with no indication the date is stale, until the component happens to remount.

**[MEDIUM] Memory-recall error penalty stacks per test with no cap, despite the breakdown contract declaring 0 to 40 points**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Interface lines 359-365 declare recallErrorPenalty: '0 to 40 pts'. Line 965, inside the per-test map: recallErrorPenalty += Math.min(40, (s.errors.memoryRecall - 2) * 10) — the 40 cap is per test, and no overall cap is applied before line 1018 subtracts recallErrorPenalty from totalPoints.
- Impact: Four linked tests each with memoryRecall = 6 produce a 160-point penalty — four times the documented maximum and larger than the entire testPerformanceFactor range's negative end. Mastery scores and ranks for heavily tested chapters are dragged far below what the component's own published formula promises.

**[MEDIUM] High self-confidence alone erases a test's memory-recall errors, with no revision after the test required**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Lines 959-966: if s.errors.memoryRecall > 2, isResolvedByRevision = (effectiveLastStudied && effectiveLastStudied >= t.date) || conf >= 4; the penalty is skipped if either is true. The comment at line 960 states this explicitly: 'OR user has high confidence (>=4), the error is resolved!' conf is the chapter's current self-rating (line 938), which may predate the test entirely.
- Impact: A chapter he rated 4-5 before a mock, never restudied afterwards, and then forgot facts in during that mock (memoryRecall errors) carries zero recall penalty. Objective test evidence of forgetting is overridden by the subjective rating the test was supposed to check.

**[MEDIUM] Test average is an unweighted mean of percentages across tests of wildly different sizes, with a 100-point cliff at 55%**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Lines 975-988: avgPct is the plain arithmetic mean of per-test percentages, then a step function: >=85 +150, >=70 +100, >=55 +40, >=40 -60, else -150. There is no neutral band and no weighting by totalMarks, question count, or recency.
- Impact: A 20-mark quiz at 100% and a 720-mark mock at 50% average to 75% (+100) even though the combined real performance is ~54%. At the boundary, 54.9% average scores -60 while 55.0% scores +40 — a 100-point mastery swing, potentially a full rank, on a 0.1% difference.

**[MEDIUM] A-rank is awarded with zero test validation although its own profile claims high mock scores**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: CHAPTER_RANKS.A explanation (line 102): 'Mock test scores high and spaced intervals maintained.' Rank gate lines 1041-1048 allows linkedTestAveragePercent === null (no scored linked test at all). Arithmetic from the same code: comp 100 (350) + rev 2 (220) + conf 4 (165) + pacing +20 = 755, which passes the >=700 gate with testPerformanceFactor 0.
- Impact: A chapter never validated in any test displays as 'Superior Orbit / Deep Mastery' with copy asserting its mock scores are high. He can trust an A tile as exam-verified when nothing has verified it.

**[MEDIUM] 'Latest log' is chosen by timestamp, not by dateStudied or maximum value, and drives last-studied, revision count and confidence fallback**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Lines 904-912: latestLog = chapterLogs sorted by b.timestamp - a.timestamp, [0]; effectiveLastStudied = latestLog?.dateStudied || ch.lastStudiedDate (line 907, preferring the log over the chapter field); effectiveRevisionCount = Math.max(ch.revisionCount || 0, latestLog?.revisionNumber || 0) (line 912) — only that single log is consulted, never the maximum revisionNumber across all logs; effectiveConfidence = ch.currentConfidence ?? latestLog?.confidenceRating ?? 0 (line 911), and currentConfidence is a required number in types.ts so the log fallback is dead whenever the chapter field exists, however stale.
- Impact: Backfilling an old session today (new timestamp, dateStudied weeks ago, revisionNumber 0) makes it 'latest': daysSinceLastStudied (line 908), the DUE_TODAY gate (line 1083) and recall/overdue resolution all use the old date instead of his real most recent study. A higher revision round recorded in an earlier log is invisible if the chapter field was reset or synced lower.

**[MEDIUM] Chapter numbers are the global array index, not per-subject syllabus numbers — poster codes and ordering renumber silently**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Line 1096: chapterNumber: idx + 1, where idx is the index in chapters.filter(!isArchived) in whatever order the parent array happens to be. Line 596 (canvas export): code = sub.code[0] + chapterNumber padded — so the first Chemistry chapter prints 'C32', not C01. Lines 1308 and 1319 sort filtered/grouped lists by this index while claiming (line ~1295 comment) 'ALWAYS strictly in NCERT syllabus sequence'.
- Impact: Archiving one early chapter shifts every later chapter's number by one; a custom chapter appended at the end or a sync merge that reorders the array renumbers/reorders the whole matrix and any printed poster, with no stable identifier tying a number to a chapter. The numbers look like official per-subject positions (P01..P31 happen to match only because seed order is grouped) but are not.

**[MEDIUM] Header and celebration banner claim 97 chapters; the syllabus, poster footer and the app's own totals say 86**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Line 1762: 'All 97 Syllabus Chapters'. Line 1395 (globalProgressionTier ALL_S): '100% ALL 97 CHAPTERS S-RANK ASCENDED'. Line 683 (same file's poster): 'ALL 86 CHAPTERS HOT PINK S-RANK'. Seed data defines 86 chapters (Physics 31 + Chemistry 22 + Botany 18 + Zoology 15), and all percentages in this file use the dynamic analyzedChapters length, not 97.
- Impact: The headline he reads every day overstates his syllabus by 11 phantom chapters, and the file contradicts itself (97 in the header, 86 on the poster). Percentages are computed on the real total, so the '97' is pure misinformation about the size of the job.

**[MEDIUM] Exported poster labels the S-rank achieved count as 'UNCOVERED', inverting its meaning**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Lines 438-441 in exportPanoramicCanvas: pct = sCount/totalCount*100; fillText(`UNCOVERED: ${sCount} / ${totalCount} APEX PINK TILES (${pct}%)`). sCount is the number of chapters that HAVE reached S-rank (overallStats.sCount, passed by handleDownloadPoster/handlePrintPoster).
- Impact: At 0 S-rank the poster reads 'UNCOVERED: 0 / 86 (0%)' (sounding finished) and at full mastery 'UNCOVERED: 86 / 86 (100%)' (sounding untouched). Anyone reading the printed/exported poster — including him at a glance — gets the remaining-work signal exactly backwards.

**[LOW] Non-integer confidence produces NaN mastery that poisons the syllabus average**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Lines 937-940: conf = Math.min(5, Math.max(0, effectiveConfidence)) — clamped but never rounded to an integer; confidencePoints = confidenceTable[conf] with confidenceTable = [0,30,70,120,165,200]. For conf = 3.5 the index is undefined, so confidencePoints is undefined, totalPoints (line 1018) becomes NaN, and masteryScore = Math.max(0, Math.min(1000, NaN)) is NaN. getConfidenceTier(conf) at line 1092 in the same function does round, showing the inconsistency. overallStats avgScore (lines 1137-1138) sums masteryScore, so one NaN chapter makes the syllabus mean NaN.
- Impact: Any confidence value that arrives non-integer (import, sync merge, MCP write — the type is just 'number') silently turns that chapter's score into NaN, drops it through every rank comparison, and renders the headline 'Mastery Depth' average as NaN instead of a number.

**[LOW] Chapters with no classLevel are silently counted as Class 11 in the Class 11 vs 12 statistics**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Line 1177: class11Items = analyzedChapters.filter(c => c.chapter.classLevel === '11' || !c.chapter.classLevel); line 1178 counts Class 12 only on exact '12'. classLevel is optional in types.ts (classLevel?: '11' | '12').
- Impact: Every custom/added chapter without a class level inflates the Class 11 count and drags the Class 11 average mastery (line 1179), so the 11-vs-12 comparison he uses to judge where he is weak is skewed by unclassified chapters he never assigned to Class 11.

### ShadowArmyMatrix, second half (`shadow-2`)

**[HIGH] Analytics header hardcodes '97 Chapters Evaluated' — the syllabus has 86, and the same file's poster modal says 86**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: L2538 renders the literal text '97 Chapters Evaluated' above the rank distribution. L3526 in the poster modal renders the literal '86 Chapters'. seedData.ts INITIAL_CHAPTERS is 31 Physics + 22 Chemistry + 18 Botany + 15 Zoology = 86 chapters, and overallStats.total (L1129) is computed dynamically from analyzedChapters.length and is used correctly elsewhere on the same screen (L2554 '{readyCount} / {overallStats.total}').
- Impact: The Curriculum Analytics header — the section he reads for pacing/readiness — states a chapter total 11 higher than his real syllabus, contradicting the poster snapshot and every dynamic count on the same page. Any mental maths he does off '97' (e.g. completion share) is wrong.

**[HIGH] Past tests he never took are displayed as 'Completed' attempts 'Held on' their scheduled date**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: pastTestsForInspected (L1614-1628) selects every linked test with t.date < todayStr — the comment even calls them 'Past Tests Completed' — with no check that a TestScore exists. In the drawer (L3032 'Past Exam Attempts & Results', L3042-3063) each such test is labelled 'Held on: {t.date}' and, when score is undefined, gets the badge 'Completed' (L3055-3061) instead of 'No score recorded'.
- Impact: A linked Allen mock that was scheduled but never attempted (or whose score was never entered) silently becomes a completed exam attempt in the chapter's history the day after its date. His per-chapter test record — part of his test truth — fabricates attempts that never happened.

**[HIGH] Codex 'How do I reach Grade S' recipe is mathematically impossible — it omits the mandatory mock-test points**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Codex guide tab L3444-3449 lists exactly four steps: 100% coverage, at least 3 revision sessions, confidence 5, never overdue. Following them yields at most 350 (coverage) + 260 (revision points at exactly 3 rounds: 120+100+40 per L931-935) + 200 (confidence) + 20 (pacing, L1012-1013) = 830 pts — and even with 4+ revisions (300 pts) only 870. Rank S requires masteryScore >= 880 (L1032-1040), reachable only via a linked mock-test factor (+100/+150, which also requires linkedTestAveragePercent >= 75 when tests exist). No test step appears in the guide.
- Impact: He can execute the published S-rank strategy perfectly on a chapter and still land at Grade A with no explanation anywhere in the guide. The missing ingredient — a linked mock test averaging >=75% — is the decisive one, and the guide sends him to revise more instead.

**[MEDIUM] Inspection drawer's Status card claims 'Zero Penalties' while the same drawer lists penalties**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: L2845: the Status card sublabel is `{isOverdueResolved ? 'Zero Penalties' : 'Review Needed'}` — it never looks at the penalty amounts. But isOverdueResolved is true whenever info.status !== 'overdue' (L997-1001), and a due-today chapter not yet studied today still gets overduePenalty = 10 (L1006-1008), shown in the breakdown at L2923-2928; a recallErrorPenalty > 0 (shown L2910-2917) is likewise ignored by the card.
- Impact: For a due-today chapter (or one with a diagnostic recall penalty) the modal simultaneously says 'Zero Penalties' in the metrics grid and '-10 pts' / '-N pts' in its own breakdown. He cannot tell from the headline card whether a chapter is actually penalty-free.

**[MEDIUM] Score breakdown rows do not sum to the displayed mastery score — the 0/1000 clamp is never shown**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: The score is clamped: masteryScore = Math.max(0, Math.min(1000, totalPoints)) at L1017-1019, where the raw maximum is 350+300+200+150+20 = 1020 and the raw minimum is below 0. The breakdown panel (header L2866-2871 shows '{masteryScore} pts'; rows L2885-2945 list coverage, revision, confidence, test factor, recall penalty, overdue penalty, pacing bonus) prints the unclamped components with no clamp/adjustment line.
- Impact: A maxed chapter shows components adding to 1,020 pts under a '1,000 pts' header (a floored chapter similarly hides up to ~350 pts of penalties). The panel is presented as a transparent formula ('Dynamic Mastery Points Breakdown') but its arithmetic visibly does not reconcile, undermining trust in every other number in the drawer.

**[MEDIUM] Codex formula tab misstates the revision and mock-test point bands the code actually uses**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: L3397: '120 pts for 1st round, 100 pts for 2nd round, up to 80 pts for 3rd+ rounds' — the code (L934) adds Math.min(80, (rev-2)*40) total for rounds 3+, i.e. the 3rd round adds only 40 pts and 80 is reached only at the 4th round. L3407: mock tests 'Scoring >=85% validates exam mastery (+150 pts). Sub-par scores deduct points' — the code (L979-987) awards +100 at 70-84% and +40 at 55-69%, and deducts only below 55% (-60 at 40-54%, -150 below 40%).
- Impact: The in-app documentation of the scoring system — the only explanation he has — overstates what a 3rd revision earns and tells him a 70% mock score costs points when it actually adds 100. Planning revision counts and interpreting score jumps from the Codex leads to wrong expectations.

**[MEDIUM] Panoramic view declares an empty (filtered-out) subject '100% PINK APEX'**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: Both panoramic footers test only colSCount === colTotal with no non-empty guard: quad L2262-2270 and mosaic/4col L2355-2363 render '★ 100% PINK APEX' when true. col items come from filteredChapters (L2084-2117), so any search/rank/status filter that empties a subject gives colTotal = 0 and colSCount = 0, satisfying 0 === 0 — while colReadyPct on the same footer is computed as 0% (guarded division), so the panel reads '0% Exam Ready' and '100% PINK APEX' simultaneously. The standard view guards the equivalent badge with totalSubjectChapters > 0 (L1345).
- Impact: Searching e.g. 'Thermodynamics' makes Botany and Zoology panels — containing zero chapters — celebrate total S-rank conquest. A glance at the panoramic radar during filtered review reports subjects as fully mastered when they are merely hidden.

**[MEDIUM] Panoramic 'Mosaic' and '4-Column' layouts are the same layout — the 3-way cycle button has only 2 real layouts**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: The cycle button (L2158-2169) promises 'Mosaic -> 4-Column -> 2x2 Quad' with distinct icons/titles per state. But mosaic and 4col share a single render branch (the ternary at L2209 only special-cases 'quad'), and the container class ternary at L2280-2283 returns the identical string 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3' for both values; the inner tile grid classes are fixed regardless of layout. Nothing in the rendered output changes between mosaic and 4col.
- Impact: A presented view control does nothing for one of its three stops: clicking from Mosaic to 4-Column changes only the button's icon/tooltip. If he prefers a denser 4-column arrangement he cannot get it, and the control's state label lies about what is on screen.

**[MEDIUM] Subject 'Average' and 'Exam Ready %' are silently computed over the filtered subset, not the subject**
- File: `src/components/ShadowArmyMatrix.tsx`
- Evidence: subjectGroups builds items from filteredChapters and computes avgScore over only those items (L1317-1322); the standard header then prints '{group.subject} ({group.items.length} Chapters)' (L2431) and 'Average: {group.avgScore} / 1000' (L2494) alongside unfiltered figures (sRankCount/totalSubjectChapters). The panoramic panels do the same: colAvg (L2292) and colReadyPct (L2229-2231, L2295) are computed over filtered col.items yet labelled 'Avg: X / 1000' and '% Exam Ready'.
- Impact: With any filter active — e.g. Grade S selected, or searching one chapter — each subject's displayed average becomes the average of just the visible chapters (filtering to S makes every subject 'average' ~900+/1000). The numbers are presented as subject-level truth with no 'filtered' marker, so a filtered glance inflates his sense of subject mastery.

### ChapterList (`chapter-list`)

**[HIGH] Confidence filter is dead: confidenceFilter is missing from the filteredChapters useMemo dependencies**
- File: `src/components/ChapterList.tsx:122,163,419-435`
- Evidence: L122 uses confidenceFilter inside filteredChapters: 'if (confidenceFilter !== "All" && (c.currentConfidence || 0) !== confidenceFilter) return false', but the useMemo dependency array at L163 is [chapters, selectedSubject, selectedClass, stageFilter, searchQuery, sortOption, tests, todayStr] — confidenceFilter is absent. Clicking a ★1-★5/★0 button (L419-435) changes only confidenceFilter, so React does not recompute the memo and the list does not change until some other filter/search/sort happens to change.
- Impact: He clicks e.g. ★1 to find his weakest chapters and sees the unfiltered list, believing those are all his ★1 chapters. A presented, clickable filter silently does nothing.

**[HIGH] Same row shows three different progress percentages, two of them fabricated (100% badge, 30% bar, 0% telemetry)**
- File: `src/components/ChapterList.tsx:785,855-859,901`
- Evidence: For an IN_PROGRESS chapter whose stored completionPercentage is undefined: stageBadge at L785 defaults pct to 100 ('(info.learningStage === "NOT_STARTED" ? 0 : 100)') and prints '100% In-Progress' (L796); the progress bar/text at L855/L859 use 'chapter.completionPercentage || 30' and print '30% In-Progress'; the telemetry line at L901 uses 'chapter.completionPercentage || 0' and prints '0% Progress'. getChapterRevisionInfo derives IN_PROGRESS from lastStudiedDate/confidence alone, so this state is reachable with no percentage ever logged.
- Impact: One row simultaneously claims 100%, 30% and 0% progress for the same chapter, two of them invented by || fallbacks. He cannot tell how much of a chapter he has actually covered from this screen.

**[HIGH] 'Urgency / Overdue First' sort cannot rank urgency: daysDiff is 0 for not-started, in-progress and due-today chapters alike**
- File: `src/components/ChapterList.tsx:143-148 (with src/services/spacedRepetition.ts getChapterRevisionInfo daysDiff)`
- Evidence: L143-148 sorts solely by 'infoA.daysDiff - infoB.daysDiff'. In spacedRepetition.ts getChapterRevisionInfo, daysDiff is initialised to 0 and only assigned when the chapter is FIRST_PASS_DONE/IN_REVISION with a nextRevisionDate; NOT_STARTED, IN_PROGRESS, due_today and no-date chapters all carry daysDiff 0. So overdue (-ve) sorts first, but due-today, never-started, in-progress and due-in-2-days (+2) are interleaved/behind the 0-group in original syllabus order (stable sort), not by urgency.
- Impact: Choosing 'Urgency / Overdue First' (L311) does not surface due-today revisions ahead of untouched chapters and buries chapters due in 1-2 days below never-started ones. He can work down this list and miss the revision that is actually due.

**[HIGH] Armed 'Confirm Reset All' survives modal close and applies to the next chapter opened**
- File: `src/components/ChapterList.tsx:67,518-523,571-578,728-735`
- Evidence: confirmResetHistory is a single component-level boolean (L67). Both modal close handlers (L518-523 and L728-735) call setSelectedChapterForHistory(null) and setConfirmDeleteLogId(null) but never setConfirmResetHistory(false). So: open chapter A history, click 'Clear All History' (L596-600, arms confirm), close the modal, open chapter B history — L571 immediately renders the armed 'Confirm Reset All' button for B, and one click at L575-578 calls onResetChapterHistory(B.id), which in App.tsx deletes every study log for B and resets it to NOT_STARTED.
- Impact: A destructive confirmation armed for one chapter stays armed for a different chapter. A single reflex click in the wrong chapter's history wipes that chapter's entire study record.

**[HIGH] '1st Pass Done' filter disagrees with the '1st Pass Done' header count, and IN_REVISION chapters have no filter at all**
- File: `src/components/ChapterList.tsx:90-93,117-118,380-386`
- Evidence: Header count L90-93: firstPassDoneCount includes 'FIRST_PASS_DONE || IN_REVISION', displayed as '1st Pass Done X/total' (L243-245). The stage filter at L117 is strict: 'stageFilter === "FIRST_PASS_DONE" && info.learningStage !== "FIRST_PASS_DONE"' excludes IN_REVISION. The filter logic supports IN_REVISION at L118, but the rendered stage-filter bank L380-386 lists only All, NOT_STARTED, IN_PROGRESS, FIRST_PASS_DONE, overdue, ARCHIVED — no IN_REVISION button exists.
- Impact: If the header says 20 chapters are 1st-pass done, clicking '1st Pass Done' may show only 12 (the other 8 being IN_REVISION), and there is no way in this view to list the in-revision chapters alone. Counts he uses to judge syllabus completion do not reconcile with the lists behind them.

**[MEDIUM] 'Spaced Revision Due' counter excludes chapters due today**
- File: `src/components/ChapterList.tsx:95-98,268-273`
- Evidence: overdueCount L95-98 counts only 'info.status === "overdue"'. It is rendered under the label 'Spaced Revision Due' as '{overdueCount} Due / Needs review' (L268-273). getChapterRevisionInfo returns a distinct status 'due_today' for chapters whose nextRevisionDate is today, which this count excludes.
- Impact: On a day when 3 revisions are due today and none are yet overdue, the header reads '0 Due', telling him nothing needs review today.

**[MEDIUM] Missing revision date is displayed as 'Next Revision: Scheduled'**
- File: `src/components/ChapterList.tsx:904-919`
- Evidence: L916: '{chapter.nextRevisionDate || "Scheduled"}' inside the 'Next Revision:' label for FIRST_PASS_DONE/IN_REVISION chapters. A null nextRevisionDate therefore renders literally as 'Next Revision: Scheduled'. This state is reachable: App.tsx handleQuickUpdateStage sets FIRST_PASS_DONE/IN_REVISION without setting nextRevisionDate, and getChapterRevisionInfo also returns status 'scheduled' when nextRevisionDate is null.
- Impact: A chapter with no revision date at all is presented as scheduled. He believes a spaced repetition is booked when nothing is in the schedule, so the revision never surfaces as overdue either.

**[MEDIUM] Group-by-cluster toggle silently stops applying when any non-default sort is chosen**
- File: `src/components/ChapterList.tsx:316-327,446`
- Evidence: Grouped rendering requires both flags at L446: 'groupByCluster && sortOption === "order"'. The toggle button at L316-327 reflects only groupByCluster state and reads 'Unit Groups' when on, regardless of sortOption. Selecting Urgency/Stage/Confidence/Name sort (L306-314) switches to the flat list (L488ff) while the button still shows the grouped state as active.
- Impact: The control claims grouping is on while the list is flat, with no indication that changing sort silently disabled grouping. He has to guess why the view changed.

**[MEDIUM] Cluster header 'X/Y 1st Pass Done' uses the filtered subset as the denominator, not the cluster's chapters**
- File: `src/components/ChapterList.tsx:166-189,449-468`
- Evidence: groupedByClusterData (L166-189) is built from filteredChapters, and the cluster header at L449-468 computes clusterDone and the denominator from that filtered subset: '{clChapters.length} Chs · {clusterDone}/{clChapters.length} 1st Pass Done'. With a search/subject/confidence filter active that leaves one completed chapter of a 6-chapter cluster visible, the header reads '1 Chs · 1/1 1st Pass Done'.
- Impact: Cluster completion is presented as a fraction of the whole unit but is actually a fraction of whatever the current filters left visible, inflating unit progress exactly when he is searching/filtering to check it.

**[MEDIUM] History modal reports completion from raw stored fields, contradicting the derived stage shown in the row**
- File: `src/components/ChapterList.tsx:541-559,765`
- Evidence: Rows derive stage via getChapterRevisionInfo (L765, which derives stage when chapter.learningStage is unset and forces 100% for revisionCount>=1). The history modal instead reads raw stored fields at L541-549: completion is 'chapter.completionPercentage' if defined, else '100% Done' only if stored learningStage === 'FIRST_PASS_DONE', else '0% Unstarted' — so an IN_REVISION or derived-IN_PROGRESS chapter with undefined completionPercentage shows '0% Unstarted' in the modal while its row shows in-progress/100%. It also prints stored nextRevisionDate raw (L555-559) with no derived status.
- Impact: Opening a chapter's history can contradict the row he just clicked — e.g. a chapter shown as revising displays '0% Unstarted' in its own history drawer — undermining trust in both displays.

**[MEDIUM] Performance trap: revision info is recomputed unmemoised across four header counters, the filter, sort comparators, cluster headers and every row on every render**
- File: `src/components/ChapterList.tsx:80-98,112,143-154,450-452,765`
- Evidence: notStartedCount/inProgressCount/firstPassDoneCount/overdueCount at L80-98 are plain render-body filters (not useMemo), each calling getChapterRevisionInfo per chapter; getChapterRevisionInfo itself filters the whole tests array per call. filteredChapters (L112) repeats it per chapter, the urgency/stage sort comparators (L145-154) call it twice per comparison (~n log n times), cluster headers repeat it (L450-452), and every ChapterRow calls it again (L765). ChapterRow is a plain React.FC with no memoisation, so every keystroke in the search box (L286-290) re-renders all ~86 rows and recomputes everything.
- Impact: Each render does hundreds of revision-info computations, each scanning all tests; search typing and any parent state change re-trigger the full cost. On a low-end device this makes the main syllabus screen visibly laggy while typing.

**[LOW] onQuickRateChapter and onQuickUpdateStage are passed by App but never destructured or rendered — dead controls in this view**
- File: `src/components/ChapterList.tsx:39-40,45-55`
- Evidence: ChapterListProps declares onQuickRateChapter and onQuickUpdateStage (L39-40) and App.tsx passes real handlers for them (App.tsx:760-761 — handleQuickRateChapter creates a study log, handleQuickUpdateStage changes stage). The component destructuring at L45-55 omits both props entirely, and no JSX in the file references them. Other views (ShadowArmyMatrix) do destructure and use the same props.
- Impact: Quick confidence-rating and quick stage-change are wired from App into this view but silently dropped: there is no way to rate or advance a chapter from the syllabus list itself, despite the props suggesting the capability exists.

**[LOW] Custom chapters are labelled 'Unit 99 (Physics)' regardless of subject, and search does not search the concepts its placeholder promises**
- File: `src/components/ChapterList.tsx:183,286,133-136,460-463`
- Evidence: (a) L183 hardcodes the fallback cluster as {id: 99, name: 'Other / Custom Chapters', subject: 'Physics'}, and the header renders 'Unit {cluster.id}' (L460) plus '({cluster.subject})' (L463): custom Chemistry/Botany/Zoology chapters are grouped under 'Unit 99 (Physics)'. (b) Search placeholder L286 promises 'Search chapters, concepts, NCERT units...', but L133-136 matches only name, clusterName and subject — cluster descriptions in seedData (where concepts like 'Friction', 'Capacitors' live) are never searched.
- Impact: Custom chapters are mislabelled with a fake unit number and the wrong subject, and searching for a concept named in the placeholder returns 'No chapters found' even though the concept exists in the syllabus data.

### Critical-risk & due lists (`lists-risk`)

**[HIGH] Critical-risk list shows never-studied chapters as 'Overdue by 0 days' under a header claiming all entries are low-confidence and past their revision date**
- File: `src/components/CriticalRiskList.tsx`
- Evidence: CriticalRiskList.tsx:81-83 subtitles the list 'These chapters have low confidence ratings (Level 1–2) and are past their scheduled revision date', and line 125 renders 'Overdue by {Math.abs(info.daysDiff)} days' for every entry. But isCriticalRisk in src/services/spacedRepetition.ts:188-191 has a second clause with NO confidence and NO overdue requirement: '(earliestTestDeadline?.isUrgent && (stage === NOT_STARTED || stage === IN_PROGRESS || completionPercentage < 100))'. For NOT_STARTED/IN_PROGRESS chapters the status branch (spacedRepetition.ts:146-155) never computes daysDiff, so it stays 0. A chapter he has never opened (currentConfidence 0, no revision date) linked to a test within 7 days therefore appears in 'High Priority Attention Needed' labelled 'Confidence: Level 0/5 (Unrated)' and 'Overdue by 0 days'.
- Impact: The priority list he triages from mixes genuinely overdue weak chapters with untouched chapters under a false 'overdue / Level 1–2' label, and prints a fabricated 'Overdue by 0 days'. He can waste a session re-revising nothing or learn to distrust the list; the count badge (line 77) inflates the true overdue-weak count.

**[HIGH] An overdue chapter can be permanently hidden from both lists by the unbounded 'lastStudiedDate >= nextRevisionDate' override**
- File: `src/services/spacedRepetition.ts`
- Evidence: getChapterRevisionInfo lines 158-167: isRecentlyStudied = lastStudiedDate && (lastStudiedDate >= nextRevisionDate || getDaysDifference(lastStudiedDate, todayStr) <= 1); when true, an overdue (daysDiff<0) or due-today chapter is reclassified 'scheduled' and disappears from OverdueAndDueList and CriticalRiskList. The >= comparison has no time bound and never checks that the study actually rescheduled the chapter. This state is producible by the app's own sync: mergeLocalAndCloudState in src/services/firebase.ts:363-378 sets merged lastStudiedDate to the MAX of both devices but takes nextRevisionDate only from the base record (not in the override field list), so a merge can pair a fresh lastStudiedDate with a stale past nextRevisionDate. Meanwhile src/services/mcpExtensions.ts:96-103 computes overdue purely from nextRevisionDate with no such override, so the MCP tools report the same chapter overdue while the web lists hide it.
- Impact: After a cross-device sync merge, a chapter that is days past its revision date can vanish from every due/overdue surface indefinitely (until another log is added), while the app's own MCP view still calls it overdue. He studies from the web lists, so the revision silently never happens.

**[HIGH] Completed chapters with nextRevisionDate = null are classified 'scheduled' and can never appear in any due list — no surface warns they have no revision scheduled**
- File: `src/services/spacedRepetition.ts`
- Evidence: getChapterRevisionInfo lines 152-153: a completed chapter with !chapter.nextRevisionDate gets status 'scheduled' — a status neither component renders or counts (OverdueAndDueList.tsx:40-42 only surfaces overdue/due_today/due_soon; CriticalRiskList requires isCriticalRisk). Producing paths in the app: QuickAddChapterModal.tsx:46-48 creates a chapter with initial confidence > 0 as revisionCount 1, lastStudiedDate today, nextRevisionDate: null and no learningStage/completionPercentage — getChapterRevisionInfo then derives completionPercentage 100 and stage FIRST_PASS_DONE (spacedRepetition.ts:116-128), landing exactly in the null-date hole. App.tsx handleQuickUpdateStage (lines 562-580) likewise marks chapters FIRST_PASS_DONE/IN_REVISION without ever setting nextRevisionDate.
- Impact: Every already-studied chapter he bulk-adds via Quick Add with a confidence rating — the normal setup flow for prior study — is treated as fully scheduled while having no revision date at all. It will never come due, never show overdue, and silently drops out of the spaced-repetition loop he relies on for the Dec 2026 syllabus target.

**[MEDIUM] Overdue badge colour is computed from Math.abs(daysDiff), defeating the signed tier function — the most overdue chapters get the gray 'inactive' badge and 1–3-day overdue gets blue 'Strong'**
- File: `src/components/OverdueAndDueList.tsx`
- Evidence: Line 190: const overdueTier = getOverdueDaysTier(Math.abs(info.daysDiff)); the result's badgeClass is used for the 'Overdue by N days' badge at line 201. But getOverdueDaysTier in src/utils/confidenceColor.ts:229-241 expects a SIGNED value: negative inputs return the urgency tiers (>=5 days → Tier 1 crimson, >=2 → Tier 2 orange), while positive inputs fall through to the 'future due' branch (<=3 → Tier 4 electric blue, else Tier 0 slate gray). Passing the absolute value means a chapter 10 days overdue gets Tier 0's gray badge (bg-[#ECEAE4] text-[#706E66], the Unrated/Inactive style) and a chapter 1–3 days overdue gets Tier 4 blue (the 'Strong/High' colour); the crimson/orange urgency tiers are unreachable from this call site.
- Impact: The colour scan he uses to triage the overdue list is inverted/absent: the longest-overdue chapters look the least urgent. The badge text is right but the urgency signal the tier system was built to provide never appears.

**[MEDIUM] Stalled in-progress chapters can never appear in the due/overdue console no matter how long they sit unfinished**
- File: `src/components/OverdueAndDueList.tsx`
- Evidence: getChapterRevisionInfo (spacedRepetition.ts:150-151) assigns status 'in_progress' to any chapter with stage IN_PROGRESS or completionPercentage < 100, with no date comparison at all — startedDate and lastStudiedDate are ignored for this branch. OverdueAndDueList.tsx:40-42 builds its three lists only from statuses overdue/due_today/due_soon, so an in-progress chapter is excluded by construction; CriticalRiskList only catches it via the urgent-test clause. A chapter started 90 days ago at 40% completion appears in neither list, and the console's empty state (line 179) still reads 'Great job! You have no chapters due for review in this category right now.'
- Impact: Half-finished chapters — the ones most at risk of never being completed before the syllabus deadline — are invisible in the revision console. Nothing in these lists ever nags him to finish a chapter he abandoned mid-way.

**[MEDIUM] 'Revisions Completed: #N' overstates every chapter by one — a chapter that has only finished its first pass, never revised, shows #1**
- File: `src/components/OverdueAndDueList.tsx`
- Evidence: Lines 226-229 render 'Revisions Completed: #{chapter.revisionCount}'. But applyStudyLogToChapter (spacedRepetition.ts:241-243) sets newRevisionCount = Math.max(1, ...) at FIRST-PASS completion, before any revision round exists; revisionCount only increments on subsequent revision_round_complete logs (line 258). So revisionCount 1 means 'first pass done, zero revisions completed', yet the row claims 1 revision completed, and the tier colour from getRevisionPassTier (line 189) grades it as a completed pass 1.
- Impact: Every chapter's displayed revision depth is inflated by exactly one round in the list he uses to judge mastery. A chapter finished yesterday and never revised looks as though it has already survived one spaced repetition, distorting which chapters he thinks are safe to deprioritise.

**[LOW] 'Coaching Test Deadlines (Next 7 Days)' grid is never sorted by deadline and counts already-completed chapters as 'in scope'**
- File: `src/components/OverdueAndDueList.tsx`
- Evidence: Lines 45-47: testDeadlinesList = chapterItems.filter(i => i.info.earliestTestDeadline && i.info.earliestTestDeadline.isUrgent) — no sort is applied anywhere before rendering (lines 281-303), unlike the due list which sorts at line 65. Chapters render in raw syllabus/array order, so a chapter whose test is in 7 days can appear above one whose test is tomorrow. The filter also ignores status and completion: a chapter at 100% with confidence 5 and a future revision date is still counted in the '{testDeadlinesList.length} Chapters in Scope' badge (line 262) under the heading 'so you finish your syllabus in time' (line 259), even though there is nothing left to finish for it.
- Impact: The deadline board does not present nearest-deadline-first, so the most urgent test prep is not at the top, and the in-scope count is inflated by chapters that need no work, diluting the signal of the section.

**[LOW] Recent-activity and due rows print unguarded derived numbers: 'Last revised -N days ago' for future-dated logs and 'Revision #0' for ordinary study sessions**
- File: `src/components/OverdueAndDueList.tsx`
- Evidence: Line 236 renders 'Last revised {info.daysSinceLastStudied} days ago' with no sign guard; daysSinceLastStudied is the signed getDaysDifference(lastStudiedDate, todayStr) (spacedRepetition.ts:113-115), which is negative when lastStudiedDate is in the future (reachable via a future dateStudied entry or a synced record), producing 'Last revised -3 days ago'. Separately, line 345 badges every recent log 'Revision #{log.revisionNumber}', and applyStudyLogToChapter (spacedRepetition.ts:268) sets revisionNumber 0 for progress sessions, so ordinary first-study sessions are labelled 'Revision #0'.
- Impact: Minor but visible nonsense values in the two lists he reads daily; they erode trust in the surrounding numbers that are correct.


## 9. Interface, design & access


## 9. Interface, design & access

### SettingsModal (`settings`)

**[CRITICAL] Factory Reset and 'Load 1-Year Testing Data' wipe all real study data in one click, with no confirmation and no undo — and the wipe is pushed to Firestore**
- File: `src/components/SettingsModal.tsx`
- Evidence: Lines 1143-1164: the Load 1-Year button's onClick immediately calls onImportState(generateOneYearTestingData(appState)). Lines 1165-1180: Factory Reset immediately calls onResetSeedData(). Neither handler contains confirm() — unlike cloud restore at line 173, which does. App.tsx handleImportState (672-682) and handleResetSeedData (664-670) also have no confirmation and both call saveStateToFirestore(...).catch(()=>{}), overwriting the cloud copy too. oneYearData.ts:316-325 shows the generated state REPLACES rather than merges: 'studyLogs: generatedLogs, testScores: generatedScores, tests: allTests' where allTests (line 126) is only generated+future tests.
- Impact: One accidental click on either prominent button in the Backup section permanently destroys Sarthak's real logs, his real test list and any real scores, substituting 230 fabricated sessions and 24 fabricated mock scores (492→680+). Because the replacement is also synced to Firestore, restoring from cloud cannot save him — the cloud copy is overwritten with the same fake/seed state. There is no undo, trash, or pre-wipe backup prompt.

**[HIGH] Importing a JSON backup overwrites the entire current state instantly, with no confirmation**
- File: `src/components/SettingsModal.tsx`
- Evidence: handleFileUpload (lines 141-158): as soon as importBackupJSON resolves it calls onImportState(newState) and shows 'Backup restored successfully'. No confirm() dialog, no display of the backup's date/counts, no offer to export the current state first. App.tsx handleImportState (672-682) then overwrites local storage and Firestore with the imported state. The modal itself proves the author knew this pattern was needed: cloud restore at line 173 warns 'This will override unsaved local changes' — the file import, which overrides the same data, warns about nothing.
- Impact: Picking the wrong file (an old backup, the 1-year simulation export, a truncated JSON) silently replaces months of current logs/tests with stale data and pushes that replacement to the cloud, destroying the newer cloud copy as well. The only recovery is a backup he may not have.

**[HIGH] Saving new revision intervals does not reschedule any already-scheduled chapter — every existing due date silently keeps the old gaps**
- File: `src/components/SettingsModal.tsx`
- Evidence: The intervals form (lines 1036-1106) copy promises 'Number of days between each subsequent revision' and the save path (handleSaveSettings, lines 131-139) only calls onUpdateSettings; App.tsx handleUpdateSettings (656-662) only replaces appState.settings and touches nothing else. nextRevisionDate is a stored field on each chapter, computed only at log time by calculateNextGap/applyStudyLogToChapter in spacedRepetition.ts — no code recomputes existing chapters' dates when settings change. The modal gives no hint of this limitation, and flashes 'Intervals Saved!' (lines 1099-1104).
- Impact: If Sarthak tightens gaps from [3,7,14,30] to [1,2,3,4] believing his revision queue will pull forward, nothing moves: every chapter already scheduled stays on the old, longer intervals and he studies to the wrong due dates while the UI tells him the save succeeded.

**[MEDIUM] Gap editor accepts inverted and unbounded intervals with no validation or warning**
- File: `src/components/SettingsModal.tsx`
- Evidence: handleGapChange (lines 125-129) is the only guard: 'next[index] = Math.max(1, val)' — a floor of 1, no ceiling, no check that gaps increase. The +/- steppers (lines 1055-1085) can therefore produce e.g. [30, 3, 7, 14] or Rev 4+ = 400. calculateNextGap (spacedRepetition.ts:19-26) consumes the array positionally (gaps[min(revisionNumber-1, len-1)]), so an inverted array dutifully schedules Rev 2 sooner after Rev 1 than Rev 1 was after completion, and a 400-day Rev 4 gap is applied verbatim (only rounded and floored at 1).
- Impact: A few stray clicks can silently corrupt the whole future revision schedule — later revisions arriving before earlier ones, or a chapter vanishing for over a year — with the UI reporting a normal successful save.

**[MEDIUM] Footer claims 'Config changes persist automatically' while the intervals form silently discards unsaved edits**
- File: `src/components/SettingsModal.tsx`
- Evidence: Footer at lines 1200-1203: 'Config changes persist automatically'. But gaps/multipliers live in local useState (lines 95-96) and reach appState only via the form's submit handler (lines 131-139, form at line 1036). The header close button (lines 248-257) and every other exit path call onClose() unconditionally, throwing away edited-but-unsaved gaps with no dirty-state warning. Theme and sound changes in the same modal do apply instantly, making the footer's claim plausible-sounding.
- Impact: Sarthak can adjust his intervals, close the modal trusting the footer, and keep studying on the old schedule indefinitely — the exact setting this screen exists to change, lost without any signal.

**[LOW] Cloud sync status collapses 'connecting' and 'error' into 'Local Storage Mode', hiding backup failures**
- File: `src/components/SettingsModal.tsx`
- Evidence: Lines 985-991: the status ternary renders 'Continuous Auto-Sync Active' for 'synced', 'Syncing...' for 'saving', and 'Local Storage Mode' for everything else. CloudSyncStatus (firebase.ts:28) also includes 'connecting' and 'error', and App.tsx sets 'error' when Firestore saves/restores fail (App.tsx:242, 305, 347). Both states are displayed to the user as ordinary local mode; the word 'error' never appears unless he happens to trigger a manual sync and it throws.
- Impact: If cloud backup is failing, the Persistence Engine panel — the place he would check — reassures him with a benign 'Local Storage Mode' label instead of telling him his off-device backup is broken.

**[LOW] Backup file input is never reset, so re-selecting the same file after a failed import silently does nothing**
- File: `src/components/SettingsModal.tsx`
- Evidence: The import input (lines 1131-1140) wires onChange={handleFileUpload}; handleFileUpload (lines 141-158) never clears e.target.value. After a parse failure sets importError and the modal stays open, choosing the same filename again (e.g. after fixing the file, or retrying the intended backup) produces no change event in the browser, so no import is attempted and the stale error just sits there with no explanation.
- Impact: The recovery path from a bad import attempt is broken for the most natural retry — picking the same file again — forcing him to rename the file or reopen the modal before a restore can proceed.

### Tutorial, sound & fullscreen (`tutorial-misc`)

**[MEDIUM] Closing the tutorial with X never marks it seen — it resurrects on every launch**
- File: `src/components/TutorialModal.tsx`
- Evidence: TutorialModal.tsx:168-171 header X button is onClick={onClose} only. In App.tsx:940-944 onClose is () => setIsTutorialOpen(false) — it writes nothing. The only writer of 'pcb01_tutorial_seen' is handleCompleteTutorial (App.tsx:392-394), called only via onComplete, which TutorialModal invokes only from handleNext on the last step (TutorialModal.tsx:130-138). App.tsx:385-390 auto-opens the tutorial on every launch when that key is absent.
- Impact: Dismissing the first-launch tutorial with the X — the natural 'not now' action — does not dismiss it: it reopens on every reload until he clicks through all 4 steps to 'Get Started'. The X presents a dismissal the code does not honour.

**[MEDIUM] Sound engine reads/writes localStorage unguarded at module import — a storage error takes down the whole app**
- File: `src/services/soundEffects.ts`
- Evidence: soundEffects.ts:30-46 the constructor reads localStorage.getItem('pcb01_sfx_enabled') and ('pcb01_sound_volume') with no try/catch, and :515 'export const sound = new SoundEngine()' runs that constructor at module import time. setEnabled (:98-104), toggle (:106-112) and setVolume (:114-120) likewise call localStorage.setItem unguarded. Dozens of components import { sound }, so a throw propagates through module evaluation / the click handler.
- Impact: In any context where localStorage access throws (blocked storage / SecurityError, some private-browsing and embedded-webview modes), merely importing the sound module throws and the entire app fails to load — a cosmetic sound preference white-screens the study console. Where only writes throw, toggling SFX or changing volume crashes mid-handler after the in-memory flag already flipped, desyncing the Settings UI state from the engine.


## 10. Data & seed truth

### Committed real data (data/server-state.json) (`server-state-data`)

**[CRITICAL] Burst 'Quick confidence update' taps are counted as study sessions and the last tap in a 3-second burst sets the revision-driving confidence**
- File: `data/server-state.json`
- Evidence: 13 of 21 logs have note 'Quick confidence update'. ch-phy-05's six 2026-10-11 logs (server-state.json:2586-2711) have timestamps 1791693168049 to 1791693171374 (3,325 ms total) with chronological confidenceRating 3,2,1,3,4,5; ch-phy-01's six 2026-10-10 quick logs (:2712-2837) span 1791628853687 to 1791628856523 (2,836 ms) with ratings 4,5,4,3,2,4. Each such tap still increments the chapter: both chapters show totalStudySessions 10 (:18 and :138) although ch-phy-01 has only 4 non-quick logs and ch-phy-05 only 4. The stored chapter confidence is simply the last tap of the burst: ch-phy-05 currentConfidence 5 (:130) was set 0.57s after a rating of 1 in the same burst, and that 5 (multiplier 1.5 vs 0.5 for a 1, settings :4996-5002) is what produced nextRevisionDate 2026-10-16 (:134).
- Impact: totalStudySessions is inflated 2.5x on the only two actively studied chapters, and ch-phy-05's revision gap is triple what its own seconds-earlier confidence of 1 would have produced (5 days instead of round(3x0.5)=2 days from last study, before the separate first-pass-date error). He will revise this chapter late based on an accidental last-click, and any session-count or confidence-trend view built on these logs is noise.

**[HIGH] hoursSpent is a repeated 1.5 default inside the real logs, not measured time: 12 hours claimed in ~33 minutes**
- File: `data/server-state.json`
- Evidence: Every log that carries hoursSpent carries exactly 1.5: 8 of 8 (13 logs omit the field). Three ch-phy-05 logs within 5.6 seconds each claim 1.5h: progress 10% timestamp 1791626922926 (:2985-3004), progress 10% timestamp 1791626926521 (:2964-2983), and first_pass_complete timestamp 1791626928280 (:2943-2962) — the chapter jumps 10% to 100% in under 6 seconds while booking 4.5 hours. Across 2026-10-10 the 8 logs sum to 12.0 hours while their timestamps span only 1791626869335 to 1791628856523 (~33 minutes of wall clock).
- Impact: Any sum over hoursSpent in this real state reports 12 fabricated hours for a ~33-minute morning, including 1.5h for a 10% progress tap. The value is a constant default, not a measurement, so every total/average derived from these 21 logs is fictional.

**[HIGH] ch-phy-05 firstPassCompletedDate, daysTaken and nextRevisionDate contradict its own logs by one day**
- File: `data/server-state.json`
- Evidence: ch-phy-05's only first_pass_complete log is dated 2026-10-10 (:2943-2962, dateStudied '2026-10-10', revisionNumber 1) and its startedDate is 2026-10-10 (:136), so first pass was completed 2026-10-10 with daysTaken 1 — exactly the pattern ch-phy-02 shows (:46-59). The stored ch-phy-05 chapter instead says firstPassCompletedDate '2026-10-11', daysTakenToComplete 2, lastStudiedDate '2026-10-11', nextRevisionDate '2026-10-16' (:133-149). No log dated 2026-10-11 justifies this: all six are sessionType 'progress' with revisionNumber 1 (:2586-2711), and there is no revision_round_complete log for the chapter at all.
- Impact: The chapter's completion is recorded a day late and its first revision is scheduled 2026-10-16 instead of the 2026-10-15 its own log history implies (2026-10-10 + round(3x1.5)=5d). Pacing counts, days-taken stats, and the due date he acts on are all shifted by a phantom day created by confidence taps, not study.

**[HIGH] ch-phy-02 is IN_REVISION with no revision ever logged, and its updatedAt records a silent mutation with no log**
- File: `data/server-state.json`
- Evidence: ch-phy-02 (:34-61) claims learningStage 'IN_REVISION' with revisionCount 1 and totalStudySessions 1. Its sole log (:2922-2941) is a single first_pass_complete on 2026-10-10 with revisionNumber 1 — no revision_round_complete log exists for any chapter in the file. The identically-profiled ch-phy-05 (one first_pass_complete, revisionCount 1) is stored as 'FIRST_PASS_DONE' (:131), so two chapters with the same log history carry two different stages. Additionally ch-phy-02's updatedAt is 1791688674489 (:61, 2026-10-11), a timestamp matching no log (its only log is 1791627269697) and ~17 hours after it, while actionHistory is empty (:4990) — a chapter mutation with no log and no history entry explaining it.
- Impact: Stage-driven views will treat Unit/Dimensions as already in the revision cycle when no revision has ever been logged, while its twin chapter is treated as merely first-pass-done. The orphan updatedAt proves chapter state can change without leaving any trace in studyLogs or actionHistory, so the log history cannot be trusted to reconstruct or audit the chapter state.

**[MEDIUM] 100%-complete chapters record zero of six study pillars — pillars are all-false across the entire real state**
- File: `data/server-state.json`
- Evidence: All 86 chapters have every pillar false and all 21 logs have every pillarsCompleted flag false — e.g. ch-phy-02 pillars all false at :49-56 and ch-phy-05 at :139-146, and the first_pass_complete log at :2950-2957. Yet those same chapters claim completionPercentage 100, first-pass completion, and revision scheduling (:42-45, :132-135).
- Impact: The six-pillar system (lectures, book/NCERT reading, notes, question practice, Anki) contains zero recorded work in his real state while the app simultaneously certifies two chapters 100% complete. Any pillar-coverage, weak-pillar, or completion-quality display derived from this state is built on all-false data that contradicts the completion claims beside it.

**[MEDIUM] 16 scheduled tests are already in the past with zero scores and no taken/missed marker**
- File: `data/server-state.json`
- Evidence: testScores is [] (:4989) even though 16 of the 49 tests are dated before the last study log (earliest test-2026-06-28-allen-minor-1 at :3029ff, through tests in June-September 2026). Those past tests link chapters that are still NOT_STARTED in this state (83 of 86 chapters untouched), e.g. Minor-1's syllabus includes ch-phy-17, ch-chm-01 and ch-chm-02, none of which has any log. Nothing in the state distinguishes a past test that was taken, missed, or never attempted.
- Impact: Pacing that derives tests completed from testScores.length reports 0 of 49 with 16 already elapsed, and there is no record from which he can tell which past mocks he actually sat. The test calendar and the study record silently disagree about three months of scheduled testing.

**[MEDIUM] Timestamp fields are seed constants and epoch zeros, and the file's top-level updatedAt matches no content change**
- File: `data/server-state.json`
- Evidence: 83 of 86 chapters carry updatedAt 0 (epoch, e.g. the untouched chapters after :153), all 86 chapters carry the seed constant createdAt '2026-06-01' (seedData.ts:74) and all 49 tests the seed constant createdAt '2026-05-15', regardless of any real creation time. The top-level updatedAt 1791705440957 (:5015) is ~3.4 hours after the newest chapter updatedAt and newest log timestamp in the file (both 1791693171374), with no chapter, log, test, or settings value in the file stamped at that time.
- Impact: updatedAt cannot be used to tell when a chapter actually changed: untouched chapters claim 1970-01-01 and the file's own last-write stamp corresponds to no identifiable change, so any last-write-wins sync conflict resolution or 'recently changed' view operating on this state is comparing meaningless timestamps.

### Syllabus & test seed truth (`syllabus-truth`)

**[HIGH] Allen Review-2 and Semi-Major-2 silently drop Experimental Skills (ch-phy-03) that Minor-6 tests**
- File: `src/data/seedData.ts`
- Evidence: Minor-6 (seedData.ts:410-417) scope says 'Rotational Motion, AC, EM Waves, Metre Scale' and links 'ch-phy-09','ch-phy-23','ch-phy-24','ch-phy-03' — ch-phy-03 is 'Experimental Skills (Vernier Calipers, Screw Gauge, Metre Scale)' (:81). Review-2 (:544-558) claims 'Review Test: Topics covered in Allen Minor Tests 6, 7 & 8' but its 29 linked ids omit ch-phy-03; the true union of Minors 6+7+8 is 30 ids. Semi-Major-2 (:637-650) claims 'Cumulative syllabus of Allen Minor Tests 6 to 10' (44 ids) and also omits ch-phy-03; true union is 45. TestRadarFocus.tsx:97-103 builds the active test's readiness breakdown purely from linkedChapterIds, so the omission is invisible in the UI.
- Impact: For both the 22 Nov 2026 review and the 3 Jan 2027 semi-major, the app will never flag Experimental Skills/Metre Scale as unrevised or not-started, even though Allen Minor-6 explicitly tests it — he can walk into those cumulative tests with a tested chapter the console treats as out of scope.

**[HIGH] Aakash UT-1 links class-12 Chemistry Biomolecules its own scope doesn't claim — and its cumulative PT-1/CT-1 then drop it**
- File: `src/data/seedData.ts`
- Evidence: UT-1 (seedData.ts:242-251): scope segments are 'Units & Measurements, Straight Line Motion | Atomic Structure, Mole Concept | Cell Unit, Cell Cycle, Animal Tissues, Biomolecules' — the Chemistry segment names only Mole Concept/Atomic Structure, yet linkedChapterIds ends with 'ch-zoo-02','ch-zoo-04','ch-chm-21', adding ch-chm-21 'Biomolecules (Carbohydrates, Proteins, Nucleic Acids, Vitamins)' Chemistry class 12 (:132) on top of ch-zoo-04 'Biomolecules with Enzymes' Zoology class 11 (:159). The app's own cumulative tests contradict UT-1: Aakash PT-1 (:316-325, 'Cumulative topics covered in Aakash UT-1 to UT-3') and CT-1 (:439-448, 'Comprehensive review of Aakash UT-1 to UT-6') both exclude ch-chm-21 — union of UT-1..3 is 25 ids, PT-1 has 24; union of UT-1..6 is 50, CT-1 has 49, the sole difference being ch-chm-21 in both cases.
- Impact: Either UT-1 overstates its syllabus (dragging an unstarted class-12 Chemistry chapter into his 2 Aug 2026 test readiness) or PT-1/CT-1 understate theirs. The seed cannot have both right, and readiness for three tests is computed from whichever version is wrong.

**[MEDIUM] Aakash PT-4 drops Organisms and Populations (ch-bot-16) while claiming to cover UT-9 to UT-11**
- File: `src/data/seedData.ts`
- Evidence: UT-11 (seedData.ts:743-754) scope includes 'Ecology' and links 'ch-bot-14','ch-bot-15','ch-bot-16','ch-bot-17','ch-bot-18' — ch-bot-16 is 'Organisms and Populations (Ecology I)'. PT-4 (:775-786) claims 'Part Test: Topics covered from Aakash UT-9 to UT-11' but links only 'ch-bot-14','ch-bot-15','ch-bot-17','ch-bot-18' for Botany: 22 ids against a true UT-9..11 union of 23, with ch-bot-16 the sole omission.
- Impact: The 14 Mar 2027 part test's chapter list and readiness breakdown omit Organisms and Populations, a high-yield ecology chapter UT-11 itself tests, so it can show as fully prepared while that chapter is unrevised.

**[MEDIUM] Aakash AIATS PT-1 and AIATS-1 are the same test seeded twice under different names/dates**
- File: `src/data/seedData.ts`
- Evidence: AIATS PT-1 (seedData.ts:483-493, date 2026-10-25) and AIATS-1 (:514-524, date 2026-11-01) have byte-identical linkedChapterIds (10 ids: phy-02/04/05, chm-01/02, bot-01/06/07, zoo-02/04) and scopes differing only in punctuation: 'Units, 1D & 2D Motion | ...' vs 'Units, 1D Motion, 2D Motion | ...' — same chapters, same wording, two different test names a week apart.
- Impact: One of these entries is almost certainly a copy-paste placeholder for a different real Aakash paper. Until fixed, the console counts two distinct tests where there may be one, and if AIATS-1's real syllabus differed, he revised the wrong 10 chapters for 1 Nov 2026.

**[MEDIUM] Practical-physics scope text and chapter links contradict each other in three tests**
- File: `src/data/seedData.ts`
- Evidence: The seed has two overlapping practical chapters: ch-phy-03 'Experimental Skills (Vernier Calipers, Screw Gauge, Metre Scale)' class 11 cluster 1 (:81) and ch-phy-31 'Practical Physics (Resistivity, Metre Bridge, Galvanometer & Ohm's Law)' class 12 cluster 5 (:109). Tests use them inconsistently against their own scope text: (1) Allen Minor-4 (:302-308) links ch-phy-31 although its Physics scope segment is only 'Work Energy Power, Circular Motion, Magnetism' (the 'Practical Chem' in scope maps to ch-chm-22); (2) Allen Minor-10 (:605-615) scope claims 'Wave Motion, Semiconductors & Practical Skills' but links only ch-phy-16 and ch-phy-30 — no practical chapter at all; (3) Aakash UT-11 (:743-750) scope says 'Experimental Skills' — ch-phy-03's exact chapter name — but links ch-phy-31 instead of ch-phy-03.
- Impact: Depending on the test, practical physics is silently in scope, silently out of scope while the printed scope says it is in, or swapped for the other practical chapter — his per-test readiness for vernier/metre-bridge-type content is unreliable across at least three tests.

**[MEDIUM] Seven dates seed two full tests from two different coachings on the same day**
- File: `src/data/seedData.ts`
- Evidence: Seven dates carry two different coachings' full 720-mark tests simultaneously in seedData.ts INITIAL_TESTS: 2026-08-02 (Allen Minor-3 :227ff + Aakash UT-1 :242), 2026-08-30 (Allen Minor-4 :302 + Aakash PT-1 :316), 2026-10-25 (Allen Minor-7 + Aakash AIATS PT-1 :483), 2026-11-01 (Allen Minor-8 + Aakash AIATS-1 :514), 2027-01-03 (Allen Semi-Major-2 :637 + Aakash UT-9), 2027-01-17 (Allen Major-1 'Entire 11th Class Complete Syllabus' + Aakash AIATS-4, both that Sunday), 2027-02-07 (Allen Major-2 'Entire 12th Class Complete Syllabus' + Aakash AIATS-5).
- Impact: He physically cannot sit two 3h20m NEET-pattern tests on the same Sunday. Whichever series is not the one he actually attends pollutes the upcoming-test radar (the nearest test drives TestRadarFocus), same-day readiness warnings, and test-count pacing with phantom exams — including two phantom 'entire class syllabus' collisions in Jan/Feb 2027.

**[LOW] 'Biomolecules with Enzymes' is filed under Zoology while its cell-biology siblings are Botany**
- File: `src/data/seedData.ts`
- Evidence: ch-zoo-04 'Biomolecules with Enzymes' is created as subject 'Zoology', cluster 16 (seedData.ts:159), while its NCERT cell-biology companions in the same seed — ch-bot-06 'Cell: The Unit of Life' and ch-bot-07 'Cell Cycle and Cell Division' — are Botany in cluster 14 'Cell Biology & Plant Physiology' (:147-148 area, cluster defined :16). Tests group it with the Botany cell chapters, e.g. UT-1 links bot-06, bot-07 and zoo-04 together (:242-251) and AIATS PT-1/AIATS-1 do the same (:483-493, :514-524). A second, separate 'Biomolecules' also exists as Chemistry ch-chm-21 (:132).
- Impact: Per-subject syllabus truth is skewed: the biology Biomolecules chapter inflates Zoology's 15-chapter denominator and is missing from Botany's 18, so subject-wise completion/mastery percentages for both subjects are computed against the wrong chapter sets.

### Type model integrity (`types-model`)

**[HIGH] Chapter.updatedAt is fabricated, not an edit clock: derived from lastStudiedDate on load and stamped to 'now' on save for untouched chapters**
- File: `src/services/firebase.ts`
- Evidence: types.ts:30 promises updatedAt is the 'epoch ms timestamp of last change for cross-device sync'. Instead: storage.ts:23 and firebase.ts:218 compute a missing updatedAt as `new Date(ch.lastStudiedDate).getTime()` (the study date, not any edit time; 0 if never studied), and firebase.ts:445 writes `updatedAt: Number(ch.updatedAt) || currentTimestamp` on every cloud save, so every chapter with a 0/missing value is stamped 'edited right now' even if untouched. In his real data (data/server-state.json) 83 of 86 chapters carry updatedAt: 0; only the 3 chapters studied on 2026-10-10/11 have values (e.g. 1791628856523), and those exactly equal a StudyLog timestamp, confirming the value tracks studying, not editing. Downstream, the MCP backup-restore merge refuses to overwrite an existing chapter unless the incoming one has a strictly greater updatedAt (mcpServer.ts:1699 and the duplicate at :3320: `c.updatedAt && c.updatedAt > (existing.updatedAt || 0)`), so a merge-mode restore silently no-ops for exactly those 83 chapters.
- Impact: Sync and restore decisions are made on a clock that does not measure edits: a device that merely saves state re-stamps 83 untouched chapters as freshly edited and wins merges over genuine edits made elsewhere, and backup restore cannot restore most chapters in merge mode.

**[HIGH] Every Firestore merge rewrites all chapters' updatedAt to now, then falls back to a 'highest progress wins' heuristic that resurrects deliberately reduced progress**
- File: `src/services/firebase.ts`
- Evidence: mergeLocalAndCloudState returns each merged chapter with `updatedAt: Math.max(localUpdatedAt, cloudUpdatedAt, Date.now())` (firebase.ts:379), and App.tsx:229 likewise inflates the merged AppState.updatedAt to Date.now() — after one merge, no chapter's updatedAt records when it actually changed. When both sides' updatedAt are 0 or equal (the state of 83/86 of his real chapters), firebase.ts:320-335 picks the base chapter by a progress score (revisionCount*100 + completionPercentage + totalStudySessions*10, ties to cloud), ignoring which side is newer.
- Impact: If he deletes a study log, recalculateChapterFromRemainingLogs (spacedRepetition.ts:293+) legitimately lowers a chapter's revisionCount/completion; a later merge against a stale copy with the old higher numbers picks the stale copy as base, silently resurrecting the deleted progress and its revision schedule.

**[HIGH] sessionType is optional and has three contradictory defaults: 'progress' in the UI/Firestore path, 'revision_round_complete' in every MCP path**
- File: `src/types.ts`
- Evidence: types.ts:49 declares sessionType optional. firebase.ts:461 persists a missing value as 'progress'; App.tsx:424-425 also defaults to 'progress'. But mcpServer.ts:174 and mcpExtensions.ts:79 read a missing sessionType as 'revision_round_complete', and the MCP log tools default an omitted argument to 'revision_round_complete' (mcpServer.ts:857 zod default, :1437, and :2802 destructuring default; :3155 for bulk items). In mcpServer.ts:872/:2812 that default means `newRevCount = ch.revisionCount + 1` plus a new nextRevisionDate — a bare 'log a session' call with no sessionType completes a full revision round.
- Impact: The same untyped log is a no-op progress session in the app and a completed revision round in MCP reports; and an AI logging a quick session without specifying the type silently bumps the chapter's revision count and pushes its next revision out by a full gap.

**[HIGH] A 'progress' log on an already-completed chapter is silently converted into a revision round, while the log still claims to be 'progress' — his real logs already violate the type's invariant**
- File: `src/services/spacedRepetition.ts`
- Evidence: types.ts:54 documents revisionNumber as '0 for progress, 1, 2, 3... for revision rounds'. But applyStudyLogToChapter's second branch (spacedRepetition.ts:229-239) triggers on `sessionType === 'revision_round_complete' || chapter.learningStage === 'IN_REVISION' || chapter.learningStage === 'FIRST_PASS_DONE'` — sessionType is ignored when the chapter is complete: it forces finalPercentage=100, revisionCount+1, and a new nextRevisionDate. Line 265 then stamps the log `revisionNumber: newRevisionCount` even though sessionType stays 'progress'. Proof in his real data: data/server-state.json contains 6 logs with (sessionType 'progress', revisionNumber 1) out of 21. Consumers then disagree about the same log: WeeklyAuditModal.tsx:161-168 labels any 'progress' log '1ST PASS', while recalculateChapterFromRemainingLogs (spacedRepetition.ts:364-367) counts logs with revisionNumber > 1 as revision rounds.
- Impact: Light review sessions on finished chapters push their next revision out by a full interval and inflate revision counts; weekly-audit round labels and post-deletion recalculation classify the same sessions differently, so deleting any log can shift a chapter's revisionCount and nextRevisionDate away from what the live UI showed.

**[HIGH] One-tap confidence rating fabricates a completed revision round; manual stage changes fabricate revisionCount and lastStudiedDate with no log at all**
- File: `src/App.tsx`
- Evidence: handleQuickRateChapter (App.tsx:532-552) sets `sessionType = isDone ? 'revision_round_complete' : 'progress'` for any completed chapter and logs it with the note 'Confidence calibrated' — a rating tap goes through applyStudyLogToChapter and therefore bumps revisionCount and reschedules nextRevisionDate by the full gap. handleQuickUpdateStage (App.tsx:574-582) sets IN_REVISION with `revisionCount: Math.max(2, (c.revisionCount || 1) + 1)` and FIRST_PASS_DONE/IN_REVISION with `lastStudiedDate: c.lastStudiedDate || today`, creating revision history no StudyLog supports.
- Impact: Merely recalibrating confidence on a finished chapter defers its next revision as if a full round had been studied, and chapter revision counts can diverge from the log history — any later log deletion triggers recalculateChapterFromRemainingLogs, which silently drops these phantom revisions and moves the due date again.

**[HIGH] bookReading/ncertReading alias is resolved with ?? on load/save paths but || on display/merge paths, so a completed Book pillar can silently un-complete**
- File: `src/services/storage.ts`
- Evidence: types.ts:9-10 keeps both bookReading and its 'backwards compatible alias' ncertReading as independent optional booleans. Normalizers use nullish coalescing — storage.ts:27-28, firebase.ts:197-198, :432-433, :469-470, mcpServer.ts:142-143 all compute `!!(bookReading ?? ncertReading)` — but `false ?? true` is false, so a record with bookReading:false and ncertReading:true collapses to false/false on the next load or cloud save. Displays and the merge use OR instead (AnalyticsDashboard.tsx:69/112/141, ChapterList.tsx:694, firebase.ts:341-342), so the UI shows the pillar done until a reload erases it. The divergent record is producible today: MCP update_chapter_pillars (mcpServer.ts:686-707) writes bookReading without touching ncertReading and builds newPillars without carrying ncertReading over, so updating pillars on a legacy ncert-only chapter drops the pillar, and its completion count (:707) reads only bookReading.
- Impact: A chapter can show Book Reading complete, then lose it silently after a sync/reload or an unrelated MCP pillar update — corrupting the pillar-completion stats and 'all pillars done' states he plans revision around.

**[HIGH] StudyLog carries two clocks that disagree: timestamp is entry time, dateStudied is user-chosen, and 'latest log' is picked by entry order**
- File: `src/services/spacedRepetition.ts`
- Evidence: types.ts:48-56 gives StudyLog both dateStudied (YYYY-MM-DD) and timestamp (epoch ms). QuickLogModal.tsx:617 offers a free date picker, but applyStudyLogToChapter stamps `timestamp: Date.now()` (spacedRepetition.ts:267) regardless of the chosen date and unconditionally overwrites `lastStudiedDate: dateStudied` (:273) plus the schedule derived from it — backfilling yesterday's session after today's moves lastStudiedDate backwards. recalculateChapterFromRemainingLogs sorts logs by timestamp (entry order, :327) and takes the last-entered log's dateStudied and confidenceRating as current (:333-334), not the chronologically latest study date.
- Impact: Backdated logging — the normal way to catch up missed entries — corrupts lastStudiedDate, confidence, and nextRevisionDate, and any subsequent log deletion recalculates the chapter from whichever log was typed last rather than studied last.

**[MEDIUM] Test.updatedAt and Test.timestamp are dead fields: never set, never synced, never read — test merges cannot order versions and chapter unlinks are undone**
- File: `src/types.ts`
- Evidence: types.ts:68-69 declares Test.updatedAt? and timestamp?. handleAddTest (App.tsx:602-613) creates tests with only id and createdAt; the Firestore serializer's test mapping (firebase.ts:482-491) omits both fields entirely; all 49 tests in data/server-state.json have neither. mergeLocalAndCloudState's test merge (firebase.ts:263-281) therefore has no clock to consult: it spreads local over cloud for all scalar fields (`{ ...existing, ...t }`) and unions linkedChapterIds, which can never shrink.
- Impact: Editing a test's date/marks on one device and unlinking a chapter from it are both silently reverted or overridden by the next sync merge — the unlink in particular always loses, so chapters reappear in tests he removed them from.

**[MEDIUM] classLevel is optional in the type but hard-coerced to '11' on every cloud round-trip, while consumers each improvise a different fallback for missing values**
- File: `src/services/firebase.ts`
- Evidence: types.ts:22 makes classLevel optional. firebase.ts:185 (parse) and :421 (save) both rewrite it as `ch.classLevel === '12' ? '12' : '11'`, permanently reclassifying any chapter whose level is absent or malformed as Class 11; MCP add_chapter also defaults it to '11' silently (mcpServer.ts:559). Consumers disagree about the missing case the coercion hides: AnalyticsDashboard.tsx:138 filters `c.classLevel !== pillarClass` (undefined chapters vanish from both class views) while :589 prints `Class {ch.classLevel || '11'}`; ShadowArmyMatrix.tsx:1177 counts undefined as Class 11; TestManager.tsx:614 prints `Class {ch.classLevel}` verbatim, rendering 'Class undefined'.
- Impact: Any custom, imported, or MCP-created chapter without an explicit level is quietly filed as Class 11 in the cloud copy, and class-wise analytics disagree with the labels printed on the chapter's own card.

**[MEDIUM] clusterId's '1 to 16' invariant is violated by construction: MCP creates chapters with clusterId 99, and Firestore parsing forces unknown ids into Cluster 1**
- File: `src/services/mcpServer.ts`
- Evidence: types.ts:20 documents clusterId as '1 to 16' and NEET_CLUSTERS (seedData.ts:3-18) defines exactly ids 1-16. Both MCP add_chapter implementations hardcode `clusterId: 99` with a free-text clusterName defaulting to 'General Core' (mcpServer.ts:572 and :2616). ChapterList.tsx:180-186 sweeps such chapters into a synthetic group literally labelled `{ id: 99, name: 'Other / Custom Chapters', subject: 'Physics' }` regardless of the chapter's actual subject. In the other direction, firebase.ts:183 parses `clusterId: Number(ch.clusterId) || 1`, forcing a missing/invalid id into Cluster 1 (Mechanics I) while leaving clusterName untouched, so the stored id/name pair contradicts itself in displays like ChapterSelectionGenerator.tsx:208 ('Unit {clusterId}: {clusterName}').
- Impact: Chapters added through MCP live outside the 16-cluster syllabus structure (miscounted in cluster views and generator filters keyed on clusterId), and a damaged/imported chapter can be silently relocated into Mechanics I while keeping its original cluster name.

**[MEDIUM] The Express/MCP state path — the one MCP actually uses — never reads AppState.updatedAt: server accepts any POST wholesale and the UI refresh replaces local state without comparison**
- File: `server.ts`
- Evidence: types.ts:162 presents AppState.updatedAt as the sync arbiter, but POST /api/state (server.ts:279-289) accepts any body with a chapters array, replaces serverState wholesale, and stamps its own Date.now() — the client's updatedAt is discarded, not compared. Symmetrically, refreshStateFromServer (App.tsx:173-187) does setAppState(serverData) + saveAppState(serverData) with no updatedAt check, while local changes reach the server only via a 1200ms-debounced POST (App.tsx:189-199).
- Impact: Triggering the header refresh inside the debounce window — or when server-state.json is stale relative to the browser — silently discards newer browser-only logs, despite both sides carrying the updatedAt field that exists precisely to prevent this.

**[MEDIUM] Firestore serializer invents pacing defaults that contradict every other default in the codebase**
- File: `src/services/firebase.ts`
- Evidence: SyllabusPacingSettings (types.ts:126-133) declares all fields required, but runtime objects pass through unvalidated (storage.ts:46, storage.ts:110 take parsed.pacingSettings as-is). When a field is missing at cloud-save time, firebase.ts:539-545 substitutes targetSyllabusDate '2026-03-31', targetExamDate '2026-05-03', studyDaysPerWeek 6 — versus DEFAULT_PACING_SETTINGS '2026-12-31' / '2027-05-02' / 7 (seedData.ts:33-40) and the pacing engine's own fallbacks of the same 2026-12-31 / 2027-05-02 values (spacedRepetition.ts:593-598).
- Impact: A state with a partial pacingSettings object gets a syllabus deadline nine months early (already in the past) baked into its cloud copy; after the next load, pacing math runs against the fabricated March 2026 target and reports him catastrophically behind.


## 11. Cross-cutting — dates, dead code, performance, build reality


## 11. Cross-cutting — dates, dead code, performance, build reality

### Date & time sweep (`dates-time`)

**[HIGH] Header streak uses UTC date while every log date is local — streak is wrong from 00:00 to 05:29 IST**
- File: `src/components/Header.tsx:93-108`
- Evidence: Streak loop: `let checkDate = new Date(); ... const dStr = checkDate.toISOString().split('T')[0];` (line 101) — toISOString is UTC. But uniqueStudyDays is built from log.dateStudied strings produced by getTodayStr (spacedRepetition.ts:47-53, LOCAL) and todayStudied uses local todayStr (line 83). Simulated at 02:00 IST 2026-10-30: toISOString date = '2026-10-29' while getTodayStr = '2026-10-30'. ConsistencyHeatmap.tsx:44-48 does the same job correctly with formatLocalDate, proving the inconsistency.
- Impact: Breaker inputs: logs on Oct 29 + Oct 30, viewed 02:00 IST Oct 30 → loop first checks Oct 29 (streak 1), then Oct 28 (absent, break): header shows 1d instead of 2d. If he studied ONLY today (early morning), streak shows 0. The headline streak in the header is silently off by one day for the first 5.5 hours of every IST day.

**[HIGH] Cloud merge restamps EVERY merged chapter's updatedAt to Date.now(), and future/wrong-clock stamps win indefinitely**
- File: `src/services/firebase.ts:330-380`
- Evidence: Chapter winner is chosen purely by timestamp when both are >0 and differ: `base = cloudUpdatedAt > localUpdatedAt ? cloudCh : localCh` (~line 335), with confidence/revisionCount/nextRevisionDate taken from base alone. The merged result then sets `updatedAt: Math.max(localUpdatedAt, cloudUpdatedAt, Date.now())` (line 379) for every chapter — including chapters neither side edited in this sync. State-level updatedAt does the same (line 393); App.tsx:229 also bumps state updatedAt on a read-only initial load.
- Impact: A device/browser that merely opens the app and merges re-stamps all its (possibly stale) chapter copies as 'just edited', so on the next merge those stale copies beat genuine edits made earlier on another device — wrong confidence/nextRevisionDate silently wins. Symmetrically, any copy carrying a future updatedAt (clock skew; the repo's own server-state.json already carries ms timestamps) cannot be beaten by honest edits until real time catches up with the bogus stamp.

**[HIGH] Firestore save rewrites missing pacing settings to PAST 2026 deadlines (2026-03-31 / 2026-05-03)**
- File: `src/services/firebase.ts:539-544`
- Evidence: saveStateToFirestore payload fallbacks: `targetSyllabusDate: state.pacingSettings?.targetSyllabusDate || '2026-03-31', targetExamDate: ... || '2026-05-03', studyDaysPerWeek: ... || 6`. Every other default in the repo disagrees: seedData.ts:33-39 and Header.tsx defaults use '2026-12-31' / '2027-05-02' / 7, and spacedRepetition.ts:593-594 falls back to '2026-12-31'/'2027-05-02'. parseFirestoreState (firebase.ts:~233) returns stored pacingSettings verbatim, so the corrupted values round-trip back as truth. pacingSettings is optional in types.ts:159, so the fallback is reachable (legacy/imported state).
- Impact: One cloud save of a state lacking pacing fields silently moves his syllabus deadline back 9 months and his exam date to 2026-05-03 — already past. calculateSyllabusPacing then clamps the negative gap to 1 day (see separate finding), producing an absurd required velocity (all remaining chapters in ~0.14 weeks) and a permanent BEHIND verdict he will act on.

**[HIGH] Backdated or future-dated study logs corrupt lastStudiedDate/nextRevisionDate: logs are ordered by wall-clock timestamp, not dateStudied**
- File: `src/services/spacedRepetition.ts:255-283,327; src/components/QuickLogModal.tsx:617-620`
- Evidence: applyStudyLogToChapter sets `timestamp: Date.now()` (line 267) regardless of the user-chosen dateStudied, and unconditionally sets chapter `lastStudiedDate: dateStudied` and nextRevisionDate = addDays(dateStudied, gap) (lines 228/239, 277-283) — logging an older session after a newer one regresses both. recalculateChapterFromRemainingLogs sorts `[...chapterLogs].sort((a,b) => (a.timestamp||0)-(b.timestamp||0))` (line 327) and takes latestLog = last by timestamp, so after a deletion the backfilled (old dateStudied, newest timestamp) log supplies lastStudiedDate and currentConfidence. QuickLogModal's date input (617-620) has no min/max and App.handleSaveStudyLog performs no future/past validation.
- Impact: Backfilling yesterday's session today makes it the chapter's 'latest' study: lastStudiedDate moves backwards and the revision is rescheduled from the old date (chapter can flip to overdue / retention drops). Logging a future date pushes nextRevisionDate into the future and calculateMemoryRetention (line 458, Math.max(0, diff)) reports 100% retention for a session that has not happened.

**[MEDIUM] MCP study logging has no date parameter and 'today' is the SERVER host's timezone — nothing pins IST anywhere**
- File: `src/services/mcpServer.ts:852-907,1444-1510,2798-2840,3100-3170`
- Evidence: log_study_session schema accepts only chapterId/confidenceRating/hoursSpent/sessionType/note — no date. Handler: `const today = getTodayStr(); const now = Date.now(); ... dateStudied: today` (862-863, 900), and batch_log_study_sessions repeats it for every item with one shared `now`. getTodayStr returns the HOST's local date. A repo-wide grep finds no 'TZ', 'timeZone', 'Asia/Kolkata' or 'en-IN' anywhere in src/, server.ts or index.html; the duplicated executeMcpDirect implementations repeat the same pattern.
- Impact: If the Express server runs on a UTC host/container (the default for most deployments) while Sarthak is in IST, every MCP-logged session between 00:00-05:29 IST is recorded as yesterday, with nextRevisionDate computed one day early and streak/due lists shifted. There is also no way for him or an AI to backdate a session logged after midnight — it is stamped 'today' and (per the timestamp-ordering finding) becomes the chapter's latest log.

**[MEDIUM] Firestore/local fallbacks invent missing dates in UTC, and derive updatedAt from UTC-midnight parsing of date strings**
- File: `src/services/firebase.ts:218,460,486,496; src/services/storage.ts:23,88`
- Evidence: saveStateToFirestore defaults: `dateStudied: l.dateStudied || new Date().toISOString().split('T')[0]`, same for test `date` (486) and score `dateRecorded` (496) — UTC, not getTodayStr's local basis (verified: at 02:00 IST this yields the previous day). Chapter updatedAt fallback in both firebase.ts:218 and storage.ts:23: `new Date(ch.lastStudiedDate).getTime()` — ECMAScript parses 'YYYY-MM-DD' as UTC midnight ('2026-10-10' -> 1791590400000 = 05:30 IST), roughly a day before the evening study it represents. storage.ts:88 also names backups with the UTC date. seedData createRawChapter sets no updatedAt at all (0/undefined for all 86 seed chapters).
- Impact: Restored/imported records with a missing date field get silently shifted one calendar day in the early IST morning, moving due dates and streak days. Chapters whose updatedAt is the UTC-midnight fallback systematically lose merge comparisons against any copy with a real Date.now() stamp, and seed chapters (updatedAt 0) bypass timestamp merging entirely into the progress-score/cloud-favoured tie-break in mergeLocalAndCloudState.

**[MEDIUM] addDaysToDateStr silently substitutes TODAY for invalid dates (dropping the day offset) and rolls impossible dates into the next month; getDaysDifference returns 0 for garbage**
- File: `src/services/spacedRepetition.ts:32-67`
- Evidence: `if (!dateStr ...) return getTodayStr();` and `if (!year || !month || !day) return getTodayStr();` (33-35) — the `days` argument is discarded, so addDaysToDateStr('', 30) = today, not today+30. Parsing is `new Date(year, month-1, day)` with no range validation: verified new Date(2026,1,31) = 2026-03-03, so '2026-02-31'+gap schedules a revision in March with no error. getDaysDifference returns 0 for any unparseable input (59-62).
- Impact: Any malformed/empty dateStudied or nextRevisionDate (bad import, hand-edited backup, MCP payload) is silently converted into a revision due today (via addDays) or a daysDiff/daysAway of exactly 0 (via getDaysDifference), which callers render as 'due today' / urgent — a wrong revision decision presented as fact, with no error surfaced.

**[MEDIUM] Pacing engine clamps past deadlines to '1 day left' forever — days-until can never reach 0 or go negative**
- File: `src/services/spacedRepetition.ts:660,682,693`
- Evidence: `daysUntilSyllabusTarget = Math.max(1, getDaysDifference(todayStr, targetSyllabusDate))` (660), `totalDaysUntilExam = Math.max(1, getDaysDifference(todayStr, targetExamDate))` (693), `daysFromSyllabusTargetToExam = Math.max(1, ...)` (682). The raw signed difference is discarded before display or division.
- Impact: After 2026-12-31 (syllabus target) or 2027-05-02 (exam) passes — or whenever a past target is stored, e.g. via the Firestore 2026-03-31/2026-05-03 fallback — the Flight Plan keeps reporting 1 day remaining and derives required velocity/test frequency from that single phantom day instead of showing the target as missed/overdue. He cannot tell from the numbers that the deadline has already gone.

**[MEDIUM] 'Today' is frozen at mount: no midnight rollover anywhere, and the Mastery Matrix memoizes todayStr for its entire lifetime**
- File: `src/components/ShadowArmyMatrix.tsx:888; src/App.tsx (no timer/listener)`
- Evidence: ShadowArmyMatrix: `const todayStr = useMemo(() => getTodayStr(), []);` (line 888, empty deps) — every due/overdue/pacing computation in that view uses the mount-day date forever. All other components call getTodayStr() only during render, and a grep of App.tsx/src finds no setInterval, midnight timer, or date-change/visibility handler that would trigger a re-render at 00:00.
- Impact: Leave the console open across midnight IST (plausible for a study dashboard) and due-today, overdue, streak, retention and pacing all keep showing yesterday's state until a manual reload — chapters that became due at midnight do not appear, and yesterday's completed work still counts as today's.

**[LOW] A test scheduled for TODAY is classified as a past, already-taken, unfilled test from 00:00**
- File: `src/components/TestManager.tsx:101-106`
- Evidence: Comment says 'Only PAST tests that are unfilled (already taken, waiting for marks)', but the filter is `getDaysDifference(todayStr, t.date) <= 0`, which includes diff === 0 (today). The UNFILLED status filter in the same file (~line 128) uses the same <= 0 boundary, while TestRadarFocus.tsx:84-88 treats daysAway >= 0 (including today) as upcoming.
- Impact: On the morning of an Allen/Aakash mock, the Exams view simultaneously lists it as upcoming (Radar) and as a past test awaiting marks (Test Manager) — contradictory labels for the same test on the day he is about to sit it.

### Performance & write amplification (`performance`)

**[HIGH] Every single state change fans out into 4+ full-state serialisations and writes across three backends**
- File: `src/App.tsx:277-303, src/services/storage.ts:57-63, src/services/firebase.ts:553-562, server.ts:57-71`
- Evidence: App.tsx effect on [appState, currentUser] (line 279) calls saveAppState(appState) synchronously with NO debounce on every state transition; storage.ts:59 does localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) of the whole AppState. The same effect schedules a Firestore save after only 300ms (App.tsx:293), and a second effect (App.tsx:189-198) POSTs JSON.stringify(appState) to /api/state after 1200ms, which makes the server rewrite the whole file (server.ts:284). saveStateToFirestore (firebase.ts:553,558,562) writes the SAME full payload with setDoc to users/{uid}/consoleData/state, again to cloudBackups/{uid}, and for guests a third time to cloudBackups/guest_latest. One chapter toggle therefore costs: 1 synchronous localStorage stringify+write, 1 full HTTP POST + synchronous disk rewrite, and 2-3 full Firestore document writes — of a payload already 136,888 bytes on disk (95KB compact) with only 21 study logs and 0 test scores recorded. Cost grows linearly with every log he adds over the ~18 months to the exam.
- Impact: Main-thread jank on every log/toggle (synchronous ~100KB+ stringify in the render path), 2-3x Firestore write billing and bandwidth for identical bytes, and a server disk rewrite per change. As studyLogs/testScores grow this multiplies; there is no dirty-checking, diffing, or per-entity write anywhere in the app.

**[MEDIUM] Header recomputes streak, per-chapter revision info, retention and the full pacing engine on every render, unmemoised — and the same pacing computation is duplicated by whichever tab is mounted**
- File: `src/components/Header.tsx:98-133`
- Evidence: Header is a plain React.FC with no React.memo and no useMemo anywhere (0 useMemo in Header.tsx). Its body builds a Set from all studyLogs and walks the streak day-by-day (lines 98-113), then for every active chapter calls getChapterRevisionInfo(c, tests, todayStr) AND calculateMemoryRetention(c, todayStr) (lines 118-128), then calls calculateSyllabusPacing over all chapters/logs/tests/scores (line 133). getChapterRevisionInfo itself does tests.filter(t => t.linkedChapterIds.includes(chapter.id)) per chapter (spacedRepetition.ts:~165), so one Header render is O(chapters x tests) plus a full pacing pass. Header re-renders on every App render — including unrelated modal open/close state — and the mounted tab independently repeats the same work: calculateSyllabusPacing is called separately in Header.tsx:133, ShadowArmyMatrix.tsx:891-893, StrategicFlightHub.tsx:75-76, SyllabusPacingFlightPlan.tsx:64-71 and WeeklyAuditModal.tsx:~142, with no shared cache.
- Impact: The most expensive derivations in the app run at least twice per interaction (Header + active view) and again on purely cosmetic re-renders. With 86 chapters x 49 tests this is thousands of redundant object allocations per click, growing as tests/logs accumulate.

**[MEDIUM] ChapterList computes its headline counts outside useMemo (four full passes per render) and calls getChapterRevisionInfo inside sort comparators and per rendered row**
- File: `src/components/ChapterList.tsx:80-99, src/components/ChapterList.tsx:143-154, src/components/ChapterList.tsx:451`
- Evidence: notStartedCount, inProgressCount, firstPassDoneCount and overdueCount (lines 80-99) are plain body code — four separate activeChapters.filter passes, each invoking getChapterRevisionInfo per chapter (which internally scans the whole tests array), executed on EVERY render including each search-box keystroke (searchQuery is local state in this component). Inside the memoised filteredChapters, the 'urgency' and 'stage' sorts call getChapterRevisionInfo(a,...) and getChapterRevisionInfo(b,...) inside the comparator (lines 145-153), i.e. O(n log n) fresh derivations per sort instead of one per chapter. The row rendering at line 451 calls getChapterRevisionInfo(c, tests, todayStr) yet again per chapter. TestRadarFocus has the same pattern in miniature: separate memos at lines 50-79 each re-filter all chapters with getChapterRevisionInfo, the overdue sort at 130-131 calls it inside the comparator, and JSX at lines 300 and 703 calls it per row.
- Impact: Typing in the chapter search box triggers ~86 chapters x (4 count passes + filter pass + ~7 sort comparisons + row renders) x 49-test scans of revision-info computation per keystroke — the UI's most frequent interaction pays the app's heaviest per-item cost several times over.

**[MEDIUM] Narrow MCP read tools build the entire 'everything' dump plus full live analytics, then throw almost all of it away**
- File: `src/services/mcpServer.ts:90-323, src/services/mcpServer.ts:416-502, src/services/mcpServer.ts:960-965`
- Evidence: buildEverythingDump (mcpServer.ts:~90-323) formats every chapter, study log, test, score and action, calls computeLiveAnalytics(state) and calculateSyllabusPacing over the full state. Yet get_study_status (line ~418) calls it only to return dump.tests.slice(0,3) and 5 due chapters; list_due_chapters (~452) and search_chapters (~490) call it and then slice(0, limit); list_tests (~960) calls it for tests.slice(0, limit) and 5 scores. Responses are then JSON.stringify(..., null, 2). The whole implementation is duplicated in executeMcpDirect (same dump calls at lines 2380-2402), so both transports pay it.
- Impact: An MCP client asking 'what is due today' or searching one chapter forces a full-state format + analytics + pacing computation and a pretty-printed serialisation server-side on every call; an AI assistant polling status multiplies this. Cost scales with total history, not with the question asked.

**[MEDIUM] WeeklyAuditModal runs two full retention passes and the full pacing engine on every render, unmemoised, while neighbouring values are memoised**
- File: `src/components/WeeklyAuditModal.tsx:130-143`
- Evidence: weekLogs, weekTests and weekScores are wrapped in useMemo (lines 67-129), but immediately after, plain body code computes activeChapters, then criticalDecayChapters = activeChapters.map(c => calculateMemoryRetention(c, todayStr)) (~line 134), then warningDecayChapters with a SECOND identical map over all chapters (~line 138), then getDecayPreventedStats(chapters, studyLogs) and const pacing = calculateSyllabusPacing(chapters, studyLogs, tests, testScores, pacingSettings, todayStr) (~line 142) — none memoised. Because App re-renders the modal on any appState change while it is open, all of this repeats per interaction.
- Impact: Opening the weekly audit — a modal he uses to plan the week — pays two redundant retention sweeps over 86 chapters plus a full pacing pass on every re-render; one shared memoised retention map would serve both decay lists.

**[LOW] Tab-hide / page-close handler bypasses the cloud-save debounce and fires an extra undebounced triple Firestore write**
- File: `src/App.tsx:306-333`
- Evidence: handleBeforeUnload and handleVisibilityChange (App.tsx:310-329) call saveStateToFirestore(currentUser.uid, appStateRef.current) directly, ignoring debounceTimerRef entirely. A tab switch to hidden therefore fires the full 2-3-document Firestore write immediately, and when the user returns and makes any change, the normal 300ms debounced write fires again with substantially the same payload; beforeunload also races a write that the browser may kill mid-flight, wasting the attempt.
- Impact: Every tab hide/show cycle costs an extra full-payload multi-document Firestore write beyond the already-amplified autosave path, for data that usually has not changed since the last debounced save.

**[LOW] No code splitting: every modal and the 3,875-line Matrix ship in the initial bundle; local interaction state re-renders very large trees**
- File: `src/App.tsx:3-21, vite.config.ts:1-22, src/components/ShadowArmyMatrix.tsx:1951, src/components/ConsistencyHeatmap.tsx:530-550`
- Evidence: App.tsx statically imports all 12 modals plus ShadowArmyMatrix (3,875 lines), TestSchedulePrintModal (2,156) and McpModal (1,726); there is no React.lazy/Suspense/dynamic import anywhere in src and vite.config.ts defines no build/manualChunks options — the whole ~31,600-line src tree is one entry bundle although only one tab and zero modals are visible at a time. Inside components, cheap local state re-renders huge trees: ConsistencyHeatmap's hover (onMouseEnter -> setHoveredDay, ~lines 538-545) re-renders all 364 day cells with getDayCellStyle called per cell; ShadowArmyMatrix search typing (onChange setSearchQuery, line 1951) re-renders the full matrix tree and its subjectGroups memo (lines 1314+) re-filters analyzedChapters roughly ten times per subject per keystroke, with no memoised row components anywhere (no React.memo in src).
- Impact: Slower first load on his machine for screens he may not open in a session, and visible lag risk on hover/search interactions in the two biggest visual components as chapter/log counts grow. Lowest severity: single user, local hosting, current data volume is small.

### Build & typecheck reality (`verification-reality`)

**[HIGH] Green typecheck is vacuous: tsconfig enables no strict flags and React type packages are not even installed**
- File: `tsconfig.json:1-24; package.json:30-39`
- Evidence: tsconfig.json (entire file, lines 1-24) sets target/module/jsx/skipLibCheck:true but NO 'strict', 'noImplicitAny', 'strictNullChecks', 'noUncheckedIndexedAccess' or 'noFallthroughCases' — all default false. package.json:30-39 devDependencies contain only @types/node and @types/express — no @types/react / @types/react-dom (verified: node_modules/@types after install has no react entry). Command evidence: configured `tsc --noEmit` = 0 errors/exit 0, while `--strict` = 7,639 errors dominated by TS7016 'Could not find a declaration file for module react' (29x) and 'react/jsx-runtime' (28x) plus 6,904 TS7026 JSX-implicit-any — i.e. every component's props/JSX are effectively untyped 'any', so the green check cannot catch a misspelled/missing prop anywhere in the UI.
- Impact: The one check Sarthak (or any future fix wave) would trust — 'lint passes' — is near-vacuous for the React layer that renders his due lists, scores and pacing. Prop-shape and null errors in score/sync screens pass silently and only surface at runtime, on his data.

**[HIGH] StrictNullChecks surfaces 67 real errors hidden by the shipped config, several in spaced-repetition, Firestore merge and score code**
- File: `src/services/spacedRepetition.ts:188,305; src/types.ts:33; src/services/firebase.ts:314-335; src/components/LogScoreModal.tsx:106-214`
- Evidence: `tsc --noEmit --strictNullChecks` alone exits 2 with 67 errors the shipped config hides. Concrete core-logic examples: src/services/spacedRepetition.ts:305 assigns `lastStudiedDate: undefined` in the log-deletion/reset path while src/types.ts:33 declares `lastStudiedDate: string | null` (TS2322 at spacedRepetition.ts:305, plus :188 `isCriticalRisk` boolean|undefined -> boolean); src/services/firebase.ts:314-335 cloud/local chapter merge dereferences localCh/cloudCh flagged TS18048 'possibly undefined' (12 errors in firebase.ts, incl. TS2322 Chapter|undefined -> Chapter at :321-322,334-335); src/services/mcpExtensions.ts:907 TS2322 percentage/accuracy `number|undefined` assigned where `number` is required; LogScoreModal.tsx alone has 27 strictNullChecks errors incl. TS2339 properties (testId/totalScore/errors) 'do not exist on type never' at lines 106-214,456-472.
- Impact: The hidden errors sit exactly on the paths he cannot afford to be wrong: deleting/resetting a study log, merging local vs Firestore chapter state, and reading back a logged test score. Types currently lie about nullability there (undefined where the contract says string|null), so serialisation/sync code that trusts the declared type can drop or misread fields without any compiler warning.

**[HIGH] Zero automated tests, zero test runner, zero CI for ~31k lines including the revision and scoring engines**
- File: `package.json:6-13,14-39 (whole repo: no test files)`
- Evidence: Exhaustive find (excluding node_modules/.git) for *.test.* / *.spec.* returned ZERO files across ~30,756 lines of src+server. package.json:6-13 scripts are only dev/start/build/preview/clean/lint — no 'test' script; dependencies+devDependencies contain no vitest/jest/mocha/playwright/cypress/testing-library; there is no .github directory (no CI workflows) and no ESLint config or eslint dependency. The highest-risk pure logic — src/services/spacedRepetition.ts (788 lines, due-date/gap maths), src/services/mcpServer.ts (3,398 lines), src/services/firebase.ts merge (652 lines) — has no executable specification at all.
- Impact: Nothing will catch a regression in revision-gap maths, due-date computation, score aggregation or the sync merge when code changes. For an app whose entire value is correct dates and scores, every future fix is unverifiable except by Sarthak noticing he studied the wrong chapter.

**[MEDIUM] Production build never typechecks: `npm run build` is bare `vite build`, and no CI runs the separate lint script**
- File: `package.json:7-12`
- Evidence: package.json:9 `"build": "vite build"` — the build script does NOT chain tsc (contrast the separate, unchained package.json:12 `"lint": "tsc --noEmit"`). Vite/esbuild transpiles and strips types without checking them. Proof by execution in this run: the same tree where `--strictNullChecks` fails with 67 errors produced `npm run build` exit 0 ('✓ built in 40.18s'). With no CI present (no .github), nothing anywhere in the repo's own workflow ever requires lint to pass before a build is used or deployed; server.ts is likewise only ever run via tsx (package.json:7-8), which also transpiles without typechecking.
- Impact: A tree with broken types builds and runs identically to a clean one. Combined with the vacuous tsconfig, there is no point in the dev/build/run pipeline where a type-level defect in his study data handling is forced to surface.

**[LOW] Single 1.55 MB unsplit JS chunk: build warns and no code-splitting exists**
- File: `vite.config.ts:1-22; build output (npm run build)`
- Evidence: Build output verbatim: 'dist/assets/index-DvhiNGSF.js 1,551.97 kB │ gzip: 377.89 kB' followed by '(!) Some chunks are larger than 500 kB after minification. Consider: Using dynamic import() to code-split'. vite.config.ts (602 bytes, whole file) defines plugins/alias/server only — no build.rollupOptions.output.manualChunks and no lazy routes; large rarely-opened surfaces such as McpModal.tsx (1,726 lines), TestSchedulePrintModal.tsx (2,156 lines) and ShadowArmyMatrix.tsx (3,875 lines) are all in the single entry chunk.
- Impact: Every launch — including a quick phone/local check of today's revisions — downloads and parses the full 1.55MB/378kB-gzip bundle including print/MCP machinery. Limited blast radius for a personal local tool, but it is the only build warning the repo produces and it is unaddressed.

**[LOW] Duplicate vite declaration and dead clean target: package.json scripts/deps are template leftovers**
- File: `package.json:11,17-18,27,37`
- Evidence: package.json declares "vite": "^6.2.3" TWICE — line 27 under dependencies and line 37 under devDependencies (`bun install` flagged the duplicate specification). Build-only tooling (@vitejs/plugin-react line 18, @tailwindcss/vite line 17, vite line 27) sits in runtime dependencies. package.json:11 `"clean": "rm -rf dist server.js"` deletes a server.js that no script ever creates: scripts run the server from TypeScript via tsx (lines 7-8) and build emits only dist/.
- Impact: Duplicate/confused dependency declarations make installs resolve by installer-specific dedup rules (bun vs npm can pick differently) — a small reproducibility hazard for an app with no lockfile for npm (only bun.lock exists) and no tests to catch a bad resolution. Dead clean target shows the scripts were template-copied and never reconciled with how the app actually runs.

---


---

## Round 2 fresh-eyes additions — kept (31 of 32)

- server-state.json: ch-phy-01 has two identical non-quick progress logs (50%, conf 3, hoursSpent 1.5) 13.9s apart (ts 1791627436865/1791627450717) — one session double-logged.
- seedData.ts: all 49 tests have createdAt '2026-05-15' yet every chapter has createdAt '2026-06-01' — tests claim creation 17 days before the chapters they link existed.
- spacedRepetition.ts:137-138 a completed chapter whose nextRevisionDate is lost (sync/import) is labelled 'scheduled' forever — never overdue, silently out of the due queue; R1 missed it.
- spacedRepetition.ts:246-252 progress branch sets revisionCount=0, nextRevisionDate=null unconditionally — a stage-less chapter with revisionCount>=1 loses all revision history to one partial log.
- spacedRepetition.ts:461 a future-dated lastStudiedDate clamps daysSince to 0, pinning retention at 100% and all projections at day 0 — one typo'd future date makes a chapter look perfectly retained.
- spacedRepetition.ts:334 recalc sets currentConfidence = latestLog.confidenceRating || 3 — after a deletion, an unrated latest log fabricates 'Moderate 3' that then drives gap and retention math.
- spacedRepetition.ts:678-687 if syllabus target >= exam date, Math.max(1,negative) clamps the revision window to 1 day and required revision velocity explodes (~1800/wk), no impossible-window flag.
- spacedRepetition.ts:536-548 totalSavedCount increments per log PAIR while rescuedChapters lists a chapter once — five logs 7+ days apart = 4 'saves' for one chapter; count and list disagree.
- firebase.ts:241-246 merge aborts wholesale if either side has 0 chapters, returning the other side untouched — cloud's newer logs/tests/scores/settings silently discarded, not merged per-collection
- firebase.ts:33-44 getDeviceClientId's catch returns a fresh random id on EVERY call (no memory cache): with storage blocked, save/subscribe use different ids, so own writes look foreign and re-merge
- firebase.ts:348-379 merge maxes lastStudiedDate across both sides but takes nextRevisionDate/revisionCount/confidence from base only — hybrid no device had, due date from a superseded session
- firebase.ts:250-261 log merge unions by id only, never content: same session logged on two clients under different ids survives twice, double-counting history and session tallies
- spacedRepetition.ts:224 every 100% log recomputes daysTakenToComplete to that log's date, while firstPassCompletedDate is preserved — later revisions rewrite how long first pass took
- spacedRepetition.ts:267 timestamp=Date.now() (entry, not dateStudied); :327 recalc sorts by timestamp, so a backfilled old log becomes latest and resets lastStudied/confidence on deletion
- QuickAddChapterModal.tsx:40-50 never asks/sets classLevel; ChapterList.tsx:128 filters by classLevel — quick-added Class-12 chapters can never match '12' and are grouped as 11 elsewhere
- Future tests can be scored before being sat: LogScoreModal.tsx:455-465 lists all unlogged tests, no date gate; TestManager offers Log Score on upcoming tests too — saving marks them COMPLETED.
- Editing destroys the prior record: App.tsx:620-630 mints new id + timestamp=now and filters out the old score; no history/undo — one bad save irretrievably replaces the real score.
- Duplicate scores per test disagree by screen: TestManager.tsx:93-98 scoreMap lets LAST win; LogScoreModal.tsx:107,177 find() lets FIRST win — analytics and edit form can show different scores.
- Quick counts unbounded: LogScoreModal.tsx:793-815 quick correct/incorrect/unattempted inputs have no min/max and save verbatim; clearing the total coerces it to 0 via Number('').
- log_study_session has no first-pass gate: default revision_round_complete on a NOT_STARTED chapter bumps revisionCount, sets IN_REVISION+nextRevisionDate (mcpServer.ts:857,883-890; direct ~2812)
- Dev-mode Vite middleware (server.ts:294-300, the default launch) serves project-root files via /@fs/<abs path>: data/server-state.json and any .env are readable by anyone reaching the 0.0.0.0 host ✓
- POST /api/mcp batch: a null item throws in executeMcpDirect before its try block (mcpServer.ts:1899-1904); Promise.all then 500s the whole batch (server.ts:151-157) after sibling mutations persisted
- /api/mcp/info builds baseUrl from unvalidated Host/X-Forwarded-Proto and embeds it in paste-ready client configs (server.ts:176-178): a spoofed-Host request poisons the MCP URL a client copies
- oneYearData.ts:152-153: every 4th log is sessionType 'revision_round_complete' at only 50% completion, and every i%4==3 'progress' log claims 100% — the logs contradict their own fields
- oneYearData.ts:144: log revisionNumber = floor(i/55)+1 from the global log index, not per chapter — a chapter's first-ever log can claim revision #4 while its record shows revisionCount 0
- oneYearData.ts:185-233: daysTakenToComplete contradicts the generator's own dates — Grade S started/completed dates are 60 days apart but the field says 12; Grades A/B span 50 days but say 14
- SettingsModal.tsx:1149: success toast claims '492→680+' and 'full 52-week heatmap populated'; actual scores run 485→681 and logs cover only 230/365 days, longest streak 2 days
- App.tsx:241-246: finally sets isInitialCloudLoadDone=true even when initial Firestore load FAILED; gate at :287 then opens and the next local edit blind-overwrites the never-read cloud doc. ✓
- storage.ts:47: loadAppState fabricates updatedAt=Date.now() when stored value is missing/0 — every reload re-dates stale local state newest, corrupting merge isCloudNewer settings/pacing picks. ✓
- storage.ts:40 accepts studyLogs with no per-item validation; firebase.ts merge skips logs without id, and App.tsx:229-233 saves merged result back — id-less logs vanish from all stores.
- App.tsx:293-300: debounceTimerRef is never cleared on unmount or logout; a save armed <300ms before sign-out fires after it, writing to the captured previous uid and racing the anon re-login merge.

---

## Appendix A — Already struck by Round 2 (18) — not cut by this filter, removed earlier

These were removed before this filter existed (wrong, by-design, or inside code that never runs). They are listed so the counts reconcile: 544 − 18 − 120 = 406.

- **storage-seed** — Seed pacing goal contradicts the seeded test schedule: 25-mock target alongside 49 seeded tests and includeAllTestsGoal=true
- **storage-seed** — Experimental/practical physics is seeded as two overlapping chapters, double-counting it in the syllabus
- **security-surface** — GET /api/mcp/info unauthenticatedly publishes the full attack map
- **spaced-repetition** — Revision info fabricates 25% completion for studied chapters with no recorded percentage
- **sr-science** — Not SM-2: fixed [3,7,14,30] ladder is marketed to him and to AI agents as 'SuperMemo SM-2' that 'calculates optimal intervals' and 'eliminates the forgetting curve'
- **hardware-te** — RotaryKnob is not rotary: drag is vertical-only, circular pointer motion is ignored
- **hardware-te** — RotaryKnob steppers and snap labels emit out-of-range values — clamping is display-only
- **hardware-te** — RotaryKnob stepped values carry raw floating-point error into the display and snap matching
- **hardware-te** — RotaryKnob disc has no keyboard support or slider semantics
- **hardware-te** — MechanicalSlider's orientation="vertical" prop is accepted and silently ignored
- **hardware-te** — MechanicalSlider never clamps its percentage and its ruler ticks don't match the step stops
- **hardware-te** — MechanicalSlider's only real control is invisible — no focus indicator and no accessible name
- **settings** — Font/onSetFont props are dead plumbing and the typography 'setting' is a static card stamped LOCKED & ACTIVE
- **confidence-color** — getDecayStatusTier speaks a vocabulary the decay engine never produces — the real 'safe' status falls through to Unrated
- **confidence-color** — getPaceTier fails open to Amber 'Moderate' for any unknown status instead of Unrated
- **syllabus-truth** — Haloalkanes (ch-chm-17) is class 12 by level but sits in the all-class-11 cluster 11
- **dead-code** — Font selection plumbing is dead end-to-end: single-value type, ignored state, unused Settings props
- **performance** — Entire state lives in ONE Firestore document while actionHistory grows without any cap — the payload is on a collision course with Firestore's 1 MiB document limit

---

## Appendix B — Everything this filter cut (121) — full list

Every cut finding, by title, so you can check the filter itself against the combined audit. 120 from Round 1 + 1 fresh-eyes item.


### Cut: sr-science (10)

- A failed recall never resets anything: rating 1/5 after 4 passes still yields 27-day 'stability' and a 15-day wait
- Scheduler and retention model disagree: a chapter comes due at anywhere from 57% to 76% 'retention' depending on confidence, with no consistent target threshold
- 'Decay Prevented / rescued' tally is fabricated: any two logs >=7 days apart count as a rescue from critical loss, even at 95% retention
- Any touch of a completed chapter — including a 'progress' log — is counted as a full revision round and inflates memory stability; cramming equals spacing
- Retention percentages are presented as 'real-time biological memory retention probability' but are uncalibrated inventions driven by a self-rating, with no recall ever measured
- Retention model ignores his configured settings entirely, so customising intervals silently desynchronises the two halves of the system
- Decay forecast: daysAhead parameter is silently ignored, and headline averages exclude unstudied chapters while counting them as analysed
- A chapter shows 100% retention on the day he failed it, and a barely-started chapter gets full first-pass stability
- Gap ladder and stability both saturate at pass 4, contradicting the pacing engine's own revision plan for the Dec-to-May window
- Overdue and SAFE are shown simultaneously: the two status systems contradict each other for days at a time

### Cut: print-schedule (7)

- Preparation checkboxes are invisible: .checkbox-box has no size and no screen definition
- Minimal Date Sheet ignores every column-visibility and syllabus toggle
- Cards and Subject-Matrix layouts silently ignore syllabusFormat/checklistType, dropping or forcing chapters
- Column toggles are not independent: subject scores, mistake log and countdown are nested inside other toggles
- Coaching filter splits one coaching into incomplete printouts and cross-matches by title
- Density control is effectively dead: 'Roomy (Handwriting)' adds no writing space
- Copy-to-clipboard fails silently and print iframes are never cleaned up

### Cut: mcp-modal (9)

- Tool count is wrong everywhere (31 claimed, 32 listed, 33 actual) and get_feature_manifest is missing from the UI
- Six state-mutating playground tools never trigger a UI refresh, leaving the app stale
- 'FORM CONTROLS' mode has no controls for 24 of 32 tools and hides the targets of the rest
- Resources directory: labelled 9, lists 10, omits a real resource and advertises one the direct endpoint cannot read
- Cline / Roo Code (VS Code) config tab is a dead button with no content
- Self-test declares '100% HEALTHY' on thresholds far below the real catalog
- Directory claims batch logging is 'Atomic' — the server silently skips bad items and reports success
- Playground call history is recorded but never displayed
- Manifest deep-dive dropdown omits the server's mcp_server subsystem and sends a phantom argument to its alias

### Cut: feature-manifest (21)

- buildWorkingAnalytics reports a subject filter it never applies
- Syllabus chapter distribution in the manifest is wrong on every subject
- Study Session Generator description is fabricated: no Pomodoro blocks, no unified urgency formula, three divergent implementations
- Forensic audit log claims immutability, microsecond timestamps and logging of every interaction — none is true
- Decay Prevented tally counts ordinary study gaps as 'rescues from critical loss', repeatedly per chapter, including archived chapters
- Mock attempt rate computed by a different formula than the one the manifest documents, with an invented 180-question denominator
- Subject telemetry double-counts chapters and uses a different 'completed' definition than the headline syllabus numbers
- Average mock score percentage hardcodes /720, ignoring each score's real maxScore
- Spaced-repetition queue in analytics uses different due-soon, urgency and critical-risk definitions than the rest of the app
- 52-week heatmap description invents an hours-based intensity formula and 365 cells; the real heatmap is session-count colours over 364 cells
- Weekly Audit description claims Sunday gating, weekly hours, compliance rate and weakest-3 surfacing that are not implemented
- Persistence description names the wrong storage key, wrong debounce, and omits the Firestore tier entirely
- MCP tools directory invents a non-existent tool and omits roughly a third of the real tools
- detailedFeature filter silently returns an empty catalog for most documented filter values
- Manifest's revisionCount schema is off by one against the code and against its own analytics
- Pacing feature description hides the velocity conditions and the invented fallback behind pace status
- Confidence trend and score trajectory order by log-creation timestamp, not by the date studied or the test date
- totalChapters falls back to a phantom 86 when there are no active chapters
- Mock Test Radar readiness formula in the manifest does not match the implemented readiness
- Hardware deck schema invents audioMuted/hapticEnabled settings; print schema invents a viewMode field
- Manifest metadata stamps version 2.2.0, a version that exists nowhere else in the app

### Cut: header-theme (10)

- Theme switching is a placebo for almost the whole UI: ~50 theme tokens are defined but almost nothing consumes them
- Header streak is computed in UTC while study-log dates are local — streak breaks/undercounts every early morning in IST
- Header 'Syllabus %' and the pacing engine's completion % use different stage rules and can disagree on the same data
- Overdue count is hidden from the header precisely when critical decay also exists, and the overdue pill is not clickable
- '30+ Spectrum' and 'Hyper-Chroma 15+' colour claims are false in the CSS: no 30 colours exist, and the 19 chroma tokens are dead
- Crayon-Light and Vibrant-Prism theme blocks are incomplete token sets, and there is no .theme-classic rule at all
- Header SFX label desynchronises from the real sound state when sound is toggled elsewhere
- Saved non-classic theme flashes the classic look on every load; theme is only applied in a post-paint effect
- Dead CSS and an undefined layout class: unused keyframe utilities ship, and the app root's te-dot-grid has no rule
- Theme toggle tooltip documents a 3-theme cycle that omits Hyper-Chroma, and the loaded Sora weights cannot render the header's font-black

### Cut: design-system (12)

- HardwareDeck LED VU meters have no CSS: te-led-bar/te-led-cell/active-* classes are never defined
- Subject colours are not synchronized despite an in-code claim they are: Chemistry is purple on some screens, orange on others
- Confidence-tier colours collide with subject colours, so a badge's hue is ambiguous
- Unlayered .te-* classes silently defeat Tailwind overrides, so intended orange CTAs render white
- App root uses an undefined te-dot-grid class; the chassis texture never renders
- Two of the three hardware widgets are dead code; the third ignores its colour prop
- Mastery Matrix (tab 00) abandons the hardware language for a glowing purple 'cyber' theme
- Declared type stack is not followed: whole surfaces run in mono, and the font 'system' is inert
- Micro-type and low-contrast amber defeat the stated legibility standard
- #FF3B00 is sprayed, not reserved — and split across eight indistinguishable oranges
- Zero-green discipline is breached by Settings' own green accent
- Radius and shadow vocabulary drifts across at least nine steps

### Cut: hardware-te (8)

- SFX rocker state desyncs from the sound engine and from the other two SFX toggles
- RotaryKnob and MechanicalSlider are never imported — dead components controlling nothing
- LED channel meters use Math.ceil and overstate every subject's revision percentage
- RockerSwitch is a clickable div — no keyboard or screen-reader access at all
- All pitch/frequency arguments from the TE widgets are thrown away by the sound engine
- TE click sounds are mis-ordered and double-fired
- HardwareDeck reads c.isOverdue, a field Chapter does not have — dead, always-zero telemetry
- HardwareDeck ships dead wiring: unused urgencyOnly state, unused tests prop, and an Add-Test handler with no button

### Cut: settings (3)

- Confidence multipliers — half the scheduling algorithm — are loaded and saved but have no editor anywhere in the modal
- Typography 'live preview' fabricates telemetry: '97 Syllabus Chapters' and a 685/720 score for an app with 86 chapters
- Copy-hex feedback claims success even when the clipboard write failed

### Cut: tutorial-misc (8)

- Tutorial teaches 4 pillars but the app has 5 — Anki is silently omitted from 'non-negotiable' readiness
- Tutorial's 'days you have been actively studying' is really calendar days since start, including days never studied
- Every sounded button plays twice: global click interceptor stacks on top of explicit play* calls
- Four sound methods silently discard their parameters — pitch, frequency, duration and toggle state are all fake
- Fullscreen toggle races itself: duplicate hook instances, key repeat and rapid presses all act on stale state
- Tutorial attributes the Pending Results queue to the Test Radar; it actually lives in Test Manager
- 'F' fullscreen shortcut collides with the Mastery Matrix 'f' Codex toggle — one keypress does both
- toggleBrowserFullscreen reports success and plays the success click when no fullscreen API exists at all

### Cut: confidence-color (5)

- Overdue urgency colours are inverted: every real caller passes Math.abs(), so overdue chapters can never render red/orange
- The two 'universal' mappers disagree: score tiers and percentage tiers give different colours for the same performance, displayed side-by-side
- getScoreConfidenceTier ORs percentage with absolute 720-scale marks, breaking its own maxScore parameter
- A real score of 0 (or negative) is coloured 'Unrated' — measured worst performance is conflated with no data
- getConfidenceTier silently rounds fractional averages half-up, inflating subject mastery labels

### Cut: accessibility-responsive (13)

- No modal manages focus: no trap, no initial focus, no focus return, no Escape-to-close in any of the 11 modals
- Dialogs and icon-only buttons are unnamed for assistive tech: only 1 of 11 modals is a dialog, 8 aria-labels in the entire app
- TE hardware controls are not keyboard/AT operable: RockerSwitch is a clickable div, RotaryKnob is drag-only, MechanicalSlider focus is invisible and unlabelled
- Core actions are mouse-only clickable divs: bulk-deadline chapter selection and Matrix chapter inspection have no keyboard path
- Consistency heatmap data is hover-only and colour-only: 364 day cells unreachable by touch or keyboard
- Form labels are not associated with their controls anywhere in the modals
- Confidence-tier and grey text colours fail WCAG contrast at the sizes used
- Global 'F' key shortcut hijacks a screen-reader navigation key and fires from buttons
- Focus is invisible in the score-entry grid and on custom buttons: outlines removed with no replacement style
- Small-screen behaviour breaks the dense visualisations: 720px-minimum heatmap, 3px-wide chapter cells, zoom controls hidden on mobile
- Type is locked at fixed pixel sizes (9-11px dominant) that ignore OS/browser text scaling
- No respect for prefers-reduced-motion; sound effects default on with a global click interceptor
- Header state is visual-only: no aria-current on nav tabs, sync status text hidden on mobile, sub-24px tap targets

### Cut: dead-code (14)

- Forensic audit log records nothing from the UI despite claiming every mutation is logged
- OverdueAndDueList: entire 402-line due/overdue console is never imported or rendered
- SyllabusPacingFlightPlan: entire 433-line pacing screen is dead duplicate of StrategicFlightHub
- Manifest advertises rotary knobs and mechanical sliders that are never mounted anywhere
- Declared Gemini API capability and @google/genai dependency have zero implementation
- Confidence multipliers are saved by Settings but no UI control can ever change them
- includeAllTestsGoal cannot be toggled in any live screen, though it changes his test-pace denominator
- studyDaysPerWeek is stored, documented and hardcoded on save, but never read by the pacing maths
- Chapter.notes is writable via MCP and synced, but no UI surface displays or edits it
- tutorialCompleted in AppState is dead: the tutorial gate uses an unrelated localStorage key
- BulkDeadlineModal cluster filter is wired into the predicate but has no control
- TestManager analytics test-selector state is declared and never used
- HardwareDeck contains a dead urgency toggle, an unused tests prop, and an overdue count over a non-existent field
- Bundle of dead exports, aliases and never-called sound methods with zero call sites

### Cut: fresh-eyes additions (1)

- No delete-score path: App.tsx:620-632 only upserts by testId, TestManager offers Edit only — a mistaken/fabricated score can never be removed, only overwritten. ✓

---

*Built 2026-10-31 from AUDIT_GMC_FINAL_COMBINED.md at Sarthak's request. The combined file is unchanged and remains the complete record.*
