# TABLE / 桌游实验室 — 开发笔记

> **这份 README 只给自己看**，不是对外文档。对外说明等 `docs/` 写完后另起。
> 长期规范见 [CLAUDE.md](CLAUDE.md)；当前执行队列见 [TODO.md](TODO.md)。
> 最后更新：2026-11-20

---

## 当前状态（2026-11-20）

一句话：**规则内核基本成型，首页已落地，棋盘/游戏页 UI 仍是空的。**

| 层面                                        | 现状                                                 | 完成度 |
| ------------------------------------------- | ---------------------------------------------------- | ------ |
| `core/` 契约、BaseGame、Session、存档、重放 | 纯 TS，结构完整                                      | ~95%   |
| `games/gomoku/domain`                       | 完整，含规则/选择器/Schema/契约测试                  | ~90%   |
| `games/reversi/domain`                      | 完整，强制跳步折叠进单次 transition                  | ~90%   |
| `controllers/`                              | Human / Random / LLM + abort                         | ~85%   |
| `integrations/llm/`                         | Anthropic + OpenAI 兼容两个 provider                 | ~70%   |
| `presentation/`                             | snapshot 桥、match 驱动、motion tokens/presets/types | ~50%   |
| 事件 → 动效链路                             | cues 映射有了，但 Session 不发布 events，也无播放器  | ~20%   |
| 首页与基础 UI                               | shadcn/ui + GameModel 注册表 + 首页卡片              | ~30%   |
| 全局页面转场（Bubble Matrix）               | 覆盖 / loading / 揭示三段式，斜向波浪                | ~90%   |
| 游戏页 / 棋盘 / 主题样式                    | **未开始**                                           | 0%     |
| 文案与工程配套（docs、ESLint 边界、README） | ESLint 部分生效；docs 全缺                           | ~35%   |
| 测试                                        | 契约测试基本齐，缺若干边界                           | ~65%   |

按 Phase 算：**Phase 1 ≈ 90%，Phase 2 ≈ 15%，Phase 3 ≈ 55%，整体 ≈ 45%。**

已经验证过的好消息：黑白棋只组合了 core 现有契约，**没有为它新增任何 core 抽象**——第二款游戏复用协议的假设成立。

---

## 怎么跑

包管理器是 **pnpm**（仓库里有 `pnpm-lock.yaml`，不要换 npm）。

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

当前基线：P0 的代码问题已处理（App 入口、样式入口、barrel re-export），但**尚未实际运行验证**；首次开工请先执行 `pnpm typecheck` 和 `pnpm test`。

技术栈：React 19 · TypeScript 5.9（strict）· Vite 8 · motion 14 · **Tailwind CSS 4 + shadcn/ui** · Zod 4 · Vitest 5。

---

## AI 接入（代码策略 / 云端 BYOK / localhost）

席位配置页的「算法 / 大模型 / 小模型」已经接通真实决策：

- **编写 JavaScript 策略**：QuickJS WASM 在独立 Worker 中执行，不使用页面 `eval`；
  单步超时后终止 Worker，输出动作必须通过游戏 schema 与合法动作集校验。
- **云端大模型 BYOK**：浏览器直连用户填写的 OpenAI 兼容 / Anthropic 端点；
  Key 默认只在内存，可选明文记住到 localStorage，可随时删除或全部清空。
- **localhost 模型**：Ollama / LM Studio / 任意 OpenAI 兼容服务；只允许 `http://localhost` /
  `http://127.0.0.1` 使用明文 http，其余端点强制 https。
- **自定义 `/decide`**：本机决策服务，协议版本 `1`，返回动作仍由本站校验。
- 每个 AI 席位必须用真实样例局面测试通过才能开局；配置指纹变化后测试立即失效。
- 连接失败按 URL / CORS / 401 / 403 / 404 / 429 / 超时 / 响应格式分类显示，不静默回退。

详细文档：

- [`docs/AI_ACCESS.md`](docs/AI_ACCESS.md)：安全、隐私、Key 存储、CORS 排查、残余风险
- [`docs/STRATEGY_AUTHORING.md`](docs/STRATEGY_AUTHORING.md)：策略协议、各游戏动作形状、导入导出
- [`docs/LOCAL_AI_SERVICE.md`](docs/LOCAL_AI_SERVICE.md)：`/decide` 协议与 FastAPI 示例

当前**不开放** JSON 权重 / ONNX 导入：缺少可验证的特征编码与动作索引协议时，不谎称兼容。

## 基础 UI：shadcn/ui

**后续所有基础 UI 都从这里取，不自己重写轮子：**
<https://ui.shadcn.com/docs/components>

已初始化内容：

- Tailwind CSS v4 + `@tailwindcss/vite`；
- `components.json`（style: `radix-nova`，base color: neutral，CSS variables）；
- 全局样式入口：[src/styles/global.css](src/styles/global.css)（Tailwind import + shadcn 主题变量）；
- 已安装组件：[Card](src/components/ui/card.tsx)、[Button](src/components/ui/button.tsx)、[DropdownMenu](src/components/ui/dropdown-menu.tsx)。

约定：

1. **新增组件用 CLI，不手抄**：

   ```powershell
   pnpm dlx shadcn@3 add dialog
   pnpm dlx shadcn@3 add select input badge
   ```

   （CLI 用 `@3` 固定版本：最新的 4.x 在 `init` 阶段会报 workspace 配置错误，`add` 也建议跟 init 用同一版本。）
2. `src/components/ui/` 归 CLI 所有：**不要直接改里面的文件**。需要不同表现时，在自己的业务组件里包一层，用 `className` / `variant` 覆盖。
3. 业务组合组件放 `src/components/<类别>/`，例如 [GameCard](src/components/game/GameCard/GameCard.tsx)；页面只组合，不写组件细节。
4. `cn` 合并工具：新版 shadcn 组件直接 `import { cn } from "cn"`；[src/shared/utils/cn.ts](src/shared/utils/cn.ts) 只是给旧风格组件留的别名兼容层（`@/shared/utils/cn`）。
5. **样式策略变更**：基础 UI 一律用 Tailwind utility。CLAUDE.md 里「Less + CSS Modules」的说法现在只适用于后续特殊的游戏视觉（棋盘、纸面质感等），基础组件不要再写 `.module.less`。**CLAUDE.md 本身尚未同步这条，看到时以本节为准。**

---

## 颜色与主题规范（全站唯一来源）

所有页面统一使用 [src/styles/global.css](src/styles/global.css) 中的设计令牌，**不在组件里写死颜色**。

### 令牌

```css
:root,
[data-theme='light'] {
  --color-primary: #aa6048;
  --color-secondary: #6f7a58;
  --color-blue: #4f6f88;
  --color-green: #5c7a52;
  --color-danger: #b4453b;

  --bg-primary: #f4f0e6;
  --bg-secondary: #faf7f0;

  --text-primary: #262a25;
  --text-secondary: #756f64;
  --text-inverse: #faf7f0;

  --border-color: #c5bbaa;
}

[data-theme='dark'] {
  --color-primary: #d08a6c;
  --color-secondary: #9aa383;
  --color-blue: #8aa9c2;
  --color-green: #93ab88;
  --color-danger: #e08a7f;

  --bg-primary: #1b1a17;
  --bg-secondary: #24221e;

  --text-primary: #ece7dc;
  --text-secondary: #a49b8c;
  --text-inverse: #1b1a17;

  --border-color: #3b3730;
}
```

- 命名：`--color-*` 品牌色，`--bg-*` 背景，`--text-*` 前景文字，`--border-color` 描边；`--color-danger` 是 shadcn destructive 所需的危险态。
- 色值取自 CLAUDE.md §8 的纸面 / 墨色 / 暖强调色；要换配色只改这一段，不要在组件里覆盖。
- shadcn 的语义变量（`--background`、`--foreground`、`--primary`、`--muted` 等）全部映射到上述令牌，组件只写 `bg-background` / `text-foreground` / `border-border` 这类 Tailwind 类。
- 主题切换只操作 `<html data-theme>`：

  ```ts
  document.documentElement.dataset.theme = 'dark'
  document.documentElement.dataset.theme = 'light'
  ```

- React 侧统一通过 `useTheme()`（Provider 在 [app/providers/ThemeProvider.tsx](src/app/providers/ThemeProvider.tsx)，逻辑在 [presentation/theme](src/presentation/theme/)）读写；不要直接操作 DOM 或 localStorage。
- 初始主题顺序：本地已保存偏好 → 系统 `prefers-color-scheme` → 浅色。

### 顶部导航（所有页面共用）

- [AppShell](src/app/shell/AppShell.tsx) 通过 `RouterProvider` 的 `renderLayout` 注入 [NavBar](src/components/layout/NavBar/NavBar.tsx)；路由层仍然不认识任何页面或游戏。
- 左侧标题：首页「桌游实验室」、游戏页取注册表里的游戏名、设置页「设置」、404「页面不存在」；点击标题回首页。
- 右侧：「更多」下拉菜单（设置入口）+ 太阳/月亮主题开关。图标来自 `lucide-react`（`Sun` / `Moon` / `Ellipsis` / `Settings`）。
- 设置页路由为 `/settings`，目前提供浅色 / 深色选择；后续 LLM、玩家配置也放这里。

---

## 全局页面转场（Bubble Matrix）

文件都在 [src/presentation/page-transition](src/presentation/page-transition/)：

| 文件                                                                                    | 职责                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [PageTransitionOverlay.tsx](src/presentation/page-transition/PageTransitionOverlay.tsx) | 按 phase 渲染背景层，并把常驻的 LoadingIndicator 叠在上面          |
| [BubbleMatrix.tsx](src/presentation/page-transition/BubbleMatrix.tsx)                   | 气泡矩阵的覆盖 / 揭示动画（Motion 命令式 `animate()`，显式关键帧） |
| [LoadingIndicator.tsx](src/presentation/page-transition/LoadingIndicator.tsx)           | 跨阶段常驻的 spinner：退场波浪前 1/3 淡入、揭示波浪前 1/3 淡出     |
| [layout.ts](src/presentation/page-transition/layout.ts)                                 | 网格计算与 30° 斜向波浪延迟投影                                    |
| [tokens.ts](src/presentation/page-transition/tokens.ts)                                 | 节奏参数与调试开关                                                 |

流程由 [RouterProvider](src/routers/RouterProvider.tsx) 驱动：

```text
点击 → covering（气泡铺满旧页面）→ pushState → loading（加载新页面 + 最短停留）
     → revealing（气泡收缩露出新页面）→ idle
```

- covering / revealing 由 `animation.finished` 真正结束推进，不用 `setTimeout` 估时长。
- loading 阶段至少停留 `loadingMinDuration`，避免页面瞬间加载完时 spinner 一闪而过。
- 气泡颜色使用 `global.css` 的 `--surface-raised`（背景高亮色，light / dark 分别定义）。**不要改回 `bg-background`**：和页面底色完全相同，气泡会彻底看不见。
- 气泡直径 = 单元对角线 + 2px 冗余，满屏时相邻气泡重叠，覆盖无缝隙。

### 调试开关（tokens.ts）

- `forceWave`：忽略系统 `prefers-reduced-motion`，强制播放气泡波浪。调试动效时保持 `true`。
- `freezeRevealAt`：reveal 播到指定进度（0~1）时 `pause()` 并停在画面上，不进入 idle；正式用设为 `null`。

### 踩过的坑：动画完全不出来

- **现象**：`loadingMinDuration` 改成 2 秒有效，但 `waveDuration` 改成 60 毫无反应；loading 结束后遮罩立刻就消失。
- **根因**：系统 / 浏览器上报了 `prefers-reduced-motion: reduce`，`PageTransitionOverlay` 走进纯色淡入淡出的简化分支，**`BubbleMatrix` 根本没有挂载**，所以任何气泡参数都不会生效。
- **排查顺序**（下次直接照做）：
  1. 先确认动画组件有没有渲染（看 `data-transition-phase` 节点 / 临时日志），再怀疑动画 API；
  2. 用「同一份配置文件里 A 生效、B 不生效」判断是代码路径没执行，而不是参数没生效；
  3. DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion` 可复现。
- **教训**：`useReducedMotion()` 是一个会静默关掉整棵动画树的开关；根部的 `MotionConfig reducedMotion="user"` 还会让所有 `motion.*` 组件一起降级。调试动效前先看这个。

### Motion 14 经验

- `motion/react` 的 `animate()` 可以直接动画普通 DOM 元素，支持元素数组 + `delay: (i, total) => number` 做二维波浪错峰，不需要为每个气泡写一个 `motion.div`。
- 显式给 `scale: [from, to]`，不要依赖从 computed style 反读起始 transform。
- 阶段推进用 `animation.finished`；卸载 / 重跑时 `animation.stop()`，避免残留动画。
- 独立的 `animate()` 不受 `MotionConfig reducedMotion="user"` 直接控制，但**自己在组件里写的 `useReducedMotion()` 分支**会——这次就是栽在这里。

---

## 实际依赖关系（已实现部分）

```text
games/<id>/domain  ──> core
controllers        ──> core（LLM 额外 import integrations 的 type，待调整）
presentation       ──> core
integrations/llm   ──> 无（纯 fetch + Zod）
core               ──> 无上游依赖
app                ──> 全部（App / HomePage / registry）
```

`main.tsx` 只负责挂载：引入 `styles/global.css` 与 `App`。App 是唯一组合根，页面从 registry 取数据。

---

## 游戏注册模型（GameModel）

游戏目录数据统一用 [GameModel](src/games/GameModel.ts) 表达，不再用裸 object 到处传。

每款游戏在自己的 `index.ts` 里创建一个实例：

```ts
export const gomokuGameModel = new GameModel({
  id: 'gomoku',
  name: '五子棋',
  description: '落子成五，先连成一线者胜。',
  path: '/games/gomoku',
  cover: null, // 有封面后填资源 URL
})
```

规则：

1. `games/registry.ts` 的 `GAMES` 是唯一注册列表，首页只读它，不直接 import 各游戏内部文件。
2. 展示组件从 `game.toCardData()` 取 `GameCardData`，组件本身不 import `GameModel`（保持 `components` 不依赖 `games/*` 的边界）。
3. 新增游戏 = `games/<id>/domain/` + `index.ts` 里的 `GameModel` + registry 登记一行。
4. 没有单独的 `models/` 目录：这是「游戏目录元数据」，与 registry 同层；`core/` 只放规则协议，不放目录展示数据。

---

## 需要重构（结构 / 职责层面，改动较大）

### 1. Session 增加事件发布通道

- **问题**：[GameSession.dispatch](src/core/session/GameSession.ts) 拿到 `Transition` 后只用了 `state`，`events` 直接丢弃。UI 想播 `piece.placed`、想做日志、想回放，都没有合法入口（除非自己去调 `reduce`，这是规范明令禁止的）。
- **目标**：Session 在提交时把「version + events」发布出去（snapshot 携带最近一次 events，或订阅回调带参数）。
- **影响**：core 契约、presentation hooks、未来的 CuePlayer 都要按这个通道写。**先定接口再加 UI**，避免各游戏自己发明事件通道。

### 2. 人类玩家执行路径统一

- **问题**：`HumanController` 实现了完整的 pending/submit 协议，但 `useGameMatch` 的注释说人类直接 `dispatch`、不进入驱动。两条路都能走通，等于没有约定。
- **目标**：保留一条。推荐 `HumanController.submit(action)` → Session `dispatch`，这样人类与机器人共享同一份超时/取消/校验逻辑。
- **影响**：UI 落地时点击处理只写一处；`useGameMatch` 注释同步改。

### 3. Controller 与 integrations 的边界

- **问题**：[LLMController.ts](src/controllers/LLMController.ts) 直接 import `@/integrations/llm/types`。§3 规定 controllers 只依赖 `core + shared`，模型客户端应当注入。
- **目标**：把 `LlmChatMessage` / `LlmClient` 的接口定义留在 Controller 的 options 泛型里（或 `core/contracts` 下的抽象），provider 实现去实现它。这样 controllers 层不与任何具体服务商耦合。

### 4. registry 从「元信息数组」升级为「装配表」

- **问题**：[games/registry.ts](src/games/registry.ts) 只有 `id/title/description/themeClass`，没有「怎么创建 Game、玩家槽位是什么、Controller 怎么造、View 是哪个」。它名义上是唯一注册入口，实际上还没承担注册职责。
- **目标**：`GameId → { createGame(), players, createController() }`，View 字段等 UI 阶段再补。app 层只读 registry，不允许在页面里 switch 游戏 id。

### 5. 随机种子的归属要定死

- **问题**：`RandomController` 默认 `Math.random()`，只有显式传 seed 才确定。现在没人负责把 seed 记住，所以「随机局可重放」实际不可保证。
- **目标**：决定 seed 属于哪一层——Match 配置、Session 构造参数、还是存档封套。确定后写进 `ActionRecord` 或存档，并在类型上强制（可选 seed 会导致两种行为）。

### 6. ESLint 边界规则补全

- **问题**：现在的 `no-restricted-imports` 只匹配 `@/` 别名；相对路径（`../../../components`）完全绕过。且缺 `games/*/ui`、`games/*/motion`、`app`、`integrations` 的规则。另外控制器 import integrations 这条实际违规没被规则拦住。
- **目标**：
  - 增加相对路径跨层检查（或规定跨目录一律 `@/`，用 `no-restricted-imports` + 自定义规则兜底）；
  - 补齐 `games/*/ui`（只能依赖本游戏 domain + components/presentation）、`games/*/motion`（不得反向依赖 UI）、`app`（唯一组合根，无限制但禁止被依赖）的规则；
  - integrations 单独一组，禁止 import games/ui。

---

## 需要调整（小修，不改变结构）

| #   | 位置                                                      | 问题                                                           | 调整                                                |
| --- | --------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| 1   | [useGameMatch.ts](src/presentation/hooks/useGameMatch.ts) | `.catch(() => {})` 静默吞掉 Controller 失败                    | 暴露 error，至少给调用方一个可展示/可记录的失败状态 |
| 2   | [GameSession.reset()](src/core/session/GameSession.ts)    | 清了历史但 `nextSequence` 继续累加                             | 重置为 0                                            |
| 3   | [gomoku/schema.ts](src/games/gomoku/domain/schema.ts)     | `size` 任意正数、`cells` 长度写死 225                          | 锁死 size，或让长度跟随 size                        |
| 4   | [gomoku/rules.ts](src/games/gomoku/domain/rules.ts)       | `isBoardFull` 只看 cells 不看 size                             | 与上一条保持一致                                    |
| 5   | [reversi/schema.ts](src/games/reversi/domain/schema.ts)   | `lastMove.row/col` 无边界，`flipped` 有边界                    | 统一用 coordSchema                                  |
| 6   | `games/*/index.ts`                                        | barrel 直接 re-export 未实现的 UI                              | ✅ 已删除，UI 落地后再加回                          |
| 7   | [main.tsx](src/main.tsx)                                  | import 了 5 个不存在的 less 文件                               | ✅ 已改为只引入 `styles/global.css`                 |
| 8   | 测试                                                      | `observe` 只测了「没有 winner 字段」，没测真正的不完全信息场景 | 目前两款都是完全信息游戏，等出现隐藏信息游戏再补强  |

---

## 未来未完成（按 Phase）

### Phase 2：表现层（首页已完成，游戏页未开始）

**现状**：`App` + 首页 + `GameCard` 已落地，基础组件来自 shadcn/ui。棋盘、游戏页、动效播放器仍未开始。

- `src/components/`
  - ✅ `ui/`（shadcn：Card / Button）
  - ✅ `game/GameCard`
  - ⬜ `layout/GameShell`、`layout/PageFrame`
  - ⬜ `game/TurnIndicator`、`game/GameToolbar`、`game/MatchResult`
  - ⬜ `feedback/`（Toast / Error / Loading）
- `src/styles/`
  - ✅ `global.css`（Tailwind + shadcn 主题变量）
  - ⬜ 游戏主题变量（CSS 自定义属性，可继续用 `games/<id>/styles/theme.less` 或并入 CSS）
  - ⬜ 若确定不用 Less，删掉 `less` 依赖与 CLAUDE.md 中的 Less 约定
- `src/app/`
  - ✅ `App.tsx`（含 `MotionConfig reducedMotion="user"`）
  - ✅ `pages/HomePage.tsx`
  - ⬜ 游戏详情页（按 `GameModel.path` 接路由）、设置页
  - ⬜ `providers/`
- `games/<id>/ui/`
  - ⬜ `GomokuView` + `GomokuBoard`
  - ⬜ `ReversiView` + `ReversiBoard`
- ⬜ `games/<id>/styles/` 主题变量（CSS 自定义属性；若保留 Less 则用 `theme.less`）
- `presentation/motion/`
  - ⬜ `CuePlayer.tsx`、`useMotionCues.ts`（依赖重构项 1 的事件通道）
  - ⬜ `games/reversi/motion/reversi-cues.ts`（现在只有五子棋有 cues）
- ⬜ 交互：点击 → HumanController → Session；随机/LLM 玩家由 `useGameMatch` 驱动；Undo/Redo 按钮。

### Phase 3：AI 与内容

- LLM 设置界面：provider/Base URL/model/API Key 配置，**只存用户本地**（localStorage 一类），绝不进仓库或构建产物。
- LLM 失败 UI：超时、非法输出、限流都要有明确提示，不做静默重试。
- 存档 / 恢复 UI：`save-envelope` + `codec` 已有，缺 Session 层「从存档恢复 + 历史」的入口。
- `docs/` 六篇：ARCHITECTURE、GAME_PROTOCOL、NAMING、MOTION、DESIGN_SYSTEM、GAME_TEMPLATE。
- README 对外版本（现在这份是开发笔记，不用于展示）。

### 再往后（有真实需求才做）

- `systems/effects/`：等第三款游戏真的需要共享效果机制再抽，不要提前。
- `SearchController`：五子棋/黑白棋都还不需要，等 AI 强度成为需求再说。
- 第三款游戏：用来检验「加游戏不改 core」是否仍然成立；到时优先改 `games/<id>/` 与 registry。

---

## 已确定的设计决策（不要回退）

1. **State 只存事实**，派生数据走 Selector（五子棋的 `winner` 是终局事实，保留在 State 里；连线和棋盘视图走 selectors）。
2. **黑白棋的强制跳步折叠进同一次 `reduce`**，Controller 只产出 `place`，不感知 pass。`turn.passed` 通过事件表达，UI 若要提示需读事件（等重构项 1）。
3. **Action 的等价比较用 `isSameAction`**（规范化 JSON），不用引用比较。
4. **存档封套 `{ gameId, rulesVersion, state }`**，恢复时用 `z.literal` 校验版本；不做迁移框架。
5. **规则层不出现 `Math.random / Date.now / window / fetch`**；随机只允许经种子化的 Controller。
6. **LLM 只能返回候选 Action**，永远由 Session 校验执行；Observation 是它唯一的信息来源。
7. **`BaseGame` 不放胜负判定、动画、AI**；每款游戏的规则留在自己的 domain。

---

## 已知坑 / 风险

- **git 尚未初始化**：仓库目录不是 git 仓库。做较大重构前建议先 `git init` 并建立基线提交，否则没法回退。
- **没有 `docs/`**：类型/协议的「为什么」目前只存在于 CLAUDE.md 和代码注释里。改公共协议时至少同步更新 CLAUDE.md。
- **测试基线**：P0 的代码问题已清理，但尚未实际跑过。第一次运行 `pnpm test` 若失败，先确认不是环境/依赖问题再改代码。
- **ESLint 的相对路径绕过**：即使 `pnpm lint` 通过，也不能证明没有跨层 import，review 时人肉看一眼相对路径。
- **shadcn 与 CLAUDE.md 的样式冲突**：CLAUDE.md 仍写「Less + CSS Modules」，实际基础 UI 已改为 Tailwind + shadcn。动新组件前先看本 README 的「基础 UI」一节。
