import { z } from 'zod'
import { GOMOKU_BOARD_SIZE } from './types'

const coordSchema = z.object({
  row: z.number().int().min(0).max(GOMOKU_BOARD_SIZE - 1),
  col: z.number().int().min(0).max(GOMOKU_BOARD_SIZE - 1),
})

export const gomokuActionSchema = z.union([
  z.object({
    type: z.literal('place'),
    row: z.number().int().min(0).max(GOMOKU_BOARD_SIZE - 1),
    col: z.number().int().min(0).max(GOMOKU_BOARD_SIZE - 1),
  }),
  z.object({ type: z.literal('resign') }),
])

export const gomokuStateSchema = z.object({
  size: z
    .number()
    .int()
    .refine((value) => value === GOMOKU_BOARD_SIZE, {
      message: `棋盘尺寸必须是 ${GOMOKU_BOARD_SIZE}`,
    }),
  cells: z.array(z.enum(['empty', 'black', 'white'])).length(GOMOKU_BOARD_SIZE * GOMOKU_BOARD_SIZE),
  status: z.enum(['playing', 'completed']),
  currentPlayer: z.enum(['black', 'white']).nullable(),
  winner: z.enum(['black', 'white']).nullable(),
  endReason: z.enum(['five', 'resign', 'board-full']).nullable(),
  lastMove: coordSchema.nullable(),
  moveCount: z.number().int().min(0),
})