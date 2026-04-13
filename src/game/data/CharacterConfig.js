export const Characters = {
  ranger: {
    name: "咕咕嘎嘎",
    description: "擅长远程攻击，使用追踪箭雨打击敌人",
    maxHp: 100,
    attack: 10,
    moveSpeed: 220,
    attackSpeed: 500,
    critChance: 0.05,
    critDamageMult: 1.5,
    startingWeapons: ["trackingVolley"],
    startingSkills: ["attack"],
    imagePath: "public/characters/gugugaga.png"
  },

  melee: {
    name: "近战战士",
    description: "近距离作战专家，使用弧光斩对周围敌人造成伤害",
    maxHp: 150,
    attack: 15,
    moveSpeed: 180,
    attackSpeed: 350,
    critChance: 0.08,
    critDamageMult: 1.55,
    startingWeapons: ["arc"],
    startingSkills: ["aoeRadius"],
    imagePath: "public/characters/melee.png"
  },

  priest: {
    name: "牧师",
    description: "拥有治疗能力，使用惩戒射线远距离攻击敌人",
    maxHp: 110,
    attack: 9,
    moveSpeed: 200,
    attackSpeed: 500,
    critChance: 0.05,
    critDamageMult: 1.5,
    startingWeapons: ["laser"],
    startingSkills: ["vitality"],
    imagePath: "public/characters/priest.png"
  },

  mage: {
    name: "法师",
    description: "掌握奥术力量，在地面召唤法阵持续伤害敌人",
    maxHp: 90,
    attack: 11,
    moveSpeed: 210,
    attackSpeed: 500,
    critChance: 0.06,
    critDamageMult: 1.52,
    startingWeapons: ["groundZones"],
    startingSkills: ["skillTempo"],
    imagePath: "public/characters/mage.png"       
  },

  shieldbearer: {
    name: "盾卫",
    description: "拥有强大的防御能力，使用圣盾庇护保护自己",
    maxHp: 180,
    attack: 12,
    moveSpeed: 170,
    attackSpeed: 400,
    critChance: 0.05,
    critDamageMult: 1.45,
    startingWeapons: ["shieldWeapon"],
    startingSkills: ["defense"],
    imagePath: "public/characters/shieldbearer.png"    
  },

  yyxr: {
    name: "耀阳行者",
    description: "掌握太阳之力，使用耀阳爆裂对敌人造成巨大伤害",
    maxHp: 100,
    attack: 11,
    moveSpeed: 2000,
    attackSpeed: 480,
    critChance: 0.06,
    critDamageMult: 1.52,
    startingWeapons: ["solarBurst"],
    startingSkills: ["skillTempo"],
    imagePath: "public/characters/yyxr.png"
  },

  butterfly: {
    name: "巴特福来",
    description: "轻盈敏捷，煽动翅膀对两侧敌人造成伤害和击退",
    maxHp: 120,
    attack: 10,
    moveSpeed: 230,
    attackSpeed: 450,
    critChance: 0.07,
    critDamageMult: 1.5,
    startingWeapons: ["butterflyWing"],
    startingSkills: ["attack"],
    imagePath: "public/characters/butterfly.png"
  }
}
