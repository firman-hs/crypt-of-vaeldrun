// @ts-check
/* ============================================================
   SCENES/CRYPT.JS — Crypt of Vael'drun
   ============================================================
   Dungeon necromantic, 5 scene + boss.
   Setelah selesai, set flags.cryptCleared = true dan kembali ke town.
   ============================================================ */

import { state } from '../engine/state.js';
import { check } from '../engine/dice.js';
import { showNarrative, showChoices, updateStatusPanel, gainXP } from '../engine/ui.js';
import { combat } from '../engine/combat.js';
import { goToScene, init } from '../main.js';


/** @type {Object<string, () => void>} */
export const cryptScenes = {
  // ─── ENTRANCE ────────────────────────────────────────────
  cryptEntrance: () => {
    state.lastSafeScene = 'cryptEntrance';
    if (state.flags.cryptCleared) {
      showNarrative(`
        <p class="scene-title">Crypt of Vael'drun (kosong)</p>
        <p>Crypt itu sunyi sekarang. Lich sudah tidak ada. Yang tersisa hanya batu dan udara basah.</p>
        <p class="whisper">Tidak ada lagi yang perlu dilakukan di sini.</p>
      `);
      showChoices([{ text: 'Kembali ke Aethelford', action: () => goToScene('town') }]);
      return;
    }
    showNarrative(`
      <p class="scene-title">Crypt of Vael'drun · I. Tangga Turun</p>
      <p>Hujan menderas di atas reruntuhan menara. Kau berdiri di bibir pintu masuk crypt — sebuah lubang menganga di tanah, dipagari oleh akar pohon mati. Angin yang naik dari dalam berbau besi tua dan sesuatu yang manis-busuk.</p>
      <p>Tangga batu menukik ke bawah. Setelah dua puluh anak tangga, kau tiba di sebuah ruang antre. Tiga koridor terbuka di hadapanmu. Yang <em>kiri</em> beraroma asap kayu. Yang <em>tengah</em> dihiasi runic emas yang berdenyut samar. Yang <em>kanan</em> gelap total, dan dari sana kau dengar gemericik air.</p>
    `);
    showChoices([
      { text: 'Tempuh koridor kiri (asap kayu)', action: () => goToScene('cryptGoblin') },
      { text: 'Tempuh koridor tengah (runic emas)', hint: '— terasa berbahaya', action: () => goToScene('cryptRunic') },
      { text: 'Tempuh koridor kanan (gemericik air)', action: () => goToScene('cryptFlooded') },
      { text: 'Mundur kembali ke Aethelford', action: () => goToScene('town') }
    ]);
  },

  // ─── GOBLIN CAMP ─────────────────────────────────────────
  cryptGoblin: () => {
    if (state.flags.goblinDefeated) return goToScene('cryptGoblinCleared');
    showNarrative(`
      <p class="scene-title">Crypt · II. Kemah Goblin</p>
      <p>Koridor membuka ke sebuah ruang melingkar. Sebuah api unggun kecil berkobar di tengah, dijaga oleh seorang goblin bertopi kulit yang sedang memanggang sesuatu yang sebaiknya tidak kau identifikasi. Ia belum melihatmu.</p>
      <p>Di balik si goblin, kau lihat sebuah peti kecil berukir.</p>
    `);
    showChoices([
      { text: 'Serang langsung', action: () => combat('goblin', () => { state.flags.goblinDefeated = true; goToScene('cryptEntrance'); }) },
      { text: 'Coba menyelinap mengitari', hint: '— DEX check DC 10', action: sneakGoblin },
      { text: 'Berbicara dengan si goblin', hint: '— hasilnya tidak pasti', action: parleyGoblin },
      { text: 'Mundur', action: () => goToScene('cryptEntrance') }
    ]);
  },

  cryptGoblinCleared: () => {
    showNarrative(`
      <p class="scene-title">Crypt · II. Kemah Goblin (kosong)</p>
      <p>Api unggun masih membara samar. Tidak ada lagi yang hidup di sini.</p>
    `);
    showChoices([{ text: 'Kembali ke pertigaan', action: () => goToScene('cryptEntrance') }]);
  },

  // ─── RUNIC HALL ──────────────────────────────────────────
  cryptRunic: () => {
    state.lastSafeScene = 'cryptRunic';
    showNarrative(`
      <p class="scene-title">Crypt · III. Aula Runic</p>
      <p>Setiap langkahmu memantul aneh. Lantai diukir dengan lingkaran konsentris penuh aksara yang bukan dari dunia ini. Di tengah ruangan berdiri sebuah pedestal berisi sebuah <em>buku terbuka</em> — halaman-halamannya bergerak meski tak ada angin.</p>
      <p>Suara — bukan dengan telinga, tapi di dalam tengkorakmu — bertanya: <em>"Kau yang hidup. Apakah kau datang sebagai murid, atau sebagai pencuri?"</em></p>
    `);
    showChoices([
      { text: '"Aku datang sebagai murid"', hint: '— INT check DC 13', action: muridPath },
      { text: 'Ambil bukunya', hint: '— berisiko', action: stealBook },
      { text: 'Mundur dengan hormat', action: () => goToScene('cryptEntrance') }
    ]);
  },

  // ─── FLOODED ROOM ────────────────────────────────────────
  cryptFlooded: () => {
    state.lastSafeScene = 'cryptFlooded';
    showNarrative(`
      <p class="scene-title">Crypt · IV. Ruang Banjir</p>
      <p>Air setinggi lutut menggenangi koridor. Sesuatu bergerak di bawah permukaan. Di ujung lain, kau lihat sebuah pintu berukir tengkorak — itu pasti gerbang ke ruang dalam crypt.</p>
    `);
    showChoices([
      { text: 'Mengarungi air dengan hati-hati', hint: '— DEX check DC 10', action: wadeWater },
      { text: 'Pancing dengan suara dulu', hint: '— INT check DC 13', action: baitWater },
      { text: 'Mundur ke pertigaan', action: () => goToScene('cryptEntrance') }
    ]);
  },

  // ─── BOSS ROOM ───────────────────────────────────────────
  cryptBoss: () => {
    showNarrative(`
      <p class="scene-title">Crypt · V. Singgasana Maerith</p>
      <p>Pintu berdesir terbuka. Ruangan di balik itu berbentuk cawan, dengan lantai cermin gelap. Di tengahnya, di atas singgasana tulang, duduk sosok kering berjubah — <em>Maerith Vael'drun</em>. Mahkota di kepalanya berdenyut dengan cahaya hijau-purba.</p>
      <p>Dua titik lampu kecil menyala di rongga matanya. Suaranya seperti kertas yang terbakar pelan:</p>
      <p class="whisper"><em>"Tiga ratus tahun... dan akhirnya seseorang datang. Apa yang kau cari di kerajaanku, kecil?"</em></p>
    `);
    showChoices([
      { text: '"Mahkotamu. Aku akan mengakhiri ini."', action: () => combat('lich', () => cryptComplete('penakluk')) },
      { text: '"Aku ingin tahu kebenaran."', hint: '— INT check DC 17', action: peacefulPath },
      { text: 'Diam-diam, dekati mahkotanya', hint: '— DEX check DC 19', action: sneakCrown }
    ]);
  }
};


// ─── ENCOUNTER HELPERS (internal) ──────────────────────────
// Helpers di-define di module scope (private), tidak di-export.

function sneakGoblin() {
  const p = state.player;
  if (!p) return;
  const r = check(p.stats.DEX, 10, 'Sneak Goblin', 'Kau bergerak pelan di antara bayangan');
  if (r.success) {
    state.flags.goblinDefeated = true;
    p.gold += 8;
    updateStatusPanel();
    showNarrative(`
      <p class="success">Kau bergerak seperti hantu. Goblin itu tidak pernah tahu kau di belakangnya. <span class="roll">DEX ${r.total} vs DC 10</span></p>
      <p class="loot">Kau mengambil 8 gold dari peti, lalu mundur tanpa suara.</p>
    `);
    showChoices([{ text: 'Kembali ke pertigaan', action: () => goToScene('cryptEntrance') }]);
  } else {
    showNarrative(`<p class="failure">Sebuah dahan retak di bawah kakimu. Goblin itu berputar dengan pisau di tangan!</p>`);
    showChoices([{ text: 'Lawan!', action: () => combat('goblin', () => { state.flags.goblinDefeated = true; goToScene('cryptEntrance'); }) }]);
  }
}

function parleyGoblin() {
  const p = state.player;
  if (!p) return;
  const r = check(p.stats.INT, 13, 'Diplomasi Goblin', 'Kau memilih kata-kata dengan hati-hati');
  if (r.success) {
    state.flags.goblinDefeated = true;
    p.gold += 5;
    updateStatusPanel();
    showNarrative(`
      <p>Kau menawarkan informasi tentang dapur di koridor lain. Goblin itu menggumamkan sesuatu dan menggelinding pergi.</p>
      <p class="loot">Ia meninggalkan 5 gold dan sebuah bisikan: <em>"Di air, jangan bersuara."</em></p>
    `);
    showChoices([{ text: 'Kembali', action: () => goToScene('cryptEntrance') }]);
  } else {
    showNarrative(`<p class="failure">Goblin itu hanya melihat kau sebagai makanan baru.</p>`);
    showChoices([{ text: 'Lawan!', action: () => combat('goblin', () => { state.flags.goblinDefeated = true; goToScene('cryptEntrance'); }) }]);
  }
}

function muridPath() {
  const p = state.player;
  if (!p) return;
  const r = check(p.stats.INT, 13, 'Persuasi Arcane', 'Kau menjawab dengan tulus');
  if (r.success) {
    p.stats.INT += 1;
    updateStatusPanel();
    showNarrative(`
      <p>Buku itu berdenyut, dan untuk sesaat kau merasa seseorang yang sangat tua tersenyum padamu.</p>
      <p class="success">+1 INT permanen. Kau merasa lebih mampu memahami yang tak terlihat.</p>
    `);
    showChoices([{ text: 'Kembali', action: () => goToScene('cryptEntrance') }]);
  } else {
    p.hp -= 4;
    updateStatusPanel();
    showNarrative(`
      <p>Buku menutup dengan paksa. Sebuah letupan psikis menyerangmu.</p>
      <p class="failure">Kau menerima 4 damage psikis.</p>
    `);
    if (p.hp <= 0) return death();
    showChoices([{ text: 'Mundur', action: () => goToScene('cryptEntrance') }]);
  }
}

function stealBook() {
  const p = state.player;
  if (!p) return;
  p.hp -= 6;
  updateStatusPanel();
  showNarrative(`
    <p>Saat tanganmu menyentuh halaman, runic di lantai menyala merah darah. <span class="failure">Kau dilemparkan ke dinding.</span></p>
    <p>Kau menerima 6 damage, dan tersungkur kembali ke aula sebelumnya.</p>
  `);
  if (p.hp <= 0) return death();
  showChoices([{ text: 'Lanjutkan', action: () => goToScene('cryptEntrance') }]);
}

function wadeWater() {
  const p = state.player;
  if (!p) return;
  const r = check(p.stats.DEX, 10, 'Mengarungi air', 'Kau melangkah pelan ke dalam air');
  if (r.success) {
    showNarrative(`<p>Kau menyeberang tanpa mengganggu apapun di bawah air.</p>`);
    showChoices([{ text: 'Buka pintu tengkorak', action: () => goToScene('cryptBoss') }]);
  } else {
    showNarrative(`<p class="failure">Sesuatu yang dingin dan licin membelit kakimu!</p>`);
    showChoices([{ text: 'Lawan!', action: () => combat('slime', () => goToScene('cryptBoss')) }]);
  }
}

function baitWater() {
  const p = state.player;
  if (!p) return;
  const r = check(p.stats.INT, 13, 'Strategi', 'Kau memperhitungkan sudut lemparan');
  if (r.success) {
    showNarrative(`<p>Kau melemparkan kerikil. Sesuatu menyerang permukaan air dengan ganas.</p>`);
    showChoices([{ text: 'Lawan dari posisi aman', action: () => combat('slimeDetected', () => goToScene('cryptBoss')) }]);
  } else {
    showNarrative(`<p>Kerikilmu salah lempar. Tidak ada respons.</p>`);
    showChoices([
      { text: 'Mengarungi saja', action: () => combat('slime', () => goToScene('cryptBoss')) },
      { text: 'Mundur', action: () => goToScene('cryptEntrance') }
    ]);
  }
}

function peacefulPath() {
  const p = state.player;
  if (!p) return;
  const r = check(p.stats.INT, 17, 'Diplomasi Lich', 'Kau bicara perlahan tentang kehilangan');
  if (r.success) {
    gainXP(500);
    updateStatusPanel();
    showNarrative(`
      <p>Lich itu memandangmu lama. Lalu — entah karena bosan, entah karena tergerak — ia berbicara.</p>
      <p>Ia bercerita tentang sebuah dunia yang lupa cara berkabung, tentang seorang murid yang ingin abadi karena tidak siap kehilangan. Saat ia selesai, ia melepas mahkotanya sendiri.</p>
      <p class="success">✦ AKHIR DAMAI ✦</p>
      <p class="loot">+500 XP, dan sesuatu yang lebih berat dari emas — pengetahuan.</p>
    `);
    showChoices([{ text: 'Kembali ke Aethelford', action: () => cryptComplete('damai') }]);
  } else {
    showNarrative(`<p>Lich itu tertawa — suara seperti batu yang retak. "Kau pikir kebenaran adalah hak orang yang lemah seperti kau?"</p>`);
    showChoices([{ text: 'Lawan!', action: () => combat('lich', () => cryptComplete('penakluk')) }]);
  }
}

function sneakCrown() {
  const p = state.player;
  if (!p) return;
  const r = check(p.stats.DEX, 19, 'Heist Mahkota', 'Kau menggeser kaki tanpa suara');
  if (r.success) {
    gainXP(400);
    p.gold += 30;
    updateStatusPanel();
    showNarrative(`
      <p class="success">✦ Kau menyentuh mahkotanya — dan ia hancur menjadi debu di antara jarimu. Lich itu menjerit ringan, lalu menguap.</p>
      <p class="loot">+400 XP, +30 gold dari serpihan permata.</p>
    `);
    showChoices([{ text: 'Kembali ke Aethelford', action: () => cryptComplete('licik') }]);
  } else {
    showNarrative(`<p class="failure">Lich itu telah menunggu trik ini sejak abad ke-2.</p>`);
    showChoices([{ text: 'Lawan!', action: () => combat('lich', () => cryptComplete('penakluk')) }]);
  }
}

/**
 * @param {string} endingType
 */
function cryptComplete(endingType) {
  state.flags.cryptCleared = true;
  state.flags.cryptEnding = endingType;
  showNarrative(`
    <p class="scene-title">Crypt Ditaklukkan</p>
    <p>Kau berjalan kembali menaiki tangga. Crypt di belakangmu sunyi sekarang — sunyi yang berbeda dari sebelumnya, sunyi yang lega.</p>
    <p class="whisper">Selene akan ingin mendengar ini.</p>
  `);
  showChoices([{ text: 'Kembali ke Aethelford', action: () => goToScene('town') }]);
}

function death() {
  showNarrative(`
    <p class="scene-title">✦ Kau Tewas ✦</p>
    <p>Crypt menelan satu jiwa lagi. Mungkin di lain hayat, kau akan lebih bijak.</p>
  `);
  showChoices([{ text: '↻ Mulai lagi', action: () => init() }]);
}
