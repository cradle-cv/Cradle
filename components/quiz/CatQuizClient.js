'use client'
// components/quiz/CatQuizClient.js
// 镜·猫（variant="mirror"）与 猫格测试（variant="pop"）共用组件
// v1.5：改为 上一题/下一题 导航，选中答案以深色块标记，点下一题前进
// 含 v1.2 画稿接入与 v1.1 匿名落库

import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { QUESTIONS, PROFILES, DIM_NAMES } from '@/lib/quiz/catBank'
import { sampleQuestions, scoreAnswers, matchProfiles } from '@/lib/quiz/engine'
import { CATS } from '@/lib/quiz/catIcons'

const serif = "'Songti SC', 'Noto Serif SC', serif"

const THEMES = {
  mirror: {
    bg: '#FFFFFF',
    ink: '#111827',
    sub: '#6B7280',
    faint: '#9CA3AF',
    line: '#111827',
    optionBorder: '#E5E7EB',
    selectedBg: '#111827',      // 镜版选中：墨色块
    selectedText: '#FFFFFF',
    title: '镜 · 猫',
    subtitle: 'Mirror · Cat',
    intro: '二十四个情境。没有对错，只有反应。答完之后，你会遇见一只猫。',
    button: '开始',
    again: '再照一次',
    back: '上一题',
    next: '下一题',
    finish: '完成',
    dualLabel: '你介于两者之间',
  },
  pop: {
    bg: '#FBF5EE',
    ink: '#4A3B33',
    sub: '#8A7466',
    faint: '#B5A395',
    line: '#4A3B33',
    optionBorder: '#EADDD0',
    selectedBg: '#6F5443',      // 猫格版选中：深咖啡色块
    selectedText: '#FFF9F2',
    title: '猫格测试',
    subtitle: '你是哪只猫？',
    intro: '24道情境题，凭直觉选。测完你会得到你的专属猫格，记得截图保存。',
    button: '开始测试',
    again: '再测一次',
    back: '上一题',
    next: '下一题',
    finish: '看结果',
    dualLabel: '稀有双猫格',
  },
}

function saveResult(variant, outcome) {
  try {
    supabase.from('quiz_results').insert({
      quiz_type: 'cat',
      variant,
      profile_id: outcome.results[0].profile.id,
      second_profile_id: outcome.dual ? outcome.results[1].profile.id : null,
      is_dual: outcome.dual,
      u_vector: outcome.U,
    }).then(() => {}, () => {})
  } catch (_) { /* 静默失败 */ }
}

export default function CatQuizClient({ variant = 'mirror' }) {
  const th = THEMES[variant]
  const isMirror = variant === 'mirror'

  const [stage, setStage] = useState('intro') // intro / quiz / result
  const [sampled, setSampled] = useState([])
  const [current, setCurrent] = useState(0)
  const [choices, setChoices] = useState({})
  const [outcome, setOutcome] = useState(null)

  function start() {
    setSampled(sampleQuestions(QUESTIONS))
    setChoices({})
    setCurrent(0)
    setOutcome(null)
    setStage('quiz')
  }

  function pick(optionIdx) {
    const q = sampled[current]
    setChoices({ ...choices, [q.id]: optionIdx })
  }

  function goBack() {
    if (current > 0) setCurrent(current - 1)
  }

  function goNext() {
    const q = sampled[current]
    if (choices[q.id] === undefined) return
    if (current + 1 < sampled.length) {
      setCurrent(current + 1)
    } else {
      const U = scoreAnswers(sampled, choices)
      const result = matchProfiles(U, PROFILES)
      setOutcome(result)
      setStage('result')
      saveResult(variant, result)
    }
  }

  const questionText = useMemo(() => {
    if (stage !== 'quiz' || !sampled[current]) return ''
    const q = sampled[current]
    return !isMirror && q.textPop ? q.textPop : q.text
  }, [stage, sampled, current, isMirror])

  const isLast = current + 1 === sampled.length
  const answered = stage === 'quiz' && sampled[current] && choices[sampled[current].id] !== undefined

  return (
    <div style={{ minHeight: '100vh', background: th.bg, color: th.ink, fontFamily: isMirror ? serif : 'inherit' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 24px' }}>

        {/* 刊头 */}
        <header style={{ padding: '40px 0 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', letterSpacing: '6px', color: th.faint, marginBottom: '10px' }}>
            {isMirror ? 'CRADLE · 摇篮' : 'CAT PERSONALITY'}
          </p>
          <h1 style={{ fontFamily: serif, fontSize: isMirror ? '34px' : '30px', fontWeight: 400, letterSpacing: '4px', margin: 0 }}>
            {th.title}
          </h1>
          <p style={{ fontSize: '12px', color: th.sub, letterSpacing: '2px', marginTop: '8px', fontStyle: isMirror ? 'italic' : 'normal' }}>
            {th.subtitle}
          </p>
        </header>
        <div style={{ borderTop: `0.5px solid ${th.line}`, borderBottom: `3px double ${th.line}`, height: '6px', marginBottom: '36px' }} />

        {/* 入口 */}
        {stage === 'intro' && (
          <div style={{ textAlign: 'center', padding: '30px 0 80px' }}>
            <p style={{ fontSize: '15px', lineHeight: 2.1, color: th.sub, maxWidth: '420px', margin: '0 auto 48px' }}>
              {th.intro}
            </p>
            <button onClick={start} style={{
              background: 'transparent', color: th.ink, cursor: 'pointer',
              border: `1px solid ${th.line}`, borderRadius: isMirror ? 0 : '999px',
              padding: '14px 56px', fontSize: '14px', letterSpacing: '6px', fontFamily: 'inherit',
            }}>
              {th.button}
            </button>
          </div>
        )}

        {/* 答题 */}
        {stage === 'quiz' && sampled[current] && (
          <div style={{ padding: '10px 0 80px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '3px', color: th.faint, textAlign: 'center', marginBottom: '32px' }}>
              {current + 1} / {sampled.length}
            </p>
            <div style={{ height: '1px', background: th.optionBorder, marginBottom: '32px', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '1px', background: th.ink,
                width: `${((current) / sampled.length) * 100}%`, transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ fontFamily: serif, fontSize: '19px', lineHeight: 1.9, marginBottom: '40px', minHeight: '72px' }}>
              {questionText}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sampled[current].options.map((o, i) => {
                const selected = choices[sampled[current].id] === i
                return (
                  <button key={i} onClick={() => pick(i)} style={{
                    textAlign: 'left',
                    background: selected ? th.selectedBg : (isMirror ? 'transparent' : '#FFFFFF'),
                    color: selected ? th.selectedText : th.ink,
                    border: selected ? `1px solid ${th.selectedBg}` : `1px solid ${th.optionBorder}`,
                    borderRadius: isMirror ? 0 : '14px',
                    padding: '16px 20px', fontSize: '15px', lineHeight: 1.7,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = th.ink }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = th.optionBorder }}>
                    {o.t}
                  </button>
                )
              })}
            </div>

            {/* 上一题 / 下一题 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
              <button onClick={goBack} disabled={current === 0} style={{
                background: 'transparent', cursor: current === 0 ? 'default' : 'pointer',
                border: `1px solid ${current === 0 ? 'transparent' : th.optionBorder}`,
                borderRadius: isMirror ? 0 : '999px',
                padding: '12px 32px', fontSize: '13px', letterSpacing: '3px', fontFamily: 'inherit',
                color: current === 0 ? 'transparent' : th.sub,
              }}>
                {th.back}
              </button>
              <button onClick={goNext} disabled={!answered} style={{
                background: answered ? th.ink : 'transparent',
                color: answered ? (isMirror ? '#FFFFFF' : '#FFF9F2') : th.faint,
                cursor: answered ? 'pointer' : 'default',
                border: `1px solid ${answered ? th.ink : th.optionBorder}`,
                borderRadius: isMirror ? 0 : '999px',
                padding: '12px 40px', fontSize: '13px', letterSpacing: '3px', fontFamily: 'inherit',
                transition: 'background 0.2s, color 0.2s',
              }}>
                {isLast ? th.finish : th.next}
              </button>
            </div>
          </div>
        )}

        {/* 结果 */}
        {stage === 'result' && outcome && (
          <div style={{ padding: '10px 0 80px', textAlign: 'center' }}>
            {outcome.dual && (
              <p style={{ fontSize: '11px', letterSpacing: '4px', color: th.faint, marginBottom: '20px' }}>
                {th.dualLabel}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              {outcome.results.map(({ profile }) => (
                <div key={profile.id}>
                  {CATS[profile.id] && (
                    <div
                      style={{ width: '132px', height: '132px', margin: '0 auto 8px' }}
                      dangerouslySetInnerHTML={{ __html: CATS[profile.id] }}
                    />
                  )}
                  <h2 style={{ fontFamily: serif, fontSize: '42px', fontWeight: 400, letterSpacing: '6px', margin: '0 0 24px' }}>
                    {profile.name}
                  </h2>
                  {isMirror ? (
                    <>
                      <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '16px', lineHeight: 2, color: th.ink, maxWidth: '440px', margin: '0 auto 24px' }}>
                        {profile.epigraph}
                      </p>
                      <p style={{ fontSize: '14px', lineHeight: 2.1, color: th.sub, maxWidth: '460px', margin: '0 auto', textAlign: 'left' }}>
                        {profile.descMirror}
                      </p>
                    </>
                  ) : (
                    <div style={{ background: '#FFFFFF', border: `1px solid ${th.optionBorder}`, borderRadius: '18px', padding: '28px 24px', maxWidth: '460px', margin: '0 auto' }}>
                      <p style={{ fontSize: '14px', lineHeight: 2, color: th.ink, textAlign: 'left', margin: 0 }}>
                        {profile.descPop}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 四维刻度：仅镜版展示 */}
            {isMirror && (
              <div style={{ maxWidth: '360px', margin: '56px auto 0' }}>
                {outcome.U.map((v, d) => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', letterSpacing: '3px', color: th.faint, width: '54px', textAlign: 'left', flexShrink: 0 }}>
                      {DIM_NAMES[d]}
                    </span>
                    <div style={{ flex: 1, height: '1px', background: th.optionBorder, position: 'relative' }}>
                      <div style={{
                        position: 'absolute', top: '-3px', left: `calc(${v * 100}% - 3px)`,
                        width: '7px', height: '7px', background: th.ink, borderRadius: '50%',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={start} style={{
              marginTop: '56px', background: 'transparent', color: th.sub, cursor: 'pointer',
              border: `1px solid ${th.optionBorder}`, borderRadius: isMirror ? 0 : '999px',
              padding: '10px 40px', fontSize: '12px', letterSpacing: '4px', fontFamily: 'inherit',
            }}>
              {th.again}
            </button>
          </div>
        )}

        <footer style={{ padding: '0 0 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', letterSpacing: '3px', color: th.faint }}>
            {isMirror ? 'CRADLE.ART' : '猫格测试 · 仅供娱乐'}
          </p>
        </footer>
      </div>
    </div>
  )
}
