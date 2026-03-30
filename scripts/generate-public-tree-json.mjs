import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildPublicFolderTree } from './lib/public-tree.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'api-public-tree');

async function writeJson(name, data) {
  await fsp.mkdir(outDir, { recursive: true });
  const fp = path.join(outDir, `${name}.json`);
  await fsp.writeFile(fp, JSON.stringify(data, null, 0), 'utf8');
  console.log('wrote', path.relative(root, fp));
}

async function main() {
  const pinbaRoot = path.join(root, 'public', 'pinba');
  const inspoRoot = path.join(root, 'public', 'inspo');
  await writeJson('inspiration', {
    sources: [
      { key: 'pinba', label: 'Pinba', node: await buildPublicFolderTree(root, pinbaRoot) },
      { key: 'inspo', label: 'Inspo', node: await buildPublicFolderTree(root, inspoRoot) },
    ],
  });
  await writeJson('research', {
    node: await buildPublicFolderTree(root, path.join(root, 'public', 'research')),
  });
  await writeJson('material', {
    node: await buildPublicFolderTree(root, path.join(root, 'public', 'material')),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
