// @ts-check
/* ============================================================
   TYPES.JS — JSDoc Type Definitions
   ============================================================
   File ini tidak punya kode runtime — cuma definisi tipe
   yang dipakai oleh JSDoc + TypeScript checker di VSCode.

   Cara pakai di file lain:
     /** @typedef {import('./types.js').Player} Player *\/
     /** @param {Player} p *\/
     function doSomething(p) { ... }
   ============================================================ */

/**
 * @typedef {'STR' | 'DEX' | 'INT' | 'CON'} StatName
 */

/**
 * @typedef {Object} StatBlock
 * @property {number} STR
 * @property {number} DEX
 * @property {number} INT
 * @property {number} CON
 */

/**
 * @typedef {Object} Weapon
 * @property {string} name
 * @property {[number, number]} dmg     - [base, dieSize], e.g. [1, 8] = 1d8
 * @property {StatName} stat            - stat yang dipakai untuk attack roll
 */

/**
 * @typedef {Object} Resource
 * @property {string} name              - "Stamina", "Mana", "Focus"
 * @property {number} max
 * @property {number} current
 * @property {number} regen             - berapa per turn
 */

/**
 * @typedef {Object} StatusEffects
 * @property {number} [poisoned]
 * @property {number} [burning]
 * @property {number} [frosted]
 * @property {number} [blinded]
 * @property {number} [stunned]
 * @property {number} [shielded]
 */

/**
 * @typedef {'warrior' | 'mage' | 'rogue'} ClassId
 */

/**
 * @typedef {Object} Player
 * @property {ClassId} class
 * @property {string} className
 * @property {number} level
 * @property {number} xp
 * @property {number} gold
 * @property {number} hp
 * @property {number} maxHp
 * @property {StatBlock} stats
 * @property {Weapon} weapon
 * @property {Resource} resource
 * @property {string[]} abilities       - array of ability IDs
 * @property {StatusEffects} statusEffects
 * @property {boolean} [pendingAdvantage] - one-shot advantage flag untuk serangan berikutnya (canon D&D)
 */

/**
 * @typedef {Object} Monster
 * @property {string} name
 * @property {string} intro
 * @property {number} hp                - current HP
 * @property {number} maxHp
 * @property {number} ac                - armor class
 * @property {number} toHit             - bonus serangan
 * @property {[number, number]} dmg     - [base, dieSize]
 * @property {number} xp
 * @property {number} [gold]
 * @property {StatusEffects} statusEffects
 */

/**
 * @typedef {Object} ClassDefinition
 * @property {string} name
 * @property {string} icon
 * @property {string} desc
 * @property {number} hp
 * @property {StatBlock} stats
 * @property {Omit<Weapon, never>} weapon
 * @property {{name: string, max: number, regen: number}} resource
 * @property {string[]} abilities
 */

/**
 * @typedef {Object} Ability
 * @property {string} name
 * @property {number} cost
 * @property {string} desc
 * @property {boolean} [once]           - true = hanya bisa dipakai 1x per combat
 * @property {(p: Player, m: Monster) => string} use
 */

/**
 * @typedef {Object} DiceRollResult
 * @property {number} d                 - hasil dadu mentah (1-20), atau 0 kalau auto-resolved
 * @property {number} total             - d + modifier
 * @property {boolean} success
 * @property {boolean} isCrit           - natural 20
 * @property {boolean} isFumble         - natural 1
 * @property {boolean} auto             - true kalau auto-resolved tanpa actual roll
 */

/**
 * @typedef {Object} Choice
 * @property {string} text
 * @property {() => void} action
 * @property {string} [hint]
 * @property {string} [desc]
 * @property {number} [cost]
 * @property {boolean} [disabled]
 */

/**
 * @typedef {Object} GameState
 * @property {Player | null} player
 * @property {string} currentScene
 * @property {Object<string, any>} flags
 * @property {string[]} rollLog
 * @property {string | null} lastSafeScene
 */

// File ini sengaja tidak export apa-apa (cuma type definition).
// Tapi karena file harus jadi module yang valid, kita export object kosong.
export {};
