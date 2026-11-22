import { z } from 'zod'
import { GO_BOARD_SIZE } from './types'

const coordSchema = z.object({
  row: z.number().int().min(0).max(GO_BOARD_SIZE - 1),
  col: z.number().int().min(0).max(GO_BOARD_SIZE - 1),
})

export const goActionSchema = z.union([
  z.object({
    type: z.literal('place'),
    row: z.number().int().min(0).max(GO_BOARD_SIZE - 1),
    col: z.number().int().min(0).max(GO_BOARD_SIZE - 1),
  }),
  z.object({ type: z.literal('pass') }),
  z.object({ type: z.literal('resign') }),
])

const goScoreSchema = z.object({
  black: z.number().min(0),
  white: z.number().min(0),
  komi: z.number().min(0),
})

export const goStateSchema = z.object({
  size: z.number().int().refine((value) => value === GO_BOARD_SIZE, {
    message: `棋盘尺寸必须是 ${GO_BOARD_SIZE}`,
  }),
  cells: z.array(z.enum(['empty', 'black', 'white'])).length(GO_BOARD_SIZE * GO_BOARD_SIZE),
  status: z.enum(['playing', 'completed']),
  currentPlayer: z.enum(['black', 'white']).nullable(),
  winner: z.enum(['black', 'white']).nullable(),
  endReason: z.enum(['two-passes', 'resign']).nullable(),
  lastMove: coordSchema.nullable(),
  lastCaptured: z.array(coordSchema),
  consecutivePasses: z.number().int().min(0).max(2),
  koPoint: coordSchema.nullable(),
  captured: z.object({
    black: z.number().int().min(0),
    white: z.number().int().min(0),
  }),
  moveCount: z.number().int().min(0),
  score: goScoreSchema.nullable(),
})