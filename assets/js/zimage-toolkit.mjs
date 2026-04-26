const LS_KEY = 'ztk-sequence-path';

function seqPath() {
  const i = document.getElementById('ztk-seq');
  let p = (i?.value || '').trim();
  if (!p) p = localStorage.getItem(LS_KEY) || '/ABS/CESTA/Sequence';
  return p.replace(/\/$/, '');
}

function lines(...xs) {
  return xs.join('\n');
}

function bashSingleQuoted(s) {
  return `'${String(s).replace(/'/g, `'"'"'`)}'`;
}

function buildCommands(seq) {
  const e = bashSingleQuoted(seq);
  return {
    1: null,
    2: lines(
      'mkdir -p "$HOME/ai-work/zimage_from_research/images"',
      `export SEQ=${e}`,
      'cd "$SEQ"',
      'python3 ml/collect_instance_images.py \\',
      '  --src "$SEQ/public/4_Research" \\',
      '  --dst "$HOME/ai-work/zimage_from_research/images"',
    ),
    3: lines(
      `export SEQ=${e}`,
      'cd "$SEQ"',
      'python3 ml/zimage_sidecar_captions.py --dir "$HOME/ai-work/zimage_from_research/images"',
    ),
    4: lines(
      'cd "$HOME/ai-work"',
      'if [ ! -d ai-toolkit ]; then git clone https://github.com/ostris/ai-toolkit.git; fi',
      'cd ai-toolkit',
      'rm -rf .venv',
      'python3.12 -m venv .venv',
      'source .venv/bin/activate',
      'python -m pip install --upgrade pip',
      'python -m pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu',
      'python -m pip install -r requirements.txt',
    ),
    5: lines(
      'source "$HOME/ai-work/ai-toolkit/.venv/bin/activate"',
      'cd "$HOME/ai-work/ai-toolkit"',
      'python run.py config/tvuj_zimage_config.yml',
    ),
  };
}

function refreshPre(root) {
  const ex = document.getElementById('ztk-p1-ex');
  if (ex) ex.textContent = `${seqPath()}/public/4_Research/12_Scapegoat`;
  const map = buildCommands(seqPath());
  root.querySelectorAll('[data-ztk-cmd-for]').forEach((pre) => {
    const k = pre.getAttribute('data-ztk-cmd-for');
    const t = map[k];
    if (t == null) {
      pre.textContent = '';
      pre.hidden = true;
    } else {
      pre.hidden = false;
      pre.textContent = t;
    }
  });
}

async function copyText(t) {
  if (!t || !t.trim()) return;
  try {
    await navigator.clipboard.writeText(t);
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function init() {
  const root = document.querySelector('.ztk');
  if (!root) return;
  const inp = document.getElementById('ztk-seq');
  const saved = localStorage.getItem(LS_KEY);
  if (saved && inp) inp.value = saved;
  if (inp) {
    inp.addEventListener('input', () => {
      localStorage.setItem(LS_KEY, inp.value.trim());
      refreshPre(root);
    });
  }
  refreshPre(root);
  const tabs = root.querySelectorAll('.ztk__tab');
  const panels = root.querySelectorAll('.ztk__panel');
  const show = (id) => {
    tabs.forEach((b) => {
      b.setAttribute('aria-pressed', b.getAttribute('data-ztk-step') === id);
    });
    panels.forEach((p) => {
      p.toggleAttribute('hidden', p.getAttribute('data-ztk-panel') !== id);
    });
  };
  tabs.forEach((b) => {
    b.addEventListener('click', () => show(b.getAttribute('data-ztk-step')));
  });
  root.querySelectorAll('.ztk__copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-ztk-copy');
      const pre = root.querySelector(`[data-ztk-cmd-for="${id}"]`);
      if (pre && !pre.hidden) copyText(pre.textContent);
    });
  });
  show('1');
}

init();
