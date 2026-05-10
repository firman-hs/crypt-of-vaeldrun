/* ============================================================
   CORE.JS — Foundation Systems
   ============================================================
   Berisi:
     - Game state (global)
     - Dice & utilities
     - Logging
     - UI rendering (status panel, narrative, choices)
     - Status effects helpers
   ============================================================ */


/* ============================================================
   GAME STATE
   ============================================================ */
const state = {
  player: null,
  currentScene: 'start',
  flags: {},        // flag global: cryptCleared, forgeCleared, goblinDefeated, dll
  rollLog: [],
  lastSafeScene: null
};


/* ============================================================
   DICE & UTILITIES
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
  if (!log) return;
  log.innerHTML = state.rollLog.slice(-20).map((e, i) => {
    const num = state.rollLog.length - Math.min(20, state.rollLog.length) + i + 1;
    return `<div><span class="turn">[${String(num).padStart(2, '0')}]</span> ${e}</div>`;
  }).join('');
}


/* ============================================================
   STATUS EFFECTS
   ============================================================ */
function processPlayerStatusEffects(p) {
  let log = '';
  if (p.statusEffects.poisoned > 0) {
    const dmg = roll(4);
    p.hp -= dmg;
    log += `<p class="debuff">Racun bekerja: ${dmg} damage. (${p.statusEffects.poisoned - 1} turn tersisa)</p>`;
    p.statusEffects.poisoned--;
  }
  if (p.statusEffects.burning > 0) {
    const dmg = roll(6);
    p.hp -= dmg;
    log += `<p class="debuff">Api masih membakar: ${dmg} damage. (${p.statusEffects.burning - 1} turn tersisa)</p>`;
    p.statusEffects.burning--;
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
  if (m.statusEffects.burning > 0) {
    const dmg = roll(6);
    m.hp -= dmg;
    log += `<p class="debuff">${m.name} terbakar: ${dmg} damage. (${m.statusEffects.burning - 1} turn tersisa)</p>`;
    m.statusEffects.burning--;
  }
  return log;
}

function decrementBuffs(entity) {
  ['frosted', 'blinded', 'stunned', 'shielded', 'advantage'].forEach(eff => {
    if (entity.statusEffects[eff] > 0) entity.statusEffects[eff]--;
  });
}

function getStatusString(entity) {
  const effects = [];
  const e = entity.statusEffects;
  if (e.poisoned > 0)  effects.push(`Poison(${e.poisoned})`);
  if (e.burning > 0)   effects.push(`Burn(${e.burning})`);
  if (e.frosted > 0)   effects.push(`Frost(${e.frosted})`);
  if (e.blinded > 0)   effects.push(`Blind(${e.blinded})`);
  if (e.stunned > 0)   effects.push(`Stun(${e.stunned})`);
  if (e.shielded > 0)  effects.push(`Shield(${e.shielded})`);
  if (e.advantage > 0) effects.push(`Advantage(${e.advantage})`);
  return effects.length ? effects.join(', ') : '—';
}


/* ============================================================
   UI RENDERING
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
    if (c.cost !== undefined && state.player) {
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
   XP & LEVELING
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
   LOG TOGGLE EVENT (run after DOM ready)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('logToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.getElementById('log').classList.toggle('visible');
    });
  }
});
