const SLIDE_MS = 2500;
const TRIGGER_SLIDE_MS = 400;
const TRIGGER_MS = 15000;
const VIDEOS_API = '/api/reddit-videos';
const VIDEOS_FALLBACK = 'assets/data/reddit-videos.json';

function youtubeEmbedNoChrome(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    const id = m?.[1];
    if (!id) return url;
    const q = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      controls: '0',
      modestbranding: '1',
      rel: '0',
      fs: '0',
      disablekb: '1',
      iv_load_policy: '3',
      playsinline: '1',
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${q}`;
  } catch {
    return url;
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const appEl = document.getElementById('app');
const triggerBtn = document.getElementById('trigger');
const serialConnectBtn = document.getElementById('serial-connect');
const statusEl = document.getElementById('status');

const videoLeft = document.getElementById('video-left');
const videoRight = document.getElementById('video-right');
const iframeLeft = document.getElementById('iframe-left');
const iframeRight = document.getElementById('iframe-right');

let poolLeft = [];
let poolRight = [];
let seqLeft = [];
let seqRight = [];
let idxLeft = 0;
let idxRight = 0;
let tickId = null;
let triggerEndId = null;
let triggerRemainingId = null;
let inTrigger = false;

function setMode(baseline) {
  if (!appEl) return;
  appEl.classList.toggle('app--baseline', baseline);
  appEl.classList.toggle('app--trigger', !baseline);
}

function applyMediaItem(videoEl, iframeEl, item) {
  if (!item || !videoEl || !iframeEl) return;
  if (item.redditVideoUrl) {
    iframeEl.src = 'about:blank';
    iframeEl.classList.add('is-hidden');
    videoEl.classList.remove('is-hidden');
    if (videoEl.src !== item.redditVideoUrl) {
      videoEl.src = item.redditVideoUrl;
      videoEl.play().catch(() => {});
    }
  } else if (item.youtubeEmbedUrl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
    videoEl.classList.add('is-hidden');
    iframeEl.classList.remove('is-hidden');
    const embed = youtubeEmbedNoChrome(item.youtubeEmbedUrl);
    if (iframeEl.src !== embed) iframeEl.src = embed;
  }
}

function applyPanes() {
  const lu = seqLeft[idxLeft % seqLeft.length];
  const ru = seqRight[idxRight % seqRight.length];
  applyMediaItem(videoLeft, iframeLeft, lu);
  applyMediaItem(videoRight, iframeRight, ru);
}

function tick() {
  idxLeft++;
  idxRight++;
  applyPanes();
}

function startBaseline() {
  stopTimers();
  inTrigger = false;
  setMode(true);
  seqLeft = shuffle(poolLeft);
  seqRight = shuffle(poolRight);
  idxLeft = 0;
  idxRight = 0;
  applyPanes();
  const ok = poolLeft.length && poolRight.length;
  if (triggerBtn) triggerBtn.disabled = !ok;
  if (ok) {
    statusEl.textContent = 'Základní režim: makro výřez (r/datamoshing | r/ObscureMedia).';
  }
  tickId = ok ? window.setInterval(tick, SLIDE_MS) : null;
}

function stopTimers() {
  if (tickId !== null) {
    window.clearInterval(tickId);
    tickId = null;
  }
  if (triggerEndId !== null) {
    window.clearTimeout(triggerEndId);
    triggerEndId = null;
  }
  if (triggerRemainingId !== null) {
    window.clearInterval(triggerRemainingId);
    triggerRemainingId = null;
  }
}

function updateTriggerStatus(remainingSec) {
  statusEl.textContent = `Spouštěč (zbývá ${remainingSec} s) — plný snímek.`;
}

function startTrigger() {
  if (!poolLeft.length || !poolRight.length) return;
  stopTimers();
  inTrigger = true;
  setMode(false);
  if (triggerBtn) triggerBtn.disabled = true;
  seqLeft = shuffle(poolLeft);
  seqRight = shuffle(poolRight);
  idxLeft = 0;
  idxRight = 0;
  applyPanes();
  let remaining = Math.ceil(TRIGGER_MS / 1000);
  updateTriggerStatus(remaining);
  triggerRemainingId = window.setInterval(() => {
    remaining -= 1;
    if (remaining > 0) updateTriggerStatus(remaining);
  }, 1000);
  tickId = window.setInterval(tick, TRIGGER_SLIDE_MS);
  triggerEndId = window.setTimeout(() => {
    startBaseline();
  }, TRIGGER_MS);
}

triggerBtn?.addEventListener('click', () => {
  if (inTrigger) return;
  startTrigger();
});

const SERIAL_BAUD = 115200;
let serialPort = null;

async function readSerialLines(port) {
  const reader = port.readable.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line.length > 0 && !inTrigger) startTrigger();
      }
    }
  } finally {
    reader.releaseLock();
  }
}

serialConnectBtn?.addEventListener('click', async () => {
  if (!('serial' in navigator)) {
    statusEl.textContent = 'Web Serial vyžaduje Chromium. Použijte http://localhost nebo HTTPS.';
    return;
  }
  if (serialPort) {
    statusEl.textContent = 'Sériový port je otevřený — obnovte stránku pro znovupřipojení.';
    return;
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: SERIAL_BAUD });
    statusEl.textContent = 'Sériový port otevřen — spusťte sekvenci z Arduina Nano.';
    readSerialLines(serialPort);
  } catch (e) {
    serialPort = null;
    if (e?.name !== 'NotFoundError') statusEl.textContent = String(e.message || e);
  }
});

async function loadVideosPayload() {
  if (statusEl) statusEl.textContent = 'Načítání nejnovějších videí z Redditu…';
  let res = await fetch(VIDEOS_API);
  if (res.ok) return { json: await res.json(), source: 'api' };
  res = await fetch(VIDEOS_FALLBACK);
  if (!res.ok) throw new Error(`${VIDEOS_API} nedostupné, chybí záložní JSON`);
  return { json: await res.json(), source: 'fallback' };
}

function poolsFromPayload(json) {
  const left = Array.isArray(json.datamoshing) ? json.datamoshing : [];
  const right = Array.isArray(json.ObscureMedia) ? json.ObscureMedia : [];
  return { left, right };
}

async function init() {
  if (!appEl || !statusEl) return;
  try {
    const { json, source } = await loadVideosPayload();
    const { left, right } = poolsFromPayload(json);
    poolLeft = left;
    poolRight = right;
    if (!poolLeft.length || !poolRight.length) {
      statusEl.textContent = 'Ve výčtech datamoshing i ObscureMedia musí být videa.';
      if (triggerBtn) triggerBtn.disabled = true;
      return;
    }
    startBaseline();
    if (source === 'api' && json._lastUpdated) {
      statusEl.textContent = `Živé stažení ${new Date(json._lastUpdated).toLocaleString()} — makro základ.`;
    } else {
      statusEl.textContent =
        'Mezipaměť reddit-videos.json — živé stahování z Redditu při každém načtení: npm run dev. Makro základ.';
    }
  } catch (e) {
    statusEl.textContent = String(e?.message || e);
    if (triggerBtn) triggerBtn.disabled = true;
  }
}

init();
