import path from 'path';
import fsp from 'fs/promises';
import { filePathToEncodedUrl, IMAGE_EXT } from './public-tree.mjs';
import {
  researchGalleryLabelOrder,
  researchLabelMeta,
} from './sequence-notes.mjs';

export async function collectImagesRecursiveUnder(repoRoot, absDir) {
  const out = [];
  let entries;
  try {
    entries = await fsp.readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(absDir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectImagesRecursiveUnder(repoRoot, full)));
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      out.push(filePathToEncodedUrl(repoRoot, full));
    }
  }
  return out.sort();
}

function compareResearchFolderNames(a, b) {
  const ma = /^(\d+)_/.exec(a);
  const mb = /^(\d+)_/.exec(b);
  const na = ma ? parseInt(ma[1], 10) : Number.MAX_SAFE_INTEGER;
  const nb = mb ? parseInt(mb[1], 10) : Number.MAX_SAFE_INTEGER;
  if (na !== nb) return na - nb;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function compareResearchGroupLabels(x, y) {
  const ax = x.label.split('/');
  const ay = y.label.split('/');
  if (ax[0] !== ay[0]) {
    if (ax[0] === '4_Research') return -1;
    if (ay[0] === '4_Research') return 1;
  }
  if (ax[0] === '4_Research' && ay[0] === '4_Research') {
    const ix = researchGalleryLabelOrder.indexOf(x.label);
    const iy = researchGalleryLabelOrder.indexOf(y.label);
    const ux = ix === -1 ? 1_000_000 : ix;
    const uy = iy === -1 ? 1_000_000 : iy;
    if (ux !== uy) return ux - uy;
  }
  const dx = ax[0] === '4_Research' ? ax[1] : ax[ax.length - 1] || '';
  const dy = ay[0] === '4_Research' ? ay[1] : ay[ay.length - 1] || '';
  return compareResearchFolderNames(dx, dy);
}

async function pushGroupsForParent(repoRoot, groups, parentAbs, segmentStart, skipNames) {
  let entries;
  try {
    entries = await fsp.readdir(parentAbs, { withFileTypes: true });
  } catch {
    return;
  }
  const dirs = entries.filter((e) => {
    if (!e.isDirectory() || e.name.startsWith('.')) return false;
    if (skipNames?.has(e.name)) return false;
    return true;
  });
  dirs.sort((a, b) => compareResearchFolderNames(a.name, b.name));
  const relParts = segmentStart.split('/').filter(Boolean);
  for (const ent of dirs) {
    const absDir = path.join(parentAbs, ent.name);
    const images = await collectImagesRecursiveUnder(repoRoot, absDir);
    if (!images.length) continue;
    const label = [...relParts, ent.name].join('/');
    groups.push({
      label,
      relPath: `public/${label}`,
      images,
    });
  }
}

export async function buildResearchGalleryPayload(repoRoot) {
  const groups = [];
  await pushGroupsForParent(
    repoRoot,
    groups,
    path.join(repoRoot, 'public', 'research'),
    'research',
    new Set(['baseline-left', 'baseline-right']),
  );
  await pushGroupsForParent(
    repoRoot,
    groups,
    path.join(repoRoot, 'public', '4_Research'),
    '4_Research',
  );
  for (const g of groups) {
    const meta = researchLabelMeta[g.label];
    if (!meta) continue;
    const note = String(meta.note ?? '').trim();
    if (note) g.note = note;
    const bib = (meta.bibliografie ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean);
    if (bib.length) g.bibliografie = bib;
    const pro = String(meta.protipol ?? '').trim();
    if (pro) g.protipol = pro;
    const cos = (meta.casovaOsa ?? []).filter(
      (r) =>
        String(r?.historical ?? '').trim() ||
        String(r?.contemporary ?? '').trim(),
    );
    if (cos.length) g.casovaOsa = cos.map((r) => ({
      historical: String(r.historical ?? '').trim(),
      contemporary: String(r.contemporary ?? '').trim(),
    }));
  }
  groups.sort(compareResearchGroupLabels);
  return { groups };
}
