// 围棋规则引擎 —— 核心类型定义
// 引擎是纯逻辑、与 UI 完全解耦,所有数据不可变(返回新棋盘而非原地修改)。

/** 棋子颜色:B = 黑,W = 白 */
export type Stone = 'B' | 'W'

/** 一个交叉点的状态:有黑子 / 有白子 / 空 */
export type Cell = Stone | null

/** 棋盘坐标(从 0 开始) */
export interface Point {
  x: number
  y: number
}

/** 棋盘:行优先一维数组,索引 = y * size + x;null 表示空交叉点 */
export interface Board {
  readonly size: number
  readonly cells: ReadonlyArray<Cell>
}

/** 一块相连同色棋子的信息 */
export interface GroupInfo {
  /** 该块包含的所有棋子坐标 */
  stones: Point[]
  /** 该块的"气"(紧邻的空交叉点) */
  liberties: Point[]
}

/** 落子失败的原因 */
export type PlaceError =
  | 'out-of-bounds' // 落在棋盘外
  | 'occupied' // 该点已有子
  | 'suicide' // 禁入点:落子后自己没有气,且没提到对方子
  | 'ko' // 打劫:不能立即回提

/** 落子的结果 */
export interface PlaceResult {
  ok: boolean
  error?: PlaceError
  /** 成功时:落子并完成提子后的新棋盘 */
  board?: Board
  /** 成功时:被提走的对方棋子坐标 */
  captured?: Point[]
  /** 成功时:新的劫争禁着点(下一手对方不可在此回提),否则 null */
  koPoint?: Point | null
}

/** 对某一步的分析结果,供 UI 在"落子前"做友好提示用(不改变棋盘) */
export interface MoveAnalysis {
  /** 这一步是否合法 */
  legal: boolean
  /** 不合法时的原因 */
  error?: PlaceError
  /** 这一步会提走的对方棋子(合法或仅因 ko 不合法时也会给出,用于预览) */
  captured: Point[]
  /** 落子后己方这块棋的气数(用于"送叫吃"等危险提示) */
  selfLiberties: number
}
