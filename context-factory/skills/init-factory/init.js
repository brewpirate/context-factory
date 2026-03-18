import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const cwd = process.cwd();
const args = process.argv.slice(2);
const addGitignore = args.includes('--add-gitignore');

const LOADER_SKILL_CONTENT = `---
name: context-factory-loader
description: Load, restore, and fork saved Claude sessions from context-factory snapshots. Use this skill whenever the user mentions context-factory, wants to resume a prior session, says things like "load my session", "restore context", "pick up where I left off", "continue from snapshot", "fork a session", references a .md file in ./context-factory/, or uses /freeze or /clone commands. Always trigger this skill before attempting to read any context-factory snapshot files — it defines the correct loading protocol.
---

# Context Factory Loader

Handles reading and injecting snapshot context from \`./context-factory/\` into the current session.

## When this skill triggers

- User runs \`/clone\` or \`/freeze\`
- User says "load session", "restore context", "continue from", "pick up where we left off"
- User references a snapshot by name or file path
- User asks what sessions are available

---

## /freeze — Save a snapshot

1. Ask the user (one at a time):
   - **Session name** — short, memorable
   - **Description** — one sentence

2. Collect metadata:
   - \`slug\` — lowercase, hyphens: \`"My Feature"\` → \`my-feature\`
   - \`session_id\` — use \${CLAUDE_SESSION_ID}
   - \`created\` — current UTC timestamp in ISO 8601 format
   - \`message_count\` — count of assistant turns in this session
   - \`last_cloned\` — \`null\` unless file already exists (preserve existing value)
   - \`cloned_from\` — \`null\` unless this session was forked (use parent session_id)

3. Write the file to \`./context-factory/<slug>.md\`:

\`\`\`
---
name: <name>
description: <description>
session_id: <session_id>
message_count: <count>
created: <iso-timestamp>
last_cloned: null
cloned_from: null
---

# Conversation Summary

<3–5 sentences: what was accomplished, key decisions, outputs produced>

# Key Context

<Bullet list — files touched, decisions made, state established, anything a fresh session needs to pick up seamlessly>
\`\`\`

4. Confirm: file path + session_id.

---

## /clone — Fork a snapshot into this session

### Step 1 — List snapshots

Read all \`.md\` files from \`./context-factory/\`.

If none: tell the user *"No snapshots found. Use /freeze to save one first."* and stop.

### Step 2 — Parse and display each file

For each \`.md\` file read the frontmatter block (between \`---\` delimiters) and show:

\`\`\`
  [1] <name>
      "<description>"
      session_id: <id>  |  msgs: <message_count>  |  created: <created>
      last cloned: <last_cloned or "never">
      <if cloned_from != null: "  forked from: <cloned_from>">
\`\`\`

### Step 3 — Prompt selection

Ask: *"Enter a number to fork, or 0 to cancel."*

On cancel: stop cleanly.

### Step 4 — Load the snapshot

1. Read the full \`.md\` file.
2. Stamp \`last_cloned\` with current UTC timestamp in ISO 8601 format.
3. Announce the fork:
   > "Forking from **<name>** (\`<session_id>\`)…"
4. Present the **Conversation Summary** so the user knows what they're loading.
5. Ingest the full **Key Context** as established ground truth — every section, every line.
   Treat it as if every fact in it happened in this session:
   - Skills listed → already loaded
   - Paths listed → already explored and confirmed
   - Rules listed → already agreed upon and in effect
   - Commands and outputs → already run, results known
   - Decisions → already made, do not revisit
   - Do not re-ask, re-confirm, or re-explore anything covered.
6. The new session_id is \${CLAUDE_SESSION_ID}.
7. Confirm:
   - New session ID
   - Parent session ID (\`cloned_from\`)
   - Prompt: *"Ready to continue. What would you like to work on?"*

---

## Lineage display

If a loaded snapshot has \`cloned_from\` set, show the chain:

\`\`\`
Lineage: <grandparent_id> → <parent_id> → <new_id>
\`\`\`

---

## Key rules

- **Key Context = ground truth.** Everything in it already happened. Never re-ask, re-confirm, or re-explore.
- **All sections apply.** Skills, paths, rules, commands, decisions — all of it is active from the moment the snapshot loads.
- **Summaries are for humans.** Write Conversation Summary as a clear statement of purpose.
- **Key Context is for Claude.** Capture actual outputs, exact quotes, real paths — not paraphrases.
- **Preserve last_cloned** when overwriting an existing snapshot with \`/freeze\`.
- **One snapshot per slug** — overwrite, don't append.
`;

const result = {
  scriptPath: fileURLToPath(import.meta.url),
  steps: [],
  gitignore: null,
  error: null,
};

try {
  // 1. Create ./context-factory/
  const factoryDir = path.join(cwd, 'context-factory');
  const factoryExisted = fs.existsSync(factoryDir);
  if (!factoryExisted) {
    fs.mkdirSync(factoryDir, { recursive: true });
  }
  result.steps.push({
    step: 'foundry-dir',
    path: factoryDir,
    status: factoryExisted ? 'already-exists' : 'created',
  });

  // 2. Create .claude/skills/context-factory-loader/ and write SKILL.md
  const skillDir = path.join(cwd, '.claude', 'skills', 'context-factory-loader');
  const skillDirExisted = fs.existsSync(skillDir);
  if (!skillDirExisted) {
    fs.mkdirSync(skillDir, { recursive: true });
  }
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(skillMdPath, LOADER_SKILL_CONTENT, 'utf8');
  result.steps.push({
    step: 'loader-skill',
    path: skillMdPath,
    status: skillDirExisted ? 'updated' : 'installed',
  });

  // 3. Handle .gitignore
  if (addGitignore) {
    const gitignorePath = path.join(cwd, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (content.includes('context-factory/')) {
        result.gitignore = 'already-present';
      } else {
        fs.appendFileSync(
          gitignorePath,
          '\n# Context Factory session snapshots\ncontext-factory/\n',
          'utf8'
        );
        result.gitignore = 'added';
      }
    } else {
      fs.writeFileSync(
        gitignorePath,
        '# Context Factory session snapshots\ncontext-factory/\n',
        'utf8'
      );
      result.gitignore = 'created';
    }
  } else {
    result.gitignore = 'skipped';
  }
} catch (err) {
  result.error = err.message;
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.error ? 1 : 0);
