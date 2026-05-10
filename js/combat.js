/* ============================================================
   COMBAT.JS — Combat Engine
   ============================================================
   Berisi:
     - combat(monster, onWin) — entry point combat
     - playerAttack, monsterAttack
     - usedOnceAbilities tracker per combat
   
   Dependencies: core.js, classes.js (ABILITIES)
   ============================================================ */

function combat(monsterIdOrObj, onWin) {
  const p = state.player;
  // Accept either monster ID string atau full monster object (untuk kustomisasi)
  const m = typeof monsterIdOrObj === 'string'
    ? getMonster(monsterIdOrObj)
    : { ...monsterIdOrObj, hp: monsterIdOrObj.maxHp, statusEffects: monsterIdOrObj.statusEffects || {} };

  if (!m) {
    showNarrative(`<p class="failure">Error: monster tidak ditemukan.</p>`);
    return;
  }

  const usedOnceAbilities = new Set();

  function combatTurn(action, abilityId) {
    let log = '';

    // Process player DoT (poison, burn)
    log += processPlayerStatusEffects(p);
    if (p.hp <= 0) return playerDeath(log);

    // Aksi pemain
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
        showChoices([{ text: 'Lanjutkan', action: () => goToScene(state.lastSafeScene || 'town') }]);
        return;
      }
      log += `<p class="failure">Kau gagal kabur — kakimu tersandung. <span class="roll">DEX check ${r.total} vs DC 14</span></p>`;
    }

    // Cek kemenangan
    if (m.hp <= 0) return victory(log);

    // Process monster DoT
    log += processMonsterStatusEffects(m);
    if (m.hp <= 0) return victory(log);

    // Giliran monster
    if (m.statusEffects.stunned > 0) {
      log += `<p class="buff">${m.name} terhuyung dan kehilangan giliran.</p>`;
    } else {
      log += monsterAttack(p, m);
    }

    // Decrement buff durations
    decrementBuffs(p);
    decrementBuffs(m);

    // Regen resource player
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
    // Reset status effects ringan setelah combat
    p.statusEffects = {};
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
  if (m.statusEffects.frosted > 0) toHit -= 2;
  if (m.statusEffects.blinded > 0) toHit -= 4;

  const dc = 10 + p.stats.DEX;
  const mr = rollD20WithMod(toHit, dc, `${m.name} attack`);
  if (mr.success) {
    let dmg = roll(m.dmg[1]) + m.dmg[0] - 1;
    if (mr.isCrit) dmg *= 2;
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
