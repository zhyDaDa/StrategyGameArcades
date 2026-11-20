# CLAUDE.md — TABLE / 桌游实验室

> 本文件是本仓库的长期工程规范，供 Claude Code / AI 编程代理与开发者共同遵守。
> 项目目标：用 **React + TypeScript + Motion + Less** 构建一个可静态部署、重视交互动效的单机桌游平台，使人类、传统算法与 LLM 能通过统一协议操作多个决策类游戏。
> **优先级：正确性 > 简单性 > 复用 > 可扩展性 > 炫技。动效品质是产品核心，但不得污染规则层。**
> 如果仓库尚未创建本文提到的某个文件，不要为了“目录完整”而提前创建空壳；只在真实需求出现时创建。

**开发节奏：快速迭代 > 过度验证。** 优先采用短反馈周期的开发方式，避免不必要的探索、重复检查与过度设计。遇到影响实现方向的复杂问题或关键不确定性时，应及时向用户提问确认，不要自行做出未经验证的假设。完成主要代码并通过必要的静态检查、类型检查或测试后，应及时交付用户验收；除非用户明确要求，否则不要主动截图、启动浏览器进行视觉检查或反复验证界面效果。视觉与交互体验的最终反馈由用户提供，再据此迭代优化。

---

## 0. Claude 的工作方式（每次任务必读）

### 开工前：先找，再写

1. 阅读本文件和与任务有关的 `docs/` 文档；观察现有代码风格。
2. 搜索已有 **类型、基类、Selector、Controller、Motion preset、Less token、通用组件**。
3. 判断需求归属：`core / systems / controllers / presentation / components / games/<id> / app`。
4. 能组合已有能力就不要新增抽象；仅为一个游戏特有的逻辑，留在该游戏内。
5. 预计要触碰公共协议时，先说明：**为什么现有能力不够、影响哪些游戏、怎样验证兼容性**。

### 完成后：必须检查

- TypeScript 严格类型检查、ESLint、相关测试、静态构建（执行仓库已有脚本）。
- 游戏规则不依赖 React、Motion、Less、DOM、网络或浏览器存储。
- Action 只能从统一入口提交；没有第二份权威游戏状态。
- 没有重复实现已有的协议、动画预设、状态计算或样式 token。
- 新增字段、类型、文件有明确语义；改了公共协议必须检查所有现有游戏。
- 回答时用中文简述：**改了什么、复用了什么、验证了什么、尚有哪些限制**。

### 不允许的行为

- 为完成一个小游戏而修改核心协议，且没有跨游戏的真实证据。
- 在 React 组件中实现胜负、伤害、回合切换等游戏规则。
- 用 `any`、`as unknown as`、`@ts-ignore` 掩盖类型设计问题（确需例外须解释并限制范围）。
- 新建 `utils.ts`、`helpers.ts`、`manager.ts` 之类不说明职责的万能文件。
- 每个游戏自己实现存档、玩家生命周期、通用弹窗、通知或基础动效。
- 在纯规则函数中调用 `Math.random()`、`Date.now()`、`window`、`fetch()` 或直接播放动画。
- 为“以后可能需要”创建框架、抽象父类、事件总线、通用脚本语言、复杂插件加载器。
- 未确认当前依赖版本就复制过时的 API、安装额外状态库或引入新框架。

---

## 1. 技术约定与目标边界

| 类别 | 选择 / 规则                                                      |
| ---- | ---------------------------------------------------------------- |
| 语言 | TypeScript，启用 `strict`                                        |
| Web  | React，函数组件 + Hooks                                          |
| 工具 | Vite（静态资源构建）                                             |
| 动画 | `motion`，从 `motion/react` 导入                                 |
| 样式 | Less + CSS Modules，主题用 CSS 自定义属性                        |
| 校验 | Zod（存档和外部输入的运行时边界）                                |
| 测试 | Vitest；组件测试按实际需求添加                                   |
| 部署 | 静态网站；首版无自建服务端                                       |
| 状态 | 游戏状态由 `GameSession` 唯一持有；React 管 UI 局部状态          |
| AI   | 同一个 `PlayerController` 协议接入人类、随机玩家、搜索算法和 LLM |

初版仅支持：**离散行为、顺序回合、有限玩家、单机运行的决策游戏**。

初版明确不做：实时动作游戏、联机同步、ECS、跨游戏技能编辑器、通用规则 DSL、大型事件总线、微服务、Monorepo。未来遇到真实需求再评估。

**第一款游戏：五子棋。第二款建议：黑白棋。** 第二款用于检验核心协议是否真正可复用。

---

## 2. 目录结构与职责

以下是**目标目录**，不是必须一次性创建的清单。`[按需]` 表示只有需要时才生成。

```text
/
├─ CLAUDE.md                           # 本文件：AI 开发总规约
├─ README.md                           # 项目介绍、开发与部署
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ eslint.config.js                    # 依赖方向 / import 约束
├─ docs/
│  ├─ ARCHITECTURE.md                  # 架构总览、依赖方向、生命周期
│  ├─ GAME_PROTOCOL.md                 # Game / Action / State / Event 契约
│  ├─ NAMING.md                        # 项目术语、字段命名、ID 规范
│  ├─ MOTION.md                        # 动效语义、节奏、重放、无障碍
│  ├─ DESIGN_SYSTEM.md                 # 字体、色彩、间距、游戏主题
│  ├─ GAME_TEMPLATE.md                 # 新游戏接入检查单
│  └─ decisions/                       # [按需] 重大架构决策记录
├─ public/                             # 静态图标、favicon 等
└─ src/
   ├─ main.tsx
   ├─ app/
   │  ├─ App.tsx                       # 页面入口与顶层组合
   │  ├─ providers/                    # 全局主题、MotionConfig 等
   │  └─ pages/                        # 游戏目录、游戏详情、设置
   │
   ├─ core/                            # 纯 TS，不依赖 React/浏览器
   │  ├─ contracts/
   │  │  ├─ game.ts                    # GameDefinition / Transition
   │  │  ├─ player.ts                  # PlayerId / PlayerController
   │  │  ├─ action.ts                  # Action 基本约定
   │  │  ├─ event.ts                   # GameEvent 基本约定
   │  │  └─ result.ts                  # GameResult
   │  ├─ game/
   │  │  └─ BaseGame.ts               # 抽象类、通用默认行为
   │  ├─ session/
   │  │  ├─ GameSession.ts            # 状态所有权、校验、执行、订阅
   │  │  └─ turn-loop.ts              # [按需] 玩家轮转驱动
   │  ├─ persistence/
   │  │  ├─ save-envelope.ts          # 存档元信息与版本
   │  │  └─ codec.ts                  # 序列化与恢复
   │  └─ history/
   │     ├─ action-record.ts          # 行为日志
   │     └─ replay.ts                 # [按需] 按行为重放
   │
   ├─ systems/                          # 跨游戏、纯 TS 的可选规则系统
   │  └─ effects/                       # [按需] 非五子棋首版所需
   │     ├─ effect-definition.ts
   │     ├─ effect-instance.ts
   │     └─ effect-selectors.ts
   │
   ├─ controllers/                      # 决策者适配器
   │  ├─ HumanController.ts
   │  ├─ RandomController.ts
   │  ├─ SearchController.ts           # [按需]
   │  └─ LLMController.ts              # [按需]
   │
   ├─ integrations/                     # 外部服务边界
   │  └─ llm/                           # [按需] 提示词/模型适配器/输出校验
   │     ├─ types.ts
   │     └─ providers/
   │
   ├─ presentation/                     # 纯表现层通用能力
   │  ├─ hooks/
   │  │  └─ useGameSnapshot.ts         # Session -> React 的订阅桥
   │  ├─ derived/
   │  │  └─ resolveDerived.ts          # 静态 / 动态展示字段解析
   │  ├─ view-model/                   # [按需] 通用视图映射
   │  └─ motion/
   │     ├─ tokens.ts                  # 动效时长、弹性、缓动
   │     ├─ presets.ts                 # enter/exit/impact 等预设
   │     ├─ types.ts                   # AnimationCue / CueId
   │     ├─ CuePlayer.tsx              # [按需] 一次性动画播放
   │     └─ useMotionCues.ts           # [按需] 事件到演出的订阅
   │
   ├─ components/                       # 纯通用 UI，不认识具体游戏规则
   │  ├─ primitives/
   │  │  ├─ Button/
   │  │  │  ├─ Button.tsx
   │  │  │  └─ Button.module.less
   │  │  └─ Dialog/                    # [按需]
   │  ├─ layout/
   │  │  ├─ GameShell/
   │  │  └─ PageFrame/
   │  ├─ game/
   │  │  ├─ TurnIndicator/             # 通用回合标识
   │  │  ├─ GameToolbar/               # 通用操作栏
   │  │  └─ MatchResult/               # 通用结算信息
   │  └─ feedback/                     # [按需] Toast、错误、加载反馈
   │
   ├─ games/
   │  ├─ registry.ts                   # 唯一的游戏注册入口
   │  └─ gomoku/
   │     ├─ index.ts                   # 插件元信息与注册出口
   │     ├─ domain/                    # 纯 TS，不依赖 React
   │     │  ├─ types.ts                # GomokuState / GomokuAction
   │     │  ├─ schema.ts               # 状态 / 行为 Zod 校验
   │     │  ├─ GomokuGame.ts           # BaseGame 子类
   │     │  ├─ rules.ts                # 纯规则函数
   │     │  └─ selectors.ts            # 与游戏规则相关的派生计算
   │     ├─ ui/
   │     │  ├─ GomokuView.tsx
   │     │  ├─ GomokuBoard.tsx
   │     │  └─ GomokuBoard.module.less
   │     ├─ motion/
   │     │  └─ gomoku-cues.ts          # 领域事件 -> 该游戏的动效语义
   │     ├─ styles/
   │     │  └─ theme.less              # 该游戏的个性化 CSS 变量
   │     └─ __tests__/
   │        ├─ rules.test.ts
   │        └─ contract.test.ts
   │
   ├─ styles/
   │  ├─ tokens.less                   # Less 编译期尺寸/混入参数等
   │  ├─ mixins.less                   # 纯视觉复用
   │  ├─ reset.less
   │  ├─ global.less
   │  └─ themes/
   │     ├─ default.less               # 全站默认 CSS 变量
   │     ├─ light.less                 # [按需]
   │     └─ dark.less                  # [按需]
   │
   ├─ shared/
   │  └─ utils/                        # 真正跨层且无领域语义的纯工具
   └─ assets/                           # 随构建打包的字体以外的本地资源/图形
```

### 文件应该放在哪里？快速判断

| 需求                                  | 位置                                         |
| ------------------------------------- | -------------------------------------------- |
| 所有游戏共享的状态转换/生命周期       | `src/core/`                                  |
| 游戏存档、恢复、行为日志              | `src/core/persistence/`、`src/core/history/` |
| 多个游戏都需要的规则效果/资源机制     | `src/systems/`（至少两个真实使用场景再抽取） |
| 人类、随机算法、LLM 玩家实现          | `src/controllers/`                           |
| 模型提供商的 HTTP / Prompt / 输出解析 | `src/integrations/llm/`                      |
| React 订阅游戏状态、通用 ViewModel    | `src/presentation/`                          |
| 全局 Motion 参数 / 复用动画           | `src/presentation/motion/`                   |
| 通用按钮、对话框、游戏外壳            | `src/components/`                            |
| 五子棋具体落子与胜负规则              | `src/games/gomoku/domain/`                   |
| 五子棋棋盘交互与布局                  | `src/games/gomoku/ui/`                       |
| 五子棋特有动画映射                    | `src/games/gomoku/motion/`                   |
| 五子棋专有配色与质感                  | `src/games/gomoku/styles/theme.less`         |
| 跨游戏色彩/排版/间距                  | `src/styles/`                                |

> 约定：**通用视觉组件放 `components`；通用视觉逻辑放 `presentation`；游戏特有视觉放 `games/<id>/ui`。** 不要把游戏规则塞进 `components`，也不要把组件塞进 `core`。

---

## 3. 严格依赖方向（比目录名更重要）

```text
[箭头含义：左侧模块可以 import 右侧模块]

systems ──> core
games/<id>/domain ──> core + systems + shared
controllers ──> core + shared（模型服务通过注入的 integrations 适配器）
presentation ──> core + shared
components ──> presentation + core + shared
games/<id>/ui ──> 自己的 domain + components + presentation
games/<id>/motion ──> 自己的事件类型 + presentation/motion
app ──> 上述各层（唯一组合根）
```

为了避免箭头歧义，以下**文字规则优先**：

- `core` **不得 import** `systems / games / controllers / integrations / presentation / components / app`。
- `systems` 可以 import `core`；不得 import 某个具体游戏或 UI。
- `games/<id>/domain` 可以 import `core / systems / shared`；不得 import React、Motion、Less 或其他游戏。
- `controllers` 可以 import `core / shared`，需要模型调用时通过 `integrations` 提供的适配器注入；通用 Controller 不写死某款游戏。
- `presentation` 可以 import `core / shared`，但不得依赖具体游戏的 domain/UI。
- `components` 可以 import `presentation / core / shared / styles`；不得 import `games/*`。
- `games/<id>/ui` 可以 import 本游戏 domain、`components / presentation / styles`。
- `games/<id>/motion` 可以 import 本游戏的事件类型以及通用 Motion 类型；不得反向影响规则。
- `app` 是唯一组合根，负责注册游戏、装配 Controller/Provider/页面。
- 不允许循环依赖；不允许跨游戏目录直接复用另一个游戏的内部文件。确有共享需求时，抽到明确命名的通用模块。

在 ESLint 中将这些限制做成可执行的 import boundary 规则，不能只写在文档里。

---

## 4. 统一数据语言：Definition / Instance / State / Action / Event

**先区分“是什么、现在怎样、刚刚发生什么”，再决定字段写在哪里。**

| 词汇           | 固定语义                                | 可存档？                |
| -------------- | --------------------------------------- | ----------------------- |
| `Definition`   | 不可变的规则/实体定义，可能包含函数     | 不直接存储；保存其 ID   |
| `Instance`     | 定义在一局游戏中的具体实例              | 是                      |
| `State`        | 游戏当前唯一可信的运行时事实            | 是                      |
| `Action`       | 玩家想做的事，提交前必须验证            | 可以记录                |
| `Observation`  | 当前玩家允许看到的信息                  | 视规则决定              |
| `Transition`   | 一次行为的 `nextState + events`         | 不直接作为游戏状态      |
| `Event`        | 规则已确认发生的领域事实                | 可独立记录用于回放/分析 |
| `Selector`     | 从 State 计算数据的纯函数               | 否                      |
| `Derived`      | 静态或按 Context 计算的**展示属性**     | 否                      |
| `ViewModel`    | UI 消费的最终显示数据                   | 通常不存                |
| `AnimationCue` | 一次性的视听演出意图                    | 不属于 Game State       |
| `Controller`   | 将 Observation 转成 Action 的玩家决策者 | 不存为游戏规则          |
| `Session`      | 一局游戏的编排和唯一状态所有者          | 按需存快照              |

### 类型与 class 使用边界

- `State / Action / Event / Observation / Instance` 使用普通 `type` 或 `interface`，只包含 JSON 安全数据。
- `BaseGame` 可使用 `abstract class`：统一游戏的契约、校验和默认序列化。
- `GameSession` 使用 class：负责生命周期、状态持有、订阅与执行。
- `PlayerController` 首选 interface；有共享生命周期实现时才引入 `BaseController`。
- `Selector`、规则计算和 `resolveDerived` 使用纯函数；**不要写 SelectorManager 类**。
- 状态对象内禁止保存函数、ReactNode、DOM、MotionValue、Promise、Date、Map、Set、循环引用。
- 稳定字段（`id`、`definitionId`、`rulesVersion`）始终是普通值，不使用动态函数。

### 核心接口目标（示意，具体类型以 `src/core/contracts` 为准）

```ts
type PlayerId = string;

interface Transition<S, E> {
  state: S;
  events: readonly E[];
}

interface GameDefinition<S, A, O, E> {
  readonly id: string;
  readonly rulesVersion: number;

  createInitialState(): S;
  getCurrentPlayer(state: Readonly<S>): PlayerId | null;
  getLegalActions(state: Readonly<S>, playerId: PlayerId): readonly A[];
  observe(state: Readonly<S>, playerId: PlayerId): O;
  reduce(state: Readonly<S>, playerId: PlayerId, action: A): Transition<S, E>;
  getResult(state: Readonly<S>): GameResult | null;
  serialize(state: S): string;
  restore(raw: string): S;
}
```

这里的 `GameResult` 在 `core/contracts/result.ts` 定义。**不要为了直接复制示意代码而新造一份重复的 GameResult。**

### BaseGame 的职责

`BaseGame` 提供：

1. 统一类型契约和只读 ID/规则版本。
2. `stateSchema / actionSchema` 的运行时校验入口。
3. 默认 `serialize / restore`；存档封套包含 `gameId / rulesVersion / state`。
4. 存档游戏 ID 和规则版本匹配检查。
5. [按需] 通用契约测试辅助函数。

`BaseGame` **不提供**：React、动画、AI 请求、DOM、卡牌效果系统、每款游戏的胜负判定。

存档校验只做“当前版本是否可读”；初版不预先实现庞大迁移框架。未来确实有旧版存档时，按版本显式迁移。

**规则层决定合法性；Session 是唯一的行为执行入口。** Session 检查状态、当前玩家、Action Schema、是否属于合法行为；验证失败不改变状态。游戏内部 `reduce` 假设收到已验证行为，仍应对关键约束做适当保护。

对结构化 Action，合法性比较应使用明确的规则谓词或规范化字段比较；不要用 `legalActions.includes(action)` 比较两个独立 JSON 对象的引用。

> 首版棋盘游戏可通过 `getLegalActions` 列举合法动作。若未来某游戏动作空间极大，再经真实场景评估引入专门的 `validateAction`，不要为了假设提前扩充协议。

---

## 5. State、Selector、Derived：解决动态字段反复重构

### 5.1 State 只存事实，不存可推导结果

不同时保存 `baseAttack: 10`、`rageStacks: 3`、`currentAttack: 16` 这样的多份权威数据。

优先存储基础值和效果实例，使用 Selector 算出当前属性：

```ts
function selectAttack(state: Readonly<CharacterState>): number {
  return state.baseAttack + selectAttackBonus(state);
}
```

Selector 必须纯、同步、可重复计算、不修改输入。昂贵的 Selector 可以在 UI 边界做有依据的缓存，但缓存不是正确性的前提。

### 5.2 展示字段天生允许静态 / 动态

```ts
export type Derived<T, C> = T | ((ctx: Readonly<C>) => T);

export function resolveDerived<T, C>(
  value: Derived<T, C>,
  ctx: Readonly<C>,
): T {
  return typeof value === "function"
    ? (value as (ctx: Readonly<C>) => T)(ctx)
    : value;
}
```

**只对返回值不可能是函数的展示字段使用这个简化方案**：`desc`、`visible`、`label`、`opacity`、`accent` 等。如果 `T` 本身可能是函数，必须改成显式 `constant / compute` 判别联合，避免函数值歧义。

```ts
interface EffectPresentation<C> {
  name: string;                       // 稳定名称
  desc: Derived<string, C>;           // 固定文案或动态文案
  visible?: Derived<boolean, C>;
}
```

不要在消费组件中到处写 `typeof desc === "function"`；只允许通过 `resolveDerived` 解析。

### 5.3 效果系统的 Definition 与 Instance 分离（按需实现）

```ts
interface EffectInstance {
  instanceId: string;                 // 当前实例的唯一标识
  definitionId: string;               // 引用规则定义
  sourceId: string;
  targetId: string;
  stacks: number;
  remainingTurns: number;
}

// 效果定义：只在代码中注册，可含规则钩子与动态展示字段
interface EffectDefinition<S, C> {
  id: string;
  name: string;
  desc: Derived<string, C>;
  onApply?: (state: Readonly<S>, instance: Readonly<EffectInstance>) => S;
  onExpire?: (state: Readonly<S>, instance: Readonly<EffectInstance>) => S;
}
```

这只是**未来 `systems/effects` 的约定**，五子棋第一版无需创建该系统。

每个钩子应该是纯的状态变换；初版优先用 Selector 叠加属性，而不是在添加/移除效果时反复改基础属性。真实需要细粒度事件时，让效果系统与游戏共同返回 Transition，不要在钩子里播放动画。

同一份计算应同时服务规则与文案：例如 `getRageBonus(instance)`，避免“规则加成 6，UI 写成 4”。

---

## 6. GameSession、Controller、序列化与重放

### GameSession 唯一状态所有权

标准数据流：

```text
Human / Random / Search / LLM Controller
                ↓ Action
     GameSession.dispatch(playerId, action)
                ↓
      校验玩家 / Action / 合法性
                ↓
         GameDefinition.reduce()
                ↓
       Transition { state, events }
          ↙                 ↘
  新快照 + 订阅通知       GameEvent 分发
       ↓                    ↓
  React + Selectors       Motion Cue Mapper
```

- `GameSession` 内保存唯一当前 State，外部只可读取只读快照。
- `dispatch()` 原子化：校验成功才提交新的 State、递增序号、记录 Action。
- 防止一回合重复提交；异步 Controller 必须有 `AbortSignal` / 取消策略。
- Controller 决策失败（超时、非法输出）不改变状态，采用明确的重试/失败策略。
- 任何 View、动画、LLM 均不得直接修改内部 State。
- React 用户点击通过 `HumanController.submit(action)` 完成一次决策，再由 Session 统一执行；外部控制 API 也只通过 Session `dispatch`。
- `session.subscribe` 只发布不可变状态快照；不要发布每次调用都新建的对象。

### Controller 契约

```ts
interface PlayerController<O, A> {
  readonly id: PlayerId;
  decide(ctx: {
    playerId: PlayerId;
    observation: Readonly<O>;
    legalActions: readonly A[];
    turn: number;
    signal: AbortSignal;
  }): Promise<A>;
}
```

人类、随机、搜索、LLM 遵守相同接口。**Controller 只能看到 `Observation`，不得绕过规则获取隐藏的完整 State。** 第一版先实现 `HumanController`、`RandomController`。

LLM 只返回结构化 Action；模型推理或说明是表现/分析信息，不参与规则。解析并校验它的输出，不能让模型直接返回新状态。

### 序列化与重放

- 存档格式：`{ gameId, rulesVersion, state }`，运行时通过 Zod 校验与恢复。
- `Definition` 存 ID，禁止把闭包、方法、Motion 配置写进 State。
- 行为日志至少保存：玩家 ID、Action、动作序号；必要时附规则版本/初始随机种子。
- 确定性规则必须可从同一起点 + Action 序列重放。
- 随机机制通过状态化 PRNG / 显式种子或已记录的随机结果驱动；规则函数内禁用无种子随机源。
- `Event` 是规则事实；如需记录时间等非确定性元数据，由 Session 日志包装，不混入纯规则计算。
- Undo/Redo/Replay 优先复用 Action History + 状态快照；不要让各游戏实现独立的回放框架。

---

## 7. React 与 Motion 设计规范（产品重点）

### 7.1 React 是投影视图，不是规则引擎

```text
GameSession State
      ↓ useGameSnapshot(session)
  Domain Selector
      ↓
   ViewModel
      ↓
React Components + Motion
```

React 管理的本地状态只能是：hover、selected、dragging、menuOpen、临时表单、演出阶段等 **UI State**。

游戏规则状态仅来自 Session。若将 Session 作为 React 外部状态源，使用 `useSyncExternalStore`；`getSnapshot` 在状态未变化时必须返回**同一个不可变引用**，订阅函数保持稳定。

UI 中不允许 `setBoard(...)` 来模拟落子；UI 发出 Action，Session 产生新棋盘。

### 7.2 状态动画与事件动画必须分离

**状态驱动动画**：棋子新增/删除、卡牌位置变化、属性数字变化、回合标识变化。

- 组件根据最新 ViewModel 声明式渲染。
- 首选 Motion 的 `motion.*`、`layout`、`AnimatePresence`。
- 列表动画用 `instanceId`、`pieceId` 等稳定 key，不能用索引作为动态实体的 key。

**事件驱动动画**：打击闪光、冲击波、短暂提示、音效、粒子、屏幕震动。

- Game `reduce` 输出语义化 `GameEvent`，如 `piece.placed`、`piece.captured`。
- 游戏自己的 `motion/<game>-cues.ts` 将 Event 映射成 `AnimationCue`。
- Cue 播放器使用 `sessionId:transitionIndex:eventIndex` 一类确定性 ID，确保同一事件不会因为 React 重渲染而重复播放。
- Cue 自己有队列、取消、跳过、重播能力，但**不能反向修改规则 State**。
- AnimationCue 描述“表现意图”，Motion preset 才决定具体 `scale / opacity / duration`；领域 Event 中绝不出现这些 Motion 参数。

### 7.3 动画 API 统一使用

```tsx
import { motion, AnimatePresence, MotionConfig } from "motion/react";

<MotionConfig reducedMotion="user">
  <AnimatePresence>
    {items.map(item => (
      <motion.div
        key={item.instanceId}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
      />
    ))}
  </AnimatePresence>
</MotionConfig>
```

- App 顶层统一设置 `MotionConfig reducedMotion="user"`；复杂镜头移动、闪烁、自动循环等仍需单独处理。
- 公共节奏只从 `presentation/motion/tokens.ts` 获取；不要在各游戏随意散布 `0.2`、`0.4`。
- 公共过渡放 `presets.ts`；游戏特别的节奏可在该游戏 Motion 目录覆盖。
- 优先使用 `transform`、`opacity`、Motion layout；不要让大量 React `setState` 高频驱动逐帧动画。
- 动画速度应有语义层级：`instant`、`quick`、`normal`、`deliberate`、`ceremonial`；不是所有动作都用同一时长。
- 不要等待动画完成才能把纯规则状态提交；UI 可控制点击锁、序列演出和跳过。
- 必须考虑快速连击、切换游戏、撤销、恢复存档、切换标签页、Reduced Motion 和回放快进。
- 动效质量要求：有明确起点/终点、连续的空间关系、恰当反馈，不为炫技牺牲交互可读性。

### 7.4 动画设计语言

全站统一「**数字桌游实验室 / 编辑设计 + 实体桌游质感**」：

- 明亮米白纸感、深墨色文字、一种温暖强调色；大标题、编号、细分隔线与留白。
- 动画模拟物体的**质量、接触、惯性、回弹**，而不是随机飞入。
- 五子棋：落点清晰、轻微接触回弹、最后落子标识；输赢演出克制而有仪式感。
- 黑白棋：翻面连续而可辨；象棋：移动有重量与空间方向；卡牌：层次、遮挡、弧线与翻面。
- 背景演出不能盖过行动作反馈；低性能设备与无障碍配置下可降级。

---

## 8. Less、主题、组件与视觉复用

### 样式三级结构

1. **全局基础**：`src/styles/reset.less`、`global.less`、`tokens.less`、`mixins.less`。
2. **站点与游戏主题**：`src/styles/themes/*.less`、`src/games/<id>/styles/theme.less`。
3. **局部组件**：与组件同目录 `*.module.less`，默认避免全局样式污染。

**Less 变量用于构建期**（间距、计算、mixin 等）；**CSS 自定义属性用于运行期**（主题色、纸面色、阴影、游戏强调色）。

示例：

```less
// src/styles/themes/default.less
:root {
  --surface-page: #f4f0e6;
  --surface-board: #e4d3b4;
  --ink-primary: #262a25;
  --ink-muted: #756f64;
  --accent-primary: #aa6048;
  --line-subtle: #c5bbaa;
  --game-accent: var(--accent-primary);
}
```

```less
// src/games/gomoku/styles/theme.less
.game-theme--gomoku {
  --game-accent: #ab5d46;
  --surface-board: #e6d4b3;
}
```

```less
// src/games/gomoku/ui/GomokuBoard.module.less
.board {
  background: var(--surface-board);
  color: var(--ink-primary);
}
```

**个性化主题只改变外观，不重新定义通用组件逻辑。** `GameShell` 以外层主题类包裹具体游戏。具体游戏可以有专属棋盘视觉和动画，但通用按钮、弹窗、回合栏不要复制。

- 组件使用 `PascalCase`；React 组件文件名与组件名一致。
- 本地样式使用 `Component.module.less`；类名采用简明语义名称，如 `.board`、`.piece`、`.selected`。
- 全局文件仅允许 reset、字体排版、token、theme，禁止随意添加 `.button` 等易冲突选择器。
- 视觉尺寸基于共享 token；禁止同一含义维护多份颜色字面量。
- 对游戏专属的 SVG、Canvas 等表现方式保持开放，但规则来源仍然只能是 State / ViewModel。
- 不要为了共享 CSS 把两种完全不同的游戏棋盘强行设计成“万能棋盘组件”。

---

## 9. 新增一个游戏的标准操作

以 `games/reversi` 为例：

1. 先复习 `core/contracts`、`BaseGame`、已有 `gomoku/domain`；不要重建一套 Session。
2. 创建 `games/reversi/domain/` 的 `types.ts / schema.ts / rules.ts / ReversiGame.ts / selectors.ts`。
3. 实现初始化、当前玩家、合法行为、观察、纯状态转换、结果判定。
4. 使用同一个 Session 和 Controller 接口跑通 **Random vs Random**，无需 React。
5. 加入规则与契约测试（包括连续回合、跳过、结束条件等边界）。
6. 再创建 `ui/`、`motion/`、`styles/theme.less`，优先复用 `GameShell`、通用动作栏和动画预设。
7. 最后在 `games/registry.ts` 注册；如游戏多，使用按需加载 UI，避免一次打包所有棋盘。
8. 添加游戏自述：一句话规则、Action 示例、视觉个性、特殊行为及测试说明。

**原则：新增游戏时，默认只改 `games/<id>/` 与 `games/registry.ts`；如果频繁必须改 `core`，先审查抽象是否泄漏。**

### 契约测试最低要求

- `createInitialState()` 符合 `stateSchema`。
- 初始玩家/合法行为正确。
- 非法 Action / 错误玩家 / 游戏结束后提交不修改状态。
- `reduce` 不修改输入对象，且对相同输入确定性返回同样结果。
- `serialize → restore` 深度一致（规则版本匹配）。
- 相同初始状态 + 行为记录 => 相同结果。
- `observe` 不泄漏玩家不可见信息（对不完全信息游戏尤其重要）。
- Selector 不改变 State，派生结果与规则一致。
- 游戏能不依赖 React / DOM 独立测试。
- 至少覆盖一次正常完局与关键边界情况。

---

## 10. AI / LLM 和纯静态部署

- `controllers/LLMController.ts` 实现通用决策；`integrations/llm/` 只负责调用服务、结构化响应、校验和错误处理。
- 发送给模型的是当前 `Observation`、玩家身份、规则摘要以及允许的 Action；**不是完整内部 State**（防止隐藏信息泄漏）。
- 不允许模型自行改变状态或跳过 Session 验证；模型只能提供候选 Action。
- 提供超时、取消、有限重试、明确错误 UI；不能无限循环请求。
- 不在仓库、前端构建产物或 `VITE_*` 环境变量中放开发者的私有模型 API Key；前端变量不具备保密性。
- 首版可提供 **用户自带 Key / 用户自选支持跨域的模型端点**。若以后需要安全地代持密钥，再新增轻量代理，但游戏规则不迁往后端。
- 本地默认能在完全离线情况下进行 Human vs Human、Human vs Random 对局；LLM 是可选能力，不影响基础可用性。

---

## 11. 命名、注释、提交与质量标准

### 命名规则

| 对象         | 示例                            | 禁止/避免                              |
| ------------ | ------------------------------- | -------------------------------------- |
| 游戏 ID      | `gomoku`, `reversi`             | `game1`, `myGame`                      |
| 游戏规则类   | `GomokuGame`                    | `GomokuManager`                        |
| 状态类型     | `GomokuState`                   | `Data`, `StoreObj`                     |
| 行为类型     | `GomokuAction`、`type: "place"` | `doIt`, `actionType: 1`                |
| 领域事件     | `piece.placed`、`game.finished` | `animatePiece`, `playSound`            |
| 派生函数     | `selectWinner`, `selectAttack`  | `calc2`, `getStuff`                    |
| 状态效果定义 | `EffectDefinition`              | 混合了层数、规则和 UI 的 `effectObj`   |
| 状态效果实例 | `EffectInstance`                | 无稳定 ID 的匿名效果                   |
| 动画指令     | `AnimationCue`                  | 直接混进规则事件的 `scale`, `duration` |
| React 组件   | `GomokuBoard.tsx`               | `board.tsx`、`Board2.tsx`              |
| Less 模块    | `GomokuBoard.module.less`       | 全局 `.board` 不加作用域               |

规则域中的命名以 **行为语义** 为主：`onApply`、`onTurnEnd`、`onExpire`。不要泛用 `init/cast/remove`：它们混淆“技能释放 / 效果生效 / 效果清除”。

### 质量标准

- 优先命名准确、少量小函数、显式数据流；不要为短代码牺牲可读性。
- 每个公共模块都提供清楚的出口（必要时 `index.ts`），避免深层相对路径反复引用内部细节。
- 注释解释**为什么**和不变量，不重复说明代码已经表达的内容。
- 可导出的复杂协议需要简短 TSDoc 和一个最小用法示例。
- 新增依赖必须说明：解决什么已有依赖无法解决的问题、带来多大维护成本。
- 重大类型调整同时改契约测试和关联文档；不要制造代码与文档两个版本的真相。

### 完成任务时的答复格式

```text
变更：
- ...

复用：
- 使用了哪些已有核心能力 / 组件 / Motion preset / Less token

验证：
- typecheck / lint / test / build 的实际执行结果

注意：
- 已知限制与未来按需事项（如无则写“无”）
```

---

## 12. Windows / PowerShell 7 开发约定

默认开发环境为 **Windows + PowerShell 7（pwsh）**。给出的命令必须能在 pwsh 下运行，不要直接使用 Bash 专属语法（如 `rm -rf`、`export NAME=...`、`&&` 在不确定版本的 PowerShell 中依赖 shell 语义）。

优先检查 `package.json` 的现有 scripts，**不要假设仓库已经安装了某个包管理器或脚本**。

```powershell
# 常用检查；脚本名以当前 package.json 为准
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build

# 查找现有定义：优先使用已安装的 ripgrep
rg "BaseGame|Derived|GameSession|AnimationCue" src

# 没有 rg 时可用 PowerShell 内置搜索
Get-ChildItem src -Recurse -File |
  Select-String -Pattern "BaseGame|Derived|GameSession|AnimationCue"
```

项目已经使用 `pnpm` 或 `npm` 时，始终遵守 lockfile 和现有包管理器，不擅自切换。

---

## 13. 当前实施顺序（防止规范变成过度设计）

### Phase 1：五子棋的最小协议

只实现：

- `core`：State/Action/Observation/Transition 契约、`BaseGame`、`GameSession`、存档序列化。
- `controllers`：Human / Random。
- `games/gomoku/domain`：规则、Zod Schema、契约测试。
- 能在无 React 的测试环境中自动完成 Random vs Random。

### Phase 2：完整视觉与动效

- React 游戏外壳与 GomokuView。
- `useGameSnapshot` + 派生 ViewModel。
- Less token / theme / CSS Modules。
- Motion enter/exit/layout 与落子反馈；事件 Cue 仅在需要一次性演出时加入。
- 本地双人、Human vs Random、Undo/Replay（按需求先后）。

### Phase 3：AI 与第二款游戏

- LLM Controller 与静态部署安全边界。
- 黑白棋接入，验证第二款游戏尽量不修改 `core`。
- 只有两个游戏真正共享某套规则机制时，才提炼到 `systems/`。

### 终极收敛规则

**Game = State + Action + Rules**

**Player = Observation → Action**

**Runtime = Game + Controllers + History**

**Presentation = Selector(State) + Motion(Event)**

> 永远优先询问：**这个数据是“事实”还是“派生展示”？这个逻辑是“规则”还是“演出”？这段能力已经存在于哪个层？**
> 如果三个问题都回答清楚，通常不需要重构整个架构。
