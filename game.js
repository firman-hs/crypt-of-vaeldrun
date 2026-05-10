/* ============================================================
   THE CRYPT OF VAEL'DRUN — GAME LOGIC
   ============================================================
   Struktur file:
     1. GAME STATE        — penyimpanan kondisi game saat ini
     2. DICE & UTILITIES  — sistem dadu d20, logging
     3. CLASSES           — definisi class karakter
     4. ABILITIES         — definisi ability per class
     5. STATUS EFFECTS    — sistem buff/debuff untuk player & monster
     6. UI RENDERING      — fungsi update tampilan
     7. COMBAT SYSTEM     — sistem pertempuran
     8. XP & LEVELING     — progression karakter
     9. SCENES            — semua scene/lokasi game
    10. ENCOUNTER HELPERS — helper untuk goblin, slime, lich, dll
    11. ENDINGS & DEATH   — handler akhir game
    12. CORE LOOP         — init & navigasi scene
   ============================================================ */


/* ============================================================
   1. GAME STATE
   ============================================================ */
const state = {
  player: null,
  currentScene: 'start',
  flags: {},
  rollLog: [],
  lastSafeScene: null
};


/* ============================================================
   2. DICE & UTILITIES
   ============================================================ */
function roll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i++) total += roll(sides);
  return total;
}

function rollD20WithMod(mod, dc, label) {
  const d = roll(20);
  const total = d + mod;
  const isCrit = d === 20;
  const isFumble = d === 1;
  const success = isCrit ? true : isFumble ? false : total >= dc;

  const entry = `${label}: d20(${d}) ${mod >= 0 ? '+' : ''}${mod} = ${total} vs DC ${dc} → ${
    isCrit ? 'CRITICAL!' : isFumble ? 'FUMBLE!' : success ? 'SUCCESS' : 'FAIL'
  }`;
  state.rollLog.push(entry);
  updateLog();

  return { d, total, success, isCrit, isFumble };
}

function updateLog() {
  const log = document.getElementById('log');
  log.innerHTML = state.rollLog.slice(-20).map((e, i) => {
    const num = state.rollLog.length - Math.min(20, state.rollLog.length) + i + 1;
    return `<div><span class="turn">[${String(num).padStart(2, '0')}]</span> ${e}</div>`;
  }).join('');
}

document.getElementById('logToggle').addEventListener('click', () => {
  document.getElementById('log').classList.toggle('visible');
});


/* ============================================================
   3. CLASSES
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
   4. ABILITIES
   ============================================================
   Tiap ability mengembalikan { log, monsterDefeated? }.
   Ability bisa modifikasi m.hp, m.statusEffects, p.hp, p.statusEffects.
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


/* ============================================================
   5. STATUS EFFECTS
   ============================================================
   Status effects disimpan sebagai object { effectName: turnsRemaining }.
   processStatusEffects() dipanggil di awal turn entitas tsb.
   ============================================================ */
function processPlayerStatusEffects(p) {
  let log = '';
  if (p.statusEffects.poisoned > 0) {
    const dmg = roll(4);
    p.hp -= dmg;
    log += `<p class="debuff">Racun bekerja: ${dmg} damage. (${p.statusEffects.poisoned - 1} turn tersisa)</p>`;
    p.statusEffects.poisoned--;
  }
  return log;
}

function processMonsterStatusEffects(m) {
  let log = '';
  if (m.statusEffects.poisoned > 0) {
    const dmg = roll(4);
    m.hp -= dmg;
    log += `<p class="debuff">${m.name} terkena racun: ${dmg} damage. (${m.statusEffects.poisoned - 1} turn tersisa)</p>`;
    m.statusEffects.poisoned--;
  }
  return log;
}

function decrementBuffs(entity) {
  // Kurangi durasi buff/debuff yang sudah dipakai turn ini
  ['frosted', 'blinded', 'stunned', 'shielded', 'advantage'].forEach(eff => {
    if (entity.statusEffects[eff] > 0) entity.statusEffects[eff]--;
  });
}

function getStatusString(entity) {
  const effects = [];
  if (entity.statusEffects.poisoned > 0) effects.push(`Poison(${entity.statusEffects.poisoned})`);
  if (entity.statusEffects.frosted > 0) effects.push(`Frost(${entity.statusEffects.frosted})`);
  if (entity.statusEffects.blinded > 0) effects.push(`Blind(${entity.statusEffects.blinded})`);
  if (entity.statusEffects.stunned > 0) effects.push(`Stun(${entity.statusEffects.stunned})`);
  if (entity.statusEffects.shielded > 0) effects.push(`Shield(${entity.statusEffects.shielded})`);
  if (entity.statusEffects.advantage > 0) effects.push(`Advantage(${entity.statusEffects.advantage})`);
  return effects.length ? effects.join(', ') : '—';
}


/* ============================================================
   6. UI RENDERING
   ============================================================ */
function updateStatusPanel() {
  if (!state.player) return;
  const p = state.player;
  document.getElementById('statusPanel').classList.add('active');
  document.body.className = `class-${p.class}`;

  document.getElementById('charClass').textContent = p.className;
  document.getElementById('charLevel').textContent = p.level;
  document.getElementById('charXP').textContent = `${p.xp} / ${p.level * 100}`;
  document.getElementById('charGold').textContent = p.gold;
  document.getElementById('charHP').textContent = `${p.hp}/${p.maxHp}`;
  document.getElementById('hpFill').style.width = `${(p.hp / p.maxHp) * 100}%`;

  // Resource bar (Stamina/Mana/Focus)
  document.getElementById('resourceLabel').textContent = p.resource.name;
  document.getElementById('charResource').textContent = `${p.resource.current}/${p.resource.max}`;
  document.getElementById('resourceFill').style.width = `${(p.resource.current / p.resource.max) * 100}%`;

  ['STR', 'DEX', 'INT', 'CON'].forEach(s => {
    const v = p.stats[s];
    document.getElementById(`stat${s}`).textContent = (v >= 0 ? '+' : '') + v;
  });

  document.getElementById('charWeapon').textContent = p.weapon.name;
  document.getElementById('charStatus').textContent = getStatusString(p);
}

function showNarrative(html) {
  const el = document.getElementById('narrativeContent');
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.innerHTML = html;
  el.classList.add('fade-in');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showChoices(choices) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn fade-in';
    btn.style.animationDelay = `${i * 0.08}s`;

    let html = c.text;
    if (c.cost !== undefined) {
      const affordable = state.player.resource.current >= c.cost;
      html += ` <span class="cost ${affordable ? '' : 'unaffordable'}">${c.cost} ${state.player.resource.name.slice(0, 3).toUpperCase()}</span>`;
    }
    if (c.hint) html += ` <span class="hint">${c.hint}</span>`;
    if (c.desc) html += `<span class="desc">${c.desc}</span>`;

    btn.innerHTML = html;
    if (c.disabled) btn.disabled = true;
    btn.onclick = () => c.action();
    container.appendChild(btn);
  });
}


/* ============================================================
   7. COMBAT SYSTEM
   ============================================================ */
function combat(monster, onWin) {
  const p = state.player;
  const m = {
    ...monster,
    hp: monster.maxHp,
    statusEffects: {}
  };

  // Track ability "once-per-combat"
  const usedOnceAbilities = new Set();

  function combatTurn(action, abilityId) {
    let log = '';

    // ── Process player status effects (DoT seperti racun) ──
    log += processPlayerStatusEffects(p);
    if (p.hp <= 0) return playerDeath(log);

    // ── Aksi pemain ──
    if (action === 'attack') {
      log += playerAttack(p, m);
    } else if (action === 'ability') {
      const ab = ABILITIES[abilityId];
      p.resource.current -= ab.cost;
      if (ab.once) usedOnceAbilities.add(abilityId);
      log += ab.use(p, m);
    } else if (action === 'flee') {
      const r = rollD20WithMod(p.stats.DEX, 14, 'Flee');
      if (r.success) {
        log += `<p>Kau berhasil melarikan diri ke kegelapan. <span class="roll">DEX check ${r.total} vs DC 14</span></p>`;
        showNarrative(log);
        showChoices([{ text: 'Lanjutkan', action: () => goToScene(state.lastSafeScene || 'entrance') }]);
        return;
      }
      log += `<p class="failure">Kau gagal kabur — kakimu tersandung. <span class="roll">DEX check ${r.total} vs DC 14</span></p>`;
    }

    // ── Cek kemenangan ──
    if (m.hp <= 0) return victory(log);

    // ── Process monster status effects ──
    log += processMonsterStatusEffects(m);
    if (m.hp <= 0) return victory(log);

    // ── Giliran monster ──
    if (m.statusEffects.stunned > 0) {
      log += `<p class="buff">${m.name} terhuyung dan kehilangan giliran.</p>`;
    } else {
      log += monsterAttack(p, m);
    }

    // ── Decrement buff durations (after this turn) ──
    decrementBuffs(p);
    decrementBuffs(m);

    // ── Regen resource ──
    p.resource.current = Math.min(p.resource.max, p.resource.current + p.resource.regen);

    updateStatusPanel();

    if (p.hp <= 0) return playerDeath(log);

    log += `<p class="whisper">— ${m.name}: ${m.hp}/${m.maxHp} HP — ${getStatusString(m) !== '—' ? `Status: ${getStatusString(m)} —` : ''}</p>`;
    showNarrative(log);
    renderCombatChoices();
  }

  function victory(log) {
    log += `<p class="success">✦ ${m.name} jatuh, tidak bergerak lagi.</p>`;
    log += `<p class="loot">Kau memperoleh ${m.xp} XP${m.gold ? ` dan ${m.gold} keping emas` : ''}.</p>`;
    gainXP(m.xp);
    p.gold += m.gold || 0;
    // Restore separuh resource setelah combat
    p.resource.current = Math.min(p.resource.max, p.resource.current + Math.ceil(p.resource.max / 2));
    updateStatusPanel();
    showNarrative(log);
    showChoices([{ text: 'Lanjutkan perjalanan', action: onWin }]);
  }

  function playerDeath(log) {
    p.hp = 0;
    updateStatusPanel();
    log += `<p class="failure">✦ Pandanganmu meredup. Kau tumbang di lantai dingin...</p>`;
    showNarrative(log);
    showChoices([{ text: 'Mulai lagi', action: () => init() }]);
  }

  function renderCombatChoices() {
    const choices = [
      { text: `Serang dengan ${p.weapon.name}`, action: () => combatTurn('attack') }
    ];

    // Tambahkan tiap ability sebagai pilihan
    p.abilities.forEach(abId => {
      const ab = ABILITIES[abId];
      const cantAfford = p.resource.current < ab.cost;
      const usedUp = ab.once && usedOnceAbilities.has(abId);
      choices.push({
        text: ab.name,
        cost: ab.cost,
        desc: ab.desc + (usedUp ? ' (sudah dipakai)' : ''),
        disabled: cantAfford || usedUp,
        action: () => combatTurn('ability', abId)
      });
    });

    choices.push({ text: 'Coba melarikan diri', hint: '— DEX check DC 14', action: () => combatTurn('flee') });

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

function playerAttack(p, m) {
  let mod = p.stats[p.weapon.stat];
  // Smoke Bomb advantage: +5 to-hit
  if (p.statusEffects.advantage > 0) mod += 5;

  const r = rollD20WithMod(mod, m.ac, `Attack vs ${m.name}`);
  if (r.success) {
    let dmg = roll(p.weapon.dmg[1]) + p.weapon.dmg[0] - 1 + Math.max(0, p.stats[p.weapon.stat]);
    if (r.isCrit) dmg *= 2;
    m.hp -= dmg;
    return `<p>Kau menebas dengan ${p.weapon.name}. <span class="roll">d20(${r.d})+${mod} = ${r.total} vs AC ${m.ac}</span></p>
            <p class="success">${r.isCrit ? '✦ CRITICAL HIT! ' : ''}Kena! ${dmg} damage.</p>`;
  }
  return `<p>Kau mengayun, tapi <span class="roll">d20(${r.d})+${mod} = ${r.total}</span> tidak mencapai AC ${m.ac}.</p>
          <p class="failure">${r.isFumble ? '✦ FUMBLE! ' : ''}Meleset.</p>`;
}

function monsterAttack(p, m) {
  let toHit = m.toHit;
  // Frost Nova debuff: -2 to-hit
  if (m.statusEffects.frosted > 0) toHit -= 2;
  // Blinded debuff: -4 to-hit
  if (m.statusEffects.blinded > 0) toHit -= 4;

  const dc = 10 + p.stats.DEX;
  const mr = rollD20WithMod(toHit, dc, `${m.name} attack`);
  if (mr.success) {
    let dmg = roll(m.dmg[1]) + m.dmg[0] - 1;
    if (mr.isCrit) dmg *= 2;
    // Arcane Shield: damage dikurangi 1d8
    if (p.statusEffects.shielded > 0) {
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


/* ============================================================
   8. XP & LEVELING
   ============================================================ */
function gainXP(amount) {
  const p = state.player;
  p.xp += amount;
  while (p.xp >= p.level * 100) {
    p.xp -= p.level * 100;
    p.level++;
    p.maxHp += 4;
    p.hp = p.maxHp;
    p.resource.max += 1;
    p.resource.current = p.resource.max;
  }
}


/* ============================================================
   9. SCENES
   ============================================================ */
const scenes = {
  start: () => {
    showNarrative(`
      <p class="scene-title">Prolog</p>
      <p>Hujan menderas di atas reruntuhan menara <em>Vael'drun</em> — sebuah nama yang dibisikkan para tetua dengan tatapan yang cepat berpaling. Tiga abad lalu, sang lich Maerith Vael'drun ditenggelamkan ke dalam crypt di bawah menara ini, bersama mahkotanya yang konon dapat memerintah orang mati.</p>
      <p>Kau berdiri di bibir pintu masuk crypt — sebuah lubang menganga di tanah, dipagari oleh akar-akar pohon yang sudah lama mati. Angin yang naik dari dalam berbau besi tua dan sesuatu yang manis-busuk.</p>
      <p class="whisper">Sebelum kau melangkah masuk, takdir bertanya: <em>siapa kau?</em></p>
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
          gold: 5,
          hp: c.hp,
          maxHp: c.hp,
          stats: { ...c.stats },
          weapon: { ...c.weapon },
          resource: { name: c.resource.name, max: c.resource.max, current: c.resource.max, regen: c.resource.regen },
          abilities: [...c.abilities],
          statusEffects: {}
        };
        updateStatusPanel();
        showAbilityIntro();
      });
    });
  },

  entrance: () => {
    state.lastSafeScene = 'entrance';
    showNarrative(`
      <p class="scene-title">I. Tangga Turun</p>
      <p>Tangga batu menukik ke bawah, basah karena tetesan air dari atap. Setelah dua puluh anak tangga, kau tiba di sebuah ruang antre — dindingnya dipahat dengan relief para ksatria yang berlutut menghadap sosok bermahkota tinggi.</p>
      <p>Tiga koridor terbuka di hadapanmu. Yang <em>kiri</em> beraroma asap kayu — ada yang masih hidup di sana. Yang <em>tengah</em> dihiasi runic emas yang berdenyut samar. Yang <em>kanan</em> gelap total, dan dari sana kau dengar gemericik air.</p>
    `);
    showChoices([
      { text: 'Tempuh koridor kiri (asap kayu)', action: () => goToScene('goblinCamp') },
      { text: 'Tempuh koridor tengah (runic emas)', hint: '— terasa berbahaya', action: () => goToScene('runicHall') },
      { text: 'Tempuh koridor kanan (gemericik air)', action: () => goToScene('flooded') }
    ]);
  },

  goblinCamp: () => {
    if (state.flags.goblinDefeated) return goToScene('goblinCleared');
    showNarrative(`
      <p class="scene-title">II. Kemah Goblin</p>
      <p>Koridor membuka ke sebuah ruang melingkar. Sebuah api unggun kecil berkobar di tengah, dijaga oleh seorang goblin bertopi kulit yang sedang memanggang sesuatu yang sebaiknya tidak kau identifikasi. Ia belum melihatmu.</p>
      <p>Di balik si goblin, kau lihat sebuah peti kecil berukir.</p>
    `);
    showChoices([
      { text: 'Serang langsung', action: () => fightGoblin() },
      { text: 'Coba menyelinap mengitari', hint: '— DEX check DC 13', action: () => sneakGoblin() },
      { text: 'Berbicara dengan si goblin', hint: '— hasilnya tidak pasti', action: () => parleyGoblin() },
      { text: 'Mundur ke tangga', action: () => goToScene('entrance') }
    ]);
  },

  goblinCleared: () => {
    showNarrative(`
      <p class="scene-title">II. Kemah Goblin (kosong)</p>
      <p>Api unggun masih membara samar. Tidak ada lagi yang hidup di sini.</p>
    `);
    showChoices([
      { text: 'Kembali ke pertigaan', action: () => goToScene('entrance') }
    ]);
  },

  runicHall: () => {
    state.lastSafeScene = 'runicHall';
    showNarrative(`
      <p class="scene-title">III. Aula Runic</p>
      <p>Setiap langkahmu memantul aneh. Lantai diukir dengan lingkaran konsentris penuh aksara yang bukan dari dunia ini. Di tengah ruangan berdiri sebuah pedestal berisi sebuah <em>buku terbuka</em> — halaman-halamannya bergerak meski tak ada angin.</p>
      <p>Suara — bukan dengan telinga, tapi di dalam tengkorakmu — bertanya: <em>"Kau yang hidup. Apakah kau datang sebagai murid, atau sebagai pencuri?"</em></p>
    `);
    showChoices([
      { text: '"Aku datang sebagai murid"', hint: '— INT check DC 14', action: () => muridPath() },
      { text: 'Ambil bukunya', hint: '— berisiko', action: () => stealBook() },
      { text: 'Mundur dengan hormat', action: () => goToScene('entrance') }
    ]);
  },

  flooded: () => {
    state.lastSafeScene = 'flooded';
    showNarrative(`
      <p class="scene-title">IV. Ruang Banjir</p>
      <p>Air setinggi lutut menggenangi koridor. Sesuatu bergerak di bawah permukaan. Di ujung lain, kau lihat sebuah pintu berukir tengkorak — itu pasti gerbang ke ruang dalam crypt.</p>
    `);
    showChoices([
      { text: 'Mengarungi air dengan hati-hati', hint: '— DEX check DC 12', action: () => wadeWater() },
      { text: 'Pancing dengan suara dulu', hint: '— INT check DC 11', action: () => baitWater() },
      { text: 'Mundur ke pertigaan', action: () => goToScene('entrance') }
    ]);
  },

  boss: () => {
    showNarrative(`
      <p class="scene-title">V. Singgasana Maerith</p>
      <p>Pintu berdesir terbuka. Ruangan di balik itu berbentuk cawan, dengan lantai cermin gelap. Di tengahnya, di atas singgasana tulang yang tumbuh dari lantai itu sendiri, duduk sosok kering berjubah — <em>Maerith Vael'drun</em>. Mahkota di kepalanya berdenyut dengan cahaya hijau-purba.</p>
      <p>Dua titik lampu kecil menyala di rongga matanya. Suaranya seperti kertas yang terbakar pelan:</p>
      <p class="whisper"><em>"Tiga ratus tahun... dan akhirnya seseorang datang. Apa yang kau cari di kerajaanku, kecil?"</em></p>
    `);
    showChoices([
      { text: '"Mahkotamu. Aku akan mengakhiri ini."', action: () => fightLich() },
      { text: '"Aku ingin tahu kebenaran."', hint: '— INT check DC 15', action: () => peacefulEnding() },
      { text: 'Diam-diam, dekati mahkotanya', hint: '— DEX check DC 16', action: () => sneakCrown() }
    ]);
  }
};

// Tampilkan ringkasan ability sebelum mulai petualangan
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
  showChoices([{ text: 'Masuki crypt', action: () => goToScene('entrance') }]);
}


/* ============================================================
   10. ENCOUNTER HELPERS
   ============================================================ */

// ── GOBLIN ──
function fightGoblin() {
  combat({
    name: 'Goblin Penjaga',
    intro: 'Goblin itu menggeram dan meraih pisau bergeriginya.',
    maxHp: 8, ac: 12, toHit: 2, dmg: [1, 6], xp: 40, gold: 8
  }, () => {
    state.flags.goblinDefeated = true;
    goToScene('entrance');
  });
}

function sneakGoblin() {
  const r = rollD20WithMod(state.player.stats.DEX, 13, 'Sneak Goblin');
  if (r.success) {
    state.flags.goblinDefeated = true;
    state.player.gold += 8;
    updateStatusPanel();
    showNarrative(`
      <p class="success">Kau bergerak seperti hantu. Goblin itu tidak pernah tahu kau di belakangnya. <span class="roll">DEX ${r.total} vs DC 13</span></p>
      <p class="loot">Kau mengambil 8 gold dari peti, lalu mundur tanpa suara.</p>
    `);
    showChoices([{ text: 'Kembali ke pertigaan', action: () => goToScene('entrance') }]);
  } else {
    showNarrative(`<p class="failure">Sebuah dahan retak di bawah kakimu. <span class="roll">DEX ${r.total} vs DC 13 — FAIL</span> Goblin itu berputar dengan pisau di tangan!</p>`);
    showChoices([{ text: 'Lawan!', action: () => fightGoblin() }]);
  }
}

function parleyGoblin() {
  const r = rollD20WithMod(state.player.stats.INT, 14, 'Diplomasi Goblin');
  if (r.success) {
    state.flags.goblinDefeated = true;
    state.player.gold += 5;
    updateStatusPanel();
    showNarrative(`
      <p>Kau menawarkan informasi tentang dapur di koridor lain. Goblin itu menggumamkan sesuatu yang hampir terdengar seperti "terima kasih" dan menggelinding pergi. <span class="roll">INT ${r.total} vs DC 14</span></p>
      <p class="loot">Ia meninggalkan 5 gold dan, anehnya, sebuah bisikan: <em>"Di air, jangan bersuara."</em></p>
    `);
    showChoices([{ text: 'Kembali', action: () => goToScene('entrance') }]);
  } else {
    showNarrative(`<p class="failure">Goblin itu hanya melihat kau sebagai makanan baru. <span class="roll">INT ${r.total} vs DC 14 — FAIL</span></p>`);
    showChoices([{ text: 'Lawan!', action: () => fightGoblin() }]);
  }
}

// ── RUNIC HALL ──
function muridPath() {
  const r = rollD20WithMod(state.player.stats.INT, 14, 'Persuasi Arcane');
  if (r.success) {
    state.player.stats.INT += 1;
    updateStatusPanel();
    showNarrative(`
      <p>Buku itu berdenyut, dan untuk sesaat kau merasa seseorang yang sangat tua tersenyum padamu. <span class="roll">INT check ${r.total} vs DC 14 — ${r.isCrit ? 'CRIT' : 'SUCCESS'}</span></p>
      <p class="success">+1 INT permanen. Kau merasa lebih mampu memahami yang tak terlihat.</p>
    `);
    showChoices([{ text: 'Kembali', action: () => goToScene('entrance') }]);
  } else {
    state.player.hp -= 4;
    updateStatusPanel();
    showNarrative(`
      <p>Buku menutup dengan paksa. Sebuah letupan psikis menyerangmu. <span class="roll">INT check ${r.total} vs DC 14 — FAIL</span></p>
      <p class="failure">Kau menerima 4 damage psikis.</p>
    `);
    if (state.player.hp <= 0) return death();
    showChoices([{ text: 'Mundur', action: () => goToScene('entrance') }]);
  }
}

function stealBook() {
  state.player.hp -= 6;
  updateStatusPanel();
  showNarrative(`
    <p>Saat tanganmu menyentuh halaman, runic di lantai menyala merah darah. <span class="failure">Kau dilemparkan ke dinding.</span></p>
    <p>Kau menerima 6 damage, dan tersungkur kembali ke aula sebelumnya.</p>
  `);
  if (state.player.hp <= 0) return death();
  showChoices([{ text: 'Lanjutkan', action: () => goToScene('entrance') }]);
}

// ── FLOODED ROOM ──
function wadeWater() {
  const r = rollD20WithMod(state.player.stats.DEX, 12, 'Mengarungi air');
  if (r.success) {
    showNarrative(`<p>Kau menyeberang tanpa mengganggu apapun di bawah air. <span class="roll">DEX ${r.total} vs DC 12</span></p>`);
    showChoices([{ text: 'Buka pintu tengkorak', action: () => goToScene('boss') }]);
  } else {
    showNarrative(`<p class="failure">Sesuatu yang dingin dan licin membelit kakimu! <span class="roll">DEX ${r.total} vs DC 12 — FAIL</span></p>`);
    showChoices([{ text: 'Lawan!', action: () => fightSlime(false) }]);
  }
}

function baitWater() {
  const r = rollD20WithMod(state.player.stats.INT, 11, 'Strategi');
  if (r.success) {
    showNarrative(`<p>Kau melemparkan kerikil. Sesuatu menyerang permukaan air dengan ganas. Kini kau tahu di mana ia.</p>`);
    showChoices([{ text: 'Lawan dari posisi aman', action: () => fightSlime(true) }]);
  } else {
    showNarrative(`<p>Kerikilmu salah lempar. Tidak ada respons. <span class="roll">INT ${r.total} vs DC 11 — FAIL</span></p>`);
    showChoices([
      { text: 'Mengarungi saja', action: () => fightSlime(false) },
      { text: 'Mundur', action: () => goToScene('entrance') }
    ]);
  }
}

function fightSlime(advantage) {
  combat({
    name: advantage ? 'Cave Slime (terdeteksi)' : 'Cave Slime',
    intro: advantage
      ? 'Kau menyerang dari posisi tinggi. Slime itu lambat, kau punya keuntungan.'
      : 'Sebuah massa hijau-kelabu naik dari air, mata-pseudopod-nya mencari panas tubuhmu.',
    maxHp: advantage ? 10 : 14,
    ac: advantage ? 10 : 12,
    toHit: 2, dmg: [1, 6], xp: 60, gold: 0
  }, () => goToScene('boss'));
}

// ── BOSS ──
function fightLich() {
  combat({
    name: 'Maerith, Lich Pertama',
    intro: 'Lich itu mengangkat tangan kering. Tulang-tulang dari lantai mulai bergerak.',
    maxHp: 32, ac: 15, toHit: 5, dmg: [2, 6], xp: 500, gold: 100
  }, () => ending('penakluk'));
}

function peacefulEnding() {
  const r = rollD20WithMod(state.player.stats.INT, 15, 'Diplomasi Lich');
  if (r.success) {
    showNarrative(`
      <p>Lich itu memandangmu lama. Lalu — entah karena bosan, entah karena tergerak — ia berbicara.</p>
      <p>Ia bercerita tentang sebuah dunia yang lupa cara berkabung, tentang seorang murid yang ingin abadi karena tidak siap kehilangan. Saat ia selesai, ia melepas mahkotanya sendiri.</p>
      <p class="success">✦ AKHIR DAMAI ✦</p>
      <p class="loot">Kau memperoleh: +500 XP, dan sesuatu yang lebih berat dari emas — pengetahuan.</p>
    `);
    gainXP(500);
    updateStatusPanel();
    ending('damai');
  } else {
    showNarrative(`<p>Lich itu tertawa — suara seperti batu yang retak. <span class="roll">INT ${r.total} vs DC 15 — FAIL</span></p><p class="failure">"Kau pikir kebenaran adalah hak orang yang lemah seperti kau?" Pertempuran tak terhindarkan.</p>`);
    showChoices([{ text: 'Lawan!', action: () => fightLich() }]);
  }
}

function sneakCrown() {
  const r = rollD20WithMod(state.player.stats.DEX, 16, 'Heist Mahkota');
  if (r.success) {
    showNarrative(`
      <p class="success">✦ Kau menyentuh mahkotanya — dan ia hancur menjadi debu di antara jarimu. Lich itu menjerit ringan, lalu menguap.</p>
      <p class="loot">+400 XP, +30 gold dari serpihan permata.</p>
    `);
    gainXP(400);
    state.player.gold += 30;
    updateStatusPanel();
    ending('licik');
  } else {
    showNarrative(`<p class="failure">Lich itu telah menunggu trik ini sejak abad ke-2. <span class="roll">DEX ${r.total} vs DC 16 — FAIL</span></p>`);
    showChoices([{ text: 'Lawan!', action: () => fightLich() }]);
  }
}


/* ============================================================
   11. ENDINGS & DEATH
   ============================================================ */
function ending(type) {
  let msg = '';
  if (type === 'damai') {
    msg = `<p class="scene-title">✦ Akhir: Sang Penyembuh ✦</p>
      <p>Kau membawa kabar tentang murid yang tersesat itu kembali ke dunia. Beberapa percaya. Banyak tidak. Tapi crypt itu kini diam selamanya, dan kadang, di malam-malam yang sangat sunyi, kau merasa seseorang yang sangat tua menggumamkan terima kasih di belakang kepalamu.</p>`;
  } else if (type === 'licik') {
    msg = `<p class="scene-title">✦ Akhir: Sang Pencuri ✦</p>
      <p>Kau pulang dengan kantong berat, tapi malam-malammu tidak pernah benar-benar tenang. Kadang, dalam mimpi, sebuah suara seperti kertas terbakar bertanya: <em>"Apa yang kau curi, sebenarnya?"</em></p>`;
  } else {
    msg = `<p class="scene-title">✦ Akhir: Sang Penakluk ✦</p>
      <p>Mahkota itu hancur di tanganmu, dan crypt mulai runtuh. Kau berlari naik tangga sementara dunia di belakangmu menelan ribuan tulang. Ketika kau muncul ke matahari pagi, kau tahu satu hal: <em>kau yang pertama keluar dari Vael'drun dengan masih bernyawa.</em></p>`;
  }
  msg += `<p class="whisper">— TAMAT —</p>`;
  msg += `<p class="loot">Stats akhir: Level ${state.player.level} ${state.player.className} · ${state.player.gold} gold</p>`;
  showNarrative(msg);
  showChoices([{ text: '↻ Mulai petualangan baru', action: () => init() }]);
}

function death() {
  showNarrative(`
    <p class="scene-title">✦ Kau Tewas ✦</p>
    <p>Crypt menelan satu jiwa lagi. Mungkin di lain hayat, kau akan lebih bijak.</p>
  `);
  showChoices([{ text: '↻ Mulai lagi', action: () => init() }]);
}


/* ============================================================
   12. CORE LOOP
   ============================================================ */
function goToScene(name) {
  state.currentScene = name;
  if (scenes[name]) scenes[name]();
}

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

// Mulai game saat halaman dimuat
init();
