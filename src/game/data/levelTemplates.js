/**
 * 关卡模板：后续可接不同地图图、怪物表、Boss 配置（外形/弹幕用 gif 图集替换即可）
 */
export const LevelTemplates = [
  {
    id: "default",
    name: "荒野试炼",
    mapTextureKey: "bg_map",
    worldW: 2000,
    worldH: 2000,
    playMargin: 80,
    enemyScale: 1,
    bossIntervalSec: 60,
    notes: "默认波次与现有 SpawnSystem 一致"
  },
  {
    id: "arena",
    name: "竞技场",
    mapTextureKey: "bg_map",
    worldW: 1600,
    worldH: 1600,
    playMargin: 60,
    enemyScale: 1.15,
    bossIntervalSec: 45,
    notes: "示例：更小地图、更快 Boss"
  }
]

export function getLevelById(id) {
  return LevelTemplates.find(l => l.id === id) || LevelTemplates[0]
}
