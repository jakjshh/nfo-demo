import * as Phaser from "phaser"
import { CharacterTextureKey, BulletTextureKey } from "../data/assetKeys"

const MELEE_HALF_ARC = (Math.PI * 2) / 3

export default class BasePlayer {
  constructor(scene, x, y, config) {
    this.scene = scene
    this.config = config
    this.charId = config._charId || "ranger"

    const heroTex =
      scene.textures.exists(CharacterTextureKey[this.charId]) ? CharacterTextureKey[this.charId] : "__WHITE"
    this.sprite = scene.physics.add.sprite(x, y, heroTex)
    this.baseScale = 0.8
    this.sprite.setScale(this.baseScale)

    this.sprite.setCollideWorldBounds(false)
    this.sprite.clearTint()

    this.keysWasd = scene.input.keyboard.addKeys("W,S,A,D")

    this.maxHp = config.maxHp
    this.hp = this.maxHp
    this.attack = config.attack
    this.moveSpeed = config.moveSpeed
    this.attackSpeed = config.attackSpeed
    this.defense = config.metaDefense ?? 0
    this.invulnerableUntil = 0

    this.critChance = config.critChance ?? 0.05
    this.critDamageMult = config.critDamageMult ?? 1.5

    this.bulletSize = 10
    this.meleeRange = 60
    this.magnetRadius = 80

    this.durationMult = 1
    this.cooldownMult = 1

    this.volleyDamageBonus = 0
    this.laserDamageBonus = 0
    this.zoneDamageBonus = 0
    this.zoneRadiusBonus = 0

    this.solarExplosionBonus = 0
    this.solarParticleBonus = 0
    this.solarDotBonus = 0
    this.blizzardRadiusBonus = 0
    this.blizzardDamageBonus = 0
    this.hurricaneRadiusBonus = 0
    this.hurricaneDamageBonus = 0
    this.courageWidthBonus = 0
    this.courageDamageBonus = 0
    this.pixieDamageBonus = 0
    this.blackHoleRadiusBonus = 0
    this.blackHolePullBonus = 0

    this.shieldMaxBase = 0
    this.shieldDefensePerLevel = 0
    this.currentShield = 0
    this.shieldOutline = null

    this.lastMoveDir = new Phaser.Math.Vector2(1, 0)

    this.volleyPhase = "idle"
    this.volleyNextStart = 0
    this.volleyBurstEnd = 0
    this.volleyLastBurstTick = 0

    this.laserLastTick = 0
    this.zoneLastSpawn = 0
    this.solarLastTick = 0
    this.blizzardLastSpawn = 0
    this.hurricaneLastSpawn = 0
    this.courageLastSpawn = 0
    this.blackHoleLastSpawn = 0

    this.arcTimer = null
    this.pixieTimer = null

    this.skillSystem = null
    /** 小精灵跟随实体（发射起点） */
    this.pixieOrb = null
    this.syncBodySize()
  }

  get sys() {
    return this.skillSystem
  }

  getShieldDefenseBonus() {
    if (this.currentShield <= 0) return 0
    return this.shieldDefensePerLevel
  }

  getMaxShield() {
    return Math.max(0, this.shieldMaxBase)
  }

  refreshShieldFromWeapon() {
    const max = this.getMaxShield()
    if (max <= 0) {
      this.currentShield = 0
      this.updateShieldVisual()
      return
    }
    this.currentShield = max
    this.updateShieldVisual()
  }

  onShieldBreak() {
    this.updateShieldVisual()
  }

  updateShieldVisual() {
    const active = this.currentShield > 0 && this.getMaxShield() > 0
    if (active) {
      if (!this.shieldOutline) {
        this.shieldOutline = this.scene.add.graphics().setDepth(7500)
      }
    } else if (this.shieldOutline) {
      this.shieldOutline.destroy()
      this.shieldOutline = null
    }
  }

  drawShieldOutline() {
    if (!this.shieldOutline || this.currentShield <= 0) return
    const g = this.shieldOutline
    g.clear()
    g.lineStyle(3, 0x88ccff, 0.85)
    g.strokeCircle(this.sprite.x, this.sprite.y, 34)
  }

  syncWeaponDerivedStats() {
    if (this.currentShield > this.getMaxShield()) {
      this.currentShield = this.getMaxShield()
    }
    this.updateShieldVisual()
  }

  restartWeaponTimers() {
    if (this.arcTimer) {
      this.arcTimer.remove(false)
      this.arcTimer = null
    }
    if (this.pixieTimer) {
      this.pixieTimer.remove(false)
      this.pixieTimer = null
    }
    const now = this.scene.time.now
    this.volleyPhase = "idle"
    this.volleyNextStart = now
    this.volleyBurstEnd = 0
    this.volleyLastBurstTick = 0
    this.laserLastTick = now
    this.zoneLastSpawn = now
    this.solarLastTick = now - 2500
    this.blizzardLastSpawn = now
    this.hurricaneLastSpawn = now
    this.courageLastSpawn = now
    this.blackHoleLastSpawn = now
    this.butterflyWingLastSpawn = now
    this.bulletStringLastSpawn = now

    if (this.sys?.getWeaponLevel("arc") >= 1) {
      this.arcTimer = this.scene.time.addEvent({
        delay: this.attackSpeed,
        loop: true,
        callback: () => this.tryArcAttack()
      })
    }

    if (this.sys?.getWeaponLevel("pixie") >= 1) {
      this.pixieTimer = this.scene.time.addEvent({
        delay: Math.max(280, 520 * this.cooldownMult),
        loop: true,
        callback: () => this.firePixieShots()
      })
    } else if (this.pixieOrb) {
      this.pixieOrb.destroy()
      this.pixieOrb = null
    }
  }

  tryArcAttack() {
    if (this.scene.isPausedGameplay?.()) return
    if (!this.sys || this.sys.getWeaponLevel("arc") < 1) return

    const angle = this.getFacingAngle()
    this.scene.showMeleeArcFx(this.sprite.x, this.sprite.y, angle, this.meleeRange)
    this.scene.audioHub?.playCharacterSfx(this.charId, "skill", 0.25)

    const targets = this.findEnemiesInMeleeArc()
    targets.forEach(enemy => {
      if (!enemy.active) return
      const { damage, crit } = this.rollAttackDamage()
      enemy.hp -= damage
      this.scene.onEnemyDamaged(enemy, damage, crit)
      this.scene.resolveEnemyDeath(enemy)
    })
  }

  getFacingAngle() {
    return Math.atan2(this.lastMoveDir.y, this.lastMoveDir.x)
  }

  getProjectileBonus() {
    return this.sys?.getLevel("projectileCount") ?? 0
  }

  rollAttackDamage(flatBonus = 0) {
    const base = this.attack + flatBonus
    const crit = Math.random() < this.critChance
    const damage = crit ? Math.max(1, Math.round(base * this.critDamageMult)) : Math.max(1, Math.round(base))
    return { damage, crit }
  }

  syncBodySize() {
    const body = this.sprite.body
    if (!body) return
    const w = Math.max(12, Math.floor(this.sprite.displayWidth * 0.48))
    const h = Math.max(12, Math.floor(this.sprite.displayHeight * 0.62))
    body.setSize(w, h, true)
  }

  clampToPlayArea() {
    if (!this.sprite.body) return
    const scene = this.scene
    const m = scene.playMargin ?? 0
    const w = scene.WORLD_W
    const h = scene.WORLD_H
    const body = this.sprite.body
    const hw = body.halfWidth
    const hh = body.halfHeight

    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, m + hw, w - m - hw)
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, m + hh, h - m - hh)
  }

  update() {
    if (this.scene.isPausedGameplay?.()) {
      this.drawShieldOutline()
      return
    }

    const cursors = this.scene.input.keyboard.createCursorKeys()
    const speed = this.moveSpeed
    let vx = 0
    let vy = 0

    if (cursors.left.isDown) vx -= 1
    if (cursors.right.isDown) vx += 1
    if (cursors.up.isDown) vy -= 1
    if (cursors.down.isDown) vy += 1

    if (this.keysWasd.A?.isDown) vx -= 1
    if (this.keysWasd.D?.isDown) vx += 1
    if (this.keysWasd.W?.isDown) vy -= 1
    if (this.keysWasd.S?.isDown) vy += 1

    const stick = this.scene.getJoystickVector?.() ?? { x: 0, y: 0 }
    if (Math.abs(stick.x) > 0.08 || Math.abs(stick.y) > 0.08) {
      vx += stick.x
      vy += stick.y
    }

    const len = Math.hypot(vx, vy)
    if (len > 1.001) {
      vx /= len
      vy /= len
    }

    if (this.sprite?.body) {
      this.sprite.setVelocity(vx * speed, vy * speed)
    }

    if (len > 0.08) {
      this.lastMoveDir.set(vx, vy).normalize()
    }

    const now = this.scene.time.now
    this.updateVolleyWeapon(now)
    this.updateLaserWeapon(now)
    this.updateGroundZones(now)
    this.updateSolarBurst(now)
    this.updateBlizzard(now)
    this.updateHurricane(now)
    this.updateCourageSong(now)
    this.updateBlackHole(now)
    this.updateButterflyWing(now)
    this.updateBulletString(now)
    this.updatePixieCompanion()
    this.updateHeroVisual()
    this.drawShieldOutline()
  }

  updatePixieCompanion() {
    const lv = this.sys?.getWeaponLevel("pixie") ?? 0
    if (lv < 1) {
      if (this.pixieOrb) {
        this.pixieOrb.destroy()
        this.pixieOrb = null
      }
      return
    }
    if (!this.pixieOrb && this.scene.textures.exists("tex_pixie_companion")) {
      this.pixieOrb = this.scene.add
        .sprite(this.sprite.x + 32, this.sprite.y, "tex_pixie_companion")
        .setDepth(7200)
        .setDisplaySize(22, 22)
    }
    if (!this.pixieOrb) return
    const tt = this.scene.time.now * 0.0035
    this.pixieOrb.setPosition(
      this.sprite.x + 36 + Math.cos(tt) * 12,
      this.sprite.y - 6 + Math.sin(tt * 1.2) * 10
    )
  }

  /** 行走/站立：无序列帧时用缩放微动代替；有 anims 时可改 play('walk')/play('idle') */
  updateHeroVisual() {
    const body = this.sprite.body
    const moving = body && (Math.abs(body.velocity.x) > 8 || Math.abs(body.velocity.y) > 8)

    const sc = moving ? this.baseScale * 1.05 : this.baseScale
    this.sprite.setScale(sc)
    // if (this.sprite.anims) {
    //   moving ? this.sprite.play('hero_walk', true) : this.sprite.play('hero_idle', true)
    // }
  }

  updateVolleyWeapon(now) {
    if (!this.sys || this.sys.getWeaponLevel("trackingVolley") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const burstMs = 3000 * this.durationMult
    const cdMs = 1000 * this.cooldownMult
    const tickMs = 280 * this.cooldownMult

    if (this.volleyPhase === "idle") {
      if (now >= this.volleyNextStart) {
        this.volleyPhase = "burst"
        this.volleyBurstEnd = now + burstMs
        this.volleyLastBurstTick = now - tickMs
      }
    } else {
      if (now >= this.volleyBurstEnd) {
        this.volleyPhase = "idle"
        this.volleyNextStart = now + cdMs
        return
      }
      if (now - this.volleyLastBurstTick >= tickMs) {
        this.volleyLastBurstTick = now
        this.fireTrackingVolley()
      }
    }
  }

  fireTrackingVolley() {
    const bonus = this.volleyDamageBonus
    const lv = this.getProjectileBonus()
    const n = Math.min(12, 5 + lv)
    const targets = this.pickVolleyTargets(n)
    if (targets.length === 0) return

    targets.forEach(enemy => {
      const bt = this.scene.textures.exists(BulletTextureKey.trackingVolley)
        ? BulletTextureKey.trackingVolley
        : "__WHITE"
      const bullet = this.scene.physics.add.sprite(this.sprite.x, this.sprite.y, bt)
      this.scene.bullets.add(bullet)
      const sz = Math.max(6, this.bulletSize * 0.65)
      bullet.setDisplaySize(sz, sz)
      if (bt === "__WHITE") bullet.setTint(0xffee66)
      this.scene.physics.moveToObject(bullet, enemy, 230)

      const { damage, crit } = this.rollAttackDamage(bonus * 0.4)
      bullet.damage = damage
      bullet.isCrit = crit
      bullet.pierce = true
      bullet.hitEnemies = new Map()
    })
  }

  pickVolleyTargets(n) {
    const px = this.sprite.x
    const py = this.sprite.y
    const scored = []

    this.scene.enemies.getChildren().forEach(e => {
      if (!e.active) return
      const d = Phaser.Math.Distance.Between(px, py, e.x, e.y)
      scored.push({ e, d })
    })
    scored.sort((a, b) => a.d - b.d)

    const out = []
    for (let i = 0; i < scored.length && out.length < n; i++) {
      out.push(scored[i].e)
    }
    while (out.length < n && scored.length > 0) {
      out.push(scored[0].e)
    }
    return out
  }

  updateLaserWeapon(now) {
    if (!this.sys || this.sys.getWeaponLevel("laser") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const tick = 140 * this.cooldownMult
    if (now - this.laserLastTick < tick) return
    this.laserLastTick = now

    const range = 440
    const enemy = this.findNearestEnemy()
    let ang = this.getFacingAngle()
    if (enemy) {
      ang = Math.atan2(enemy.y - this.sprite.y, enemy.x - this.sprite.x)
    }

    const x0 = this.sprite.x
    const y0 = this.sprite.y
    const x1 = x0 + Math.cos(ang) * range
    const y1 = y0 + Math.sin(ang) * range

    this.scene.drawLaserFx(x0, y0, x1, y1)

    const lw = 20
    const flat = this.laserDamageBonus + this.sys.getWeaponLevel("laser") * 0.5

    this.scene.enemies.getChildren().forEach(e => {
      if (!e.active) return
      if (this.pointSegmentDistance(e.x, e.y, x0, y0, x1, y1) <= lw + Math.max(e.displayWidth || 26, 26) * 0.35) {
        const { damage, crit } = this.rollAttackDamage(flat)
        e.hp -= damage
        this.scene.onEnemyDamaged(e, damage, crit)
        this.scene.resolveEnemyDeath(e)
      }
    })
  }

  pointSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy
    if (len2 < 1e-6) return Math.hypot(px - x1, py - y1)
    let t = ((px - x1) * dx + (py - y1) * dy) / len2
    t = Phaser.Math.Clamp(t, 0, 1)
    const qx = x1 + t * dx
    const qy = y1 + t * dy
    return Math.hypot(px - qx, py - qy)
  }

  updateGroundZones(now) {
    if (!this.sys || this.sys.getWeaponLevel("groundZones") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const spawnCd = Math.max(400, 900 * this.cooldownMult - this.sys.getWeaponLevel("groundZones") * 40)
    if (now - this.zoneLastSpawn < spawnCd) return
    this.zoneLastSpawn = now

    const lv = this.sys.getWeaponLevel("groundZones")
    const count = Math.min(6, 2 + Math.floor(lv / 2))
    const baseR = 48 + this.zoneRadiusBonus + lv * 2
    const spread = 120 + lv * 8
    const dur = 3500 * this.durationMult

    for (let i = 0; i < count; i++) {
      const ox = Phaser.Math.Between(-spread, spread)
      const oy = Phaser.Math.Between(-spread, spread)
      this.scene.spawnGroundZone(this.sprite.x + ox, this.sprite.y + oy, baseR, dur)
    }
  }

  updateSolarBurst(now) {
    if (!this.sys || this.sys.getWeaponLevel("solarBurst") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const cd = Math.max(2200, 4200 * this.cooldownMult - this.sys.getWeaponLevel("solarBurst") * 120)
    if (now - this.solarLastTick < cd) return
    this.solarLastTick = now

    this.scene.triggerSolarBurst(this)
  }

  updateBlizzard(now) {
    if (!this.sys || this.sys.getWeaponLevel("blizzard") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const cd = Math.max(900, 1600 * this.cooldownMult)
    if (now - this.blizzardLastSpawn < cd) return
    this.blizzardLastSpawn = now

    const r = 95 + this.blizzardRadiusBonus
    this.scene.spawnBlizzard(this.sprite.x + Phaser.Math.Between(-40, 40), this.sprite.y + Phaser.Math.Between(-40, 40), r)
  }

  updateHurricane(now) {
    if (!this.sys || this.sys.getWeaponLevel("hurricane") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const cd = Math.max(1100, 2000 * this.cooldownMult)
    if (now - this.hurricaneLastSpawn < cd) return
    this.hurricaneLastSpawn = now

    const r = 80 + this.hurricaneRadiusBonus
    const target = this.findNearestEnemy()
    const tx = target?.x ?? (this.sprite.x + Phaser.Math.Between(-60, 60))
    const ty = target?.y ?? (this.sprite.y + Phaser.Math.Between(-60, 60))
    this.scene.spawnHurricane(tx, ty, r)
  }

  updateCourageSong(now) {
    if (!this.sys || this.sys.getWeaponLevel("courageSong") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const cd = Math.max(400, 700 * this.cooldownMult)
    if (now - this.courageLastSpawn < cd) return
    this.courageLastSpawn = now

    const enemy = this.findNearestEnemy()
    if (!enemy) return

    const base = Math.atan2(enemy.y - this.sprite.y, enemy.x - this.sprite.x)
    const extra = Math.min(4, this.getProjectileBonus())
    const n = 1 + extra
    for (let i = 0; i < n; i++) {
      const spread = n === 1 ? 0 : Phaser.Math.Linear(-0.22, 0.22, i / (n - 1))
      this.scene.spawnCourageBullet(this, base + spread)
    }
  }

  updateBlackHole(now) {
    if (!this.sys || this.sys.getWeaponLevel("blackHole") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const cd = Math.max(1400, 2600 * this.cooldownMult)
    if (now - this.blackHoleLastSpawn < cd) return
    this.blackHoleLastSpawn = now

    const r = 70 + this.blackHoleRadiusBonus
    const target = this.findNearestEnemy()
    const tx = target?.x ?? (this.sprite.x + Phaser.Math.Between(-50, 50))
    const ty = target?.y ?? (this.sprite.y + Phaser.Math.Between(-50, 50))
    this.scene.spawnBlackHole(tx, ty, r)
  }

  updateButterflyWing(now) {
    if (!this.sys || this.sys.getWeaponLevel("butterflyWing") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const cd = Math.max(800, 1500 * this.cooldownMult)
    if (now - this.butterflyWingLastSpawn < cd) return
    this.butterflyWingLastSpawn = now

    const facing = this.getFacingAngle()
    const lv = this.sys.getWeaponLevel("butterflyWing")
    const wingSpan = 86 + lv * 10
    const arc = Math.PI * 0.42

    ;[-Math.PI / 2, Math.PI / 2].forEach(sideOffset => {
      const g = this.scene.add.graphics().setDepth(8050)
      g.lineStyle(4, 0xff88ff, 0.9)
      g.beginPath()
      g.arc(this.sprite.x, this.sprite.y, wingSpan, facing + sideOffset - arc, facing + sideOffset + arc, false)
      g.strokePath()
      this.scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 140,
        onComplete: () => g.destroy()
      })
    })

    this.scene.enemies.getChildren().forEach(enemy => {
      if (!enemy.active) return
      const dx = enemy.x - this.sprite.x
      const dy = enemy.y - this.sprite.y
      const d = Math.hypot(dx, dy)
      if (d > wingSpan) return

      const { damage, crit } = this.rollAttackDamage(1 + lv * 0.8)
      enemy.hp -= damage
      this.scene.onEnemyDamaged(enemy, damage, crit)
      this.scene.resolveEnemyDeath(enemy)

      const knockback = 80 + lv * 12
      const nx = dx / (d || 1)
      const ny = dy / (d || 1)
      enemy.x += nx * knockback
      enemy.y += ny * knockback
    })

    this.scene.audioHub?.playCharacterSfx(this.charId, "skill", 0.25)
  }

  updateBulletString(now) {
    if (!this.sys || this.sys.getWeaponLevel("bulletString") < 1) return
    if (this.scene.isPausedGameplay?.()) return

    const cd = Math.max(600, 1200 * this.cooldownMult)
    if (now - this.bulletStringLastSpawn < cd) return
    this.bulletStringLastSpawn = now

    const facing = this.getFacingAngle()
    const lv = this.sys.getWeaponLevel("bulletString")
    const bulletCount = 3 + lv + Math.min(4, this.getProjectileBonus())
    const spread = Math.min(0.55, 0.12 + lv * 0.03)
    const bulletTex = this.scene.textures.exists(BulletTextureKey.default) ? BulletTextureKey.default : "__WHITE"

    for (let i = 0; i < bulletCount; i++) {
      const bullet = this.scene.physics.add.sprite(this.sprite.x, this.sprite.y, bulletTex)
      this.scene.bullets.add(bullet)
      bullet.setDisplaySize(12, 12)
      bullet.setTint(0xff66cc)
      bullet.body?.setCircle(6)

      const label = this.scene.add.text(bullet.x, bullet.y, "🔞", { fontSize: "12px" }).setOrigin(0.5).setDepth(8100)
      bullet.emojiLabel = label
      bullet.once("destroy", () => {
        if (label?.active) label.destroy()
      })

      const spd = 320 + lv * 12
      const delay = i * 50
      const ang = facing + Phaser.Math.FloatBetween(-spread, spread)
      this.scene.time.delayedCall(delay, () => {
        if (bullet.active) {
          bullet.body?.velocity?.set(Math.cos(ang) * spd, Math.sin(ang) * spd)
        }
      })

      const { damage, crit } = this.rollAttackDamage(0.6 * lv)
      bullet.damage = damage
      bullet.isCrit = crit
      bullet.pierce = false
      bullet.lifeEnd = this.scene.time.now + 1200
    }

    this.scene.audioHub?.playCharacterSfx(this.charId, "skill", 0.22)
  }

  firePixieShots() {
    if (this.scene.isPausedGameplay?.()) return
    const wlv = this.sys?.getWeaponLevel("pixie") ?? 0
    if (wlv < 1) return

    const n = Math.min(5, wlv + Math.floor(this.getProjectileBonus() / 2))
    const targets = this.pickVolleyTargets(Math.max(1, n))
    if (targets.length === 0) return

    const ox = this.pixieOrb ? this.pixieOrb.x : this.sprite.x + 22
    const oy = this.pixieOrb ? this.pixieOrb.y : this.sprite.y
    const bt = this.scene.textures.exists(BulletTextureKey.pixie) ? BulletTextureKey.pixie : "__WHITE"

    for (let i = 0; i < n; i++) {
      const tgt = targets[Math.min(i, targets.length - 1)]
      const bullet = this.scene.physics.add.sprite(ox, oy, bt)
      this.scene.bullets.add(bullet)
      bullet.setDisplaySize(10, 10)
      if (bt === "__WHITE") bullet.setTint(0x99ffaa)
      this.scene.physics.moveToObject(bullet, tgt, 320)
      const { damage, crit } = this.rollAttackDamage(this.pixieDamageBonus * 0.5)
      bullet.damage = damage
      bullet.isCrit = crit
      bullet.pierce = false
      bullet.lifeEnd = this.scene.time.now + 1800
    }
  }

  findEnemiesInMeleeArc() {
    const px = this.sprite.x
    const py = this.sprite.y
    const fx = this.lastMoveDir.x
    const fy = this.lastMoveDir.y
    const range = this.meleeRange

    const inArc = []

    this.scene.enemies.getChildren().forEach(e => {
      if (!e.active) return
      const dx = e.x - px
      const dy = e.y - py
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > range || d < 1e-6) return

      const nx = dx / d
      const ny = dy / d
      const dot = nx * fx + ny * fy
      const cosLimit = Math.cos(MELEE_HALF_ARC)
      if (dot >= cosLimit) inArc.push({ enemy: e, d })
    })

    inArc.sort((a, b) => a.d - b.d)
    return inArc.map(x => x.enemy)
  }

  findNearestEnemy() {
    let target = null
    let min = Infinity

    this.scene.enemies.getChildren().forEach(e => {
      const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.x, e.y)
      if (d < min) {
        min = d
        target = e
      }
    })

    return target
  }

  /**
   * 护盾先吃伤害；护盾被打穿后，剩余伤害再走护甲。
   * 额外「护盾存在时的防御」仅当扣血时护盾仍未破才生效（本帧内盾碎则余伤不吃盾防）。
   */
  takeDamage(amount) {

    const now = this.scene.time.now
    if (now < this.invulnerableUntil) return

    let remaining = amount

    if (this.currentShield > 0) {
      const hitShield = Math.min(this.currentShield, remaining)
      this.currentShield -= hitShield
      remaining -= hitShield
      if (this.currentShield <= 0) {
        this.currentShield = 0
        this.onShieldBreak()
      }
    }

    if (remaining > 0) {
      const shieldDefWhileUp = this.currentShield > 0 ? this.getShieldDefenseBonus() : 0
      const reduced = Math.max(1, remaining - this.defense - shieldDefWhileUp)
      this.hp -= reduced
    }

    this.invulnerableUntil = now + 700
    if (this.hp < 0) this.hp = 0
  }
}
