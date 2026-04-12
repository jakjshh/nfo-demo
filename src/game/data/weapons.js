export const weapons = [
  {
    name: "攻击+3",
    apply(player) {
      player.attack += 3
    }
    
  },
  {
    name: "攻速+20%",
    apply(player) {
      player.attackSpeed = Math.max(100, player.attackSpeed * 0.8)
      player.restartAutoAttack()
    }
  },
  {
    name: "移速+30",
    apply(player) {
      player.moveSpeed += 30
    }
  },
  {
    name: "防御+1",
    apply(player) {
      player.defense += 1
    }
  },
  {
    name: "生命上限+20",
    apply(player) {
      player.maxHp += 20
      player.hp += 20
    }
  }
]