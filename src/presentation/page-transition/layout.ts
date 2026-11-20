import { pageTransitionTokens } from './tokens'

export interface TransitionBubble {
  readonly id: string
  readonly x: number
  readonly y: number
  /** 该气泡的启动延迟（秒），由二维坐标投影算出。 */
  readonly delay: number
}

export interface BubbleMatrix {
  readonly columns: number
  readonly rows: number
  /** 单气泡直径：单元对角线 + 冗余，满屏时相邻气泡互相重叠，覆盖无缝隙。 */
  readonly diameter: number
  readonly bubbles: readonly TransitionBubble[]
}

/**
 * 斜向波浪延迟：把每个气泡中心按归一化坐标投影到一个倾斜波前上。
 * 投影值越小越先启动，因此右上方最先、左下方最后，波前与垂直方向成 `angleDeg`。
 *
 * projection = (1 - x) + slope * (y - 0.5)
 * slope = tan(angle) * aspect，用于把归一化的 x/y 换算到同一屏幕尺度。
 */
export function computeWaveDelay(
  x: number,
  y: number,
  angleDeg: number,
  aspect: number,
  maxDelay: number,
): number {
  const slope = Math.tan((angleDeg * Math.PI) / 180) * aspect
  const projection = (1 - x) + slope * (y - 0.5)
  const progress = (projection + slope / 2) / (1 + slope)
  const clamped = Math.max(0, Math.min(1, progress))
  return clamped * maxDelay
}

/** 按视口均分网格；每个单元中心放一个气泡，直径覆盖整格对角线。 */
export function buildBubbleMatrix(width: number, height: number): BubbleMatrix {
  const { cellSize, maxBubbleCount, bubbleOverlap, waveAngle, maxStagger } = pageTransitionTokens
  const fittedCellSize = Math.max(cellSize, Math.sqrt((width * height) / maxBubbleCount))
  const columns = Math.max(1, Math.ceil(width / fittedCellSize))
  const rows = Math.max(1, Math.ceil(height / fittedCellSize))
  const cellWidth = width / columns
  const cellHeight = height / rows
  const diameter = Math.hypot(cellWidth, cellHeight) + bubbleOverlap
  const aspect = height / width
  const bubbles: TransitionBubble[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column + 0.5) * cellWidth
      const y = (row + 0.5) * cellHeight
      bubbles.push({
        id: `${column}-${row}`,
        x,
        y,
        delay: computeWaveDelay(x / width, y / height, waveAngle, aspect, maxStagger),
      })
    }
  }

  return { columns, rows, diameter, bubbles }
}