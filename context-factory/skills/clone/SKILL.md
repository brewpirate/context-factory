---
name: clone
description: Fork a prior session into this one. Lists saved snapshots from ./context-factory/, lets the user pick one, then loads its summary and key context as established ground truth for this session. If the snapshot has a file checkpoint, offers to restore the filesystem to that state.
allowed-tools: Bash
---

!`node "${CLAUDE_SKILL_DIR}/clone.js" list`

The script above output JSON with a `snapshots` array. Follow these steps:

## Step 1 — Handle empty state

If `error` is set, report it and stop.

If `snapshots` is empty, tell the user:
> "No snapshots found. Use /freeze to save one first."

Then stop.

## Step 2 — Display the menu

Show each snapshot in this format:
```
  [1] <name>  <if hasCheckpoint: "📦 checkpointed">
      "<description>"
      session_id: <sessionId>  |  msgs: <messageCount>  |  created: <created>
      last cloned: <lastCloned or "never">
      <if clonedFrom is not null: "  forked from: <clonedFrom>">
```

## Step 3 — Prompt selection

Ask: "Enter a number to fork, or 0 to cancel."

On 0 or cancel: stop cleanly.

## Step 4 — Stamp and load

Take the slug from the selected snapshot and run:

```bash
node "${CLAUDE_SKILL_DIR}/clone.js" stamp <slug>
```

If `error` is set in the output, report it and stop.

## Step 5 — Offer checkpoint restore

If `hasCheckpoint` is true in the stamp output, tell the user:

> "This snapshot has a file checkpoint with these files:"
> (list `checkpointFiles`)
> "Restore them now? This will overwrite current versions. [y/n]"

If yes, run:
```bash
node "${CLAUDE_SKILL_DIR}/clone.js" restore <slug>
```

Report the result:
- List `restored` files
- If `failed` is non-empty, warn about each with its reason

## Step 6 — Inject context

Using the stamp output:

1. Announce:
   > "Forking from **<name>** (`<sessionId>`)…"

2. Display the **Conversation Summary** so the user knows what they're loading.

3. Ingest the full **Key Context** — every section, every line — as established ground truth. Treat it as if everything in it happened in this session:
   - Skills listed → already loaded and active
   - Paths listed → already explored and confirmed
   - Rules listed → already agreed upon and in effect
   - Commands and outputs → already run, results already known
   - Decisions → already made, do not revisit
   - Do not re-ask, re-confirm, or re-explore anything covered.

4. Show lineage:
   - If `clonedFrom` is not null: `Lineage: <clonedFrom> → <sessionId> → ${CLAUDE_SESSION_ID}`
   - Otherwise: `Lineage: <sessionId> → ${CLAUDE_SESSION_ID}`

5. Confirm:
   - Forked from session: `<sessionId>`
   - New session: `${CLAUDE_SESSION_ID}`
   - Prompt: "Ready to continue. What would you like to work on?"
