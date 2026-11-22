const BOARD_SIZE = 4;
const CELL = 23;
const ORIGIN = 4;

/** 棋盘坐标 0..3，格心位置 = ORIGIN + index * CELL + CELL / 2。调整局面只改下面两张表。 */
const INDEXES = Array.from({ length: BOARD_SIZE }, (_, index) => index);
const center = (index: number) => ORIGIN + index * CELL + CELL / 2;

interface Disc {
  readonly row: number;
  readonly col: number;
}

const BLACK_DISCS: readonly Disc[] = [
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 0, col: 3 },
  { row: 1, col: 2 },
  { row: 2, col: 1 },
  { row: 1, col: 3 },
  { row: 2, col: 2 },
  { row: 3, col: 1 },
  { row: 3, col: 2 },
];

const WHITE_DISCS: readonly Disc[] = [
  { row: 0, col: 0 },
  { row: 1, col: 0 },
  { row: 2, col: 0 },
  { row: 1, col: 1 },
  { row: 2, col: 2 },
  { row: 2, col: 3 },
  { row: 3, col: 0 },
  { row: 3, col: 3 },
];

/** 首页缩略图：静态 4×4 局面。 */
export function ReversiThumbnail() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" fill="#0c5f47" />
      {INDEXES.map((row) =>
        INDEXES.map((col) => (
          <rect
            key={`${row}-${col}`}
            x={ORIGIN + col * CELL}
            y={ORIGIN + row * CELL}
            width={CELL}
            height={CELL}
            fill="#0c5f47"
            stroke="#04493a"
            strokeWidth="1.2"
          />
        )),
      )}
      {BLACK_DISCS.map(({ row, col }) => (
        <circle
          key={`black-${row}-${col}`}
          cx={center(col)}
          cy={center(row)}
          r="8.6"
          fill="#1f2320"
          stroke="#000000"
          strokeWidth="0.8"
        />
      ))}
      {WHITE_DISCS.map(({ row, col }) => (
        <circle
          key={`white-${row}-${col}`}
          cx={center(col)}
          cy={center(row)}
          r="8.6"
          fill="#f5f1e6"
          stroke="#cdc4b2"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}
