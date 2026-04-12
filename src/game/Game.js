import * as Phaser from "phaser"
import GameScene from "./scenes/GameScene"
import CharacterSelectScene from "./scenes/CharacterSelectScene"

export default class Game extends Phaser.Game {
  constructor() {
    super({
      type: Phaser.AUTO,
      parent: "app",
      scale: {
        mode: Phaser.Scale.RESIZE, // ⭐核心：自适应
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
    
      width: window.innerWidth,
      height: window.innerHeight,
      physics: {
        default: "arcade",
        arcade: { debug: false }
      },

      // ⭐ 场景顺序很关键
      scene: [CharacterSelectScene, GameScene]
    })
  }
}