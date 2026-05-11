// @ts-check
/* ============================================================
   STATE.JS — Global Game State
   ============================================================
   Satu objek `state` menyimpan semua tentang game saat ini.
   Source of truth tunggal — kalau mau tahu kondisi game,
   lihat ke sini.
   ============================================================ */

/** @typedef {import('./types.js').GameState} GameState */

/** @type {GameState} */
export const state = {
  player: null,
  currentScene: 'start',
  flags: {},
  rollLog: [],
  lastSafeScene: null
};

/**
 * Reset state ke kondisi awal (dipanggil saat init / new game).
 */
export function resetState() {
  state.player = null;
  state.flags = {};
  state.rollLog = [];
  state.currentScene = 'start';
  state.lastSafeScene = null;
}
