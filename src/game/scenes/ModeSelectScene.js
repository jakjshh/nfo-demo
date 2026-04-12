import * as Phaser from "phaser"

/** 入口：单机 / 联机（联机会尝试连 WebSocket，怪物索敌就近含队友位置） */
export default class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super("ModeScene")
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    const cx = w / 2
    const cy = h / 2

    this.add
      .text(cx, cy - 100, "游戏模式", { fontSize: "32px", color: "#fff" })
      .setOrigin(0.5)

    const solo = this.add
      .rectangle(cx, cy - 20, 280, 56, 0x2a4a2a)
      .setInteractive({ useHandCursor: true })
    this.add
      .text(cx, cy - 20, "单机", { fontSize: "22px", color: "#cfe" })
      .setOrigin(0.5)

    const online = this.add
      .rectangle(cx, cy + 56, 280, 56, 0x2a2a4a)
      .setInteractive({ useHandCursor: true })
    this.add
      .text(cx, cy + 56, "联机（用不了 不会搞 别点）", { fontSize: "20px", color: "#ccf" })
      .setOrigin(0.5)

    solo.on("pointerdown", () => {
      this.registry.set("playMode", "solo")
      this.scene.start("SelectScene")
    })

    online.on("pointerdown", () => {
      this.registry.set("playMode", "online")
      this.scene.start("SelectScene")
    })

    this.add
      .text(cx, cy + 130, "联机需运行 server（见 server/README.md）", {
        fontSize: "12px",
        color: "#888"
      })
      .setOrigin(0.5)
  }
}
