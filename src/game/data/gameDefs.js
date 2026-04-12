/** 武器 UI 共 8 格，实际显示顺序由 SkillSystem.weaponSlotOrder 按获得顺序填充 */
export const WEAPON_UI_SLOT_COUNT = 8

/** 技能 UI 共 8 格，由 skillSlotOrder 填充 */
export const SKILL_UI_SLOT_COUNT = 8

export const SKILL_SLOT_KEYS = [
  "vitality",
  "defense",
  "attack",
  "crit",
  "projectileCount",
  "aoeRadius",
  "skillTempo",
  "magnet"
]

export const WEAPON_META = {
  arc: {
    name: "弧光斩",
    desc: "朝移动方向扇形近战（有间隔即挥砍）",
    maxLevel: 8
  },
  trackingVolley: {
    name: "追踪齐射",
    desc: "3s 内连射穿透弹，1s 冷却",
    maxLevel: 8
  },
  laser: {
    name: "惩戒射线",
    desc: "直线持续伤害（不受弹数/范围强化）",
    maxLevel: 8
  },
  groundZones: {
    name: "奥术法阵",
    desc: "地面圆形区域持续伤敌",
    maxLevel: 8
  },
  shieldWeapon: {
    name: "圣盾庇护",
    desc: "护盾与额外防御，升级刷新盾量",
    maxLevel: 8
  },
  solarBurst: {
    name: "耀阳爆裂",
    desc: "中心爆炸+粒子散射，粒子附带持续灼烧",
    maxLevel: 8
  },
  blizzard: {
    name: "暴风雪",
    desc: "圆形降雪范围：伤害并冻结敌人",
    maxLevel: 8
  },
  hurricane: {
    name: "飓风",
    desc: "指定区域旋风持续旋转并伤害",
    maxLevel: 8
  },
  courageSong: {
    name: "勇气之歌",
    desc: "矩形弹幕，命中减速",
    maxLevel: 8
  },
  pixie: {
    name: "小精灵",
    desc: "召唤物喷射弹幕（等级越高同时弹数越多）",
    maxLevel: 8
  },
  blackHole: {
    name: "黑洞",
    desc: "牵引范围内敌人向中心并造成伤害",
    maxLevel: 8
  }
}

export const SKILL_META = {
  vitality: { name: "生命", desc: "提高生命上限", maxLevel: 10 },
  defense: { name: "护甲", desc: "减少受到的伤害", maxLevel: 8 },
  attack: { name: "攻击", desc: "提高基础伤害", maxLevel: 10 },
  crit: { name: "双爆", desc: "同时提高暴击率与暴伤", maxLevel: 6 },
  projectileCount: { name: "齐射弹数", desc: "追踪齐射每次多 1 发子弹", maxLevel: 5 },
  aoeRadius: { name: "释放范围", desc: "范围类效果更大", maxLevel: 8 },
  skillTempo: { name: "持久/冷却", desc: "持续更久、冷却更短", maxLevel: 8 },
  magnet: { name: "磁铁", desc: "扩大拾取范围", maxLevel: 8 }
}
