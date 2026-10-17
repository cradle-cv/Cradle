'use client'
// 目标路径：app/cyberclass/ui/Stage.js
// 投屏画面：既用于独立的投屏窗口（/cyberclass/stage），也用于桌面里的全屏展示
import { useCallback, useEffect, useState } from 'react'
import { CardView, KIND, stepCount, canReveal } from './cards'

// 投屏卡片的逐步控制：← → 翻步骤，空格揭晓
export function useStageControl(card) {
  const total = stepCount(card)
  const [step, setStep] = useState(1)
  const [revealed, setRevealed] = useState(false)
  const key = card ? card.id + ':' + (card.v || 0) : ''
  useEffect(() => { setStep(1); setRevealed(false) }, [key])
  const next = useCallback(() => {
    if (step < total) setStep(s => Math.min(total, s + 1))
    else if (canReveal(card) && !revealed) setRevealed(true)
  }, [step, total, card, revealed])
  const prev = useCallback(() => {
    if (revealed) setRevealed(false)
    else setStep(s => Math.max(1, s - 1))
  }, [revealed])
  const all = useCallback(() => { setStep(total); if (canReveal(card)) setRevealed(true) }, [total, card])
  return { step, total, revealed, next, prev, all, reveal: () => setRevealed(true), setStep, setRevealed }
}

export function StageView({ card, mediaUrl, ctl, theme = 'dark', topic, onRun }) {
  const k = card ? KIND[card.kind] : null
  const fullBleed = card && ((card.kind === 'program' && card.html) || (card.kind === 'media' && ['pdf', 'link'].includes(card.mtype)))
  return (
    <div className={'cc-stage cc-theme-' + theme}>
      {!card && <Idle topic={topic} />}
      {card && (
        <div className={'cc-stage-card' + (fullBleed ? ' bleed' : '')} style={{ '--kc': k?.color }} key={card.id + ':' + (card.v || 0)}>
          <div className="cc-stage-body">
            <CardView card={card} mode="stage" step={ctl?.step} revealed={ctl?.revealed} onReveal={ctl?.reveal} mediaUrl={mediaUrl} onRun={onRun} />
          </div>
          {!fullBleed && ctl && (ctl.total > 1) && (
            <div className="cc-stage-dots">{Array.from({ length: ctl.total }, (_, i) => <i key={i} className={i < ctl.step ? 'on' : ''} />)}</div>
          )}
        </div>
      )}
    </div>
  )
}

function Idle({ topic }) {
  const [now, setNow] = useState(null)
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t) }, [])
  return (
    <div className="cc-idle">
      <div className="cc-idle-grid" />
      <p className="cc-idle-brand">CYBERCLASS</p>
      {topic && <h1>{topic}</h1>}
      {now && <p className="cc-idle-time">{now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>}
    </div>
  )
}

// 键盘：← → 空格 翻页/揭晓
export function useStageKeys(ctl, extra) {
  useEffect(() => {
    const on = e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); ctl.next() }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); ctl.prev() }
      else if (e.key === ' ') { e.preventDefault(); ctl.next() }
      else if (extra && extra[e.key]) { e.preventDefault(); extra[e.key]() }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [ctl, extra])
}
