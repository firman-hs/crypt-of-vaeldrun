/* ============================================================
   DICE.JS — Animated d20 Component
   ============================================================
   Menampilkan dadu d20 SVG yang berputar lalu berhenti di angka.
   Dipanggil otomatis dari rollD20WithMod() di core.js.

   API tambahan:
     - isDiceBusy()              → boolean, true selama rolling/settling
     - whenDiceIdle(callback)    → jalankan callback saat dadu idle
                                   (atau langsung kalau memang sudah idle)
   ============================================================ */

// SVG path untuk d20 (icosahedron flat representation)
// Bentuk: heksagon dengan triangulasi internal
const D20_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="diceFace" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="var(--dice-light, #2a2018)"/>
      <stop offset="100%" stop-color="var(--dice-dark, #0a0807)"/>
    </linearGradient>
    <filter id="diceGlow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Outer hexagon shape (d20 silhouette) -->
  <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" 
           fill="url(#diceFace)" 
           stroke="var(--dice-edge, #c9a961)" 
           stroke-width="1.5"
           filter="url(#diceGlow)"/>
  
  <!-- Internal triangulation lines (faceted look) -->
  <g stroke="var(--dice-edge, #c9a961)" stroke-width="0.6" opacity="0.5" fill="none">
    <line x1="50" y1="5" x2="50" y2="50"/>
    <line x1="50" y1="50" x2="90" y2="27"/>
    <line x1="50" y1="50" x2="90" y2="73"/>
    <line x1="50" y1="50" x2="50" y2="95"/>
    <line x1="50" y1="50" x2="10" y2="73"/>
    <line x1="50" y1="50" x2="10" y2="27"/>
  </g>
  
  <!-- Center triangle (top face) untuk angka -->
  <polygon points="30,30 70,30 50,65" 
           fill="rgba(0,0,0,0.4)" 
           stroke="var(--dice-edge, #c9a961)" 
           stroke-width="0.8"/>
  
  <!-- Number display -->
  <text x="50" y="50" 
        text-anchor="middle" 
        dominant-baseline="middle"
        font-family="'JetBrains Mono', monospace"
        font-size="22"
        font-weight="700"
        fill="var(--dice-number, #c9a961)"
        class="dice-number">--</text>
</svg>
`;

let diceContainer = null;
let dismissTimer = null;
let settleTimer = null;       // timer untuk transisi rolling → settled
let releaseTimer = null;      // timer untuk delay 0.4s setelah settled sebelum release queue

// ─── DICE STATE TRACKING ─────────────────────────────────────
// Dadu "busy" sejak mulai rolling sampai SETTLED + delay 0.4s.
// Selama busy, callback narrative ditahan di idleCallbacks.
let diceBusy = false;
const idleCallbacks = [];

// Berapa lama (ms) menunggu setelah dadu settled sebelum
// release narrative queue. Memberi user waktu baca angka.
const POST_SETTLE_DELAY = 400;
const ROLL_DURATION = 1000;        // durasi rolling animation
const VISIBLE_AFTER_SETTLE = 2500; // dadu tetap kelihatan setelah settled


function isDiceBusy() {
  return diceBusy;
}

function whenDiceIdle(callback) {
  if (!diceBusy) {
    callback();
  } else {
    idleCallbacks.push(callback);
  }
}

function releaseIdleCallbacks() {
  diceBusy = false;
  // Salin & kosongkan dulu, baru jalankan — agar kalau callback
  // memicu roll baru, queue baru tidak tercampur dengan yang lama.
  const pending = idleCallbacks.splice(0);
  pending.forEach(cb => {
    try { cb(); } catch (e) { console.error('Dice idle callback error:', e); }
  });
}


function ensureDiceContainer() {
  if (diceContainer) return diceContainer;
  
  diceContainer = document.createElement('div');
  diceContainer.id = 'diceContainer';
  diceContainer.className = 'dice-container';
  diceContainer.innerHTML = D20_SVG;
  document.body.appendChild(diceContainer);
  
  return diceContainer;
}

function animateDiceRoll(result, isCrit, isFumble) {
  const container = ensureDiceContainer();
  const numberEl = container.querySelector('.dice-number');
  
  // Clear timer dari roll sebelumnya
  if (dismissTimer) clearTimeout(dismissTimer);
  if (settleTimer) clearTimeout(settleTimer);
  if (releaseTimer) clearTimeout(releaseTimer);
  
  // Mark busy: callback narrative berikutnya akan menunggu
  diceBusy = true;
  
  // Reset state
  container.classList.remove('crit', 'fumble', 'visible', 'settled');
  numberEl.textContent = '--';
  
  // Force reflow agar reset terdeteksi
  void container.offsetWidth;
  
  // Mulai animasi: muncul + berputar
  container.classList.add('visible', 'rolling');
  
  // Tampilkan angka berubah-ubah selama rolling (cosmetic)
  let tickerCount = 0;
  const ticker = setInterval(() => {
    if (tickerCount < 8) {
      numberEl.textContent = Math.floor(Math.random() * 20) + 1;
      tickerCount++;
    }
  }, 100);
  
  // Setelah 1 detik: hentikan ticker, tampilkan hasil final
  settleTimer = setTimeout(() => {
    clearInterval(ticker);
    container.classList.remove('rolling');
    container.classList.add('settled');
    numberEl.textContent = result;
    
    // Tambahkan kelas khusus untuk crit/fumble
    if (isCrit) container.classList.add('crit');
    if (isFumble) container.classList.add('fumble');
    
    // Setelah delay singkat (POST_SETTLE_DELAY), release narrative queue.
    // Dadu tetap kelihatan, tapi narrative sudah boleh muncul.
    releaseTimer = setTimeout(() => {
      releaseIdleCallbacks();
    }, POST_SETTLE_DELAY);
    
    // Auto-dismiss visual dadu setelah lebih lama (2.5 detik)
    dismissTimer = setTimeout(() => {
      container.classList.remove('visible');
    }, VISIBLE_AFTER_SETTLE);
  }, ROLL_DURATION);
}

// Allow user to dismiss dice manually with click.
// Klik dadu = skip waiting: release queue langsung + sembunyikan dadu.
document.addEventListener('click', (e) => {
  if (diceContainer && diceContainer.classList.contains('visible') && diceContainer.contains(e.target)) {
    if (dismissTimer) clearTimeout(dismissTimer);
    if (settleTimer) clearTimeout(settleTimer);
    if (releaseTimer) clearTimeout(releaseTimer);
    diceContainer.classList.remove('visible');
    // Kalau masih ada callback yang menunggu, jalankan sekarang
    if (diceBusy) releaseIdleCallbacks();
  }
});
