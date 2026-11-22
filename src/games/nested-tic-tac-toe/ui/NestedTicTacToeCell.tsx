import { motion } from 'motion/react'
import { PlayerSymbol } from '@/components/game/PlayerSymbol/PlayerSymbol'
import { motionTokens } from '@/presentation/motion/tokens'
import { PLAYER_SEAT_META } from '@/presentation/player-seats/player-seats'
import type {
  NestedTicTacToeCellValue,
  NestedTicTacToeSide,
} from '../domain/types'

export interface NestedTicTacToeCellProps {
  readonly row: number
  readonly col: number
  readonly macro: number
  readonly value: NestedTicTacToeCellValue
  readonly legal: boolean
  readonly interactive: boolean
  readonly isLast: boolean
  readonly fresh: boolean
  readonly currentSide: NestedTicTacToeSide | null
  readonly onPlace: (row: number, col: number) => void
}

export function NestedTicTacToeCell({
  row,
  col,
  macro,
  value,
  legal,
  interactive,
  isLast,
  fresh,
  currentSide,
  onPlace,
}: NestedTicTacToeCellProps) {
  const playable = interactive && legal
  const ghostMeta = currentSide === null ? null : PLAYER_SEAT_META[currentSide]
  const valueMeta = value === 'empty' ? null : PLAYER_SEAT_META[value]
  const macroRow = Math.floor(macro / 3) + 1
  const macroCol = (macro % 3) + 1
  const innerRow = (row % 3) + 1
  const innerCol = (col % 3) + 1

  return (
    <button
      type="button"
      disabled={!playable}
      aria-label={`第 ${macroRow} 行第 ${macroCol} 列的小棋盘，第 ${innerRow} 行第 ${innerCol} 列，${
        valueMeta === null ? '空位' : valueMeta.label
      }`}
      onClick={() => onPlace(row, col)}
      className={[
        'group relative flex aspect-square items-center justify-center bg-card',
        playable ? 'cursor-pointer' : 'cursor-default',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none',
      ].join(' ')}
    >
      {playable && ghostMeta !== null ? (
        <span
          aria-hidden="true"
          className="absolute inset-[18%] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-25 group-focus-visible:opacity-25"
        >
          <PlayerSymbol
            symbol={ghostMeta.symbol}
            color={ghostMeta.color}
            className="h-full w-full"
          />
        </span>
      ) : null}

      {valueMeta !== null ? (
        <motion.span
          aria-hidden="true"
          className="absolute inset-[18%]"
          initial={fresh ? { opacity: 0, scale: 0.4 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={motionTokens.spring.pop}
        >
          <PlayerSymbol
            symbol={valueMeta.symbol}
            color={valueMeta.color}
            className="h-full w-full"
          />
        </motion.span>
      ) : null}

      {isLast ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 z-10 size-1.5 rounded-full bg-foreground/60"
        />
      ) : null}
    </button>
  )
}