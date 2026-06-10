// 课时页:讲解(本课要点)→ 示范(棋盘标注)→ 随堂练习(落子)→ 本课小结。
// 路由参数 ?id=课时ID。「下一课」用 redirectTo 替换当前页,使 useLevelGame 随页面重建自动重置。
import { useMemo, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Goban } from '../../components/Goban'
import { TeachText } from '../../components/TeachText'
import { useLevelGame } from '../../game/useLevelGame'
import { lookupTerm } from '../../data/glossary'
import { scoreArea } from '../../engine/score'
import { getLevel, nextLevel, LEVELS } from '../../levels/data'
import { loadProgress, recordClear } from '../../storage/progress'
import { starsToMastery, extractTerms } from '../../utils/mastery'
import { pageLayoutStyle } from '../../utils/layout'
import './index.scss'

export default function LevelPage() {
  const router = useRouter()
  const id = router.params.id ?? ''
  const level = getLevel(id)

  if (!level) {
    return (
      <View className='lp lp--missing' style={pageLayoutStyle()}>
        <Text className='lp__missing-text'>找不到这节课。</Text>
        <View className='btn' onClick={() => Taro.navigateBack()}>
          返回
        </View>
      </View>
    )
  }

  return <LessonPlayer key={level.id} levelId={level.id} />
}

function LessonPlayer({ levelId }: { levelId: string }) {
  const level = getLevel(levelId)!
  const lessonNo = LEVELS.findIndex((l) => l.id === level.id) + 1
  const hasNext = !!nextLevel(level.id)
  const [openTerm, setOpenTerm] = useState<string | null>(null)
  // 进入课时先弹出「本课要点」讲解,看完再练习;可随时点「?」重温
  const [showTeach, setShowTeach] = useState(true)

  const game = useLevelGame(level, (stars) =>
    recordClear(loadProgress(), level.id, stars),
  )

  // 终局数子展示:完成后(且本课声明了 reveal)按数子法着色并算胜负
  const reveal = level.reveal
  const score = useMemo(
    () =>
      reveal && game.status === 'won'
        ? scoreArea(game.board, { komi: reveal.komi })
        : null,
    [reveal, game.status, game.board],
  )
  const certified =
    !!score && !!reveal?.certifyWinner && score.winner === reveal.certifyWinner

  // 本课小结:掌握度 + 涉及术语回顾
  const mastery = starsToMastery(game.stars, game.status === 'won')
  const lessonTerms = useMemo(
    () => extractTerms(level.teach, level.successText),
    [level.teach, level.successText],
  )

  function exit() {
    Taro.navigateBack()
  }

  function goNext() {
    const n = nextLevel(level.id)
    if (n) Taro.redirectTo({ url: `/pages/level/index?id=${n.id}` })
    else Taro.navigateBack()
  }

  // 小程序 canvas 在部分环境下永远浮在最上层,会盖住弹框;
  // 任何浮层打开时冻结棋盘(快照顶替 + 卸载 canvas),关闭后无缝恢复。
  const overlayOpen = game.status === 'won' || showTeach || !!openTerm

  return (
    <View className='lp' style={pageLayoutStyle()}>
      <View className='lp__bar'>
        <View className='lp__back' onClick={exit}>
          ‹
        </View>
        <Text className='lp__name'>
          第 {lessonNo} 课 · {level.title}
        </Text>
        <View className='lp__teachbtn' onClick={() => setShowTeach(true)}>
          ?
        </View>
      </View>

      <View className='lp__stage'>
        <Text className='lp__stage-tag'>✍️ 随堂练习</Text>
        <Text className='lp__stage-hint'>按本课要点在棋盘上落子</Text>
      </View>

      <Goban
        board={game.board}
        toPlay={game.status === 'won' ? null : game.toPlay}
        koPoint={game.koPoint}
        onPlay={game.play}
        markers={level.markers}
        hintPoints={game.hintActive ? game.hintPoints : []}
        lastMove={game.lastMove}
        territory={score?.ownership ?? null}
        frozen={overlayOpen}
      />

      {/* 练习反馈条 */}
      {(game.feedback.type === 'wrong' || game.feedback.type === 'illegal') &&
        game.feedback.message && (
          <View className='lp__feedback'>{game.feedback.message}</View>
        )}

      <View className='lp__controls'>
        <View className='btn btn--ghost' onClick={game.showHint}>
          💡 提示
        </View>
        <View className='btn btn--ghost' onClick={game.reset}>
          ↺ 重做
        </View>
      </View>

      {game.status === 'won' && (
        <View className='lp__win'>
          <View className='lp__wincard'>
            <Text className='lp__win-head'>本课小结</Text>
            {mastery && (
              <View className='lp__mastery-row'>
                <Text className={`mastery mastery--${mastery.tone}`}>{mastery.label}</Text>
              </View>
            )}

            {score && (
              <View className='scorebox'>
                {certified && (
                  <View className='lp__certify'>🎓 恭喜完成围棋入门课程!</View>
                )}
                <View className='scorebox__row'>
                  <Text className='scorebox__side--b'>黑 {score.black} 子</Text>
                  <Text className='scorebox__vs'>对</Text>
                  <Text className='scorebox__side--w'>白 {score.white} 子</Text>
                </View>
                <View className='scorebox__meta'>
                  含贴目 {score.komi} · 黑空 {score.blackTerritory} / 白空{' '}
                  {score.whiteTerritory}
                  {score.dame > 0 ? ` · 单官 ${score.dame}` : ''}
                </View>
                <View className='scorebox__result'>
                  {score.winner === null
                    ? '双方打平'
                    : `${score.winner === 'B' ? '黑棋' : '白棋'}胜 ${score.margin} 子`}
                </View>
              </View>
            )}

            <TeachText
              text={level.successText ?? '完成本课!'}
              onTerm={setOpenTerm}
              className='lp__wintext'
            />

            {lessonTerms.length > 0 && (
              <View className='lp__terms'>
                <Text className='lp__terms-label'>本课术语</Text>
                <View className='lp__terms-chips'>
                  {lessonTerms.map((t) => (
                    <Text key={t} className='term' onClick={() => setOpenTerm(t)}>
                      {t}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            <View className='lp__winbtns'>
              {hasNext ? (
                <View className='btn' onClick={goNext}>
                  下一课 →
                </View>
              ) : (
                <View className='btn' onClick={exit}>
                  完成课程,返回目录
                </View>
              )}
              <View className='btn btn--ghost' onClick={game.reset}>
                再练一遍
              </View>
            </View>
          </View>
        </View>
      )}

      {showTeach && (
        <View className='lp__teach-overlay' onClick={() => setShowTeach(false)}>
          <View className='lp__teach-card' onClick={(e) => e.stopPropagation()}>
            <Text className='lp__teach-head'>本课要点</Text>
            <TeachText
              text={level.teach}
              onTerm={setOpenTerm}
              className='lp__teach-text'
            />
            <View className='btn lp__teach-ok' onClick={() => setShowTeach(false)}>
              明白了,开始练习
            </View>
          </View>
        </View>
      )}

      {openTerm && (
        <View className='term-pop' onClick={() => setOpenTerm(null)}>
          <View className='term-pop__card' onClick={(e) => e.stopPropagation()}>
            <Text className='term-pop__title'>
              {lookupTerm(openTerm)?.term ?? openTerm}
            </Text>
            <Text className='term-pop__body'>
              {lookupTerm(openTerm)?.short ?? '这个词暂时还没有收录解释。'}
            </Text>
            <View className='btn term-pop__ok' onClick={() => setOpenTerm(null)}>
              知道了
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
