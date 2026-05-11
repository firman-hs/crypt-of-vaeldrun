// @ts-check
/* ============================================================
   COMBAT.JS — Combat Engine
   ============================================================
   Turn-based combat dengan dice-aware narrative queue.

   Flow tiap turn:
     1. Player phase (DoT + aksi) → appendNarrative
     2. Tunggu dadu settled (whenDiceIdle)
     3. Monster phase (DoT + serangan) → appendNarrative
     4. Render tombol turn berikutnya

   Entry: combat(monsterIdOrObj, onWinCallback)

   Catatan dependency: combat butuh akses ke goToScene & init
   (untuk flee & death), tapi keduanya didefinisikan di main.js
   yang juga import combat (via scenes). Untuk hindari circular
   import, main.js inject fungsi-fungsi ini via setNavigation()
   saat startup.
   ============================================================ */

import { state } from './state.js';
import { roll, rollD20WithMod, requestRollWithReroll, whenDiceIdle } from './dice.js';
import {
  showNarrative, appendNarrative, showChoices, clearChoices,
  updateStatusPanel, gainXP
} from './ui.js';
import {
  processPlayerStatusEffects, processMonsterStatusEffects,
  decrementBuffs, getStatusString
} from './status-effects.js';
import { ABILITIES } from '../data/abilities.js';
import { getMonster } from '../data/monsters.js';

/** @typedef {import('./types.js').Player} Player */
/** @typedef {import('./types.js').Monster} Monster */


// ─── Dependency injection untuk navigation ─────────────────
// main.js akan panggil setNavigation() saat startup.

/** @type {((name: string) => void) | null} */
let _goToScene = null;
/** @type {(() => void) | null} */
let _init = null;

/**
 * Dipanggil oleh main.js untuk inject navigation functions.
 * @param {(name: string) => void} goToSceneFn
 * @param {() => void} initFn
 */
export function setNavigation(goToSceneFn, initFn) {
  _goToScene = goToSceneFn;
  _init = initFn;
}


/**
 * Mulai pertempuran. Bisa terima monster ID (string) atau
 * custom Monster object (untuk modifier khusus seperti scout).
 *
 * @param {string | Monster} monsterIdOrObj
 * @param {() => void} onWin
 */
export function combat(monsterIdOrObj, onWin) {
  const p = state.player;
  if (!p) {
    showNarrative(`<p class="failure">Error: tidak ada player aktif.</p>`);
    return;
  }

  /** @type {Monster | null} */
  const m = typeof monsterIdOrObj === 'string'
    ? getMonster(monsterIdOrObj)
    : { ...monsterIdOrObj, hp: monsterIdOrObj.maxHp, statusEffects: monsterIdOrObj.statusEffects || {} };

  if (!m) {
    showNarrative(`<p class="failure">Error: monster tidak ditemukan.</p>`);
    return;
  }

  /** @type {Set<string>} */
  const usedOnceAbilities = new Set();

  /**
   * Eksekusi satu turn combat dengan aksi pemain.
   * Player phase: async (untuk dadu tension), monster phase: sync setelahnya.
   *
   * @param {'attack' | 'ability' | 'flee'} action
   * @param {string} [abilityId]
   */
  async function combatTurn(action, abilityId) {
    clearChoices();

    // ─── PLAYER PHASE ───────────────────────────────────────
    let playerLog = '';

    playerLog += processPlayerStatusEffects(p);
    updateStatusPanel();
    if (p.hp <= 0) {
      if (playerLog) appendNarrative(playerLog);
      return playerDeath();
    }
    if (playerLog) {
      appendNarrative(playerLog);
      playerLog = '';
    }

    if (action === 'attack') {
      const attackLog = await playerAttack(p, m);
      appendNarrative(attackLog);
    } else if (action === 'ability' && abilityId) {
      const ab = ABILITIES[abilityId];
      p.resource.current -= ab.cost;
      if (ab.once) usedOnceAbilities.add(abilityId);
      const abilityLog = ab.use(p, m);
      appendNarrative(abilityLog);
    } else if (action === 'flee') {
      const fleeOk = await tryFlee(p);
      if (fleeOk) return;
    }

    updateStatusPanel();

    if (m.hp <= 0) return victory();

    // ─── MONSTER PHASE ──────────────────────────────────────
    // Tunggu dadu player committed sebelum monster bertindak.
    whenDiceIdle(() => doMonsterPhase());
  }

  function doMonsterPhase() {
    let monsterLog = '';

    monsterLog += processMonsterStatusEffects(m);
    if (m.hp <= 0) {
      if (monsterLog) appendNarrative(monsterLog);
      return victory();
    }

    if (m.statusEffects.stunned && m.statusEffects.stunned > 0) {
      monsterLog += `<p class="buff">${m.name} terhuyung dan kehilangan giliran.</p>`;
    } else {
      monsterLog += monsterAttack(p, m);
    }

    decrementBuffs(p);
    decrementBuffs(m);

    p.resource.current = Math.min(p.resource.max, p.resource.current + p.resource.regen);
    updateStatusPanel();

    const statusStr = getStatusString(m);
    monsterLog += `<p class="whisper">— ${m.name}: ${m.hp}/${m.maxHp} HP — ${statusStr !== '—' ? `Status: ${statusStr} —` : ''}</p>`;
    appendNarrative(monsterLog);

    if (p.hp <= 0) return playerDeath();

    renderCombatChoices();
  }

  /**
   * Coba flee dengan DEX check (dengan dadu tension + reroll).
   * Return true jika flee sukses (caller hentikan combat).
   * @param {import('./types.js').Player} p
   * @returns {Promise<boolean>}
   */
  async function tryFlee(p) {
    const dc = 14;
    appendNarrative(`<p class="whisper">Mencoba melarikan diri... <em>butuh ≥${dc - p.stats.DEX}</em></p>`);

    const r = await requestRollWithReroll(p.stats.DEX, dc, 'Flee', {
      canReroll: p.fateTokens > 0,
      onRerollAttempt: () => {
        if (p.fateTokens > 0) {
          p.fateTokens--;
          updateStatusPanel();
          return true;
        }
        return false;
      }
    });

    if (r.success) {
      appendNarrative(`<p>Kau berhasil melarikan diri ke kegelapan. <span class="roll">d20(${r.d})+${p.stats.DEX} = ${r.total} vs DC ${dc}</span></p>`);
      showChoices([{ text: 'Lanjutkan', action: () => fleeBackToSafe() }]);
      return true;
    }
    appendNarrative(`<p class="failure">Kau gagal kabur — kakimu tersandung. <span class="roll">d20(${r.d})+${p.stats.DEX} = ${r.total} vs DC ${dc}</span></p>`);
    return false;
  }

  function victory() {
    const log = `
      <p class="success">✦ ${m.name} jatuh, tidak bergerak lagi.</p>
      <p class="loot">Kau memperoleh ${m.xp} XP${m.gold ? ` dan ${m.gold} keping emas` : ''}.</p>
    `;
    gainXP(m.xp);
    p.gold += m.gold || 0;
    p.resource.current = Math.min(p.resource.max, p.resource.current + Math.ceil(p.resource.max / 2));
    p.statusEffects = {};
    updateStatusPanel();
    appendNarrative(log);
    showChoices([{ text: 'Lanjutkan perjalanan', action: onWin }]);
  }

  function playerDeath() {
    p.hp = 0;
    updateStatusPanel();
    appendNarrative(`<p class="failure">✦ Pandanganmu meredup. Kau tumbang di lantai dingin...</p>`);
    showChoices([{
      text: 'Mulai lagi',
      action: () => _init && _init()
    }]);
  }

  function fleeBackToSafe() {
    const target = state.lastSafeScene || 'town';
    if (_goToScene) _goToScene(target);
  }

  function renderCombatChoices() {
    /** @type {import('./types.js').Choice[]} */
    const choices = [
      { text: `Serang dengan ${p.weapon.name}`, action: () => combatTurn('attack') }
    ];

    p.abilities.forEach(abId => {
      const ab = ABILITIES[abId];
      const cantAfford = p.resource.current < ab.cost;
      const usedUp = ab.once === true && usedOnceAbilities.has(abId);
      choices.push({
        text: ab.name,
        cost: ab.cost,
        desc: ab.desc + (usedUp ? ' (sudah dipakai)' : ''),
        disabled: cantAfford || usedUp,
        action: () => combatTurn('ability', abId)
      });
    });

    choices.push({
      text: 'Coba melarikan diri',
      hint: '— DEX check DC 14',
      action: () => combatTurn('flee')
    });

    showChoices(choices);
  }

  // Mulai combat
  showNarrative(`
    <p class="scene-title">⚔ Pertempuran ⚔</p>
    <p>${m.intro}</p>
    <p class="whisper">— ${m.name}: ${m.hp}/${m.maxHp} HP —</p>
  `);
  renderCombatChoices();
}


/**
 * Serangan dasar player dengan senjata.
 * Async: tampilkan threshold dulu, lalu dadu (dengan kesempatan reroll),
 * lalu hitung damage dan return narrative log.
 *
 * @param {Player} p
 * @param {Monster} m
 * @returns {Promise<string>}
 */
async function playerAttack(p, m) {
  let mod = p.stats[p.weapon.stat];
  if (p.statusEffects.advantage && p.statusEffects.advantage > 0) mod += 5;

  const dc = m.ac;
  const threshold = dc - mod;

  // Tampilkan konteks sebelum dadu
  appendNarrative(`<p class="whisper">Kau mengayun ${p.weapon.name} ke arah ${m.name}... <em>butuh ≥${threshold}</em></p>`);

  const r = await requestRollWithReroll(mod, dc, `Attack vs ${m.name}`, {
    canReroll: p.fateTokens > 0,
    onRerollAttempt: () => {
      if (p.fateTokens > 0) {
        p.fateTokens--;
        updateStatusPanel();
        return true;
      }
      return false;
    }
  });

  if (r.success) {
    let dmg = roll(p.weapon.dmg[1]) + p.weapon.dmg[0] - 1 + Math.max(0, p.stats[p.weapon.stat]);
    if (r.isCrit) dmg *= 2;
    m.hp -= dmg;
    return `<p>Mata pedangmu menemukan celah. <span class="roll">d20(${r.d})+${mod} = ${r.total} vs AC ${m.ac}</span></p>
            <p class="success">${r.isCrit ? '✦ CRITICAL HIT! ' : ''}Kena! ${dmg} damage.</p>`;
  }
  return `<p>Ayunanmu memecah udara saja. <span class="roll">d20(${r.d})+${mod} = ${r.total} vs AC ${m.ac}</span></p>
          <p class="failure">${r.isFumble ? '✦ FUMBLE! ' : ''}Meleset.</p>`;
}


/**
 * Serangan dasar monster ke player.
 * @param {Player} p
 * @param {Monster} m
 * @returns {string}
 */
function monsterAttack(p, m) {
  let toHit = m.toHit;
  if (m.statusEffects.frosted && m.statusEffects.frosted > 0) toHit -= 2;
  if (m.statusEffects.blinded && m.statusEffects.blinded > 0) toHit -= 4;

  const dc = 10 + p.stats.DEX;
  const mr = rollD20WithMod(toHit, dc, `${m.name} attack`);
  if (mr.success) {
    let dmg = roll(m.dmg[1]) + m.dmg[0] - 1;
    if (mr.isCrit) dmg *= 2;
    if (p.statusEffects.shielded && p.statusEffects.shielded > 0) {
      const reduction = roll(8);
      const original = dmg;
      dmg = Math.max(0, dmg - reduction);
      p.hp -= dmg;
      return `<p>${m.name} menyerang. <span class="roll">d20(${mr.d})+${toHit} = ${mr.total}</span></p>
              <p class="buff">Arcane Shield menyerap ${reduction} dari ${original} damage.</p>
              <p class="${dmg > 0 ? 'failure' : 'success'}">Kau menerima ${dmg} damage.</p>`;
    }
    p.hp -= dmg;
    return `<p>${m.name} menyerang balik. <span class="roll">d20(${mr.d})+${toHit} = ${mr.total}</span></p>
            <p class="failure">${mr.isCrit ? '✦ CRITICAL! ' : ''}Kau menerima ${dmg} damage.</p>`;
  }
  return `<p>${m.name} mengayun tapi meleset. <span class="roll">d20(${mr.d})+${toHit} = ${mr.total}</span></p>`;
}
