import { WEAPON_META, SKILL_META, WEAPON_UI_SLOT_COUNT, SKILL_UI_SLOT_COUNT } from "../data/gameDefs"

export default class SkillSystem {
  constructor(player) {
    this.player = player
    this.weapons = {}
    this.skills = {}

    /** @type {string[]} 武器在 UI 上从左到右的填充顺序（仅含已解锁过的 key） */
    this.weaponSlotOrder = []
    /** @type {string[]} 技能栏填充顺序 */
    this.skillSlotOrder = []

    for (const key of Object.keys(WEAPON_META)) {
      this.weapons[key] = { ...WEAPON_META[key], level: 0 }
    }
    for (const key of Object.keys(SKILL_META)) {
      this.skills[key] = { ...SKILL_META[key], level: 0 }
    }
  }

  registerWeaponSlot(key) {
    if (this.weaponSlotOrder.includes(key)) return
    if (this.weaponSlotOrder.length >= WEAPON_UI_SLOT_COUNT) return
    this.weaponSlotOrder.push(key)
  }

  registerSkillSlot(key) {
    if (this.skillSlotOrder.includes(key)) return
    if (this.skillSlotOrder.length >= SKILL_UI_SLOT_COUNT) return
    this.skillSlotOrder.push(key)
  }

  initFromCharacter(config) {
    const p = this.player

    this.weaponSlotOrder = []
    this.skillSlotOrder = []

    for (const key of Object.keys(this.weapons)) {
      this.weapons[key].level = 0
    }
    for (const key of Object.keys(this.skills)) {
      this.skills[key].level = 0
    }

    for (const id of config.startingWeapons || []) {
      if (this.weapons[id]) {
        this.weapons[id].level = 1
        this.registerWeaponSlot(id)
        this.applyWeaponLevel(id, 1)
      }
    }
    for (const id of config.startingSkills || []) {
      if (this.skills[id]) {
        this.skills[id].level = 1
        this.registerSkillSlot(id)
        this.applySkillLevel(id, 1)
      }
    }

    p.syncWeaponDerivedStats?.()
    p.restartWeaponTimers?.()
  }

  getWeaponLevel(key) {
    return this.weapons[key]?.level ?? 0
  }

  getLevel(key) {
    return this.skills[key]?.level || 0
  }

  upgradeWeapon(key) {
    const w = this.weapons[key]
    if (!w || w.level >= w.maxLevel) return false
    const wasNew = w.level === 0
    w.level++
    if (wasNew) this.registerWeaponSlot(key)
    this.applyWeaponLevel(key, 1)
    this.player.syncWeaponDerivedStats?.()
    this.player.restartWeaponTimers?.()
    if (key === "shieldWeapon") this.player.refreshShieldFromWeapon?.()
    return true
  }

  upgradeSkill(key) {
    const s = this.skills[key]
    if (!s || s.level >= s.maxLevel) return false
    const wasNew = s.level === 0
    s.level++
    if (wasNew) this.registerSkillSlot(key)
    this.applySkillLevel(key, 1)
    this.player.syncWeaponDerivedStats?.()
    if (key === "skillTempo" || key === "aoeRadius") {
      this.player.restartWeaponTimers?.()
    }
    return true
  }

  upgrade(key, kind) {
    if (kind === "weapon") return this.upgradeWeapon(key)
    if (kind === "skill") return this.upgradeSkill(key)
    return false
  }

  applyWeaponLevel(key, deltaLevels) {
    const p = this.player
    for (let i = 0; i < deltaLevels; i++) {
      switch (key) {
        case "arc":
          p.meleeRange += 6
          break
        case "trackingVolley":
          p.volleyDamageBonus += 1
          break
        case "laser":
          p.laserDamageBonus += 2
          break
        case "groundZones":
          p.zoneDamageBonus += 1
          p.zoneRadiusBonus += 4
          break
        case "shieldWeapon":
          p.shieldMaxBase += 25
          p.shieldDefensePerLevel += 1
          break
        case "solarBurst":
          p.solarExplosionBonus += 4
          p.solarParticleBonus += 0.35
          p.solarDotBonus += 0.4
          break
        case "blizzard":
          p.blizzardRadiusBonus += 8
          p.blizzardDamageBonus += 1
          break
        case "hurricane":
          p.hurricaneRadiusBonus += 6
          p.hurricaneDamageBonus += 1
          break
        case "courageSong":
          p.courageWidthBonus += 6
          p.courageDamageBonus += 1
          break
        case "pixie":
          p.pixieDamageBonus += 1
          break
        case "blackHole":
          p.blackHoleRadiusBonus += 10
          p.blackHolePullBonus += 0.15
          break
        default:
          break
      }
    }
  }

  applySkillLevel(key, deltaLevels) {
    const p = this.player
    for (let i = 0; i < deltaLevels; i++) {
      switch (key) {
        case "vitality":
          p.maxHp += 15
          p.hp += 15
          break
        case "defense":
          p.defense += 1
          break
        case "attack":
          p.attack += 2
          break
        case "crit":
          p.critChance = Math.min(0.72, p.critChance + 0.028)
          p.critDamageMult += 0.1
          break
        case "aoeRadius":
          p.bulletSize += 2
          p.meleeRange += 5
          p.zoneRadiusBonus += 3
          p.blizzardRadiusBonus += 5
          p.hurricaneRadiusBonus += 5
          p.blackHoleRadiusBonus += 6
          break
        case "skillTempo":
          p.durationMult += 0.08
          p.cooldownMult *= 0.92
          p.attackSpeed = Math.max(120, Math.floor(p.attackSpeed * 0.94))
          break
        case "magnet":
          p.magnetRadius += 40
          break
        default:
          break
      }
    }
  }
}
