const states = [
  {
    lines: ['top-edge', 'bottom-edge', 'left-edge', 'right-edge', 'diag-main', 'diag-cross'],
    nodes: ['node-tl', 'node-tr', 'node-bl', 'node-br'],
    labels: { tl: 'maskulinní', tr: 'femininní', bl: 'chlapské', br: 'ženskaté' },
    outer: { top: 'hermafrodit', bottom: 'anděl', left: 'macho', right: 'vamp' },
  },
  {
    lines: ['top-edge', 'right-edge', 'diag-main'],
    nodes: ['node-tl', 'node-tr', 'node-br'],
    labels: { tl: 'reálné', tr: 'ideální', bl: 'reziduální', br: 'ztvárněné' },
    outer: { top: 'syntéza', bottom: 'čistá forma', left: 'syrové', right: 'spektákl' },
  },
  {
    lines: ['left-edge', 'bottom-edge', 'diag-cross'],
    nodes: ['node-tl', 'node-bl', 'node-br'],
    labels: { tl: 'kodované', tr: 'promítané', bl: 'ztělesněné', br: 'maskované' },
    outer: { top: 'signál', bottom: 'kostým', left: 'tíha', right: 'lesk' },
  },
  {
    lines: ['top-edge', 'bottom-edge', 'diag-main'],
    nodes: ['node-tl', 'node-tr', 'node-br', 'node-bl'],
    labels: { tl: 'povrch', tr: 'zrcadlo', bl: 'stopa', br: 'avatar' },
    outer: { top: 'rozhraní', bottom: 'hloubka', left: 'index', right: 'dvojník' },
  },
  {
    lines: ['left-edge', 'right-edge', 'diag-main', 'diag-cross'],
    nodes: ['node-tl', 'node-tr', 'node-bl', 'node-br'],
    labels: { tl: 'původ', tr: 'simulace', bl: 'paměť', br: 'kopie' },
    outer: { top: 'prototyp', bottom: 'replika', left: 'archiv', right: 'živě' },
  },
];

const lineIds = ['top-edge', 'bottom-edge', 'left-edge', 'right-edge', 'diag-main', 'diag-cross'];
const nodeIds = ['node-tl', 'node-tr', 'node-bl', 'node-br'];
const labelTl = document.getElementById('label-tl');
const labelTr = document.getElementById('label-tr');
const labelBl = document.getElementById('label-bl');
const labelBr = document.getElementById('label-br');
const labelOuterTop = document.getElementById('label-outer-top');
const labelOuterBottom = document.getElementById('label-outer-bottom');
const labelOuterLeft = document.getElementById('label-outer-left');
const labelOuterRight = document.getElementById('label-outer-right');
const stateLabel = document.getElementById('state-label');
const togglePlay = document.getElementById('toggle-play');
const nextStateButton = document.getElementById('next-state');

let currentState = 0;
let playing = true;
let intervalId = null;

function setActive(elements, activeIds) {
  elements.forEach((id) => {
    const element = document.getElementById(id);
    const isActive = activeIds.includes(id);
    element.classList.toggle('active', isActive);
  });
}

function applyState(index) {
  const state = states[index];
  setActive(lineIds, state.lines);
  setActive(nodeIds, state.nodes);
  labelTl.textContent = state.labels.tl;
  labelTr.textContent = state.labels.tr;
  labelBl.textContent = state.labels.bl;
  labelBr.textContent = state.labels.br;
  labelOuterTop.textContent = state.outer.top;
  labelOuterBottom.textContent = state.outer.bottom;
  labelOuterLeft.textContent = state.outer.left;
  labelOuterRight.textContent = state.outer.right;
  stateLabel.textContent = `${index + 1} / ${states.length}`;
}

function nextState() {
  currentState = (currentState + 1) % states.length;
  applyState(currentState);
}

function startAuto() {
  stopAuto();
  intervalId = setInterval(nextState, 2200);
}

function stopAuto() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

togglePlay.addEventListener('click', () => {
  playing = !playing;
  togglePlay.textContent = playing ? 'pauza' : 'přehrát';
  if (playing) {
    startAuto();
  } else {
    stopAuto();
  }
});

nextStateButton.addEventListener('click', () => {
  nextState();
});

applyState(currentState);
startAuto();
