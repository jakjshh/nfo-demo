import * as Phaser from "phaser"

/** 入口：单机 / 联机（联机会尝试连 WebSocket，怪物索敌就近含队友位置） */
export default class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super("ModeScene")
  }

  create() {
    this.title = this.add.text(0, 0, "游戏模式", { color: "#fff" }).setOrigin(0.5)
    this.soloBtn = this.add.rectangle(0, 0, 280, 56, 0x2a4a2a).setInteractive({ useHandCursor: true })
    this.soloText = this.add.text(0, 0, "单机", { color: "#cfe" }).setOrigin(0.5)
    this.onlineBtn = this.add.rectangle(0, 0, 280, 56, 0x2a2a4a).setInteractive({ useHandCursor: true })
    this.onlineText = this.add.text(0, 0, "联机（开发中）", { color: "#ccf" }).setOrigin(0.5)
    this.tipText = this.add.text(0, 0, "联机需运行 server（见 server/README.md）", { color: "#888" }).setOrigin(0.5)

    this.soloBtn.on("pointerdown", () => {
      this.registry.set("playMode", "solo")
      this.scene.start("SelectScene")
    })

    this.onlineBtn.on("pointerdown", () => {
      this.registry.set("playMode", "online")
      this.scene.start("SelectScene")
    })

    this.onResize(this.scale.gameSize)
    this.scale.on("resize", this.onResize, this)
  }

  onResize(gameSize) {
    const w = gameSize.width
    const h = gameSize.height
    const cx = w / 2
    const cy = h / 2
    const compact = w < 640

    const btnW = Math.min(340, Math.max(220, w * 0.45))
    const btnH = Math.min(64, Math.max(48, h * 0.085))

    this.title.setPosition(cx, cy - h * 0.16).setFontSize(Math.max(24, Math.floor(w * 0.055)))
    this.soloBtn.setPosition(cx, cy - h * 0.03).setSize(btnW, btnH)
    this.soloText.setPosition(cx, cy - h * 0.03).setFontSize(Math.max(18, Math.floor(w * 0.035)))
    this.onlineBtn.setPosition(cx, cy + h * 0.09).setSize(btnW, btnH)
    this.onlineText.setPosition(cx, cy + h * 0.09).setFontSize(compact ? 14 : Math.max(16, Math.floor(w * 0.026)))
    this.tipText.setPosition(cx, cy + h * 0.22).setFontSize(Math.max(11, Math.floor(w * 0.018)))
  }
}
