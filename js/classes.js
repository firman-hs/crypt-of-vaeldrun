/* ============================================================
   CLASSES.JS — Class & Ability Definitions
   ============================================================
   Berisi:
     - 3 class: Warrior, Mage, Rogue
     - 9 abilities (3 per class)
   ============================================================ */


/* ============================================================
   CLASSES
   ============================================================ */
const CLASSES = {
  warrior: {
    name: 'Warrior',
    icon: '⚔',
    desc: 'Petarung tangguh berlapis baja, tangan terlatih dalam baja dan darah.',
    hp: 14,
    stats: { STR: 3, DEX: 1, INT: 0, CON: 2 },
    weapon: { name: 'Pedang Panjang', dmg: [1, 8], stat: 'STR' },
    resource: { name: 'Stamina', max: 6, regen: 2 },
    abilities: ['powerStrike', 'shieldBash', 'secondWind']
  },
  mage: {
    name: 'Mage',
    icon: '✦',
    desc: 'Penyihir yang tahu rahasia, jubah bertaburkan debu menara purba.',
    hp: 8,
    stats: { STR: -1, DEX: 1, INT: 4, CON: 0 },
    weapon: { name: 'Tongkat Arcane', dmg: [1, 6], stat: 'INT' },
    resource: { name: 'Mana', max: 8, regen: 1 },
    abilities: ['firebolt', 'frostNova', 'arcaneShield']
  },
  rogue: {
    name: 'Rogue',
    icon: '⚝',
    desc: 'Bayangan yang berjalan, pisau di tangan dan kebohongan di lidah.',
    hp: 10,
    stats: { STR: 1, DEX: 4, INT: 2, CON: 1 },
    weapon: { name: 'Belati Berbisa', dmg: [1, 6], stat: 'DEX' },
    resource: { name: 'Focus', max: 6, regen: 2 },
    abilities: ['sneakAttack', 'smokeBomb', 'poisonStrike']
  }
};


/* ============================================================
   ABILITIES
   ============================================================
   Tiap ability mengembalikan log string. Ability bisa modifikasi
   m.hp, m.statusEffects, p.hp, p.statusEffects.
   ============================================================ */
const ABILITIES = {
  // ─── WARRIOR ──────────────────────────────────────────────
  powerStrike: {
    name: 'Power Strike',
    cost: 3,
    desc: 'Tebasan brutal — damage ganda jika STR check sukses (DC 12).',
    use: (p, m) => {
      const r = rollD20WithMod(p.stats.STR, 12, 'Power Strike');
      if (r.success) {
        const base = roll(p.weapon.dmg[1]) + p.weapon.dmg[0] - 1 + p.stats.STR;
        const dmg = base * 2;
        m.hp -= dmg;
        return `<p>Kau menghimpun seluruh kekuatan dan menebas dengan brutal! <span class="roll">STR check ${r.total} vs DC 12</span></p>
                <p class="success"><span class="ability">POWER STRIKE!</span> ${dmg} damage.</p>`;
      }
      return `<p class="failure">Ayunanmu liar dan meleset. <span class="roll">STR check ${r.total} vs DC 12</span></p>`;
    }
  },
  shieldBash: {
    name: 'Shield Bash',
    cost: 2,
    desc: 'Hantam dengan perisai. Damage kecil tapi musuh skip turn berikutnya (DC 12 STR).',
    use: (p, m) => {
      const r = rollD20WithMod(p.stats.STR, 12, 'Shield Bash');
      const dmg = roll(4) + Math.max(0, p.stats.STR);
      m.hp -= dmg;
      let log = `<p>Kau menghantam dengan perisai. <span class="roll">STR check ${r.total} vs DC 12</span></p>`;
      log += `<p class="success">Hit! ${dmg} damage.</p>`;
      if (r.success) {
        m.statusEffects.stunned = 1;
        log += `<p class="debuff">${m.name} terhuyung — akan skip turn berikutnya.</p>`;
      }
      return log;
    }
  },
  secondWind: {
    name: 'Second Wind',
    cost: 4,
    desc: 'Tarik napas dalam, sembuhkan 1d8 + CON HP. Hanya sekali per combat.',
    once: true,
    use: (p, m) => {
      const heal = roll(8) + p.stats.CON;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      return `<p>Kau menarik napas dalam-dalam dan mengumpulkan tekad. <span class="roll">Heal: 1d8+CON = ${heal}</span></p>
              <p class="buff"><span class="ability">SECOND WIND!</span> Memulihkan ${heal} HP.</p>`;
    }
  },

  // ─── MAGE ─────────────────────────────────────────────────
  firebolt: {
    name: 'Firebolt',
    cost: 3,
    desc: 'Bola api 1d10 + INT. Mengabaikan armor.',
    use: (p, m) => {
      const dmg = roll(10) + p.stats.INT;
      m.hp -= dmg;
      return `<p>Bola api meledak dari ujung tongkatmu! <span class="roll">Firebolt: 1d10+INT = ${dmg} damage</span></p>
              <p class="success"><span class="ability">FIREBOLT!</span> Api menjilat ${m.name}, mengabaikan armor.</p>`;
    }
  },
  frostNova: {
    name: 'Frost Nova',
    cost: 4,
    desc: '1d6 damage es + musuh -2 to-hit selama 2 turn.',
    use: (p, m) => {
      const dmg = roll(6) + Math.floor(p.stats.INT / 2);
      m.hp -= dmg;
      m.statusEffects.frosted = 2;
      return `<p>Hembusan dingin meledak dari telapak tanganmu. <span class="roll">Frost: 1d6 + ${Math.floor(p.stats.INT/2)} = ${dmg} damage</span></p>
              <p class="success"><span class="ability">FROST NOVA!</span> ${dmg} damage.</p>
              <p class="debuff">${m.name} membeku — to-hit -2 selama 2 turn.</p>`;
    }
  },
  arcaneShield: {
    name: 'Arcane Shield',
    cost: 3,
    desc: 'Damage berikutnya yang kau terima dikurangi 1d8.',
    use: (p, m) => {
      p.statusEffects.shielded = 1;
      return `<p>Cahaya biru-keemasan mengelilingi tubuhmu, lapisan demi lapisan.</p>
              <p class="buff"><span class="ability">ARCANE SHIELD!</span> Damage berikutnya yang kau terima akan dikurangi 1d8.</p>`;
    }
  },

  // ─── ROGUE ────────────────────────────────────────────────
  sneakAttack: {
    name: 'Sneak Attack',
    cost: 3,
    desc: 'Serangan tipu daya — +1d6 damage jika DEX check sukses (DC 13).',
    use: (p, m) => {
      const r = rollD20WithMod(p.stats.DEX, 13, 'Sneak Attack');
      if (r.success) {
        const dmg = roll(p.weapon.dmg[1]) + p.weapon.dmg[0] - 1 + p.stats.DEX + roll(6);
        m.hp -= dmg;
        return `<p>Kau menghilang ke bayangan, lalu menusuk dari belakang. <span class="roll">DEX check ${r.total} vs DC 13</span></p>
                <p class="success"><span class="ability">SNEAK ATTACK!</span> ${dmg} damage.</p>`;
      }
      return `<p class="failure">${m.name} mendeteksimu sebelum kau bergerak. <span class="roll">DEX check ${r.total} vs DC 13</span></p>`;
    }
  },
  smokeBomb: {
    name: 'Smoke Bomb',
    cost: 4,
    desc: 'Lempar bom asap. Serangan biasa berikutnya advantage (+5 to-hit).',
    use: (p, m) => {
      p.statusEffects.advantage = 1;
      m.statusEffects.blinded = 1;
      return `<p>Asap hitam meledak di sekitar ${m.name}. Kau menghilang ke dalamnya.</p>
              <p class="buff"><span class="ability">SMOKE BOMB!</span> Serangan biasamu berikutnya: advantage (+5 to-hit).</p>
              <p class="debuff">${m.name} buta selama 1 turn.</p>`;
    }
  },
  poisonStrike: {
    name: 'Poison Strike',
    cost: 3,
    desc: 'Tikaman beracun. Damage normal + 1d4 racun/turn selama 3 turn.',
    use: (p, m) => {
      const mod = p.stats[p.weapon.stat];
      const r = rollD20WithMod(mod, m.ac, 'Poison Strike');
      if (r.success) {
        const dmg = roll(p.weapon.dmg[1]) + p.weapon.dmg[0] - 1 + Math.max(0, mod);
        m.hp -= dmg;
        m.statusEffects.poisoned = 3;
        return `<p>Kau menusuk dengan belati beracun. <span class="roll">d20+${mod} = ${r.total} vs AC ${m.ac}</span></p>
                <p class="success"><span class="ability">POISON STRIKE!</span> ${dmg} damage.</p>
                <p class="debuff">${m.name} teracun — 1d4 damage tiap turn selama 3 turn.</p>`;
      }
      return `<p class="failure">Tusukanmu meleset. <span class="roll">d20+${mod} = ${r.total} vs AC ${m.ac}</span></p>`;
    }
  }
};
