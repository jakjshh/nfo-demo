/**
 * 极简权威房间：固定 tick 推进玩家位置、广播 snapshot。
 * 客户端见 src/game/net/NetClient.js；生产环境需校验输入、反作弊、房间隔离。
 *
 * 运行：cd server && npm i && npm start
 * 前端 .env：VITE_WS_URL=ws://127.0.0.1:8787
 */
import { WebSocketServer } from "ws"

const PORT = 8787
const TICK_MS = 50
const MOVE_SPEED = 4.2

const rooms = new Map()

function getOrCreateRoom(id) {
  if (!rooms.has(id)) {
    rooms.set(id, {
      players: new Map(),
      nextPid: 1,
      seed: (Math.random() * 1e9) | 0
    })
  }
  return rooms.get(id)
}

const wss = new WebSocketServer({ port: PORT })
console.log(`[room] WebSocket listening :${PORT}`)

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost")
  const roomId = url.searchParams.get("room") || "default"
  const room = getOrCreateRoom(roomId)
  const playerId = room.nextPid++
  room.players.set(ws, { id: playerId, x: 1000, y: 1000, dx: 0, dy: 0 })

  ws.send(JSON.stringify({ t: "welcome", playerId, roomId, seed: room.seed }))

  ws.on("message", raw => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }
    if (msg.t !== "input") return
    const p = room.players.get(ws)
    if (!p) return
    p.dx = Math.max(-1, Math.min(1, Number(msg.dx) || 0))
    p.dy = Math.max(-1, Math.min(1, Number(msg.dy) || 0))
  })

  ws.on("close", () => {
    room.players.delete(ws)
  })
})

setInterval(() => {
  for (const room of rooms.values()) {
    const list = []
    for (const p of room.players.values()) {
      p.x += p.dx * MOVE_SPEED
      p.y += p.dy * MOVE_SPEED
      p.x = Math.max(80, Math.min(1920, p.x))
      p.y = Math.max(80, Math.min(1920, p.y))
      list.push({ id: p.id, x: p.x, y: p.y })
    }
    const snap = { t: "snap", tick: Date.now(), players: list, enemies: [] }
    const payload = JSON.stringify(snap)
    for (const ws of room.players.keys()) {
      if (ws.readyState === 1) ws.send(payload)
    }
  }
}, TICK_MS)
