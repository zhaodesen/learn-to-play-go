// 关卡内容(第一批:第 0~2 章代表关)。
// 所有吃子关的正解点都已按规则引擎核对:落子后对方目标块的气恰好归零。
// teach / successText 中用 [[术语]] 或 [[显示文字|术语]] 标注,渲染时高亮可点。
import type { Chapter, Level } from './types'

export const CHAPTERS: Chapter[] = [
  { index: 0, title: '认识围棋', subtitle: '从落子到第一次吃子' },
  { index: 1, title: '提子入门', subtitle: '把对方的棋子吃掉' },
  { index: 2, title: '吃子手筋', subtitle: '高效吃子的小诀窍' },
]

export const LEVELS: Level[] = [
  // ───────── 第 0 章 认识围棋 ─────────
  {
    id: 'c0-1',
    chapterIndex: 0,
    chapterTitle: '认识围棋',
    index: 1,
    title: '落下第一手',
    boardSize: 9,
    toPlay: 'B',
    stones: [],
    goal: { kind: 'place-any-legal' },
    teach:
      '围棋的棋子下在横线和竖线的**交叉点**上(不是格子里面)。黑棋先走。在棋盘上随便点一个交叉点,落下你的第一颗黑子吧。',
    successText: '这就是落子!接下来认识围棋里最重要的东西 —— [[气]]。',
  },
  {
    id: 'c0-2',
    chapterIndex: 0,
    chapterTitle: '认识围棋',
    index: 2,
    title: '第一次吃子',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 0, y: 0, c: 'W' },
      { x: 1, y: 0, c: 'B' },
    ],
    goal: { kind: 'points', points: [{ x: 0, y: 1 }] },
    teach:
      '一颗棋子上下左右紧挨着的**空交叉点**,叫做它的 [[气]]。被红圈标出的白子在角上,本来有 2 口气,现在右边一口已经被黑棋占住,只剩正下方这一口。把它也堵上,白子没气了就会被 [[提子|提走]]。',
    hint: '白子唯一的气在它正下方,点那里。',
    hintPoints: [{ x: 0, y: 1 }],
    markers: [{ x: 0, y: 0, kind: 'circle', color: '#e23b3b' }],
    successText: '你吃掉了第一颗子!记住:棋子一旦没有气,就会被提走 —— 这是围棋最根本的规则。',
  },

  // ───────── 第 1 章 提子入门 ─────────
  {
    id: 'c1-1',
    chapterIndex: 1,
    chapterTitle: '提子入门',
    index: 1,
    title: '吃掉边上的子',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 4, y: 0, c: 'W' },
      { x: 3, y: 0, c: 'B' },
      { x: 4, y: 1, c: 'B' },
    ],
    goal: { kind: 'points', points: [{ x: 5, y: 0 }] },
    teach:
      '在边线上的一颗子有 3 口气。这颗白子已经被堵掉两口,只剩右边一口。找到它,堵上去。',
    hint: '白子右边那口气是它最后的活路。',
    hintPoints: [{ x: 5, y: 0 }],
    markers: [{ x: 4, y: 0, kind: 'circle', color: '#e23b3b' }],
    successText: '边上的子比中间的子气少、更好吃。这也是为什么大家说"金角银边"。',
  },
  {
    id: 'c1-2',
    chapterIndex: 1,
    chapterTitle: '提子入门',
    index: 2,
    title: '吃掉中间的子',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 4, y: 4, c: 'W' },
      { x: 3, y: 4, c: 'B' },
      { x: 5, y: 4, c: 'B' },
      { x: 4, y: 3, c: 'B' },
    ],
    goal: { kind: 'points', points: [{ x: 4, y: 5 }] },
    teach:
      '棋盘正中央的一颗子有 4 口气,是最难吃的。但只要它被堵到只剩最后一口,照样能提走。看看这颗白子还差哪一口。',
    hint: '白子上、左、右都被堵住了,只剩下方。',
    hintPoints: [{ x: 4, y: 5 }],
    markers: [{ x: 4, y: 4, kind: 'circle', color: '#e23b3b' }],
    successText: '位置越靠中间,气越多越难围。所以开局大家都先抢角和边。',
  },
  {
    id: 'c1-3',
    chapterIndex: 1,
    chapterTitle: '提子入门',
    index: 3,
    title: '一串子一起吃',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 0, y: 0, c: 'W' },
      { x: 1, y: 0, c: 'W' },
      { x: 2, y: 0, c: 'B' },
      { x: 1, y: 1, c: 'B' },
    ],
    goal: { kind: 'capture', min: 2 },
    teach:
      '紧紧相连的同色棋子是一个**整体**:一起算气,也一起被吃。这两颗白子现在只剩一口气了,堵住它,两颗一起提走。',
    hint: '两颗白子共用的最后一口气,在左下角那一路。',
    hintPoints: [{ x: 0, y: 1 }],
    markers: [
      { x: 0, y: 0, kind: 'circle', color: '#e23b3b' },
      { x: 1, y: 0, kind: 'circle', color: '#e23b3b' },
    ],
    successText: '相连的棋子气是共享的。把整块的最后一口气堵住,就能一锅端。',
  },
  {
    id: 'c1-4',
    chapterIndex: 1,
    chapterTitle: '提子入门',
    index: 4,
    title: '先吃哪一块?',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 0, y: 0, c: 'W' },
      { x: 1, y: 0, c: 'W' },
      { x: 2, y: 0, c: 'B' },
      { x: 1, y: 1, c: 'B' },
      { x: 8, y: 4, c: 'W' },
      { x: 8, y: 3, c: 'B' },
    ],
    goal: { kind: 'points', points: [{ x: 0, y: 1 }] },
    teach:
      '棋盘上有两块白棋。动手之前先看清楚:哪一块只剩最后一口气(能马上吃掉)?哪一块还有两口气(吃不掉)?去吃那块虚弱的。',
    hint: '左上角那两颗白子只剩一口气;右边那颗还有两口,这一手吃不掉。',
    hintPoints: [{ x: 0, y: 1 }],
    successText: '会数气,就能一眼看出谁危险、谁安全。这是围棋计算的第一步。',
  },

  // ───────── 第 2 章 吃子手筋 ─────────
  {
    id: 'c2-1',
    chapterIndex: 2,
    chapterTitle: '吃子手筋',
    index: 1,
    title: '关门吃',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 1, y: 1, c: 'W' },
      { x: 0, y: 1, c: 'B' },
      { x: 1, y: 0, c: 'B' },
      { x: 1, y: 2, c: 'B' },
    ],
    goal: { kind: 'capture', min: 1 },
    teach:
      '这颗白子已经被围住,只剩一个"门口"还通着外面。把门口也堵死,它就跑不掉了 —— 这一手叫 [[关门吃]]。',
    hint: '白子右边那一口气就是它唯一的出口。',
    hintPoints: [{ x: 2, y: 1 }],
    markers: [{ x: 1, y: 1, kind: 'circle', color: '#e23b3b' }],
    successText: '把对方唯一的出口堵死,就是关门吃。围住之后别忘了关门!',
  },
  {
    id: 'c2-2',
    chapterIndex: 2,
    chapterTitle: '吃子手筋',
    index: 2,
    title: '双打吃',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 2, y: 4, c: 'W' },
      { x: 1, y: 4, c: 'B' },
      { x: 2, y: 3, c: 'B' },
      { x: 2, y: 5, c: 'B' },
      { x: 4, y: 4, c: 'W' },
      { x: 5, y: 4, c: 'B' },
      { x: 4, y: 3, c: 'B' },
      { x: 4, y: 5, c: 'B' },
    ],
    goal: { kind: 'capture', min: 2 },
    teach:
      '左右两颗白子,各自都只剩中间这一口气 —— 而且是**同一口**。一手下在它们中间,两颗白子会同时没气。这种一手威胁两块的下法,叫 [[双打吃]]。',
    hint: '两颗白子之间那个空点,是它们共同的命门。',
    hintPoints: [{ x: 3, y: 4 }],
    markers: [
      { x: 2, y: 4, kind: 'circle', color: '#e23b3b' },
      { x: 4, y: 4, kind: 'circle', color: '#e23b3b' },
    ],
    successText: '一手棋同时叫吃两块,对方顾此失彼 —— 双打吃是最常用、最实惠的吃子手筋!',
  },
]

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id)
}

export function levelsByChapter(chapterIndex: number): Level[] {
  return LEVELS.filter((l) => l.chapterIndex === chapterIndex)
}

/** 下一关(按 LEVELS 顺序);没有则返回 undefined */
export function nextLevel(id: string): Level | undefined {
  const i = LEVELS.findIndex((l) => l.id === id)
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : undefined
}
