import fs from 'fs';
import path from 'path';

const cwd = process.cwd();

const slugify = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const readFrontmatter = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
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

// Copy a file or directory into destDir, preserving relative path from cwd.
// e.g. src/auth.js → <destDir>/src/auth.js
const copyIntoCheckpoint = (srcPath, destDir) => {
  const abs = path.resolve(cwd, srcPath);
  const rel = path.relative(cwd, abs);

  if (rel.startsWith('..')) throw new Error(`Path outside project: ${srcPath}`);

  const dest = path.join(destDir, rel);
  const stat = fs.statSync(abs);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(abs)) {
      copyIntoCheckpoint(path.join(srcPath, entry), destDir);
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
  }

  return rel;
};

const result = { filePath: null, sessionId: null, slug: null, checkpoint: null, error: null };

try {
  // Read stdin via async iteration
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const data = JSON.parse(chunks.join(''));

  const { sessionId, name, description, messageCount, clonedFrom, summary, keyContext, checkpoint } = data;

  if (!sessionId || !name || !description || !summary || !keyContext) {
    throw new Error('Missing required fields: sessionId, name, description, summary, keyContext');
  }

  const slug = slugify(name);
  if (!slug) throw new Error(`Could not slugify name: "${name}"`);

  const factoryDir = path.join(cwd, 'context-factory');
  if (!fs.existsSync(factoryDir)) fs.mkdirSync(factoryDir, { recursive: true });

  const filePath = path.join(factoryDir, `${slug}.md`);
  const created = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Preserve last_cloned if file already exists
  const lastCloned = fs.existsSync(filePath)
    ? (readFrontmatter(filePath).last_cloned ?? null)
    : null;

  const frontmatter = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    `session_id: ${sessionId}`,
    `message_count: ${messageCount ?? 0}`,
    `created: ${created}`,
    `last_cloned: ${lastCloned ?? 'null'}`,
    `cloned_from: ${clonedFrom ?? 'null'}`,
    '---',
  ].join('\n');

  fs.writeFileSync(filePath, `${frontmatter}\n\n# Conversation Summary\n\n${summary}\n\n# Key Context\n\n${keyContext}\n`, 'utf8');

  result.filePath = filePath;
  result.sessionId = sessionId;
  result.slug = slug;

  // Optional file checkpointing
  if (checkpoint?.length > 0) {
    const checkpointDir = path.join(factoryDir, 'checkpoints', slug);
    if (fs.existsSync(checkpointDir)) fs.rmSync(checkpointDir, { recursive: true });
    fs.mkdirSync(checkpointDir, { recursive: true });

    const copied = [];
    const failed = [];
    for (const p of checkpoint) {
      try {
        copied.push(copyIntoCheckpoint(p, checkpointDir));
      } catch (err) {
        failed.push({ path: p, reason: err.message });
      }
    }
    result.checkpoint = { dir: checkpointDir, copied, failed };
  }
} catch (err) {
  result.error = err.message;
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.error ? 1 : 0);
