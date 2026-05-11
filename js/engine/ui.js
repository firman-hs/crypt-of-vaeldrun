// @ts-check
/* ============================================================
   UI.JS — UI Rendering
   ============================================================
   Semua fungsi yang ngetweak DOM ada di sini.

   - updateStatusPanel  : refresh HP bar, gold, stat, dll
   - showNarrative      : ganti isi narrative box (queue-aware)
   - appendNarrative    : tambah chunk ke narrative box (queue-aware)
   - showChoices        : render tombol pilihan (queue-aware)
   - clearChoices       : kosongkan tombol seketika (bukan queue)
   - gainXP             : tambah XP + auto level up

   "Queue-aware" = fungsi otomatis tunggu animasi dadu selesai
   sebelum render, lewat whenDiceIdle() dari dice.js.
   ============================================================ */

import { state } from './state.js';
import { whenDiceIdle } from './dice.js';
import { getStatusString } from './status-effects.js';

/** @typedef {import('./types.js').Choice} Choice */


// ─── STATUS PANEL ───────────────────────────────────────────

/**
 * Refresh seluruh status panel sesuai state.player.
 * Panggil ini setiap kali player.hp, gold, atau stat berubah.
 */
export function updateStatusPanel() {
  if (!state.player) return;
  const p = state.player;

  /** @type {HTMLElement | null} */
  const panel = document.getElementById('statusPanel');
  if (panel) panel.classList.add('active');
  document.body.className = `class-${p.class}`;

  setText('charClass', p.className);
  setText('charLevel', String(p.level));
  setText('charXP', `${p.xp} / ${p.level * 100}`);
  setText('charGold', String(p.gold));
  setText('charHP', `${p.hp}/${p.maxHp}`);

  /** @type {HTMLElement | null} */
  const hpFill = document.getElementById('hpFill');
  if (hpFill) hpFill.style.width = `${(p.hp / p.maxHp) * 100}%`;

  setText('resourceLabel', p.resource.name);
  setText('charResource', `${p.resource.current}/${p.resource.max}`);

  /** @type {HTMLElement | null} */
  const resFill = document.getElementById('resourceFill');
  if (resFill) resFill.style.width = `${(p.resource.current / p.resource.max) * 100}%`;

  (/** @type {const} */ (['STR', 'DEX', 'INT', 'CON'])).forEach(s => {
    const v = p.stats[s];
    setText(`stat${s}`, (v >= 0 ? '+' : '') + v);
  });

  setText('charWeapon', p.weapon.name);
  setText('charFate', `${p.fateTokens} / ${p.maxFateTokens}`);
  const fateEl = document.getElementById('charFate');
  if (fateEl) fateEl.classList.toggle('fate-low', p.fateTokens <= 1);
  setText('charStatus', getStatusString(p));
}

/**
 * Helper: set textContent dari elemen by ID, no-op kalau gak ada.
 * @param {string} id
 * @param {string} text
 */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}


// ─── NARRATIVE & CHOICES (queue-aware) ──────────────────────

/**
 * Internal: jalankan fn sekarang, atau tunda sampai dadu idle.
 * @param {() => void} fn
 */
function queueOrRun(fn) {
  whenDiceIdle(fn);
}

/**
 * Replace isi narrative box. Queue-aware: tunggu dadu settled
 * sebelum render.
 *
 * @param {string} html
 */
export function showNarrative(html) {
  queueOrRun(() => {
    const el = document.getElementById('narrativeContent');
    if (!el) return;
    el.classList.remove('fade-in');
    void el.offsetWidth;
    el.innerHTML = html;
    el.classList.add('fade-in');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Append HTML ke narrative box (tidak menggantikan).
 * Dipakai combat.js untuk menumpuk player + monster log di box yang sama.
 *
 * @param {string} html
 */
export function appendNarrative(html) {
  queueOrRun(() => {
    const el = document.getElementById('narrativeContent');
    if (!el) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'fade-in';
    wrapper.innerHTML = html;
    el.appendChild(wrapper);
    el.scrollTop = el.scrollHeight;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
}

/**
 * Render tombol pilihan. Queue-aware: tunggu dadu settled.
 * Container langsung dikosongkan supaya tombol lama hilang
 * selama animasi (mencegah spam-click).
 *
 * @param {Choice[]} choices
 */
export function showChoices(choices) {
  clearChoices();
  queueOrRun(() => renderChoices(choices));
}

/**
 * Bersihkan tombol seketika (tidak queue). Dipakai combat saat
 * player baru memilih aksi.
 */
export function clearChoices() {
  const el = document.getElementById('choices');
  if (el) el.innerHTML = '';
}

/**
 * Logika render tombol — dipisah biar bisa dipanggil instan
 * (saat ini cuma dipanggil dari showChoices via queueOrRun).
 *
 * @param {Choice[]} choices
 */
function renderChoices(choices) {
  const container = document.getElementById('choices');
  if (!container) return;
  container.innerHTML = '';
  choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn fade-in';
    btn.style.animationDelay = `${i * 0.08}s`;

    let html = c.text;
    if (c.cost !== undefined && state.player) {
      const affordable = state.player.resource.current >= c.cost;
      html += ` <span class="cost ${affordable ? '' : 'unaffordable'}">${c.cost} ${state.player.resource.name.slice(0, 3).toUpperCase()}</span>`;
    }
    if (c.hint) html += ` <span class="hint">${c.hint}</span>`;
    if (c.desc) html += `<span class="desc">${c.desc}</span>`;

    btn.innerHTML = html;
    if (c.disabled) btn.disabled = true;
    btn.onclick = () => c.action();
    container.appendChild(btn);
  });
}


// ─── XP & LEVELING ──────────────────────────────────────────

/**
 * Tambah XP ke player, auto level up kalau cukup.
 * Level up: +4 maxHp (full heal), +1 maxResource (full restore).
 *
 * @param {number} amount
 */
export function gainXP(amount) {
  const p = state.player;
  if (!p) return;
  p.xp += amount;
  while (p.xp >= p.level * 100) {
    p.xp -= p.level * 100;
    p.level++;
    p.maxHp += 4;
    p.hp = p.maxHp;
    p.resource.max += 1;
    p.resource.current = p.resource.max;
  }
}


// ─── LOG TOGGLE EVENT ───────────────────────────────────────
// Aktifkan tombol "Lihat Catatan Roll" setelah DOM siap.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('logToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const log = document.getElementById('log');
      if (log) log.classList.toggle('visible');
    });
  }
});
