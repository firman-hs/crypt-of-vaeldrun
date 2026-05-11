// @ts-check
/* ============================================================
   CLASSES.JS — Class Definitions
   ============================================================
   3 class playable: Warrior, Mage, Rogue.
   Tiap class punya stats, weapon, resource, dan list ability ID
   (yang aktualnya didefinisikan di data/abilities.js).

   Tambah class baru:
     1. Tambah entry di CLASSES
     2. Tambah 3 ability di data/abilities.js
     3. Tambah CSS body.class-X dan .class-card.class-X di style.css
   ============================================================ */

/** @typedef {import('../engine/types.js').ClassDefinition} ClassDefinition */
/** @typedef {import('../engine/types.js').ClassId} ClassId */
/** @typedef {Record<ClassId, ClassDefinition>} ClassRegistry */

/** @type {ClassRegistry} */
export const CLASSES = {
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
