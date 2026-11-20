import { pageTransitionTokens } from './tokens'

export interface TransitionDot {
  readonly id: string
  readonly x: number
  readonly y: number
  /** 列索引，用于从右往左 / 从左往右的错峰。 */
  readonly column: number
}

export interface DotGrid {
  readonly columns: number
  readonly rows: number
  readonly dots: readonly TransitionDot[]
}

/**
 * 生成覆盖视口的点阵。网格向外多铺一圈，圆心间距等于 cellSize，
 * 单点直径大于两倍间距，因此相邻圆必然重叠、整屏可被完全覆盖。
 */
export function buildDotGrid(width: number, height: number): DotGrid {
  const { cellSize } = pageTransitionTokens
  const columns = Math.ceil(width / cellSize) + 2
  const rows = Math.ceil(height / cellSize) + 2
  const dots: TransitionDot[] = []

  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      dots.push({
        id: `${column}-${row}`,
        x: (column - 1) * cellSize + cellSize / 2,
        y: (row - 1) * cellSize + cellSize / 2,
        column,
      })
    }
  }

  return { columns, rows, dots }
}

/** 点阵覆盖 / 露出的总时长（秒），含最后一次错峰与提交缓冲。 */
export function gridAnimationSeconds(grid: DotGrid): number {
  const { columnStagger, dotDuration, settleBuffer } = pageTransitionTokens
  return (grid.columns - 1) * columnStagger + dotDuration + settleBuffer
}