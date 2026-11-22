const BOARD_SIZE = 5;
const PAD = 14;
const STEP = 18;

/** 棋盘坐标 0..4，落点像素位置 = PAD + index * STEP。调整局面只改下面两张表。 */
const INDEXES = Array.from({ length: BOARD_SIZE }, (_, index) => index);
const position = (index: number) => PAD + index * STEP;

interface Stone {
  readonly row: number;
  readonly col: number;
}

/** 黑棋：横排五连。 */
const BLACK_STONES: readonly Stone[] = [
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 1, col: 3 },
  { row: 1, col: 4 },
  { row: 2, col: 2 },
  { row: 3, col: 2 },
  { row: 3, col: 3 },
  { row: 4, col: 4 },
  { row: 1, col: 0 },
];

const WHITE_STONES: readonly Stone[] = [
  { row: 0, col: 0 },
  { row: 0, col: 2 },
  { row: 2, col: 3 },
  { row: 3, col: 1 },
  { row: 3, col: 4 },
  { row: 4, col: 2 },
  { row: 4, col: 3 },
  { row: 4, col: 0 },
];

/** 首页缩略图：静态 5×5 局面，标记落在黑棋最后一子上。 */
export function GomokuThumbnail() {
  const lastBlack = BLACK_STONES.at(-1);

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" fill="#e6d4b3" />
      {INDEXES.map((index) => {
        const at = position(index);
        return (
          <g key={index} stroke="#b29a72" strokeWidth="1">
            <line x1={PAD} y1={at} x2={position(BOARD_SIZE - 1)} y2={at} />
            <line x1={at} y1={PAD} x2={at} y2={position(BOARD_SIZE - 1)} />
          </g>
        );
      })}
      {WHITE_STONES.map(({ row, col }) => (
        <circle
          key={`white-${row}-${col}`}
          cx={position(col)}
          cy={position(row)}
          r="7.3"
          fill="#f7f2e6"
          stroke="#b29a72"
          strokeWidth="0.8"
        />
      ))}
      {BLACK_STONES.map(({ row, col }) => (
        <circle
          key={`black-${row}-${col}`}
          cx={position(col)}
          cy={position(row)}
          r="7.3"
          fill="#262a25"
        />
      ))}
      {lastBlack ? (
        <circle
          cx={position(lastBlack.col)}
          cy={position(lastBlack.row)}
          r="2.2"
          fill="#aa6048"
        />
      ) : null}
    </svg>
  );
}
