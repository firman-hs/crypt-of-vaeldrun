/* ============================================================
   MAIN.JS — Game Init & Scene Router
   ============================================================
   - Mengumpulkan semua scenes dari window.__sceneRegistry
   - Mendefinisikan scene 'start' (character creation)
   - Mendefinisikan goToScene & init
   ============================================================ */


// Kumpulkan semua scene dari registry yang sudah diisi oleh tiap file scene
const scenes = window.__sceneRegistry || {};


// ─── START SCENE: Character Creation ────────────────────────
scenes.start = () => {
  showNarrative(`
    <p class="scene-title">Prolog</p>
    <p>Sebuah surat datang ke gerbang kotamu — ditulis dengan tinta yang sudah mengering, dengan tangan yang gemetar. Pengirimnya: tetua desa terpencil bernama <em>Aethelford</em>. Permintaannya sederhana: bantulah kami, atau wilayah ini akan tenggelam dalam dua bencana sekaligus.</p>
    <p>Kau menerima permintaan itu. Setelah beberapa hari di jalan, kau tiba di pinggir hutan yang menghadap desa itu. Tapi sebelum kau melangkah lebih dekat, takdir bertanya:</p>
    <p class="whisper"><em>siapa kau?</em></p>
  `);
  document.getElementById('choices').innerHTML = `
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
      const key = card.dataset.class;
      const c = CLASSES[key];
      state.player = {
        class: key,
        className: c.name,
        level: 1,
        xp: 0,
        gold: 15,    // gold awal sedikit lebih banyak biar bisa beli inn
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
        statusEffects: {}
      };
      updateStatusPanel();
      showAbilityIntro();
    });
  });
};


// ─── ABILITY INTRO ──────────────────────────────────────────
function showAbilityIntro() {
  const p = state.player;
  const abilityList = p.abilities.map(id => {
    const a = ABILITIES[id];
    return `<p><span class="ability">${a.name}</span> <span class="roll">${a.cost} ${p.resource.name}</span><br><span class="whisper">${a.desc}</span></p>`;
  }).join('');

  showNarrative(`
    <p class="scene-title">Kemampuanmu</p>
    <p>Sebagai seorang <em>${p.className}</em>, kau menguasai tiga teknik. Kau memiliki <span class="ability">${p.resource.max} ${p.resource.name}</span>, beregenerasi <em>+${p.resource.regen}/turn</em> dalam pertempuran.</p>
    ${abilityList}
    <p class="whisper">— Pakailah dengan bijak, sebab pertempuran tidak menunggu yang lambat. —</p>
  `);
  showChoices([{ text: 'Masuki Aethelford', action: () => goToScene('town') }]);
}


/* ============================================================
   SCENE ROUTER
   ============================================================ */
function goToScene(name) {
  state.currentScene = name;
  if (scenes[name]) {
    scenes[name]();
  } else {
    console.error(`Scene "${name}" tidak ditemukan!`);
    showNarrative(`<p class="failure">Error: scene "${name}" tidak ditemukan.</p>`);
    showChoices([{ text: 'Kembali ke awal', action: () => init() }]);
  }
}


/* ============================================================
   INIT
   ============================================================ */
function init() {
  state.player = null;
  state.flags = {};
  state.rollLog = [];
  state.currentScene = 'start';
  state.lastSafeScene = null;
  document.getElementById('statusPanel').classList.remove('active');
  document.body.className = '';
  goToScene('start');
}

// Mulai game saat semua script sudah loaded
init();
