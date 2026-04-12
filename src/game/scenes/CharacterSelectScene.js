import * as Phaser from "phaser"
import { Characters } from "../data/CharacterConfig"
import { loadGold } from "../data/persist"

/**
 * 选角：列表可滚动（滚轮 / 触屏拖动）、方向键移动高亮、Enter 确认。
 * 卡片本身可点击（移动端友好）。
 */
export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super("SelectScene")
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    const cx = w / 2

    this.scrollY = 0
    this.selectedIndex = 0
    this.charKeys = Object.keys(Characters)
    this.rowH = Math.min(78, Math.max(64, Math.floor(h / (this.charKeys.length + 3))))
    this.listTop = 100
    this.listBottomPad = 36
    this.contentHeight = this.listTop + this.charKeys.length * this.rowH + this.listBottomPad
    this.maxScroll = Math.max(0, this.contentHeight - h + 24)

    this.add
      .text(cx, 36, "选择角色", { fontSize: `${Math.min(28, w * 0.06)}px`, color: "#fff" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    this.add
      .text(cx, 64, `↑↓ · Enter 开战 · T/育成 技能树 · 持有金币 ${loadGold()}`, {
        fontSize: "12px",
        color: "#8899aa"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    this.cardEntries = []

    this.charKeys.forEach((key, i) => {
      const c = Characters[key]
      const y = this.listTop + i * this.rowH

      const card = this.add
        .rectangle(cx, y, Math.min(340, w - 32), this.rowH - 8, 0x222233)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(0, 0x000000, 0)

      const title = this.add
        .text(cx, y - 12, c.name, {
          fontSize: "18px",
          color: "#fff"
        })
        .setOrigin(0.5)

      const sub = this.add
        .text(cx, y + 14, "一堆bug不会修都别选直接选耀阳行者", {
          fontSize: "11px",
          color: "#8899aa"
        })
        .setOrigin(0.5)

      card.on("pointerdown", () => {
        this.selectedIndex = i
        this.refreshHighlight()
        this.registry.set("character", key)
        this.scene.start("GameScene")
      })

      const detailBtn = this.add
        .text(cx - Math.min(150, w * 0.22), y, "育成", {
          fontSize: "15px",
          color: "#8ad8ff"
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })

      detailBtn.on("pointerdown", pointer => {
        pointer.event?.stopPropagation?.()
        this.registry.set("detailCharacter", key)
        this.scene.start("DetailScene")
      })

      this.cardEntries.push({ key, card, title, sub, detailBtn, baseY: y })
    })

    this.dragging = false
    this.lastPointerY = 0

    this.input.on("pointerdown", p => {
      if (p.y < 90) return
      this.dragging = true
      this.lastPointerY = p.y
    })

    this.input.on("pointermove", p => {
      if (!this.dragging) return
      const dy = p.y - this.lastPointerY
      this.lastPointerY = p.y
      this.scrollY = Phaser.Math.Clamp(this.scrollY - dy, 0, this.maxScroll)
      this.layoutList()
    })

    this.input.on("pointerup", () => {
      this.dragging = false
    })

    this.input.on("wheel", (_pointer, _go, _dx, dy) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.35, 0, this.maxScroll)
      this.layoutList()
    })

    this.input.keyboard.on("keydown-UP", () => {
      this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex - 1, 0, this.charKeys.length - 1)
      this.ensureSelectionVisible()
      this.refreshHighlight()
    })

    this.input.keyboard.on("keydown-DOWN", () => {
      this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex + 1, 0, this.charKeys.length - 1)
      this.ensureSelectionVisible()
      this.refreshHighlight()
    })

    this.input.keyboard.on("keydown-ENTER", () => {
      const key = this.charKeys[this.selectedIndex]
      this.registry.set("character", key)
      this.scene.start("GameScene")
    })

    this.input.keyboard.on("keydown-T", () => {
      const key = this.charKeys[this.selectedIndex]
      this.registry.set("detailCharacter", key)
      this.scene.start("DetailScene")
    })

    this.layoutList()
    this.refreshHighlight()

    this.scale.on("resize", this.onResize, this)
  }

  onResize(gameSize) {
    const w = gameSize.width
    const h = gameSize.height
    const cx = w / 2
    this.rowH = Math.min(78, Math.max(64, Math.floor(h / (this.charKeys.length + 3))))
    this.contentHeight = this.listTop + this.charKeys.length * this.rowH + this.listBottomPad
    this.maxScroll = Math.max(0, this.contentHeight - h + 24)
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll)

    this.cardEntries.forEach((e, i) => {
      e.baseY = this.listTop + i * this.rowH
      e.card.setSize(Math.min(340, w - 32), this.rowH - 8)
    })

    this.layoutList()
    this.refreshHighlight()
  }

  ensureSelectionVisible() {
    const h = this.scale.height
    const y = this.cardEntries[this.selectedIndex]?.baseY ?? 0
    const visTop = this.scrollY + 88
    const visBottom = this.scrollY + h - 24
    if (y < visTop) this.scrollY = Math.max(0, y - 88)
    if (y > visBottom - this.rowH) this.scrollY = Math.min(this.maxScroll, y - h + this.rowH + 36)
    this.layoutList()
  }

  layoutList() {
    const cx = this.scale.width / 2
    const ox = Math.min(150, this.scale.width * 0.22)
    this.cardEntries.forEach(e => {
      const y = e.baseY - this.scrollY
      e.card.setPosition(cx, y)
      e.title.setPosition(cx, y - 12)
      e.sub.setPosition(cx, y + 14)
      if (e.detailBtn) e.detailBtn.setPosition(cx - ox, y)
    })
  }

  refreshHighlight() {
    this.cardEntries.forEach((e, i) => {
      const on = i === this.selectedIndex
      e.card.setFillStyle(on ? 0x334466 : 0x222233)
      e.card.setStrokeStyle(on ? 3 : 0, on ? 0xffcc66 : 0x000000, on ? 1 : 0)
    })
  }
}
