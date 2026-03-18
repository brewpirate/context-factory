---
name: freeze
description: Snapshot the current session into ./context-factory/. Captures everything established in this session — skills, tools, paths, rules, commands run, outputs, decisions — so a cloned session picks up with full fidelity.
allowed-tools: Bash
---

Save a complete snapshot of this session. Follow these steps exactly:

## Step 1 — Gather info

Ask the user these two questions, one at a time:
1. **Session name** — short, memorable (e.g. "Frontend Agent", "Backend Agent")
2. **Description** — one sentence describing what this agent/session is configured for

## Step 2 — Ask about file checkpointing

Ask: "Do you want to checkpoint any files or directories so a cloned session can revert to this state? Enter paths separated by spaces, or skip to continue."

If the user responds with nothing, "skip", "no", "n", or any empty/negative response — treat it as no checkpoint and move on immediately to Step 3. Do not ask again.

## Step 3 — Capture everything

Go through the entire conversation and extract **everything** that was established. Be exhaustive — this snapshot is the sole source of truth for any future session cloned from it. Miss nothing.

Produce two sections:

---

### Conversation Summary

A clear description of what this session is for and what was configured. Not a recap — a statement of purpose and state. Write it so someone reading cold understands exactly what kind of agent this is and what it's ready to do.

---

### Key Context

Capture everything under structured headings. Include actual outputs, not paraphrases. If a command was run, include its output. If a file tree was explored, include the tree. If a rule was stated, quote it exactly.

Use this structure (omit sections that don't apply):

#### Skills
List every skill that was loaded or confirmed active in this session.

#### Stack & Environment
Language, framework, runtime versions, package manager, build tools — anything discovered or stated.

#### Key Paths
Every file path and directory that was referenced, explored, or established as significant. Include the actual directory structure if it was shown.

#### Tools & Commands
Every tool used and every command run. Include the full output if it was shown and is relevant.

#### Rules & Conventions
Every rule, coding standard, convention, or constraint that was stated or agreed upon. Quote them exactly as established.

#### Validation
Every validation step that was run or defined. Include exact commands and what passing looks like.

#### Decisions & Facts
Every decision made, fact established, or piece of information provided that a future session must know. If the user told Claude something, it goes here.

#### Open Work
Anything that was started but not finished, or explicitly noted as a next step.

---

## Step 4 — Save the snapshot

Run this command, substituting all values:

```bash
echo '<json>' | node "${CLAUDE_SKILL_DIR}/freeze.js"
```

Where `<json>` is a single-line JSON object with these fields:
- `sessionId` — `${CLAUDE_SESSION_ID}`
- `name` — the name the user gave
- `description` — the description the user gave
- `messageCount` — your best count of assistant turns in this conversation
- `clonedFrom` — the parent session_id if this session was started via /clone, otherwise `null`
- `summary` — your Conversation Summary (escape newlines as `\n`)
- `keyContext` — your full Key Context (escape newlines as `\n`)
- `checkpoint` — array of file/dir paths to checkpoint, or omit if none

## Step 5 — Confirm

Parse the JSON output. If `error` is set, report it and stop.

Otherwise confirm:
- File saved: `<filePath>`
- Session ID: `<sessionId>`
- If `checkpoint` is present, list `checkpoint.copied` and warn on any `checkpoint.failed`
