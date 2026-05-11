// @ts-check
/* ============================================================
   STATUS-EFFECTS.JS — Status Effects Helpers
   ============================================================
   Fungsi-fungsi untuk handle status effects:
     - DoT (poison, burn) tiap turn
     - Decrement buff/debuff
     - Format string status untuk display
   ============================================================ */

import { roll } from './dice.js';

/** @typedef {import('./types.js').Player} Player */
/** @typedef {import('./types.js').Monster} Monster */


/**
 * Process player DoT effects (poison, burn) di awal turn.
 * Modifikasi p.hp dan p.statusEffects (decrement counter).
 *
 * @param {Player} p
 * @returns {string} HTML log narrative dari damage yang terjadi
 */
export function processPlayerStatusEffects(p) {
  let log = '';
  if (p.statusEffects.poisoned && p.statusEffects.poisoned > 0) {
    const dmg = roll(4);
    p.hp -= dmg;
    log += `<p class="debuff">Racun bekerja: ${dmg} damage. (${p.statusEffects.poisoned - 1} turn tersisa)</p>`;
    p.statusEffects.poisoned--;
  }
  if (p.statusEffects.burning && p.statusEffects.burning > 0) {
    const dmg = roll(6);
    p.hp -= dmg;
    log += `<p class="debuff">Api masih membakar: ${dmg} damage. (${p.statusEffects.burning - 1} turn tersisa)</p>`;
    p.statusEffects.burning--;
  }
  return log;
}

/**
 * Process monster DoT effects.
 * @param {Monster} m
 * @returns {string}
 */
export function processMonsterStatusEffects(m) {
  let log = '';
  if (m.statusEffects.poisoned && m.statusEffects.poisoned > 0) {
    const dmg = roll(4);
    m.hp -= dmg;
    log += `<p class="debuff">${m.name} terkena racun: ${dmg} damage. (${m.statusEffects.poisoned - 1} turn tersisa)</p>`;
    m.statusEffects.poisoned--;
  }
  if (m.statusEffects.burning && m.statusEffects.burning > 0) {
    const dmg = roll(6);
    m.hp -= dmg;
    log += `<p class="debuff">${m.name} terbakar: ${dmg} damage. (${m.statusEffects.burning - 1} turn tersisa)</p>`;
    m.statusEffects.burning--;
  }
  return log;
}

/**
 * Kurangi durasi semua buff/debuff temporer (selain DoT).
 * Dipanggil di akhir tiap turn combat.
 *
 * @param {Player | Monster} entity
 */
export function decrementBuffs(entity) {
  const buffs = /** @type {const} */ (['frosted', 'blinded', 'stunned', 'shielded', 'advantage']);
  buffs.forEach(eff => {
    const val = entity.statusEffects[eff];
    if (val && val > 0) entity.statusEffects[eff] = val - 1;
  });
}

/**
 * Format string semua status effects aktif untuk display.
 * Return "—" kalau tidak ada effect.
 *
 * @param {Player | Monster} entity
 * @returns {string}
 */
export function getStatusString(entity) {
  /** @type {string[]} */
  const effects = [];
  const e = entity.statusEffects;
  if (e.poisoned && e.poisoned > 0)   effects.push(`Poison(${e.poisoned})`);
  if (e.burning && e.burning > 0)     effects.push(`Burn(${e.burning})`);
  if (e.frosted && e.frosted > 0)     effects.push(`Frost(${e.frosted})`);
  if (e.blinded && e.blinded > 0)     effects.push(`Blind(${e.blinded})`);
  if (e.stunned && e.stunned > 0)     effects.push(`Stun(${e.stunned})`);
  if (e.shielded && e.shielded > 0)   effects.push(`Shield(${e.shielded})`);
  if (e.advantage && e.advantage > 0) effects.push(`Advantage(${e.advantage})`);
  return effects.length ? effects.join(', ') : '—';
}
