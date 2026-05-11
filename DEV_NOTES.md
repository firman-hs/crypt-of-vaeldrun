# 📓 Development Notes

> *Internal documentation untuk menjaga konsistensi project saat dikembangkan lintas sesi atau kontributor.*

**Project**: The Crypt of Vael'drun  
**Tipe**: Text-adventure RPG, browser-based, vanilla JS  
**Last updated**: 2026-05-11

> **Phase 1 refactor (2026-05-11)**: Project sudah dimigrasi ke **ES Modules** dengan struktur folder baru (`engine/`, `data/`, `scenes/`) dan type-checking via JSDoc + `tsconfig.json`. Lihat section "Struktur File" dan "Decisions History" untuk detail.

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
├── index.html              # entry point — load main.js sebagai ES module
├── style.css               # semua styling, dark fantasy theme
├── tsconfig.json           # config untuk JSDoc type-checking (no build step)
├── README.md               # public-facing docs
├── DEV_NOTES.md            # file ini (internal)
└── js/
    ├── main.js             # entry: import semua scene, build registry, init
    ├── engine/             # foundation systems
    │   ├── types.js        # JSDoc type definitions (Player, Monster, dll)
    │   ├── state.js        # global state object + resetState()
    │   ├── dice.js         # roll math + animasi d20 + queue API
    │   ├── status-effects.js  # DoT, decrement buffs, format string
    │   ├── ui.js           # showNarrative, showChoices, updateStatusPanel
    │   └── combat.js       # turn-based combat engine
    ├── data/               # definisi statis (jarang diubah)
    │   ├── classes.js      # 3 class definition
    │   ├── abilities.js    # 9 ability (dipisah dari classes — Phase 1)
    │   └── monsters.js     # database monster + getMonster() factory
    └── scenes/             # konten cerita
        ├── start.js        # character creation + ability intro
        ├── town.js         # Aethelford hub (export townScenes)
        ├── crypt.js        # Crypt of Vael'drun (export cryptScenes)
        └── forge.js        # Forge of Korr-Dun (export forgeScenes)
```

### Loading: ES Modules native browser

`index.html` hanya punya **satu** `<script type="module" src="js/main.js">`. Semua dependency di-resolve via `import`/`export` di tiap file. Tidak ada urutan loading manual — browser yang ngatur.

**⚠️ ES Modules butuh local HTTP server.** Tidak bisa double-click `index.html`.

```bash
# Cara paling cepat:
python3 -m http.server 8000
# Buka http://localhost:8000

# Atau pakai live-server (auto-reload):
npx http-server -c-1 .
```

GitHub Pages **support natively** — tidak ada konfigurasi tambahan.

### Type Checking (no build step)

`tsconfig.json` sudah disetup dengan `allowJs: true`, `checkJs: true`, `noEmit: true`. Buka project di VSCode dan kamu langsung dapat:
- IntelliSense untuk semua tipe (Player, Monster, Ability, dll dari `engine/types.js`)
- Squiggly merah kalau typo nama property atau argumen salah tipe
- **Tanpa** compile step — tetap pure vanilla JS

Untuk run type check di terminal:
```bash
npx -p typescript tsc --noEmit
```

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

### Scene Pattern (ES Modules)

Tiap file scene meng-export sebuah object yang berisi function-function scene-nya:

```javascript
// js/scenes/myArea.js
// @ts-check
import { state } from '../engine/state.js';
import { showNarrative, showChoices } from '../engine/ui.js';
import { combat } from '../engine/combat.js';
import { goToScene } from '../main.js';

/** @type {Object<string, () => void>} */
export const myAreaScenes = {
  myScene: () => {
    showNarrative(`<p>Deskripsi...</p>`);
    showChoices([
      { text: 'Pilihan A', action: () => goToScene('next') }
    ]);
  }
};
```

Kemudian di `main.js`, scene di-spread ke registry:

```javascript
// js/main.js
import { myAreaScenes } from './scenes/myArea.js';

const scenes = {
  start,
  ...townScenes,
  ...cryptScenes,
  ...forgeScenes,
  ...myAreaScenes,   // ← tambah di sini
};
```

Navigasi: `goToScene('myScene')`.

### Circular Dependency Workaround

`combat.js` butuh `goToScene` & `init` (untuk handle flee & death), tapi keduanya di `main.js` yang mengimport `combat.js` lewat scenes. Untuk hindari circular import yang fragile:

- `combat.js` export `setNavigation(goToSceneFn, initFn)`.
- `main.js` panggil `setNavigation(goToScene, init)` saat boot.
- Combat menyimpan reference ini di module-scope variable.

Pattern ini disebut **dependency injection** dan lebih clean daripada hack `window.__game`.

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
| ~~`window.__sceneRegistry`~~ → **ES Modules** (Phase 1, 2026-05-11) | Pattern global namespace gantian ke import/export native. Imports eksplisit di tiap file = pembaca tahu dari mana semua dependency datang. |
| `engine/`, `data/`, `scenes/` folder split (Phase 1) | Foundation systems (engine) dipisah dari konten (data + scenes). Engine jarang berubah, scenes terus tumbuh — pemisahan logikal. |
| `abilities.js` dipisah dari `classes.js` (Phase 1) | Class jarang ditambah (3 → mungkin 6 total), abilities akan terus tumbuh (9 → 30+). Berbeda growth pattern = beda file. |
| JSDoc + tsconfig.json (no build step) (Phase 1) | Dapat type-checking penuh di VSCode tanpa compile step. Tetap pure vanilla JS, deploy ke GitHub Pages tanpa transformasi. |
| `setNavigation()` dependency injection di combat | Combat butuh akses `goToScene`/`init` dari main.js, tapi main.js juga import combat lewat scenes. Inject lewat setter = no circular import yang fragile. |
| Town sebagai hub (bukan linear) | Memberi sense of "world" + persiapan save/load + tempat heal. |
| Animasi dadu non-invasive (hook di `rollD20WithMod`) | Bisa di-disable tanpa nyentuh kode game lainnya. |
| Dice-aware narrative queue | `whenDiceIdle()` di dice.js + queue-aware showNarrative/showChoices = animasi dadu nggak fight dengan narasi. Turn-based feel. |
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
- [x] Dice-aware narrative queue (animasi dadu sync dengan narasi)
- [x] **Phase 1 (2026-05-11)**: Migrasi ke ES Modules + struktur folder baru + JSDoc types + tsconfig
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

1. Pilih file scene yang relevan (`scenes/town.js`, `scenes/crypt.js`, dll) atau buat file baru
2. Tambahkan ke object scene yang di-export:
   ```javascript
   // scenes/crypt.js (contoh)
   export const cryptScenes = {
     // ... scene lain
     myNewScene: () => {
       state.lastSafeScene = 'myNewScene';  // jika scene aman
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
   ```
3. Pastikan semua function yang dipakai (`showNarrative`, `combat`, `goToScene`, dll) sudah di-import di top of file
4. Kalau file baru, di `main.js`:
   - Tambah `import { newAreaScenes } from './scenes/newArea.js';`
   - Tambah `...newAreaScenes,` di dalam object `scenes`

### Tambah Monster Baru

Edit `js/data/monsters.js`, tambah ke `MONSTERS`:
```javascript
namaMonster: {
  name: 'Display Name',
  intro: 'Deskripsi muncul saat combat dimulai...',
  maxHp: 12, ac: 13, toHit: 3, dmg: [1, 8], xp: 80, gold: 15
}
```

Type-checker akan otomatis verify struktur sesuai `MonsterTemplate`.

### Tambah Ability Baru

Edit `js/data/abilities.js`, tambah ke `ABILITIES`:
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
Lalu masukkan ID-nya ke array `abilities` di class yang relevan (`js/data/classes.js`).

### Tambah Class Baru

1. Tambah definisi di `CLASSES` (`js/data/classes.js`)
2. Bikin 3 ability baru di `ABILITIES` (`js/data/abilities.js`)
3. Tambah `ClassId` di `js/engine/types.js`:
   ```javascript
   /** @typedef {'warrior' | 'mage' | 'rogue' | 'newClass'} ClassId */
   ```
4. Tambah CSS class di `style.css`:
   - `body.class-namabaru .resource-fill { background: ... }`
   - `.class-card.class-namabaru .resource-tag { color: ... }`

### Tambah Dungeon Baru

1. Buat file `js/scenes/namaDungeon.js`
2. Export object scenes dengan prefix konsisten (misal semua scene `grove*` di `groveScenes`)
3. Daftarkan di `js/main.js`:
   ```javascript
   import { groveScenes } from './scenes/grove.js';
   // ...
   const scenes = { ...townScenes, ...cryptScenes, ...forgeScenes, ...groveScenes };
   ```
4. Tambahkan entry di world map (`scenes/town.js` → `worldMap`)
5. Tambahkan flag `flags.namaDungeonCleared`

---

## 🐛 Known Issues / TODO

- [ ] Resource regen saat di town: setelah combat selesai, current resource pulih separuh, tapi saat masuk scene baru di luar combat tidak ada regen passive. Masih oke untuk sekarang karena ada inn.
- [ ] Beberapa skill check di luar combat tidak punya konsekuensi DEX/INT/STR yang seimbang antar class — Mage selalu buruk di STR check, etc. Mungkin perlu alternative paths per scene.
- [ ] Animasi dadu di mobile mungkin masih agak menutupi tombol di layar sangat kecil (<360px).
- [ ] **ES Modules butuh server** — double-click `index.html` tidak akan jalan. Onboarding kontributor baru harus diingatkan untuk pakai `python3 -m http.server` atau live-server.

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
| Scene/dungeon baru | `js/engine/combat.js`, `js/data/monsters.js`, `js/scenes/*.js` (sebagai contoh), `js/main.js`, `DEV_NOTES.md` |
| Combat/ability system | `js/engine/combat.js`, `js/data/abilities.js`, `js/data/classes.js`, `DEV_NOTES.md` |
| UI/visual/CSS | `index.html`, `style.css`, `js/engine/ui.js`, `js/engine/dice.js`, `DEV_NOTES.md` |
| Class baru | `js/data/classes.js`, `js/data/abilities.js`, `js/engine/types.js`, `style.css`, `DEV_NOTES.md` |
| System (save/load, dll) | `js/engine/state.js`, `js/main.js`, `DEV_NOTES.md` |
| Type definitions | `js/engine/types.js`, `tsconfig.json` |

---

## 🤝 Pair Programming Notes

Saat berdiskusi dengan AI assistant atau dev lain:
- **Tunjukkan struktur dulu** sebelum implementasi (urutan: `apa yang akan diubah` → `kenapa` → `kode`)
- **Test path harus eksplisit** — minta untuk testing manual karena tidak ada unit test
- **Hindari refactor besar** sambil add fitur baru — pisahkan PR/commit
- **Update file ini** setiap kali ambil keputusan arsitektural

---

<p align="center"><em>"Maintain the dungeon, and the dungeon maintains you."</em></p>
