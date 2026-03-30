import http from 'http';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as sass from 'sass';
import { fetchRedditVideosPayload } from './lib/reddit-videos-fetch.mjs';
import {
  buildPublicFolderTree,
  filePathToEncodedUrl,
  IMAGE_EXT,
} from './lib/public-tree.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const rootResolved = path.resolve(root);
const PORT = Number(process.env.PORT) || 3000;
const scssRoot = path.join(root, 'assets', 'scss');

const clients = new Set();
let reloadTimer = null;

function notifyReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const res of clients) {
      try {
        res.write(`data: reload\n\n`);
      } catch (_) {}
    }
  }, 80);
}

function urlToFsPath(urlPath) {
  const raw = decodeURIComponent(urlPath.split('?')[0]);
  const rel = raw.replace(/^\//, '').split('/').join(path.sep);
  const normalized = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.resolve(rootResolved, normalized);
  if (!full.startsWith(rootResolved)) return null;
  return full;
}

function splitIntoLeftRight(urls) {
  const mid = Math.ceil(urls.length / 2);
  return { left: urls.slice(0, mid), right: urls.slice(mid) };
}

function normalizeResearchPair(left, right) {
  if (left.length > 0 && right.length > 0) return { left, right };
  const all = left.concat(right);
  if (all.length < 3) return { left, right };
  return splitIntoLeftRight(all);
}

async function collectImageUrlsInDir(absDir) {
  const out = [];
  let entries;
  try {
    entries = await fsp.readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    out.push(filePathToEncodedUrl(rootResolved, path.join(absDir, ent.name)));
  }
  return out.sort();
}

async function collectImagesRecursiveUnder(absDir) {
  const out = [];
  let entries;
  try {
    entries = await fsp.readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(absDir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectImagesRecursiveUnder(full)));
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      out.push(filePathToEncodedUrl(rootResolved, full));
    }
  }
  return out.sort();
}

function publicTreeJsonHandler(absRoot) {
  return async (_req, res) => {
    try {
      const node = await buildPublicFolderTree(rootResolved, absRoot);
      const body = JSON.stringify({ node });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String(e?.message || e) }));
    }
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function handle(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  urlPath = urlPath.replace(/\/+$/, '') || '/';
  if (urlPath === '/') urlPath = '/index.html';

  if (urlPath === '/api/research-images' && req.method === 'GET') {
    try {
      const researchRoot = path.join(rootResolved, 'public', 'research');
      const research4 = path.join(rootResolved, 'public', '4_Research');
      let baselineLeft = await collectImageUrlsInDir(path.join(researchRoot, 'baseline-left'));
      let baselineRight = await collectImageUrlsInDir(path.join(researchRoot, 'baseline-right'));
      let triggerLeft = await collectImageUrlsInDir(path.join(researchRoot, 'trigger-left'));
      let triggerRight = await collectImageUrlsInDir(path.join(researchRoot, 'trigger-right'));
      let b = normalizeResearchPair(baselineLeft, baselineRight);
      baselineLeft = b.left;
      baselineRight = b.right;
      let bUnion = baselineLeft.length + baselineRight.length;
      if (baselineLeft.length === 0 || baselineRight.length === 0 || bUnion < 3) {
        const allSub = await collectImagesRecursiveUnder(researchRoot);
        if (allSub.length >= 3) {
          const s = splitIntoLeftRight(allSub);
          baselineLeft = s.left;
          baselineRight = s.right;
          bUnion = baselineLeft.length + baselineRight.length;
        }
      }
      if (baselineLeft.length === 0 || baselineRight.length === 0 || bUnion < 3) {
        const all4 = await collectImagesRecursiveUnder(research4);
        if (all4.length >= 3) {
          const s = splitIntoLeftRight(all4);
          baselineLeft = s.left;
          baselineRight = s.right;
        }
      }
      let t = normalizeResearchPair(triggerLeft, triggerRight);
      triggerLeft = t.left;
      triggerRight = t.right;
      const tUnion = triggerLeft.length + triggerRight.length;
      if (triggerLeft.length === 0 || triggerRight.length === 0 || tUnion < 3) {
        triggerLeft = baselineLeft.slice();
        triggerRight = baselineRight.slice();
      }
      const body = JSON.stringify({
        baseline: { left: baselineLeft, right: baselineRight },
        trigger: { left: triggerLeft, right: triggerRight },
      });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String(e?.message || e) }));
    }
    return;
  }

  if (urlPath === '/api/public-tree/research' && req.method === 'GET') {
    await publicTreeJsonHandler(path.join(rootResolved, 'public', 'research'))(req, res);
    return;
  }

  if (urlPath === '/api/public-tree/material' && req.method === 'GET') {
    await publicTreeJsonHandler(path.join(rootResolved, 'public', 'material'))(req, res);
    return;
  }

  if (urlPath === '/api/public-tree/inspiration' && req.method === 'GET') {
    try {
      const pinbaRoot = path.join(rootResolved, 'public', 'pinba');
      const inspoRoot = path.join(rootResolved, 'public', 'inspo');
      const sources = [
        { key: 'pinba', label: 'Pinba', node: await buildPublicFolderTree(rootResolved, pinbaRoot) },
        { key: 'inspo', label: 'Inspo', node: await buildPublicFolderTree(rootResolved, inspoRoot) },
      ];
      const body = JSON.stringify({ sources });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String(e?.message || e) }));
    }
    return;
  }

  if (urlPath === '/api/reddit-videos' && req.method === 'GET') {
    try {
      const payload = await fetchRedditVideosPayload();
      const body = JSON.stringify(payload);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String(e?.message || e) }));
    }
    return;
  }

  if (urlPath === '/__livereload') {
    const accept = req.headers.accept || '';
    if (!accept.includes('text/event-stream')) {
      res.writeHead(400);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    clients.add(res);
    res.write(': ok\n\n');
    req.on('close', () => clients.delete(res));
    return;
  }

  if (urlPath.endsWith('.scss')) {
    const filePath = urlToFsPath(urlPath);
    if (!filePath) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const result = sass.compile(filePath, {
        style: 'expanded',
        loadPaths: [scssRoot],
        sourceMap: false,
      });
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(result.css);
    } catch (e) {
      const msg = e?.message || String(e);
      res.writeHead(500, { 'Content-Type': 'text/css; charset=utf-8' });
      res.end(`/* SCSS error */\nbody::before{content:${JSON.stringify(msg)};white-space:pre;display:block;font:12px monospace;padding:12px;color:#f44}`);
    }
    return;
  }

  const pathTrim = urlPath;
  const segments = pathTrim.split('/').filter(Boolean);
  const lastSeg = segments.length ? segments[segments.length - 1] : '';
  const lastHasDot = lastSeg.includes('.');

  const attempts = [];
  if (lastSeg && !lastHasDot) {
    attempts.push(urlToFsPath(`${pathTrim}.html`));
  }
  attempts.push(urlToFsPath(pathTrim));

  for (const fp of attempts) {
    if (!fp) continue;
    try {
      const stat = await fsp.stat(fp);
      if (stat.isDirectory()) {
        const idx = path.join(fp, 'index.html');
        try {
          const html = await fsp.readFile(idx);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        } catch {
          continue;
        }
      }
      if (stat.isFile()) {
        const ext = path.extname(fp).toLowerCase();
        const type = MIME[ext] || 'application/octet-stream';
        const body = await fsp.readFile(fp);
        res.writeHead(200, { 'Content-Type': type });
        res.end(body);
        return;
      }
    } catch {
      continue;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(err?.message || err));
  });
});

server.listen(PORT, () => {
  console.log(`Dev http://localhost:${PORT} — SCSS on-demand, extensionless → .html, live reload`);
});

try {
  const watcher = fs.watch(scssRoot, { recursive: true }, () => notifyReload());
  watcher.on('error', (err) => {
    console.warn('SCSS watch:', err.message || err);
  });
} catch (e) {
  console.warn('SCSS watch disabled:', e.message || e);
}

try {
  const publicDir = path.join(root, 'public');
  if (fs.existsSync(publicDir)) {
    const pubWatch = fs.watch(publicDir, { recursive: true }, () => notifyReload());
    pubWatch.on('error', (err) => {
      console.warn('public/ watch:', err.message || err);
    });
  }
} catch (e) {
  console.warn('public/ watch disabled:', e.message || e);
}
