/**
 * 音效 / BGM：把文件放到 public/sounds/ 下即可自动加载；缺失则静默跳过。
 * 推荐格式：ogg 或 mp3（文件名见下方常量）
 */
const FILES = {
  bgm: "sounds/bgm.ogg",
  hit_player: "sounds/hit_player.ogg",
  hit_enemy: "sounds/hit_enemy.ogg",
  weapon: "sounds/weapon_swish.ogg",
  pickup: "sounds/pickup.ogg",
  gold: "sounds/coin.ogg"
}

export default class AudioHub {
  constructor(scene) {
    this.scene = scene
    this.bgm = null
    this.loaded = false
  }

  preload() {
    const load = this.scene.load
    Object.entries(FILES).forEach(([key, path]) => {
      load.audio(`aud_${key}`, path)
    })
  }

  boot() {
    this.loaded = true
    Object.keys(FILES).forEach(key => {
      if (!this.scene.cache.audio.exists(`aud_${key}`)) {
        /* 文件不存在时 Phaser 可能未注册 */
      }
    })
  }

  playSfx(key, vol = 0.45) {
    if (!this.loaded || !this.scene.sound) return
    const k = `aud_${key}`
    if (!this.scene.cache.audio.exists(k)) return
    this.scene.sound.play(k, { volume: vol })
  }

  startBgm(vol = 0.22) {
    if (!this.loaded || !this.scene.sound) return
    if (!this.scene.cache.audio.exists("aud_bgm")) return
    if (this.bgm) return
    this.bgm = this.scene.sound.add("aud_bgm", { loop: true, volume: vol })
    this.bgm.play()
  }

  stopBgm() {
    if (this.bgm) {
      this.bgm.stop()
      this.bgm.destroy()
      this.bgm = null
    }
  }
}
