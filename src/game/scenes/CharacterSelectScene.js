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

  create() {
    const w = this.scale.width
    const h = this.scale.height
    const cx = w / 2

    this.selectedIndex = 0
    this.charKeys = Object.keys(Characters)
    this.levelKeys = Object.keys(Levels)
    this.selectedLevelIndex = 0

    this.add
      .text(cx, 36, "选择角色和关卡", {
        fontSize: `${Math.min(28, w * 0.06)}px`,
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    this.add
      .text(cx, 64, `持有金币 ${loadGold()}`, {
        fontSize: "12px",
        color: "#8899aa"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    // 角色选择区域
    this.add
      .text(cx - 150, 100, "角色", {
        fontSize: "18px",
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    // 关卡选择区域
    this.add
      .text(cx + 150, 100, "关卡", {
        fontSize: "18px",
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    // 角色预览框
    this.characterPreview = this.add
      .rectangle(cx - 150, 150, 120, 120, 0x222233)
      .setScrollFactor(0)
      .setDepth(10)

    // 关卡预览框
    this.levelPreview = this.add
      .rectangle(cx + 150, 150, 120, 120, 0x222233)
      .setScrollFactor(0)
      .setDepth(10)

    // 角色左右箭头
    this.charLeftArrow = this.add
      .text(cx - 220, 150, "←", {
        fontSize: "24px",
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })

    this.charRightArrow = this.add
      .text(cx - 80, 150, "→", {
        fontSize: "24px",
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })

    // 关卡左右箭头
    this.levelLeftArrow = this.add
      .text(cx + 80, 150, "←", {
        fontSize: "24px",
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })

    this.levelRightArrow = this.add
      .text(cx + 220, 150, "→", {
        fontSize: "24px",
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })

    // 角色和关卡名称
    this.characterName = this.add
      .text(cx - 150, 200, Characters[this.charKeys[0]].name, {
        fontSize: "14px",
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    this.levelName = this.add
      .text(cx + 150, 200, Levels[this.levelKeys[0]].name, {
        fontSize: "14px",
        color: "#fff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    // 角色描述
    this.characterDescription = this.add
      .text(cx - 150, 220, Characters[this.charKeys[0]].description || "", {
        fontSize: "12px",
        color: "#8899aa",
        align: "center",
        wordWrap: {
          width: 140
        }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    // 关卡描述
    this.levelDescription = this.add
      .text(cx + 150, 220, Levels[this.levelKeys[0]].description || "", {
        fontSize: "12px",
        color: "#8899aa",
        align: "center",
        wordWrap: {
          width: 140
        }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)

    // 开始游戏按钮
    this.startButton = this.add
      .rectangle(cx, h - 60, 200, 50, 0x2a4a2e, 0.8)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(cx, h - 60, "开始游戏", {
        fontSize: "18px",
        color: "#ffffff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(11)

    this.startButton.on("pointerdown", () => {
      const charKey = this.charKeys[this.selectedIndex]
      const levelKey = this.levelKeys[this.selectedLevelIndex]
      this.registry.set("character", charKey)
      this.registry.set("level", levelKey)
      this.scene.start("GameScene")
    })

    // 育成按钮
    this.detailButton = this.add
      .rectangle(cx - 150, h - 60, 100, 40, 0x2a2a4a, 0.8)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(cx - 150, h - 60, "育成", {
        fontSize: "14px",
        color: "#8ad8ff"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(11)

    this.detailButton.on("pointerdown", () => {
      const key = this.charKeys[this.selectedIndex]
      this.registry.set("detailCharacter", key)
      this.scene.start("DetailScene")
    })

    // 角色箭头点击事件
    this.charLeftArrow.on("pointerdown", () => {
      this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex - 1, 0, this.charKeys.length - 1)
      this.updateCharacterPreview()
    })

    this.charRightArrow.on("pointerdown", () => {
      this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex + 1, 0, this.charKeys.length - 1)
      this.updateCharacterPreview()
    })

    // 关卡箭头点击事件
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

    this.scale.on("resize", this.onResize, this)
  }

  onResize(gameSize) {
    const w = gameSize.width
    const h = gameSize.height
    // 调整按钮位置
    this.startButton.setPosition(w / 2, h - 60)
    this.detailButton.setPosition(w / 2 - 150, h - 60)
  }

  updateCharacterPreview() {
    const charKey = this.charKeys[this.selectedIndex]
    const character = Characters[charKey]
    this.characterName.setText(character.name)
    this.characterDescription.setText(character.description || "")
    
    // 这里可以添加角色预览图的逻辑
    // 暂时使用颜色块代替
    this.characterPreview.setFillStyle(0x334466)
  }

  updateLevelPreview() {
    const levelKey = this.levelKeys[this.selectedLevelIndex]
    const level = Levels[levelKey]
    this.levelName.setText(level.name)
    this.levelDescription.setText(level.description || "")
    
    // 这里可以添加关卡预览图的逻辑
    // 暂时使用颜色块代替
    this.levelPreview.setFillStyle(0x443366)
  }
}
