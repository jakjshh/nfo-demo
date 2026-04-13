export default class SpawnSystem {
  constructor(scene) {
    this.scene = scene
    this.lastSpawn = 0
    this.lastWaveTime = 0
    this.wave = 1
    this.bossSpawnTimes = [60, 180, 300] // 1min, 3min, 5min
    this.spawnedBosses = 0
  }

  getChasePoints(scene, player) {
    const pts = [{ x: player.x, y: player.y }]
    if (scene.registry.get("playMode") === "online" && scene.net?.remotePlayer?.active) {
      pts.push({ x: scene.net.remotePlayer.x, y: scene.net.remotePlayer.y })
    }
    return pts
  }

  pickNearestPoint(enemy, pts) {
    let best = pts[0]
    let bestD = Infinity
    for (const p of pts) {
      const d = (p.x - enemy.x) ** 2 + (p.y - enemy.y) ** 2
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return best
  }

  update(time, delta) {
    const scene = this.scene

    if (scene.selectUiOpen || scene.gameOverActive || scene.physics.world.isPaused) {
      this.lastSpawn = time
      return
    }

    const player = scene.player.sprite
    const st = scene.survivalTime
    const chasePts = this.getChasePoints(scene, player)

    scene.enemies.getChildren().forEach(enemy => {
      if (!enemy.active) return
      const body = enemy.body
      if (!body) return

      if (enemy.freezeUntil != null && st < enemy.freezeUntil) {
        body.setVelocity(0, 0)
        return
      }

      let sp = enemy.speed || 60
      if (enemy.slowUntil != null && st < enemy.slowUntil) {
        sp *= enemy.slowMult ?? 0.42
      }

      const t = this.pickNearestPoint(enemy, chasePts)
      const dx = t.x - enemy.x
      const dy = t.y - enemy.y
      const len = Math.hypot(dx, dy) || 1
      body.setVelocity((dx / len) * sp, (dy / len) * sp)
    })

    const t = scene.survivalTime

    if (t - this.lastWaveTime > 30) {
      this.wave++
      this.lastWaveTime = t
    }

    if (!scene.boss && this.spawnedBosses < this.bossSpawnTimes.length && t >= this.bossSpawnTimes[this.spawnedBosses] && t > 5) {
      this.spawnBoss()
      scene.onBossSpawned?.()
      this.spawnedBosses++
    }

    const spawnInterval = Math.max(300, 1200 - t * 20)

    if (time - this.lastSpawn < spawnInterval) return
    this.lastSpawn = time

    const count = 1 + Math.floor(this.wave / 2)

    for (let i = 0; i < count; i++) {
      this.spawnEnemy()
    }
  }

  spawnEnemy() {
    const scene = this.scene
    const t = scene.survivalTime

    const typeRoll = Math.random()

    let type = "normal"
    if (typeRoll > 0.85) type = "fast"
    else if (typeRoll > 0.7) type = "tank"
    else if (typeRoll > 0.55) type = "split"

    const edge = Math.floor(Math.random() * 4)
    const w = scene.WORLD_W
    const h = scene.WORLD_H

    let x, y
    if (edge === 0) {
      x = 0
      y = Math.random() * h
    }
    if (edge === 1) {
      x = w
      y = Math.random() * h
    }
    if (edge === 2) {
      x = Math.random() * w
      y = 0
    }
    if (edge === 3) {
      x = Math.random() * w
      y = h
    }

    const enemy = scene.physics.add.sprite(x, y, "__WHITE")

    const baseSpeed = 50 + t * 2
    const playerSpeed = scene.player.moveSpeed

    enemy.type = type

    if (type === "fast") {
      enemy.setTint(0xffaa00)
      enemy.hp = 20
      enemy.speed = Math.min(baseSpeed + 60, playerSpeed * 0.95)
      enemy.setDisplaySize(20, 20)
    } else if (type === "tank") {
      enemy.setTint(0x8888ff)
      enemy.hp = 80
      enemy.speed = Math.min(baseSpeed * 0.6, playerSpeed * 0.6)
      enemy.setDisplaySize(40, 40)
    } else if (type === "split") {
      enemy.setTint(0xff44ff)
      enemy.hp = 30
      enemy.speed = Math.min(baseSpeed + 20, playerSpeed * 0.85)
      enemy.setDisplaySize(26, 26)
    } else {
      enemy.setTint(0xff0000)
      enemy.hp = 40
      enemy.speed = Math.min(baseSpeed, playerSpeed * 0.9)
      enemy.setDisplaySize(26, 26)
    }

    enemy._baseTint = enemy.tintTopLeft ?? 0xffffff

    scene.enemies.add(enemy)
  }

  spawnBoss() {
    const scene = this.scene

    const boss = scene.physics.add.sprite(scene.player.sprite.x + 200, 0, "__WHITE")
      .setTint(0xaa0000)
      .setDisplaySize(90, 90)

    boss._baseTint = 0xaa0000
    boss.isBoss = true
    boss.maxHp = 800
    boss.hp = boss.maxHp
    boss.speed = 40

    scene.enemies.add(boss)
    scene.boss = boss

    scene.createBossBar()
  }
}
