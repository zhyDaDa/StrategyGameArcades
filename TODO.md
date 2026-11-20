# TODO — TABLE / 桌游实验室

> 当前阶段：**逻辑优先；开屏首页已落地，棋盘 / 游戏页 / 动效播放器后置。**
> 完成度、重构项、未来路线见 [README.md](README.md)；工程规范见 [CLAUDE.md](CLAUDE.md)。
> 维护方式：做完一项把 `[ ]` 改成 `[x]`，不要删条目；新增任务按 P0/P1/P2 归档。

---

## P0 恢复可构建（先做这个，否则任何改动都没法验证）

- [x] **给 `src/app/App.tsx` 一个最小实现**
  已实现为 `MotionConfig reducedMotion="user"` + `HomePage`，首页从 `GAMES` 注册表渲染游戏卡片。

- [x] **暂时移除 `src/main.tsx` 里的样式 import**
  已改为只引入 `src/styles/global.css`（Tailwind + shadcn 主题变量）。原 5 个 Less 文件留到真实设计阶段再建。

- [x] **暂时移除两个游戏 `index.ts` 里对 `ui/` 的 re-export**
  已删除；两个 `index.ts` 现在改为导出 `GameModel` 实例。UI 落地后再加回。

- [ ] **跑通 `pnpm typecheck` 和 `pnpm test`**
  代码层面的 P0 已处理，但尚未实际运行。这两项绿了才说明逻辑层的基线可信；此后每次改规则都应以「这两项仍绿」为默认门槛。

---

## P1 逻辑层的正确性

- [ ] **Session 必须把 events 交出去**
  [GameSession.dispatch](src/core/session/GameSession.ts) 现在 `reduce` 出来只用了 `transition.state`，`transition.events` 被直接丢弃。
  事件是动效语义和日志的唯一事实来源，需要在 snapshot 或订阅回调里提供「本次 transition 的 events + version」。
  验收：调用方不对比状态、不自己调 `reduce`，就能拿到 `piece.placed` / `turn.passed` / `game.finished`。

- [ ] **`useGameMatch` 不再静默吞错**
  [useGameMatch.ts](src/presentation/hooks/useGameMatch.ts) 目前 `.catch(() => {})`。改成把 error 暴露给调用方（返回值或独立状态），失败必须可调查，不能假装没发生。

- [ ] **人类玩家执行路径二选一**
  规范 §6 写的是「点击 → `HumanController.submit` → Session 执行」，但 `useGameMatch` 的注释说人类直接 `dispatch`、不进入驱动。
  选一条（推荐保留 `HumanController` 统一协议），删掉另一条，并同步改注释。不要留下「两种都能走」的模糊地带。

- [ ] **`reset()` 重置 `nextSequence`**
  [GameSession.ts](src/core/session/GameSession.ts) 的 `reset()` 清了 undo/redo 和历史，但动作序号继续累加。重开一局后序号应从 0 开始。

- [ ] **Schema 与规则对齐**
  - 五子棋：`stateSchema` 允许任意 `size > 0`，但 `cells` 长度写死 225 —— 二选一（锁死 size=15，或让长度由 size 驱动）。
  - 黑白棋：`lastMove.row/col` 没有边界校验，而 `flipped` 用了带边界的 `coordSchema`。
  - 五子棋 `isBoardFull` 只看 cells、不看 `size`，与上面的选择保持一致。

- [ ] **`LLMController` 不再直接 import `integrations` 的类型**
  [LLMController.ts](src/controllers/LLMController.ts) import 了 `@/integrations/llm/types`。按 §3，controllers 只允许 `core + shared`，模型客户端应以注入的接口/泛型形式提供，types 定义下沉到 controller 自己的 options 里。

- [ ] **决定随机种子的归属**
  `RandomController` 默认用 `Math.random()`，这意味着「随机局可重放」目前靠调用方自觉传 seed。
  明确：种子由谁持有（Match 配置 / Session / 存档）、是否写进 `ActionRecord`；或者在代码与文档里明确「不传种子的随机局不支持重放」。只能有一个答案。

---

## P2 契约测试补全（对照 CLAUDE.md §9 清单）

- [ ] 对局结束后 `dispatch` 不改变状态（五子棋 + 黑白棋都缺）。
- [ ] 黑白棋：错误玩家提交、非法结构 action 的拒绝用例。
- [ ] 五子棋：平局用例（棋盘填满且无五连）。
- [ ] `GameSession`：状态未变化时 `getSnapshot()` 返回同一引用；`SessionError.code` 断言；空栈 `undo/redo` 无副作用。
- [ ] 黑白棋：强制跳步、双方连续 pass 导致终局的事件序列断言（现在只测了棋盘结果，没测 `turn.passed` 的顺序）。

---

## P3 装配层（可延后到表现层前）

- [x] **注册 GameModel**：`games/GameModel.ts` + 各游戏 `index.ts` 的实例 + `GAMES` 注册列表，首页只消费注册表。
- [ ] **registry 升级为完整装配表**：`GameId → { 创建 Game 实例, 玩家槽位, Controller 工厂 }`。View 字段留到 UI 阶段再填，但不要现在就写空壳。
- [ ] 一个不依赖 React 的入口（测试或脚本）用同一份 registry 跑通两个游戏的 Random vs Random，作为「加第三款游戏不改 core」的回归基线。
