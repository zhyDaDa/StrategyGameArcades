import { motion } from 'motion/react'
import { motionTokens } from '@/presentation/motion/tokens'
import { PLAYER_SEAT_META } from '@/presentation/player-seats/player-seats'
import type { NestedTicTacToeBoardViewModel } from '../domain/selectors'
import type { NestedTicTacToeCoord } from '../domain/types'
import { NestedTicTacToeMicroBoard } from './NestedTicTacToeMicroBoard'

export interface NestedTicTacToeBoardProps {
  readonly vm: NestedTicTacToeBoardViewModel
  readonly interactive: boolean
  readonly freshCell: NestedTicTacToeCoord | null
  readonly freshMicroBoards: ReadonlySet<number>
  readonly onPlace: (row: number, col: number) => void
}

/**
 * 9×9 嵌套棋盘。宏网格与描边框共用同一个 grid：
 * 所有小棋盘和描边框都显式定位，允许重叠，避免两层网格的像素漂移。
 */
export function NestedTicTacToeBoard({
  vm,
  interactive,
  freshCell,
  freshMicroBoards,
  onPlace,
}: NestedTicTacToeBoardProps) {
  const frameColor = vm.currentSide === null ? null : PLAYER_SEAT_META[vm.currentSide].color
  const frameArea =
    vm.forcedBoard === null
      ? '1 / 1 / 4 / 4'
      : `${Math.floor(vm.forcedBoard / 3) + 1} / ${(vm.forcedBoard % 3) + 1} / ${
          Math.floor(vm.forcedBoard / 3) + 2
        } / ${(vm.forcedBoard % 3) + 2}`

  return (
    /**
     * 外框、宫间隔与可落区域描边框统一为 6px：
     * 棋盘的框架线和游标保持同一套线宽，避免外部细、内部粗的割裂感。
     */
    <div className="rounded-xl bg-foreground/20 p-1.5">
      <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-1.5">
        {Array.from({ length: 9 }, (_, macro) => (
          <div
            key={macro}
            className="min-h-0 min-w-0"
            style={{
              gridRowStart: Math.floor(macro / 3) + 1,
              gridColumnStart: (macro % 3) + 1,
            }}
          >
            <NestedTicTacToeMicroBoard
              vm={vm}
              macro={macro}
              interactive={interactive}
              freshCell={freshCell}
              freshMicro={freshMicroBoards.has(macro)}
              onPlace={onPlace}
            />
          </div>
        ))}

        {frameColor !== null ? (
          <motion.div
            aria-hidden="true"
            layout
            className="pointer-events-none z-20 rounded-[8px] border-[6px]"
            style={{ gridArea: frameArea, borderColor: frameColor }}
            transition={{
              layout: {
                duration: motionTokens.duration.normal,
                ease: motionTokens.ease.out,
              },
            }}
          />
        ) : null}
      </div>
    </div>
  )
}