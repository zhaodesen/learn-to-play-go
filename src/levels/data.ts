// 关卡内容(第一批:第 0~2 章代表关)。
// 所有吃子关的正解点都已按规则引擎核对:落子后对方目标块的气恰好归零。
// teach / successText 中用 [[术语]] 或 [[显示文字|术语]] 标注,渲染时高亮可点。
import type { Chapter, Level } from './types'

export const CHAPTERS: Chapter[] = [
  { index: 0, title: '认识围棋', subtitle: '从落子到第一次吃子' },
  { index: 1, title: '提子入门', subtitle: '把对方的棋子吃掉' },
  { index: 2, title: '吃子手筋', subtitle: '高效吃子的小诀窍' },
  { index: 3, title: '逃子与对杀', subtitle: '数清气,该逃逃、该杀杀' },
  { index: 4, title: '连接与切断', subtitle: '把自己连牢,把对方切散' },
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
  {
    // 征子:经典对角追杀,白往右下角逃,撞角整块被提(6 子)。
    // 正解线已用规则引擎逐手核对:
    //   B(5,7) W(6,6) B(7,6) W(6,7) B(7,7) W(6,8) B(5,8) W(7,8) B(8,8)→提6子
    id: 'c2-3',
    chapterIndex: 2,
    chapterTitle: '吃子手筋',
    index: 3,
    title: '征子',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 5, y: 5, c: 'W' },
      { x: 5, y: 6, c: 'W' },
      { x: 5, y: 4, c: 'B' },
      { x: 4, y: 5, c: 'B' },
      { x: 4, y: 6, c: 'B' },
      { x: 6, y: 5, c: 'B' },
    ],
    goal: {
      kind: 'tree',
      root: {
        answers: [{ x: 5, y: 7 }],
        reply: { x: 6, y: 6 },
        next: {
          answers: [{ x: 7, y: 6 }],
          reply: { x: 6, y: 7 },
          next: {
            answers: [{ x: 7, y: 7 }],
            reply: { x: 6, y: 8 },
            next: {
              answers: [{ x: 5, y: 8 }],
              reply: { x: 7, y: 8 },
              next: {
                answers: [{ x: 8, y: 8 }], // 这一手提掉整条白龙
              },
            },
          },
        },
      },
    },
    teach:
      '被圈住的两颗白子只剩 2 口气。不要乱堵 —— 紧贴着叫吃,逼它只剩一口气往外逃;它一逃你再贴着叫吃……像走楼梯一样把它一路赶到角上,整条龙一起提掉。这种一路叫吃的追杀叫 [[征子]](俗称"扭羊头")。',
    hint: '先在白子正下方叫吃(5,7 那一路);它往右逃,你就追着右边继续叫吃。',
    hintPoints: [{ x: 5, y: 7 }],
    markers: [
      { x: 5, y: 5, kind: 'circle', color: '#e23b3b' },
      { x: 5, y: 6, kind: 'circle', color: '#e23b3b' },
    ],
    successText:
      '这就是征子!只要一路都没有"接应"的白子(叫做"接征子"),被征的一方怎么逃都是死。下征子前一定先看清楚:一路赶到底,能不能吃干净。',
  },
  {
    // 枷吃(网):不贴身叫吃,而是隔一路罩一手 (3,3),白往哪逃都被网住。
    // 已用通用吃子搜索穷举:下 (3,3) 后白无论怎么走都被提。
    // 演示线(白两次试逃均失败):B(3,3) W(3,2) B(4,2) W(2,3) B(2,4)→提3子。
    id: 'c2-4',
    chapterIndex: 2,
    chapterTitle: '吃子手筋',
    index: 4,
    title: '枷吃',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 2, y: 2, c: 'W' },
      { x: 1, y: 2, c: 'B' },
      { x: 2, y: 1, c: 'B' },
      { x: 3, y: 1, c: 'B' },
      { x: 1, y: 3, c: 'B' },
    ],
    goal: {
      kind: 'tree',
      root: {
        answers: [{ x: 3, y: 3 }], // 隔一路罩住(枷)
        reply: { x: 3, y: 2 }, // 白往右逃
        next: {
          answers: [{ x: 4, y: 2 }], // 黑挡住,白只剩一口气
          reply: { x: 2, y: 3 }, // 白换个方向逃
          next: {
            answers: [{ x: 2, y: 4 }], // 还是被网住,整块提掉
          },
        },
      },
    },
    teach:
      '被圈住的白子还有 2 口气。如果贴着叫吃,它就一路逃跑很麻烦。换个思路:在它右下方**隔一个交叉点**轻轻罩一手(不挨着),像撒网一样把它的退路全堵死 —— 这叫 [[枷吃]](也叫"枷"或"网")。罩好之后,白棋往哪个方向逃都跑不出这张网。',
    hint: '别贴身叫吃。在白子的右下斜对角、隔一路的那个点 (3,3) 罩一手。',
    hintPoints: [{ x: 3, y: 3 }],
    markers: [{ x: 2, y: 2, kind: 'circle', color: '#e23b3b' }],
    successText:
      '这就是枷吃!"能枷不征"—— 枷吃不用一路追,落子也更安全,不会留下一堆可能被对方利用的接触点。看出对方逃不出网,就大胆罩下去。',
  },
  {
    // 倒扑:白在角上是个"假大眼",黑往角里扑一手送吃,
    // 白提掉这颗子后自己反而只剩一口气,黑回提整块(5 子)。
    // 已用规则引擎核对:B(0,0) W(1,0)提1 B(0,0)→提5子。
    id: 'c2-5',
    chapterIndex: 2,
    chapterTitle: '吃子手筋',
    index: 5,
    title: '倒扑',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 0, y: 1, c: 'W' },
      { x: 1, y: 1, c: 'W' },
      { x: 2, y: 1, c: 'W' },
      { x: 2, y: 0, c: 'W' },
      { x: 0, y: 2, c: 'B' },
      { x: 1, y: 2, c: 'B' },
      { x: 2, y: 2, c: 'B' },
      { x: 3, y: 1, c: 'B' },
      { x: 3, y: 0, c: 'B' },
    ],
    goal: {
      kind: 'tree',
      root: {
        answers: [{ x: 0, y: 0 }], // 往角里扑(送一子)
        reply: { x: 1, y: 0 }, // 白提掉这颗子,以为吃到了便宜
        next: {
          answers: [{ x: 0, y: 0 }], // 黑再扑回同一点,整块白棋反被提
        },
      },
    },
    teach:
      '这块白棋围着的"眼"看着有两个空,其实是假的。先往最角上那个点 [[扑|扑(送一子叫吃)]] 一手:白棋会高兴地把你这颗子提掉 —— 可它提完自己就只剩一口气了。你再下回刚才那个点,整块白棋一起被提走。这一招叫 [[倒扑]]。',
    hint: '先送一子扑在最角上的交叉点(0,0);白提之后,原地再下一手就全提了。',
    hintPoints: [{ x: 0, y: 0 }],
    markers: [
      { x: 0, y: 1, kind: 'circle', color: '#e23b3b' },
      { x: 1, y: 1, kind: 'circle', color: '#e23b3b' },
      { x: 2, y: 1, kind: 'circle', color: '#e23b3b' },
      { x: 2, y: 0, kind: 'circle', color: '#e23b3b' },
    ],
    successText:
      '倒扑的精髓是"先送后吃":主动送一子,逼对方提子后自陷绝境,再一锅端。两个空连在一起的"假大眼",常常就是用倒扑破掉的。',
  },
  {
    // 接不归:白两块((2,2)(3,2) 与 (5,2))共用唯一接点 P=(4,2)。
    // 黑点 (4,2) 直接提 3 子;白即便先连 (4,2),整块也只剩一口气,黑 (4,1) 再提 4 子。
    // 两条线均已用规则引擎核对。
    id: 'c2-6',
    chapterIndex: 2,
    chapterTitle: '吃子手筋',
    index: 6,
    title: '接不归',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 2, y: 2, c: 'W' },
      { x: 3, y: 2, c: 'W' },
      { x: 5, y: 2, c: 'W' },
      { x: 2, y: 1, c: 'B' },
      { x: 3, y: 1, c: 'B' },
      { x: 5, y: 1, c: 'B' },
      { x: 1, y: 2, c: 'B' },
      { x: 6, y: 2, c: 'B' },
      { x: 2, y: 3, c: 'B' },
      { x: 3, y: 3, c: 'B' },
      { x: 4, y: 3, c: 'B' },
      { x: 5, y: 3, c: 'B' },
    ],
    goal: { kind: 'capture', min: 3 },
    teach:
      '左边两颗白子和右边那颗白子,看着只差中间一个点就能连上。可那个点正是它们**共同的唯一一口气**。你抢先点在那里:两块白棋同时没气,一起被提。就算白棋抢先去连,连成的一大块也只剩一口气,照样被吃 —— 这种"连回家也是死"的形,叫 [[接不归]]。',
    hint: '点在两块白棋中间、它们都挨着的那个空点 (4,2)。',
    hintPoints: [{ x: 4, y: 2 }],
    markers: [
      { x: 2, y: 2, kind: 'circle', color: '#e23b3b' },
      { x: 3, y: 2, kind: 'circle', color: '#e23b3b' },
      { x: 5, y: 2, kind: 'circle', color: '#e23b3b' },
      { x: 4, y: 2, kind: 'square', color: '#2f6f3e' },
    ],
    successText:
      '接不归!当对方两块棋只靠一个点相连、而那个点又是它们共同的命门时,直接点死它 —— 别让它连回家。',
  },

  // ───────── 第 3 章 逃子与对杀 ─────────
  {
    // 逃子:黑子被叫吃,只剩一口气;往空的方向长一手,逃出生天(长到 3 气)。
    id: 'c3-1',
    chapterIndex: 3,
    chapterTitle: '逃子与对杀',
    index: 1,
    title: '长一口气逃出去',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 4, y: 4, c: 'B' },
      { x: 3, y: 4, c: 'W' },
      { x: 5, y: 4, c: 'W' },
      { x: 4, y: 3, c: 'W' },
    ],
    goal: { kind: 'points', points: [{ x: 4, y: 5 }] },
    expectNoCapture: true,
    teach:
      '这回轮到**你的**黑子有危险:它上、左、右都被白棋贴住,只剩正下方一口 [[气]] —— 这就是被 [[叫吃]] 了。别急着乱下,顺着唯一的活路往下长一手,把它接出来。长出去之后,这块黑棋一下子就有了好几口气,安全了。',
    hint: '往黑子正下方那口气长一手(往空的方向跑)。',
    hintPoints: [{ x: 4, y: 5 }],
    markers: [{ x: 4, y: 4, kind: 'circle', color: '#e23b3b' }],
    successText:
      '被叫吃时,先看清自己还有几口气、哪边是空的,往气多的方向逃。注意:如果往死路(很快撞墙或被征)逃,反而越逃越糟 —— 这正是下一步要练的"对杀算气"。',
  },
  {
    // 数气:白看着是一大块(5 子),其实只剩 (3,2) 一口气。数清气就敢点死它。
    // 已核对:黑 (3,2) 一手提 5 子。
    id: 'c3-2',
    chapterIndex: 3,
    chapterTitle: '逃子与对杀',
    index: 2,
    title: '数清气再下手',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 1, y: 1, c: 'W' },
      { x: 2, y: 1, c: 'W' },
      { x: 3, y: 1, c: 'W' },
      { x: 1, y: 2, c: 'W' },
      { x: 2, y: 2, c: 'W' },
      { x: 1, y: 0, c: 'B' },
      { x: 2, y: 0, c: 'B' },
      { x: 3, y: 0, c: 'B' },
      { x: 0, y: 1, c: 'B' },
      { x: 4, y: 1, c: 'B' },
      { x: 0, y: 2, c: 'B' },
      { x: 1, y: 3, c: 'B' },
      { x: 2, y: 3, c: 'B' },
    ],
    goal: { kind: 'capture', min: 5 },
    teach:
      '别被块头吓住!这一大块白棋有 5 颗子,看着挺唬人,可你**数一数它的 [[气]]**:四周几乎全被黑棋围死,只剩一口。找到那口气堵上,整块 5 颗一起提走。下棋前先数气,才知道谁死谁活。',
    hint: '白块唯一的气在右下那个缺口 (3,2)。',
    hintPoints: [{ x: 3, y: 2 }],
    markers: [
      { x: 2, y: 1, kind: 'circle', color: '#e23b3b' },
      { x: 3, y: 2, kind: 'square', color: '#2f6f3e' },
    ],
    successText:
      '会数气,就能一眼看穿:再大的一块棋,只要气数尽了照样被提。"数气"是对杀(双方互相紧气吃子)的基本功。',
  },
  {
    // 对杀(semeai):黑白各一块孤棋,各 2 口气,黑先 → 黑快一步提白。
    // 用对称对杀搜索器穷举验证:黑无论白怎么应都赢。主变 B(1,1) W(4,1) B(1,2)→提2子。
    id: 'c3-3',
    chapterIndex: 3,
    chapterTitle: '逃子与对杀',
    index: 3,
    title: '对杀:快一气者胜',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      // 白弱块 WG(被黑包在左边)
      { x: 2, y: 1, c: 'W' },
      { x: 2, y: 2, c: 'W' },
      // 黑弱块 BG(被白包在右边)
      { x: 3, y: 1, c: 'B' },
      { x: 3, y: 2, c: 'B' },
      // 黑外围(活,围住 WG)
      { x: 0, y: 0, c: 'B' }, { x: 1, y: 0, c: 'B' }, { x: 2, y: 0, c: 'B' },
      { x: 0, y: 1, c: 'B' }, { x: 0, y: 2, c: 'B' },
      { x: 0, y: 3, c: 'B' }, { x: 1, y: 3, c: 'B' }, { x: 2, y: 3, c: 'B' },
      // 白外围(活,围住 BG)
      { x: 3, y: 0, c: 'W' }, { x: 4, y: 0, c: 'W' }, { x: 5, y: 0, c: 'W' },
      { x: 5, y: 1, c: 'W' }, { x: 5, y: 2, c: 'W' },
      { x: 3, y: 3, c: 'W' }, { x: 4, y: 3, c: 'W' }, { x: 5, y: 3, c: 'W' },
    ],
    goal: {
      kind: 'tree',
      root: {
        answers: [{ x: 1, y: 1 }], // 紧白棋的气(任一口都行,这里走左上)
        reply: { x: 4, y: 1 }, // 白反过来紧黑的气(也叫吃黑)
        next: {
          answers: [{ x: 1, y: 2 }], // 别去救自己!继续紧白最后一口 → 提掉白
        },
      },
    },
    teach:
      '中间圈红的两颗白子是一块孤棋,你右边的两颗黑子也是一块孤棋,**双方都只有 2 口气**。这种互相包围、比谁先把对方气紧光的局面,就叫 [[对杀]]。轮到你先走 —— 先手就快一气。记住对杀第一铁律:**抢着紧对方的气,别回头补自己**。',
    hint: '先紧白棋的气(左边 (1,1));白会反过来叫吃你,别理它,下一手 (1,2) 把白先提掉 —— 你快了整整一手。',
    hintPoints: [{ x: 1, y: 1 }],
    markers: [
      { x: 2, y: 1, kind: 'circle', color: '#e23b3b' },
      { x: 2, y: 2, kind: 'circle', color: '#e23b3b' },
      { x: 3, y: 1, kind: 'triangle', color: '#2f6f3e' },
      { x: 3, y: 2, kind: 'triangle', color: '#2f6f3e' },
    ],
    successText:
      '这就是对杀!气数相同时,先手的一方快一气取胜。最容易输棋的错误,就是看到自己被叫吃慌忙去补 —— 那等于白送一手,对杀必输。该出手时就出手。',
  },
  {
    // 有眼杀无眼:黑大块带一只真眼 (2,2),把无眼的白块 WG=(4,2)(5,2) 围在里面,
    // 双方公气 (4,3)(5,3) 各 2 口。黑紧一手后白填眼/填公气都是自杀 → 白只能干看,黑再紧一手提白。
    // 用对称对杀搜索器验证:有眼时黑必胜(连白先都赢);去掉眼则变成双活(黑先也杀不掉)。
    id: 'c3-4',
    chapterIndex: 3,
    chapterTitle: '逃子与对杀',
    index: 4,
    title: '有眼杀无眼',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      // 无眼白块 WG(被黑围在内)
      { x: 4, y: 2, c: 'W' },
      { x: 5, y: 2, c: 'W' },
      // 黑大块(带眼 (2,2),围住 WG)
      { x: 1, y: 1, c: 'B' }, { x: 2, y: 1, c: 'B' }, { x: 3, y: 1, c: 'B' },
      { x: 4, y: 1, c: 'B' }, { x: 5, y: 1, c: 'B' }, { x: 6, y: 1, c: 'B' },
      { x: 1, y: 2, c: 'B' }, { x: 3, y: 2, c: 'B' }, { x: 6, y: 2, c: 'B' },
      { x: 1, y: 3, c: 'B' }, { x: 2, y: 3, c: 'B' }, { x: 3, y: 3, c: 'B' }, { x: 6, y: 3, c: 'B' },
      { x: 1, y: 4, c: 'B' }, { x: 2, y: 4, c: 'B' }, { x: 3, y: 4, c: 'B' },
      { x: 4, y: 4, c: 'B' }, { x: 5, y: 4, c: 'B' }, { x: 6, y: 4, c: 'B' },
      // 外围白框(活,围住黑大块)
      { x: 0, y: 0, c: 'W' }, { x: 1, y: 0, c: 'W' }, { x: 2, y: 0, c: 'W' }, { x: 3, y: 0, c: 'W' },
      { x: 4, y: 0, c: 'W' }, { x: 5, y: 0, c: 'W' }, { x: 6, y: 0, c: 'W' }, { x: 7, y: 0, c: 'W' },
      { x: 0, y: 1, c: 'W' }, { x: 7, y: 1, c: 'W' },
      { x: 0, y: 2, c: 'W' }, { x: 7, y: 2, c: 'W' },
      { x: 0, y: 3, c: 'W' }, { x: 7, y: 3, c: 'W' },
      { x: 0, y: 4, c: 'W' }, { x: 7, y: 4, c: 'W' },
      { x: 0, y: 5, c: 'W' }, { x: 1, y: 5, c: 'W' }, { x: 2, y: 5, c: 'W' }, { x: 3, y: 5, c: 'W' },
      { x: 4, y: 5, c: 'W' }, { x: 5, y: 5, c: 'W' }, { x: 6, y: 5, c: 'W' }, { x: 7, y: 5, c: 'W' },
    ],
    goal: {
      kind: 'tree',
      root: {
        answers: [{ x: 4, y: 3 }], // 紧公气
        reply: null, // 白填眼=自杀、填公气=自杀 → 无法应手(干看着)
        next: {
          answers: [{ x: 5, y: 3 }], // 再紧最后一口公气 → 提掉无眼白块
        },
      },
    },
    teach:
      '里面圈红的白块和你这条大龙互相围着对杀,公共的气((4,3)(5,3))也都只有 2 口 —— 看着像平手。但你左边那个 (2,2) 是一只真 [[眼]]:白棋永远填不进去(填进来就是自杀)。这就是 [[有眼杀无眼]]:你紧一口公气,白棋想还手却发现填眼、填公气全是自杀,只能干看着;你再紧一口,把白整块提掉。',
    hint: '先紧一口公气 (4,3);白棋动弹不得,你再紧 (5,3) 就提掉它了。',
    hintPoints: [{ x: 4, y: 3 }],
    markers: [
      { x: 4, y: 2, kind: 'circle', color: '#e23b3b' },
      { x: 5, y: 2, kind: 'circle', color: '#e23b3b' },
      { x: 2, y: 2, kind: 'square', color: '#2f6f3e' },
    ],
    successText:
      '有眼杀无眼!对杀时,有真眼的一方稳赢没眼的一方 —— 因为对方永远填不掉你的眼,而你能放心大胆地紧光它的气。所以"做眼"在对杀里价值连城。',
  },

  // ───────── 第 4 章 连接与切断 ─────────
  {
    // 切断:白 (4,3) 与 (5,4) 是斜着的两子(关系松),仅靠 (5,3)、(4,4) 两点相连。
    // 黑 (5,3) 已堵掉一个连接点,黑再落 (4,4) 即完全切断,白被分成各 2 气的两块弱棋。
    // 已核对:黑 (4,4) 合法,连上 B(4,5) 得 4 气,不吃子。
    id: 'c4-1',
    chapterIndex: 4,
    chapterTitle: '连接与切断',
    index: 1,
    title: '切断:把对方分成两块',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 4, y: 3, c: 'W' },
      { x: 5, y: 4, c: 'W' },
      { x: 5, y: 3, c: 'B' },
      { x: 4, y: 5, c: 'B' },
    ],
    goal: { kind: 'points', points: [{ x: 4, y: 4 }] },
    expectNoCapture: true,
    teach:
      '圈红的两颗白子是斜着放的,本身并没真正连在一起,全靠 (5,3)、(4,4) 这两个点来"搭桥"。你已经占了右上 (5,3),现在只要再点中间这个 [[断点]],就把它们 [[切断|切断]] 成各自只有 2 口气的两块弱棋 —— 接下来可以分别欺负。**把对方连不上,是进攻的第一步。**',
    hint: '点在两颗白子中间的 (4,4),正好接上你下面的黑子,又切断了白棋。',
    hintPoints: [{ x: 4, y: 4 }],
    markers: [
      { x: 4, y: 3, kind: 'circle', color: '#e23b3b' },
      { x: 5, y: 4, kind: 'circle', color: '#e23b3b' },
    ],
    successText:
      '切断成功!原本斜搭的两颗白子被分成两块,各剩 2 口气、各自为战。记住:看到对方还没连牢的"斜接""跳"等松形,抢先切断,就能把一块强棋拆成两块弱棋。',
  },
  {
    // 接断点:黑 (3,3)、(4,4) 斜接,白已占连接点 (4,3),只剩 (3,4) 一个断点。
    // 黑若不接,白下 (3,4)(已验证合法)即把黑切成两块。黑 (3,4) 接上 → 一块 5 气。
    id: 'c4-2',
    chapterIndex: 4,
    chapterTitle: '连接与切断',
    index: 2,
    title: '接上自己的断点',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 3, y: 3, c: 'B' },
      { x: 4, y: 4, c: 'B' },
      { x: 4, y: 3, c: 'W' },
      { x: 2, y: 4, c: 'W' },
    ],
    goal: { kind: 'points', points: [{ x: 3, y: 4 }] },
    expectNoCapture: true,
    teach:
      '这回轮到**你**有麻烦:你的两颗黑子也是斜着的,白棋已经卡住了 (4,3),只剩 (3,4) 这一个 [[断点]]没补。要是被白先点到 (3,4),你两颗子就被 [[切断]]成两块孤棋。别犹豫,自己先 [[接|接]] 上 —— 连成一整块,气多又结实。',
    hint: '把 (3,4) 这个断点补上,两颗黑子就连成一块了。',
    hintPoints: [{ x: 3, y: 4 }],
    markers: [
      { x: 3, y: 3, kind: 'circle', color: '#2f6f3e' },
      { x: 4, y: 4, kind: 'circle', color: '#2f6f3e' },
      { x: 3, y: 4, kind: 'square', color: '#e23b3b' },
    ],
    successText:
      '连接的基本功:轮到对杀或被攻时,先数数自己有没有没补的断点。一块整棋远比两块孤棋好活。下一关学一种更省力的连法 —— 虎口。',
  },
  {
    // 虎口:白 (3,3) 已被黑三面包(2,3)(3,2)(3,4),只剩 (4,3) 一口气。
    // 黑 (4,3) 提掉白 1 子;提完后 (3,2)(3,4)(4,3) 三子围着空点 (3,3) 就是一张"虎口"。
    // 已核对:黑 (4,3) 提 1 子。
    id: 'c4-3',
    chapterIndex: 4,
    chapterTitle: '连接与切断',
    index: 3,
    title: '虎口:吃子又连成铁壁',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 3, y: 3, c: 'W' },
      { x: 2, y: 3, c: 'B' },
      { x: 3, y: 2, c: 'B' },
      { x: 3, y: 4, c: 'B' },
    ],
    goal: { kind: 'capture', min: 1 },
    teach:
      '白子 (3,3) 三面被围,只剩右边一口气。你在 (4,3) 落子提掉它 —— 提完后,留意你这三颗黑子 (3,2)、(3,4)、(4,3) 正好围着中间那个空点,张成一张嘴,这就叫 [[虎口]]。白棋再也不敢跳进 (3,3):一进去就只剩一口气,等着被你回提。所以虎口是一种**对方切不断的连接**。',
    hint: '在白子唯一的气 (4,3) 上落子,提掉它;顺手就做成了一张虎口。',
    hintPoints: [{ x: 4, y: 3 }],
    markers: [{ x: 3, y: 3, kind: 'circle', color: '#e23b3b' }],
    successText:
      '虎口(也叫"虎")是最常用的连接形:三颗子围一个空点,对方下进来等于自送。它比死板地"接"更省一颗子、更有弹性。以后想连又不想下得太重时,就做个虎口。',
  },
  {
    // 双(并):黑单子 (4,4) 被白两面贴住 (3,4)(4,3),只剩 2 气,危险。
    // 黑 (5,4) 顺势长出,并成 (4,4)(5,4) 两子一排,一下变 4 气。
    // 已核对:落子前 2 气 → 落子后 4 气,不吃子。
    id: 'c4-4',
    chapterIndex: 4,
    chapterTitle: '连接与切断',
    index: 4,
    title: '双:并成一排站得稳',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 4, y: 4, c: 'B' },
      { x: 3, y: 4, c: 'W' },
      { x: 4, y: 3, c: 'W' },
    ],
    goal: { kind: 'points', points: [{ x: 5, y: 4 }] },
    expectNoCapture: true,
    teach:
      '你这颗孤零零的黑子被白棋上、左两面贴住,只剩 2 口 [[气]],随时有危险。最朴实也最坚实的办法,就是顺着开阔的方向"长"一手,和原来的子 [[并|双]]成一排两子 —— 气一下从 2 口涨到 4 口,白棋再难切断。这种并排的两子形就叫 [[双]],是新手最该养成的好习惯:**被贴就长,先把自己站稳。**',
    hint: '往右边空的方向长一手 (5,4),和原来的子并成一排。',
    hintPoints: [{ x: 5, y: 4 }],
    markers: [{ x: 4, y: 4, kind: 'circle', color: '#2f6f3e' }],
    successText:
      '"双"虽然看着笨,却是最厚实、最安全的连接,绝不会留断点。新手常犯的错是被贴住还到处乱跳,结果处处是断点。记住:拿不准时,长一手并成双,准没错。',
  },
  {
    // 跳:黑 (2,4) 在第三线被白棋墙(2,2)(3,2)(4,2)压着,想沿边快快展开。
    // 黑 (4,4) 跳一手(隔空点 (3,4)),又快又有弹性。lone 子开阔处 4 气。
    // 已核对:黑 (4,4) 合法,4 气。
    id: 'c4-5',
    chapterIndex: 4,
    chapterTitle: '连接与切断',
    index: 5,
    title: '跳:跳一步,展开得快',
    boardSize: 9,
    toPlay: 'B',
    stones: [
      { x: 2, y: 4, c: 'B' },
      { x: 2, y: 2, c: 'W' },
      { x: 3, y: 2, c: 'W' },
      { x: 4, y: 2, c: 'W' },
    ],
    goal: { kind: 'points', points: [{ x: 4, y: 4 }] },
    expectNoCapture: true,
    teach:
      '你的黑子在下边被白棋一堵墙压着,想沿着边快点展开、占点地盘。一步一步贴着爬太慢又太重;不如"跳"一手 —— 隔开一个空点 (3,4) 落到 (4,4)。这就是 [[跳]](准确说是"单关跳"):又快又轻灵,中间留的缺口对方一般也切不断。**想快速展开或逃跑时,跳比爬好。**',
    hint: '从 (2,4) 隔一个空点跳到 (4,4),中间的 (3,4) 先空着。',
    hintPoints: [{ x: 4, y: 4 }],
    markers: [{ x: 2, y: 4, kind: 'circle', color: '#2f6f3e' }],
    successText:
      '跳是开拓和逃跑的利器:速度快一倍,又保持联络。新手别只会"爬"——该跳的时候大胆跳。至此你已学会连接与切断:切断对方、补好自己、用虎口和双连牢、用跳快跑。下一章进入死活:让一块棋真正"活"下来。',
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
