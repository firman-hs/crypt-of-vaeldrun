// @ts-check
/* ============================================================
   DICE.JS — Dice Math + Animated d20 Component
   ============================================================
   Berisi:
     - roll(sides) & rollDice(count, sides)            → math utilities
     - rollD20WithMod(mod, dc, label)                  → sync (legacy)
     - requestRollWithReroll(mod, dc, label, options)  → async w/ reroll
     - isDiceBusy() / whenDiceIdle(callback)           → sync API untuk UI

   Filosofi v2:
     Dadu adalah peristiwa, bukan hiasan. requestRollWithReroll()
     menampilkan dadu BEFORE result diketahui, beri pemain agency
     via reroll, lalu commit hasil.
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
  return { d, total, success, isCrit, isFumble };
}

/**
 * Push entri ke roll log + render.
 * @param {string} label
 * @param {DiceRollResult} r
 * @param {number} mod
 * @param {number} dc
 */
function logRoll(label, r, mod, dc) {
  const entry = `${label}: d20(${r.d}) ${mod >= 0 ? '+' : ''}${mod} = ${r.total} vs DC ${dc} → ${
    r.isCrit ? 'CRITICAL!' : r.isFumble ? 'FUMBLE!' : r.success ? 'SUCCESS' : 'FAIL'
  }`;
  state.rollLog.push(entry);
  updateLog();
}


/**
 * LEGACY: sync roll. Auto-trigger animasi tapi hasil sudah dihitung
 * sebelum animasi mulai. Dipakai untuk monster attack & internal rolls
 * yang tidak butuh tension UX dari sisi pemain.
 *
 * Untuk player attack & ability rolls, pakai `requestRollWithReroll`.
 *
 * @param {number} mod
 * @param {number} dc
 * @param {string} label
 * @returns {DiceRollResult}
 */
export function rollD20WithMod(mod, dc, label) {
  const d = roll(20);
  const r = buildResult(d, mod, dc);
  logRoll(label, r, mod, dc);
  animateDiceRoll(d, r.isCrit, r.isFumble);
  return r;
}


/**
 * NEW: async roll dengan tension UX + reroll support.
 *
 * Flow:
 *   1. Roll d20 internally
 *   2. Animasi dadu mulai (1 detik berputar)
 *   3. Dadu settle → tampilkan tombol Reroll jika options.canReroll
 *   4. Tunggu commit (auto setelah 3s, atau pemain klik reroll)
 *   5. Resolve Promise dengan hasil final
 *
 * @param {number} mod
 * @param {number} dc
 * @param {string} label
 * @param {Object} [options]
 * @param {boolean} [options.canReroll]
 * @param {() => boolean} [options.onRerollAttempt] - true=boleh reroll, false=tolak
 * @returns {Promise<DiceRollResult>}
 */
export function requestRollWithReroll(mod, dc, label, options = {}) {
  return new Promise((resolve) => {
    /** @type {DiceRollResult} */
    let currentResult = buildResult(roll(20), mod, dc);
    let isReroll = false;

    function doRoll() {
      logRoll(isReroll ? `${label} (reroll)` : label, currentResult, mod, dc);

      animateDiceRollAndWait(currentResult.d, currentResult.isCrit, currentResult.isFumble)
        .then(() => {
          if (options.canReroll) {
            offerReroll(
              // onReroll
              () => {
                if (options.onRerollAttempt && !options.onRerollAttempt()) {
                  commitResult();
                  return;
                }
                isReroll = true;
                currentResult = buildResult(roll(20), mod, dc);
                doRoll();
              },
              // onCommit
              commitResult
            );
          } else {
            setTimeout(commitResult, POST_SETTLE_DELAY);
          }
        });
    }

    function commitResult() {
      hideReroll();
      releaseIdleCallbacks();
      resolve(currentResult);
    }

    doRoll();
  });
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

const REROLL_BUTTON_HTML = `
<button id="diceRerollBtn" class="dice-reroll-btn" title="Reroll dengan 1 Fate Token">
  <span class="reroll-icon">↻</span>
  <span class="reroll-label">Reroll</span>
  <span class="reroll-cost">1 Fate</span>
</button>
`;

/** @type {HTMLElement | null} */
let diceContainer = null;
/** @type {HTMLElement | null} */
let rerollContainer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let dismissTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let settleTimer = null;

let diceBusy = false;
/** @type {Array<() => void>} */
const idleCallbacks = [];

const POST_SETTLE_DELAY = 400;
const ROLL_DURATION = 1000;
const REROLL_TIMEOUT = 3000;
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

function ensureRerollContainer() {
  if (rerollContainer) return rerollContainer;

  rerollContainer = document.createElement('div');
  rerollContainer.id = 'diceRerollContainer';
  rerollContainer.className = 'dice-reroll-container';
  rerollContainer.innerHTML = REROLL_BUTTON_HTML;
  document.body.appendChild(rerollContainer);

  return rerollContainer;
}


/**
 * LEGACY: Tampilkan animasi tanpa Promise return.
 * Dipakai untuk monster attack & internal rolls.
 *
 * @param {number} result
 * @param {boolean} isCrit
 * @param {boolean} isFumble
 */
export function animateDiceRoll(result, isCrit, isFumble) {
  animateDiceRollAndWait(result, isCrit, isFumble).then(() => {
    setTimeout(releaseIdleCallbacks, POST_SETTLE_DELAY);
    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
      if (diceContainer) diceContainer.classList.remove('visible');
    }, VISIBLE_AFTER_SETTLE - POST_SETTLE_DELAY);
  });
}


/**
 * Animasikan dadu, return Promise yang resolve saat dadu settled.
 * (Tidak auto-commit / auto-dismiss — caller yang handle.)
 *
 * @param {number} result
 * @param {boolean} isCrit
 * @param {boolean} isFumble
 * @returns {Promise<void>}
 */
function animateDiceRollAndWait(result, isCrit, isFumble) {
  return new Promise((resolve) => {
    const container = ensureDiceContainer();
    const numberEl = container.querySelector('.dice-number');
    if (!numberEl) {
      resolve();
      return;
    }

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

      resolve();
    }, ROLL_DURATION);
  });
}


/**
 * @param {() => void} onReroll
 * @param {() => void} onCommit
 */
function offerReroll(onReroll, onCommit) {
  const reroll = ensureRerollContainer();
  reroll.classList.add('visible');

  /** @type {ReturnType<typeof setTimeout>} */
  let autoCommitTimer;

  function cleanup() {
    clearTimeout(autoCommitTimer);
    reroll.classList.remove('visible');
    const btn = reroll.querySelector('#diceRerollBtn');
    if (btn) {
      /** @type {HTMLButtonElement} */ (btn).onclick = null;
    }
  }

  const btn = reroll.querySelector('#diceRerollBtn');
  if (btn) {
    /** @type {HTMLButtonElement} */ (btn).onclick = () => {
      cleanup();
      onReroll();
    };
  }

  autoCommitTimer = setTimeout(() => {
    cleanup();
    onCommit();
  }, REROLL_TIMEOUT);
}


function hideReroll() {
  if (rerollContainer) {
    rerollContainer.classList.remove('visible');
  }
  if (diceContainer) {
    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
      if (diceContainer) diceContainer.classList.remove('visible');
    }, 600);
  }
}


// Click dadu = skip waiting (untuk legacy roll)
document.addEventListener('click', (e) => {
  if (diceContainer && diceContainer.classList.contains('visible')) {
    const target = /** @type {Node} */ (e.target);
    if (rerollContainer && rerollContainer.contains(target)) return;
    if (diceContainer.contains(target)) {
      if (dismissTimer) clearTimeout(dismissTimer);
      if (settleTimer) clearTimeout(settleTimer);
      diceContainer.classList.remove('visible');
      if (diceBusy) releaseIdleCallbacks();
    }
  }
});
