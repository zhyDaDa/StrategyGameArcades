# 编写 JavaScript 策略

## 1. 运行方式

代码在 **QuickJS WebAssembly 解释器**里执行，运行于独立 Worker：

- 没有 DOM、`fetch`、`localStorage`、`window`、API Key；
- 只有只读的 `observation`、`legalActions`、`context` 与受限 `console`；
- 你写的策略不会被拼进页面主线程，也不会用 `eval` / `new Function` 在页面执行；
- 单步超时（默认 2s，可调 500ms–5s）后 QuickJS 被中断，Worker 被终止；
- 内存上限 64MB，栈上限 1MB，源码上限 64KB，日志最多 50 条。

**Worker 是资源隔离与超时手段，不是完整安全沙箱。** 真正的边界是 QuickJS 本身不暴露宿主能力。

## 2. 协议

```js
function decide(observation, legalActions, context) {
  return legalActions[0]
}
```

- `decide` 必须是全局函数，**同步**返回一个动作；不支持 Promise。
- 返回值必须与 `legalActions` 中某一项 JSON 结构完全一致。
- `context`：`{ playerId, turn, gameId }`。
- 非法动作、结构不符、抛异常、超时都会显式报错，本回合不会落子，也不会回退成随机动作。

`console.log/info/warn/error` 的输出会显示在测试面板，便于调试。

## 3. 各游戏动作形状

| 游戏 | 动作 |
| --- | --- |
| 五子棋 | `{ "type": "place", "row": 7, "col": 7 }`、`{ "type": "resign" }` |
| 围棋 | `{ "type": "place", "row": 3, "col": 3 }`、`{ "type": "pass" }`、`{ "type": "resign" }` |
| 黑白棋 | `{ "type": "place", "row": 2, "col": 3 }` |
| 中国象棋 | `{ "type": "move", "from": { "row": 9, "col": 0 }, "to": { "row": 8, "col": 0 } }` |
| 国际象棋 | `{ "type": "move", "from": { "row": 6, "col": 4 }, "to": { "row": 4, "col": 4 }, "promotion": null }`；升变时 `promotion` 为 `"queen" / "rook" / "bishop" / "knight"` |
| 方格大战 | `{ "type": "draw-edge", "orientation": "horizontal", "row": 0, "col": 0 }`；竖边 `orientation: "vertical"` |
| 九宫井字棋 | `{ "type": "place", "row": 4, "col": 4 }` |

`observation` 都是公开局面；常用字段：

- 棋盘类：`size`、`cells`（行优先扁平数组）、`currentPlayer`、`lastMove`、`moveCount`；
- 围棋另有 `koPoint`、`captured`、`consecutivePasses`；
- 方格大战：`horizontalEdges` / `verticalEdges` / `boxes` / `players`；
- 象棋/国际象棋：`cells`（棋子对象或 null）、`casting`/`castling` 等规则事实。

配置页的「查看测试局面与合法动作示例」会显示当前游戏的真实样例，直接照着写即可。

## 4. 示例：五子棋优先堵四

```js
function decide(observation, legalActions) {
  const me = observation.currentPlayer
  const opponent = me === 'black' ? 'white' : 'black'
  const size = observation.size
  const cells = observation.cells

  function get(r, c) {
    return r >= 0 && r < size && c >= 0 && c < size ? cells[r * size + c] : 'wall'
  }

  // 四个方向、以候选点为中心，统计同色连子与开放端
  function score(r, c, side) {
    let total = 0
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      let len = 1
      let open = 0
      for (const sign of [1, -1]) {
        let rr = r + dr * sign
        let cc = c + dc * sign
        while (get(rr, cc) === side) {
          len += 1
          rr += dr * sign
          cc += dc * sign
        }
        if (get(rr, cc) === 'empty') open += 1
      }
      if (len >= 5) total += 1e6
      else if (len === 4) total += open === 2 ? 50000 : 8000
      else if (len === 3) total += open === 2 ? 3000 : 400
    }
    return total
  }

  const places = legalActions.filter((a) => a.type === 'place')
  if (places.length === 0) return legalActions[0]

  places.sort((a, b) => {
    const mine = score(b.row, b.col, me) + score(b.row, b.col, opponent) * 0.9
    const theirs = score(a.row, a.col, me) + score(a.row, a.col, opponent) * 0.9
    return mine - theirs
  })
  return places[0]
}
```

## 5. 测试、保存、导入导出

- 「测试策略」使用**真实样例局面**执行一次，返回合法动作才通过。
- 通过后配置指纹被记录；改动源码/名称/超时都会使测试失效，需重新测试。
- 策略随本局配置保存在 `table.match.<gameId>`；换游戏需要重新导入。
- 「导出策略」生成 JSON：

```json
{
  "format": "strategy-game-arcades/javascript-strategy",
  "version": 1,
  "name": "我的策略",
  "language": "javascript",
  "source": "function decide(...) { ... }",
  "timeoutMs": 2000
}
```

「导入策略」只接受上述格式；不执行 JSON 内的任何其它字段。

## 6. 限制

- 只支持同步、单次 `decide`；不能保存跨回合状态（QuickJS 运行时每次调用都是新上下文）。
- 没有模块、第三方库或网络；需要预计算的数据请直接写进源码。
- 不要写死循环或指数级搜索；超时会被中断并输掉本回合。
- QuickJS 与浏览器的 JavaScript 引擎存在少量差异；只使用标准 ES2020 语法与内置对象。
