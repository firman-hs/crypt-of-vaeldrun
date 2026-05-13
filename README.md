# 🪦 The Crypt of Vael'drun

> *Sebuah prototipe text-adventure RPG ala Dungeons & Dragons, dibangun dengan vanilla HTML/CSS/JavaScript.*

Petualangan dark fantasy di mana kau bermain sebagai seorang adventurer yang dipanggil ke desa Aethelford — desa kecil yang dijepit antara dua bencana: sebuah crypt yang dihuni lich kuno, dan sebuah tambang dwarf yang ditelan iblis. Pilih class-mu, masuki dungeon, dan tentukan akhir cerita melalui pilihan dan dadu.

🎮 **[Mainkan sekarang](https://firman-hs.github.io/crypt-of-vaeldrun/)**

---

## ✦ Fitur Utama

- **🎲 Sistem D&D autentik** — Dadu d20 + modifier vs DC, Critical Hits & Fumbles, Skill Checks
- **⚔️ 3 Class playable** — Warrior, Mage, Rogue — masing-masing dengan playstyle berbeda
- **🔮 9 Ability unik** — 3 ability per class dengan resource management (Stamina/Mana/Focus)
- **🌀 Status Effects** — Poison, Burn, Frost, Blind, Stun, Shield, Advantage
- **🗺️ World Map** — Hub town (Aethelford) yang menghubungkan beberapa dungeon
- **🏰 2 Dungeon lengkap** — Crypt of Vael'drun & Forge of Korr-Dun
- **🎭 Multiple endings** — Tiap dungeon punya 3 cara penyelesaian (combat/diplomasi/stealth)
- **🎨 Dark fantasy aesthetic** — Estetika grimoire kuno bertemu terminal lama

---

## 🎯 Cara Bermain

1. Pilih class-mu di awal (Warrior, Mage, atau Rogue)
2. Tiba di Aethelford — gunakan inn untuk istirahat, bicara dengan NPC untuk lore
3. Buka peta wilayah dan pilih dungeon yang mau ditaklukkan
4. Hadapi pilihan: dadu menentukan hasilnya, tapi kau yang memilih risikonya
5. Selesaikan kedua dungeon untuk membuka akhir final

### Tips Class

| Class | Playstyle | Keunggulan |
|-------|-----------|------------|
| ⚔ **Warrior** | Tank/burst | Stun + damage tinggi, healing emergency |
| ✦ **Mage** | Control caster | Spell ignore armor, defensive shield |
| ⚝ **Rogue** | Trickster | Setup advantage, DoT poison, stealth bonus |

---

## 🛠️ Tech Stack

- **HTML5** — struktur
- **CSS3** — styling dengan custom properties (CSS variables)
- **Vanilla JavaScript (ES2022 + ES Modules)** — semua logika game, **tanpa framework, tanpa bundler**
- **JSDoc + TypeScript checker** — type-checking di editor tanpa build step
- **Google Fonts** — UnifrakturCook (display), Cormorant Garamond (body), JetBrains Mono (data)

Tidak ada build step, tidak ada dependency runtime, tidak ada bundler — cukup HTTP server lokal untuk development, deploy langsung ke GitHub Pages.

---

## 📁 Struktur Project

```
crypt-of-vaeldrun/
├── index.html              # entry point — load main.js sebagai ES module
├── style.css               # styling lengkap (dark fantasy theme)
├── tsconfig.json           # config JSDoc type-check (optional, no build)
├── README.md               # file ini
└── js/
    ├── main.js             # entry: scene registry & game initialization
    ├── engine/             # foundation systems
    │   ├── types.js        # JSDoc type definitions
    │   ├── state.js        # global game state
    │   ├── dice.js         # roll math + animasi d20
    │   ├── effects.js      # status effect engine (apply, process, query)
    │   ├── ui.js           # narrative & UI rendering
    │   └── combat.js       # turn-based combat engine
    ├── data/               # definisi statis
    │   ├── classes.js      # 3 class playable
    │   ├── abilities.js    # 9 ability per class
    │   ├── effects.js      # registry status effect
    │   └── monsters.js     # database monster
    └── scenes/             # konten cerita
        ├── start.js        # character creation
        ├── town.js         # Aethelford hub
        ├── crypt.js        # Crypt of Vael'drun
        └── forge.js        # Forge of Korr-Dun
```

Semua file di-load via `<script type="module">` — browser yang resolve dependency lewat `import`/`export`. Tidak perlu urutan loading manual.

---

## 🚀 Menjalankan Lokal

> **⚠️ ES Modules butuh HTTP server.** Double-click `index.html` tidak akan jalan — browser memblokir `import` lewat protokol `file://`.

### Opsi 1: Python (paling cepat, tanpa install)

```bash
python3 -m http.server 8000
```

Buka `http://localhost:8000` di browser.

### Opsi 2: Node.js (auto-reload)

```bash
npx http-server -c-1 .
# atau
npx serve
```

### Opsi 3: VSCode Live Server

Install extension **"Live Server"**, klik kanan `index.html` → **"Open with Live Server"**.

### (Opsional) Type-checking di editor

Project sudah disetup dengan JSDoc + `tsconfig.json`. Buka di VSCode untuk dapat IntelliSense dan deteksi error tipe — tanpa build step. Untuk run check di terminal:

```bash
npx -p typescript tsc --noEmit
```

---

## 🎮 Mekanika Game

### Sistem Dadu

Setiap aksi yang berisiko menggunakan **d20 + modifier vs Difficulty Class (DC)**:

```
Roll d20 (1-20) + stat modifier vs DC
- Hasil ≥ DC: SUCCESS
- Hasil < DC: FAIL
- Natural 20: CRITICAL (selalu sukses, damage ganda)
- Natural 1: FUMBLE (selalu gagal)
```

### Resource Management

Tiap class memiliki resource pool yang regenerate tiap turn:

| Class | Resource | Max | Regen/Turn |
|-------|----------|-----|------------|
| Warrior | Stamina | 6 | +2 |
| Mage | Mana | 8 | +1 |
| Rogue | Focus | 6 | +2 |

Setelah combat selesai, resource pulih separuh otomatis. Istirahat di inn (5 gold) memulihkan HP & resource penuh.

### Level Up

XP threshold per level: `level × 100`. Setiap level naik:
- Max HP +4 (full heal)
- Max Resource +1 (full restore)

---

## 🗺️ Roadmap

Fitur yang direncanakan:

- [ ] 💾 Save/Load progress (localStorage auto-save)
- [ ] 🎓 Subclass system di level 3 (specialization paths)
- [ ] 💬 NPC dialog tree yang lebih dalam dengan branching conversation
- [ ] 🏪 Shop di Aethelford (beli senjata, potion, scroll)
- [ ] 🌲 Dungeon ke-3: The Whispering Grove (hutan terkutuk)
- [ ] 🎵 Sound effects & ambient music
- [ ] 🌍 Localization (English version)

---

## 🤝 Berkontribusi

Project ini adalah prototype eksperimental dan terbuka untuk kontribusi! Jika kamu ingin:

- **Lapor bug**: buka issue di GitHub
- **Saran fitur**: buka issue dengan label `enhancement`
- **Submit code**: fork, buat branch, commit, lalu buka pull request

### Cara Menambah Scene Baru

1. Tambahkan scene di file relevan (`js/scenes/town.js`, `js/scenes/crypt.js`, dll) sebagai property pada object yang di-export:
   ```javascript
   // js/scenes/crypt.js
   export const cryptScenes = {
     // ... scene lain
     namaScene: () => {
       showNarrative(`<p>Deskripsi...</p>`);
       showChoices([
         { text: 'Pilihan A', action: () => goToScene('sceneLain') }
       ]);
     }
   };
   ```
2. Pastikan semua function yang dipakai sudah di-import di top of file
3. Sambungkan via `goToScene('namaScene')` dari scene lain

### Cara Menambah Monster Baru

Edit `js/data/monsters.js`:
```javascript
namaMonster: {
  name: 'Display Name',
  intro: 'Deskripsi saat muncul...',
  maxHp: 10, ac: 12, toHit: 2, dmg: [1, 6], xp: 50, gold: 10
}
```
Lalu panggil dari scene: `combat('namaMonster', () => onWinCallback())`

### Cara Menambah Ability Baru

Edit `js/data/abilities.js`, tambahkan di `ABILITIES`:
```javascript
namaAbility: {
  name: 'Display Name',
  cost: 3,                    // resource cost
  desc: 'Deskripsi...',
  once: false,                // true jika hanya 1x per combat
  use: (p, m) => {
    // p = player, m = monster
    // Modifikasi p.hp, m.hp, atau status effects
    return `<p>Log narasi...</p>`;
  }
}
```
Lalu masukkan ID-nya ke array `abilities` di class yang relevan (`js/data/classes.js`).

---

## 📜 Lisensi

Project ini bersifat open source. Bebas digunakan, dimodifikasi, dan didistribusikan untuk tujuan pembelajaran dan eksperimen.

---

## 🙏 Credits

- **Game design & development**: dibuat sebagai prototype belajar JavaScript & game design
- **Inspirasi**: Dungeons & Dragons 5e, Choice of Games, Sunless Sea, Disco Elysium
- **Fonts**: Google Fonts (UnifrakturCook, Cormorant Garamond, JetBrains Mono)

---

<p align="center">
✦ <em>ditempa di kegelapan, untuk para penjelajah pemberani</em> ✦
</p>
