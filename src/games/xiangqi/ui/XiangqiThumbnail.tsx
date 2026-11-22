import type { XiangqiCoord, XiangqiPieceType, XiangqiSide } from '../domain/types'

const ORIGIN_X = 10
const ORIGIN_Y = 5
const STEP = 10
const PIECE_FONT =
  'KaiTi, STKaiti, Kaiti SC, Songti SC, STSong, SimSun, Noto Serif CJK SC, serif'

const COLUMNS = Array.from({ length: 9 }, (_, index) => index)
const ROWS = Array.from({ length: 10 }, (_, index) => index)

const x = (col: number) => ORIGIN_X + col * STEP
const y = (row: number) => ORIGIN_Y + row * STEP

interface ThumbPiece {
  readonly row: number
  readonly col: number
  readonly side: XiangqiSide
  readonly type: XiangqiPieceType
}

const LABELS: Record<XiangqiSide, Record<XiangqiPieceType, string>> = {
  red: {
    general: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '兵',
  },
  black: {
    general: '将',
    advisor: '士',
    elephant: '象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '卒',
  },
}

const PIECES: readonly ThumbPiece[] = [
  { row: 0, col: 0, side: 'black', type: 'chariot' },
  { row: 0, col: 2, side: 'black', type: 'elephant' },
  { row: 0, col: 4, side: 'black', type: 'general' },
  { row: 0, col: 7, side: 'black', type: 'horse' },
  { row: 2, col: 7, side: 'black', type: 'cannon' },
  { row: 4, col: 4, side: 'black', type: 'soldier' },
  { row: 6, col: 2, side: 'red', type: 'soldier' },
  { row: 7, col: 0, side: 'red', type: 'chariot' },
  { row: 7, col: 4, side: 'red', type: 'cannon' },
  { row: 8, col: 3, side: 'red', type: 'advisor' },
  { row: 9, col: 4, side: 'red', type: 'general' },
  { row: 8, col: 6, side: 'red', type: 'horse' },
]

const LAST_MOVE: XiangqiCoord = { row: 6, col: 2 }
const RED = '#a62f27'
const BLACK = '#26231f'

/** 首页缩略图：静态中局，红点标记红方最后一手。 */
export function XiangqiThumbnail() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" fill="#e6d4b3" />

      <g stroke="#9c8253" strokeWidth="0.7">
        <rect x={x(0)} y={y(0)} width={STEP * 8} height={STEP * 9} fill="none" />
        {COLUMNS.map((col) => {
          const left = x(col)
          if (col === 0 || col === 8) {
            return <line key={`v-${col}`} x1={left} y1={y(0)} x2={left} y2={y(9)} />
          }
          return (
            <g key={`v-${col}`}>
              <line x1={left} y1={y(0)} x2={left} y2={y(4)} />
              <line x1={left} y1={y(5)} x2={left} y2={y(9)} />
            </g>
          )
        })}
        {ROWS.map((row) => (
          <line key={`h-${row}`} x1={x(0)} y1={y(row)} x2={x(8)} y2={y(row)} />
        ))}
        <line x1={x(3)} y1={y(0)} x2={x(5)} y2={y(2)} />
        <line x1={x(5)} y1={y(0)} x2={x(3)} y2={y(2)} />
        <line x1={x(3)} y1={y(7)} x2={x(5)} y2={y(9)} />
        <line x1={x(5)} y1={y(7)} x2={x(3)} y2={y(9)} />
      </g>

      <text
        x={x(1.6)}
        y={y(4.5)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#9c8253"
        fontSize="4.2"
        fontFamily={PIECE_FONT}
        letterSpacing="0.6"
      >
        楚河
      </text>
      <text
        x={x(6.4)}
        y={y(4.5)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#9c8253"
        fontSize="4.2"
        fontFamily={PIECE_FONT}
        letterSpacing="0.6"
      >
        汉界
      </text>

      {PIECES.map((piece) => (
        <g key={`${piece.side}-${piece.type}-${piece.row}-${piece.col}`}>
          <circle
            cx={x(piece.col)}
            cy={y(piece.row)}
            r="4.1"
            fill="#f4e4bf"
            stroke={piece.side === 'red' ? RED : BLACK}
            strokeWidth="0.9"
          />
          <circle
            cx={x(piece.col)}
            cy={y(piece.row)}
            r="3.2"
            fill="none"
            stroke={piece.side === 'red' ? RED : BLACK}
            strokeWidth="0.35"
            opacity="0.55"
          />
          <text
            x={x(piece.col)}
            y={y(piece.row) + 0.2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={piece.side === 'red' ? RED : BLACK}
            fontSize="3.9"
            fontWeight="600"
            fontFamily={PIECE_FONT}
          >
            {LABELS[piece.side][piece.type]}
          </text>
        </g>
      ))}

      <circle
        cx={x(LAST_MOVE.col)}
        cy={y(LAST_MOVE.row)}
        r="5.1"
        fill="none"
        stroke="#aa6048"
        strokeWidth="0.9"
      />
    </svg>
  )
}