// @ts-check
/* ============================================================
   MAIN.JS — Game Entry Point & Scene Router
   ============================================================
   - Import semua scenes
   - Build scene registry
   - Inject navigation ke combat (untuk hindari circular deps)
   - Mulai game (init)

   File ini dimuat oleh index.html sebagai <script type="module">.
   ============================================================ */

import { state, resetState } from './engine/state.js';
import { showNarrative, showChoices } from './engine/ui.js';
import { setNavigation } from './engine/combat.js';

import { start } from './scenes/start.js';
import { townScenes } from './scenes/town.js';
import { cryptScenes } from './scenes/crypt.js';
import { forgeScenes } from './scenes/forge.js';


// ─── SCENE REGISTRY ────────────────────────────────────────
// Kumpulkan semua scene dari module-module scenes/.
// Untuk tambah dungeon baru: import + spread di sini.
/** @type {Object<string, () => void>} */
const scenes = {
  start,
  ...townScenes,
  ...cryptScenes,
  ...forgeScenes
};


/**
 * Navigasi ke scene berdasarkan ID.
 * @param {string} name
 */
export function goToScene(name) {
  state.currentScene = name;
  const scene = scenes[name];
  if (scene) {
    scene();
  } else {
    console.error(`Scene "${name}" tidak ditemukan!`);
    showNarrative(`<p class="failure">Error: scene "${name}" tidak ditemukan.</p>`);
    showChoices([{ text: 'Kembali ke awal', action: () => init() }]);
  }
}


/**
 * Reset game ke kondisi awal & mulai dari character creation.
 */
export function init() {
  resetState();
  const statusPanel = document.getElementById('statusPanel');
  if (statusPanel) statusPanel.classList.remove('active');
  document.body.className = '';
  goToScene('start');
}


// ─── BOOT ──────────────────────────────────────────────────
// Inject navigation ke combat (workaround circular import).
setNavigation(goToScene, init);

// Mulai game.
init();
