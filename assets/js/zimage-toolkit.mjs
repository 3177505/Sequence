const LS_KEY = 'ztk-sequence-path';
const LS_SHELL = 'ztk-shell';

function defaultShell() {
  if (typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)) return 'win';
  return 'unix';
}

function getShell() {
  const s = localStorage.getItem(LS_SHELL);
  if (s === 'win' || s === 'unix') return s;
  return defaultShell();
}

function setShellPref(shell) {
  if (shell === 'win' || shell === 'unix') localStorage.setItem(LS_SHELL, shell);
}

function seqPath() {
  const i = document.getElementById('ztk-seq');
  let p = (i?.value || '').trim();
  if (!p) p = localStorage.getItem(LS_KEY) || '/ABS/CESTA/Sequence';
  return p.replace(/\/$/, '');
}

function bashSingleQuoted(s) {
  return `'${String(s).replace(/'/g, `'"'"'`)}'`;
}

function psSingleQuoted(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function buildCommandMap(seq, shell) {
  const eq = bashSingleQuoted(seq);
  const wq = psSingleQuoted(seq);
  if (shell === 'win') {
    return {
      1: null,
      2: [
        'New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\ai-work\\zimage_from_research\\images"',
        `$env:SEQ = ${wq}`,
        'cd $env:SEQ',
        'python ml\\collect_instance_images.py --src "$env:SEQ\\public\\4_Research" --dst "$env:USERPROFILE\\ai-work\\zimage_from_research\\images"',
      ],
      3: [
        `$env:SEQ = ${wq}`,
        'cd $env:SEQ',
        'python ml\\zimage_sidecar_captions.py --dir "$env:USERPROFILE\\ai-work\\zimage_from_research\\images"',
      ],
      4: [
        'cd $env:USERPROFILE\\ai-work',
        'if (-not (Test-Path ai-toolkit)) { git clone https://github.com/ostris/ai-toolkit.git }',
        'cd ai-toolkit',
        'Remove-Item -Recurse -Force .venv -ErrorAction SilentlyContinue',
        'py -3.12 -m venv .venv',
        '.\\.venv\\Scripts\\Activate.ps1',
        'python -m pip install --upgrade pip',
        'python -m pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124',
        'python -m pip install -r requirements.txt',
      ],
      5: [
        'cd $env:USERPROFILE\\ai-work\\ai-toolkit',
        '.\\.venv\\Scripts\\Activate.ps1',
        'python run.py config\\tvuj_zimage_config.yml',
      ],
    };
  }
  return {
    1: null,
    2: [
      'mkdir -p "$HOME/ai-work/zimage_from_research/images"',
      `export SEQ=${eq}`,
      'cd "$SEQ"',
      'python3 ml/collect_instance_images.py --src "$SEQ/public/4_Research" --dst "$HOME/ai-work/zimage_from_research/images"',
    ],
    3: [
      `export SEQ=${eq}`,
      'cd "$SEQ"',
      'python3 ml/zimage_sidecar_captions.py --dir "$HOME/ai-work/zimage_from_research/images"',
    ],
    4: [
      'cd "$HOME/ai-work"',
      'if [ ! -d ai-toolkit ]; then git clone https://github.com/ostris/ai-toolkit.git; fi',
      'cd ai-toolkit',
      'rm -rf .venv',
      'python3.12 -m venv .venv',
      'source .venv/bin/activate',
      'python -m pip install --upgrade pip',
      'python -m pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu',
      'python -m pip install -r requirements.txt',
    ],
    5: [
      'source "$HOME/ai-work/ai-toolkit/.venv/bin/activate"',
      'cd "$HOME/ai-work/ai-toolkit"',
      'python run.py config/tvuj_zimage_config.yml',
    ],
  };
}

function labelForCmd(line) {
  const max = 88;
  if (line.length <= max) return line;
  return line.slice(0, max - 1) + '…';
}

function renderLineButtons(root, map) {
  root.querySelectorAll('[data-ztk-lines-for]').forEach((host) => {
    const k = host.getAttribute('data-ztk-lines-for');
    const lines = map[k];
    host.replaceChildren();
    if (!lines || !lines.length) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    lines.forEach((line) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ztk__copy';
      b.textContent = labelForCmd(line);
      b.title = line;
      b.addEventListener('click', () => copyText(line));
      host.appendChild(b);
    });
  });
}

function refreshUi(root) {
  if (!localStorage.getItem(LS_SHELL)) setShellPref(defaultShell());
  const shell = getShell();
  document.querySelectorAll('[data-ztk-shell]').forEach((b) => {
    const on = b.getAttribute('data-ztk-shell') === shell;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const ex = document.getElementById('ztk-p1-ex');
  if (ex) ex.textContent = `${seqPath()}/public/4_Research/12_Scapegoat`;
  const map = buildCommandMap(seqPath(), shell);
  renderLineButtons(root, map);
  root._ztkCmdMap = map;
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

function copyStepAll(root, id) {
  const map = root._ztkCmdMap;
  const lines = map && map[id];
  if (lines && lines.length) copyText(lines.join('\n'));
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
      refreshUi(root);
    });
  }
  document.querySelectorAll('[data-ztk-shell]').forEach((b) => {
    b.addEventListener('click', () => {
      const shell = b.getAttribute('data-ztk-shell');
      if (shell === 'win' || shell === 'unix') {
        setShellPref(shell);
        refreshUi(root);
      }
    });
  });
  refreshUi(root);
  const tabs = root.querySelectorAll('[data-ztk-step]');
  const panels = root.querySelectorAll('.ztk__panel');
  const show = (id) => {
    tabs.forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-ztk-step') === id);
    });
    panels.forEach((p) => {
      p.toggleAttribute('hidden', p.getAttribute('data-ztk-panel') !== id);
    });
  };
  tabs.forEach((b) => {
    b.addEventListener('click', () => show(b.getAttribute('data-ztk-step')));
  });
  root.querySelectorAll('.ztk__copy[data-ztk-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-ztk-copy');
      copyStepAll(root, id);
    });
  });
  show('1');
}

init();
