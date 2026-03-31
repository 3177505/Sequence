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

const efluxReadingGroups = [
  {
    title: 'Karneval, převrácení řádu, spektákl krize',
    items: [
      {
        label:
          'Claire Tancons — Occupy Wall Street: Carnival Against Capital? Carnivalesque as Protest Sensibility — Journal #30',
        href: 'https://www.e-flux.com/journal/30/68148/occupy-wall-street-carnival-against-capital-carnivalesque-as-protest-sensibility',
      },
      {
        label:
          'Claire Tancons — Carnival to Commons: Pussy Riot, Punk Protest, and the Exercise of Democratic Culture — Journal #37',
        href: 'https://www.e-flux.com/journal/37/61239/carnival-to-commons-pussy-riot-punk-protest-and-the-exercise-of-democratic-culture/',
      },
      {
        label:
          'Boris Groys — The Museum as a Cradle of Revolution — Journal #106',
        href: 'https://www.e-flux.com/journal/106/314487/the-museum-as-a-cradle-of-revolution',
      },
    ],
  },
  {
    title: 'Grotesk, dialog (Bachtin), kritika zařízení',
    items: [
      {
        label:
          'Grant H. Kester — The Device Laid Bare: On Some Limitations in Current Art Criticism — Journal #50',
        href: 'https://www.e-flux.com/journal/50/59990/the-device-laid-bare-on-some-limitations-in-current-art-criticism/',
      },
    ],
  },
  {
    title: 'Memy, trolling, ironie a pravice',
    items: [
      {
        label:
          'Geert Lovink — Overcoming Internet Disillusionment: On the Principles of Meme Design — Journal #83',
        href: 'https://www.e-flux.com/journal/83/141287/overcoming-internet-disillusionment-on-the-principles-of-meme-design',
      },
      {
        label:
          'Nina Power — The Language of the New Brutality — Journal #83',
        href: 'https://www.e-flux.com/journal/83/141286/the-language-of-the-newbrutality',
      },
      {
        label: 'Sven Lütticken — Who Makes the Nazis? — Journal #76',
        href: 'https://www.e-flux.com/journal/76/69408/who-makes-the-nazis/',
      },
      {
        label:
          'Janus Rose — After Doomscroll: A Conversation with Chelsea Manning — Journal #146',
        href: 'https://www.e-flux.com/journal/146/609834/after-doomscroll-a-conversation-with-chelsea-manning/',
      },
    ],
  },
  {
    title: 'Chudý obraz, komprese, pixel jako důkaz',
    items: [
      {
        label: 'Hito Steyerl — In Defense of the Poor Image — Journal #10',
        href: 'https://www.e-flux.com/journal/10/61362/in-defense-of-the-poor-image',
      },
      {
        label:
          'Hito Steyerl — Missing People: Entanglement, Superposition, and Exhumation as Sites of Indeterminacy — Journal #38',
        href: 'https://www.e-flux.com/journal/38/61209/missing-people-entanglement-superposition-and-exhumation-as-sites-of-indeterminacy/',
      },
      {
        label:
          'Soo Hwan Kim — Sergei Tretyakov Revisited: The Cases of Walter Benjamin and Hito Steyerl — Journal #104',
        href: 'https://www.e-flux.com/journal/104/298121/sergei-tretyakov-revisited-the-cases-of-walter-benjamin-and-hito-steyerl',
      },
    ],
  },
  {
    title: 'Instituce, smlouva, výkon',
    items: [
      {
        label:
          'Anton Vidokle & Brian Kuan Wood — Breaking the Contract — Journal #37',
        href: 'https://www.e-flux.com/journal/37/61241/breaking-the-contract/',
      },
      {
        label:
          'Not An Alternative — Institutional Liberation — Journal #77',
        href: 'https://www.e-flux.com/journal/77/76215/institutional-liberation/',
      },
    ],
  },
  {
    title: 'Tělo, moc, výjimka',
    items: [
      {
        label:
          'Natasha Ginwala — Corruption: Three Bodies, and Ungovernable Subjects — Journal #67',
        href: 'https://www.e-flux.com/journal/67/60724/corruption-three-bodies-and-ungovernable-subjects',
      },
    ],
  },
  {
    title: 'AI, operační obraz, eschatologie strojů',
    items: [
      {
        label:
          'Jussi Parikka — Operational Images: Between Light and Data — Journal #133',
        href: 'https://www.e-flux.com/journal/133/515812/operational-images-between-light-and-data',
      },
      {
        label:
          'Yuk Hui — ChatGPT, or the Eschatology of Machines — Journal #137',
        href: 'https://www.e-flux.com/journal/137/544816/chatgpt-or-the-eschatology-of-machines',
      },
      {
        label:
          'Bogna Konior — War in the Age of Infinite Evidence: On AI-Generated War Photography — Journal #160',
        href: 'https://www.e-flux.com/journal/160/6776831/war-in-the-age-of-infinite-evidence-on-ai-generated-war-photography',
      },
    ],
  },
  {
    title: 'Maskulinita, domestikace, reakce (k tématu Manosphere)',
    items: [
      {
        label:
          'Ingo Niermann — Pets Going Their Own Way — Journal #159',
        href: 'https://www.e-flux.com/journal/159/6776813/pets-going-their-own-way',
      },
    ],
  },
];

function appendEfluxReadingList(container) {
  const sec = document.createElement('section');
  sec.className = 'research-gallery__section';
  sec.id = 'research-eflux-reading';
  const h2 = document.createElement('h2');
  h2.className = 'research-gallery__title';
  h2.textContent = 'e-flux';
  sec.appendChild(h2);
  const intro = document.createElement('p');
  sec.appendChild(intro);
  for (const grp of efluxReadingGroups) {
    const h3 = document.createElement('h3');
    h3.textContent = grp.title;
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    for (const item of grp.items) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      a.textContent = item.label;
      li.appendChild(a);
      ul.appendChild(li);
    }
    sec.appendChild(ul);
  }
  container.appendChild(sec);
}

function render(data) {
  root.replaceChildren();
  root.classList.add('research-gallery');
  const list = data.groups || [];
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'research-gallery__empty-msg';
    p.textContent =
      'Žádné složky s obrázky v public/research nebo public/4_Research.';
    root.appendChild(p);
  } else {
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
  appendEfluxReadingList(root);
}

try {
  const data = await fetchPayload();
  render(data);
} catch (e) {
  root.textContent = String(e?.message || e);
}
