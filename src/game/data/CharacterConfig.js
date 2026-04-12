export const Characters = {
  ranger: {
    name: "远程射手",
    maxHp: 100,
    attack: 10,
    moveSpeed: 220,
    attackSpeed: 500,
    critChance: 0.05,
    critDamageMult: 1.5,
    startingWeapons: ["trackingVolley"],
    startingSkills: ["attack"]
  },

  melee: {
    name: "近战战士",
    maxHp: 150,
    attack: 15,
    moveSpeed: 180,
    attackSpeed: 350,
    critChance: 0.08,
    critDamageMult: 1.55,
    startingWeapons: ["arc"],
    startingSkills: ["aoeRadius"]
  },

  priest: {
    name: "牧师",
    maxHp: 110,
    attack: 9,
    moveSpeed: 200,
    attackSpeed: 500,
    critChance: 0.05,
    critDamageMult: 1.5,
    startingWeapons: ["laser"],
    startingSkills: ["vitality"]
  },

  mage: {
    name: "法师",
    maxHp: 90,
    attack: 11,
    moveSpeed: 210,
    attackSpeed: 500,
    critChance: 0.06,
    critDamageMult: 1.52,
    startingWeapons: ["groundZones"],
    startingSkills: ["skillTempo"]
  },

  shieldbearer: {
    name: "盾卫",
    maxHp: 180,
    attack: 12,
    moveSpeed: 170,
    attackSpeed: 400,
    critChance: 0.05,
    critDamageMult: 1.45,
    startingWeapons: ["shieldWeapon"],
    startingSkills: ["defense"]
  },

  yyxr: {
    name: "耀阳行者",
    maxHp: 100,
    attack: 11,
    moveSpeed: 2000,
    attackSpeed: 480,
    critChance: 0.06,
    critDamageMult: 1.52,
    startingWeapons: ["solarBurst"],
    startingSkills: ["skillTempo"]
  }
}
