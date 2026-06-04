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
  /**
   * 死活关:正解是"做活/点杀的急所",落子当下并不吃子,胜负要靠死活搜索器判定。
   * data.test 对这类关跳过通用断言,改用 lifedeath 求解器逐条校验:
   * - verdict: 'kill' —— 目标(target 所指的子,通常是白)被黑先净杀;下对急所后仍是死。
   * - verdict: 'live' —— 目标(玩家自己的黑块)做出两眼活;下对急所后对方再杀不掉。
   * target 给目标块上任一颗子的坐标;急所点取 goal.points[0]。
   */
  lifeDeath?: { target: Point; verdict: 'kill' | 'live' }
  /**
   * 终局数子展示:过关后把棋盘按「数子法(area scoring)」着色,并显示黑白区域与胜负。
   * 用于第 6 章「数子判胜负」与毕业实战关。
   * - komi:贴目,白方补偿目数,默认 7(9 路常用)。
   * - certifyWinner:若设为某色且该色最终获胜,过关卡片额外显示「🎓 入门认证通过」(毕业关用)。
   */
  reveal?: { kind: 'score'; komi?: number; certifyWinner?: Stone }
}

/** 一个章节 */
export interface Chapter {
  index: number
  title: string
  subtitle: string
}
