// @ts-check
/* ============================================================
   ENGINE/EFFECTS.JS — Status Effects Engine
   ============================================================
   Engine generic yang membaca registry dari data/effects.js.
   Tidak ada hardcode nama effect di sini — tambah effect baru cukup
   edit data/effects.js.

   Public API:
     - applyEffect(entity, id, duration)
     - processDoT(entity, displayName)  → string log
     - tickModifiers(entity)
     - getModifier(entity, key)         → number | boolean
     - getStatusString(entity)          → string display
   ============================================================ */

import { STATUS_EFFECTS } from '../data/effects.js';

/** @typedef {import('./types.js').Player} Player */
/** @typedef {import('./types.js').Monster} Monster */


/**
 * Apply effect ke entity. Handle stacking sesuai mode di registry.
 * No-op kalau effect ID tidak valid.
 *
 * @param {Player | Monster} entity
 * @param {string} effectId
 * @param {number} duration
 */
export function applyEffect(entity, effectId, duration) {
  const def = STATUS_EFFECTS[effectId];
  if (!def) {
    console.warn(`applyEffect: effect "${effectId}" tidak ada di registry`);
    return;
  }

  const existing = entity.statusEffects[effectId];

  // First-time application
  if (!existing) {
    entity.statusEffects[effectId] = { turns: duration, stacks: 1 };
    return;
  }

  // Re-application — handle sesuai stack mode
  switch (def.stack) {
    case 'intensity':
      existing.stacks += 1;
      existing.turns = Math.max(existing.turns, duration);
      break;
    case 'duration':
      existing.turns += duration;
      break;
    case 'refresh':
      existing.turns = duration;
      break;
  }
}


/**
 * Process semua DoT effects yang aktif. Apply damage ke entity.hp,
 * dekrement turns, hapus dari map kalau habis.
 *
 * Dipanggil di AWAL turn (player phase & monster phase).
 *
 * @param {Player | Monster} entity
 * @param {string} displayName    - nama untuk narrative ("Kau" atau monster name)
 * @returns {string}              - HTML log dari semua DoT yang trigger
 */
export function processDoT(entity, displayName) {
  let log = '';
  for (const [id, state] of Object.entries(entity.statusEffects)) {
    const def = STATUS_EFFECTS[id];
    if (!def || def.type !== 'dot' || !def.damage || !def.narrative) continue;

    const dmg = def.damage() * state.stacks;
    entity.hp -= dmg;
    log += `<p class="debuff">${def.narrative(displayName, dmg, state.stacks)}</p>`;

    state.turns--;
    if (state.turns <= 0) delete entity.statusEffects[id];
  }
  return log;
}


/**
 * Dekrement durasi semua modifier effect. Dipanggil di AKHIR turn.
 * DoT tidak ikut di sini — DoT sudah didekrement di processDoT().
 *
 * @param {Player | Monster} entity
 */
export function tickModifiers(entity) {
  for (const [id, state] of Object.entries(entity.statusEffects)) {
    const def = STATUS_EFFECTS[id];
    if (!def || def.type !== 'modifier') continue;

    state.turns--;
    if (state.turns <= 0) delete entity.statusEffects[id];
  }
}


/**
 * Baca akumulasi modifier dari semua effect aktif yang punya key tsb.
 *
 * Numeric keys (toHit, damageReduction):
 *   - Loop semua effect aktif, ambil modifier[key]
 *   - Kalau function: panggil (dadu). Kalau number: pakai langsung.
 *   - Multiply × stacks, akumulasi total.
 *
 * Boolean key (skipTurn):
 *   - Return true kalau ada effect aktif dengan skipTurn=true.
 *
 * @param {Player | Monster} entity
 * @param {string} key             - 'toHit' | 'damageReduction' | 'skipTurn'
 * @returns {number | boolean}
 */
export function getModifier(entity, key) {
  // Boolean modifier: skipTurn
  if (key === 'skipTurn') {
    for (const [id, state] of Object.entries(entity.statusEffects)) {
      const def = STATUS_EFFECTS[id];
      if (def?.modifier?.skipTurn && state.turns > 0) return true;
    }
    return false;
  }

  // Numeric modifier: akumulasi semua effect yang punya key ini
  let total = 0;
  for (const [id, state] of Object.entries(entity.statusEffects)) {
    if (state.turns <= 0) continue;
    const def = STATUS_EFFECTS[id];
    const mod = def?.modifier?.[key];
    if (mod === undefined) continue;

    const value = typeof mod === 'function' ? mod() : mod;
    total += value * state.stacks;
  }
  return total;
}


/**
 * Format string semua status effects aktif untuk display.
 * Format: "Poison(2×3), Stun(1)" — stacks hanya muncul kalau > 1.
 *
 * @param {Player | Monster} entity
 * @returns {string}
 */
export function getStatusString(entity) {
  /** @type {string[]} */
  const parts = [];
  for (const [id, state] of Object.entries(entity.statusEffects)) {
    const def = STATUS_EFFECTS[id];
    if (!def || state.turns <= 0) continue;
    const stackTag = state.stacks > 1 ? `×${state.stacks}` : '';
    parts.push(`${def.name}(${state.turns}${stackTag})`);
  }
  return parts.length ? parts.join(', ') : '—';
}
