/**
 * 游戏在「目录 / 注册表」中的通用模型。
 * 每款游戏在自己的 index.ts 里创建一个实例，由 `games/registry.ts` 统一登记；
 * 首页等入口只消费这里的数据，不直接读各游戏内部文件。
 */
export interface GameRaw<Id extends string = string> {
  readonly id: Id
  readonly name: string
  readonly description: string
  /** 进入该游戏的入口路径（配置页），例如 `/config/gomoku`。 */
  readonly path: string
  /** 封面图 URL；尚未提供时为 null，由展示层渲染占位。 */
  readonly cover: string | null
}

/** GameModel 提供给卡片组件的展示数据。 */
export interface GameCardData {
  readonly name: string
  readonly description: string
  readonly path: string
  readonly cover: string | null
  readonly coverFallback: string
}

export class GameModel<Id extends string = string> {
  readonly id: Id
  readonly name: string
  readonly description: string
  readonly path: string
  readonly cover: string | null

  constructor(raw: GameRaw<Id>) {
    this.id = raw.id
    this.name = raw.name
    this.description = raw.description
    this.path = raw.path
    this.cover = raw.cover
  }

  static fromRaw<Id extends string>(raw: GameRaw<Id>): GameModel<Id> {
    return new GameModel(raw)
  }

  get hasCover(): boolean {
    return this.cover !== null
  }

  toCardData(): GameCardData {
    return {
      name: this.name,
      description: this.description,
      path: this.path,
      cover: this.cover,
      coverFallback: this.name.trim().slice(0, 1) || '?',
    }
  }
}