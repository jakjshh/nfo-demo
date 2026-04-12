/**
 * =============================================================================
 * 联机合作（双人同屏 / 在线）—— 搭建思路与接入点（注释说明，不替代完整网络栈）
 * =============================================================================
 *
 * 一、两种常见形态
 * ----------------
 * 1) 本地同屏（同一台机器两个输入源）
 *    - 再创建一个 Player / BasePlayer 实例，共用同一个 GameScene 的 enemies、bullets、pickups。
 *    - 摄像机：可平均跟随两点中心，或分屏（两个 Camera viewport）。
 *    - 碰撞：每个玩家 sprite 分别与 enemies、pickups overlap。
 *    - 经验：可共享一条经验条，或各自升级（需改 levelUp UI 为轮流选或独立 HUD）。
 *
 * 2) 在线联机（推荐「权威服务器」）
 *    - 浏览器只负责：输入采样 + 插值渲染；逻辑在 Node / 云函数房间服上跑。
 *    - 协议：WebSocket（socket.io / ws）或 WebRTC DataChannel（仍建议有一台主机做权威）。
 *    - 同步内容：玩家位置、朝向、当前武器触发事件（如「释放太阳爆」用事件 id + 时间戳，由服务器校验伤害）。
 *    - 随机性：暴击、掉落种子由服务器下发，避免客户端作弊不一致。
 *
 * 二、与本项目代码的衔接点（在不大改玩法的前提下）
 * ----------------------------------------------
 * - SpawnSystem / 敌人 AI：只在「主机或服务器」执行，客户端只接收敌人状态（位置、hp、freezeUntil 等）。
 * - BasePlayer.update：把「本机输入」打成 { ax, ay } 或 { keys } 发给服务器；客户端收到远端玩家状态做插值。
 * - GameScene.resolveEnemyDeath / spawnLoot：掉落与经验若在服务器算，客户端只播放特效与 HUD 数字。
 * - isPausedGameplay：仅当「本机」打开升级 UI 时，可只暂停本机输入，或全房间 pause（需协议消息 pause_room）。
 *
 * 三、最小可运行「本地双人」伪代码结构（需在 GameScene 自行展开）
 * ----------------------------------------------------------------
 */

// --- 示例：在 GameScene.create 末尾可追加（需自行与现有 this.player 融合） ---

/*
import BasePlayer from "../entities/BasePlayer"

// this.playerTwo = new BasePlayer(this, 1040, 1000, configB)
// this.playerTwo.skillSystem = new SkillSystem(this.playerTwo)
// this.playerTwo.skillSystem.initFromCharacter(configB)
// this.physics.add.overlap(this.playerTwo.sprite, this.enemies, () => { ...takeDamage... })
// this.cameras.main.startFollow 改为自定义 update 里 cameras.main.centerOn((p1.x+p2.x)/2, (p1.y+p2.y)/2)
*/

/**
 * 四、在线房间消息示例（JSON），便于与后端对齐
 * -------------------------------------------
 * Client -> Server:
 *   { "t": "input", "roomId": "abc", "seq": 1204, "dx": 0, "dy": -1, "fire": false }
 * Server -> Client:
 *   { "t": "snapshot", "tick": 8800, "players": [{ "id":1,"x":100,"y":200 }, ...],
 *     "enemies": [{ "id": 44, "x": 300, "y": 400, "hp": 12, "freezeUntil": 12.5 }] }
 *
 * 五、性能与作弊
 * -------------
 * - 只同步「变化量」与低频全量校正（例如每 2s 一次状态哈希对账）。
 * - 伤害结算在服务器；客户端只做预测（可选），错误时回滚位置。
 */

export const MULTIPLAYER_README = "See comments in MultiplayerCoopOutline.js"
