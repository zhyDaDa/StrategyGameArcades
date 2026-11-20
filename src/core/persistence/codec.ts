import type { ZodType } from 'zod'

/** 序列化存档为 JSON 字符串。 */
export function encodeSave(envelope: unknown): string {
  return JSON.stringify(envelope)
}

/** 解析 JSON 字符串并通过 Zod 校验后返回结构化数据。校验失败抛错、不吞错误。 */
export function decodeSave<T>(raw: string, schema: ZodType<T>): T {
  const parsed: unknown = JSON.parse(raw)
  return schema.parse(parsed)
}