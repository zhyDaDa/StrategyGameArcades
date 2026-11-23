/**
 * 非人类接入方式的配置草稿。本阶段只保存在配置会话内，不写入对局配置，
 * 等对应控制器真正接通后再迁移进持久化 schema。
 */
export interface SeatDraft {
  readonly llmEndpoint: string
  readonly llmModel: string
  readonly llmApiKey: string
  readonly localModelPath: string
  readonly localDevice: 'cpu' | 'gpu'
}

export const EMPTY_SEAT_DRAFT: SeatDraft = {
  llmEndpoint: '',
  llmModel: '',
  llmApiKey: '',
  localModelPath: '',
  localDevice: 'cpu',
}

export const LOCAL_DEVICES = ['cpu', 'gpu'] as const
export type LocalDevice = (typeof LOCAL_DEVICES)[number]

export const LOCAL_DEVICE_LABELS: Record<LocalDevice, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
}