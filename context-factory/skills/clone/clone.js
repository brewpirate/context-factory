import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const [,, command, arg] = process.argv;

const parseFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return Object.fromEntries(
    match[1].split('\n')
      .filter(line => line.includes(':'))
      .map(line => {
        const colon = line.indexOf(':');
        const key = line.slice(0, colon).trim();
        const val = line.slice(colon + 1).trim();
        return [key, val === 'null' ? null : val];
      })
  );
};

const parseSection = (content, heading) => {
  const match = content.match(new RegExp(`# ${heading}\\n\\n([\\s\\S]*?)(?=\\n# |$)`));
  return match ? match[1].trim() : null;
};

// Recursively list all files under a directory, returning relative paths
const listFiles = (dir, base = dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });

// Copy all files from checkpointDir back to cwd, preserving relative paths
const restoreCheckpoint = (checkpointDir) => {
  const restored = [];
  const failed = [];
  for (const rel of listFiles(checkpointDir)) {
    const dest = path.join(cwd, rel);
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(checkpointDir, rel), dest);
      restored.push(rel);
    } catch (err) {
      failed.push({ path: rel, reason: err.message });
    }
  }
  return { restored, failed };
};

const exit = (data, code = 0) => {
  console.log(JSON.stringify(data, null, 2));
  process.exit(code);
};

// ── list ──────────────────────────────────────────────────────────────────────
if (command === 'list') {
  const factoryDir = path.join(cwd, 'context-factory');

  if (!fs.existsSync(factoryDir)) exit({ snapshots: [], error: null });

  const files = fs.readdirSync(factoryDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) exit({ snapshots: [], error: null });

  const snapshots = files.flatMap(file => {
    const filePath = path.join(factoryDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const fields = parseFrontmatter(content);
    if (!fields) return [];

    const slug = path.basename(file, '.md');
    const checkpointDir = path.join(factoryDir, 'checkpoints', slug);

    return [{
      slug,
      filePath,
      name: fields.name ?? file,
      description: fields.description ?? '',
      sessionId: fields.session_id ?? null,
      messageCount: fields.message_count ?? null,
      created: fields.created ?? null,
      lastCloned: fields.last_cloned ?? null,
      clonedFrom: fields.cloned_from ?? null,
      hasCheckpoint: fs.existsSync(checkpointDir),
    }];
  });

  exit({ snapshots, error: null });
}

// ── stamp ─────────────────────────────────────────────────────────────────────
if (command === 'stamp') {
  if (!arg) exit({ error: 'stamp requires a slug argument' }, 1);

  const factoryDir = path.join(cwd, 'context-factory');
  const filePath = path.join(factoryDir, `${arg}.md`);
  if (!fs.existsSync(filePath)) exit({ error: `Snapshot not found: ${filePath}` }, 1);

  const content = fs.readFileSync(filePath, 'utf8');
  const fields = parseFrontmatter(content);
  if (!fields) exit({ error: `Could not parse frontmatter in ${filePath}` }, 1);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  fs.writeFileSync(filePath, content.replace(/^(last_cloned: ).+$/m, `$1${now}`), 'utf8');

  const checkpointDir = path.join(factoryDir, 'checkpoints', arg);
  const hasCheckpoint = fs.existsSync(checkpointDir);

  exit({
    slug: arg,
    filePath,
    name: fields.name,
    sessionId: fields.session_id,
    clonedFrom: fields.cloned_from,
    lastCloned: now,
    summary: parseSection(content, 'Conversation Summary'),
    keyContext: parseSection(content, 'Key Context'),
    hasCheckpoint,
    checkpointFiles: hasCheckpoint ? listFiles(checkpointDir) : [],
    error: null,
  });
}

// ── restore ───────────────────────────────────────────────────────────────────
if (command === 'restore') {
  if (!arg) exit({ error: 'restore requires a slug argument' }, 1);

  const checkpointDir = path.join(cwd, 'context-factory', 'checkpoints', arg);
  if (!fs.existsSync(checkpointDir)) exit({ error: `No checkpoint found for "${arg}"` }, 1);

  const { restored, failed } = restoreCheckpoint(checkpointDir);
  exit({ slug: arg, restored, failed, error: null });
}

// ── unknown command ────────────────────────────────────────────────────────────
exit({ error: `Unknown command: "${command}". Use "list", "stamp <slug>", or "restore <slug>".` }, 1);
