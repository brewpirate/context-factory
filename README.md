# context-factory

A Claude Code plugin for creating pre-configured agent sessions. Freeze a fully loaded session — with skills, paths, rules, tools, and validation all established — then clone it instantly into any future session with zero setup time.

![Context Factory](context-factory.png)

---

## The idea

Claude Code agents configured via prompt files or hooks are advisory — Claude may drift from them. But context that has been **established in a conversation** is ground truth. Claude treats it as things that already happened, not instructions to follow.

Context Factory lets you:
1. Start a session and build up the full context you want — load skills, explore paths, establish rules, run validation commands, make decisions
2. **Freeze** that session — capturing everything as structured ground truth
3. **Clone** it into any future session — all of that context comes back as established fact, not a prompt

The result is pre-configured agents (frontend, backend, data, etc.) that are ready to work immediately with no setup time.

---

## Install

### Option A — Global symlink (recommended for development)
```bash
ln -s /path/to/context-factory-main ~/.claude/plugins/context-factory
```
Changes to the plugin directory take effect immediately — no re-copying needed.

### Option B — Global copy (all projects)
```bash
cp -r context-factory-main ~/.claude/plugins/context-factory
```

### Option C — Project-local
```bash
cp -r context-factory-main .claude/plugins/context-factory
```

### Option D — Load without installing (per session)
```bash
claude --plugin-dir /path/to/context-factory-main
```

After installing, restart Claude Code to pick up the plugin.

---

## Setup (once per project)

```
/context-factory:init-factory
```

This creates `./context-factory/` for snapshots, installs the loader skill into `.claude/skills/`, and optionally adds `context-factory/` to `.gitignore`.

---

## Commands

| Command | Description |
|---|---|
| `/context-factory:init-factory` | Bootstrap context-factory in the current project |
| `/context-factory:freeze` | Save a complete snapshot of the current session |
| `/context-factory:clone` | Browse snapshots and fork one into the current context |

---

## Workflow: Creating a pre-configured agent

### Step 1 — Build the session

Start a fresh Claude Code session and establish everything your agent needs to know:

```
> Load the component-generator skill
> Here's our project structure: [paste tree]
> We use TypeScript strict mode, React 18, Tailwind CSS
> Components always go in src/components/<feature>/index.tsx
> Run `npm run typecheck && npm run lint` to validate before finishing
> Never use default exports
> [run some commands, explore paths, confirm things]
```

Everything you establish becomes part of the conversation history.

### Step 2 — Freeze it

```
/context-factory:freeze

Session name: frontend-agent
Description: React/TypeScript frontend specialist with full project context

Checkpoint files (or Enter to skip): src/components src/styles tsconfig.json
```

Context Factory captures **everything** from the session:
- Which skills were loaded and active
- The full directory structure that was explored
- Every rule and convention stated
- Every command run and its output
- Every decision made

### Step 3 — Clone it in any future session

```
/context-factory:clone

  [1] frontend-agent  📦 checkpointed
      "React/TypeScript frontend specialist with full project context"
      session_id: 4a7f2c1e  |  msgs: 24  |  created: 2025-03-12T14:22:00Z
      last cloned: never

Enter number: 1
Restore checkpointed files? [y/n]: y

Forking from "frontend-agent" (4a7f2c1e)...
Lineage: 4a7f2c1e → <new-session-id>

✓ Context loaded. Ready to continue.
```

The new session picks up with all that context as established ground truth — skills already loaded, paths already known, rules already in effect, validation steps already defined.

---

## What gets captured on freeze

`/context-factory:freeze` captures everything established in the session under structured headings:

| Section | What's captured |
|---|---|
| **Skills** | Every skill loaded or confirmed active |
| **Stack & Environment** | Languages, frameworks, versions, package manager |
| **Key Paths** | Every file and directory explored, with actual tree output |
| **Tools & Commands** | Every command run and its full output |
| **Rules & Conventions** | Every rule stated, quoted exactly |
| **Validation** | Exact validation commands and what passing looks like |
| **Decisions & Facts** | Everything established as fact during the session |
| **Open Work** | Anything started but not finished |

---

## File checkpointing

Because forking branches conversation history only — file changes made in a session are real and shared — `/context-factory:freeze` lets you checkpoint files alongside the snapshot:

```
Checkpoint files (or Enter to skip): src/components src/config.json
```

Checkpointed files are stored at `./context-factory/checkpoints/<slug>/`. When cloning, you'll be offered the option to restore them to their checkpointed state — useful when branching to explore an alternative approach.

---

## Snapshot format

Each snapshot is a plain markdown file in `./context-factory/<slug>.md`:

```markdown
---
name: frontend-agent
description: React/TypeScript frontend specialist with full project context
session_id: 4a7f2c1e-9b3d-4e2a-8c1f-7d6e5b4a3c2d
message_count: 24
created: 2025-03-12T14:22:00Z
last_cloned: null
cloned_from: null
---

# Conversation Summary

Purpose and state of this agent in plain language.

# Key Context

#### Skills
- component-generator (loaded and confirmed active)

#### Stack & Environment
- TypeScript 5.3 strict mode
- React 18.2, Tailwind CSS 3.4
- Node 20, npm

#### Key Paths
- src/components/   — UI components, one dir per feature
- src/styles/       — global styles and tokens
...

#### Rules & Conventions
- Never use default exports
- Components always typed with React.FC<Props>
...

#### Validation
- `npm run typecheck && npm run lint` — must pass before finishing
...
```

Snapshots are plain markdown — readable, editable, and committable.

---

## File structure

```
context-factory-main/             ← plugin root
  plugin.json
  skills/
    init-factory/
      SKILL.md
      init.js                     ← creates dirs, installs loader skill
    freeze/
      SKILL.md                    ← instructs Claude to capture everything
      freeze.js                   ← writes snapshot + checkpoints files
    clone/
      SKILL.md
      clone.js                    ← list / stamp / restore subcommands

.claude/                          ← installed into your project by /init-factory
  skills/
    context-factory-loader/       ← teaches Claude the freeze/clone protocol

context-factory/                  ← snapshots (project root, gitignored by default)
  frontend-agent.md
  backend-agent.md
  checkpoints/
    frontend-agent/               ← file checkpoint for that snapshot
      src/components/
      tsconfig.json
```
