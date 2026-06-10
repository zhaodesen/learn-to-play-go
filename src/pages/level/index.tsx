// 关卡页:教学 + 做题。对应 web 版 LevelPlayer,路由参数 ?id=关卡ID。
// 「下一关」用 redirectTo 替换当前页,使 useLevelGame 随页面重建自动重置。
import { useMemo, useState } from 'react'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Goban } from '../../components/Goban'
import { TeachText } from '../../components/TeachText'
import { useLevelGame } from '../../game/useLevelGame'
import { sound } from '../../audio/sound'
import { lookupTerm } from '../../data/glossary'
import { scoreArea } from '../../engine/score'
import { getLevel, nextLevel } from '../../levels/data'
import { loadProgress, recordClear } from '../../storage/progress'
import './index.scss'

export default function LevelPage() {
  const router = useRouter()
  const id = router.params.id ?? ''
  const level = getLevel(id)

  useDidShow(() => {
    const s = loadProgress().settings
    sound.configure({ sfx: s.sfx, volume: s.volume })
  })

  if (!level) {
    return (
      <View className='lp lp--missing'>
        <Text className='lp__missing-text'>找不到这一关。</Text>
        <View className='btn' onClick={() => Taro.navigateBack()}>
          返回
        </View>
      </View>
    )
  }

  return <LevelPlayer key={level.id} levelId={level.id} />
}

function LevelPlayer({ levelId }: { levelId: string }) {
  const level = getLevel(levelId)!
  const hasNext = !!nextLevel(level.id)
  const [openTerm, setOpenTerm] = useState<string | null>(null)
  // 进入关卡先弹出全屏教学提示,看完再下棋;可随时点「?」重温
  const [showTeach, setShowTeach] = useState(true)

  const game = useLevelGame(
    level,
    (stars) => recordClear(loadProgress(), level.id, stars),
    (kind) => {
      if (kind === 'win') sound.play('win')
      else if (kind === 'capture') sound.play('capture')
      else if (kind === 'wrong') sound.play('wrong')
      else sound.play('place')
    },
  )

  // 终局数子展示:过关后(且本关声明了 reveal)按数子法着色并算胜负
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

  function exit() {
    Taro.navigateBack()
  }

  function goNext() {
    const n = nextLevel(level.id)
    if (n) Taro.redirectTo({ url: `/pages/level/index?id=${n.id}` })
    else Taro.navigateBack()
  }

  return (
    <View className='lp'>
      <View className='lp__bar'>
        <View className='lp__back' onClick={exit}>
          ‹
        </View>
        <Text className='lp__name'>{level.title}</Text>
        <View className='lp__teachbtn' onClick={() => setShowTeach(true)}>
          ?
        </View>
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
      />

      {/* 落子反馈条 */}
      {(game.feedback.type === 'wrong' || game.feedback.type === 'illegal') &&
        game.feedback.message && (
          <View className='lp__feedback'>{game.feedback.message}</View>
        )}

      <View className='lp__controls'>
        <View className='btn btn--ghost' onClick={game.showHint}>
          💡 提示
        </View>
        <View className='btn btn--ghost' onClick={game.reset}>
          ↺ 重来
        </View>
      </View>

      {game.status === 'won' && (
        <View className='lp__win'>
          <View className='lp__wincard'>
            <Text className='lp__stars'>
              {'★'.repeat(game.stars)}
              {'☆'.repeat(3 - game.stars)}
            </Text>

            {score && (
              <View className='scorebox'>
                {certified && <View className='lp__certify'>🎓 入门认证通过!</View>}
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
              text={level.successText ?? '过关!'}
              onTerm={setOpenTerm}
              className='lp__wintext'
            />
            <View className='lp__winbtns'>
              {hasNext ? (
                <View className='btn' onClick={goNext}>
                  下一关 →
                </View>
              ) : (
                <View className='btn' onClick={exit}>
                  完成,返回
                </View>
              )}
              <View className='btn btn--ghost' onClick={game.reset}>
                再玩一次
              </View>
            </View>
          </View>
        </View>
      )}

      {showTeach && (
        <View className='lp__teach-overlay' onClick={() => setShowTeach(false)}>
          <View className='lp__teach-card' onClick={(e) => e.stopPropagation()}>
            <TeachText
              text={level.teach}
              onTerm={setOpenTerm}
              className='lp__teach-text'
            />
            <View className='btn lp__teach-ok' onClick={() => setShowTeach(false)}>
              知道了,开始
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
