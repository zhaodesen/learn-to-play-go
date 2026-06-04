import { useMemo, useState } from 'react'
import { Goban } from './Goban'
import { TeachText } from './TeachText'
import { useLevelGame } from '../game/useLevelGame'
import { sound } from '../audio/sound'
import { lookupTerm } from '../data/glossary'
import { scoreArea } from '../engine/score'
import { toCnNum } from '../utils/cn'
import type { Level } from '../levels/types'
import './LevelPlayer.css'

interface LevelPlayerProps {
  level: Level
  hasNext: boolean
  onWin: (levelId: string, stars: number) => void
  onExit: () => void
  onNext: () => void
}

function objectiveText(level: Level): string {
  switch (level.goal.kind) {
    case 'place-any-legal':
      return '在棋盘上落下一子试试。'
    case 'capture':
      return '找到对方只剩一口气的棋,吃掉它。'
    case 'points':
      return '想一想,这关键的一手该下在哪里?'
    case 'tree':
      return '一步一步,把对方追着吃掉。'
    default:
      return '想一想这一手。'
  }
}

export function LevelPlayer({ level, hasNext, onWin, onExit, onNext }: LevelPlayerProps) {
  const [openTerm, setOpenTerm] = useState<string | null>(null)

  const game = useLevelGame(
    level,
    (stars) => onWin(level.id, stars),
    (kind) => {
      if (kind === 'win') sound.play('win')
      else if (kind === 'capture') sound.play('capture')
      else if (kind === 'wrong') sound.play('wrong')
      else sound.play('place')
    },
  )

  const fb = game.feedback
  const fbText = fb.message ?? objectiveText(level)

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

  return (
    <div className="lp">
      <div className="lp__bar">
        <button type="button" className="lp__back" onClick={onExit}>
          ← 返回关卡
        </button>
        <span className="lp__title">
          {level.chapterTitle} · 第{toCnNum(level.index)}关 · {level.title}
        </span>
      </div>

      <TeachText text={level.teach} onTerm={setOpenTerm} />

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

      <div className={`lp__feedback lp__feedback--${fb.type}`}>{fbText}</div>

      <div className="lp__controls">
        <button type="button" className="btn btn--ghost" onClick={game.showHint}>
          💡 提示
        </button>
        <button type="button" className="btn btn--ghost" onClick={game.reset}>
          ↺ 重来
        </button>
      </div>

      {game.status === 'won' && (
        <div className="lp__win">
          <div className="lp__wincard">
            <div className="lp__stars">
              {'★'.repeat(game.stars)}
              {'☆'.repeat(3 - game.stars)}
            </div>

            {score && (
              <div className="lp__score">
                {certified && <div className="lp__certify">🎓 入门认证通过!</div>}
                <div className="lp__scorerow">
                  <span className="lp__scoreside lp__scoreside--b">
                    黑 {score.black} 子
                  </span>
                  <span className="lp__scorevs">对</span>
                  <span className="lp__scoreside lp__scoreside--w">
                    白 {score.white} 子
                  </span>
                </div>
                <div className="lp__scoremeta">
                  含贴目 {score.komi} · 黑空 {score.blackTerritory} / 白空 {score.whiteTerritory}
                  {score.dame > 0 && ` · 单官 ${score.dame}`}
                </div>
                <div className="lp__scoreresult">
                  {score.winner === null
                    ? '双方打平'
                    : `${score.winner === 'B' ? '黑棋' : '白棋'}胜 ${score.margin} 子`}
                </div>
              </div>
            )}

            <TeachText
              text={level.successText ?? '过关!'}
              onTerm={setOpenTerm}
              className="lp__wintext"
            />
            <div className="lp__winbtns">
              {hasNext ? (
                <button type="button" className="btn" onClick={onNext}>
                  下一关 →
                </button>
              ) : (
                <button type="button" className="btn" onClick={onExit}>
                  完成,返回
                </button>
              )}
              <button type="button" className="btn btn--ghost" onClick={game.reset}>
                再玩一次
              </button>
            </div>
          </div>
        </div>
      )}

      {openTerm && (
        <div className="term-pop" onClick={() => setOpenTerm(null)}>
          <div className="term-pop__card" onClick={(e) => e.stopPropagation()}>
            <h4>{lookupTerm(openTerm)?.term ?? openTerm}</h4>
            <p>{lookupTerm(openTerm)?.short ?? '这个词暂时还没有收录解释。'}</p>
            <button type="button" className="btn" onClick={() => setOpenTerm(null)}>
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
