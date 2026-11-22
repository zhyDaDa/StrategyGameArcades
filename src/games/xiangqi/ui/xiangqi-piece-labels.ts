import type { XiangqiPiece, XiangqiPieceType, XiangqiSide } from '../domain/types'

/**
 * 棋子汉字使用系统中常见的传统衬线字体（楷体优先，回退宋体/思源宋体），
 * 不依赖网络字体，任何浏览器都能按系统已装字体降级呈现。
 * 写成 Tailwind 任意属性，保证样式不散落在 inline style 里。
 */
export const XIANGQI_PIECE_FONT_CLASS =
  '[font-family:KaiTi,STKaiti,Kaiti_SC,Songti_SC,STSong,SimSun,Noto_Serif_CJK_SC,Source_Han_Serif_SC,serif]'

export const XIANGQI_SIDE_TEXT_CLASS: Record<XiangqiSide, string> = {
  red: 'text-[#a62f27]',
  black: 'text-[#26231f]',
}

const PIECE_LABELS: Record<XiangqiSide, Record<XiangqiPieceType, string>> = {
  red: {
    general: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '兵',
  },
  black: {
    general: '将',
    advisor: '士',
    elephant: '象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '卒',
  },
}

export function pieceLabel(piece: XiangqiPiece): string {
  return PIECE_LABELS[piece.side][piece.type]
}

export const XIANGQI_SIDE_GLYPH: Record<XiangqiSide, string> = {
  red: '帅',
  black: '将',
}