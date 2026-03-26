const SLIDE_MS = 2500;
const TRIGGER_SLIDE_MS = 400;
const TRIGGER_MS = 15000;

const folder1 = ['#c94c4c', '#4c8cc9', '#6bc94c', '#c9a64c'];
const folder2 = ['#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
const folderTriggerLeft = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
const folderTriggerRight = ['#a29bfe', '#fd79a8', '#00b894'];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const leftPane = document.getElementById('pane-left');
const rightPane = document.getElementById('pane-right');
const triggerBtn = document.getElementById('trigger');
const serialConnectBtn = document.getElementById('serial-connect');
const statusEl = document.getElementById('status');

let seqLeft = shuffle(folder1);
let seqRight = shuffle(folder2);
let idxLeft = 0;
let idxRight = 0;
let tickId = null;
let triggerEndId = null;
let triggerRemainingId = null;
let inTrigger = false;

function applyPanes() {
  leftPane.style.backgroundColor = seqLeft[idxLeft % seqLeft.length];
  rightPane.style.backgroundColor = seqRight[idxRight % seqRight.length];
}

function tick() {
  idxLeft++;
  idxRight++;
  applyPanes();
}

function startBaseline() {
  stopTimers();
  inTrigger = false;
  seqLeft = shuffle(folder1);
  seqRight = shuffle(folder2);
  idxLeft = 0;
  idxRight = 0;
  applyPanes();
  triggerBtn.disabled = false;
  statusEl.textContent = 'Baseline: two columns (folder 1 / folder 2).';
  tickId = window.setInterval(tick, SLIDE_MS);
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
  statusEl.textContent = `Trigger sequence (${remainingSec}s left) — groups C / D.`;
}

function startTrigger() {
  stopTimers();
  inTrigger = true;
  triggerBtn.disabled = true;
  seqLeft = shuffle(folderTriggerLeft);
  seqRight = shuffle(folderTriggerRight);
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

triggerBtn.addEventListener('click', () => {
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
    statusEl.textContent = 'Web Serial needs Chromium. Use http://localhost or HTTPS.';
    return;
  }
  if (serialPort) {
    statusEl.textContent = 'Serial already open — reload page to reconnect.';
    return;
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: SERIAL_BAUD });
    statusEl.textContent = 'Serial open — fire trigger from Nano.';
    readSerialLines(serialPort);
  } catch (e) {
    serialPort = null;
    if (e?.name !== 'NotFoundError') statusEl.textContent = String(e.message || e);
  }
});

startBaseline();
