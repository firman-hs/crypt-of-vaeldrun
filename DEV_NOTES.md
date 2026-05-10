# 📓 Development Notes

> *Internal documentation untuk menjaga konsistensi project saat dikembangkan lintas sesi atau kontributor.*

**Project**: The Crypt of Vael'drun  
**Tipe**: Text-adventure RPG, browser-based, vanilla JS  
**Last updated**: 2026-05-10

---

## 🎯 Visi Project

Sebuah text-adventure RPG ala D&D dengan estetika dark fantasy grimoire. Fokus pada:
- **Mekanik D&D autentik** (d20, DC, modifier)
- **Replayability** lewat multiple endings dan playstyle berbeda per class
- **Scalable architecture** — mudah tambah konten baru tanpa overhaul
- **Zero-dependency** — vanilla HTML/CSS/JS, deploy ke GitHub Pages

**Filosofi**: Kualitas atas kuantitas. Mendingan 2 dungeon yang well-crafted daripada 10 yang shallow.

---

## 📁 Struktur File

```
crypt-of-vaeldrun/
├── index.html              # entry point, urutan script penting
├── style.css               # semua styling, dark fantasy theme
├── README.md               # public-facing docs
├── DEV_NOTES.md            # file ini (internal)
└── js/
    ├── core.js             # foundation: state, dice, UI, status effects
    ├── dice.js             # animasi d20 SVG
    ├── classes.js          # 3 class + 9 abilities definition
    ├── monsters.js         # database monster + getMonster() factory
    ├── combat.js           # turn-based combat engine
    ├── main.js             # scene router, character creation, init
    └── scenes/
        ├── town.js         # Aethelford hub
        ├── crypt.js        # Crypt of Vael'drun
        └── forge.js        # Forge of Korr-Dun
```

### Urutan Loading Script (PENTING)

Karena tidak pakai bundler, urutan `<script>` di `index.html` harus benar:

```
core.js → dice.js → classes.js → monsters.js → combat.js → scenes/*.js → main.js
```

`main.js` selalu terakhir karena bergantung pada semua di atasnya.

---

## 🏗️ Arsitektur

### Global State

Satu object `state` di `core.js` menyimpan semuanya:

```javascript
const state = {
  player: null,           // karakter pemain (null sebelum char creation)
  currentScene: 'start',
  flags: {},              // quest flags: cryptCleared, goblinDefeated, dll
  rollLog: [],            // history dadu untuk debug
  lastSafeScene: null     // untuk fitur 'flee' kembali ke titik aman
};
```

### Player Object Structure

```javascript
state.player = {
  class: 'warrior',           // ID class
  className: 'Warrior',       // display name
  level: 1,
  xp: 0,
  gold: 15,
  hp: 14, maxHp: 14,
  stats: { STR: 3, DEX: 1, INT: 0, CON: 2 },
  weapon: { name: '...', dmg: [1, 8], stat: 'STR' },
  resource: { name: 'Stamina', max: 6, current: 6, regen: 2 },
  abilities: ['powerStrike', 'shieldBash', 'secondWind'],
  statusEffects: {}           // { poisoned: 3, frosted: 2, dll }
};
```

### Scene Pattern

Semua scene didaftarkan ke `window.__sceneRegistry` (dari tiap file scene), lalu dikumpulkan oleh `main.js` jadi object `scenes`.

```javascript
const myScenes = {
  sceneId: () => {
    showNarrative(`<p>Deskripsi...</p>`);
    showChoices([
      { text: 'Pilihan A', action: () => goToScene('next') }
    ]);
  }
};
Object.assign(window.__sceneRegistry = window.__sceneRegistry || {}, myScenes);
```

Navigasi: `goToScene('sceneId')`.

---

## 📝 Konvensi Penamaan

| Tipe | Pattern | Contoh |
|------|---------|--------|
| Scene ID | `prefix` + `CamelCase` | `cryptEntrance`, `forgeBoss`, `townInn` |
| Encounter helper | `verb` + `Noun` | `sneakGoblin`, `parleyLich`, `wadeWater` |
| Monster ID | `camelCase` deskriptif | `goblin`, `fireImp`, `ashGhoul` |
| Ability ID | `camelCase` | `powerStrike`, `firebolt`, `sneakAttack` |
| Flag name | `camelCase` deskriptif | `cryptCleared`, `goblinDefeated`, `visitedTown` |
| CSS class | `kebab-case` | `.location-card`, `.dice-container` |
| CSS variable | `--kebab-case` | `--gold`, `--bg-parchment` |

**Prefix scene** tergantung area:
- `town*` → Aethelford
- `crypt*` → Crypt of Vael'drun  
- `forge*` → Forge of Korr-Dun
- (Future) `grove*` → Whispering Grove

---

## ⚙️ Mekanik Inti

### Dice System
- `roll(sides)` → 1 dadu
- `rollDice(count, sides)` → multiple dadu
- `rollD20WithMod(mod, dc, label)` → returns `{ d, total, success, isCrit, isFumble }`
  - Auto-trigger animasi via `dice.js`
  - Auto-log ke `state.rollLog`

### Combat
- Entry: `combat('monsterId', onWinCallback)` atau `combat({...customMonster}, callback)`
- Tiap turn: process player DoT → aksi player → process monster DoT → aksi monster → decrement buffs → regen resource
- Setelah menang: heal separuh resource, reset status effects

### Status Effects
DoT (damage over turn): `poisoned` (1d4), `burning` (1d6)  
Buffs: `shielded` (reduce dmg 1d8), `advantage` (+5 to-hit)  
Debuffs musuh: `frosted` (-2 to-hit), `blinded` (-4 to-hit), `stunned` (skip turn)

### XP Curve
Threshold: `level × 100`. Per level up: +4 max HP, +1 max resource, full restore.

---

## ✅ Decisions History (Why kita bikin gini)

| Decision | Alasan |
|----------|--------|
| Inventory di-skip | Belum ada use case yang berarti, jadi cuma ngumpul item flavor. Revisit saat ada loot system real. |
| Resource per class beda nama (Stamina/Mana/Focus) | Flavor — tiap class terasa unik, padahal mekaniknya sama. |
| 3 ability per class (bukan 5+) | Cukup untuk variety, tidak overwhelming UI di text-based. |
| Multi-file dari tadinya satu | Sudah 900+ baris, makin susah maintain. Sekarang scalable. |
| `window.__sceneRegistry` (bukan ES modules) | Vanilla JS tanpa bundler — module pattern via global namespace. |
| Town sebagai hub (bukan linear) | Memberi sense of "world" + persiapan save/load + tempat heal. |
| Animasi dadu non-invasive (hook di `rollD20WithMod`) | Bisa di-disable tanpa nyentuh kode game lainnya. |
| Magmaforge AC -2 saat scout sukses | Memberi reward untuk strategy, bukan cuma damage bonus. |

---

## 🛣️ Roadmap

### ✅ Selesai
- [x] Multi-file architecture
- [x] 3 class + 9 abilities + resource system
- [x] Status effects (poison, burn, frost, blind, stun, shield, advantage)
- [x] Town hub (Aethelford) dengan inn, smith, elder, world map
- [x] 2 dungeon: Crypt of Vael'drun + Forge of Korr-Dun
- [x] Multiple endings per dungeon (combat/parley/stealth)
- [x] Animated d20 SVG dengan crit/fumble visuals
- [x] README + GitHub Pages deployment

### 📋 Backlog (urutan prioritas)
- [ ] **Save/Load** — auto-save di localStorage tiap masuk scene aman
- [ ] **Equipment system** — drop loot dari boss, armor/weapon slots dengan stat bonus
- [ ] **Shop di town** — Borric jual senjata, healer jual potion
- [ ] **Subclass system level 3** — Warrior → Berserker/Guardian, Mage → Pyromancer/Necromancer, dll
- [ ] **Dungeon ke-3: Whispering Grove** — tema stealth/puzzle, kontras dengan combat-heavy
- [ ] **Sound effects** — pakai Howler.js, asset dari freesound.org
- [ ] **NPC dialog tree** — branching dengan persuasion checks
- [ ] **Achievement system** — track untuk replayability
- [ ] **Random events** di world map
- [ ] **Typewriter text effect** (optional toggle)

### 💭 Maybe / Wishlist
- Custom class creator (point-buy)
- Procedural side-dungeons
- Localization (English version)
- Mobile UX optimizations
- Light mode (parchment theme)

---

## 🔧 Cara Menambah Konten Baru

### Tambah Scene Baru

1. Pilih file scene yang relevan (`scenes/town.js`, `scenes/crypt.js`, dll) atau buat baru
2. Tambahkan ke object scene:
   ```javascript
   const myScenes = {
     myNewScene: () => {
       state.lastSafeScene = 'myNewScene';  // jika ini scene aman
       showNarrative(`
         <p class="scene-title">Judul Scene</p>
         <p>Deskripsi narasi...</p>
       `);
       showChoices([
         { text: 'Pilihan combat', action: () => combat('goblin', () => goToScene('next')) },
         { text: 'Pilihan check', hint: '— DEX DC 13', action: () => mySkillCheck() },
         { text: 'Mundur', action: () => goToScene('previous') }
       ]);
     }
   };
   Object.assign(window.__sceneRegistry = window.__sceneRegistry || {}, myScenes);
   ```
3. Kalau file baru, daftarkan di `index.html` (sebelum `main.js`)

### Tambah Monster Baru

Edit `js/monsters.js`:
```javascript
namaMonster: {
  name: 'Display Name',
  intro: 'Deskripsi muncul saat combat dimulai...',
  maxHp: 12, ac: 13, toHit: 3, dmg: [1, 8], xp: 80, gold: 15
}
```

### Tambah Ability Baru

Edit `js/classes.js`, tambahkan ke `ABILITIES`:
```javascript
namaAbility: {
  name: 'Display Name',
  cost: 3,
  desc: 'Deskripsi tooltip...',
  once: false,  // true jika sekali per combat (kayak secondWind)
  use: (p, m) => {
    // p = player, m = monster
    // Modifikasi p.hp, m.hp, p.statusEffects, m.statusEffects
    return `<p>Log narasi...</p>`;
  }
}
```
Lalu masukkan ID-nya ke array `abilities` di class yang relevan.

### Tambah Class Baru

1. Tambah definisi di `CLASSES` (`js/classes.js`)
2. Bikin 3 ability baru di `ABILITIES`
3. Tambah CSS class di `style.css`:
   - `body.class-namabaru .resource-fill { background: ... }`
   - `.class-card.class-namabaru .resource-tag { color: ... }`

### Tambah Dungeon Baru

1. Buat file `js/scenes/namaDungeon.js`
2. Buat scenes dengan prefix konsisten (misal `grove*`)
3. Daftarkan di `index.html` sebelum `main.js`
4. Tambahkan entry di world map (`scenes/town.js` → `worldMap`)
5. Tambahkan flag `flags.namaDungeonCleared`

---

## 🐛 Known Issues / TODO

- [ ] Resource regen saat di town: setelah combat selesai, current resource pulih separuh, tapi saat masuk scene baru di luar combat tidak ada regen passive. Masih oke untuk sekarang karena ada inn.
- [ ] Beberapa skill check di luar combat tidak punya konsekuensi DEX/INT/STR yang seimbang antar class — Mage selalu buruk di STR check, etc. Mungkin perlu alternative paths per scene.
- [ ] Animasi dadu di mobile mungkin masih agak menutupi tombol di layar sangat kecil (<360px).

---

## 💡 Tips untuk Pengembangan Lintas Sesi

Kalau kamu mulai chat baru dengan Claude (atau developer lain), upload file ini + relevant code files agar dapat context lengkap.

**Template prompt awal yang efektif:**

```
Saya melanjutkan project text-RPG D&D bernama "Crypt of Vael'drun".
Saya sudah punya foundation lengkap (lihat DEV_NOTES.md dan README.md).

Hari ini saya mau kerjakan: [FITUR_X]

File yang relevan: [LIST_FILE]
```

**Per topik, file yang biasanya perlu di-upload:**

| Topik | Files |
|-------|-------|
| Scene/dungeon baru | `core.js`, `combat.js`, `monsters.js`, `scenes/*.js` (sebagai contoh), `DEV_NOTES.md` |
| Combat/ability system | `core.js`, `combat.js`, `classes.js`, `DEV_NOTES.md` |
| UI/visual/CSS | `index.html`, `style.css`, `dice.js` (kalau animasi), `DEV_NOTES.md` |
| Class baru | `classes.js`, `combat.js`, `DEV_NOTES.md` |
| System (save/load, dll) | `core.js`, `main.js`, `DEV_NOTES.md` |

---

## 🤝 Pair Programming Notes

Saat berdiskusi dengan AI assistant atau dev lain:
- **Tunjukkan struktur dulu** sebelum implementasi (urutan: `apa yang akan diubah` → `kenapa` → `kode`)
- **Test path harus eksplisit** — minta untuk testing manual karena tidak ada unit test
- **Hindari refactor besar** sambil add fitur baru — pisahkan PR/commit
- **Update file ini** setiap kali ambil keputusan arsitektural

---

<p align="center"><em>"Maintain the dungeon, and the dungeon maintains you."</em></p>
