const mode = document.body.dataset.cloud;
const root = document.getElementById('browse-cloud-root');
if (!mode || !root) {
  throw new Error('browse-cloud: chybí data-cloud nebo #browse-cloud-root');
}

const dataUrl =
  mode === 'material'
    ? '/public/api-public-tree/material-cloud.json'
    : '/public/api-public-tree/inspiration-cloud.json';

async function fetchPayload() {
  const r = await fetch(dataUrl, { cache: 'no-store' });
  if (!r.ok) {
    throw new Error(
      `${dataUrl}: ${r.status} — spusťte npm run build:public-tree nebo npm run dev`,
    );
  }
  return r.json();
}

function alphanumericFold(s) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '');
}

function noteBlockRedundantWithLabel(label, block) {
  const tail = label.replace(/^\d+_/, '').trim();
  const t = alphanumericFold(tail);
  const b = alphanumericFold(block);
  if (b.length < 3 || !t.length) return false;
  if (b === t) return true;
  return false;
}

function appendNoteBlocks(container, label, body) {
  if (!body) return;
  const h = document.createElement('p');
  h.textContent = label;
  container.appendChild(h);
  for (const block of String(body).split(/\n\n+/)) {
    const t = block.trim();
    if (!t) continue;
    if (noteBlockRedundantWithLabel(label, t)) continue;
    const p = document.createElement('p');
    p.textContent = t;
    container.appendChild(p);
  }
}

function layoutCloud(container, urls, meta) {
  container.replaceChildren();
  if (meta?.note) {
    appendNoteBlocks(container, '3_Material', meta.note);
  }
  if (meta?.notes?.pinball) {
    appendNoteBlocks(container, '2_Pinball', meta.notes.pinball);
  }
  if (meta?.notes?.inspo) {
    appendNoteBlocks(container, '1_Inspo', meta.notes.inspo);
  }
  if (!urls.length) {
    container.classList.add('browse-cloud--empty');
    const empty = document.createElement('p');
    empty.textContent = 'Žádné obrázky ve složce.';
    container.appendChild(empty);
    return;
  }
  container.classList.remove('browse-cloud--empty');
  for (const url of urls) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'browse-cloud__piece';
    const left = 4 + Math.random() * 72;
    const top = 4 + Math.random() * 68;
    const w = 11 + Math.random() * 17;
    const rot = -10 + Math.random() * 20;
    const z = 1 + Math.floor(Math.random() * 80);
    a.style.left = `${left}%`;
    a.style.top = `${top}%`;
    a.style.width = `${w}%`;
    a.style.zIndex = String(z);
    a.style.transform = `rotate(${rot}deg)`;
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.className = 'browse-cloud__img';
    a.appendChild(img);
    container.appendChild(a);
  }
}

try {
  const data = await fetchPayload();
  layoutCloud(root, data.images || [], data);
} catch (e) {
  root.textContent = String(e?.message || e);
}
