// @ts-check
/* ============================================================
   SCENES/START.JS — Character Creation
   ============================================================
   Scene pembuka: prolog + class selection + ability intro.
   Dipisah dari main.js untuk konsistensi struktur.
   ============================================================ */

import { state } from '../engine/state.js';
import { showNarrative, showChoices, updateStatusPanel } from '../engine/ui.js';
import { CLASSES } from '../data/classes.js';
import { ABILITIES } from '../data/abilities.js';
import { goToScene } from '../main.js';

/** @typedef {import('../engine/types.js').ClassId} ClassId */
/** @typedef {import('../engine/types.js').Player} Player */


export function start() {
  showNarrative(`
    <p class="scene-title">Prolog</p>
    <p>Sebuah surat datang ke gerbang kotamu — ditulis dengan tinta yang sudah mengering, dengan tangan yang gemetar. Pengirimnya: tetua desa terpencil bernama <em>Aethelford</em>. Permintaannya sederhana: bantulah kami, atau wilayah ini akan tenggelam dalam dua bencana sekaligus.</p>
    <p>Kau menerima permintaan itu. Setelah beberapa hari di jalan, kau tiba di pinggir hutan yang menghadap desa itu. Tapi sebelum kau melangkah lebih dekat, takdir bertanya:</p>
    <p class="whisper"><em>siapa kau?</em></p>
  `);

  const container = document.getElementById('choices');
  if (!container) return;

  container.innerHTML = `
    <div class="class-selector">
      ${Object.entries(CLASSES).map(([key, c]) => `
        <div class="class-card class-${key}" data-class="${key}">
          <div class="icon">${c.icon}</div>
          <h3>${c.name}</h3>
          <p>${c.desc}</p>
          <div class="stats">HP ${c.hp} · STR ${c.stats.STR >=0?'+':''}${c.stats.STR} · DEX ${c.stats.DEX >=0?'+':''}${c.stats.DEX} · INT ${c.stats.INT >=0?'+':''}${c.stats.INT}<br>${c.weapon.name}<br><span class="resource-tag">${c.resource.name} ${c.resource.max}</span></div>
        </div>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.class-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = /** @type {ClassId} */ (/** @type {HTMLElement} */ (card).dataset.class);
      const c = CLASSES[key];

      /** @type {Player} */
      const player = {
        class: key,
        className: c.name,
        level: 1,
        xp: 0,
        gold: 15,
        hp: c.hp,
        maxHp: c.hp,
        stats: { ...c.stats },
        weapon: { ...c.weapon },
        resource: {
          name: c.resource.name,
          max: c.resource.max,
          current: c.resource.max,
          regen: c.resource.regen
        },
        abilities: [...c.abilities],
        statusEffects: {},
        fateTokens: 3,
        maxFateTokens: 3
      };
      state.player = player;
      updateStatusPanel();
      showAbilityIntro();
    });
  });
}


function showAbilityIntro() {
  const p = state.player;
  if (!p) return;

  const abilityList = p.abilities.map(id => {
    const a = ABILITIES[id];
    return `<p><span class="ability">${a.name}</span> <span class="roll">${a.cost} ${p.resource.name}</span><br><span class="whisper">${a.desc}</span></p>`;
  }).join('');

  showNarrative(`
    <p class="scene-title">Kemampuanmu</p>
    <p>Sebagai seorang <em>${p.className}</em>, kau menguasai tiga teknik. Kau memiliki <span class="ability">${p.resource.max} ${p.resource.name}</span>, beregenerasi <em>+${p.resource.regen}/turn</em> dalam pertempuran.</p>
    ${abilityList}
    <p>Selain itu, kau memiliki <span class="ability">${p.maxFateTokens} Fate Tokens</span> — takdir yang bisa kau paksa untuk berputar ulang. Saat dadu jatuh dalam pertempuran, kau punya kesempatan singkat untuk <em>reroll</em> dengan biaya 1 Fate Token. Fate Tokens pulih saat beristirahat di penginapan.</p>
    <p class="whisper">— Pakailah dengan bijak, sebab pertempuran tidak menunggu yang lambat. —</p>
  `);
  showChoices([{ text: 'Masuki Aethelford', action: () => goToScene('town') }]);
}
