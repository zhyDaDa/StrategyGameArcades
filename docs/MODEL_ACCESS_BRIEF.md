# 简报：StrategyGameArcades 接入大模型 / 小模型的前置说明

> 用途：交给外部调研方，用于评估「普通用户如何安全、放心地接入大模型与小模型」并产出可落地的方案。

## 1. 项目是什么

一个纯静态部署的单机桌游平台（React + TypeScript + Vite），**没有后端、没有账号系统、没有服务端数据库**，浏览器打开即玩。内置 7 款完全信息、顺序回合的抽象棋类：五子棋、围棋、黑白棋、象棋、国际象棋、点格棋、嵌套井字棋。

每个「席位」（玩家位）可选择一种接入方式，目前定义四类：

- **人类**：本机热座
- **算法**：内置启发式/搜索，纯本地
- **大模型**：云端推理，通过兼容接口
- **小模型**：本地推理

前两类已可开局；后两类只做完了接口与适配器雏形，配置页标记为不可开局。

## 2. 统一接口（关键架构事实）

- 每局状态由 `GameSession` 唯一持有，规则层不依赖 React/网络/浏览器存储。
- 每个决策者实现同一个 `PlayerController`：输入 = 当前玩家可见的 `Observation` + 合法 `Action` 列表 + 回合数 + `AbortSignal`；输出 = 一个 `Action`。
- 大模型控制器已存在：把规则摘要、Observation JSON、合法动作 JSON 拼成 system + user 两条消息发出，要求模型只输出一个 JSON；返回后必须命中合法动作集合，否则默认重试 1 次后显式报错。
- 已有两个客户端适配器：OpenAI 兼容 Chat Completions（OpenAI / OpenRouter / Ollama 等）、Anthropic Messages API；均为**浏览器 fetch 直连 + 用户自带 Key**。
- 抽象边界是 `LlmClient.complete(messages, signal)`，替换 provider 不影响控制器。

## 3. 两个接入方式的使用场景

**大模型（云端）**

- 想要更强的对手或不同风格，但本机不想装模型。
- 用户已有 OpenAI / Anthropic / OpenRouter / 国内兼容接口的 Key。
- 有网，能接受每步数秒延迟。
- 潜在延伸：赛后复盘、解说、提示（当前协议只允许它输出合法 Action）。

**小模型（本地）**

- 完全离线，或对「数据不出本机」有硬要求。
- 零费用、低延迟。
- 形态未定，候选：浏览器内 WebGPU 推理（WebLLM / transformers.js，需下载模型权重）；或连接本机 localhost 推理服务（Ollama / LM Studio / llama.cpp）。
- 棋盘决策对结构化 JSON 输出要求高，小参数模型是否够用需要实测。

## 4. 实际会发出去的数据

无论哪种模型，一次决策只发送：

- 游戏名 + 简短规则摘要
- `Observation` JSON（棋盘格状态、当前玩家、最后落子、步数等，全部是公开棋局信息）
- 当前合法动作 JSON 列表

不含账号、设备标识、浏览历史、对局历史、真实姓名。真人席位名由用户自填，仅存 localStorage，不进入模型请求。所有内置游戏都是完全信息博弈，Observation 不含隐藏信息。

## 5. 当前数据安全现状

- 纯静态站，**无法安全保管任何服务端密钥**；`VITE_*` 变量会进入构建产物，不能放 Key。
- Key 目前尚未落盘（没有任何存储代码），配置 UI 也未接通。
- 浏览器直连第三方 API 会把 Key 暴露在页面脚本与浏览器环境中；Anthropic 直连需 `anthropic-dangerous-direct-browser-access` 头，并依赖其 CORS 支持。
- localStorage 目前只存主题和对局快照（含棋盘与席位名）。

## 6. 需要调研并给出方案的核心问题

1. 普通用户如何在不理解「API Key / CORS / 代理」的前提下**安全且放心**地接入？请按「信任感」而不只是技术可行性评估。
2. 列出可行路径并比较：浏览器 BYOK 直连 / 浏览器内 WebGPU 推理 / localhost 推理服务 / 可选的轻量代理（项目坚持静态部署，引入后端需说明是否值得破例）。
3. 各家 provider 的浏览器直连 CORS 现状（OpenAI、Anthropic、OpenRouter、DeepSeek、通义、智谱、Ollama 等），哪些真能在纯前端跑通。
4. Key 存储策略：内存-only、sessionStorage、localStorage、加密存储的取舍；UI 上如何让用户清楚知道 Key 存在哪里、怎么删除。
5. 小模型技术选型：WebGPU 运行时、模型体积/内存/首次下载体验、结构化 JSON 输出可靠性；或推荐 localhost 服务方案。
6. 信任设计：发送内容预览、连接测试、明确的「数据去向」说明、失败时报错可见、无遥测承诺、隐私说明怎么写。
7. 模型能力与成本：针对不同棋盘规模（9 格到 19×19 围棋）的 token 量与延迟；小模型是否可用；是否需要精简 Observation 格式。
8. 方案必须能嵌进现有接口：保持 `LlmClient` / `PlayerController` 不变，说明配置模型字段、校验与错误处理、UI 步骤。

## 7. 方案产出要求

- 给出一个主推路线 + 一个备选，说明理由与风险。
- 明确哪些是纯前端能做到的，哪些必须引入后端/代理。
- 给出可执行的接入步骤与失败处理策略。
- 不要用大量兜底掩盖问题；逻辑不确定时应显式报错，方便定位。

## 附：相关代码位置

- `src/controllers/LLMController.ts`：模型决策与输出校验
- `src/integrations/llm/`：`LlmClient` 接口与 provider 适配器
- `src/presentation/match-setup/`：席位接入方式定义与配置校验
- `src/core/contracts/`：`PlayerController`、`Observation`、`Action` 契约