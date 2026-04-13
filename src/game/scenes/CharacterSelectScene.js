import * as Phaser from "phaser"
import { Characters } from "../data/CharacterConfig"
import { Levels } from "../data/LevelConfig"
import { loadGold } from "../data/persist"

/**
 * 选角：列表可滚动（滚轮 / 触屏拖动）、方向键移动高亮、Enter 确认。
 * 卡片本身可点击（移动端友好）。
 */
export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super("SelectScene")
  }

  preload() {
    for (const key in Characters) {
      const path = Characters[key].imagePath
      if (path) {
        this.load.image(key, path)
      }
    }
  }

  create() {
    this.selectedIndex = 0
    this.charKeys = Object.keys(Characters)
    this.levelKeys = Object.keys(Levels)
    this.selectedLevelIndex = 0

    this.titleText = this.add.text(0, 0, "选择角色和关卡", { color: "#fff" }).setOrigin(0.5).setDepth(10)
    this.goldText = this.add.text(0, 0, `持有金币 ${loadGold()}`, { color: "#8899aa" }).setOrigin(0.5).setDepth(10)
    this.characterLabel = this.add.text(0, 0, "角色", { color: "#fff" }).setOrigin(0.5).setDepth(10)
    this.levelLabel = this.add.text(0, 0, "关卡", { color: "#fff" }).setOrigin(0.5).setDepth(10)

    this.characterPreview = this.add.rectangle(0, 0, 200, 120, 0x222233).setDepth(10)
    this.levelPreview = this.add.rectangle(0, 0, 200, 120, 0x222233).setDepth(10)
    const firstCharKey = this.charKeys[0]
    this.characterPreviewImage = this.add.image(0, 0, firstCharKey).setDepth(11)

    this.charLeftArrow = this.add.text(0, 0, "←", { color: "#fff" }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true })
    this.charRightArrow = this.add.text(0, 0, "→", { color: "#fff" }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true })
    this.levelLeftArrow = this.add.text(0, 0, "←", { color: "#fff" }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true })
    this.levelRightArrow = this.add.text(0, 0, "→", { color: "#fff" }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true })

    this.characterName = this.add.text(0, 0, "", { color: "#fff" }).setOrigin(0.5).setDepth(10)
    this.characterDescription = this.add.text(0, 0, "", { color: "#8899aa", align: "center" }).setOrigin(0.5).setDepth(10)
    this.levelName = this.add.text(0, 0, "", { color: "#fff" }).setOrigin(0.5).setDepth(10)
    this.levelDescription = this.add.text(0, 0, "", { color: "#8899aa", align: "center" }).setOrigin(0.5).setDepth(10)

    this.startButton = this.add.rectangle(0, 0, 220, 52, 0x2a4a2e, 0.8).setDepth(10).setInteractive({ useHandCursor: true })
    this.startButtonText = this.add.text(0, 0, "开始游戏", { color: "#ffffff" }).setOrigin(0.5).setDepth(11)
    this.detailButton = this.add.rectangle(0, 0, 120, 44, 0x2a2a4a, 0.8).setDepth(10).setInteractive({ useHandCursor: true })
    this.detailButtonText = this.add.text(0, 0, "育成", { color: "#8ad8ff" }).setOrigin(0.5).setDepth(11)

    this.startButton.on("pointerdown", () => {
      const charKey = this.charKeys[this.selectedIndex]
      const levelKey = this.levelKeys[this.selectedLevelIndex]
      this.registry.set("character", charKey)
      this.registry.set("level", levelKey)
      this.scene.start("GameScene")
    })

    this.detailButton.on("pointerdown", () => {
      const key = this.charKeys[this.selectedIndex]
      this.registry.set("detailCharacter", key)
      this.scene.start("DetailScene")
    })

    this.charLeftArrow.on("pointerdown", () => {
      this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex - 1, 0, this.charKeys.length - 1)
      this.updateCharacterPreview()
    })
    this.charRightArrow.on("pointerdown", () => {
      this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex + 1, 0, this.charKeys.length - 1)
      this.updateCharacterPreview()
    })
    this.levelLeftArrow.on("pointerdown", () => {
      this.selectedLevelIndex = Phaser.Math.Clamp(this.selectedLevelIndex - 1, 0, this.levelKeys.length - 1)
      this.updateLevelPreview()
    })
    this.levelRightArrow.on("pointerdown", () => {
      this.selectedLevelIndex = Phaser.Math.Clamp(this.selectedLevelIndex + 1, 0, this.levelKeys.length - 1)
      this.updateLevelPreview()
    })

    this.updateCharacterPreview()
    this.updateLevelPreview()
    this.onResize(this.scale.gameSize)
    this.scale.on("resize", this.onResize, this)
  }

  onResize(gameSize) {
    const w = gameSize.width
    const h = gameSize.height
    const cx = w / 2
    const isCompact = w < 720 || h < 700
    const titleSize = `${Math.max(20, Math.floor(w * 0.05))}px`
    const labelSize = `${Math.max(14, Math.floor(w * 0.03))}px`
    const bodySize = `${Math.max(11, Math.floor(w * 0.018))}px`
    const nameSize = `${Math.max(13, Math.floor(w * 0.022))}px`

    const charY = isCompact ? h * 0.26 : h * 0.3
    const levelY = isCompact ? h * 0.58 : h * 0.62
    const previewW = Math.min(260, Math.max(170, w * 0.32))
    const previewH = Math.min(160, Math.max(100, h * 0.18))
    const arrowGap = previewW * 0.62

    this.titleText.setPosition(cx, h * 0.06).setFontSize(titleSize)
    this.goldText.setPosition(cx, h * 0.105).setFontSize(bodySize)
    this.characterLabel.setPosition(cx, charY - previewH * 0.7).setFontSize(labelSize)
    this.levelLabel.setPosition(cx, levelY - previewH * 0.7).setFontSize(labelSize)

    this._previewFitW = previewW * 0.82
    this._previewFitH = previewH * 0.82
    this.characterPreview.setPosition(cx, charY).setSize(previewW, previewH)
    this.levelPreview.setPosition(cx, levelY).setSize(previewW, previewH)
    this.characterPreviewImage.setPosition(cx, charY)
    this.fitCharacterPreviewImage()

    this.charLeftArrow.setPosition(cx - arrowGap, charY).setFontSize(Math.max(22, Math.floor(w * 0.04)))
    this.charRightArrow.setPosition(cx + arrowGap, charY).setFontSize(Math.max(22, Math.floor(w * 0.04)))
    this.levelLeftArrow.setPosition(cx - arrowGap, levelY).setFontSize(Math.max(22, Math.floor(w * 0.04)))
    this.levelRightArrow.setPosition(cx + arrowGap, levelY).setFontSize(Math.max(22, Math.floor(w * 0.04)))

    this.characterName.setPosition(cx, charY + previewH * 0.62).setFontSize(nameSize)
    this.characterDescription
      .setPosition(cx, charY + previewH * 0.82)
      .setFontSize(bodySize)
      .setWordWrapWidth(previewW * 1.08)

    this.levelName.setPosition(cx, levelY + previewH * 0.62).setFontSize(nameSize)
    this.levelDescription
      .setPosition(cx, levelY + previewH * 0.82)
      .setFontSize(bodySize)
      .setWordWrapWidth(previewW * 1.08)

    this.startButton.setPosition(cx, h * 0.94).setSize(Math.min(240, w * 0.34), Math.max(42, h * 0.07))
    this.startButtonText.setPosition(cx, h * 0.94).setFontSize(labelSize)
    this.detailButton.setPosition(cx - Math.min(180, w * 0.26), h * 0.94).setSize(Math.min(130, w * 0.2), Math.max(38, h * 0.06))
    this.detailButtonText.setPosition(cx - Math.min(180, w * 0.26), h * 0.94).setFontSize(bodySize)
  }

  updateCharacterPreview() {
    const charKey = this.charKeys[this.selectedIndex]
    const character = Characters[charKey]
    this.characterName.setText(character.name)
    this.characterDescription.setText(character.description || "")
    if (this.characterPreviewImage) this.characterPreviewImage.setTexture(charKey)
    this.fitCharacterPreviewImage()
  }

  fitCharacterPreviewImage() {
    if (!this.characterPreviewImage) return
    const tex = this.characterPreviewImage.texture?.getSourceImage?.()
    const fw = this._previewFitW ?? 160
    const fh = this._previewFitH ?? 100
    if (!tex?.width || !tex?.height) {
      this.characterPreviewImage.setDisplaySize(fw, fh)
      return
    }
    const scale = Math.min(fw / tex.width, fh / tex.height)
    this.characterPreviewImage.setDisplaySize(Math.max(1, tex.width * scale), Math.max(1, tex.height * scale))
  }

  updateLevelPreview() {
    const levelKey = this.levelKeys[this.selectedLevelIndex]
    const level = Levels[levelKey]
    this.levelName.setText(level.name)
    this.levelDescription.setText(level.description || "")
    this.levelPreview.setFillStyle(0x443366)
  }
}
