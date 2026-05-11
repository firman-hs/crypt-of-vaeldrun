// @ts-check
/* ============================================================
   MONSTERS.JS — Monster Database
   ============================================================
   Semua monster terkumpul di sini sebagai template (tanpa
   statusEffects/hp current). Pakai getMonster(id) untuk dapat
   instance fresh dengan HP penuh.
   ============================================================ */

/** @typedef {import('../engine/types.js').Monster} Monster */
/** @typedef {Omit<Monster, 'hp' | 'statusEffects'>} MonsterTemplate */
/** @typedef {Object<string, MonsterTemplate>} MonsterRegistry */

/** @type {MonsterRegistry} */
export const MONSTERS = {
  // ─── CRYPT OF VAEL'DRUN ───────────────────────────────────
  goblin: {
    name: 'Goblin Penjaga',
    intro: 'Goblin itu menggeram dan meraih pisau bergeriginya.',
    maxHp: 8, ac: 12, toHit: 2, dmg: [1, 6], xp: 40, gold: 8
  },
  slime: {
    name: 'Cave Slime',
    intro: 'Sebuah massa hijau-kelabu naik dari air, mata-pseudopod-nya mencari panas tubuhmu.',
    maxHp: 14, ac: 12, toHit: 2, dmg: [1, 6], xp: 60, gold: 0
  },
  slimeDetected: {
    name: 'Cave Slime (terdeteksi)',
    intro: 'Kau menyerang dari posisi tinggi. Slime itu lambat, kau punya keuntungan.',
    maxHp: 10, ac: 10, toHit: 2, dmg: [1, 6], xp: 60, gold: 0
  },
  lich: {
    name: 'Maerith, Lich Pertama',
    intro: 'Lich itu mengangkat tangan kering. Tulang-tulang dari lantai mulai bergerak.',
    maxHp: 32, ac: 15, toHit: 5, dmg: [2, 6], xp: 500, gold: 100
  },

  // ─── FORGE OF KORR-DUN ────────────────────────────────────
  fireImp: {
    name: 'Fire Imp',
    intro: 'Makhluk kecil bersayap merah memekik gembira melihat mangsanya. Apinya menyala.',
    maxHp: 10, ac: 13, toHit: 3, dmg: [1, 6], xp: 70, gold: 12
  },
  fireImpDuo: {
    name: 'Pasangan Fire Imp',
    intro: 'Dua imp meluncur dari langit-langit, satu membawa cambuk api, satunya melempar bara.',
    maxHp: 18, ac: 13, toHit: 3, dmg: [1, 8], xp: 120, gold: 20
  },
  ashGhoul: {
    name: 'Ghoul Berdebu',
    intro: 'Mayat dwarf itu menggeliat bangun, kulitnya retak menampakkan bara hidup di dalamnya.',
    maxHp: 14, ac: 12, toHit: 3, dmg: [1, 8], xp: 80, gold: 15
  },
  ironGuardian: {
    name: 'Penjaga Besi',
    intro: 'Patung baja yang dijaga sigil emas tiba-tiba bergerak. Sendi-sendinya mendesis seperti uap.',
    maxHp: 22, ac: 16, toHit: 4, dmg: [1, 10], xp: 150, gold: 30
  },
  magmaforge: {
    name: 'Magmaforge — Sang Penempa',
    intro: 'Sebuah golem batu dan lava bangkit dari forge utama. Wajahnya: topeng besi cair yang tidak pernah dingin. "PEKERJA BARU?" gumamnya. "TIDAK ADA YANG MENINGGALKAN BENGKEL."',
    maxHp: 38, ac: 16, toHit: 5, dmg: [2, 8], xp: 600, gold: 150
  }
};


/**
 * Factory: bikin instance Monster baru dengan HP penuh
 * dan statusEffects kosong. Mencegah mutasi shared template.
 *
 * @param {string} id
 * @returns {Monster | null}
 */
export function getMonster(id) {
  const base = MONSTERS[id];
  if (!base) {
    console.error(`Monster "${id}" tidak ditemukan!`);
    return null;
  }
  return {
    ...base,
    hp: base.maxHp,
    statusEffects: {}
  };
}
