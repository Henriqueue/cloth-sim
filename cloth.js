// ==========================================================
// Cloth Simulation — Verlet Integration + Position Based Dynamics
// ==========================================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ---------- Config ----------
const CONFIG = {
  cols: 40,
  rows: 30,
  spacing: 14,
  gravity: 0.4,
  damping: 0.985,        // fricção artificial: sem isso o pano nunca para de tremer
  solverIterations: 8,   // iterações de constraint por frame — o coração da estabilidade
  tearDistanceMultiplier: 2.2, // constraint "arrebenta" se esticar demais
  windStrength: 0.02,
  mouseInfluenceRadius: 40,
};

// ---------- Estruturas de dados ----------
// Usamos Float32Array por performance: cache locality, sem overhead de objetos.
// Cada ponto tem: x, y, oldX, oldY, pinned (0/1)
let numPoints = CONFIG.cols * CONFIG.rows;
let px = new Float32Array(numPoints);
let py = new Float32Array(numPoints);
let oldPx = new Float32Array(numPoints);
let oldPy = new Float32Array(numPoints);
let pinned = new Uint8Array(numPoints);

// Constraints: pares de índices + distância de repouso
// Guardamos como arrays paralelos, não objetos, pelo mesmo motivo acima.
let consA = [];
let consB = [];
let consRest = [];
let consActive = []; // permite "cortar" sem realocar arrays inteiros

function idx(col, row) {
  return row * CONFIG.cols + col;
}

function initCloth() {
  const offsetX = (canvas.width - CONFIG.cols * CONFIG.spacing) / 2;
  const offsetY = 60;

  for (let row = 0; row < CONFIG.rows; row++) {
    for (let col = 0; col < CONFIG.cols; col++) {
      const i = idx(col, row);
      const x = offsetX + col * CONFIG.spacing;
      const y = offsetY + row * CONFIG.spacing;
      px[i] = x; py[i] = y;
      oldPx[i] = x; oldPy[i] = y;
      // fixa a fileira do topo (senão o pano só cai e não sobra nada pra ver)
      pinned[i] = (row === 0) ? 1 : 0;
    }
  }

  consA = []; consB = []; consRest = []; consActive = [];

  function addConstraint(a, b) {
    const dx = px[a] - px[b];
    const dy = py[a] - py[b];
    const rest = Math.sqrt(dx * dx + dy * dy);
    consA.push(a); consB.push(b); consRest.push(rest); consActive.push(1);
  }

  for (let row = 0; row < CONFIG.rows; row++) {
    for (let col = 0; col < CONFIG.cols; col++) {
      const i = idx(col, row);
      if (col < CONFIG.cols - 1) addConstraint(i, idx(col + 1, row)); // horizontal
      if (row < CONFIG.rows - 1) addConstraint(i, idx(col, row + 1)); // vertical
      // diagonais: evitam que o pano se comprima/cisalhe de forma esquisita
      if (col < CONFIG.cols - 1 && row < CONFIG.rows - 1) {
        addConstraint(i, idx(col + 1, row + 1));
        addConstraint(idx(col + 1, row), idx(col, row + 1));
      }
    }
  }
}

initCloth();

// ---------- Verlet integration ----------
function updatePoints() {
  for (let i = 0; i < numPoints; i++) {
    if (pinned[i]) continue;

    const vx = (px[i] - oldPx[i]) * CONFIG.damping;
    const vy = (py[i] - oldPy[i]) * CONFIG.damping;

    oldPx[i] = px[i];
    oldPy[i] = py[i];

    px[i] += vx;
    py[i] += vy + CONFIG.gravity;

    // vento: leve ruído senoidal por posição, dá sensação de ondulação
    px[i] += Math.sin(frame * 0.02 + i * 0.05) * CONFIG.windStrength;
  }
}

// ---------- Solver de constraints (Position Based Dynamics) ----------
// O ponto central do projeto: uma única passada deixa o pano "elástico" e instável.
// Rodar várias iterações por frame é o que faz parecer tecido de verdade.
function satisfyConstraints() {
  for (let iter = 0; iter < CONFIG.solverIterations; iter++) {
    for (let c = 0; c < consA.length; c++) {
      if (!consActive[c]) continue;

      const a = consA[c], b = consB[c];
      const dx = px[b] - px[a];
      const dy = py[b] - py[a];
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const rest = consRest[c];

      // se esticou demais, "rasga" o constraint em vez de continuar puxando
      if (dist > rest * CONFIG.tearDistanceMultiplier) {
        consActive[c] = 0;
        continue;
      }

      const diff = (dist - rest) / dist;
      const offsetX = dx * 0.5 * diff;
      const offsetY = dy * 0.5 * diff;

      if (!pinned[a]) { px[a] += offsetX; py[a] += offsetY; }
      if (!pinned[b]) { px[b] -= offsetX; py[b] -= offsetY; }
    }
  }
}

// ---------- Interação via mouse ----------
let mouse = { x: 0, y: 0, down: false, shift: false, prevX: 0, prevY: 0 };

canvas.addEventListener('mousedown', (e) => {
  mouse.down = true;
  mouse.x = mouse.prevX = e.clientX;
  mouse.y = mouse.prevY = e.clientY;
});
window.addEventListener('mouseup', () => mouse.down = false);
window.addEventListener('mousemove', (e) => {
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.shift = e.shiftKey;
});

function handleMouseInteraction() {
  if (!mouse.down) return;
  const r2 = CONFIG.mouseInfluenceRadius * CONFIG.mouseInfluenceRadius;

  if (mouse.shift) {
    // cortar: desativa constraints próximas ao cursor
    for (let c = 0; c < consA.length; c++) {
      if (!consActive[c]) continue;
      const a = consA[c];
      const dx = px[a] - mouse.x;
      const dy = py[a] - mouse.y;
      if (dx * dx + dy * dy < r2) consActive[c] = 0;
    }
  } else {
    // arrastar: empurra pontos próximos na direção do movimento do mouse
    const dmx = mouse.x - mouse.prevX;
    const dmy = mouse.y - mouse.prevY;
    for (let i = 0; i < numPoints; i++) {
      if (pinned[i]) continue;
      const dx = px[i] - mouse.x;
      const dy = py[i] - mouse.y;
      if (dx * dx + dy * dy < r2) {
        px[i] += dmx;
        py[i] += dmy;
      }
    }
  }
}

// ---------- Render ----------
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(180, 200, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c < consA.length; c++) {
    if (!consActive[c]) continue;
    const a = consA[c], b = consB[c];
    ctx.moveTo(px[a], py[a]);
    ctx.lineTo(px[b], py[b]);
  }
  ctx.stroke();
}

// ---------- Loop principal ----------
let frame = 0;
function loop() {
  frame++;
  updatePoints();
  satisfyConstraints();
  handleMouseInteraction();
  render();
  requestAnimationFrame(loop);
}
loop();
