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
  gold: "sounds/coin.ogg",
  // 角色特定音效
  //hit_player_ranger: "sounds/hit_player_ranger.ogg",
  //hit_player_warrior: "sounds/hit_player_warrior.ogg",
  //hit_player_mage: "sounds/hit_player_mage.ogg",
  //hit_player_butterfly: "sounds/hit_player_butterfly.ogg",
  hit_player_yyxr: "sounds/hit_yyxr.ogg",
  hit_ranger: "sounds/hit_ranger.ogg",
  hit_melee: "sounds/hit_melee.ogg",
  hit_priest: "sounds/hit_priest.ogg",
  hit_mage: "sounds/hit_mage.ogg",
  hit_shieldbearer: "sounds/hit_shieldbearer.ogg",
  hit_yyxr: "sounds/hit_yyxr.ogg",
  hit_butterfly: "sounds/hit_butterfly.ogg",
  skill_ranger: "sounds/skill_ranger.ogg",
  skill_melee: "sounds/skill_melee.ogg",
  skill_priest: "sounds/skill_priest.ogg",
  skill_mage: "sounds/skill_mage.ogg",
  skill_shieldbearer: "sounds/skill_shieldbearer.ogg",
  skill_yyxr: "sounds/skill_yyxr.ogg",
  skill_butterfly: "sounds/skill_butterfly.ogg"
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

  playCharacterSfx(charId, key, vol = 0.45) {
    if (!this.loaded || !this.scene.sound) return
    const normalized = String(charId || "").trim()
    const specific = `aud_${key}_${normalized}`
    if (normalized && this.scene.cache.audio.exists(specific)) {
      this.scene.sound.play(specific, { volume: vol })
      return
    }
    const aliasSpecific = `aud_${key}_player_${normalized}`
    if (normalized && this.scene.cache.audio.exists(aliasSpecific)) {
      this.scene.sound.play(aliasSpecific, { volume: vol })
      return
    }
    const defaultKey = `aud_${key}`
    if (this.scene.cache.audio.exists(defaultKey)) {
      this.scene.sound.play(defaultKey, { volume: vol })
    }
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
