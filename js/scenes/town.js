// @ts-check
/* ============================================================
   SCENES/TOWN.JS — Aethelford (Hub)
   ============================================================
   Hub utama dengan:
     - Inn: heal full HP & resource (5 gold)
     - Smith: hint dan flavor
     - Elder: lore & quest
     - World Map: pilih dungeon
   ============================================================ */

import { state } from '../engine/state.js';
import { showNarrative, showChoices, updateStatusPanel } from '../engine/ui.js';
import { goToScene, init } from '../main.js';

/** @typedef {import('../engine/types.js').Choice} Choice */


/** @type {Object<string, () => void>} */
export const townScenes = {
  // ─── ENTRY: Town Square ──────────────────────────────────
  town: () => {
    state.lastSafeScene = 'town';
    const isFirstVisit = !state.flags.visitedTown;
    state.flags.visitedTown = true;

    showNarrative(`
      <p class="scene-title">Aethelford</p>
      ${isFirstVisit ? `
        <p>Setelah berhari-hari di jalan, kau tiba di <em>Aethelford</em> — sebuah desa kecil di kaki bukit yang dijepit antara dua bahaya. Asap tipis menjulur dari cerobong-cerobong rendah. Bau roti panggang dan kuda basah memenuhi udara.</p>
        <p>Tetua desa, seorang wanita tua bertongkat tulang, telah menunggumu. "Kau yang dikirim?" tanyanya. "Bagus. Kami punya dua masalah, dan tidak ada yang berani menghadapinya."</p>
      ` : `
        <p>Kau kembali ke <em>Aethelford</em>. Desa kecil ini selalu sama: asap dari cerobong, kuda mengantuk di gerobak, dan tetua di pintu rumahnya, mengamatimu dengan mata yang sudah melihat terlalu banyak.</p>
      `}
      <p class="whisper">— Apa yang ingin kau lakukan? —</p>
    `);

    /** @type {Choice[]} */
    const choices = [
      { text: '🛏️ Pergi ke Penginapan', hint: '— istirahat & heal (5 gold)', action: () => goToScene('townInn') },
      { text: '⚒️ Mengunjungi Pandai Besi', action: () => goToScene('townSmith') },
      { text: '📜 Bicara dengan Tetua', action: () => goToScene('townElder') },
      { text: '🗺️ Buka Peta Wilayah', hint: '— pilih dungeon', action: () => goToScene('worldMap') }
    ];

    if (state.flags.cryptCleared && state.flags.forgeCleared) {
      choices.push({
        text: '✦ Tinggalkan Aethelford selamanya',
        hint: '— akhiri petualangan',
        action: () => goToScene('finalEnding')
      });
    }

    showChoices(choices);
  },

  // ─── INN ─────────────────────────────────────────────────
  townInn: () => {
    const p = state.player;
    if (!p) return;

    showNarrative(`
      <p class="scene-title">Penginapan "Tongkat Bengkok"</p>
      <p>Sebuah ruangan rendah dengan langit-langit balok kayu, dipenuhi bau bir asam dan kayu basah. Pemilik penginapan, seorang pria gemuk berjenggot kemerahan, mengelap gelas tanpa mengangkat mata.</p>
      <p>"Lima keping emas untuk semalam," katanya. "Kasur tidak nyaman, makanan biasa saja, tapi pintunya berkunci."</p>
      <p class="whisper">Kau punya ${p.gold} gold.</p>
    `);

    const canAfford = p.gold >= 5;
    showChoices([
      {
        text: 'Bayar 5 gold dan istirahat',
        hint: canAfford ? '— heal full HP & resource' : '— gold tidak cukup',
        disabled: !canAfford,
        action: () => {
          p.gold -= 5;
          p.hp = p.maxHp;
          p.resource.current = p.resource.max;
          p.fateTokens = p.maxFateTokens;
          p.statusEffects = {};
          updateStatusPanel();
          showNarrative(`
            <p>Kau jatuh tidur sebelum kepalamu menyentuh bantal. Mimpi-mimpi yang aneh datang dan pergi.</p>
            <p>Saat fajar, kau bangun dengan tubuh segar. <span class="success">HP, ${p.resource.name}, dan Fate Tokens pulih sepenuhnya.</span></p>
          `);
          showChoices([{ text: 'Kembali ke alun-alun', action: () => goToScene('town') }]);
        }
      },
      {
        text: 'Tanyakan kabar tentang dungeon',
        action: () => {
          showNarrative(`
            <p>Pemilik penginapan akhirnya mengangkat mata. "Crypt di bukit utara, kata orang ada lich di sana sejak abad lalu. Tambang Korr-Dun di selatan, lebih buruk — iblis. Pekerja yang masuk tidak pernah keluar lagi."</p>
            <p>Ia menyeruput sesuatu dari cangkir. "Pulang dengan masih bernyawa, dan minumannya gratis."</p>
          `);
          showChoices([{ text: 'Kembali ke alun-alun', action: () => goToScene('town') }]);
        }
      },
      { text: 'Tinggalkan penginapan', action: () => goToScene('town') }
    ]);
  },

  // ─── SMITH ───────────────────────────────────────────────
  townSmith: () => {
    showNarrative(`
      <p class="scene-title">Pandai Besi Borric</p>
      <p>Dalam panas pengap bengkel, seorang dwarf bertubuh pendek tapi berbahu lebar memukul logam merah panas dengan ritme yang tidak pernah salah. Saat melihatmu, ia berhenti sebentar.</p>
      <p>"Kau pergi ke Korr-Dun?" tanyanya, suaranya seperti batu yang digerus. "Itu rumah leluhurku. Atau dulunya. Sebelum mereka menggali terlalu dalam."</p>
      <p class="whisper">Ia mengangguk, lebih kepada dirinya sendiri. <em>"Hati-hati dengan Magmaforge. Itu bukan dewa, tapi tahu cara berdoa seperti dewa. Itu yang lebih buruk."</em></p>
    `);
    showChoices([
      {
        text: 'Tanya tentang senjatamu',
        action: () => {
          const weapon = state.player?.weapon.name ?? 'senjatamu';
          showNarrative(`
            <p>Borric melihat senjatamu sebentar. "${weapon}? Lumayan. Akan bertahan, kalau kau pintar."</p>
            <p>Ia kembali ke palunya. Percakapan selesai.</p>
          `);
          showChoices([{ text: 'Pamit', action: () => goToScene('town') }]);
        }
      },
      {
        text: 'Tanya tentang Crypt of Vael\'drun',
        action: () => {
          showNarrative(`
            <p>Borric meludah ke api. "Manusia. Kalian dan kuburan kalian. Pergi sana, urusi sendiri." Ia tidak mau bicara lagi.</p>
          `);
          showChoices([{ text: 'Pamit', action: () => goToScene('town') }]);
        }
      },
      { text: 'Pamit', action: () => goToScene('town') }
    ]);
  },

  // ─── ELDER ───────────────────────────────────────────────
  townElder: () => {
    showNarrative(`
      <p class="scene-title">Tetua Selene</p>
      <p>Wanita tua itu duduk di kursi di depan rumahnya, di bawah pohon ek yang sudah lama mati. Matanya seperti dua kepingan kaca biru.</p>
      <p>"Dua bahaya," ucapnya tanpa basa-basi. "Crypt di utara — necromancer tua yang harus diakhiri. Forge di selatan — iblis yang menempa pasukan. Salah satu jadi prioritas, lainnya jadi mimpi buruk lebih besar nanti."</p>
      <p>Ia menunduk. <em>"Pulang setelah kau selesaikan satu. Aku akan ada di sini. Kemudian kita tentukan yang berikutnya."</em></p>
    `);
    showChoices([
      {
        text: 'Tanya tentang Crypt of Vael\'drun',
        action: () => {
          showNarrative(`
            <p>"Maerith Vael'drun. Murid dari guru yang tidak tahu kapan harus berhenti mengajar. Ia ingin abadi karena tidak siap kehilangan. Sekarang ia memerintah orang mati di kerajaannya sendiri."</p>
            <p>Selene memijat pelipisnya. "Mahkotanya yang berbahaya. Hancurkan, atau ia akan terus menarik tulang-tulang ke arahnya."</p>
          `);
          showChoices([{ text: 'Kembali', action: () => goToScene('townElder') }]);
        }
      },
      {
        text: 'Tanya tentang Forge of Korr-Dun',
        action: () => {
          showNarrative(`
            <p>"Tambang dwarf, dulunya. Mereka menggali ke titik di mana logam menjadi sesuatu yang lebih dari logam. Sebuah entitas — Magmaforge — sekarang menempa di sana. Tapi yang ditempa bukan pedang biasa. Tubuh-tubuh."</p>
            <p>Mata Selene menyipit. "Tutup forge-nya. Apapun caranya."</p>
          `);
          showChoices([{ text: 'Kembali', action: () => goToScene('townElder') }]);
        }
      },
      { text: 'Pamit', action: () => goToScene('town') }
    ]);
  },

  // ─── WORLD MAP ───────────────────────────────────────────
  worldMap: () => {
    showNarrative(`
      <p class="scene-title">Peta Wilayah</p>
      <p>Selene membentangkan sebuah peta tua di meja. Tinta sudah pudar, tapi dua tempat ditandai dengan jelas: satu dengan tengkorak kecil, satu dengan landasan menyala.</p>
      <p class="whisper">— Pilih tujuanmu. —</p>
    `);

    const cryptCleared = state.flags.cryptCleared;
    const forgeCleared = state.flags.forgeCleared;

    const container = document.getElementById('choices');
    if (!container) return;

    container.innerHTML = `
      <div class="location-grid">
        <div class="location-card crypt ${cryptCleared ? 'completed' : ''}" data-target="crypt">
          <div class="icon">🪦</div>
          <h3>Crypt of Vael'drun</h3>
          <div class="location-type">Necromantic Tomb · Utara</div>
          <p>Tiga abad lalu seorang lich ditenggelamkan di sini bersama mahkotanya. Sunyi, dingin, menanti.</p>
        </div>
        <div class="location-card forge ${forgeCleared ? 'completed' : ''}" data-target="forge">
          <div class="icon">🔥</div>
          <h3>Forge of Korr-Dun</h3>
          <div class="location-type">Demonic Mine · Selatan</div>
          <p>Tambang dwarf yang ditelan iblis. Palu-palu masih berdetak di kedalaman, meski tak ada yang mengoperasikan.</p>
        </div>
        <div class="location-card town" data-target="town-back">
          <div class="icon">🏘️</div>
          <h3>Aethelford</h3>
          <div class="location-type">Tempat Aman · Pusat</div>
          <p>Kembali ke desa.</p>
        </div>
      </div>
    `;

    document.querySelectorAll('.location-card').forEach(card => {
      card.addEventListener('click', () => {
        const target = /** @type {HTMLElement} */ (card).dataset.target;
        if (target === 'crypt') goToScene('cryptEntrance');
        else if (target === 'forge') goToScene('forgeEntrance');
        else if (target === 'town-back') goToScene('town');
      });
    });
  },

  // ─── FINAL ENDING ────────────────────────────────────────
  finalEnding: () => {
    const p = state.player;
    if (!p) return;

    showNarrative(`
      <p class="scene-title">✦ Akhir Petualangan ✦</p>
      <p>Selene berdiri di pintu desa saat fajar. Ia tidak tersenyum — bukan tipenya — tapi anggukannya berisi sesuatu yang lebih dari rasa terima kasih.</p>
      <p>"Crypt sunyi sekarang. Forge dingin. Aethelford bisa tidur untuk beberapa generasi, mungkin lebih."</p>
      <p>Kau berbalik, jalan terbentang ke arah cakrawala. Di balik bukit, kuda-kudamu menunggu. Di belakang, dua bencana yang kau akhiri.</p>
      <p class="whisper">— Apa pertanyaannya bukan "apa yang akan kau lakukan sekarang?" tapi "siapa yang akan memanggilmu berikutnya?" —</p>
      <p class="loot">Stats akhir: Level ${p.level} ${p.className} · ${p.gold} gold</p>
      <p class="success">✦ TAMAT ✦</p>
    `);
    showChoices([{ text: '↻ Mulai petualangan baru', action: () => init() }]);
  }
};
