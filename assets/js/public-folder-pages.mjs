function renderNode(node) {
  const li = document.createElement('li');
  const strong = document.createElement('strong');
  strong.textContent = node.name;
  li.appendChild(strong);
  if (node.missing) {
    const span = document.createElement('span');
    span.textContent = ' (složka chybí nebo není čitelná)';
    li.appendChild(span);
    return li;
  }
  if (node.relPath) {
    li.appendChild(document.createTextNode(` — ${node.relPath}`));
  }
  if (node.files?.length) {
    const ulf = document.createElement('ul');
    for (const f of node.files) {
      const lix = document.createElement('li');
      const a = document.createElement('a');
      a.href = f.url;
      a.textContent = f.name;
      lix.appendChild(a);
      ulf.appendChild(lix);
    }
    li.appendChild(ulf);
  }
  if (node.children?.length) {
    const ulc = document.createElement('ul');
    for (const ch of node.children) {
      ulc.appendChild(renderNode(ch));
    }
    li.appendChild(ulc);
  }
  return li;
}

const mode = document.body.dataset.browse;
const root = document.getElementById('public-browse-root');
if (!mode || !root) {
  throw new Error('public-browse: chybí data-browse nebo #public-browse-root');
}

const apiUrl =
  mode === 'inspiration'
    ? '/api/public-tree/inspiration'
    : `/api/public-tree/${mode}`;
const staticUrl =
  mode === 'inspiration'
    ? '/public/api-public-tree/inspiration.json'
    : `/public/api-public-tree/${mode}.json`;

async function fetchBrowsePayload() {
  let r = await fetch(apiUrl, { cache: 'no-store' });
  if (r.ok) return r.json();
  const apiStatus = r.status;
  r = await fetch(staticUrl, { cache: 'no-store' });
  if (r.ok) return r.json();
  throw new Error(`${apiUrl}: ${apiStatus}; ${staticUrl}: ${r.status}`);
}

async function run() {
  const data = await fetchBrowsePayload();
  root.replaceChildren();
  if (data.sources) {
    for (const src of data.sources) {
      const section = document.createElement('section');
      const h = document.createElement('h2');
      h.textContent = src.label;
      section.appendChild(h);
      const ul = document.createElement('ul');
      ul.appendChild(renderNode(src.node));
      section.appendChild(ul);
      root.appendChild(section);
    }
  } else if (data.node) {
    const ul = document.createElement('ul');
    ul.appendChild(renderNode(data.node));
    root.appendChild(ul);
  }
}

try {
  await run();
} catch (e) {
  root.textContent = String(e?.message || e);
}
