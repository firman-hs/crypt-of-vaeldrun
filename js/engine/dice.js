// @ts-check
/* ============================================================
   DICE.JS — Dice Math + Animated d20 Component
   ============================================================
   Berisi:
     - roll(sides) & rollDice(count, sides)         → math utilities
     - rollD20WithMod(mod, dc, label, options)      → canonical D&D d20 roll
     - isDiceBusy() / whenDiceIdle(callback)        → sync API untuk UI

   Filosofi (canon D&D 5e):
     - Dadu di-roll HANYA kalau hasilnya tidak pasti
     - Auto-resolve untuk task trivial (modifier menjamin sukses)
       atau mustahil (modifier menjamin gagal)
     - Advantage/Disadvantage: roll 2d20, ambil tertinggi/terendah
     - Tidak ada reroll murni (tidak canon) — gunakan advantage sebagai gantinya
   ============================================================ */

import { state } from './state.js';

/** @typedef {import('./types.js').DiceRollResult} DiceRollResult */

/**
 * @typedef {Object} RollOptions
 * @property {boolean} [advantage]    - roll 2d20, ambil tertinggi
 * @property {boolean} [disadvantage] - roll 2d20, ambil terendah
 * @property {boolean} [noAutoResolve] - paksa roll meski hasilnya pasti (rare case)
 */


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
 * Build hasil roll dari nilai dadu mentah + modifier + DC.
 *
 * @param {number} d - hasil dadu mentah (1-20)
 * @param {number} mod
 * @param {number} dc
 * @returns {DiceRollResult}
 */
function buildResult(d, mod, dc) {
  const total = d + mod;
  const isCrit = d === 20;
  const isFumble = d === 1;
  const success = isCrit ? true : isFumble ? false : total >= dc;
  return { d, total, success, isCrit, isFumble, auto: false };
}


/**
 * Cek apakah roll bisa auto-resolved (hasilnya sudah pasti).
 *
 * Auto-success: min_roll (1 + mod) >= DC → bahkan dadu jelek pun sukses
 * Auto-fail:    max_roll (20 + mod) < DC → bahkan dadu sempurna gagal
 *
 * Catatan: natural 20 selalu crit success di D&D, jadi auto-fail
 * hanya kalau 20 + mod < DC (mustahil sekalipun nat 20).
 *
 * @param {number} mod
 * @param {number} dc
 * @returns {DiceRollResult | null} - result kalau auto-resolved, null kalau perlu roll
 */
function tryAutoResolve(mod, dc) {
  const minRoll = 1 + mod;
  const maxRoll = 20 + mod;

  if (maxRoll < dc) {
    // Mustahil sukses (bahkan nat 20 tidak cukup)
    return { d: 0, total: maxRoll, success: false, isCrit: false, isFumble: false, auto: true };
  }
  if (minRoll >= dc) {
    // Pasti sukses (bahkan nat 1 cukup) — tapi natural 1 di canon = miss attack
    // Untuk ability check, minRoll >= DC = pasti sukses
    return { d: 0, total: minRoll, success: true, isCrit: false, isFumble: false, auto: true };
  }
  return null;
}


/**
 * Push entri ke roll log + render.
 * @param {string} label
 * @param {DiceRollResult} r
 * @param {number} mod
 * @param {number} dc
 * @param {RollOptions} [options]
 */
function logRoll(label, r, mod, dc, options = {}) {
  const advTag = options.advantage ? ' [ADV]' : options.disadvantage ? ' [DIS]' : '';
  const autoTag = r.auto ? ' [AUTO]' : '';
  const diceStr = r.auto ? 'auto' : `d20(${r.d})`;
  const entry = `${label}${advTag}${autoTag}: ${diceStr} ${mod >= 0 ? '+' : ''}${mod} = ${r.total} vs DC ${dc} → ${
    r.isCrit ? 'CRITICAL!' : r.isFumble ? 'FUMBLE!' : r.success ? 'SUCCESS' : 'FAIL'
  }`;
  state.rollLog.push(entry);
  updateLog();
}


/**
 * Roll d20 + modifier vs DC.
 *
 * Sync function — hasil tersedia langsung. Auto-trigger animasi dadu
 * di background (kecuali kalau auto-resolved).
 *
 * @param {number} mod
 * @param {number} dc
 * @param {string} label
 * @param {RollOptions} [options]
 * @returns {DiceRollResult}
 */
export function rollD20WithMod(mod, dc, label, options = {}) {
  // ── Auto-resolve check ────────────────────────────────────
  if (!options.noAutoResolve) {
    const autoResult = tryAutoResolve(mod, dc);
    if (autoResult) {
      logRoll(label, autoResult, mod, dc, options);
      // Tidak animasi — caller pakai r.auto untuk adjust narasi
      return autoResult;
    }
  }

  // ── Roll dadu ─────────────────────────────────────────────
  let d;
  if (options.advantage) {
    const d1 = roll(20), d2 = roll(20);
    d = Math.max(d1, d2);
  } else if (options.disadvantage) {
    const d1 = roll(20), d2 = roll(20);
    d = Math.min(d1, d2);
  } else {
    d = roll(20);
  }

  const r = buildResult(d, mod, dc);
  logRoll(label, r, mod, dc, options);
  animateDiceRoll(d, r.isCrit, r.isFumble);
  return r;
}


function updateLog() {
  const log = document.getElementById('log');
  if (!log) return;
  log.innerHTML = state.rollLog.slice(-20).map((e, i) => {
    const num = state.rollLog.length - Math.min(20, state.rollLog.length) + i + 1;
    return `<div><span class="turn">[${String(num).padStart(2, '0')}]</span> ${e}</div>`;
  }).join('');
}


// ─── ANIMATION ──────────────────────────────────────────────

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
 * Tampilkan animasi dadu. Fire-and-forget — caller tidak menunggu,
 * tapi UI queue (showNarrative/showChoices) akan tunggu via whenDiceIdle.
 *
 * @param {number} result
 * @param {boolean} isCrit
 * @param {boolean} isFumble
 */
export function animateDiceRoll(result, isCrit, isFumble) {
  const container = ensureDiceContainer();
  const numberEl = container.querySelector('.dice-number');
  if (!numberEl) return;

  if (dismissTimer) clearTimeout(dismissTimer);
  if (settleTimer) clearTimeout(settleTimer);

  diceBusy = true;

  container.classList.remove('crit', 'fumble', 'visible', 'settled');
  numberEl.textContent = '--';

  void container.offsetWidth;

  container.classList.add('visible', 'rolling');

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

    // Setelah settle, release queue dan auto-dismiss
    setTimeout(releaseIdleCallbacks, POST_SETTLE_DELAY);
    dismissTimer = setTimeout(() => {
      if (diceContainer) diceContainer.classList.remove('visible');
    }, VISIBLE_AFTER_SETTLE - POST_SETTLE_DELAY);
  }, ROLL_DURATION);
}


// Click dadu = skip waiting
document.addEventListener('click', (e) => {
  if (diceContainer && diceContainer.classList.contains('visible')) {
    const target = /** @type {Node} */ (e.target);
    if (diceContainer.contains(target)) {
      if (dismissTimer) clearTimeout(dismissTimer);
      if (settleTimer) clearTimeout(settleTimer);
      diceContainer.classList.remove('visible');
      if (diceBusy) releaseIdleCallbacks();
    }
  }
});
