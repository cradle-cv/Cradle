'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

const SB_URL = "https://ghnrxnoqqteuxxtqlzfv.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobnJ4bm9xcXRldXh4dHFsemZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTY2NjIsImV4cCI6MjA4NTQzMjY2Mn0.dGQJ33N4LISXbHfMwDjZNK5AQR2VcwF9bBhZkZEU3os"
const sb = createClient(SB_URL, SB_KEY)

// ── Palette ──────────────────────────────────────────────────
const C = {
  bg:     "#0a0a0f",
  panel:  "#12121a",
  border: "rgba(255,255,255,.06)",
  accent: "#f0c040",
  green:  "#3ddc84",
  red:    "#ff5f5f",
  blue:   "#4fc3f7",
  muted:  "rgba(255,255,255,.35)",
  text:   "#f0ede8",
}

// ── Default quiz questions ───────────────────────────────────
const DEFAULT_QUESTIONS = [
  { seq:1, question:"在 Word 中，将选中文字设为「标题 1」样式，应使用哪个功能区？", options:["插入","开始","布局","引用"], correct_index:1, points:10, time_limit:15 },
  { seq:2, question:"在 Word 中，加粗文字的快捷键是？", options:["Ctrl+I","Ctrl+U","Ctrl+B","Ctrl+H"], correct_index:2, points:10, time_limit:10 },
  { seq:3, question:"要在文档中插入表格，应点击哪个菜单？", options:["开始","布局","插入","视图"], correct_index:2, points:10, time_limit:12 },
  { seq:4, question:"将页面方向改为「横向」，应在哪个选项卡操作？", options:["开始","插入","布局","审阅"], correct_index:2, points:10, time_limit:12 },
  { seq:5, question:"Word 中「段落首行缩进 2 字符」在哪里设置？", options:["字体对话框","段落对话框","样式窗格","页面设置"], correct_index:1, points:10, time_limit:15 },
]

// ── Word lab task ────────────────────────────────────────────
const TASK = {
  maxScore: 100,
  timeLimit: 600,
  rawHtml: `<h1>春季电商大促 — 精选商品推荐</h1>
<p>欢迎来到本季最受期待的电商大促活动！以下商品均为<span class="promo">限时特惠</span>，数量有限，先到先得。</p>
<h2>潮流服饰</h2>
<p>本季主打 <span class="promo">简约风格</span> 与 <span class="promo">高性价比</span>，适合日常通勤与休闲出行。</p>
<h2>数码电器</h2>
<p>全系旗舰产品<span class="promo">降价幅度最高达 30%</span>，含保修与正品认证。</p>
<h2>美妆护肤</h2>
<p>精选国际大牌与国货新星，<span class="promo">买二送一</span>，直播间专属优惠码 PROMO2025。</p>
<p>—— 活动有效期至月底，请尽快下单。</p>`,
  requirements: [
    { id:"h1",    pts:20, desc:"将「春季电商大促 — 精选商品推荐」设为 H1 标题样式" },
    { id:"h2x3",  pts:20, desc:"将三个分类名称分别设为 H2 标题样式（≥3 个）" },
    { id:"table", pts:20, desc:"插入一个至少 3 行 × 2 列的价格对比表格" },
    { id:"bold",  pts:20, desc:"将文中「促销词」加粗（≥2 处）" },
    { id:"color", pts:20, desc:"为至少一个 H2 标题添加文字颜色" },
  ]
}

// ── Helpers ──────────────────────────────────────────────────
function genCode() { return Math.random().toString(36).slice(2,7).toUpperCase() }
function fmtTime(s) { return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}` }

// ── Shared UI ────────────────────────────────────────────────
const Btn = ({children,onClick,color=C.accent,small,disabled,style={}}) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: small?"8px 18px":"14px 32px",
    borderRadius:10, border:"none", cursor:disabled?"not-allowed":"pointer",
    background: disabled?"rgba(255,255,255,.08)":color,
    color: disabled?"rgba(255,255,255,.3)":"#0a0a0f",
    fontSize: small?13:15, fontWeight:800, fontFamily:"'DM Mono',monospace",
    transition:"opacity .15s", opacity:disabled?.5:1, ...style
  }}>{children}</button>
)

const Card = ({children,style={}}) => (
  <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:16,padding:24,...style}}>
    {children}
  </div>
)

const Tag = ({children,color=C.muted}) => (
  <span style={{fontSize:11,fontWeight:700,letterSpacing:1,color,textTransform:"uppercase",
    background:"rgba(255,255,255,.04)",padding:"3px 8px",borderRadius:6,border:`1px solid ${color}33`}}>
    {children}
  </span>
)

// ── Phase badge ──────────────────────────────────────────────
function PhaseBadge({phase}) {
  const map = { checkin:["签到中",C.blue], quiz:["抢答中",C.accent], lab:["排版竞赛",C.green], finished:["已结束",C.muted] }
  const [label,color] = map[phase]||["—",C.muted]
  return <Tag color={color}>{label}</Tag>
}

// ══════════════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════════════
function HomeScreen({onTeacher,onStudent}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",padding:24,gap:40}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
      {/* Logo */}
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,letterSpacing:4,color:C.muted,marginBottom:12}}>WORD · SKILLS · COMPETITION</div>
        <div style={{fontSize:48,fontWeight:800,fontFamily:"'Syne',sans-serif",color:C.text,lineHeight:1}}>
          排版<span style={{color:C.accent}}>竞技场</span>
        </div>
        <div style={{fontSize:13,color:C.muted,marginTop:12}}>签到 → 抢答热身 → Word排版实操</div>
      </div>
      {/* Buttons */}
      <div style={{display:"flex",gap:16}}>
        <button onClick={onTeacher} style={{
          padding:"20px 48px",borderRadius:12,border:`2px solid ${C.accent}`,
          background:"transparent",color:C.accent,fontSize:17,fontWeight:800,
          fontFamily:"'Syne',sans-serif",cursor:"pointer",letterSpacing:1
        }}>教师端</button>
        <button onClick={onStudent} style={{
          padding:"20px 48px",borderRadius:12,border:"none",
          background:C.accent,color:"#0a0a0f",fontSize:17,fontWeight:800,
          fontFamily:"'Syne',sans-serif",cursor:"pointer",letterSpacing:1
        }}>学生端</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TEACHER – SETUP  (with full question editor)
// ══════════════════════════════════════════════════════════════
function TeacherSetup({onCreate}) {
  const [title,setTitle] = useState("Word 排版技能竞赛")
  const [timeLimit,setTimeLimit] = useState(600)
  const [qs,setQs] = useState(DEFAULT_QUESTIONS.map(q=>({...q,options:[...q.options]})))
  const [editIdx,setEditIdx] = useState(null)   // index of question being edited
  const [loading,setLoading] = useState(false)

  const inpStyle = (w="100%",extra={}) => ({
    width,padding:"10px 14px",borderRadius:10,border:`1px solid ${C.border}`,
    background:"rgba(255,255,255,.04)",color:C.text,fontSize:13,boxSizing:"border-box",
    fontFamily:"'DM Mono',monospace",outline:"none",...extra
  })

  function updateQ(i,field,val) {
    setQs(p=>p.map((q,idx)=>idx===i?{...q,[field]:val}:q))
  }
  function updateOption(qi,oi,val) {
    setQs(p=>p.map((q,idx)=>idx===qi?{...q,options:q.options.map((o,j)=>j===oi?val:o)}:q))
  }
  function addQ() {
    setQs(p=>{
      const next = [...p,{seq:p.length+1,question:"",options:["","","",""],correct_index:0,points:10,time_limit:15}]
      setEditIdx(next.length-1)
      return next
    })
  }
  function deleteQ(i) {
    setQs(p=>p.filter((_,idx)=>idx!==i).map((q,idx)=>({...q,seq:idx+1})))
    setEditIdx(null)
  }

  async function create() {
    if(qs.some(q=>!q.question.trim())) { alert("有题目内容为空，请检查"); return }
    setLoading(true)
    const code = genCode()
    const {data:sess,error} = await sb.from("word_lab_sessions").insert({
      code, title, task_id:"ecommerce_v1", status:"active",
      time_limit:timeLimit, phase:"checkin",
      started_at: new Date().toISOString()
    }).select().single()
    if(error){alert("创建失败:"+error.message);setLoading(false);return}
    await sb.from("word_lab_questions").insert(qs.map(q=>({...q,session_id:sess.id})))
    onCreate(sess)
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:32,fontFamily:"'DM Mono',monospace",color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <div style={{fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:8}}>创建竞赛房间</div>
        <div style={{color:C.muted,fontSize:13,marginBottom:32}}>签到 → 抢答热身 → Word排版实操</div>

        {/* Basic settings */}
        <Card style={{marginBottom:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 180px",gap:16}}>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>竞赛名称</div>
              <input value={title} onChange={e=>setTitle(e.target.value)} style={inpStyle()}/>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>排版时限（秒）</div>
              <input type="number" value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))}
                style={inpStyle("100%",{color:C.accent})}/>
            </div>
          </div>
        </Card>

        {/* Question list */}
        <Card style={{marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:12,color:C.muted,flex:1}}>抢答题目（共 {qs.length} 题）</div>
            <Btn small onClick={addQ} color={C.green}>＋ 新增题目</Btn>
          </div>

          {qs.map((q,i)=>(
            <div key={i} style={{marginBottom:10,borderRadius:12,border:`1px solid ${editIdx===i?C.accent:C.border}`,overflow:"hidden"}}>
              {/* Collapsed row */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",
                background:editIdx===i?"rgba(240,192,64,.06)":"rgba(255,255,255,.02)",cursor:"pointer"}}
                onClick={()=>setEditIdx(editIdx===i?null:i)}>
                <span style={{fontSize:12,color:C.accent,minWidth:24}}>Q{q.seq}</span>
                <span style={{flex:1,fontSize:13,color:q.question?C.text:C.muted}}>
                  {q.question||"（未填写题目）"}
                </span>
                <span style={{fontSize:11,color:C.muted}}>{q.points}分 · {q.time_limit}s</span>
                <span style={{fontSize:11,color:C.green,marginLeft:4}}>
                  ✓ {q.options[q.correct_index]||"?"}
                </span>
                <span style={{fontSize:14,color:C.muted,marginLeft:8}}>{editIdx===i?"▲":"▼"}</span>
              </div>

              {/* Expanded editor */}
              {editIdx===i && (
                <div style={{padding:"16px 14px",borderTop:`1px solid ${C.border}`,background:"rgba(255,255,255,.02)"}}>
                  {/* Question text */}
                  <div style={{fontSize:11,color:C.muted,marginBottom:6}}>题目内容</div>
                  <textarea value={q.question} onChange={e=>updateQ(i,"question",e.target.value)}
                    rows={2} style={{...inpStyle(),resize:"vertical",marginBottom:14,lineHeight:1.6}}/>

                  {/* Options */}
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>选项（点击绿色标记正确答案）</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                    {q.options.map((opt,j)=>(
                      <div key={j} style={{display:"flex",gap:8,alignItems:"center"}}>
                        <button onClick={()=>updateQ(i,"correct_index",j)} style={{
                          width:28,height:28,borderRadius:8,border:`2px solid ${j===q.correct_index?C.green:C.border}`,
                          background:j===q.correct_index?"rgba(61,220,132,.2)":"transparent",
                          color:j===q.correct_index?C.green:C.muted,cursor:"pointer",
                          fontSize:12,fontWeight:800,flexShrink:0
                        }}>{["A","B","C","D"][j]}</button>
                        <input value={opt} onChange={e=>updateOption(i,j,e.target.value)}
                          placeholder={`选项 ${["A","B","C","D"][j]}`}
                          style={inpStyle("100%",{border:`1px solid ${j===q.correct_index?C.green+"66":C.border}`})}/>
                      </div>
                    ))}
                  </div>

                  {/* Points & timer */}
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:11,color:C.muted,marginBottom:6}}>分值</div>
                      <input type="number" value={q.points} onChange={e=>updateQ(i,"points",Number(e.target.value))}
                        min={1} style={inpStyle(80,{color:C.accent})}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:C.muted,marginBottom:6}}>作答时限（秒）</div>
                      <input type="number" value={q.time_limit} onChange={e=>updateQ(i,"time_limit",Number(e.target.value))}
                        min={5} style={inpStyle(80)}/>
                    </div>
                    <div style={{flex:1}}/>
                    <Btn small onClick={()=>deleteQ(i)} style={{background:C.red,color:"white"}}>删除此题</Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>

        <Btn onClick={create} disabled={loading}>{loading?"创建中…":"创建竞赛房间 →"}</Btn>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TEACHER – MAIN DASHBOARD (phases: checkin / quiz / lab / finished)
// ══════════════════════════════════════════════════════════════
function TeacherDashboard({session:initSession}) {
  const [session,setSession] = useState(initSession)
  const [checkins,setCheckins] = useState([])
  const [questions,setQuestions] = useState([])
  const [answers,setAnswers] = useState([])
  const [submissions,setSubmissions] = useState([])
  const [quizTimer,setQuizTimer] = useState(0)
  const quizInterval = useRef(null)

  // Load questions once
  useEffect(()=>{
    sb.from("word_lab_questions").select().eq("session_id",session.id).order("seq").then(({data})=>{
      if(data) setQuestions(data)
    })
  },[session.id])

  // Realtime subscriptions
  useEffect(()=>{
    const ch = sb.channel(`teacher-${session.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"word_lab_checkins",filter:`session_id=eq.${session.id}`},
        ({new:r})=>setCheckins(p=>[...p.filter(x=>x.student_name!==r.student_name),r]))
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"word_lab_answers",filter:`session_id=eq.${session.id}`},
        ({new:r})=>setAnswers(p=>[...p,r]))
      .on("postgres_changes",{event:"*",schema:"public",table:"word_lab_submissions",filter:`session_id=eq.${session.id}`},
        ({new:r,eventType})=>{
          if(eventType==="INSERT") setSubmissions(p=>[...p,r])
          else setSubmissions(p=>p.map(x=>x.id===r.id?r:x))
        })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"word_lab_sessions",filter:`id=eq.${session.id}`},
        ({new:r})=>setSession(r))
      .subscribe()
    // Initial load
    sb.from("word_lab_checkins").select().eq("session_id",session.id).then(({data})=>{ if(data) setCheckins(data) })
    sb.from("word_lab_answers").select().eq("session_id",session.id).then(({data})=>{ if(data) setAnswers(data) })
    sb.from("word_lab_submissions").select().eq("session_id",session.id).then(({data})=>{ if(data) setSubmissions(data) })
    return ()=>sb.removeChannel(ch)
  },[session.id])

  // Quiz timer
  useEffect(()=>{
    if(session.phase==="quiz" && session.current_question>0 && questions.length>0) {
      const q = questions.find(x=>x.seq===session.current_question)
      if(!q) return
      setQuizTimer(q.time_limit)
      clearInterval(quizInterval.current)
      quizInterval.current = setInterval(()=>setQuizTimer(t=>{
        if(t<=1){ clearInterval(quizInterval.current); return 0 }
        return t-1
      }),1000)
    }
    return ()=>clearInterval(quizInterval.current)
  },[session.phase, session.current_question, questions])

  async function setPhase(phase) {
    await sb.from("word_lab_sessions").update({phase}).eq("id",session.id)
  }
  async function pushQuestion(seq) {
    await sb.from("word_lab_sessions").update({current_question:seq}).eq("id",session.id)
  }
  async function endSession() {
    await sb.from("word_lab_sessions").update({phase:"finished",status:"finished"}).eq("id",session.id)
  }

  const currentQ = questions.find(q=>q.seq===session.current_question)
  const currentAnswers = answers.filter(a=>a.question_id===currentQ?.id)
  const correctCount = currentAnswers.filter(a=>a.is_correct).length

  // Quiz score totals per student
  const quizScores = {}
  answers.forEach(a=>{ quizScores[a.student_name]=(quizScores[a.student_name]||0)+a.points_earned })
  // Lab score per student
  const labScores = {}
  submissions.forEach(s=>{ labScores[s.student_name]=s.score })
  // Combined ranking
  const allStudents = [...new Set([...checkins.map(c=>c.student_name)])]
  const ranking = allStudents.map(name=>({
    name,
    quiz: quizScores[name]||0,
    lab:  labScores[name]||0,
    total:(quizScores[name]||0)+(labScores[name]||0)
  })).sort((a,b)=>b.total-a.total)

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:28,fontFamily:"'DM Mono',monospace",color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>{session.title}</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4,letterSpacing:3}}>房间码: <span style={{color:C.accent,fontSize:20,fontWeight:800}}>{session.code}</span></div>
        </div>
        <PhaseBadge phase={session.phase}/>
        {session.phase!=="finished" && <Btn small onClick={endSession} style={{background:C.red,color:"white"}}>结束竞赛</Btn>}
      </div>

      {/* Phase nav */}
      <div style={{display:"flex",gap:4,marginBottom:28,background:C.panel,padding:6,borderRadius:12,width:"fit-content"}}>
        {[["checkin","签到"],["quiz","抢答"],["lab","排版"],["finished","结果"]].map(([p,label])=>(
          <button key={p} onClick={()=>session.phase!==p&&setPhase(p)} style={{
            padding:"8px 22px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
            background:session.phase===p?C.accent:"transparent",
            color:session.phase===p?"#0a0a0f":C.muted, fontFamily:"'DM Mono',monospace"
          }}>{label}</button>
        ))}
      </div>

      {/* ── CHECKIN PHASE ── */}
      {session.phase==="checkin" && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
            <div style={{fontSize:14,color:C.muted}}>已签到 <span style={{color:C.green,fontWeight:800,fontSize:20}}>{checkins.length}</span> 人</div>
            <Btn onClick={()=>setPhase("quiz")} color={C.accent}>开始抢答热身 →</Btn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
            {checkins.map((c,i)=>(
              <Card key={i} style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:C.green,fontSize:18}}>✓</span>
                <span style={{fontSize:13,fontWeight:700}}>{c.student_name}</span>
              </Card>
            ))}
            {checkins.length===0 && <div style={{color:C.muted,fontSize:13}}>等待学生扫码加入…</div>}
          </div>
        </div>
      )}

      {/* ── QUIZ PHASE ── */}
      {session.phase==="quiz" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
          <div>
            <div style={{fontSize:14,color:C.muted,marginBottom:16}}>点击题号推送给所有学生：</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:24}}>
              {questions.map(q=>(
                <button key={q.seq} onClick={()=>pushQuestion(q.seq)} style={{
                  padding:"12px 20px",borderRadius:10,border:`2px solid ${session.current_question===q.seq?C.accent:C.border}`,
                  background:session.current_question===q.seq?"rgba(240,192,64,.12)":"transparent",
                  color:session.current_question===q.seq?C.accent:C.muted,
                  cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace"
                }}>Q{q.seq}</button>
              ))}
              <Btn onClick={()=>{setPhase("lab");pushQuestion(0)}} color={C.green} small>结束抢答 → 开始排版</Btn>
            </div>

            {currentQ && (
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <Tag color={C.accent}>Q{currentQ.seq} · {currentQ.points}分</Tag>
                  <span style={{fontSize:28,fontWeight:800,color:quizTimer<=5?C.red:C.accent}}>{quizTimer}s</span>
                </div>
                <div style={{fontSize:16,color:C.text,marginBottom:16,lineHeight:1.6}}>{currentQ.question}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {currentQ.options.map((opt,j)=>{
                    const cnt = currentAnswers.filter(a=>a.answer_index===j).length
                    return (
                      <div key={j} style={{padding:"10px 14px",borderRadius:10,
                        background:j===currentQ.correct_index?"rgba(61,220,132,.12)":"rgba(255,255,255,.03)",
                        border:`1px solid ${j===currentQ.correct_index?C.green:C.border}`}}>
                        <div style={{fontSize:13,color:j===currentQ.correct_index?C.green:C.muted,marginBottom:4}}>{opt}</div>
                        <div style={{fontSize:20,fontWeight:800,color:C.text}}>{cnt}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{marginTop:12,fontSize:13,color:C.muted}}>
                  已作答 {currentAnswers.length} / {checkins.length} 人 · 答对 <span style={{color:C.green}}>{correctCount}</span> 人
                </div>
              </Card>
            )}
          </div>

          {/* Live ranking */}
          <div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12,letterSpacing:1}}>当前积分榜</div>
            {ranking.slice(0,10).map((r,i)=>(
              <Card key={r.name} style={{marginBottom:8,padding:"12px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:13,color:i<3?C.accent:C.muted,width:20}}>{i+1}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:700}}>{r.name}</span>
                  <span style={{fontSize:16,fontWeight:800,color:C.accent}}>{r.quiz}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── LAB PHASE ── */}
      {session.phase==="lab" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
          <div>
            <div style={{fontSize:14,color:C.muted,marginBottom:16}}>实时监控学生排版进度</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
              {checkins.map(c=>{
                const sub = submissions.find(s=>s.student_name===c.student_name)
                const pct = sub ? Math.round(sub.score/TASK.maxScore*100) : 0
                return (
                  <Card key={c.student_name} style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:13,fontWeight:700}}>{c.student_name}</span>
                      <span style={{fontSize:13,color:C.accent,fontWeight:800}}>{sub?.score||0}分</span>
                    </div>
                    <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,.06)"}}>
                      <div style={{height:"100%",borderRadius:3,background:C.green,width:`${pct}%`,transition:"width .5s"}}/>
                    </div>
                    {sub?.submitted && <div style={{fontSize:11,color:C.green,marginTop:6}}>✓ 已提交</div>}
                  </Card>
                )
              })}
            </div>
          </div>
          {/* Full ranking */}
          <div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12,letterSpacing:1}}>综合积分榜</div>
            {ranking.map((r,i)=>(
              <Card key={r.name} style={{marginBottom:8,padding:"12px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,color:i<3?C.accent:C.muted,width:20}}>{i+1}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700}}>{r.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>抢答{r.quiz} + 排版{r.lab}</div>
                  </div>
                  <span style={{fontSize:16,fontWeight:800,color:C.accent}}>{r.total}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── FINISHED ── */}
      {session.phase==="finished" && (
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{fontSize:24,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:24,textAlign:"center"}}>
            🏆 竞赛结果
          </div>
          {ranking.map((r,i)=>(
            <Card key={r.name} style={{marginBottom:12,padding:"16px 20px",
              border:i===0?`1px solid ${C.accent}`:undefined}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:28,width:40,textAlign:"center"}}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                </span>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:800}}>{r.name}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                    抢答 {r.quiz}分 · 排版 {r.lab}分
                  </div>
                </div>
                <div style={{fontSize:28,fontWeight:800,color:C.accent}}>{r.total}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// STUDENT – JOIN
// ══════════════════════════════════════════════════════════════
function StudentJoin({onJoin}) {
  const [code,setCode] = useState("")
  const [name,setName] = useState("")
  const [loading,setLoading] = useState(false)

  async function join() {
    if(!code.trim()||!name.trim()){alert("请填写房间码和姓名");return}
    setLoading(true)
    const {data:sess,error} = await sb.from("word_lab_sessions").select()
      .eq("code",code.toUpperCase()).neq("status","finished").single()
    if(error||!sess){alert("找不到该房间，请核对房间码");setLoading(false);return}
    onJoin(sess, name.trim())
  }

  const inputStyle = {
    width:"100%",padding:"14px 16px",borderRadius:12,
    border:`1px solid ${C.border}`,background:"rgba(255,255,255,.04)",
    color:C.text,fontSize:16,boxSizing:"border-box",
    fontFamily:"'DM Mono',monospace",outline:"none",marginBottom:16
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"'DM Mono',monospace",padding:24}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
      <Card style={{width:"100%",maxWidth:360}}>
        <div style={{fontSize:20,fontWeight:800,fontFamily:"'Syne',sans-serif",
          color:C.text,marginBottom:6}}>加入竞赛</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:24}}>输入老师给出的房间码</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:8}}>房间码</div>
        <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={5}
          placeholder="XXXXX" style={{...inputStyle,fontSize:28,letterSpacing:8,textAlign:"center",
          color:C.accent,fontWeight:800}}/>
        <div style={{fontSize:12,color:C.muted,marginBottom:8}}>你的姓名</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="输入真实姓名" style={inputStyle}/>
        <Btn onClick={async()=>{setLoading(true);await join();setLoading(false)}} disabled={loading} style={{width:"100%"}}>
          {loading?"加入中…":"加入竞赛 →"}
        </Btn>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// STUDENT – MAIN (checkin → quiz → lab → finished)
// ══════════════════════════════════════════════════════════════
function StudentMain({session:initSession, studentName}) {
  const [session,setSession] = useState(initSession)
  const [checkedIn,setCheckedIn] = useState(false)
  const [currentQ,setCurrentQ] = useState(null)
  const [answered,setAnswered] = useState({}) // questionId -> index
  const [quizPoints,setQuizPoints] = useState(0)
  const [quizTimer,setQuizTimer] = useState(0)
  const timerRef = useRef(null)
  // Lab state
  const editorRef = useRef(null)
  const savedSel = useRef(null)
  const [done,setDone] = useState(new Set())
  const [labTimeLeft,setLabTimeLeft] = useState(session.time_limit)
  const [submitted,setSubmitted] = useState(false)
  const [submissionId,setSubmissionId] = useState(null)
  const [finalScore,setFinalScore] = useState(0)
  const [showTable,setShowTable] = useState(false)
  const [showColor,setShowColor] = useState(false)
  const [tRows,setTRows] = useState(3)
  const [tCols,setTCols] = useState(2)
  const [flash,setFlash] = useState(null)

  // Check-in on mount
  useEffect(()=>{
    (async()=>{
      const {error} = await sb.from("word_lab_checkins").upsert({
        session_id:session.id, student_name:studentName
      },{onConflict:"session_id,student_name"})
      if(!error) setCheckedIn(true)
    })()
  },[])

  // Listen to session phase changes
  useEffect(()=>{
    const ch = sb.channel(`student-sess-${session.id}`)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"word_lab_sessions",filter:`id=eq.${session.id}`},
        async({new:s})=>{
          setSession(s)
          if(s.phase==="quiz" && s.current_question>0) {
            const {data:q} = await sb.from("word_lab_questions").select()
              .eq("session_id",s.id).eq("seq",s.current_question).single()
            if(q) {
              setCurrentQ(q)
              setQuizTimer(q.time_limit)
              clearInterval(timerRef.current)
              timerRef.current = setInterval(()=>setQuizTimer(t=>{
                if(t<=1){clearInterval(timerRef.current);return 0}
                return t-1
              }),1000)
            }
          }
          if(s.current_question===0) setCurrentQ(null)
          if(s.phase==="lab") {
            // create submission row
            const {data:sub} = await sb.from("word_lab_submissions").insert({
              session_id:s.id, student_name:studentName, score:0,
              max_score:TASK.maxScore, completed_tasks:[]
            }).select().single()
            if(sub) setSubmissionId(sub.id)
          }
        })
      .subscribe()
    return ()=>{sb.removeChannel(ch);clearInterval(timerRef.current)}
  },[session.id])

  // Init Word editor
  useEffect(()=>{
    if(session.phase==="lab" && editorRef.current)
      editorRef.current.innerHTML = TASK.rawHtml
  },[session.phase])

  // Lab timer
  useEffect(()=>{
    if(session.phase!=="lab"||submitted) return
    const t = setInterval(()=>setLabTimeLeft(v=>{
      if(v<=1){clearInterval(t);handleSubmit();return 0}
      return v-1
    }),1000)
    return ()=>clearInterval(t)
  },[session.phase,submitted])

  // Auto-save lab every 3s
  useEffect(()=>{
    if(session.phase!=="lab"||!submissionId||submitted) return
    const t = setInterval(()=>saveProgress(),3000)
    return ()=>clearInterval(t)
  },[session.phase,submissionId,submitted,done])

  async function answerQuiz(q, idx) {
    if(answered[q.id]!==undefined || quizTimer===0) return
    const isCorrect = idx === q.correct_index
    const pts = isCorrect ? q.points : 0
    await sb.from("word_lab_answers").upsert({
      session_id:session.id, question_id:q.id,
      student_name:studentName, answer_index:idx,
      is_correct:isCorrect, points_earned:pts
    },{onConflict:"question_id,student_name"})
    setAnswered(p=>({...p,[q.id]:idx}))
    setQuizPoints(p=>p+pts)
    setFlash(isCorrect?"correct":"wrong")
    setTimeout(()=>setFlash(null),1200)
  }

  function saveSelection() {
    const sel = window.getSelection()
    if(sel&&sel.rangeCount>0) savedSel.current=sel.getRangeAt(0).cloneRange()
  }
  function restoreSelection() {
    if(!savedSel.current) return
    const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(savedSel.current)
  }
  function exec(cmd,val=null) {
    editorRef.current?.focus(); restoreSelection()
    document.execCommand(cmd,false,val)
    checkRequirements()
  }

  function checkRequirements() {
    if(!editorRef.current) return
    const html = editorRef.current.innerHTML
    const el = editorRef.current
    const newDone = new Set()
    if(el.querySelector("h1")) newDone.add("h1")
    if(el.querySelectorAll("h2").length>=3) newDone.add("h2x3")
    if(el.querySelector("table")) newDone.add("table")
    const boldEls = el.querySelectorAll("b,strong,[style*='font-weight: bold'],[style*='font-weight:bold']")
    if(boldEls.length>=2) newDone.add("bold")
    const colorEls = Array.from(el.querySelectorAll("h2")).filter(h=>h.style.color||h.querySelector("[style*='color']"))
    if(colorEls.length>0) newDone.add("color")
    setDone(newDone)
  }

  async function saveProgress() {
    if(!submissionId) return
    const score = TASK.requirements.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)
    await sb.from("word_lab_submissions").update({
      score, completed_tasks:[...done],
      html_content:editorRef.current?.innerHTML||"",
      last_active: new Date().toISOString()
    }).eq("id",submissionId)
  }

  async function handleSubmit() {
    if(submitted) return
    await saveProgress()
    const score = TASK.requirements.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)
    await sb.from("word_lab_submissions").update({submitted:true,score}).eq("id",submissionId)
    setFinalScore(score); setSubmitted(true)
  }

  function insertTable() {
    editorRef.current?.focus(); restoreSelection()
    let html="<table border='1' style='border-collapse:collapse;width:100%;margin:12px 0'>"
    for(let r=0;r<tRows;r++){
      html+="<tr>"
      for(let c=0;c<tCols;c++) html+=`<td style='padding:8px 12px;border:1px solid #ccc'>${r===0?["商品","价格","规格","备注"][c]||"列"+(c+1):"&nbsp;"}</td>`
      html+="</tr>"
    }
    html+="</table>"
    document.execCommand("insertHTML",false,html)
    setShowTable(false); checkRequirements()
  }

  const score = TASK.requirements.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)

  // ── Waiting screen ──
  if(!checkedIn || session.phase==="checkin") {
    return (
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",gap:20}}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
        <div style={{fontSize:48}}>✅</div>
        <div style={{fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif",color:C.text}}>
          {studentName}，签到成功！
        </div>
        <div style={{color:C.muted,fontSize:14}}>等待老师开始抢答热身…</div>
        <div style={{marginTop:8}}>
          <Tag color={C.blue}>房间: {session.code}</Tag>
        </div>
        {/* Pulse dot */}
        <div style={{width:12,height:12,borderRadius:"50%",background:C.green,
          animation:"pulse 1.5s infinite",marginTop:12}}/>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}`}</style>
      </div>
    )
  }

  // ── Quiz screen ──
  if(session.phase==="quiz") {
    const myAnswer = currentQ ? answered[currentQ.id] : undefined
    return (
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",padding:20}}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
        {/* Flash overlay */}
        {flash && (
          <div style={{position:"fixed",inset:0,background:flash==="correct"?"rgba(61,220,132,.15)":"rgba(255,95,95,.15)",
            zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:72,animation:"fadeout .8s forwards"}}>{flash==="correct"?"✓":"✗"}</div>
        )}
        <style>{`@keyframes fadeout{from{opacity:1}to{opacity:0}}`}</style>

        <div style={{width:"100%",maxWidth:480}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:13,color:C.muted}}>{studentName}</div>
              <div style={{fontSize:20,fontWeight:800,color:C.accent}}>{quizPoints} 分</div>
            </div>
            <Tag color={C.accent}>抢答热身</Tag>
          </div>

          {!currentQ ? (
            <Card style={{textAlign:"center",padding:48}}>
              <div style={{fontSize:32,marginBottom:12}}>🎯</div>
              <div style={{color:C.muted}}>等待老师推送题目…</div>
            </Card>
          ) : (
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
                <Tag color={C.accent}>Q{currentQ.seq} · {currentQ.points}分</Tag>
                <span style={{fontSize:32,fontWeight:800,color:quizTimer<=5?C.red:C.accent}}>{quizTimer}</span>
              </div>
              <div style={{fontSize:17,color:C.text,lineHeight:1.7,marginBottom:20}}>{currentQ.question}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {currentQ.options.map((opt,j)=>{
                  const selected = myAnswer===j
                  const revealed = myAnswer!==undefined
                  const isCorrect = j===currentQ.correct_index
                  let bg="rgba(255,255,255,.04)", border=C.border, color=C.muted
                  if(selected && revealed) {
                    bg=isCorrect?"rgba(61,220,132,.15)":"rgba(255,95,95,.12)"
                    border=isCorrect?C.green:C.red
                    color=isCorrect?C.green:C.red
                  } else if(!selected && revealed && isCorrect) {
                    border=C.green; color=C.green
                  }
                  return (
                    <button key={j} onClick={()=>answerQuiz(currentQ,j)} style={{
                      padding:"16px 14px",borderRadius:12,border:`2px solid ${border}`,
                      background:bg,color,fontSize:14,fontWeight:700,cursor:myAnswer!==undefined?"default":"pointer",
                      fontFamily:"'DM Mono',monospace",textAlign:"left",transition:"all .2s"
                    }}>
                      <span style={{color:"rgba(255,255,255,.3)",marginRight:8}}>{["A","B","C","D"][j]}</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {myAnswer!==undefined && (
                <div style={{marginTop:14,textAlign:"center",fontSize:13,
                  color:myAnswer===currentQ.correct_index?C.green:C.red}}>
                  {myAnswer===currentQ.correct_index?`✓ 答对！+${currentQ.points}分`:"✗ 答错，继续加油！"}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    )
  }

  // ── Lab screen ──
  if(session.phase==="lab") {
    const toolBtn = (label,action,extra={})=>(
      <button onMouseDown={e=>{e.preventDefault();saveSelection();action()}} style={{
        padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,
        background:"rgba(255,255,255,.04)",color:C.text,fontSize:12,cursor:"pointer",
        fontFamily:"'DM Mono',monospace",...extra
      }}>{label}</button>
    )
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Mono',monospace",color:C.text,
        display:"grid",gridTemplateRows:"auto 1fr",overflow:"hidden",height:"100vh"}}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>

        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",gap:16,padding:"10px 20px",
          background:C.panel,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",gap:8}}>
          <span style={{fontSize:13,fontWeight:800,color:C.accent,minWidth:60}}>{fmtTime(labTimeLeft)}</span>
          {/* toolbar */}
          {toolBtn("H1",()=>exec("formatBlock","h1"),{color:C.accent})}
          {toolBtn("H2",()=>exec("formatBlock","h2"))}
          {toolBtn("B",()=>exec("bold"),{fontWeight:800})}
          {toolBtn("Color",()=>setShowColor(p=>!p))}
          {toolBtn("表格",()=>setShowTable(p=>!p))}
          {/* color picker */}
          {showColor && (
            <div style={{display:"flex",gap:6,background:C.panel,padding:6,borderRadius:8,border:`1px solid ${C.border}`}}>
              {["#f0c040","#ff5f5f","#4fc3f7","#3ddc84","#a78bfa"].map(col=>(
                <div key={col} onClick={()=>{exec("foreColor",col);setShowColor(false)}} style={{
                  width:24,height:24,borderRadius:6,background:col,cursor:"pointer"
                }}/>
              ))}
            </div>
          )}
          {/* table popup */}
          {showTable && (
            <div style={{display:"flex",gap:8,alignItems:"center",background:C.panel,padding:"6px 12px",
              borderRadius:8,border:`1px solid ${C.border}`}}>
              <input type="number" value={tRows} onChange={e=>setTRows(Number(e.target.value))} min={2} max={8}
                style={{width:40,padding:"4px 6px",borderRadius:6,border:`1px solid ${C.border}`,
                background:"rgba(255,255,255,.04)",color:C.text,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>
              <span style={{color:C.muted,fontSize:11}}>行 ×</span>
              <input type="number" value={tCols} onChange={e=>setTCols(Number(e.target.value))} min={2} max={6}
                style={{width:40,padding:"4px 6px",borderRadius:6,border:`1px solid ${C.border}`,
                background:"rgba(255,255,255,.04)",color:C.text,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>
              <span style={{color:C.muted,fontSize:11}}>列</span>
              <Btn small onClick={insertTable} color={C.green}>插入</Btn>
            </div>
          )}
          <div style={{flex:1}}/>
          <span style={{fontSize:13,color:C.accent,fontWeight:800}}>{score}/{TASK.maxScore}分</span>
          {!submitted && <Btn small onClick={handleSubmit} color={C.accent}>提交</Btn>}
          {submitted && <Tag color={C.green}>已提交</Tag>}
        </div>

        {/* Main area */}
        <div style={{display:"grid",gridTemplateColumns:"200px 1fr",overflow:"hidden"}}>
          {/* Task panel */}
          <div style={{background:C.panel,borderRight:`1px solid ${C.border}`,padding:16,overflowY:"auto"}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:12,letterSpacing:1}}>任务清单</div>
            {TASK.requirements.map(r=>(
              <div key={r.id} style={{marginBottom:12,display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{color:done.has(r.id)?C.green:"rgba(255,255,255,.15)",fontSize:16,marginTop:1}}>
                  {done.has(r.id)?"✓":"○"}
                </span>
                <div>
                  <div style={{fontSize:11,color:done.has(r.id)?C.text:C.muted,lineHeight:1.5}}>{r.desc}</div>
                  <div style={{fontSize:11,color:done.has(r.id)?C.green:"rgba(255,255,255,.15)",fontWeight:800}}>
                    +{r.pts}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Editor */}
          <div style={{background:"#1a1a24",overflowY:"auto",padding:24}}>
            <div style={{maxWidth:680,margin:"0 auto",background:"white",padding:"40px 50px",
              borderRadius:4,boxShadow:"0 4px 40px rgba(0,0,0,.5)"}}>
              <div ref={editorRef} contentEditable={!submitted} onInput={checkRequirements}
                onKeyUp={checkRequirements} onMouseUp={saveSelection} onKeyDown={saveSelection}
                style={{minHeight:400,color:"#222",fontSize:14,lineHeight:1.8,outline:"none",
                  fontFamily:"Georgia,serif"}}/>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Finished / results ──
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",gap:16,padding:24}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
      <div style={{fontSize:48}}>🏅</div>
      <div style={{fontSize:24,fontWeight:800,fontFamily:"'Syne',sans-serif",color:C.text}}>{studentName}</div>
      <div style={{display:"flex",gap:20}}>
        <Card style={{textAlign:"center",padding:"20px 32px"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>抢答得分</div>
          <div style={{fontSize:32,fontWeight:800,color:C.accent}}>{quizPoints}</div>
        </Card>
        <Card style={{textAlign:"center",padding:"20px 32px"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>排版得分</div>
          <div style={{fontSize:32,fontWeight:800,color:C.green}}>{finalScore||score}</div>
        </Card>
      </div>
      <Card style={{textAlign:"center",padding:"16px 40px"}}>
        <div style={{fontSize:12,color:C.muted,marginBottom:4}}>总分</div>
        <div style={{fontSize:40,fontWeight:800,color:C.accent}}>{quizPoints+(finalScore||score)}</div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [screen,setScreen] = useState("home")
  const [session,setSession] = useState(null)
  const [studentName,setStudentName] = useState("")

  if(screen==="home")    return <HomeScreen onTeacher={()=>setScreen("t-setup")} onStudent={()=>setScreen("s-join")}/>
  if(screen==="t-setup") return <TeacherSetup onCreate={s=>{setSession(s);setScreen("t-dash")}}/>
  if(screen==="t-dash")  return <TeacherDashboard session={session}/>
  if(screen==="s-join")  return <StudentJoin onJoin={(sess,name)=>{setSession(sess);setStudentName(name);setScreen("s-main")}}/>
  if(screen==="s-main")  return <StudentMain session={session} studentName={studentName}/>
  return null
}
