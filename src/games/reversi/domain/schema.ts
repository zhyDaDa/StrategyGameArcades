import { z } from 'zod'
import { REVERSI_BOARD_SIZE } from './types'

const coordSchema = z.object({
  row: z.number().int().min(0).max(REVERSI_BOARD_SIZE - 1),
  col: z.number().int().min(0).max(REVERSI_BOARD_SIZE - 1),
})

export const reversiActionSchema = z.object({
  type: z.literal('place'),
  row: z.number().int().min(0).max(REVERSI_BOARD_SIZE - 1),
  col: z.number().int().min(0).max(REVERSI_BOARD_SIZE - 1),
})

export const reversiStateSchema = z.object({
  size: z.number().int().positive(),
  cells: z.array(z.enum(['empty', 'black', 'white'])).length(REVERSI_BOARD_SIZE * REVERSI_BOARD_SIZE),
  status: z.enum(['playing', 'completed']),
  currentPlayer: z.enum(['black', 'white']).nullable(),
  winner: z.enum(['black', 'white']).nullable(),
  lastMove: z
    .object({
      row: z.number().int(),
      col: z.number().int(),
      flipped: z.array(coordSchema),
    })
    .nullable(),
  moveCount: z.number().int().min(0),
})