/* ============================================================
   FORGE.JS — The Forge of Korr-Dun
   ============================================================
   Dungeon kedua: tambang dwarf yang ditelan iblis.
   Setting: panas, jelaga, sungai lava, palu otomatis berdetak.
   5 scene + boss (Magmaforge Construct).
   ============================================================ */

const forgeScenes = {
  // ─── ENTRANCE ────────────────────────────────────────────
  forgeEntrance: () => {
    state.lastSafeScene = 'forgeEntrance';
    if (state.flags.forgeCleared) {
      showNarrative(`
        <p class="scene-title">Forge of Korr-Dun (mati)</p>
        <p>Forge sudah dingin. Lava di kedalaman sudah membatu. Tambang ini akhirnya bisa beristirahat.</p>
      `);
      showChoices([{ text: 'Kembali ke Aethelford', action: () => goToScene('town') }]);
      return;
    }
    showNarrative(`
      <p class="scene-title">Forge of Korr-Dun · I. Pintu Bertimpa</p>
      <p>Kau tiba di mulut tambang setelah berjalan satu hari ke selatan. Pintu utama — sebuah pintu raksasa berukir rune dwarven — telah runtuh, menyisakan celah sempit di antara bongkahan batu.</p>
      <p>Dari dalam, panas keluar dalam gelombang. Bau belerang. Bau besi cair. Dan — kau tidak bisa salah — bau daging panggang yang dilupakan.</p>
      <p>Di antara reruntuhan, kau lihat dua jalan masuk: <em>celah sempit</em> di sisi pintu, atau lubang di langit-langit yang bisa dipanjat dari samping.</p>
    `);
    showChoices([
      {
        text: 'Susupi celah sempit',
        hint: '— DEX check DC 12',
        action: () => squeezeIn()
      },
      {
        text: 'Panjat melalui langit-langit',
        hint: '— STR check DC 12',
        action: () => climbIn()
      },
      {
        text: 'Mundur kembali ke Aethelford',
        action: () => goToScene('town')
      }
    ]);
  },

  // ─── HALL OF DEAD WORKERS ────────────────────────────────
  forgeHall: () => {
    state.lastSafeScene = 'forgeHall';
    showNarrative(`
      <p class="scene-title">Forge · II. Aula Pekerja Mati</p>
      <p>Sebuah ruang panjang yang dulunya pasti barak para penambang. Sekarang hanya kerangka-kerangka dwarf yang masih duduk di meja-meja, seperti tertangkap dalam giliran makan terakhir mereka. Bara kecil masih menyala di tungku di pojok ruangan.</p>
      <p>Di tengah meja terpanjang, sebuah peti besi setengah terbuka. Di balik peti, kau lihat <em>sosok yang bergerak</em> — salah satu kerangka itu tidak lagi diam.</p>
    `);
    showChoices([
      {
        text: 'Serang ghoul yang bangun',
        action: () => combat('ashGhoul', () => {
          state.flags.forgeGhoulDefeated = true;
          showNarrative(`
            <p>Kau menjarah peti — di dalamnya 25 gold dan setoples salep dwarf.</p>
            <p class="loot">+25 gold. Salep memulihkan 6 HP saat ini.</p>
          `);
          state.player.gold += 25;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 6);
          updateStatusPanel();
          showChoices([{ text: 'Lanjut lebih dalam', action: () => goToScene('forgeBridge') }]);
        })
      },
      {
        text: 'Coba menyelinap melewatinya',
        hint: '— DEX check DC 14',
        action: () => sneakPastGhoul()
      },
      { text: 'Mundur ke pintu masuk', action: () => goToScene('forgeEntrance') }
    ]);
  },

  // ─── LAVA BRIDGE ─────────────────────────────────────────
  forgeBridge: () => {
    state.lastSafeScene = 'forgeBridge';
    showNarrative(`
      <p class="scene-title">Forge · III. Jembatan Lava</p>
      <p>Lorong terbuka ke sebuah cavern raksasa. Di bawahmu, sungai lava mengalir lambat, memantulkan cahaya jingga ke dinding-dinding hitam. Sebuah jembatan batu tua membentang melintasinya — tapi setengah jembatan itu sudah runtuh, menyisakan celah selebar empat meter di tengah.</p>
      <p>Di seberang, koridor lain menuju ke dalam tambang. Di bawahmu, lava itu sangat sabar.</p>
    `);
    const choices = [
      {
        text: 'Lompati celah jembatan',
        hint: '— DEX check DC 14',
        action: () => jumpBridge()
      },
      {
        text: 'Memanjat di sisi tebing untuk mengitarinya',
        hint: '— STR check DC 13',
        action: () => climbAroundBridge()
      }
    ];
    if (state.player.class === 'mage' || state.player.stats.INT >= 3) {
      choices.push({
        text: 'Bentuk jembatan sihir untuk menyeberang',
        hint: '— INT check DC 12 (khusus pintar)',
        action: () => arcaneBridge()
      });
    }
    choices.push({ text: 'Mundur', action: () => goToScene('forgeHall') });
    showChoices(choices);
  },

  // ─── IMP WORKSHOP ────────────────────────────────────────
  forgeImpRoom: () => {
    state.lastSafeScene = 'forgeImpRoom';
    showNarrative(`
      <p class="scene-title">Forge · IV. Bengkel Imp</p>
      <p>Ruangan berbentuk kubah, langit-langitnya dipenuhi rantai berayun. Dua imp api saling berbisik di atas meja kerja, sedang merangkai sesuatu yang menyerupai pedang dari tulang.</p>
      <p>Salah satu imp menoleh — dan tertawa cekikikan saat melihatmu. <em>"Daging baru! Daging baru untuk dipanggang!"</em></p>
    `);
    showChoices([
      {
        text: 'Serang langsung sebelum mereka siap',
        action: () => combat('fireImpDuo', () => {
          state.flags.forgeImpsDefeated = true;
          showNarrative(`
            <p>Kau menjarah meja kerja. Selain pedang tulang yang tidak bisa dipakai, ada beberapa permata kecil.</p>
            <p class="loot">+15 gold.</p>
          `);
          state.player.gold += 15;
          updateStatusPanel();
          showChoices([{ text: 'Lanjut ke Inti Forge', action: () => goToScene('forgeCore') }]);
        })
      },
      {
        text: 'Lemparkan bom asap (Smoke Bomb pengganti)',
        hint: '— DEX check DC 13',
        action: () => smokeImps()
      },
      { text: 'Mundur', action: () => goToScene('forgeBridge') }
    ]);
  },

  // ─── BOSS: MAGMAFORGE ────────────────────────────────────
  forgeCore: () => {
    showNarrative(`
      <p class="scene-title">Forge · V. Inti Forge</p>
      <p>Pintu terakhir membuka ke ruang utama — sebuah cavern besar dengan landasan setinggi rumah di tengahnya. Lava mengalir di parit-parit kecil di lantai. Suara palu berdentum, ritmis, hidup.</p>
      <p>Tidak ada yang memegang palu itu. Palu itu mengayun sendiri.</p>
      <p>Kemudian, dari belakang landasan, sosok itu berdiri. Magmaforge — sang penempa. Ia bukan dewa, tapi tahu cara berdoa seperti dewa.</p>
    `);
    showChoices([
      {
        text: '"Aku datang untuk mengakhirimu."',
        action: () => combat('magmaforge', () => forgeComplete('hancur'))
      },
      {
        text: 'Coba bicara — "Apa kau tahu kau tidak hidup?"',
        hint: '— INT check DC 16',
        action: () => parleyMagmaforge()
      },
      {
        text: 'Cari titik lemah di tubuhnya dulu',
        hint: '— DEX check DC 13',
        action: () => scoutMagmaforge()
      }
    ]);
  }
};

// ─── ENCOUNTER HELPERS ─────────────────────────────────────
function squeezeIn() {
  const r = rollD20WithMod(state.player.stats.DEX, 12, 'Susupi celah');
  if (r.success) {
    showNarrative(`<p>Kau memeras tubuhmu lewat celah sempit. Beberapa goresan, tapi kau masuk.</p>`);
    showChoices([{ text: 'Lanjut ke aula', action: () => goToScene('forgeHall') }]);
  } else {
    state.player.hp -= 3;
    updateStatusPanel();
    showNarrative(`
      <p class="failure">Bahu kirimu tersangkut, kau berjuang keluar dengan susah payah.</p>
      <p class="failure">Kau menerima 3 damage dari goresan tajam.</p>
    `);
    if (state.player.hp <= 0) return forgeDeath();
    showChoices([{ text: 'Tetap masuk', action: () => goToScene('forgeHall') }]);
  }
}

function climbIn() {
  const r = rollD20WithMod(state.player.stats.STR, 12, 'Panjat lubang');
  if (r.success) {
    showNarrative(`<p>Kau memanjat dengan mantap dan menjatuhkan diri ke aula di dalam.</p>`);
    showChoices([{ text: 'Lanjut ke aula', action: () => goToScene('forgeHall') }]);
  } else {
    state.player.hp -= 4;
    updateStatusPanel();
    showNarrative(`
      <p class="failure">Pegangan tanganmu meleset. Kau jatuh — bukan terlalu jauh, tapi cukup sakit.</p>
      <p class="failure">Kau menerima 4 damage.</p>
    `);
    if (state.player.hp <= 0) return forgeDeath();
    showChoices([{ text: 'Bangkit dan lanjut', action: () => goToScene('forgeHall') }]);
  }
}

function sneakPastGhoul() {
  const r = rollD20WithMod(state.player.stats.DEX, 14, 'Sneak Ghoul');
  if (r.success) {
    showNarrative(`<p class="success">Kau bergerak tanpa suara melewati meja-meja. Ghoul itu tidak pernah menoleh.</p>`);
    showChoices([{ text: 'Lanjut ke jembatan lava', action: () => goToScene('forgeBridge') }]);
  } else {
    showNarrative(`<p class="failure">Lantai berderak. Ghoul itu memekik dan melompat ke arahmu!</p>`);
    showChoices([{ text: 'Lawan!', action: () => combat('ashGhoul', () => goToScene('forgeBridge')) }]);
  }
}

function jumpBridge() {
  const r = rollD20WithMod(state.player.stats.DEX, 14, 'Lompati jembatan');
  if (r.success) {
    showNarrative(`<p class="success">Kau melompat dengan presisi sempurna, mendarat di sisi seberang.</p>`);
    showChoices([{ text: 'Lanjut ke bengkel', action: () => goToScene('forgeImpRoom') }]);
  } else {
    state.player.hp -= 8;
    updateStatusPanel();
    showNarrative(`
      <p class="failure">Kakimu tergelincir di tepi! Kau berhasil mencengkeram tepi seberang dengan jari-jari, tapi panas dari bawah membakarmu.</p>
      <p class="failure">Kau menerima 8 damage.</p>
    `);
    if (state.player.hp <= 0) return forgeDeath();
    showChoices([{ text: 'Tarik diri dan lanjut', action: () => goToScene('forgeImpRoom') }]);
  }
}

function climbAroundBridge() {
  const r = rollD20WithMod(state.player.stats.STR, 13, 'Panjat tebing');
  if (r.success) {
    showNarrative(`<p class="success">Kau merayap di sisi tebing, tangan demi tangan, sampai tiba di seberang.</p>`);
    showChoices([{ text: 'Lanjut ke bengkel', action: () => goToScene('forgeImpRoom') }]);
  } else {
    state.player.hp -= 5;
    updateStatusPanel();
    showNarrative(`
      <p class="failure">Salah satu pegangan retak di bawah beratmu. Kau hampir jatuh, tapi berhasil bertahan.</p>
      <p class="failure">Kau menerima 5 damage karena memar.</p>
    `);
    if (state.player.hp <= 0) return forgeDeath();
    showChoices([{ text: 'Lanjut', action: () => goToScene('forgeImpRoom') }]);
  }
}

function arcaneBridge() {
  const r = rollD20WithMod(state.player.stats.INT, 12, 'Sihir Jembatan');
  if (r.success) {
    showNarrative(`
      <p class="success">Kau merentangkan tangan dan udara mengkristal menjadi platform tipis. Cukup untuk menyeberang.</p>
      <p class="buff">Sihirmu bekerja sempurna. Kau merasa lebih percaya diri.</p>
    `);
    showChoices([{ text: 'Seberangi dengan elegan', action: () => goToScene('forgeImpRoom') }]);
  } else {
    state.player.hp -= 4;
    updateStatusPanel();
    showNarrative(`
      <p class="failure">Konsentrasimu terpecah karena panas. Kristal udara hancur di tengah jalan!</p>
      <p class="failure">Kau melompat ke seberang sebelum jatuh — 4 damage.</p>
    `);
    if (state.player.hp <= 0) return forgeDeath();
    showChoices([{ text: 'Lanjut', action: () => goToScene('forgeImpRoom') }]);
  }
}

function smokeImps() {
  const r = rollD20WithMod(state.player.stats.DEX, 13, 'Asap');
  if (r.success) {
    showNarrative(`
      <p class="success">Asap dari kantungmu membutakan ruangan. Imp-imp itu panik, saling menyerang dalam kebingungan.</p>
      <p class="loot">Saat asap hilang, salah satu imp sudah mati. Yang satu lagi luka berat.</p>
    `);
    // Imp yang tersisa: lebih lemah
    showChoices([{ text: 'Habisi yang tersisa', action: () => combat({
      name: 'Fire Imp (luka)',
      intro: 'Imp yang tersisa terhuyung, sayap satunya patah.',
      maxHp: 6, ac: 11, toHit: 2, dmg: [1, 4], xp: 70, gold: 15
    }, () => {
      state.flags.forgeImpsDefeated = true;
      goToScene('forgeCore');
    }) }]);
  } else {
    showNarrative(`<p class="failure">Anginmu salah arah, asap kembali ke wajahmu! Imp-imp itu menyerangmu.</p>`);
    showChoices([{ text: 'Lawan!', action: () => combat('fireImpDuo', () => { state.flags.forgeImpsDefeated = true; goToScene('forgeCore'); }) }]);
  }
}

function parleyMagmaforge() {
  const r = rollD20WithMod(state.player.stats.INT, 16, 'Diplomasi Magmaforge');
  if (r.success) {
    gainXP(600);
    state.player.gold += 50;
    updateStatusPanel();
    showNarrative(`
      <p>Kau berbicara — bukan dengan amarah, tapi dengan rasa ingin tahu yang dalam. Kau bertanya kapan terakhir kali ia ingat menjadi sesuatu yang lain.</p>
      <p>Magmaforge berhenti. Lava di matanya — kalau itu memang mata — meredup. <em>"Aku... pernah seorang penambang. Sebelum mereka menggali terlalu dalam. Sebelum bara ini menemukanku."</em></p>
      <p>Ia menyentuh hatinya sendiri. Lava di sana mendingin. Ia hancur perlahan, dengan damai, menjadi batu.</p>
      <p class="success">✦ AKHIR DAMAI ✦</p>
      <p class="loot">+600 XP, +50 gold dari sisa-sisa di forge.</p>
    `);
    showChoices([{ text: 'Kembali ke Aethelford', action: () => forgeComplete('damai') }]);
  } else {
    showNarrative(`<p class="failure">Magmaforge mengangkat palu raksasanya. <em>"PEKERJA TIDAK BERBICARA."</em></p>`);
    showChoices([{ text: 'Lawan!', action: () => combat('magmaforge', () => forgeComplete('hancur')) }]);
  }
}

function scoutMagmaforge() {
  const r = rollD20WithMod(state.player.stats.DEX, 13, 'Scouting');
  if (r.success) {
    showNarrative(`
      <p class="success">Kau perhatikan: di leher Magmaforge ada celah kecil di mana lava masuk-keluar. Itu jantungnya.</p>
      <p class="buff">Kau dapat <em>+2 to-hit</em> dalam pertempuran ini.</p>
    `);
    // Modifikasi: bikin combat dengan magmaforge versi lebih lemah AC
    showChoices([{ text: 'Serang titik lemahnya!', action: () => combat({
      ...MONSTERS.magmaforge,
      ac: MONSTERS.magmaforge.ac - 2
    }, () => forgeComplete('hancur')) }]);
  } else {
    showNarrative(`<p class="failure">Magmaforge menyadari pengamatanmu. "TIDAK SOPAN."</p>`);
    showChoices([{ text: 'Tidak ada pilihan, lawan!', action: () => combat('magmaforge', () => forgeComplete('hancur')) }]);
  }
}

function forgeComplete(endingType) {
  state.flags.forgeCleared = true;
  state.flags.forgeEnding = endingType;
  showNarrative(`
    <p class="scene-title">Forge Padam</p>
    <p>Kau berjalan keluar dari Korr-Dun. Di belakangmu, untuk pertama kalinya dalam tiga ratus tahun, palu-palu itu berhenti berdetak. Lava mulai mengental. Cavern itu, akhirnya, beristirahat.</p>
    <p class="whisper">Selene akan ingin mendengar ini.</p>
  `);
  showChoices([{ text: 'Kembali ke Aethelford', action: () => goToScene('town') }]);
}

function forgeDeath() {
  showNarrative(`
    <p class="scene-title">✦ Kau Tewas ✦</p>
    <p>Forge menelan satu jiwa lagi. Tubuhmu, mungkin, akan menjadi pekerja baru.</p>
  `);
  showChoices([{ text: '↻ Mulai lagi', action: () => init() }]);
}

Object.assign(window.__sceneRegistry = window.__sceneRegistry || {}, forgeScenes);
