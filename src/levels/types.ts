// 关卡数据结构
import type { Point, Stone } from '../engine/types'
import type { Marker } from '../components/Goban'

export interface InitialStone {
  x: number
  y: number
  c: Stone
}

/**
 * 多步正解树。每个节点代表"轮到玩家落子"的局面。
 * - answers:玩家这一步的正解点(任一即可)
 * - reply:玩家下对后,对方(系统)的应手;省略 / null 表示无应手
 * - next:对方应手之后玩家面临的下一个节点;省略表示玩家这一手即通关
 */
export interface SolutionNode {
  answers: Point[]
  reply?: Point | null
  next?: SolutionNode
}

/** 过关目标的几种判定方式 */
export type LevelGoal =
  | { kind: 'place-any-legal' } // 下任意合法的一手即过(认识落子)
  | { kind: 'capture'; min?: number } // 这一手提到子即过(默认至少 1 子)
  | { kind: 'points'; points: Point[] } // 下到指定点之一即过(单步题)
  | { kind: 'tree'; root: SolutionNode } // 走对多步正解树即过

export interface Level {
  id: string
  chapterIndex: number
  chapterTitle: string
  index: number
  title: string
  boardSize: number
  /** 轮到玩家执子的颜色 */
  toPlay: Stone
  /** 初始摆好的棋子 */
  stones: InitialStone[]
  goal: LevelGoal
  /** 教学说明;文中用 [[术语]] 包裹的词会高亮且可点击查看释义 */
  teach: string
  /** 卡住时的文字提示 */
  hint?: string
  /** 提示时高亮的推荐落子点;省略则自动取正解点 */
  hintPoints?: Point[]
  /** 初始棋盘标注(圈、三角、字母等) */
  markers?: Marker[]
  /** 过关后的祝贺语 + 知识点小结 */
  successText?: string
  /**
   * 该关正解是"逃子/占点"类——落子不吃子。
   * 仅供 data.test 放宽断言:此时不要求吃子,而是校验落子后己方获得更多气(真的逃出)。
   */
  expectNoCapture?: boolean
}

/** 一个章节 */
export interface Chapter {
  index: number
  title: string
  subtitle: string
}
