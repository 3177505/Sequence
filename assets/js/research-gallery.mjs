const dataUrl = '/public/api-public-tree/research-gallery.json';
const root = document.getElementById('research-gallery-root');
if (!root) {
  throw new Error('research-gallery: missing #research-gallery-root');
}

async function fetchPayload() {
  const r = await fetch(dataUrl, { cache: 'no-store' });
  if (!r.ok) {
    throw new Error(
      `${dataUrl}: ${r.status} — spusťte npm run build:public-tree nebo npm run dev`,
    );
  }
  return r.json();
}

function formatGroupTitle(label) {
  const last = (label.split('/').pop() || label).trim();
  return last.replace(/^\d+_(.+)$/, '$1').trim();
}

function sectionIdFromLabel(label) {
  return label
    .split('/')
    .map((p) => p.trim().replace(/\s+/g, '-'))
    .join('-');
}

function render(data) {
  root.replaceChildren();
  root.classList.add('research-gallery');
  const list = data.groups || [];
  if (!list.length) {
    root.classList.add('research-gallery--empty');
    root.textContent = 'Žádné složky s obrázky v public/research nebo public/4_Research.';
    return;
  }
  for (const g of list) {
    const sec = document.createElement('section');
    sec.className = 'research-gallery__section';
    sec.id = sectionIdFromLabel(g.label);
    const h2 = document.createElement('h2');
    h2.className = 'research-gallery__title';
    h2.textContent = formatGroupTitle(g.label);
    sec.appendChild(h2);
    if (String(g.note ?? '').trim()) {
      for (const block of String(g.note).split(/\n\n+/)) {
        const t = block.trim();
        if (!t) continue;
        const p = document.createElement('p');
        p.textContent = t;
        sec.appendChild(p);
      }
    }
    const cosRows = (g.casovaOsa ?? []).filter(
      (r) =>
        String(r?.historical ?? '').trim() ||
        String(r?.contemporary ?? '').trim(),
    );
    if (cosRows.length) {
      for (const row of cosRows) {
        const hst = String(row.historical ?? '').trim();
        const sou = String(row.contemporary ?? '').trim();
        if (hst) {
          const ph = document.createElement('p');
          const sh = document.createElement('strong');
          sh.textContent = 'Historicky: ';
          ph.appendChild(sh);
          ph.appendChild(document.createTextNode(hst));
          sec.appendChild(ph);
        }
        if (sou) {
          const pc = document.createElement('p');
          const sc = document.createElement('strong');
          sc.textContent = 'Současnost: ';
          pc.appendChild(sc);
          pc.appendChild(document.createTextNode(sou));
          sec.appendChild(pc);
        }
      }
    }
    const protip = String(g.protipol ?? '').trim();
    if (protip) {
      const h3p = document.createElement('h3');
      h3p.textContent = 'Protipól';
      sec.appendChild(h3p);
      const pp = document.createElement('p');
      pp.textContent = protip;
      sec.appendChild(pp);
    }
    const bibLines = (g.bibliografie ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean);
    if (bibLines.length) {
      const h3b = document.createElement('h3');
      h3b.textContent = 'Reference';
      sec.appendChild(h3b);
      const ul = document.createElement('ul');
      for (const line of bibLines) {
        const li = document.createElement('li');
        li.textContent = line;
        ul.appendChild(li);
      }
      sec.appendChild(ul);
    }
    const grid = document.createElement('div');
    grid.className = 'research-gallery__grid';
    for (const src of g.images) {
      const a = document.createElement('a');
      a.className = 'research-gallery__thumb';
      a.href = src;
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      a.appendChild(img);
      grid.appendChild(a);
    }
    sec.appendChild(grid);
    root.appendChild(sec);
  }
}

try {
  const data = await fetchPayload();
  render(data);
} catch (e) {
  root.textContent = String(e?.message || e);
}
