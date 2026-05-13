# 📓 Development Notes

> *Internal documentation untuk menjaga konsistensi project saat dikembangkan lintas sesi atau kontributor.*

**Project**: The Crypt of Vael'drun
**Tipe**: Text-adventure RPG, browser-based, vanilla JS

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
    │   ├── effects.js      # status effect engine (apply, process DoT, modifier)
    │   ├── ui.js           # showNarrative, showChoices, updateStatusPanel
    │   └── combat.js       # turn-based combat engine
    ├── data/               # definisi statis (jarang diubah)
    │   ├── classes.js      # 3 class definition
    │   ├── abilities.js    # 9 ability per class
    │   ├── effects.js      # registry status effect (poison, frost, dll)
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

Satu object `state` di `engine/state.js` menyimpan semuanya:

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

### Dependency Injection (combat ↔ main)

`combat.js` butuh `goToScene` & `init` (untuk handle flee & death), tapi keduanya di `main.js` yang mengimport `combat.js` lewat scenes. Untuk hindari circular import yang fragile:

- `combat.js` export `setNavigation(goToSceneFn, initFn)`.
- `main.js` panggil `setNavigation(goToScene, init)` saat boot.
- Combat menyimpan reference ini di module-scope variable.

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

---

## ⚙️ Mekanik Inti

### Dice System
- `roll(sides)` → 1 dadu (math utility)
- `check(mod, dc, label, narrationPrefix, options)` → canonical D&D d20 check
  - Auto-resolve kalau outcome sudah pasti (min/max roll vs DC)
  - Tampilkan threshold ("butuh ≥N") sebelum dadu jatuh — transparansi ala tabletop
  - Support `options.advantage` / `options.disadvantage` (roll 2d20)
  - Trigger animasi dadu sebagai side-effect (fire-and-forget)
- `whenDiceIdle(callback)` → sync API: jalankan callback sekarang kalau dadu idle, atau queue sampai animasi selesai. Dipakai `ui.js` agar narrative & choices tidak fight dengan animasi dadu.

### Combat
- Entry: `combat('monsterId', onWinCallback)` atau `combat({...customMonster}, callback)`
- Tiap turn: process player DoT → aksi player → process monster DoT → aksi monster → decrement buffs → regen resource
- Setelah menang: heal separuh resource, reset status effects
- Player phase & monster phase keduanya sync. Monster phase digate lewat `whenDiceIdle(doMonsterPhase)` agar tunggu animasi dadu player selesai dulu.

### Status Effects
Registry pattern: `data/effects.js` = deklarasi, `engine/effects.js` = engine generic yang baca registry. Tambah effect baru = 1 entry di `data/effects.js`, tidak perlu edit engine atau combat.

**Effect aktif saat ini:**
- DoT: `poisoned` (1d4/turn, stack intensity), `burning` (1d6/turn, stack intensity)
- Modifier debuff musuh: `frosted` (-2 to-hit, stack duration), `blinded` (-4 to-hit, stack refresh), `stunned` (skip turn, stack refresh)
- Modifier buff player: `shielded` (reduce dmg 1d8, stack refresh)

**Stacking mode** (didefinisikan per-effect di registry):
- `intensity`: stacks++, turns = max(old, new). Damage/efek × stacks.
- `duration`: turns += new. Stacks tetap 1.
- `refresh`: turns = new. Tidak stack — cocok untuk binary on/off effect.

**Public API** dari `engine/effects.js`:
- `applyEffect(entity, id, duration)` — apply ke entity, handle stacking otomatis
- `processDoT(entity, displayName)` — proses semua DoT di awal turn, return HTML log
- `tickModifiers(entity)` — dekrement durasi modifier di akhir turn
- `getModifier(entity, key)` — baca akumulasi modifier (`toHit`, `damageReduction`, `skipTurn`)
- `getStatusString(entity)` — format display untuk status panel

Note: `advantage` BUKAN status effect. Itu modifier roll one-shot — pakai `player.pendingAdvantage` (flag boolean) untuk efek delayed seperti Smoke Bomb.

### XP Curve
Threshold: `level × 100`. Per level up: +4 max HP, +1 max resource, full restore.

---

## ✅ Decisions (Why kita bikin gini)

| Decision | Alasan |
|----------|--------|
| Inventory di-skip | Belum ada use case yang berarti, jadi cuma ngumpul item flavor. Revisit saat ada loot system real. |
| Resource per class beda nama (Stamina/Mana/Focus) | Flavor — tiap class terasa unik, padahal mekaniknya sama. |
| 3 ability per class (bukan 5+) | Cukup untuk variety, tidak overwhelming UI di text-based. |
| ES Modules (bukan global namespace) | Imports eksplisit di tiap file = pembaca tahu dari mana semua dependency datang. |
| `engine/`, `data/`, `scenes/` folder split | Foundation systems (engine) dipisah dari konten (data + scenes). Engine jarang berubah, scenes terus tumbuh. |
| `abilities.js` dipisah dari `classes.js` | Class jarang ditambah (3 → mungkin 6 total), abilities terus tumbuh (9 → 30+). Beda growth pattern = beda file. |
| JSDoc + tsconfig.json (no build step) | Type-checking penuh di VSCode tanpa compile step. Tetap pure vanilla JS, deploy ke GitHub Pages tanpa transformasi. |
| `setNavigation()` dependency injection di combat | Combat butuh akses `goToScene`/`init` dari main.js, tapi main.js juga import combat lewat scenes. Inject lewat setter = no circular import yang fragile. |
| Town sebagai hub (bukan linear) | Memberi sense of "world" + persiapan save/load + tempat heal. |
| Dice-aware narrative queue | `whenDiceIdle()` di dice.js + queue-aware showNarrative/showChoices = animasi dadu nggak fight dengan narasi. Turn-based feel. |
| Player & monster phase dipisah via `whenDiceIdle` | Animasi dadu menyatu dengan narasi: threshold muncul → dadu animasi → hasil → monster phase mulai setelah dadu settled. Memberi rhythm turn-based yang jelas. |
| Status effect registry (`data/effects.js`) + engine generic (`engine/effects.js`) | Tambah effect baru = 1 entry di registry, tidak edit engine/combat. Per-effect stacking strategy (`intensity`/`duration`/`refresh`) memungkinkan tiap effect punya behavior sesuai semantiknya — stun gak bisa stack, poison damage stack, frost duration extend. Pattern sama dengan `monsters.js` dan `abilities.js`. |

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
    // Modifikasi p.hp / m.hp langsung.
    // Untuk status effects, JANGAN mutasi langsung — pakai applyEffect():
    //   applyEffect(m, 'poisoned', 3);    ✓
    //   m.statusEffects.poisoned = 3;     ✗ (bypass stacking logic)
    return `<p>Log narasi...</p>`;
  }
}
```
Lalu masukkan ID-nya ke array `abilities` di class yang relevan (`js/data/classes.js`).

### Tambah Status Effect Baru

Edit `js/data/effects.js`, tambah ke `STATUS_EFFECTS`. Pilih `type` ('dot' atau 'modifier') dan `stack` mode ('intensity', 'duration', atau 'refresh').

**DoT (damage tiap turn):**
```javascript
bleeding: {
  name: 'Bleed',          // display name di status panel
  type: 'dot',
  stack: 'intensity',     // damage × stacks
  damage: () => roll(6),
  narrative: (target, dmg, stacks) =>
    `${target} berdarah: ${dmg} damage${stacks > 1 ? ` (×${stacks})` : ''}.`
}
```

**Modifier (debuff/buff aktif selama X turn):**
```javascript
weakened: {
  name: 'Weak',
  type: 'modifier',
  stack: 'duration',      // re-apply = extend turn
  modifier: { toHit: -3 } // bisa juga damageReduction: () => roll(6) atau skipTurn: true
}
```

Sesudah didefinisikan, langsung bisa dipakai dari ability: `applyEffect(m, 'bleeding', 4)`. Engine otomatis handle stacking, decrement, dan akumulasi modifier — tidak perlu edit `combat.js` atau `engine/effects.js`.

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

## 💡 Tips Pengembangan Lintas Sesi

Kalau kamu mulai chat baru dengan AI assistant atau dev lain, upload file ini + relevant code files agar dapat context lengkap.

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

**Saat berdiskusi dengan AI assistant atau dev lain:**
- **Tunjukkan struktur dulu** sebelum implementasi (urutan: `apa yang akan diubah` → `kenapa` → `kode`)
- **Test path harus eksplisit** — minta untuk testing manual karena tidak ada unit test
- **Hindari refactor besar** sambil add fitur baru — pisahkan PR/commit
- **Update file ini** setiap kali ambil keputusan arsitektural baru

---

<p align="center"><em>"Maintain the dungeon, and the dungeon maintains you."</em></p>
