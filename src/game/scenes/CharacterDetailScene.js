import * as Phaser from "phaser"
import { Characters } from "../data/CharacterConfig"
import { loadGold, saveGold, getMetaForCharacter, setMetaForCharacter } from "../data/persist"

const COST = { hp: 40, atk: 50, def: 45, spd: 55 }

/**
 * 技能树 / 局外育成：用金币强化该角色的初始数值（进入关卡时合并到 CharacterConfig）
 */
export default class CharacterDetailScene extends Phaser.Scene {
  constructor() {
    super("DetailScene")
  }

  create() {
    const key = this.registry.get("detailCharacter") || "ranger"
    const c = Characters[key]
    let meta = { ...getMetaForCharacter(key) }

    const w = this.scale.width
    const h = this.scale.height
    const cx = w / 2

    let gold = loadGold()

    const title = this.add
      .text(cx, 40, `${c.name} · 育成`, { fontSize: "26px", color: "#fff" })
      .setOrigin(0.5)

    const goldTxt = this.add
      .text(cx, 78, `金币 ${gold}`, { fontSize: "18px", color: "#ffdd88" })
      .setOrigin(0.5)

    const info = this.add
      .text(
        cx,
        110,
        "每级：生命+10格挡池 · 攻击+2 · 防御+1 · 移速+6\n（进入战斗时自动合并）",
        { fontSize: "13px", color: "#aaa", align: "center" }
      )
      .setOrigin(0.5)

    const statY = 180
    const mkRow = (label, field, y) => {
      const t = this.add.text(cx - 120, y, `${label} Lv.${meta[field]}`, {
        fontSize: "18px",
        color: "#ddd"
      })
      const btn = this.add
        .rectangle(cx + 100, y, 100, 36, 0x334455)
        .setInteractive({ useHandCursor: true })
      const price = this.add.text(cx + 100, y, `${COST[field]} G`, { fontSize: "14px", color: "#fff" }).setOrigin(0.5)

      btn.on("pointerdown", () => {
        if (gold < COST[field]) return
        gold -= COST[field]
        meta[field] = (meta[field] || 0) + 1
        saveGold(gold)
        setMetaForCharacter(key, meta)
        goldTxt.setText(`金币 ${gold}`)
        t.setText(`${label} Lv.${meta[field]}`)
      })
    }

    mkRow("生命", "hp", statY)
    mkRow("攻击", "atk", statY + 52)
    mkRow("防御", "def", statY + 104)
    mkRow("移速", "spd", statY + 156)

    this.add
      .text(cx, h - 80, "返回", { fontSize: "20px", color: "#8af" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.scene.start("SelectScene")
      })
  }
}
