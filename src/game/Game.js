import * as Phaser from "phaser"
import ModeSelectScene from "./scenes/ModeSelectScene"
import GameScene from "./scenes/GameScene"
import CharacterSelectScene from "./scenes/CharacterSelectScene"
import CharacterDetailScene from "./scenes/CharacterDetailScene"

export default class Game extends Phaser.Game {
  constructor() {
    super({
      type: Phaser.AUTO,
      parent: "app",
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },

      width: window.innerWidth,
      height: window.innerHeight,
      physics: {
        default: "arcade",
        arcade: { debug: false }
      },

      scene: [ModeSelectScene, CharacterSelectScene, CharacterDetailScene, GameScene]
    })
  }
}
