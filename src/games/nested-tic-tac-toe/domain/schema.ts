import { z } from 'zod'
import { NESTED_BOARD_SIZE } from './types'

const sideSchema = z.enum(['red', 'blue'])
const coordSchema = z.object({
  row: z.number().int().min(0).max(NESTED_BOARD_SIZE - 1),
  col: z.number().int().min(0).max(NESTED_BOARD_SIZE - 1),
})

export const nestedTicTacToeActionSchema = z.object({
  type: z.literal('place'),
  row: z.number().int().min(0).max(NESTED_BOARD_SIZE - 1),
  col: z.number().int().min(0).max(NESTED_BOARD_SIZE - 1),
})

export const nestedTicTacToeStateSchema = z
  .object({
    cells: z.array(z.enum(['empty', 'red', 'blue'])).length(NESTED_BOARD_SIZE * NESTED_BOARD_SIZE),
    currentPlayer: sideSchema.nullable(),
    lastMove: coordSchema.nullable(),
    status: z.enum(['playing', 'completed']),
    winner: sideSchema.nullable(),
    moveCount: z.number().int().min(0),
  })
  .superRefine((state, ctx) => {
    if (state.status === 'completed' && state.currentPlayer !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentPlayer'],
        message: '终局状态不应再有当前玩家',
      })
    }
    if (state.status === 'playing' && state.currentPlayer === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentPlayer'],
        message: '进行中的对局必须有当前玩家',
      })
    }
    if (state.winner !== null && state.status !== 'completed') {
      ctx.addIssue({
        code: 'custom',
        path: ['winner'],
        message: '只有终局状态才能有赢家',
      })
    }
  })