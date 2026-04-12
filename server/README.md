# 联机房间服（权威位置骨架）

- `npm install` 后 `npm start`，默认端口 **8787**。
- 前端环境变量：`VITE_WS_URL=ws://127.0.0.1:8787`（写入项目根目录 `.env`）。
- 当前实现：仅同步 **玩家坐标**（由输入 `dx,dy` 积分），**敌人状态**仍由各自客户端本地算；要完全权威需把 `SpawnSystem` 逻辑迁到本文件并在 `snap` 里下发 `enemies[]`。
- 消息格式与扩展说明见 `src/game/net/MultiplayerCoopOutline.js`。
