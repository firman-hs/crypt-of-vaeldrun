// @ts-check
/* ============================================================
   DICE.JS — Dice Math + Animated d20 Component
   ============================================================
   Berisi:
     - roll(sides) & rollDice(count, sides)   → math utilities
     - rollD20WithMod(mod, dc, label)         → core d20 mechanic
     - animateDiceRoll(...)                   → visual animasi
     - isDiceBusy() / whenDiceIdle(callback)  → sync API untuk UI
   ============================================================ */

import { state } from './state.js';

/** @typedef {import('./types.js').DiceRollResult} DiceRollResult */


// ─── DICE MATH ──────────────────────────────────────────────

/**
 * Roll 1 dadu dengan jumlah sisi tertentu. Hasil: 1..sides.
 * @param {number} sides
 * @returns {number}
 */
export function roll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dadu, return total.
 * @param {number} count
 * @param {number} sides
 * @returns {number}
 */
export function rollDice(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i++) total += roll(sides);
  return total;
}

/**
 * Core D&D mechanic: roll d20 + modifier vs DC.
 * Auto-trigger animasi dadu & auto-log ke state.rollLog.
 *
 * @param {number} mod      - modifier untuk ditambahkan ke roll (bisa negatif)
 * @param {number} dc       - difficulty class yang harus dicapai
 * @param {string} label    - label untuk roll log (e.g. "Attack vs Goblin")
 * @returns {DiceRollResult}
 */
export function rollD20WithMod(mod, dc, label) {
  const d = roll(20);
  const total = d + mod;
  const isCrit = d === 20;
  const isFumble = d === 1;
  const success = isCrit ? true : isFumble ? false : total >= dc;

  const entry = `${label}: d20(${d}) ${mod >= 0 ? '+' : ''}${mod} = ${total} vs DC ${dc} → ${
    isCrit ? 'CRITICAL!' : isFumble ? 'FUMBLE!' : success ? 'SUCCESS' : 'FAIL'
  }`;
  state.rollLog.push(entry);
  updateLog();

  // Trigger animasi
  animateDiceRoll(d, isCrit, isFumble);

  return { d, total, success, isCrit, isFumble };
}

/**
 * Render roll log ke DOM (kalau elemen-nya ada).
 */
function updateLog() {
  const log = document.getElementById('log');
  if (!log) return;
  log.innerHTML = state.rollLog.slice(-20).map((e, i) => {
    const num = state.rollLog.length - Math.min(20, state.rollLog.length) + i + 1;
    return `<div><span class="turn">[${String(num).padStart(2, '0')}]</span> ${e}</div>`;
  }).join('');
}


// ─── ANIMATION & QUEUE ──────────────────────────────────────

// SVG path untuk d20 (icosahedron flat representation)
const D20_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="diceFace" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="var(--dice-light, #2a2018)"/>
      <stop offset="100%" stop-color="var(--dice-dark, #0a0807)"/>
    </linearGradient>
    <filter id="diceGlow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <polygon points="50,5 90,27 90,73 50,95 10,73 10,27"
           fill="url(#diceFace)"
           stroke="var(--dice-edge, #c9a961)"
           stroke-width="1.5"
           filter="url(#diceGlow)"/>

  <g stroke="var(--dice-edge, #c9a961)" stroke-width="0.6" opacity="0.5" fill="none">
    <line x1="50" y1="5" x2="50" y2="50"/>
    <line x1="50" y1="50" x2="90" y2="27"/>
    <line x1="50" y1="50" x2="90" y2="73"/>
    <line x1="50" y1="50" x2="50" y2="95"/>
    <line x1="50" y1="50" x2="10" y2="73"/>
    <line x1="50" y1="50" x2="10" y2="27"/>
  </g>

  <polygon points="30,30 70,30 50,65"
           fill="rgba(0,0,0,0.4)"
           stroke="var(--dice-edge, #c9a961)"
           stroke-width="0.8"/>

  <text x="50" y="50"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="'JetBrains Mono', monospace"
        font-size="22"
        font-weight="700"
        fill="var(--dice-number, #c9a961)"
        class="dice-number">--</text>
</svg>
`;

/** @type {HTMLElement | null} */
let diceContainer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let dismissTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let settleTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let releaseTimer = null;

// Dadu "busy" sejak rolling sampai settled + POST_SETTLE_DELAY.
// Selama busy, callback narasi ditahan di idleCallbacks.
let diceBusy = false;
/** @type {Array<() => void>} */
const idleCallbacks = [];

const POST_SETTLE_DELAY = 400;
const ROLL_DURATION = 1000;
const VISIBLE_AFTER_SETTLE = 2500;


export function isDiceBusy() {
  return diceBusy;
}

/**
 * Jalankan callback saat dadu idle (atau langsung kalau memang idle).
 * @param {() => void} callback
 */
export function whenDiceIdle(callback) {
  if (!diceBusy) {
    callback();
  } else {
    idleCallbacks.push(callback);
  }
}

function releaseIdleCallbacks() {
  diceBusy = false;
  // Salin & kosongkan dulu, baru jalankan — agar kalau callback
  // memicu roll baru, queue baru tidak tercampur dengan yang lama.
  const pending = idleCallbacks.splice(0);
  pending.forEach(cb => {
    try { cb(); } catch (e) { console.error('Dice idle callback error:', e); }
  });
}


function ensureDiceContainer() {
  if (diceContainer) return diceContainer;

  diceContainer = document.createElement('div');
  diceContainer.id = 'diceContainer';
  diceContainer.className = 'dice-container';
  diceContainer.innerHTML = D20_SVG;
  document.body.appendChild(diceContainer);

  return diceContainer;
}

/**
 * Tampilkan animasi dadu, settled di angka `result`.
 * Otomatis dipanggil oleh rollD20WithMod.
 *
 * @param {number} result
 * @param {boolean} isCrit
 * @param {boolean} isFumble
 */
export function animateDiceRoll(result, isCrit, isFumble) {
  const container = ensureDiceContainer();
  const numberEl = container.querySelector('.dice-number');
  if (!numberEl) return;

  // Clear semua timer dari roll sebelumnya
  if (dismissTimer) clearTimeout(dismissTimer);
  if (settleTimer) clearTimeout(settleTimer);
  if (releaseTimer) clearTimeout(releaseTimer);

  diceBusy = true;

  container.classList.remove('crit', 'fumble', 'visible', 'settled');
  numberEl.textContent = '--';

  // Force reflow agar reset terdeteksi
  void container.offsetWidth;

  container.classList.add('visible', 'rolling');

  // Cosmetic: tampilkan angka random selama rolling
  let tickerCount = 0;
  const ticker = setInterval(() => {
    if (tickerCount < 8) {
      numberEl.textContent = String(Math.floor(Math.random() * 20) + 1);
      tickerCount++;
    }
  }, 100);

  settleTimer = setTimeout(() => {
    clearInterval(ticker);
    container.classList.remove('rolling');
    container.classList.add('settled');
    numberEl.textContent = String(result);

    if (isCrit) container.classList.add('crit');
    if (isFumble) container.classList.add('fumble');

    // Setelah delay singkat, release narrative queue
    releaseTimer = setTimeout(() => {
      releaseIdleCallbacks();
    }, POST_SETTLE_DELAY);

    // Auto-dismiss visual setelah lebih lama
    dismissTimer = setTimeout(() => {
      container.classList.remove('visible');
    }, VISIBLE_AFTER_SETTLE);
  }, ROLL_DURATION);
}


// Click dadu = skip waiting
document.addEventListener('click', (e) => {
  if (diceContainer && diceContainer.classList.contains('visible') && diceContainer.contains(/** @type {Node} */ (e.target))) {
    if (dismissTimer) clearTimeout(dismissTimer);
    if (settleTimer) clearTimeout(settleTimer);
    if (releaseTimer) clearTimeout(releaseTimer);
    diceContainer.classList.remove('visible');
    if (diceBusy) releaseIdleCallbacks();
  }
});
