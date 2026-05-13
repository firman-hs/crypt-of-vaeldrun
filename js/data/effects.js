// @ts-check
/* ============================================================
   DATA/EFFECTS.JS — Status Effect Registry
   ============================================================
   Definisi declarative semua status effect. Engine baca dari sini.

   Cara tambah effect baru:
     1. Tambah entry di STATUS_EFFECTS dengan id (camelCase).
     2. Tentukan: type ('dot' | 'modifier'), stack ('intensity' | 'duration' | 'refresh').
     3. Untuk DoT: provide damage() dan narrative().
        Untuk modifier: provide modifier ({ toHit, damageReduction, skipTurn }).
     4. Selesai. Tidak perlu edit engine atau combat.

   Stacking mode:
     - 'intensity': stacks++, turns = max(old, new). Damage/efek × stacks.
                    Cocok: DoT (poison damage stack), Shield kalau mau OP.
     - 'duration':  turns += new. Cocok: debuff yang mau extend durasinya.
     - 'refresh':   turns = new. Cocok: binary on/off effect (stun, shield aman).
   ============================================================ */

import { roll } from '../engine/dice.js';

/** @typedef {import('../engine/types.js').StatusEffectDef} StatusEffectDef */
/** @typedef {Object<string, StatusEffectDef>} StatusEffectRegistry */


/** @type {StatusEffectRegistry} */
export const STATUS_EFFECTS = {
  // ─── DOT (damage over time) ───────────────────────────────
  poisoned: {
    name: 'Poison',
    type: 'dot',
    stack: 'intensity',
    damage: () => roll(4),
    narrative: (target, dmg, stacks) =>
      `${target} terkena racun: ${dmg} damage${stacks > 1 ? ` <em>(×${stacks} stacks)</em>` : ''}.`
  },

  burning: {
    name: 'Burn',
    type: 'dot',
    stack: 'intensity',
    damage: () => roll(6),
    narrative: (target, dmg, stacks) =>
      `${target} terbakar: ${dmg} damage${stacks > 1 ? ` <em>(×${stacks} stacks)</em>` : ''}.`
  },

  // ─── MODIFIER (debuff/buff aktif selama X turn) ──────────
  frosted: {
    name: 'Frost',
    type: 'modifier',
    stack: 'duration',           // cast lagi = extend turn, debuff tetap -2
    modifier: { toHit: -2 }
  },

  blinded: {
    name: 'Blind',
    type: 'modifier',
    stack: 'refresh',
    modifier: { toHit: -4 }
  },

  stunned: {
    name: 'Stun',
    type: 'modifier',
    stack: 'refresh',            // binary: stunned atau tidak
    modifier: { skipTurn: true }
  },

  shielded: {
    name: 'Shield',
    type: 'modifier',
    stack: 'refresh',            // cast 2x = reset saja, anti-abuse
    modifier: { damageReduction: () => roll(8) }
  }
};
