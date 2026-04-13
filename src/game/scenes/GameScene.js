import * as Phaser from "phaser"
import { Characters } from "../data/CharacterConfig"
import { WEAPON_META, SKILL_META, WEAPON_UI_SLOT_COUNT, SKILL_UI_SLOT_COUNT } from "../data/gameDefs"
import SkillSystem from "../systems/SkillSystem"
import BasePlayer from "../entities/BasePlayer"
import SpawnSystem from "../systems/SpawnSystem"
import { ensurePlaceholderTextures } from "../boot/ensurePlaceholderTextures"
import AudioHub from "../systems/AudioHub"
import NetClient from "../net/NetClient"
import { loadGold, saveGold, getMetaForCharacter } from "../data/persist"
import { BulletTextureKey, CharacterTextureKey } from "../data/assetKeys"

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene")
    this.audioHub = null
  }

  preload() {
    ensurePlaceholderTextures(this)
    this.audioHub = new AudioHub(this)
    this.audioHub.preload()
    
    // 加载关卡相关资源
    const level = this.registry.get("level") || "forest"
    // 这里可以根据关卡加载不同的背景贴图
  }

  isPausedGameplay() {
    return this.selectUiOpen || this.gameOverActive || this.physics.world.isPaused === true || this.isPaused
  }

  create() {
    this.survivalTime = 0
    this.WORLD_W = 2000
    this.WORLD_H = 2000
    this.playMargin = 80
    this.runGold = 0
    this.net = null
    this.remotePlayerGhost = null
    this.bgTile = null

    this.selectUiOpen = false
    this.gameOverActive = false
    this.isPaused = false

    this.boss = null
    this.bossHpBar = null
    this.bossHpBarBg = null
    this.bossAttackTimer = null
    this.defeatedBosses = 0

    this.playerHpBar = null
    this.playerHpBarBg = null
    this.expBar = null
    this.expBarBg = null
    this.levelText = null
    this.pauseMenuElements = []

    this._groundZones = []
    this._blizzards = []
    this._hurricanes = []
    this._blackHoles = []

    this.groundZoneGraphics = this.add.graphics().setDepth(6500)
    this.worldFxGraphics = this.add.graphics().setDepth(6450)

    this.joystickVec = { x: 0, y: 0 }
    this._joyBase = null
    this._joyKnob = null
    this._joyPointerId = null

    this.scale.on("resize", this.onResize, this)
    this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H)
    this.cameras.main.setBounds(0, 0, this.WORLD_W, this.WORLD_H)

    this.drawMapBoundaries()

    // 根据选中的关卡设置背景
    const level = this.registry.get("level") || "forest"
    this.currentLevel = level
    
    this.bgTile = this.add
      .tileSprite(0, 0, this.WORLD_W, this.WORLD_H, "bg_map")
      .setOrigin(0, 0)
      .setDepth(-2500)
      .setScrollFactor(1)
    
    // 根据关卡设置不同的背景颜色或纹理
    switch(level) {
      case "forest":
        this.bgTile.setTint(0x228822)
        break
      case "desert":
        this.bgTile.setTint(0xffdd88)
        break
      case "ice":
        this.bgTile.setTint(0x88ccff)
        break
      case "volcano":
        this.bgTile.setTint(0xff8844)
        break
      default:
        this.bgTile.setTint(0x222222)
        break
    }

    /*
     * ========== 地图碰撞（图片/瓦片）基础架构 ==========
     * 1) 用 Tiled 做碰撞层导出 JSON，与背景同尺寸对齐。
     * this.load.tilemapTiledJSON("level1", "assets/levels/stage1.json")
     * const map = this.make.tilemap({ key: "level1" })
     * const ts = map.addTilesetImage("terrain", "tiles_sheet")
     * const ground = map.createLayer("ground", ts, 0, 0)
     * const collide = map.createLayer("collision", ts, 0, 0)
     * collide.setCollisionByProperty({ collides: true })
     * this.physics.add.collider(this.player.sprite, collide)
     *
     * 2) 或从图片用 PhysicsEditor 导出多边形，staticBody + setFromPhysicsEditor
     * ==================================================
     */

    this.events.on("postupdate", () => {
      if (this.player) this.player.clampToPlayArea()
      if (!this.isPausedGameplay()) this.applyBlackHolePull()
    })

    const selected = this.registry.get("character") || "ranger"
    this.selectedCharacterKey = selected
    const baseCfg = Characters[selected]
    const meta = getMetaForCharacter(selected)
    const config = {
      ...baseCfg,
      _charId: selected,
      maxHp: baseCfg.maxHp + (meta.hp || 0) * 10,
      attack: baseCfg.attack + (meta.atk || 0) * 2,
      moveSpeed: baseCfg.moveSpeed + (meta.spd || 0) * 6,
      metaDefense: (meta.def || 0) * 1
    }

    if (!this.registry.get("playMode")) this.registry.set("playMode", "solo")

    this.player = new BasePlayer(this, 1000, 1000, config)
    const textureKey = selected
    if (this.textures.exists(textureKey)) {
      this.player.sprite.setTexture(textureKey)
    } else {
      console.warn(`[GameScene] 纹理 "${textureKey}" 不存在`)
      this.createFallbackTexture(textureKey, Characters[selected].name)
      this.player.sprite.setTexture(textureKey)
    }

    this.player.baseScale = this.getUniformCharacterScale(textureKey, 54)
    this.player.sprite.setScale(this.player.baseScale)
    this.player.syncBodySize?.()


    this.player.skillSystem = new SkillSystem(this.player)
    this.player.skillSystem.initFromCharacter(config)
    this.player.refreshShieldFromWeapon()
    this.player.restartWeaponTimers()

    this.audioHub.boot()
    this.audioHub.startBgm()

    if (this.registry.get("playMode") === "online") {
      const url = import.meta.env?.VITE_WS_URL || "ws://127.0.0.1:8787"
      this.net = new NetClient(url)
      this.net.connect(
        () => {},
        () => {}
      )
      const gt =
        CharacterTextureKey[selected] && this.textures.exists(CharacterTextureKey[selected])
          ? CharacterTextureKey[selected]
          : "__WHITE"
      this.remotePlayerGhost = this.add
        .sprite(900, 900, gt)
        .setAlpha(0.42)
        .setDepth(480)
        .setDisplaySize(40, 40)
      this.remotePlayerGhost.setVisible(false)
    }

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)

    this.enemies = this.physics.add.group()
    this.bullets = this.physics.add.group()
    this.bossBullets = this.physics.add.group()
    this.pickups = this.physics.add.group()
    this.solarParticles = this.physics.add.group()

    this.spawnSystem = new SpawnSystem(this)

    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      this.applyBulletHit(bullet, enemy)
    })

    this.physics.add.overlap(this.solarParticles, this.enemies, (part, enemy) => {
      if (this.isPausedGameplay()) return
      if (!enemy.active || !part.active) return
      const dps = part.solarDotDps ?? 2
      enemy.solarDotUntil = this.survivalTime + 5
      enemy.solarDotDps = Math.max(enemy.solarDotDps || 0, dps)
      enemy.solarDotNext = this.survivalTime + 1
      part.destroy()
    })

    this.physics.add.overlap(this.bossBullets, this.player.sprite, (bullet, _playerSprite) => {
      if (this.selectUiOpen || this.gameOverActive) return
      const beforeHp = this.player.hp
      const beforeSh = this.player.currentShield
      this.player.takeDamage(18)
      bullet?.destroy()

    
      if (this.player.hp < beforeHp || this.player.currentShield < beforeSh) this.flashPlayerHit()
      this.refreshHud()
      if (this.player.hp <= 0) this.showGameOver()
    })


    this.physics.add.overlap(this.player.sprite, this.pickups, (ps, pickup) => {
      this.collectPickup(pickup)
    })

    this.physics.add.overlap(this.player.sprite, this.enemies, () => {
      if (this.selectUiOpen || this.gameOverActive) return

      const beforeHp = this.player.hp
      const beforeSh = this.player.currentShield
      this.player.takeDamage(12)

      if (this.player.hp < beforeHp || this.player.currentShield < beforeSh) this.flashPlayerHit()

      this.refreshHud()

      if (this.player.hp <= 0) this.showGameOver()
    })

    this.exp = 0
    this.level = 1
    this.expToNext = 30

    this.buildHud()
    this.buildDualPanels()
    this.setupVirtualJoystick()

    this.input.keyboard.on("keydown-R", () => {
      if (this.gameOverActive) this.scene.start("ModeScene")
    })

    this.events.once("shutdown", () => {
      this.audioHub?.stopBgm()
      this.net?.disconnect()
      saveGold(loadGold() + (this.runGold || 0))
    })

    this.updateUIPosition(this.scale.width, this.scale.height)
  }

  getJoystickVector() {
    return this.joystickVec
  }

  setupVirtualJoystick() {
    const touchLike =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0 || this.scale.width < 820)

    if (!touchLike) return

    const w = this.scale.width
    const h = this.scale.height
    const bx = 96
    const by = h - 96
    const baseR = 56
    const knobR = 22

    this._joyBase = this.add.circle(bx, by, baseR, 0x222233, 0.55).setScrollFactor(0).setDepth(25000).setStrokeStyle(2, 0x6688aa)

    this._joyKnob = this.add.circle(bx, by, knobR, 0x88aacc, 0.85).setScrollFactor(0).setDepth(25001)

    const maxD = baseR - knobR - 4

    const updateKnob = (px, py) => {
      let dx = px - bx
      let dy = py - by
      const d = Math.hypot(dx, dy)
      if (d > maxD && d > 0) {
        dx = (dx / d) * maxD
        dy = (dy / d) * maxD
      }
      this._joyKnob.setPosition(bx + dx, by + dy)
      this.joystickVec.x = dx / maxD
      this.joystickVec.y = dy / maxD
    }

    this._joyBase.setInteractive({ draggable: true, useHandCursor: false })

    this.input.on("pointerdown", p => {
      if (p.y < h * 0.62 && p.x > w * 0.42) return
      if (Phaser.Math.Distance.Between(p.x, p.y, bx, by) > baseR + 40) return
      this._joyPointerId = p.id
      updateKnob(p.x, p.y)
    })

    this.input.on("pointermove", p => {
      if (this._joyPointerId !== p.id) return
      updateKnob(p.x, p.y)
    })

    const release = p => {
      if (this._joyPointerId !== p.id) return
      this._joyPointerId = null
      this._joyKnob.setPosition(bx, by)
      this.joystickVec.x = 0
      this.joystickVec.y = 0
    }

    this.input.on("pointerup", release)
    this.input.on("pointerout", release)
  }

  onBossSpawned() {
    this.showBossWarning()

    if (this.bossAttackTimer) this.bossAttackTimer.remove()

    this._bossFireIdx = 0
    this.bossAttackTimer = this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        if (!this.boss?.active || this.gameOverActive) return
        this._bossFireIdx++
        if (this._bossFireIdx % 4 === 0) this.fireBossSpreadBurst()
        else this.fireBossAimedShot()
      }
    })
  }

  fireBossAimedShot() {
    const bx = this.boss.x
    const by = this.boss.y
    const tk = this.textures.exists(BulletTextureKey.bossSpread) ? BulletTextureKey.bossSpread : "__WHITE"
    const bullet = this.physics.add.sprite(bx, by, tk)
    this.bossBullets.add(bullet)
    if (tk === "__WHITE") bullet.setTint(0xff3300)
    bullet.setDisplaySize(22, 22)
    if (bullet.body && this.player.sprite) {
      this.physics.moveToObject(bullet, this.player.sprite, 260)
    }
    bullet.lifeEnd = this.time.now + 4500
  }

  fireBossSpreadBurst() {
    const bx = this.boss.x
    const by = this.boss.y
    const n = 11
    const tk = this.textures.exists(BulletTextureKey.bossSpread) ? BulletTextureKey.bossSpread : "__WHITE"
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Phaser.Math.FloatBetween(-0.05, 0.05)
      const bullet = this.physics.add.sprite(bx, by, tk)
      this.bossBullets.add(bullet)
      if (tk === "__WHITE") bullet.setTint(0xff6633)
      bullet.setDisplaySize(18, 18)
      const spd = 195
      if (bullet.body) {
        bullet.body.velocity?.set(Math.cos(ang) * spd, Math.sin(ang) * spd)
      }
      bullet.lifeEnd = this.time.now + 4500
    }
  }

  showBossWarning() {
    const cam = this.cameras.main
    const cx = cam.width / 2
    const t = this.add
      .text(cx, 48, "Boss 来了！", {
        fontSize: "32px",
        color: "#ff4444",
        stroke: "#1a0000",
        strokeThickness: 5
      })
      .setScrollFactor(0)
      .setDepth(21050)
      .setOrigin(0.5, 0)

    this.tweens.add({
      targets: t,
      alpha: { from: 1, to: 0.25 },
      duration: 160,
      yoyo: true,
      repeat: -1
    })

    this.time.delayedCall(3000, () => {
      t.destroy()
    })
  }

  applyBulletHit(bullet, enemy) {
    const now = this.time.now
    if (bullet.pierce) {
      if (!bullet.hitEnemies) bullet.hitEnemies = new Map()
      const last = bullet.hitEnemies.get(enemy) ?? 0
      if (now - last < 200) return
      bullet.hitEnemies.set(enemy, now)
    }

    const dmg = bullet.damage ?? this.player.attack
    const crit = bullet.isCrit === true
    enemy.hp -= dmg
    this.onEnemyDamaged(enemy, dmg, crit)

    if (bullet.slowEnemy) {
      const st = this.survivalTime
      enemy.slowUntil = st + 2.8
      enemy.slowMult = 0.38
    }

    if (!bullet.pierce) bullet.destroy()

    this.resolveEnemyDeath(enemy)
  }

  collectPickup(pickup) {
    if (!pickup.active) return
    const t = pickup.pickupType
    const val = pickup.pickupValue ?? 0
    pickup.destroy()

    if (t === "exp") {
      this.gainExp(val)
      this.audioHub?.playSfx("pickup", 0.35)
    } else if (t === "heal") {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + val)
      this.refreshHud()
      this.audioHub?.playSfx("pickup", 0.35)
    } else if (t === "gold") {
      this.runGold += val
      this.audioHub?.playSfx("gold", 0.45)
      this.refreshHud()
    } else if (t === "magnetAll") {
      this.pullAllPickupsToPlayer()
      this.audioHub?.playSfx("pickup", 0.3)
    } else if (t === "killAll") {
      this.killAllNonBossEnemies()
      this.audioHub?.playSfx("weapon", 0.25)
    }
  }

  pullAllPickupsToPlayer() {
    const list = [...this.pickups.getChildren()]
    list.forEach(pu => {
      if (!pu.active) return
      this.collectPickup(pu)
    })
  }

  killAllNonBossEnemies() {
    const list = [...this.enemies.getChildren()]
    list.forEach(e => {
      if (!e.active || e === this.boss) return
      e.hp = 0
      this.resolveEnemyDeath(e)
    })
  }

  spawnGroundZone(x, y, radius, durationMs) {
    const st = this.survivalTime
    this._groundZones.push({
      x,
      y,
      r: radius,
      expiresSt: st + durationMs / 1000,
      nextDmgSt: st + 0.35
    })
  }

  updateGroundZonesLogic() {
    const g = this.groundZoneGraphics
    const pulse = this.time.now

    if (this.isPausedGameplay()) {
      g.clear()
      this._groundZones.forEach(z => {
        const alpha = 0.18 + 0.1 * Math.sin(pulse * 0.006 + z.x * 0.01)
        g.fillStyle(0x6644ff, alpha)
        g.fillCircle(z.x, z.y, z.r)
      })
      return
    }

    const st = this.survivalTime
    const p = this.player
    const bonus = p.zoneDamageBonus + (p.sys?.getWeaponLevel("groundZones") ?? 0)

    this._groundZones = this._groundZones.filter(z => z.expiresSt > st)

    this._groundZones.forEach(z => {
      if (st < z.nextDmgSt) return
      z.nextDmgSt = st + 0.38

      this.enemies.getChildren().forEach(e => {
        if (!e.active) return
        const d = Phaser.Math.Distance.Between(e.x, e.y, z.x, z.y)
        if (d > z.r + (e.displayWidth || 20) * 0.3) return

        const { damage, crit } = p.rollAttackDamage(bonus * 0.35)
        e.hp -= damage
        this.onEnemyDamaged(e, damage, crit)
        this.resolveEnemyDeath(e)
      })
    })

    g.clear()
    this._groundZones.forEach(z => {
      const alpha = 0.22 + 0.15 * Math.sin(pulse * 0.006 + z.x * 0.01)
      g.fillStyle(0x6644ff, alpha)
      g.fillCircle(z.x, z.y, z.r)
      g.lineStyle(2, 0xaa88ff, 0.5)
      g.strokeCircle(z.x, z.y, z.r)
    })
  }

  spawnBlizzard(x, y, r) {
    const st = this.survivalTime
    this._blizzards.push({
      x,
      y,
      r,
      expiresSt: st + 3.8 * this.player.durationMult,
      nextDmgSt: st + 0.15
    })
  }

  spawnHurricane(x, y, r) {
    const st = this.survivalTime
    this._hurricanes.push({
      x,
      y,
      r,
      phase: 0,
      expiresSt: st + 4.2 * this.player.durationMult,
      nextDmgSt: st + 0.2
    })
  }

  spawnBlackHole(x, y, r) {
    const st = this.survivalTime
    this._blackHoles.push({
      x,
      y,
      r,
      expiresSt: st + 3.5 * this.player.durationMult,
      nextDmgSt: st + 0.25
    })
  }

  spawnCourageBullet(player, ang) {
    const tk = this.textures.exists(BulletTextureKey.courageSong) ? BulletTextureKey.courageSong : "__WHITE"
    const b = this.physics.add.sprite(player.sprite.x, player.sprite.y, tk)
    this.bullets.add(b)
    const w = 36 + player.courageWidthBonus
    b.setDisplaySize(w, 12)
    if (tk === "__WHITE") b.setTint(0xaaddff)
    b.setRotation(ang)
    const spd = 300
    b.body?.velocity?.set(Math.cos(ang) * spd, Math.sin(ang) * spd)
    const { damage, crit } = player.rollAttackDamage(player.courageDamageBonus * 0.55)
    b.damage = damage
    b.isCrit = crit
    b.slowEnemy = true
    b.pierce = false
    b.lifeEnd = this.time.now + 1400
  }

  triggerSolarBurst(player) {
    if (this.isPausedGameplay()) return
    const st = this.survivalTime
    const px = player.sprite.x
    const py = player.sprite.y
    const R = 105 + player.solarExplosionBonus * 1.8
    const wlv = player.sys.getWeaponLevel("solarBurst")

    this.enemies.getChildren().forEach(e => {
      if (!e.active) return
      const d = Phaser.Math.Distance.Between(e.x, e.y, px, py)
      if (d > R + (e.displayWidth || 24) * 0.4) return
      const { damage, crit } = player.rollAttackDamage(8 + wlv * 2 + player.solarExplosionBonus * 0.2)
      e.hp -= damage
      this.onEnemyDamaged(e, damage, crit)
      this.resolveEnemyDeath(e)
    })

    const boom = this.add.circle(px, py, R * 0.92, 0xffee88, 0.35).setDepth(8100)
    if (boom.setBlendMode) boom.setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({
      targets: boom,
      alpha: 0,
      scale: 1.15,
      duration: 320,
      onComplete: () => boom.destroy()
    })

    const n = Math.min(22, 10 + Math.floor(wlv * 1.2))
    const dotBase = 2 + player.solarDotBonus + wlv * 0.15

    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Phaser.Math.FloatBetween(-0.08, 0.08)
      const part = this.physics.add.sprite(px, py, "__WHITE")
      this.solarParticles.add(part)
      part.setTint(0xffcc44)
      part.setDisplaySize(9, 9)
      part.solarDotDps = dotBase
      const v = Phaser.Math.FloatBetween(150, 240)
      if (part.body) part.body.setVelocity(Math.cos(ang) * v, Math.sin(ang) * v)
      part.solarLifeEnd = this.time.now + 2600
    }

    this.time.delayedCall(400, () => {
      /* 爆炸圈淡出由 tween 可选，此处省略避免堆积 */
    })
  }

  applyBlackHolePull() {
    if (this.isPausedGameplay()) return
    if (!this._blackHoles.length) return
    const st = this.survivalTime
    const active = this._blackHoles.filter(bh => bh.expiresSt > st)
    const p = this.player
    const pullBase = 2.2 + p.blackHolePullBonus * 12

    active.forEach(bh => {
      this.enemies.getChildren().forEach(e => {
        if (!e.active) return
        const dx = bh.x - e.x
        const dy = bh.y - e.y
        const d = Math.hypot(dx, dy) || 0.001
        if (d > bh.r) return
        const t = (1 - d / bh.r) * pullBase
        e.x += (dx / d) * t
        e.y += (dy / d) * t
      })
    })
  }

  tickWorldZonesAndDots() {
    if (this.isPausedGameplay()) {
      this.drawWorldFxGraphics()
      return
    }

    const st = this.survivalTime
    const p = this.player

    this._blizzards = this._blizzards.filter(b => b.expiresSt > st)
    this._blizzards.forEach(b => {
      if (st < b.nextDmgSt) return
      b.nextDmgSt = st + 0.42
      this.enemies.getChildren().forEach(e => {
        if (!e.active) return
        const d = Phaser.Math.Distance.Between(e.x, e.y, b.x, b.y)
        if (d > b.r) return
        const { damage, crit } = p.rollAttackDamage(p.blizzardDamageBonus * 0.45)
        e.hp -= damage
        this.onEnemyDamaged(e, damage, crit)
        e.freezeUntil = st + 1.15
        this.resolveEnemyDeath(e)
      })
    })

    this._hurricanes = this._hurricanes.filter(h => h.expiresSt > st)
    this._hurricanes.forEach(h => {
      h.phase += 0.22
      if (st < h.nextDmgSt) return
      h.nextDmgSt = st + 0.28
      const inner = h.r * 0.32
      const outer = h.r * 0.95
      this.enemies.getChildren().forEach(e => {
        if (!e.active) return
        const d = Phaser.Math.Distance.Between(e.x, e.y, h.x, h.y)
        if (d < inner || d > outer) return
        const { damage, crit } = p.rollAttackDamage(p.hurricaneDamageBonus * 0.5)
        e.hp -= damage
        this.onEnemyDamaged(e, damage, crit)
        this.resolveEnemyDeath(e)
      })
    })

    this._blackHoles = this._blackHoles.filter(bh => bh.expiresSt > st)
    this._blackHoles.forEach(bh => {
      if (st < bh.nextDmgSt) return
      bh.nextDmgSt = st + 0.35
      this.enemies.getChildren().forEach(e => {
        if (!e.active) return
        const d = Phaser.Math.Distance.Between(e.x, e.y, bh.x, bh.y)
        if (d > bh.r) return
        const { damage, crit } = p.rollAttackDamage(1.2 + p.blackHoleRadiusBonus * 0.04)
        e.hp -= damage
        this.onEnemyDamaged(e, damage, crit)
        this.resolveEnemyDeath(e)
      })
    })

    this.enemies.getChildren().forEach(e => {
      if (!e.active) return
      if (!e.solarDotUntil || st >= e.solarDotUntil) {
        e.solarDotDps = 0
        e.solarDotUntil = 0
        return
      }
      if (st < (e.solarDotNext || 0)) return
      e.solarDotNext = st + 1
      const dot = Math.max(1, Math.round(e.solarDotDps || 2))
      e.hp -= dot
      this.onEnemyDamaged(e, dot, false, false)
      this.resolveEnemyDeath(e)
    })

    const now = this.time.now
    this.solarParticles.getChildren().forEach(part => {
      if (!part.active) return
      if (now > (part.solarLifeEnd || 0)) part.destroy()
    })

    this.drawWorldFxGraphics()
  }

  drawWorldFxGraphics() {
    const g = this.worldFxGraphics
    g.clear()
    const st = this.survivalTime

    this._blizzards.forEach(b => {
      if (b.expiresSt <= st) return
      g.fillStyle(0xaaddff, 0.2)
      g.fillCircle(b.x, b.y, b.r)
      g.lineStyle(2, 0xffffff, 0.35)
      g.strokeCircle(b.x, b.y, b.r)
    })

    this._hurricanes.forEach(h => {
      if (h.expiresSt <= st) return
      g.lineStyle(3, 0x66ffee, 0.4)
      const wob = h.phase || 0
      g.beginPath()
      g.arc(h.x, h.y, h.r * 0.55, wob, wob + Math.PI * 1.25, false)
      g.strokePath()
    })

    this._blackHoles.forEach(bh => {
      if (bh.expiresSt <= st) return
      g.fillStyle(0x110022, 0.45)
      g.fillCircle(bh.x, bh.y, bh.r * 0.35)
      g.lineStyle(2, 0x8844ff, 0.55)
      g.strokeCircle(bh.x, bh.y, bh.r)
    })
  }

  drawLaserFx(x0, y0, x1, y1) {
    const g = this.add.graphics().setDepth(8200)
    g.lineStyle(6, 0xffeeaa, 0.9)
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.strokePath()
    g.lineStyle(14, 0xffffaa, 0.25)
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.strokePath()

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 120,
      onComplete: () => g.destroy()
    })
  }

  buildHud() {
    const pad = 20

    // 暂停按钮
    this.pauseButton = this.add.rectangle(this.scale.width - 60, 60, 40, 40, 0x222222, 0.7)
      .setScrollFactor(0)
      .setDepth(25000)
      .setInteractive()
      .on("pointerdown", () => this.togglePause())
    this.add.text(this.scale.width - 60, 60, "⏸", { fontSize: "20px" })
      .setScrollFactor(0)
      .setDepth(25001)
      .setOrigin(0.5)

    // 玩家血条（固定在玩家头上）
    this.playerHpBarBg = this.add.rectangle(100, 100, 80, 5, 0x222222)
      .setDepth(8000)
      .setOrigin(0.5)
    this.playerHpBar = this.add.rectangle(100, 100, 80, 5, 0xdd2200)
      .setDepth(8001)
      .setOrigin(0.5)

    // 经验条（固定在屏幕下方）
    const expBarWidth = this.scale.width * 0.8
    this.expBarBg = this.add.rectangle(this.scale.width / 2, this.scale.height - 30, expBarWidth, 12, 0x222222)
      .setScrollFactor(0)
      .setDepth(25000)
      .setOrigin(0.5)
    this.expBar = this.add.rectangle(this.scale.width / 2, this.scale.height - 30, expBarWidth, 12, 0xffaa00)
      .setScrollFactor(0)
      .setDepth(25001)
      .setOrigin(0.5)

    this.levelText = this.add
      .text(this.scale.width * 0.1, this.scale.height - 30, "Lv.1", {
        fontSize: "14px",
        color: "#ffe08a"
      })
      .setScrollFactor(0)
      .setDepth(25002)
      .setOrigin(0, 0.5)

    this.hudHint = this.add
      .text(pad, pad, "WASD/方向键 · 拾取升级 · 触屏左下摇杆", {
        fontSize: "12px",
        color: "#aaa"
      })
      .setScrollFactor(0)
      .setDepth(5000)
      .setOrigin(0, 0)

    this.hudTime = this.add.text(pad, pad + 24, "", {
      fontSize: "16px",
      color: "#a8d8ff"
    })
      .setScrollFactor(0)
      .setDepth(5000)
      .setOrigin(0, 0)

    this.refreshHud()
  }

  refreshHud() {
    // 更新血条
    const hpRatio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1)
    this.playerHpBar.width = 80 * hpRatio
    
    // 更新经验条
    const expRatio = Phaser.Math.Clamp(this.exp / this.expToNext, 0, 1)
    const expBarWidth = this.scale.width * 0.8
    this.expBar.width = expBarWidth * expRatio
    this.levelText?.setText(`Lv.${this.level}`)
    
    this.hudTime.setText(`生存时间 ${Math.floor(this.survivalTime)} 秒`)
  }

  update(time, delta) {
    if (!this.selectUiOpen && !this.gameOverActive && !this.isPaused && this.physics.world.isPaused) {
      this.physics.resume()
    }

    if (this.player?.sprite && !this.gameOverActive) this.ensurePlayerRenderable()

    if (this.net?.connected && this.player?.sprite?.body) {
      const m = this.player.moveSpeed || 1
      const vx = this.player.sprite.body.velocity.x
      const vy = this.player.sprite.body.velocity.y
      this.net.sendInput(vx / m, vy / m)
      this.net.applyRemotePlayerForChase(this)
    }

    if (this.bgTile) {
      this.bgTile.tilePositionX = this.cameras.main.scrollX * 0.06
      this.bgTile.tilePositionY = this.cameras.main.scrollY * 0.06
    }

    // 使血条跟随玩家移动
    if (this.playerHpBar && this.playerHpBarBg && this.player.sprite) {
      this.playerHpBar.setPosition(this.player.sprite.x, this.player.sprite.y - 30)
      this.playerHpBarBg.setPosition(this.player.sprite.x, this.player.sprite.y - 30)
    }

    this.player.update()
    this.player.syncBodySize?.()
    this.spawnSystem.update(time, delta)

    this.updateGroundZonesLogic()
    this.tickWorldZonesAndDots()
    this.updateBulletEmojiLabels()
    this.cleanupProjectiles()
    this.fallbackCombatChecks()
    this.updatePickupsMagnet(delta)
    this.updateBossBar()

    if (!this.selectUiOpen && !this.gameOverActive && !this.isPaused) {
      this.survivalTime += delta / 1000
      this.refreshHud()
    }
  }

  updatePickupsMagnet(delta) {
    const p = this.player
    const r = p.magnetRadius
    const px = p.sprite.x
    const py = p.sprite.y
    const speed = 0.45 * (delta / 16)

    this.pickups.getChildren().forEach(pu => {
      if (!pu.active) return
      const d = Phaser.Math.Distance.Between(pu.x, pu.y, px, py)
      if (!pu.magnetized && pu.pickupType === "exp" && d <= r * 1.25) pu.magnetized = true
      if (!pu.magnetized && d > r) return
      if (d < 4) {
        this.collectPickup(pu)
        return
      }
      pu.x += ((px - pu.x) / d) * speed * 12
      pu.y += ((py - pu.y) / d) * speed * 12
    })
  }

  gainExp(amount) {
    this.exp += amount

    if (this.exp >= this.expToNext) {
      this.exp -= this.expToNext
      this.level++

      this.expToNext = Math.floor(30 + this.level * 5)
      this.levelUp()
    }

    this.refreshHud()
  }

  updateBulletEmojiLabels() {
    this.bullets.getChildren().forEach(b => {
      if (!b.emojiLabel) return
      if (!b.active) {
        b.emojiLabel.destroy()
        b.emojiLabel = null
        return
      }
      b.emojiLabel.setPosition(b.x, b.y)
    })
  }

  cleanupProjectiles() {
    const now = this.time.now
    const margin = 120
    const inWorld = obj =>
      obj.x >= -margin && obj.y >= -margin && obj.x <= this.WORLD_W + margin && obj.y <= this.WORLD_H + margin

    this.bullets.getChildren().forEach(b => {
      if (!b.active) return
      if ((b.lifeEnd && now >= b.lifeEnd) || !inWorld(b)) b.destroy()
    })
    this.bossBullets.getChildren().forEach(b => {
      if (!b.active) return
      if ((b.lifeEnd && now >= b.lifeEnd) || !inWorld(b)) b.destroy()
    })
  }

  ensurePlayerRenderable() {
    const s = this.player.sprite
    if (!s.active) s.setActive(true)
    if (!s.visible) s.setVisible(true)
    if (!Number.isFinite(s.alpha) || s.alpha < 0.95) s.setAlpha(1)
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) s.setPosition(this.WORLD_W * 0.5, this.WORLD_H * 0.5)
    if (!Number.isFinite(s.scaleX) || s.scaleX < 0.01) s.setScale(this.player.baseScale || 0.2)
    if (s.depth < 50) s.setDepth(500)
    const desiredKey = this.selectedCharacterKey
    if (desiredKey && this.textures.exists(desiredKey) && s.texture?.key !== desiredKey) {
      s.setTexture(desiredKey)
    }
    if (!s.body) this.physics.world.enable(s)
    if (s.body && s.body.enable === false) s.body.setEnable(true)
  }

  fallbackCombatChecks() {
    const s = this.player?.sprite
    if (!s?.active || this.selectUiOpen || this.gameOverActive) return

    this.bossBullets.getChildren().forEach(b => {
      if (!b.active) return
      const d = Phaser.Math.Distance.Between(b.x, b.y, s.x, s.y)
      const hitR = ((b.displayWidth || 16) + (s.displayWidth || 26)) * 0.32
      if (d > hitR) return
      const beforeHp = this.player.hp
      const beforeSh = this.player.currentShield
      this.player.takeDamage(18)
      b.destroy()
      if (this.player.hp < beforeHp || this.player.currentShield < beforeSh) this.flashPlayerHit()
      this.refreshHud()
      if (this.player.hp <= 0) this.showGameOver()
    })
  }

  levelUp() {
    this.selectUiOpen = true
    this.physics.pause()

    const sys = this.player.skillSystem
    const picks = []

    for (const key of Object.keys(sys.weapons)) {
      const w = sys.weapons[key]
      if (w.level < w.maxLevel) {
        picks.push({ kind: "weapon", key, meta: w })
      }
    }
    for (const key of Object.keys(sys.skills)) {
      const s = sys.skills[key]
      if (s.level < s.maxLevel) {
        picks.push({ kind: "skill", key, meta: s })
      }
    }

    if (picks.length === 0) {
      this.selectUiOpen = false
      this.physics.resume()
      return
    }

    const choices = Phaser.Utils.Array.Shuffle(picks).slice(0, 3)

    this.showUpgradePick(choices)
  }

  showUpgradePick(choices) {
    this.destroySkillPickUi()

    const cam = this.cameras.main
    const cx = cam.width / 2
    const cy = cam.height / 2

    this.skillPickLayers = []

    const bg = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.72)
      .setScrollFactor(0)
      .setDepth(12000)

    this.skillPickLayers.push(bg)

    choices.forEach((c, i) => {
      const y = cy - 80 + i * 96

      const label = c.kind === "weapon" ? "[武器]" : "[技能]"
      const name = c.kind === "weapon" ? WEAPON_META[c.key]?.name : SKILL_META[c.key]?.name
      const desc = c.kind === "weapon" ? WEAPON_META[c.key]?.desc : SKILL_META[c.key]?.desc

      const rect = this.add.rectangle(cx, y, 360, 84, 0x1a1a2e, 0.95)
        .setScrollFactor(0)
        .setDepth(12001)
        .setInteractive({ useHandCursor: true })

      const text = this.add
        .text(
          cx,
          y,
          `${label} ${name}\n${desc}\nLv.${c.meta.level}/${c.meta.maxLevel}`,
          {
            fontSize: "15px",
            color: "#fff",
            align: "center"
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(12002)

      rect.on("pointerdown", () => {
        this.pickUpgrade(c.kind, c.key)
      })

      this.skillPickLayers.push(rect, text)
    })
  }

  destroySkillPickUi() {
    if (this.skillPickLayers) {
      this.skillPickLayers.forEach(obj => obj?.destroy?.())
    }
    this.skillPickLayers = null
  }

  pickUpgrade(kind, key) {
    const ok = this.player.skillSystem.upgrade(key, kind)
    if (!ok) return

    this.selectUiOpen = false
    this.physics.resume()

    this.destroySkillPickUi()

    this.refreshDualPanels()
    this.refreshHud()
  }

  buildDualPanels() {
    const cam = this.cameras.main
    const size = 40
    const pad = 6
    const startX = cam.width - 16
    const row1Y = 16
    const row2Y = 64

    this.weaponSlots = []
    this.skillPanelSlots = []

    for (let i = 0; i < WEAPON_UI_SLOT_COUNT; i++) {
      const x = startX - i * (size + pad)

      const bg = this.add
        .rectangle(x, row1Y, size, size, 0x141414, 0.65)
        .setScrollFactor(0)
        .setDepth(20000)
        .setOrigin(1, 0)

      const icon = this.add
        .text(x - size / 2, row1Y + 5, "", { fontSize: "17px" })
        .setScrollFactor(0)
        .setDepth(20001)
        .setOrigin(0.5, 0)

      const lvl = this.add
        .text(x - 3, row1Y + size - 12, "", {
          fontSize: "11px",
          color: "#ffcc88"
        })
        .setScrollFactor(0)
        .setDepth(20001)
        .setOrigin(1, 0)

      this.weaponSlots.push({ slotIndex: i, bg, icon, lvl })
    }

    for (let i = 0; i < SKILL_UI_SLOT_COUNT; i++) {
      const x = startX - i * (size + pad)

      const bg = this.add.rectangle(x, row2Y, size, size, 0x101a2a, 0.92)
        .setScrollFactor(0)
        .setDepth(20000)
        .setOrigin(1, 0)

      const icon = this.add
        .text(x - size / 2, row2Y + 5, "", { fontSize: "17px" })
        .setScrollFactor(0)
        .setDepth(20001)
        .setOrigin(0.5, 0)

      const lvl = this.add
        .text(x - 3, row2Y + size - 12, "", {
          fontSize: "11px",
          color: "#a8d8ff"
        })
        .setScrollFactor(0)
        .setDepth(20001)
        .setOrigin(1, 0)

      this.skillPanelSlots.push({ slotIndex: i, bg, icon, lvl })
    }

    this.refreshDualPanels()
  }

  onResize(gameSize) {
    const { width, height } = gameSize
    this.cameras.resize(width, height)
    this.updateUIPosition(width, height)
  }

  updateUIPosition(width, height) {
    const size = 40
    const pad = 6
    const startX = width - 16
    const row1Y = 16
    const row2Y = 64

    this.weaponSlots?.forEach((slot, i) => {
      const x = startX - i * (size + pad)
      slot.bg.setPosition(x, row1Y)
      slot.icon.setPosition(x - size / 2, row1Y + 5)
      slot.lvl.setPosition(x - 3, row1Y + size - 12)
    })

    this.skillPanelSlots?.forEach((slot, i) => {
      const x = startX - i * (size + pad)
      slot.bg.setPosition(x, row2Y)
      slot.icon.setPosition(x - size / 2, row2Y + 5)
      slot.lvl.setPosition(x - 3, row2Y + size - 12)
    })

    this.hudHint.setPosition(20, 20)
    this.hudTime.setPosition(20, 52)
    this.expBarBg?.setPosition(width / 2, height - 30)
    this.expBar?.setPosition(width / 2, height - 30)
    this.levelText?.setPosition(width * 0.1, height - 30)

    if (this.bossHpBarBg) {
      const cx = width / 2
      this.bossHpBarBg.setPosition(cx - 150, 22)
      this.bossHpBar.setPosition(cx - 150, 22)
    }
  }

  refreshDualPanels() {
    const sys = this.player.skillSystem

    for (let i = 0; i < WEAPON_UI_SLOT_COUNT; i++) {
      const slot = this.weaponSlots[i]
      const key = sys.weaponSlotOrder[i]
      if (!key) {
        slot.bg.setFillStyle(0x141414, 0.65)
        slot.icon.setText("")
        slot.lvl.setText("")
        continue
      }
      const lv = sys.getWeaponLevel(key)
      slot.bg.setFillStyle(0x2a1a10, 0.92)
      if (lv < 1) {
        slot.icon.setText("")
        slot.lvl.setText("")
      } else {
        slot.icon.setText(this.getWeaponIcon(key))
        slot.lvl.setText(String(lv))
      }
    }

    for (let i = 0; i < SKILL_UI_SLOT_COUNT; i++) {
      const slot = this.skillPanelSlots[i]
      const key = sys.skillSlotOrder[i]
      if (!key) {
        slot.icon.setText("")
        slot.lvl.setText("")
        continue
      }
      const lv = sys.getLevel(key)
      if (lv < 1) {
        slot.icon.setText("")
        slot.lvl.setText("")
      } else {
        slot.icon.setText(this.getSkillIcon(key))
        slot.lvl.setText(String(lv))
      }
    }
  }

  getWeaponIcon(key) {
    const map = {
      arc: "⌒",
      trackingVolley: "※",
      laser: "│",
      groundZones: "◎",
      shieldWeapon: "▣",
      solarBurst: "☀",
      blizzard: "❄",
      hurricane: "🌀",
      courageSong: "▭",
      pixie: "🧚",
      blackHole: "◉",
      butterflyWing: "🦋",
      bulletString: "🔞"
    }
    return map[key] || "?"
  }

  getSkillIcon(key) {
    const map = {
      vitality: "♥",
      defense: "🛡",
      attack: "⚔",
      crit: "☆",
      projectileCount: "+",
      aoeRadius: "◎",
      skillTempo: "⏱",
      magnet: "🧲"
    }
    return map[key] || "?"
  }

  onEnemyDamaged(enemy, damage, isCrit, playHitFx = true) {
    if (playHitFx) {
      this.flashEnemyHit(enemy)
      this.audioHub?.playSfx("hit_enemy", 0.28)
    }
    this.spawnDamageText(enemy.x, enemy.y, damage, isCrit)
  }

  resolveEnemyDeath(enemy) {
    if (!enemy.active || enemy.hp > 0) return

    this.spawnLoot(enemy.x, enemy.y)

    if (enemy === this.boss) {
      this.boss = null
      if (this.bossAttackTimer) {
        this.bossAttackTimer.remove()
        this.bossAttackTimer = null
      }
      this.defeatedBosses++
      if (this.defeatedBosses >= 3) {
        this.showVictory()
      }
    }

    enemy.destroy()
  }

  flashEnemyHit(enemy) {
    if (!enemy?.setTint) return
    const base = enemy._baseTint ?? 0xffffff
    enemy.setTint(0xff3333)
    this.time.delayedCall(70, () => {
      if (enemy.active) enemy.setTint(base)
    })
  }

  spawnDamageText(x, y, damage, isCrit) {
    const ox = Phaser.Math.Between(-10, 10)
    const col = isCrit ? "#ffdd44" : "#ffffff"
    const size = isCrit ? "22px" : "16px"
    const prefix = isCrit ? "暴击 " : ""

    const t = this.add
      .text(x + ox, y - 8, `${prefix}${damage}`, {
        fontSize: size,
        color: col,
        stroke: "#000000",
        strokeThickness: isCrit ? 4 : 2
      })
      .setOrigin(0.5, 1)
      .setDepth(9000)

    this.tweens.add({
      targets: t,
      y: y - 42,
      alpha: 0,
      duration: 650,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy()
    })
  }

  showMeleeArcFx(cx, cy, facing, range) {
    const g = this.add.graphics()
    g.setDepth(8000)

    const half = (Math.PI * 2) / 3
    const a0 = facing - half
    const a1 = facing + half

    g.lineStyle(5, 0xffee88, 0.95)
    g.beginPath()
    g.arc(cx, cy, range * 0.92, a0, a1, false)
    g.strokePath()

    g.lineStyle(2, 0xffffff, 0.5)
    g.beginPath()
    g.arc(cx, cy, range * 0.45, a0, a1, false)
    g.strokePath()

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 160,
      delay: 40,
      onComplete: () => g.destroy()
    })
  }

  drawMapBoundaries() {
    const m = this.playMargin
    const innerW = this.WORLD_W - 2 * m
    const innerH = this.WORLD_H - 2 * m

    const g = this.add.graphics()
    g.lineStyle(2, 0x444444, 0.5)
    g.strokeRect(0, 0, this.WORLD_W, this.WORLD_H)

    g.lineStyle(4, 0xff3333, 0.95)
    g.strokeRect(m, m, innerW, innerH)
  }

  createBossBar() {
    const cam = this.cameras.main
    const barW = 300
    const cx = cam.width / 2 - barW / 2

    this.bossHpBarBg = this.add
      .rectangle(cx, 22, barW, 14, 0x222222)
      .setScrollFactor(0)
      .setDepth(20000)
      .setOrigin(0, 0.5)

    this.bossHpBar = this.add
      .rectangle(cx, 22, barW, 14, 0xdd2200)
      .setScrollFactor(0)
      .setDepth(20001)
      .setOrigin(0, 0.5)
  }

  getUniformCharacterScale(textureKey, targetHeight = 54) {
    const source = this.textures.get(textureKey)?.getSourceImage?.()
    if (!source?.height) return 0.24
    return targetHeight / source.height
  }

  updateBossBar() {
    if (!this.boss || !this.boss.active) {
      this.bossHpBar?.setVisible(false)
      this.bossHpBarBg?.setVisible(false)
      return
    }

    const ratio = Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1)
    const fullW = 300

    this.bossHpBar.width = fullW * ratio
    this.bossHpBar.setVisible(true)
    this.bossHpBarBg.setVisible(true)
  }

  flashPlayerHit() {
    const s = this.player.sprite
    s.setTint(0xff6666)
    const char = this.registry.get("character")
    this.audioHub?.playCharacterSfx(char, "hit", 0.5)
    this.time.delayedCall(120, () => s.clearTint())
  }

  spawnLoot(x, y) {
    const expOrb = this.physics.add.sprite(x, y, "__WHITE")
    expOrb.setTint(0x55ffdd)
    expOrb.setDisplaySize(16, 16)
    expOrb.setAlpha(0.95)
    expOrb.pickupType = "exp"
    expOrb.pickupValue = 10
    if (expOrb.body) expOrb.body.setCircle(8)
    this.pickups.add(expOrb)
    this.tweens.add({
      targets: expOrb,
      scale: { from: 0.6, to: 1 },
      duration: 220,
      ease: "Back.easeOut"
    })

    if (Math.random() < 0.22) {
      const heal = this.physics.add.sprite(x + Phaser.Math.Between(14, 26), y + Phaser.Math.Between(-8, 8), "__WHITE")
      heal.setTint(0xff66aa)
      heal.setDisplaySize(18, 18)
      heal.setAlpha(0.95)
      heal.pickupType = "heal"
      heal.pickupValue = 28
      if (heal.body) heal.body.setCircle(9)
      this.pickups.add(heal)
      this.tweens.add({
        targets: heal,
        scale: { from: 0.5, to: 1 },
        y: heal.y - 4,
        duration: 280,
        ease: "Sine.easeOut"
      })
    }

    const bossAlive = this.boss && this.boss.active
    if (!bossAlive) {
      const r = Math.random()
      if (r < 0.012) {
        const mag = this.physics.add.sprite(x - 20, y, "__WHITE")
        mag.setTint(0xffee44)
        mag.setDisplaySize(20, 20)
        mag.pickupType = "magnetAll"
        mag.pickupValue = 0
        if (mag.body) mag.body.setCircle(10)
        this.pickups.add(mag)
      } else if (r < 0.024) {
        const k = this.physics.add.sprite(x + 24, y, "__WHITE")
        k.setTint(0xff4444)
        k.setDisplaySize(20, 20)
        k.pickupType = "killAll"
        k.pickupValue = 0
        if (k.body) k.body.setCircle(10)
        this.pickups.add(k)
      } else if (r < 0.09) {
        const g = this.physics.add.sprite(x - 10, y + 12, "__WHITE")
        g.setTint(0xffdd33)
        g.setDisplaySize(14, 14)
        g.pickupType = "gold"
        g.pickupValue = 1 + Math.floor(Math.random() * 3)
        if (g.body) g.body.setCircle(7)
        this.pickups.add(g)
      }
    }
  }

togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
        this.physics.pause();

        const cam = this.cameras.main;
        const cx = cam.width / 2;
        const cy = cam.height / 2;

        // 用一个数组收纳所有暂停 UI 元素，方便统一销毁
        const elements = [];

        // 背景遮罩
        const bg = this.add.rectangle(cx, cy, cam.width * 0.8, cam.height * 0.6, 0x1a1a2e, 0.95)
            .setScrollFactor(0)
            .setDepth(14000)
            .setOrigin(0.5);
        elements.push(bg);

        // 标题
        const title = this.add.text(cx, cy - 80, "游戏暂停", {
            fontSize: "32px",
            color: "#ffffff"
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(14001);
        elements.push(title);

        // 继续按钮（矩形 + 文字）
        const continueBtn = this.add.rectangle(cx, cy, 200, 50, 0x2a4a2e, 0.8)
            .setScrollFactor(0)
            .setDepth(14001)
            .setInteractive();
        const continueText = this.add.text(cx, cy, "继续游戏", {
            fontSize: "18px",
            color: "#ffffff"
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(14002);
        elements.push(continueBtn, continueText);

        continueBtn.on("pointerdown", () => {
            this.isPaused = false;
            this.physics.resume();
            // 销毁所有暂停 UI
            elements.forEach(el => el.destroy());
        });

        // 重新开始按钮
        const restartBtn = this.add.rectangle(cx, cy + 70, 200, 50, 0x4a2a2e, 0.8)
            .setScrollFactor(0)
            .setDepth(14001)
            .setInteractive();
        const restartText = this.add.text(cx, cy + 70, "重新开始", {
            fontSize: "18px",
            color: "#ffffff"
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(14002);
        elements.push(restartBtn, restartText);

        restartBtn.on("pointerdown", () => {
            // 跳转到模式选择场景（注意键名是否正确）
            this.scene.start("ModeScene");
        });

        // 保存元素数组以便外部可能需要访问（可选）
        this.pauseMenuElements = elements;
    } else {
        this.physics.resume();
        // 如果外部通过其他方式取消暂停，也要销毁 UI
        if (this.pauseMenuElements) {
            this.pauseMenuElements.forEach(el => el.destroy());
            this.pauseMenuElements = null;
        }
    }
}

  showVictory() {
    if (this.gameOverActive) return

    this.gameOverActive = true
    saveGold(loadGold() + (this.runGold || 0))
    this.runGold = 0

    this.physics.pause()

    const cam = this.cameras.main
    const cx = cam.width / 2
    const cy = cam.height / 2

    this.add.rectangle(cx, cy, cam.width, cam.height, 0x051a05, 0.88)
      .setScrollFactor(0)
      .setDepth(13000)

    this.add
      .text(cx, cy - 24, "胜利！", {
        fontSize: "36px",
        color: "#88ff88"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(13001)

    // 重新开始按钮
    this.add.rectangle(cx, cy + 28, 200, 50, 0x2a4a2e, 0.8)
      .setScrollFactor(0)
      .setDepth(13001)
      .setInteractive()
      .on("pointerdown", () => {
        this.scene.start("ModeScene")
      })

    this.add
      .text(cx, cy + 28, "重新开始", {
        fontSize: "18px",
        color: "#ffffff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(13002)
  }

  showGameOver() {
    if (this.gameOverActive) return

    this.gameOverActive = true
    saveGold(loadGold() + (this.runGold || 0))
    this.runGold = 0

    this.physics.pause()

    const cam = this.cameras.main
    const cx = cam.width / 2
    const cy = cam.height / 2

    this.add.rectangle(cx, cy, cam.width, cam.height, 0x1a0505, 0.88)
      .setScrollFactor(0)
      .setDepth(13000)

    this.add
      .text(cx, cy - 24, "游戏结束", {
        fontSize: "36px",
        color: "#ff8888"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(13001)

    // 重新开始按钮
    this.add.rectangle(cx, cy + 28, 200, 50, 0x4a2a2e, 0.8)
      .setScrollFactor(0)
      .setDepth(13001)
      .setInteractive()
      .on("pointerdown", () => {
        this.scene.start("ModeScene")
      })

    this.add
      .text(cx, cy + 28, "重新开始", {
        fontSize: "18px",
        color: "#ffffff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(13002)
  }
}
