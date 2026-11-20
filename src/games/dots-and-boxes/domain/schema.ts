import { z } from 'zod'
import { DOTS_AND_BOXES_SEATS } from './types'
import {
  boxCount,
  horizontalEdgeCount,
  isDotsBoardSize,
  verticalEdgeCount,
} from './rules'

const seatSchema = z.enum(['red', 'blue', 'green', 'yellow'])
const nullableSeatSchema = seatSchema.nullable()
const boxSizeSchema = z
  .number()
  .int()
  .refine(isDotsBoardSize, { message: '棋盘尺寸必须是 8 / 12 / 15 / 18 之一' })

export const dotsAndBoxesActionSchema = z.object({
  type: z.literal('draw-edge'),
  orientation: z.enum(['horizontal', 'vertical']),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
})

export const dotsAndBoxesStateSchema = z
  .object({
    boxSize: boxSizeSchema,
    players: z.array(seatSchema).min(2).max(DOTS_AND_BOXES_SEATS.length),
    horizontalEdges: z.array(z.boolean()),
    verticalEdges: z.array(z.boolean()),
    boxes: z.array(nullableSeatSchema),
    currentPlayer: nullableSeatSchema,
    status: z.enum(['playing', 'completed']),
    winner: nullableSeatSchema,
    moveCount: z.number().int().min(0),
  })
  .superRefine((state, ctx) => {
    const expectedPlayers = DOTS_AND_BOXES_SEATS.slice(0, state.players.length)
    if (state.players.some((seat, index) => seat !== expectedPlayers[index])) {
      ctx.addIssue({
        code: 'custom',
        path: ['players'],
        message: `席位必须按 ${DOTS_AND_BOXES_SEATS.join(' / ')} 的顺序取前缀`,
      })
    }

    if (state.horizontalEdges.length !== horizontalEdgeCount(state.boxSize)) {
      ctx.addIssue({
        code: 'custom',
        path: ['horizontalEdges'],
        message: '横边数量与棋盘尺寸不匹配',
      })
    }
    if (state.verticalEdges.length !== verticalEdgeCount(state.boxSize)) {
      ctx.addIssue({
        code: 'custom',
        path: ['verticalEdges'],
        message: '竖边数量与棋盘尺寸不匹配',
      })
    }
    if (state.boxes.length !== boxCount(state.boxSize)) {
      ctx.addIssue({ code: 'custom', path: ['boxes'], message: '方格数量与棋盘尺寸不匹配' })
    }

    if (state.currentPlayer !== null && !state.players.includes(state.currentPlayer)) {
      ctx.addIssue({ code: 'custom', path: ['currentPlayer'], message: '当前玩家不在本局玩家中' })
    }
    if (state.winner !== null && !state.players.includes(state.winner)) {
      ctx.addIssue({ code: 'custom', path: ['winner'], message: '赢家不在本局玩家中' })
    }
  })