---
name: init-factory
description: Bootstrap Context Factory in this project. Creates the snapshot directory, installs the loader skill, and optionally updates .gitignore. Run this once before using /freeze or /clone.
allowed-tools: Bash
---

!`node "${CLAUDE_SKILL_DIR}/init.js"`

The script above ran and output JSON. Parse it and follow these steps:

1. If `error` is set, report it to the user and stop.

2. Report what happened based on `steps`:
   - `foundry-dir` created → "Created `./context-factory/`"
   - `foundry-dir` already-exists → "`./context-factory/` already exists"
   - `loader-skill` installed → "Installed loader skill to `.claude/skills/context-factory-loader/`"
   - `loader-skill` updated → "Updated loader skill at `.claude/skills/context-factory-loader/`"

3. Ask the user: "Add `context-factory/` to .gitignore? Snapshots are local by default. [y/n]"

4. If yes, run: `node "<scriptPath from JSON output>" --add-gitignore`
   Then report the gitignore result:
   - `added` → "Added `context-factory/` to `.gitignore`"
   - `created` → "Created `.gitignore` with `context-factory/` entry"
   - `already-present` → "`context-factory/` already in `.gitignore`"

5. Show the final confirmation:

```
✓ Context Factory initialised

  ./context-factory/                         ← snapshots saved here
  .claude/skills/context-factory-loader/     ← skill installed

Commands available in this project:
  /freeze   — snapshot the current session
  /clone    — fork a prior session into this one

Run /freeze at any time to save your progress.
```
