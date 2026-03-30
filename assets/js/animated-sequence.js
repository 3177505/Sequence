const SLIDE_MS = 2500;
const TRIGGER_SLIDE_MS = 400;
const TRIGGER_MS = 15000;
const RESEARCH_API = '/api/research-images';
const ANIM_PHASE_PER_FRAME = 5;

let paneL = null;
let paneR = null;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function paneDims() {
  if (!paneL) return { w: 640, h: 480 };
  const w = Math.max(32, Math.floor(paneL.clientWidth));
  const h = Math.max(32, Math.floor(paneL.clientHeight));
  return { w, h };
}

function BC() {
  return window.BlendCore;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function sn(x) {
  return 0.5 + 0.5 * Math.sin(x);
}

function blendParamsFromPhase(s) {
  return {
    maskThreshold: clamp(Math.round(95 + 55 * sn(s * 0.54)), 70, 210),
    edgeGate: clamp(Math.round(88 + 62 * sn(s * 0.68 + 0.8)), 45, 225),
    overlayGate: clamp(Math.round(102 + 48 * sn(s * 0.61 + 2.1)), 70, 200),
    blurRadius: clamp(3 + 9 * sn(s * 0.36 + 0.2), 1, 22),
    earthyMix: clamp(0.32 + 0.36 * sn(s * 0.6 + 0.4), 0.18, 0.82),
    edgeGradientFactor: clamp(0.36 + 0.42 * sn(s * 0.76 + 1.25), 0.12, 0.94),
    earthIndex: Math.floor(5 * sn(s * 0.14)) % 5,
  };
}

const ui = { trigger: null, serial: null, status: null };

function captureUi() {
  ui.trigger = document.getElementById('trigger');
  ui.serial = document.getElementById('serial-connect');
  ui.status = document.getElementById('status');
}

let poolBaselineL = [];
let poolBaselineR = [];
let poolTriggerL = [];
let poolTriggerR = [];
let useLeft = [];
let useRight = [];
let triggerEndId = null;
let triggerRemainingId = null;
let triggerTickId = null;
let imageTickId = null;
let inTrigger = false;

let displayCanvasL = null;
let displayCtxL = null;
let displayCanvasR = null;
let displayCtxR = null;
let resizeScheduled = false;

let animPhase = 0;
let rafId = null;
let cacheL = null;
let cacheR = null;
let cacheLoading = false;
let triggerBusy = false;

function pickTriplet() {
  const union = useLeft.concat(useRight);
  if (useLeft.length === 0 || useRight.length === 0 || union.length < 3) return null;
  const u0 = useLeft[Math.floor(Math.random() * useLeft.length)];
  const u1 = useRight[Math.floor(Math.random() * useRight.length)];
  const u2 = union[Math.floor(Math.random() * union.length)];
  return [u0, u1, u2];
}

function scheduleResizeFrame() {
  if (resizeScheduled) return;
  resizeScheduled = true;
  requestAnimationFrame(() => {
    resizeScheduled = false;
    if (inTrigger) return;
    drawAnimatedStep();
  });
}

function mountDisplayCanvas() {
  paneL = document.getElementById('pane-left');
  paneR = document.getElementById('pane-right');
  if (!paneL || !paneR) return;
  displayCanvasL = document.createElement('canvas');
  displayCtxL = displayCanvasL.getContext('2d', { alpha: false });
  displayCanvasR = document.createElement('canvas');
  displayCtxR = displayCanvasR.getContext('2d', { alpha: false });
  paneL.replaceChildren(displayCanvasL);
  paneR.replaceChildren(displayCanvasR);
  const ro = new ResizeObserver(() => scheduleResizeFrame());
  ro.observe(paneL);
  ro.observe(paneR);
}

function stopRaf() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function rafLoop() {
  rafId = requestAnimationFrame(rafLoop);
  drawAnimatedStep();
}

function startRaf() {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(rafLoop);
}

function stopImageTick() {
  if (imageTickId !== null) {
    window.clearInterval(imageTickId);
    imageTickId = null;
  }
}

function stopTriggerTimers() {
  if (triggerTickId !== null) {
    window.clearInterval(triggerTickId);
    triggerTickId = null;
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

async function refreshImageCache() {
  if (inTrigger || cacheLoading) return;
  const bc = BC();
  if (!bc) return;
  const urlsL = pickTriplet();
  const urlsR = pickTriplet();
  if (!urlsL || !urlsR) return;
  const { w, h } = paneDims();
  if (w < 32 || h < 32) return;
  cacheLoading = true;
  try {
    const flat = await bc.loadImagesForUrls([...urlsL, ...urlsR]);
    for (const im of flat) {
      if (!bc.imageLoadOk(im)) return;
    }
    cacheL = flat.slice(0, 3);
    cacheR = flat.slice(3, 6);
  } catch (e) {
    if (ui.status) ui.status.textContent = String(e?.message || e);
  } finally {
    cacheLoading = false;
  }
}

function drawAnimatedStep() {
  if (inTrigger) return;
  const bc = BC();
  if (!bc || !displayCtxL || !displayCtxR || !cacheL || !cacheR || cacheLoading) return;
  const { w, h } = paneDims();
  if (w < 32 || h < 32) return;
  animPhase += ANIM_PHASE_PER_FRAME;
  const pL = blendParamsFromPhase(animPhase);
  const pR = blendParamsFromPhase(animPhase + 2.2);
  displayCanvasL.width = w;
  displayCanvasL.height = h;
  displayCanvasR.width = w;
  displayCanvasR.height = h;
  try {
    const outL = bc.blendLikeProcessing(cacheL[0], cacheL[1], cacheL[2], w, h, pL);
    const outR = bc.blendLikeProcessing(cacheR[0], cacheR[1], cacheR[2], w, h, pR);
    if (outL?.width && outR?.width) {
      displayCtxL.drawImage(outL, 0, 0);
      displayCtxR.drawImage(outR, 0, 0);
    }
  } catch (e) {
    if (ui.status) ui.status.textContent = String(e?.message || e);
  }
}

async function runTriggerFrame() {
  if (triggerBusy || !displayCtxL || !displayCtxR) return;
  const bc = BC();
  if (!bc) return;
  const urlsL = pickTriplet();
  const urlsR = pickTriplet();
  if (!urlsL || !urlsR) return;
  const { w, h } = paneDims();
  if (w < 32 || h < 32) return;
  triggerBusy = true;
  try {
    displayCanvasL.width = w;
    displayCanvasL.height = h;
    displayCanvasR.width = w;
    displayCanvasR.height = h;
    const flat = await bc.loadImagesForUrls([...urlsL, ...urlsR]);
    const imgsL = flat.slice(0, 3);
    const imgsR = flat.slice(3, 6);
    for (const im of flat) {
      if (!bc.imageLoadOk(im)) {
        throw new Error('Obrázek se nepodařilo načíst (zkontrolujte URL).');
      }
    }
    const outL = bc.blendLikeProcessing(imgsL[0], imgsL[1], imgsL[2], w, h);
    const outR = bc.blendLikeProcessing(imgsR[0], imgsR[1], imgsR[2], w, h);
    if (!outL?.width || !outR?.width) {
      throw new Error('Výstup blendu je prázdný.');
    }
    displayCtxL.drawImage(outL, 0, 0);
    displayCtxR.drawImage(outR, 0, 0);
  } catch (e) {
    if (ui.status) ui.status.textContent = String(e?.message || e);
  } finally {
    triggerBusy = false;
  }
}

function poolsReady() {
  const u = useLeft.concat(useRight);
  return useLeft.length > 0 && useRight.length > 0 && u.length >= 3;
}

function startBaseline() {
  stopTriggerTimers();
  stopImageTick();
  stopRaf();
  inTrigger = false;
  useLeft = shuffle(poolBaselineL);
  useRight = shuffle(poolBaselineR);
  if (ui.trigger) ui.trigger.disabled = !poolsReady();
  if (ui.status)
    ui.status.textContent = poolsReady()
      ? 'Animace prahu masky, bran a rozostření — pomalé vlny (~10–20 s). Spouštěč: statický blend bez animace parametrů.'
      : 'Stejné fondy jako Prototyp blend — npm run dev.';
  if (poolsReady()) {
    imageTickId = window.setInterval(refreshImageCache, SLIDE_MS);
    refreshImageCache();
    startRaf();
  }
}

function updateTriggerStatus(remainingSec) {
  if (ui.status) ui.status.textContent = `Spouštěč (zbývá ${remainingSec} s) — statický blend bez animace parametrů.`;
}

function startTrigger() {
  if (!poolsReady()) return;
  stopRaf();
  stopImageTick();
  stopTriggerTimers();
  inTrigger = true;
  cacheL = null;
  cacheR = null;
  if (ui.trigger) ui.trigger.disabled = true;
  useLeft = shuffle(poolTriggerL.length ? poolTriggerL : poolBaselineL);
  useRight = shuffle(poolTriggerR.length ? poolTriggerR : poolBaselineR);
  let remaining = Math.ceil(TRIGGER_MS / 1000);
  updateTriggerStatus(remaining);
  triggerRemainingId = window.setInterval(() => {
    remaining -= 1;
    if (remaining > 0) updateTriggerStatus(remaining);
  }, 1000);
  triggerTickId = window.setInterval(runTriggerFrame, TRIGGER_SLIDE_MS);
  triggerEndId = window.setTimeout(() => {
    startBaseline();
  }, TRIGGER_MS);
  runTriggerFrame();
}

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

async function loadResearchPayload() {
  const res = await fetch(RESEARCH_API, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${RESEARCH_API} ${res.status} (spusťte npm run dev)`);
  return res.json();
}

function bindUiHandlers() {
  ui.trigger?.addEventListener('click', () => {
    if (inTrigger) return;
    startTrigger();
  });
  ui.serial?.addEventListener('click', async () => {
    if (!('serial' in navigator)) {
      if (ui.status) ui.status.textContent = 'Web Serial vyžaduje Chromium. Použijte http://localhost nebo HTTPS.';
      return;
    }
    if (serialPort) {
      if (ui.status) ui.status.textContent = 'Sériový port je otevřený — obnovte stránku pro znovupřipojení.';
      return;
    }
    try {
      serialPort = await navigator.serial.requestPort();
      await serialPort.open({ baudRate: SERIAL_BAUD });
      if (ui.status) ui.status.textContent = 'Sériový port otevřen — spusťte sekvenci z Arduina Nano.';
      readSerialLines(serialPort);
    } catch (e) {
      serialPort = null;
      if (e?.name !== 'NotFoundError' && ui.status) ui.status.textContent = String(e.message || e);
    }
  });
}

async function init() {
  captureUi();
  bindUiHandlers();
  mountDisplayCanvas();
  try {
    const json = await loadResearchPayload();
    poolBaselineL = Array.isArray(json?.baseline?.left) ? json.baseline.left : [];
    poolBaselineR = Array.isArray(json?.baseline?.right) ? json.baseline.right : [];
    poolTriggerL = Array.isArray(json?.trigger?.left) ? json.trigger.left : [];
    poolTriggerR = Array.isArray(json?.trigger?.right) ? json.trigger.right : [];
    startBaseline();
  } catch (e) {
    if (ui.status) ui.status.textContent = String(e?.message || e);
    if (ui.trigger) ui.trigger.disabled = true;
  }
}

init();
