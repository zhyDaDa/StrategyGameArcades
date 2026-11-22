const BOARD_SIZE = 9
const PAD = 12
const STEP = 9.5

/** 棋盘坐标 0..8，交点像素位置 = PAD + index * STEP。调整局面只改下面几张表。 */
const INDEXES = Array.from({ length: BOARD_SIZE }, (_, index) => index)
const position = (index: number) => PAD + index * STEP

/** 9×9 缩略棋盘上的星位。 */
const STAR_POINTS = [
  { row: 2, col: 2 },
  { row: 2, col: 6 },
  { row: 4, col: 4 },
  { row: 6, col: 2 },
  { row: 6, col: 6 },
] as const

interface Stone {
  readonly row: number
  readonly col: number
}

const BLACK_STONES: readonly Stone[] = [
  { row: 2, col: 2 },
  { row: 2, col: 3 },
  { row: 3, col: 2 },
  { row: 5, col: 4 },
  { row: 6, col: 4 },
  { row: 5, col: 5 },
  { row: 6, col: 5 },
  { row: 3, col: 6 },
  { row: 3, col: 7 },
]

const WHITE_STONES: readonly Stone[] = [
  { row: 3, col: 3 },
  { row: 4, col: 3 },
  { row: 4, col: 2 },
  { row: 5, col: 3 },
  { row: 6, col: 3 },
  { row: 7, col: 4 },
  { row: 4, col: 5 },
  { row: 3, col: 5 },
  { row: 4, col: 6 },
]

/** 首页缩略图：静态 9×9 局面，标记落在黑棋最后一子上。 */
export function GoThumbnail() {
  const lastBlack = BLACK_STONES.at(-1)

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" fill="#e6d4b3" />
      {INDEXES.map((index) => {
        const at = position(index)
        return (
          <g key={index} stroke="#b29a72" strokeWidth="0.9">
            <line x1={PAD} y1={at} x2={position(BOARD_SIZE - 1)} y2={at} />
            <line x1={at} y1={PAD} x2={at} y2={position(BOARD_SIZE - 1)} />
          </g>
        )
      })}
      {STAR_POINTS.map(({ row, col }) => (
        <circle
          key={`star-${row}-${col}`}
          cx={position(col)}
          cy={position(row)}
          r="1.1"
          fill="#8a7450"
        />
      ))}
      {WHITE_STONES.map(({ row, col }) => (
        <circle
          key={`white-${row}-${col}`}
          cx={position(col)}
          cy={position(row)}
          r="4.1"
          fill="#f7f2e6"
          stroke="#b29a72"
          strokeWidth="0.7"
        />
      ))}
      {BLACK_STONES.map(({ row, col }) => (
        <circle
          key={`black-${row}-${col}`}
          cx={position(col)}
          cy={position(row)}
          r="4.1"
          fill="#262a25"
        />
      ))}
      {lastBlack ? (
        <circle
          cx={position(lastBlack.col)}
          cy={position(lastBlack.row)}
          r="1.2"
          fill="#aa6048"
        />
      ) : null}
    </svg>
  )
}