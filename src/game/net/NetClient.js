/**
 * WebSocket 客户端骨架：发送输入帧、接收权威 snapshot（位置/敌人等）。
 * 与 server/authoritative-room.mjs 配套；未连接时游戏仍为本地单机逻辑。
 */
export default class NetClient {
  constructor(url) {
    this.url = url
    this.ws = null
    this.connected = false
    this.playerId = 0
    this.lastSnap = null
    this.remotePlayer = { x: 1000, y: 1000, active: false }
  }

  connect(onOpen, onError) {
    try {
      this.ws = new WebSocket(this.url)
    } catch (e) {
      onError?.(e)
      return
    }
    this.ws.onopen = () => {
      this.connected = true
      onOpen?.()
    }
    this.ws.onerror = () => onError?.(new Error("ws error"))
    this.ws.onclose = () => {
      this.connected = false
    }
    this.ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.t === "welcome") this.playerId = msg.playerId ?? 0
        if (msg.t === "snap") this.lastSnap = msg
      } catch {
        /* ignore */
      }
    }
  }

  sendInput(dx, dy) {
    if (!this.connected || !this.ws) return
    this.ws.send(JSON.stringify({ t: "input", dx, dy, seq: Date.now() }))
  }

  /** 从 snapshot 更新「队友」位置，供怪物就近索敌 */
  applyRemotePlayerForChase(scene) {
    const snap = this.lastSnap
    if (!snap?.players) return
    const other = snap.players.find(p => p.id !== this.playerId)
    if (other) {
      this.remotePlayer.x = other.x
      this.remotePlayer.y = other.y
      this.remotePlayer.active = true
      if (scene.remotePlayerGhost && scene.remotePlayerGhost.setPosition) {
        scene.remotePlayerGhost.setPosition(other.x, other.y)
        scene.remotePlayerGhost.setVisible(true)
      }
    }
  }

  disconnect() {
    try {
      this.ws?.close()
    } catch {
      /* ignore */
    }
    this.ws = null
    this.connected = false
  }
}
