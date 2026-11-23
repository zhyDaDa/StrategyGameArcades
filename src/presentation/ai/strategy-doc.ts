import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'

/**
 * 为当前游戏生成一份可下载的策略说明：
 * 规则、decide() 契约、context、真实 observation 样例、合法动作样例与沙箱限制。
 */
export function buildStrategyDoc(context: AiGameTestContext, seatId: string): string {
  const position = context.createPosition(seatId)
  const observation = JSON.stringify(position.observation, null, 2)
  const actionTotal = position.legalActions.length
  const actionSample = JSON.stringify(position.legalActions.slice(0, 20), null, 2)

  return `# ${context.gameName} · JavaScript 策略说明

游戏 ID：\`${context.gameId}\`
当前样例席位：\`${seatId}\`
协议版本：1

## 规则

${context.rulesSummary}

## 入口函数

\`\`\`js
function decide(observation, legalActions, context) {
  return legalActions[0]
}
\`\`\`

- 必须是同步函数，不能返回 Promise。
- 返回值必须与 \`legalActions\` 中某一项 **JSON 结构完全一致**。
- 返回非法动作、抛出异常或超时都会显式报错，本回合不会落子。
- 不能依赖跨回合状态：每次调用都是全新的 QuickJS 运行时。

## context

\`\`\`json
${JSON.stringify({ playerId: position.playerId, turn: position.turn, gameId: context.gameId }, null, 2)}
\`\`\`

## 当前样例 observation

\`\`\`json
${truncate(observation, 12_000)}
\`\`\`

## 合法动作（共 ${actionTotal} 个，以下为前 ${Math.min(actionTotal, 20)} 个）

\`\`\`json
${truncate(actionSample, 8_000)}
\`\`\`

## 执行限制

- 在独立 Web Worker 的 QuickJS WASM 解释器中执行。
- 没有 DOM、\`fetch\`、\`localStorage\`、\`window\` 或 API Key。
- 源码上限 64KB；内存上限 64MB；栈上限 1MB。
- 单步超时 500ms–5s（配置页可选），超时后 Worker 被终止。
- \`console.log/info/warn/error\` 会显示在测试面板，日志最多 50 条。
- Worker 是资源隔离与超时手段，不是完整安全边界；真正的边界来自 QuickJS 不暴露宿主能力。

## 测试

配置页「测试策略」会用一份真实样例局面执行一次，只有返回合法动作才算通过。
修改源码、名称或超时后，旧测试结果立即失效。
`
}

export function downloadStrategyDoc(context: AiGameTestContext, seatId: string): void {
  const content = buildStrategyDoc(context, seatId)
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${context.gameId}-strategy.md`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}\n...（已截断）` : value
}