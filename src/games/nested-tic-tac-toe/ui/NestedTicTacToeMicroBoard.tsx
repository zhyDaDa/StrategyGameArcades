import { motion } from 'motion/react'
import { PlayerSymbol } from '@/components/game/PlayerSymbol/PlayerSymbol'
import { motionTokens } from '@/presentation/motion/tokens'
import { PLAYER_SEAT_META, PLAYER_SEAT_ON_COLOR } from '@/presentation/player-seats/player-seats'
import type { NestedTicTacToeBoardViewModel } from '../domain/selectors'
import type { NestedTicTacToeCoord } from '../domain/types'
import { NestedTicTacToeCell } from './NestedTicTacToeCell'

export interface NestedTicTacToeMicroBoardProps {
  readonly vm: NestedTicTacToeBoardViewModel
  readonly macro: number
  readonly interactive: boolean
  readonly freshCell: NestedTicTacToeCoord | null
  readonly freshMicro: boolean
  readonly onPlace: (row: number, col: number) => void
}

export function NestedTicTacToeMicroBoard({
  vm,
  macro,
  interactive,
  freshCell,
  freshMicro,
  onPlace,
}: NestedTicTacToeMicroBoardProps) {
  const macroRow = Math.floor(macro / 3)
  const macroCol = macro % 3
  const microResult = vm.microResults[macro]
  const ownerMeta = microResult === 'red' || microResult === 'blue' ? PLAYER_SEAT_META[microResult] : null

  const macroWinner =
    vm.macroLine !== null && vm.macroLine.length > 0 ? vm.microResults[vm.macroLine[0]] : null
  const isMacroWinner = vm.macroLine?.includes(macro) ?? false
  const macroWinnerColor =
    isMacroWinner && (macroWinner === 'red' || macroWinner === 'blue')
      ? PLAYER_SEAT_META[macroWinner].color
      : null

  return (
    <div
      role="group"
      aria-label={`第 ${macroRow + 1} 行第 ${macroCol + 1} 列的小棋盘，${
        microResult === null
          ? '进行中'
          : microResult === 'draw'
            ? '封盘'
            : `${PLAYER_SEAT_META[microResult].label}占领`
      }`}
      className="relative h-full w-full overflow-hidden rounded-[5px] bg-card ring-1 ring-foreground/10"
      style={
        macroWinnerColor === null
          ? undefined
          : { outline: `2px solid ${macroWinnerColor}`, outlineOffset: '1px' }
      }
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-px bg-border/60">
        {Array.from({ length: 9 }, (_, inner) => {
          const row = macroRow * 3 + Math.floor(inner / 3)
          const col = macroCol * 3 + (inner % 3)
          const index = row * 9 + col
          return (
            <NestedTicTacToeCell
              key={inner}
              row={row}
              col={col}
              macro={macro}
              value={vm.cells[index]}
              legal={vm.legalCells[index]}
              interactive={interactive}
              isLast={vm.lastMove !== null && vm.lastMove.row === row && vm.lastMove.col === col}
              fresh={freshCell !== null && freshCell.row === row && freshCell.col === col}
              currentSide={vm.currentSide}
              onPlace={onPlace}
            />
          )
        })}
      </div>

      {microResult === 'draw' ? (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/6"
          initial={freshMicro ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: motionTokens.duration.normal }}
        >
          <span aria-hidden="true" className="h-px w-1/3 bg-foreground/30" />
        </motion.div>
      ) : null}

      {ownerMeta !== null ? (
        <>
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 z-10"
            style={{ backgroundColor: ownerMeta.color }}
            initial={freshMicro ? { clipPath: 'inset(100% 0% 0% 0%)', opacity: 0.86 } : false}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 0.86 }}
            transition={{
              duration: motionTokens.duration.deliberate,
              ease: motionTokens.ease.out,
            }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 z-20 flex items-center justify-center"
            initial={freshMicro ? { opacity: 0, scale: 1.8 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: motionTokens.duration.deliberate,
              ease: motionTokens.ease.out,
              delay: freshMicro ? motionTokens.duration.quick : 0,
            }}
          >
            <PlayerSymbol
              symbol={ownerMeta.symbol}
              color={PLAYER_SEAT_ON_COLOR}
              className="h-1/2 w-1/2"
            />
          </motion.div>
        </>
      ) : null}
    </div>
  )
}