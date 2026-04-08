'use client'

import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

const SB_URL = "https://ghnrxnoqqteuxxtqlzfv.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobnJ4bm9xcXRldXh4dHFsemZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTY2NjIsImV4cCI6MjA4NTQzMjY2Mn0.dGQJ33N4LISXbHfMwBSmlEXRlmCflpFP3zfziMOPGk4"
const sb = createClient(SB_URL, SB_KEY)

const C = {
  bg:"#f0f4f8",panel:"#ffffff",panel2:"#f3f6fa",
  border:"#dde3ec",accent:"#2563eb",
  gold:"#d97706",red:"#dc2626",blue:"#0284c7",purple:"#7c3aed",
  muted:"#6b7280",text:"#111827",
}
const GROUP_COLORS=["#2563eb","#059669","#d97706","#dc2626","#7c3aed","#ea580c","#0891b2","#db2777"]

const DEFAULT_QS=[
  {seq:1,question:"在 Word 中，将选中文字设为「标题 1」样式，应使用哪个功能区？",options:["插入","开始","布局","引用"],correct_index:1,points:10,time_limit:15},
  {seq:2,question:"加粗文字的快捷键是？",options:["Ctrl+I","Ctrl+U","Ctrl+B","Ctrl+H"],correct_index:2,points:10,time_limit:10},
  {seq:3,question:"要插入表格，应点击哪个菜单？",options:["开始","布局","插入","视图"],correct_index:2,points:10,time_limit:12},
  {seq:4,question:"将页面改为横向，应在哪个选项卡？",options:["开始","插入","布局","审阅"],correct_index:2,points:10,time_limit:12},
  {seq:5,question:"段落首行缩进 2 字符在哪里设置？",options:["字体对话框","段落对话框","样式窗格","页面设置"],correct_index:1,points:10,time_limit:15},
]

const TASK={
  maxScore:100,timeLimit:600,
  rawHtml:`<h1>春季电商大促 — 精选商品推荐</h1>
<p>欢迎来到本季最受期待的电商大促活动！以下商品均为限时特惠，数量有限，先到先得。</p>
<h2>潮流服饰</h2>
<p>本季主打简约风格与高性价比，适合日常通勤与休闲出行。</p>
<h2>数码电器</h2>
<p>全系旗舰产品降价幅度最高达 30%，含保修与正品认证。</p>
<h2>美妆护肤</h2>
<p>精选国际大牌与国货新星，买二送一，直播间专属优惠码 PROMO2025。</p>
<p>活动有效期至月底，请尽快下单。</p>`,
  reqs:[
    {id:"h1",pts:20,desc:"将标题设为 H1 样式"},
    {id:"h2x3",pts:20,desc:"将三个分类名设为 H2（≥3 个）"},
    {id:"table",pts:20,desc:"插入 ≥3行×2列 价格对比表格"},
    {id:"bold",pts:20,desc:"促销词加粗（≥2 处）"},
    {id:"color",pts:20,desc:"为 H2 标题添加文字颜色"},
  ]
}

const genCode=()=>Math.random().toString(36).slice(2,7).toUpperCase()
const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
const F="'Noto Sans SC',sans-serif"
const FM="'DM Mono','Courier New',monospace"

const Btn=({children,onClick,color=C.accent,small,disabled,full,style={}})=>(
  <button onClick={onClick} disabled={disabled} style={{
    padding:small?"7px 16px":"13px 28px",borderRadius:9,border:"none",
    cursor:disabled?"not-allowed":"pointer",
    background:disabled?"rgba(255,255,255,.07)":color,
    color:disabled?"rgba(0,0,0,.3)":"#ffffff",
    fontSize:small?12:14,fontWeight:700,fontFamily:F,
    width:full?"100%":undefined,opacity:disabled?.6:1,...style
  }}>{children}</button>
)
const Card=({children,style={}})=>(
  <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,.07)',...style}}>
    {children}
  </div>
)
const inp=(extra={})=>({
  width:"100%",padding:"10px 14px",borderRadius:9,border:`1px solid ${C.border}`,
  background:"rgba(0,0,0,.03)",color:C.text,fontSize:13,
  boxSizing:"border-box",fontFamily:F,outline:"none",...extra
})

// ── HOME ─────────────────────────────────────────────────────
function Home({onTeacher,onStudent}){
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0f4ff 0%,#e8f4f8 100%)",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:F,padding:24,gap:48}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,letterSpacing:5,color:"#94a3b8",marginBottom:16,fontFamily:FM}}>高职信息技术 · WORD 教学工具</div>
        <div style={{fontSize:72,fontWeight:900,color:"#0f172a",lineHeight:1,letterSpacing:-2}}>
          录<span style={{color:C.accent}}>录</span>
        </div>
        <div style={{fontSize:13,color:C.muted,marginTop:16,lineHeight:2.2}}>
          签到 &nbsp;·&nbsp; 抢答 &nbsp;·&nbsp; 小组讨论 &nbsp;·&nbsp; 排版竞赛
        </div>
      </div>
      <div style={{display:"flex",gap:14}}>
        <button onClick={onTeacher} style={{padding:"18px 48px",borderRadius:12,
          border:`2px solid ${C.accent}`,background:"transparent",color:C.accent,
          fontSize:16,fontWeight:700,fontFamily:F,cursor:"pointer",boxShadow:"0 0 0 2px "+C.accent}}>教师端</button>
        <button onClick={onStudent} style={{padding:"18px 48px",borderRadius:12,
          border:"none",background:C.accent,color:"#ffffff",
          fontSize:16,fontWeight:700,fontFamily:F,cursor:"pointer"}}>学生端</button>
      </div>
    </div>
  )
}

// ── TEACHER SETUP ────────────────────────────────────────────
function TSetup({onCreate}){
  const [title,setTitle]=useState("Word 排版教学课堂")
  const [timeLab,setTimeLab]=useState(600)
  const [groups,setGroups]=useState([
    {seq:1,name:"第一组",color:GROUP_COLORS[0]},
    {seq:2,name:"第二组",color:GROUP_COLORS[1]},
    {seq:3,name:"第三组",color:GROUP_COLORS[2]},
    {seq:4,name:"第四组",color:GROUP_COLORS[3]},
  ])
  const [qs,setQs]=useState(DEFAULT_QS.map(q=>({...q,options:[...q.options]})))
  const [discussions,setDiscussions]=useState([
    {topic:"Word 排版中，你认为最难掌握的操作是什么？"},
    {topic:"标题样式和手动改字号，有什么本质区别？"},
  ])
  const [editQ,setEditQ]=useState(null)
  const [tab,setTab]=useState("groups")
  const [loading,setLoading]=useState(false)

  const addGroup=()=>{const s=groups.length+1;setGroups(p=>[...p,{seq:s,name:`第${s}组`,color:GROUP_COLORS[(s-1)%GROUP_COLORS.length]}])}
  const updGroup=(i,f,v)=>setGroups(p=>p.map((g,idx)=>idx===i?{...g,[f]:v}:g))
  const delGroup=i=>setGroups(p=>p.filter((_,idx)=>idx!==i).map((g,j)=>({...g,seq:j+1})))
  const updQ=(i,f,v)=>setQs(p=>p.map((q,idx)=>idx===i?{...q,[f]:v}:q))
  const updOpt=(qi,oi,v)=>setQs(p=>p.map((q,idx)=>idx===qi?{...q,options:q.options.map((o,j)=>j===oi?v:o)}:q))
  const addQ=()=>setQs(p=>{const n=[...p,{seq:p.length+1,question:"",options:["","","",""],correct_index:0,points:10,time_limit:15}];setEditQ(n.length-1);return n})
  const delQ=i=>{setQs(p=>p.filter((_,idx)=>idx!==i).map((q,j)=>({...q,seq:j+1})));setEditQ(null)}
  const updDis=(i,v)=>setDiscussions(p=>p.map((d,idx)=>idx===i?{...d,topic:v}:d))

  async function create(){
    if(!title.trim()){alert("请填写课堂名称");return}
    setLoading(true)
    const code=genCode()
    const {data:sess,error}=await sb.from("word_lab_sessions").insert({
      code,title,task_id:"ecommerce_v1",status:"active",
      time_limit:timeLab,phase:"checkin",started_at:new Date().toISOString()
    }).select().single()
    if(error){alert("创建失败:"+error.message);setLoading(false);return}
    await sb.from("lulu_groups").insert(groups.map(g=>({...g,session_id:sess.id})))
    const validQs=qs.filter(q=>q.question.trim())
    if(validQs.length) await sb.from("word_lab_questions").insert(validQs.map(q=>({...q,session_id:sess.id})))
    const validDis=discussions.filter(d=>d.topic.trim())
    if(validDis.length) await sb.from("lulu_discussions").insert(validDis.map(d=>({topic:d.topic,session_id:sess.id})))
    onCreate(sess)
  }

  const tabBtn=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{padding:"8px 20px",borderRadius:8,border:"none",cursor:"pointer",
      fontFamily:F,fontSize:13,fontWeight:700,
      background:tab===t?C.accent:"transparent",color:tab===t?"#ffffff":C.muted}}>
      {label}
    </button>
  )

  return(
    <div style={{padding:28,fontFamily:F,color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>新建课堂</div>
        <div style={{color:C.muted,fontSize:13,marginBottom:24}}>配置好小组、抢答题和讨论议题后创建房间</div>

        <Card style={{marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 160px",gap:16}}>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:7}}>课堂名称</div>
              <input value={title} onChange={e=>setTitle(e.target.value)} style={inp()}/>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:7}}>排版时限（秒）</div>
              <input type="number" value={timeLab} onChange={e=>setTimeLab(Number(e.target.value))} style={inp({color:C.accent})}/>
            </div>
          </div>
        </Card>

        <div style={{display:"flex",gap:4,background:C.panel,padding:5,borderRadius:10,marginBottom:16,width:"fit-content"}}>
          {tabBtn("groups","小组设置")}
          {tabBtn("quiz","抢答题目")}
          {tabBtn("discuss","讨论议题")}
        </div>

        {tab==="groups"&&(
          <Card style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
              <span style={{flex:1,fontSize:13,color:C.muted}}>共 {groups.length} 组</span>
              <Btn small onClick={addGroup}>＋ 添加小组</Btn>
            </div>
            {groups.map((g,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                <div style={{width:26,height:26,borderRadius:7,background:g.color,flexShrink:0}}/>
                <input value={g.name} onChange={e=>updGroup(i,"name",e.target.value)} style={{...inp(),flex:1}}/>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  {GROUP_COLORS.map(col=>(
                    <div key={col} onClick={()=>updGroup(i,"color",col)} style={{
                      width:18,height:18,borderRadius:4,background:col,cursor:"pointer",
                      border:`2px solid ${g.color===col?"white":"transparent"}`}}/>
                  ))}
                </div>
                <button onClick={()=>delGroup(i)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:18}}>×</button>
              </div>
            ))}
          </Card>
        )}

        {tab==="quiz"&&(
          <Card style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
              <span style={{flex:1,fontSize:13,color:C.muted}}>{qs.length} 道题</span>
              <Btn small onClick={addQ} color={C.blue}>＋ 新增题目</Btn>
            </div>
            {qs.map((q,i)=>(
              <div key={i} style={{marginBottom:10,borderRadius:10,border:`1px solid ${editQ===i?C.accent:C.border}`,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",
                  background:editQ===i?"rgba(37,99,235,.05)":"rgba(0,0,0,.015)",cursor:"pointer"}}
                  onClick={()=>setEditQ(editQ===i?null:i)}>
                  <span style={{fontSize:12,color:C.accent,fontFamily:FM,minWidth:22}}>Q{q.seq}</span>
                  <span style={{flex:1,fontSize:13,color:q.question?C.text:C.muted}}>{q.question||"未填写"}</span>
                  <span style={{fontSize:11,color:C.muted}}>{q.points}分·{q.time_limit}s</span>
                  <span style={{fontSize:11,color:C.accent,marginLeft:6}}>✓{q.options[q.correct_index]||"?"}</span>
                  <span style={{color:C.muted}}>{editQ===i?"▲":"▼"}</span>
                </div>
                {editQ===i&&(
                  <div style={{padding:"14px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,.01)"}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:6}}>题目</div>
                    <textarea value={q.question} onChange={e=>updQ(i,"question",e.target.value)} rows={2}
                      style={{...inp(),resize:"vertical",marginBottom:12,lineHeight:1.6}}/>
                    <div style={{fontSize:11,color:C.muted,marginBottom:8}}>选项（点字母标记正确答案）</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      {q.options.map((opt,j)=>(
                        <div key={j} style={{display:"flex",gap:8,alignItems:"center"}}>
                          <button onClick={()=>updQ(i,"correct_index",j)} style={{
                            width:28,height:28,borderRadius:7,
                            border:`2px solid ${j===q.correct_index?C.accent:C.border}`,
                            background:j===q.correct_index?"rgba(37,99,235,.15)":"transparent",
                            color:j===q.correct_index?C.accent:C.muted,cursor:"pointer",
                            fontSize:12,fontWeight:700,fontFamily:FM,flexShrink:0
                          }}>{"ABCD"[j]}</button>
                          <input value={opt} onChange={e=>updOpt(i,j,e.target.value)}
                            placeholder={`选项${"ABCD"[j]}`}
                            style={inp({border:`1px solid ${j===q.correct_index?C.accent+"55":C.border}`})}/>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:5}}>分值</div>
                        <input type="number" value={q.points} onChange={e=>updQ(i,"points",Number(e.target.value))} min={1}
                          style={inp({width:70,color:C.accent})}/>
                      </div>
                      <div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:5}}>时限(秒)</div>
                        <input type="number" value={q.time_limit} onChange={e=>updQ(i,"time_limit",Number(e.target.value))} min={5}
                          style={inp({width:70})}/>
                      </div>
                      <div style={{flex:1}}/>
                      <Btn small onClick={()=>delQ(i)} style={{background:C.red,color:"white"}}>删除</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}

        {tab==="discuss"&&(
          <Card style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
              <span style={{flex:1,fontSize:13,color:C.muted}}>{discussions.length} 个议题</span>
              <Btn small onClick={()=>setDiscussions(p=>[...p,{topic:""}])} color={C.purple}>＋ 新增议题</Btn>
            </div>
            {discussions.map((d,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:12,color:C.purple,fontFamily:FM,minWidth:22}}>D{i+1}</span>
                <input value={d.topic} onChange={e=>updDis(i,e.target.value)} placeholder="输入讨论议题…"
                  style={{...inp(),flex:1}}/>
                <button onClick={()=>setDiscussions(p=>p.filter((_,idx)=>idx!==i))}
                  style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:18}}>×</button>
              </div>
            ))}
            {!discussions.length&&<div style={{fontSize:13,color:C.muted}}>暂无议题</div>}
          </Card>
        )}

        <div style={{marginTop:24}}>
          <Btn onClick={create} disabled={loading}>{loading?"创建中…":"创建课堂房间 →"}</Btn>
        </div>
      </div>
    </div>
  )
}

// ── TEACHER DASHBOARD ────────────────────────────────────────
function TDash({session:init,onBack}){
  const [sess,setSess]=useState(init)
  const [groups,setGroups]=useState([])
  const [checkins,setCheckins]=useState([])
  const [questions,setQuestions]=useState([])
  const [answers,setAnswers]=useState([])
  const [discussions,setDiscussions]=useState([])
  const [posts,setPosts]=useState([])
  const [submissions,setSubmissions]=useState([])
  const [qTimer,setQTimer]=useState(0)
  const timerRef=useRef(null)

  useEffect(()=>{
    sb.from("lulu_groups").select().eq("session_id",init.id).order("seq").then(({data})=>data&&setGroups(data))
    sb.from("word_lab_questions").select().eq("session_id",init.id).order("seq").then(({data})=>data&&setQuestions(data))
    sb.from("lulu_discussions").select().eq("session_id",init.id).order("created_at").then(({data})=>data&&setDiscussions(data))
    sb.from("word_lab_checkins").select().eq("session_id",init.id).then(({data})=>data&&setCheckins(data))
    sb.from("word_lab_answers").select().eq("session_id",init.id).then(({data})=>data&&setAnswers(data))
    sb.from("lulu_posts").select().eq("session_id",init.id).order("created_at").then(({data})=>data&&setPosts(data))
    sb.from("word_lab_submissions").select().eq("session_id",init.id).then(({data})=>data&&setSubmissions(data))

    const ch=sb.channel(`tdash-${init.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"word_lab_checkins",filter:`session_id=eq.${init.id}`},
        ({new:r})=>setCheckins(p=>[...p.filter(x=>x.student_name!==r.student_name),r]))
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"word_lab_checkins",filter:`session_id=eq.${init.id}`},
        ({new:r})=>setCheckins(p=>p.map(x=>x.student_name===r.student_name?r:x)))
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"word_lab_answers",filter:`session_id=eq.${init.id}`},
        ({new:r})=>setAnswers(p=>[...p,r]))
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"lulu_posts",filter:`session_id=eq.${init.id}`},
        ({new:r})=>setPosts(p=>[...p,r]))
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"lulu_discussions",filter:`session_id=eq.${init.id}`},
        ({new:r})=>setDiscussions(p=>p.map(x=>x.id===r.id?r:x)))
      .on("postgres_changes",{event:"*",schema:"public",table:"word_lab_submissions",filter:`session_id=eq.${init.id}`},
        ({new:r,eventType})=>setSubmissions(p=>eventType==="INSERT"?[...p,r]:p.map(x=>x.id===r.id?r:x)))
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"word_lab_sessions",filter:`id=eq.${init.id}`},
        ({new:r})=>setSess(r))
      .subscribe()
    return()=>{sb.removeChannel(ch);clearInterval(timerRef.current)}
  },[init.id])

  useEffect(()=>{
    if(sess.phase==="quiz"&&sess.current_question>0){
      const q=questions.find(x=>x.seq===sess.current_question)
      if(!q) return
      setQTimer(q.time_limit)
      clearInterval(timerRef.current)
      timerRef.current=setInterval(()=>setQTimer(t=>{if(t<=1){clearInterval(timerRef.current);return 0}return t-1}),1000)
    }
    return()=>clearInterval(timerRef.current)
  },[sess.phase,sess.current_question,questions])

  const setPhase=async p=>{ await sb.from("word_lab_sessions").update({phase:p}).eq("id",sess.id) }
  const pushQ=async seq=>{ await sb.from("word_lab_sessions").update({current_question:seq}).eq("id",sess.id) }
  const toggleDis=async d=>{ await sb.from("lulu_discussions").update({is_active:!d.is_active}).eq("id",d.id) }
  const endSession=async()=>{ await sb.from("word_lab_sessions").update({phase:"finished",status:"finished"}).eq("id",sess.id) }

  const curQ=questions.find(q=>q.seq===sess.current_question)
  const curAnswers=answers.filter(a=>a.question_id===curQ?.id)
  const activeDis=discussions.find(d=>d.is_active)
  const activePosts=posts.filter(p=>p.discussion_id===activeDis?.id)

  const quizScores={}; answers.forEach(a=>{quizScores[a.student_name]=(quizScores[a.student_name]||0)+a.points_earned})
  const labScores={}; submissions.forEach(s=>{labScores[s.student_name]=s.score})
  const allStudents=[...new Set(checkins.map(c=>c.student_name))]
  const studentRank=allStudents.map(name=>({
    name,group_id:checkins.find(c=>c.student_name===name)?.group_id,
    quiz:quizScores[name]||0,lab:labScores[name]||0,
    total:(quizScores[name]||0)+(labScores[name]||0)
  })).sort((a,b)=>b.total-a.total)

  const groupRank=groups.map(g=>{
    const members=checkins.filter(c=>c.group_id===g.id)
    const names=members.map(m=>m.student_name)
    const labAvg=names.length?Math.round(names.reduce((s,n)=>s+(labScores[n]||0),0)/names.length):0
    const quizSum=names.reduce((s,n)=>s+(quizScores[n]||0),0)
    return{...g,memberCount:names.length,labAvg,quizSum,total:quizSum+labAvg}
  }).sort((a,b)=>b.total-a.total)

  const phases=[["checkin","签到"],["quiz","抢答"],["discussion","讨论"],["lab","排版"],["finished","结果"]]

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:16,padding:"12px 24px",
        background:C.panel,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:17,fontWeight:900}}>{sess.title}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2,fontFamily:FM}}>
            房间码 <span style={{color:C.accent,fontSize:20,fontWeight:700,letterSpacing:3}}>{sess.code}</span>
            <span style={{marginLeft:12}}>· {checkins.length} 人签到</span>
          </div>
        </div>
        <div style={{display:"flex",gap:3,background:"#f0f4f8",padding:4,borderRadius:10,border:"1px solid #dde3ec"}}>
          {phases.map(([p,label])=>(
            <button key={p} onClick={()=>setPhase(p)} style={{
              padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:F,
              background:sess.phase===p?C.accent:"transparent",color:sess.phase===p?"#ffffff":C.muted
            }}>{label}</button>
          ))}
        </div>
        <Btn small onClick={endSession} style={{background:C.red,color:"white"}}>结束</Btn>
        {onBack&&<Btn small onClick={onBack} style={{background:"rgba(0,0,0,.06)",color:C.text}}>← 后台</Btn>}
      </div>

      <div style={{padding:24}}>

        {/* CHECKIN */}
        {sess.phase==="checkin"&&(
          <div>
            <div style={{display:"flex",gap:14,marginBottom:20,alignItems:"center"}}>
              <span style={{fontSize:14,color:C.muted}}>学生签到后可自选小组</span>
              <Btn small onClick={()=>setPhase("quiz")} color={C.blue}>→ 开始抢答</Btn>
              <Btn small onClick={()=>setPhase("discussion")} color={C.purple}>→ 直接讨论</Btn>
              <Btn small onClick={()=>setPhase("lab")} color={C.accent}>→ 直接排版</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(groups.length,4)},1fr)`,gap:14}}>
              {groups.map(g=>{
                const members=checkins.filter(c=>c.group_id===g.id)
                return(
                  <Card key={g.id} style={{borderTop:`3px solid ${g.color}`}}>
                    <div style={{fontSize:14,fontWeight:700,color:g.color,marginBottom:8}}>{g.name}</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:10}}>{members.length} 人</div>
                    {members.map(m=>(
                      <div key={m.student_name} style={{fontSize:13,padding:"6px 10px",borderRadius:7,
                        background:"rgba(0,0,0,.03)",marginBottom:6}}>✓ {m.student_name}</div>
                    ))}
                  </Card>
                )
              })}
            </div>
            {checkins.filter(c=>!c.group_id).length>0&&(
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:8}}>未选组</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {checkins.filter(c=>!c.group_id).map(c=>(
                    <span key={c.student_name} style={{fontSize:13,padding:"6px 12px",borderRadius:7,
                      background:"rgba(0,0,0,.03)"}}>{c.student_name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUIZ */}
        {sess.phase==="quiz"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:20}}>
            <div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
                {questions.map(q=>(
                  <button key={q.seq} onClick={()=>pushQ(q.seq)} style={{
                    padding:"10px 18px",borderRadius:9,border:`2px solid ${sess.current_question===q.seq?C.accent:C.border}`,
                    background:sess.current_question===q.seq?"rgba(37,99,235,.08)":"transparent",
                    color:sess.current_question===q.seq?C.accent:C.muted,
                    cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FM
                  }}>Q{q.seq}</button>
                ))}
                <Btn small onClick={()=>setPhase("discussion")} color={C.purple}>→ 讨论</Btn>
                <Btn small onClick={()=>{setPhase("lab");pushQ(0)}} color={C.accent}>→ 排版</Btn>
              </div>
              {curQ&&(
                <Card>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                    <span style={{fontSize:12,color:C.muted,fontFamily:FM}}>Q{curQ.seq} · {curQ.points}分</span>
                    <span style={{fontSize:40,fontWeight:900,color:qTimer<=5?C.red:C.accent,fontFamily:FM}}>{qTimer}</span>
                  </div>
                  <div style={{fontSize:16,lineHeight:1.75,marginBottom:16}}>{curQ.question}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {curQ.options.map((opt,j)=>{
                      const cnt=curAnswers.filter(a=>a.answer_index===j).length
                      return(
                        <div key={j} style={{padding:"10px 14px",borderRadius:10,
                          background:j===curQ.correct_index?"rgba(37,99,235,.08)":"rgba(0,0,0,.02)",
                          border:`1px solid ${j===curQ.correct_index?C.accent:C.border}`}}>
                          <div style={{fontSize:13,color:j===curQ.correct_index?C.accent:C.muted,marginBottom:4}}>{opt}</div>
                          <div style={{fontSize:24,fontWeight:900,fontFamily:FM}}>{cnt}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{marginTop:10,fontSize:12,color:C.muted}}>
                    作答 {curAnswers.length}/{checkins.length} · 答对 <span style={{color:C.accent}}>{curAnswers.filter(a=>a.is_correct).length}</span>
                  </div>
                </Card>
              )}
              {!curQ&&<Card style={{textAlign:"center",padding:40,color:C.muted}}>点击上方题号推送给学生</Card>}
            </div>
            <GroupRankPanel groupRank={groupRank} label="小组抢答积分"/>
          </div>
        )}

        {/* DISCUSSION */}
        {sess.phase==="discussion"&&(
          <div style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:20}}>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:12}}>议题列表（点击激活/关闭）</div>
              {discussions.map(d=>(
                <Card key={d.id} style={{marginBottom:10,cursor:"pointer",
                  border:`1px solid ${d.is_active?C.purple:C.border}`,
                  background:d.is_active?"rgba(124,58,237,.07)":C.panel}}
                  onClick={()=>toggleDis(d)}>
                  <div style={{fontSize:12,color:d.is_active?C.purple:C.muted,fontWeight:700,marginBottom:4}}>
                    {d.is_active?"● 进行中":"○ 未激活"}
                  </div>
                  <div style={{fontSize:13,lineHeight:1.6}}>{d.topic}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:6}}>{posts.filter(p=>p.discussion_id===d.id).length} 条发言</div>
                </Card>
              ))}
              <div style={{marginTop:14}}>
                <Btn small onClick={()=>setPhase("lab")} color={C.accent} full>→ 开始排版</Btn>
              </div>
            </div>
            <div>
              {activeDis?(
                <>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:16,padding:"12px 16px",
                    background:"rgba(124,58,237,.08)",borderRadius:10,border:`1px solid ${C.purple}44`}}>
                    💬 {activeDis.topic}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                    {activePosts.map(p=>{
                      const g=groups.find(x=>x.id===p.group_id)
                      return(
                        <Card key={p.id} style={{borderLeft:`3px solid ${g?.color||C.border}`}}>
                          <div style={{fontSize:11,color:g?.color||C.muted,fontWeight:700,marginBottom:6}}>
                            {p.student_name}{g?` · ${g.name}`:""}
                          </div>
                          <div style={{fontSize:13,lineHeight:1.6}}>{p.content}</div>
                        </Card>
                      )
                    })}
                    {!activePosts.length&&<div style={{fontSize:13,color:C.muted,gridColumn:"1/-1",padding:20}}>等待学生发言…</div>}
                  </div>
                </>
              ):(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:C.muted,fontSize:14}}>
                  ← 点击左侧议题激活
                </div>
              )}
            </div>
          </div>
        )}

        {/* LAB */}
        {sess.phase==="lab"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:20}}>
            <div>
              {groups.map(g=>{
                const members=checkins.filter(c=>c.group_id===g.id)
                const avgScore=members.length?Math.round(members.reduce((s,m)=>{
                  const sub=submissions.find(x=>x.student_name===m.student_name)
                  return s+(sub?.score||0)
                },0)/members.length):0
                return(
                  <Card key={g.id} style={{marginBottom:14,borderLeft:`3px solid ${g.color}`}}>
                    <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
                      <span style={{fontSize:14,fontWeight:700,color:g.color,flex:1}}>{g.name}</span>
                      <span style={{fontSize:12,color:C.muted}}>
                        小组均分 <span style={{color:g.color,fontWeight:900,fontSize:20,fontFamily:FM}}>{avgScore}</span>
                      </span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                      {members.map(m=>{
                        const sub=submissions.find(x=>x.student_name===m.student_name)
                        const pct=sub?Math.round(sub.score/TASK.maxScore*100):0
                        return(
                          <div key={m.student_name} style={{padding:"8px 12px",borderRadius:8,background:"rgba(0,0,0,.02)"}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                              <span>{m.student_name}</span>
                              <span style={{color:C.accent,fontWeight:700,fontFamily:FM}}>{sub?.score||0}</span>
                            </div>
                            <div style={{height:4,borderRadius:2,background:"rgba(0,0,0,.05)"}}>
                              <div style={{height:"100%",borderRadius:2,background:g.color,width:`${pct}%`,transition:"width .5s"}}/>
                            </div>
                            {sub?.submitted&&<div style={{fontSize:10,color:C.accent,marginTop:4}}>✓ 已提交</div>}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )
              })}
            </div>
            <GroupRankPanel groupRank={groupRank} label="小组综合积分"/>
          </div>
        )}

        {/* FINISHED */}
        {sess.phase==="finished"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:880}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>🏆 小组排名</div>
              {groupRank.map((g,i)=>(
                <Card key={g.id} style={{marginBottom:10,borderLeft:`3px solid ${g.color}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:24}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:g.color}}>{g.name}</div>
                      <div style={{fontSize:11,color:C.muted}}>抢答 {g.quizSum} · 排版均分 {g.labAvg} · {g.memberCount}人</div>
                    </div>
                    <span style={{fontSize:28,fontWeight:900,color:g.color,fontFamily:FM}}>{g.total}</span>
                  </div>
                </Card>
              ))}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>个人排名</div>
              {studentRank.map((r,i)=>{
                const g=groups.find(x=>x.id===r.group_id)
                return(
                  <Card key={r.name} style={{marginBottom:8,padding:"12px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:13,color:i<3?C.gold:C.muted,width:22,fontFamily:FM}}>{i+1}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700}}>{r.name}</div>
                        {g&&<div style={{fontSize:11,color:g.color}}>{g.name}</div>}
                      </div>
                      <span style={{fontSize:16,fontWeight:900,color:C.accent,fontFamily:FM}}>{r.total}</span>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GroupRankPanel({groupRank,label}){
  return(
    <div>
      <div style={{fontSize:12,color:C.muted,marginBottom:12,fontFamily:"'Noto Sans SC',sans-serif"}}>{label}</div>
      {groupRank.map((g,i)=>(
        <div key={g.id} style={{marginBottom:8,padding:"12px 14px",borderRadius:12,
          background:"#ffffff",border:`1px solid #dde3ec`,boxShadow:"0 1px 3px rgba(0,0,0,.06)",borderLeft:`3px solid ${g.color}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,color:i<3?"#f5c842":"rgba(255,255,255,.32)",width:20,fontFamily:"'DM Mono',monospace"}}>{i+1}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:g.color,fontFamily:"'Noto Sans SC',sans-serif"}}>{g.name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.32)",fontFamily:"'Noto Sans SC',sans-serif"}}>
                {g.memberCount}人 · 抢{g.quizSum} · 排{g.labAvg}
              </div>
            </div>
            <span style={{fontSize:20,fontWeight:900,color:g.color,fontFamily:"'DM Mono',monospace"}}>{g.total}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── STUDENT JOIN ─────────────────────────────────────────────
function SJoin({onJoin}){
  const [code,setCode]=useState("")
  const [name,setName]=useState("")
  const [loading,setLoading]=useState(false)

  async function join(){
    if(!code.trim()||!name.trim()){alert("请填写房间码和姓名");return}
    setLoading(true)
    const {data:s,error}=await sb.from("word_lab_sessions").select()
      .eq("code",code.toUpperCase()).neq("status","finished").single()
    if(error||!s){alert("找不到房间，请核对房间码");setLoading(false);return}
    onJoin(s,name.trim())
    setLoading(false)
  }

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:F,padding:24}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <Card style={{width:"100%",maxWidth:340}}>
        <div style={{fontSize:22,fontWeight:900,marginBottom:4}}>加入录录课堂</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:24}}>输入老师的 5 位房间码</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:7}}>房间码</div>
        <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={5}
          placeholder="XXXXX"
          style={{...inp({fontSize:28,letterSpacing:8,textAlign:"center",color:C.accent,
            fontWeight:700,fontFamily:FM,marginBottom:16})}}/>
        <div style={{fontSize:12,color:C.muted,marginBottom:7}}>姓名</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="输入你的姓名"
          style={{...inp({marginBottom:20})}}
          onKeyDown={e=>e.key==="Enter"&&join()}/>
        <Btn full onClick={join} disabled={loading}>{loading?"加入中…":"加入课堂 →"}</Btn>
      </Card>
    </div>
  )
}

// ── STUDENT MAIN ─────────────────────────────────────────────
function SMain({session:init,studentName}){
  const [sess,setSess]=useState(init)
  const [groups,setGroups]=useState([])
  const [myGroupId,setMyGroupId]=useState(null)
  const [checkedIn,setCheckedIn]=useState(false)
  const [curQ,setCurQ]=useState(null)
  const [answered,setAnswered]=useState({})
  const [quizPts,setQuizPts]=useState(0)
  const [qTimer,setQTimer]=useState(0)
  const timerRef=useRef(null)
  const [activeDis,setActiveDis]=useState(null)
  const [posts,setPosts]=useState([])
  const [postText,setPostText]=useState("")
  const [posted,setPosted]=useState({})
  const editorRef=useRef(null)
  const savedSel=useRef(null)
  const [done,setDone]=useState(new Set())
  const [labTime,setLabTime]=useState(init.time_limit)
  const [submitted,setSubmitted]=useState(false)
  const [subId,setSubId]=useState(null)
  const [finalScore,setFinalScore]=useState(0)
  const [showTable,setShowTable]=useState(false)
  const [showColor,setShowColor]=useState(false)
  const [tRows,setTRows]=useState(3)
  const [tCols,setTCols]=useState(2)
  const [flash,setFlash]=useState(null)

  useEffect(()=>{
    sb.from("lulu_groups").select().eq("session_id",init.id).order("seq").then(({data})=>data&&setGroups(data))
    sb.from("word_lab_checkins").upsert({session_id:init.id,student_name:studentName},{onConflict:"session_id,student_name"})
      .then(()=>setCheckedIn(true))
    sb.from("word_lab_checkins").select("group_id").eq("session_id",init.id).eq("student_name",studentName).single()
      .then(({data})=>{ if(data?.group_id) setMyGroupId(data.group_id) })
  },[])

  useEffect(()=>{
    const ch=sb.channel(`smain-${init.id}-${studentName}`)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"word_lab_sessions",filter:`id=eq.${init.id}`},
        async({new:s})=>{
          setSess(s)
          if(s.phase==="quiz"&&s.current_question>0){
            const {data:q}=await sb.from("word_lab_questions").select()
              .eq("session_id",s.id).eq("seq",s.current_question).single()
            if(q){
              setCurQ(q);setQTimer(q.time_limit)
              clearInterval(timerRef.current)
              timerRef.current=setInterval(()=>setQTimer(t=>{if(t<=1){clearInterval(timerRef.current);return 0}return t-1}),1000)
            }
          }
          if(s.current_question===0) setCurQ(null)
          if(s.phase==="lab"){
            const {data:sub}=await sb.from("word_lab_submissions").insert({
              session_id:s.id,student_name:studentName,score:0,max_score:TASK.maxScore,completed_tasks:[]
            }).select().single()
            if(sub) setSubId(sub.id)
          }
        })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"lulu_discussions",filter:`session_id=eq.${init.id}`},
        ({new:d})=>{
          if(d.is_active){ setActiveDis(d) }
          else { setActiveDis(p=>p?.id===d.id?null:p) }
        })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"lulu_posts",filter:`session_id=eq.${init.id}`},
        ({new:p})=>setPosts(prev=>[...prev,p]))
      .subscribe()
    return()=>{sb.removeChannel(ch);clearInterval(timerRef.current)}
  },[init.id])

  useEffect(()=>{ if(sess.phase==="lab"&&editorRef.current) editorRef.current.innerHTML=TASK.rawHtml },[sess.phase])

  useEffect(()=>{
    if(sess.phase!=="lab"||submitted) return
    const t=setInterval(()=>setLabTime(v=>{if(v<=1){clearInterval(t);handleSubmit();return 0}return v-1}),1000)
    return()=>clearInterval(t)
  },[sess.phase,submitted])

  useEffect(()=>{
    if(sess.phase!=="lab"||!subId||submitted) return
    const t=setInterval(()=>save(),3000)
    return()=>clearInterval(t)
  },[sess.phase,subId,submitted,done])

  async function chooseGroup(gid){
    await sb.from("word_lab_checkins").update({group_id:gid})
      .eq("session_id",init.id).eq("student_name",studentName)
    setMyGroupId(gid)
  }

  async function answerQ(q,idx){
    if(answered[q.id]!==undefined||qTimer===0) return
    const ok=idx===q.correct_index
    await sb.from("word_lab_answers").upsert({
      session_id:init.id,question_id:q.id,student_name:studentName,
      answer_index:idx,is_correct:ok,points_earned:ok?q.points:0
    },{onConflict:"question_id,student_name"})
    setAnswered(p=>({...p,[q.id]:idx}))
    setQuizPts(p=>p+(ok?q.points:0))
    setFlash(ok?"correct":"wrong")
    setTimeout(()=>setFlash(null),1200)
  }

  async function submitPost(){
    if(!postText.trim()||posted[activeDis?.id]) return
    await sb.from("lulu_posts").insert({
      session_id:init.id,discussion_id:activeDis.id,
      student_name:studentName,group_id:myGroupId,content:postText.trim()
    })
    setPosted(p=>({...p,[activeDis.id]:true}))
    setPostText("")
  }

  const saveSel=()=>{const s=window.getSelection();if(s&&s.rangeCount>0)savedSel.current=s.getRangeAt(0).cloneRange()}
  const restSel=()=>{if(!savedSel.current)return;const s=window.getSelection();s.removeAllRanges();s.addRange(savedSel.current)}
  const exec=(cmd,val=null)=>{editorRef.current?.focus();restSel();document.execCommand(cmd,false,val);checkReqs()}

  function checkReqs(){
    if(!editorRef.current) return
    const el=editorRef.current,nd=new Set()
    if(el.querySelector("h1")) nd.add("h1")
    if(el.querySelectorAll("h2").length>=3) nd.add("h2x3")
    if(el.querySelector("table")) nd.add("table")
    if(el.querySelectorAll("b,strong,[style*='font-weight: bold'],[style*='font-weight:bold']").length>=2) nd.add("bold")
    if(Array.from(el.querySelectorAll("h2")).some(h=>h.style.color||h.querySelector("[style*='color']"))) nd.add("color")
    setDone(nd)
  }

  async function save(){
    if(!subId) return
    const score=TASK.reqs.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)
    await sb.from("word_lab_submissions").update({
      score,completed_tasks:[...done],
      html_content:editorRef.current?.innerHTML||"",
      last_active:new Date().toISOString()
    }).eq("id",subId)
  }

  async function handleSubmit(){
    if(submitted) return
    await save()
    const score=TASK.reqs.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)
    await sb.from("word_lab_submissions").update({submitted:true,score}).eq("id",subId)
    setFinalScore(score);setSubmitted(true)
  }

  function insertTable(){
    editorRef.current?.focus();restSel()
    let h="<table border='1' style='border-collapse:collapse;width:100%;margin:12px 0'>"
    for(let r=0;r<tRows;r++){h+="<tr>";for(let c=0;c<tCols;c++) h+=`<td style='padding:8px 12px;border:1px solid #ccc'>${r===0?["商品","单价","数量","备注"][c]||"列"+(c+1):"&nbsp;"}</td>`;h+="</tr>"}
    h+="</table>"
    document.execCommand("insertHTML",false,h)
    setShowTable(false);checkReqs()
  }

  const myGroup=groups.find(g=>g.id===myGroupId)
  const score=TASK.reqs.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)

  // Checkin screen
  if(!checkedIn||sess.phase==="checkin"){
    return(
      <div style={{minHeight:"100vh",background:"#f8fafc",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",fontFamily:F,gap:20,padding:24}}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <div style={{fontSize:28,fontWeight:900}}>{studentName}</div>
        {myGroupId?(
          <>
            <div style={{fontSize:32}}>✅</div>
            <div style={{fontSize:16,fontWeight:700,color:myGroup?.color||C.accent}}>已加入 {myGroup?.name}</div>
            <div style={{fontSize:13,color:C.muted}}>等待老师开始…</div>
            <div style={{marginTop:8,fontSize:12,color:C.muted}}>想换组？点击下方重新选择</div>
          </>
        ):(
          <div style={{fontSize:15,color:C.muted}}>选择你的小组 ↓</div>
        )}
        <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
          {groups.map(g=>(
            <button key={g.id} onClick={()=>chooseGroup(g.id)} style={{
              padding:"16px 30px",borderRadius:14,
              border:`2px solid ${g.id===myGroupId?g.color:C.border}`,
              background:g.id===myGroupId?`${g.color}20`:"transparent",
              color:g.id===myGroupId?g.color:C.muted,cursor:"pointer",
              fontSize:16,fontWeight:700,fontFamily:F,transition:"all .2s"
            }}>{g.name}</button>
          ))}
        </div>
        <div style={{width:10,height:10,borderRadius:"50%",background:"#2563eb",marginTop:8,
          animation:"pulse 1.5s infinite"}}/>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(2)}}`}</style>
      </div>
    )
  }

  // Quiz screen
  if(sess.phase==="quiz"){
    const myAns=curQ?answered[curQ.id]:undefined
    return(
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",fontFamily:F,padding:20}}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        {flash&&(
          <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:80,pointerEvents:"none",
            background:flash==="correct"?"rgba(37,99,235,.15)":"rgba(220,38,38,.12)",
            animation:"fout .9s forwards"}}>
            {flash==="correct"?"✓":"✗"}
          </div>
        )}
        <style>{`@keyframes fout{from{opacity:1}to{opacity:0}}`}</style>
        <div style={{width:"100%",maxWidth:460}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div>
              <div style={{fontSize:12,color:C.muted}}>
                {studentName} {myGroup&&<span style={{color:myGroup.color}}>· {myGroup.name}</span>}
              </div>
              <div style={{fontSize:24,fontWeight:900,color:C.accent,fontFamily:FM}}>{quizPts} 分</div>
            </div>
            <div style={{fontSize:11,color:C.muted,background:"rgba(0,0,0,.04)",
              padding:"4px 10px",borderRadius:6}}>抢答热身</div>
          </div>
          {!curQ?(
            <Card style={{textAlign:"center",padding:48}}>
              <div style={{fontSize:40,marginBottom:12}}>🎯</div>
              <div style={{color:C.muted}}>等待老师推送题目…</div>
            </Card>
          ):(
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                <span style={{fontSize:12,color:C.muted,fontFamily:FM}}>Q{curQ.seq} · {curQ.points}分</span>
                <span style={{fontSize:40,fontWeight:900,color:qTimer<=5?C.red:C.accent,fontFamily:FM}}>{qTimer}</span>
              </div>
              <div style={{fontSize:16,lineHeight:1.75,marginBottom:20}}>{curQ.question}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {curQ.options.map((opt,j)=>{
                  const sel=myAns===j,rev=myAns!==undefined,ok=j===curQ.correct_index
                  let bg="rgba(0,0,0,.03)",brd=C.border,col=C.muted
                  if(sel&&rev){bg=ok?"rgba(37,99,235,.12)":"rgba(220,38,38,.1)";brd=ok?C.accent:C.red;col=ok?C.accent:C.red}
                  else if(!sel&&rev&&ok){brd=C.accent;col=C.accent}
                  return(
                    <button key={j} onClick={()=>answerQ(curQ,j)} style={{
                      padding:"15px 12px",borderRadius:12,border:`2px solid ${brd}`,background:bg,
                      color,fontSize:14,fontWeight:700,cursor:myAns!==undefined?"default":"pointer",
                      fontFamily:F,textAlign:"left",transition:"all .2s"
                    }}>
                      <span style={{color:"rgba(0,0,0,.12)",marginRight:8,fontFamily:FM}}>{"ABCD"[j]}</span>{opt}
                    </button>
                  )
                })}
              </div>
              {myAns!==undefined&&(
                <div style={{marginTop:14,textAlign:"center",fontSize:14,fontWeight:700,
                  color:myAns===curQ.correct_index?C.accent:C.red}}>
                  {myAns===curQ.correct_index?`答对！+${curQ.points}分`:"答错了，下题加油"}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Discussion screen
  if(sess.phase==="discussion"){
    return(
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,padding:20,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <div style={{width:"100%",maxWidth:480}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{studentName}</div>
            {myGroup&&<span style={{fontSize:12,color:myGroup.color,background:`${myGroup.color}18`,
              padding:"3px 10px",borderRadius:6,fontWeight:700}}>{myGroup.name}</span>}
          </div>
          {!activeDis?(
            <Card style={{textAlign:"center",padding:48}}>
              <div style={{fontSize:36,marginBottom:12}}>💬</div>
              <div style={{color:C.muted}}>等待老师开启讨论议题…</div>
            </Card>
          ):(
            <>
              <Card style={{marginBottom:16,border:`1px solid ${C.purple}55`,background:"rgba(124,58,237,.06)"}}>
                <div style={{fontSize:12,color:C.purple,marginBottom:6,fontWeight:700}}>💬 本轮议题</div>
                <div style={{fontSize:15,lineHeight:1.75}}>{activeDis.topic}</div>
              </Card>
              {!posted[activeDis.id]?(
                <Card style={{marginBottom:16}}>
                  <textarea value={postText} onChange={e=>setPostText(e.target.value.slice(0,80))}
                    placeholder="写下你的想法…（最多 80 字）" rows={3}
                    style={{...inp({resize:"none",lineHeight:1.7,marginBottom:10}),width:"100%",boxSizing:"border-box"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:C.muted}}>{postText.length}/80</span>
                    <Btn small onClick={submitPost} color={C.purple} disabled={!postText.trim()}>发送</Btn>
                  </div>
                </Card>
              ):(
                <Card style={{marginBottom:16,border:`1px solid ${C.accent}44`,textAlign:"center"}}>
                  <div style={{fontSize:14,color:C.accent,fontWeight:700}}>✓ 发言成功</div>
                </Card>
              )}
              <div style={{display:"grid",gap:8}}>
                {posts.filter(p=>p.student_name!==studentName).slice(-6).map(p=>{
                  const g=groups.find(x=>x.id===p.group_id)
                  return(
                    <div key={p.id} style={{padding:"10px 14px",borderRadius:10,
                      background:"rgba(0,0,0,.02)",border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:11,color:g?.color||C.muted,marginBottom:4,fontWeight:700}}>
                        {p.student_name}{g?` · ${g.name}`:""}
                      </div>
                      <div style={{fontSize:13,lineHeight:1.6,color:C.text}}>{p.content}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Lab screen
  if(sess.phase==="lab"){
    const toolBtn=(label,action,extra={})=>(
      <button onMouseDown={e=>{e.preventDefault();saveSel();action()}} style={{
        padding:"6px 11px",borderRadius:7,border:`1px solid ${C.border}`,
        background:"rgba(0,0,0,.04)",color:C.text,fontSize:12,cursor:"pointer",fontFamily:F,...extra
      }}>{label}</button>
    )
    return(
      <div style={{height:"100vh",background:C.bg,fontFamily:F,color:C.text,
        display:"grid",gridTemplateRows:"auto 1fr",overflow:"hidden"}}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",
          background:C.panel,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <span style={{fontSize:14,fontWeight:900,color:C.accent,fontFamily:FM,minWidth:54}}>{fmtTime(labTime)}</span>
          {myGroup&&<span style={{fontSize:11,color:myGroup.color,fontWeight:700}}>▪ {myGroup.name}</span>}
          {toolBtn("H1",()=>exec("formatBlock","h1"),{color:C.gold})}
          {toolBtn("H2",()=>exec("formatBlock","h2"))}
          {toolBtn("加粗",()=>exec("bold"),{fontWeight:700})}
          {toolBtn("颜色",()=>setShowColor(p=>!p))}
          {toolBtn("表格",()=>setShowTable(p=>!p))}
          {showColor&&(
            <div style={{display:"flex",gap:5,background:C.panel2,padding:5,borderRadius:7,border:`1px solid ${C.border}`}}>
              {[C.gold,C.red,C.blue,C.accent,C.purple,"#ff9f43"].map(col=>(
                <div key={col} onClick={()=>{exec("foreColor",col);setShowColor(false)}} style={{
                  width:22,height:22,borderRadius:5,background:col,cursor:"pointer"}}/>
              ))}
            </div>
          )}
          {showTable&&(
            <div style={{display:"flex",gap:6,alignItems:"center",background:C.panel2,
              padding:"5px 10px",borderRadius:7,border:`1px solid ${C.border}`}}>
              <input type="number" value={tRows} onChange={e=>setTRows(Number(e.target.value))} min={2} max={8}
                style={{width:36,...inp({padding:"3px 6px",fontSize:12})}}/>
              <span style={{fontSize:11,color:C.muted}}>行×</span>
              <input type="number" value={tCols} onChange={e=>setTCols(Number(e.target.value))} min={2} max={6}
                style={{width:36,...inp({padding:"3px 6px",fontSize:12})}}/>
              <span style={{fontSize:11,color:C.muted}}>列</span>
              <Btn small onClick={insertTable} color={C.accent}>插入</Btn>
            </div>
          )}
          <div style={{flex:1}}/>
          <span style={{fontSize:13,color:C.accent,fontWeight:700,fontFamily:FM}}>{score}/{TASK.maxScore}</span>
          {!submitted&&<Btn small onClick={handleSubmit} color={C.accent}>提交</Btn>}
          {submitted&&<span style={{fontSize:12,color:C.accent,fontWeight:700}}>✓ 已提交</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"185px 1fr",overflow:"hidden"}}>
          <div style={{background:C.panel,borderRight:`1px solid ${C.border}`,padding:14,overflowY:"auto"}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:12,letterSpacing:1}}>任务清单</div>
            {TASK.reqs.map(r=>(
              <div key={r.id} style={{marginBottom:12,display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{color:done.has(r.id)?C.accent:"rgba(0,0,0,.08)",fontSize:15,marginTop:1}}>
                  {done.has(r.id)?"✓":"○"}
                </span>
                <div>
                  <div style={{fontSize:11,color:done.has(r.id)?C.text:C.muted,lineHeight:1.5}}>{r.desc}</div>
                  <div style={{fontSize:11,color:done.has(r.id)?C.accent:"rgba(0,0,0,.08)",fontWeight:700}}>+{r.pts}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"#e8edf4",overflowY:"auto",padding:20}}>
            <div style={{maxWidth:660,margin:"0 auto",background:"white",padding:"40px 48px",
              borderRadius:3,boxShadow:"0 4px 24px rgba(0,0,0,.12)"}}>
              <div ref={editorRef} contentEditable={!submitted} onInput={checkReqs}
                onKeyUp={checkReqs} onMouseUp={saveSel} onKeyDown={saveSel}
                style={{minHeight:380,color:"#1a1a1a",fontSize:14,lineHeight:1.9,
                  outline:"none",fontFamily:"Georgia,serif"}}/>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Finished
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:F,gap:16,padding:24}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{fontSize:40}}>🏅</div>
      <div style={{fontSize:28,fontWeight:900}}>{studentName}</div>
      {myGroup&&<div style={{fontSize:14,color:myGroup.color,fontWeight:700}}>{myGroup.name}</div>}
      <div style={{display:"flex",gap:14,marginTop:8}}>
        <Card style={{textAlign:"center",padding:"18px 28px"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>抢答</div>
          <div style={{fontSize:32,fontWeight:900,color:C.blue,fontFamily:FM}}>{quizPts}</div>
        </Card>
        <Card style={{textAlign:"center",padding:"18px 28px"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>排版</div>
          <div style={{fontSize:32,fontWeight:900,color:C.accent,fontFamily:FM}}>{finalScore||score}</div>
        </Card>
        <Card style={{textAlign:"center",padding:"18px 28px"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>总分</div>
          <div style={{fontSize:32,fontWeight:900,color:C.gold,fontFamily:FM}}>{quizPts+(finalScore||score)}</div>
        </Card>
      </div>
    </div>
  )
}

// ── TEACHER LOGIN ────────────────────────────────────────────
const DEFAULT_PW = "lulu2025"

function TLogin({onSuccess,onBack}){
  const [pw,setPw]=useState("")
  const [err,setErr]=useState("")
  const [loading,setLoading]=useState(false)

  async function login(){
    if(!pw.trim()) return
    setLoading(true); setErr("")
    let correctPw = DEFAULT_PW
    try {
      const {data}=await sb.from("lulu_settings").select("teacher_password").eq("id",1).single()
      if(data?.teacher_password) correctPw = data.teacher_password
    } catch(_){}
    if(pw===correctPw){ onSuccess() }
    else { setErr("密码错误，请重试"); setLoading(false) }
  }

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:F,padding:24}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <Card style={{width:"100%",maxWidth:320}}>
        <div style={{fontSize:20,fontWeight:900,marginBottom:4}}>教师端登录</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:24}}>请输入教师密码</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:7}}>密码</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&login()}
          placeholder="输入密码" style={{...inp({marginBottom:err?8:20})}}/>
        {err&&<div style={{fontSize:12,color:C.red,marginBottom:14}}>{err}</div>}
        <div style={{display:"flex",gap:10}}>
          <Btn full onClick={login} disabled={loading||!pw.trim()}>{loading?"验证中…":"进入教师后台"}</Btn>
        </div>
        <button onClick={onBack} style={{marginTop:14,background:"none",border:"none",
          color:C.muted,fontSize:12,cursor:"pointer",fontFamily:F,display:"block",width:"100%",textAlign:"center"}}>
          ← 返回首页
        </button>
      </Card>
    </div>
  )
}

// ── TEACHER BACKEND (tabbed: new / history / settings) ────────
function TBackend(){
  const [tab,setTab]=useState("new")
  const [sess,setSess]=useState(null)
  const [inDash,setInDash]=useState(false)

  if(inDash&&sess) return <TDash session={sess} onBack={()=>{setInDash(false);setSess(null)}}/>

  const tabBtn=(t,label,col=C.accent)=>(
    <button onClick={()=>setTab(t)} style={{padding:"9px 22px",borderRadius:8,border:"none",
      cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
      background:tab===t?col:"transparent",color:tab===t?"#ffffff":C.muted}}>
      {label}
    </button>
  )

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:16,padding:"14px 28px",
        background:C.panel,borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:20,fontWeight:900}}>录录 <span style={{color:C.accent}}>教师后台</span></div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:4,background:"#f0f4f8",padding:4,borderRadius:10,border:"1px solid #dde3ec"}}>
          {tabBtn("new","新建课堂",C.accent)}
          {tabBtn("history","历史课堂",C.blue)}
          {tabBtn("settings","设置",C.muted)}
        </div>
      </div>

      {tab==="new"&&(
        <TSetup onCreate={s=>{setSess(s);setInDash(true)}}/>
      )}
      {tab==="history"&&(
        <THistory onResume={s=>{setSess(s);setInDash(true)}}/>
      )}
      {tab==="settings"&&(
        <TSettings/>
      )}
    </div>
  )
}

// ── TEACHER HISTORY ──────────────────────────────────────────
function THistory({onResume}){
  const [sessions,setSessions]=useState([])
  const [loading,setLoading]=useState(true)
  const [expanded,setExpanded]=useState(null)
  const [detail,setDetail]=useState({})

  useEffect(()=>{
    loadSessions()
  },[])

  async function loadSessions(){
    setLoading(true)
    const {data}=await sb.from("word_lab_sessions").select().order("started_at",{ascending:false}).limit(50)
    if(data) setSessions(data)
    setLoading(false)
  }

  async function loadDetail(sid){
    if(detail[sid]) return
    const [{data:checkins},{data:subs},{data:answers},{data:groups}]=await Promise.all([
      sb.from("word_lab_checkins").select("student_name,group_id").eq("session_id",sid),
      sb.from("word_lab_submissions").select("student_name,score,submitted").eq("session_id",sid),
      sb.from("word_lab_answers").select("student_name,points_earned").eq("session_id",sid),
      sb.from("lulu_groups").select("id,name,color").eq("session_id",sid),
    ])
    const quizScores={}
    ;(answers||[]).forEach(a=>{quizScores[a.student_name]=(quizScores[a.student_name]||0)+a.points_earned})
    const labScores={}
    ;(subs||[]).forEach(s=>{labScores[s.student_name]=s.score})
    const students=[...new Set((checkins||[]).map(c=>c.student_name))].map(name=>({
      name,
      group_id:(checkins||[]).find(c=>c.student_name===name)?.group_id,
      quiz:quizScores[name]||0,
      lab:labScores[name]||0,
      total:(quizScores[name]||0)+(labScores[name]||0)
    })).sort((a,b)=>b.total-a.total)
    setDetail(p=>({...p,[sid]:{students,groups:groups||[]}}))
  }

  async function deleteSession(sid,e){
    e.stopPropagation()
    if(!confirm("确定删除这场课堂记录？此操作不可恢复。")) return
    await sb.from("word_lab_sessions").delete().eq("id",sid)
    setSessions(p=>p.filter(s=>s.id!==sid))
    if(expanded===sid) setExpanded(null)
  }

  function toggle(sid){
    if(expanded===sid){ setExpanded(null); return }
    setExpanded(sid)
    loadDetail(sid)
  }

  const phaseColor={checkin:C.blue,quiz:C.gold,discussion:C.purple,lab:C.accent,finished:"rgba(0,0,0,.22)"}
  const phaseLabel={checkin:"签到中",quiz:"抢答中",discussion:"讨论中",lab:"排版中",finished:"已结束"}

  if(loading) return(
    <div style={{padding:40,textAlign:"center",color:C.muted}}>加载中…</div>
  )

  return(
    <div style={{padding:28,maxWidth:900}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700}}>历史课堂</div>
          <div style={{fontSize:13,color:C.muted,marginTop:2}}>共 {sessions.length} 场课堂记录</div>
        </div>
        <Btn small onClick={loadSessions} style={{background:"rgba(255,255,255,.07)",color:C.text}}>刷新</Btn>
      </div>

      {!sessions.length&&(
        <Card style={{textAlign:"center",padding:48,color:C.muted}}>暂无历史记录</Card>
      )}

      {sessions.map(s=>{
        const d=detail[s.id]
        const isOpen=expanded===s.id
        const phase=s.phase||"checkin"
        return(
          <Card key={s.id} style={{marginBottom:12,padding:0,overflow:"hidden",
            border:isOpen?`1px solid ${C.accent}44`:undefined}}>
            {/* Row */}
            <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",cursor:"pointer"}}
              onClick={()=>toggle(s.id)}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700}}>{s.title}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:3,fontFamily:FM}}>
                  房间码 <span style={{color:C.accent,fontWeight:700}}>{s.code}</span>
                  <span style={{marginLeft:12}}>{s.started_at?new Date(s.started_at).toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"—"}</span>
                </div>
              </div>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:6,fontWeight:700,
                background:`${phaseColor[phase]||C.muted}18`,color:phaseColor[phase]||C.muted}}>
                {phaseLabel[phase]||phase}
              </span>
              {phase!=="finished"&&(
                <Btn small onClick={e=>{e.stopPropagation();onResume(s)}} color={C.accent}>进入课堂</Btn>
              )}
              <button onClick={e=>deleteSession(s.id,e)} style={{background:"none",border:"none",
                color:"rgba(255,100,100,.5)",cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 4px"}}
                title="删除">✕</button>
              <span style={{color:C.muted,fontSize:13}}>{isOpen?"▲":"▼"}</span>
            </div>

            {/* Expanded detail */}
            {isOpen&&(
              <div style={{borderTop:`1px solid ${C.border}`,padding:"16px 18px",background:"rgba(0,0,0,.01)"}}>
                {!d?(
                  <div style={{color:C.muted,fontSize:13}}>加载中…</div>
                ):(
                  <>
                    {/* Group summary */}
                    {d.groups.length>0&&(
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                        {d.groups.map(g=>{
                          const members=d.students.filter(st=>st.group_id===g.id)
                          const avg=members.length?Math.round(members.reduce((s,m)=>s+m.total,0)/members.length):0
                          return(
                            <div key={g.id} style={{padding:"8px 14px",borderRadius:9,
                              background:`${g.color}15`,border:`1px solid ${g.color}44`}}>
                              <div style={{fontSize:12,color:g.color,fontWeight:700}}>{g.name}</div>
                              <div style={{fontSize:11,color:C.muted}}>{members.length}人 · 均分{avg}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {/* Student table */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
                      {d.students.map((st,i)=>{
                        const g=d.groups.find(x=>x.id===st.group_id)
                        return(
                          <div key={st.name} style={{padding:"8px 12px",borderRadius:9,
                            background:"rgba(0,0,0,.02)",border:`1px solid ${C.border}`,
                            borderLeft:`3px solid ${g?.color||C.border}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div>
                                <span style={{fontSize:12,color:C.muted,marginRight:6,fontFamily:FM}}>{i+1}</span>
                                <span style={{fontSize:13,fontWeight:700}}>{st.name}</span>
                              </div>
                              <span style={{fontSize:15,fontWeight:900,color:C.accent,fontFamily:FM}}>{st.total}</span>
                            </div>
                            <div style={{fontSize:11,color:C.muted,marginTop:3}}>
                              抢答{st.quiz} · 排版{st.lab}
                            </div>
                          </div>
                        )
                      })}
                      {!d.students.length&&<div style={{fontSize:13,color:C.muted,gridColumn:"1/-1"}}>本场无参与学生记录</div>}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── TEACHER SETTINGS ─────────────────────────────────────────
function TSettings(){
  const [oldPw,setOldPw]=useState("")
  const [newPw,setNewPw]=useState("")
  const [newPw2,setNewPw2]=useState("")
  const [schoolName,setSchoolName]=useState("")
  const [msg,setMsg]=useState({text:"",ok:true})
  const [loading,setLoading]=useState(false)
  const [infoLoaded,setInfoLoaded]=useState(false)

  useEffect(()=>{
    sb.from("lulu_settings").select("school_name").eq("id",1).single()
      .then(({data})=>{ if(data){setSchoolName(data.school_name);setInfoLoaded(true)} })
  },[])

  async function changePw(){
    if(!oldPw||!newPw||!newPw2){setMsg({text:"请填写所有字段",ok:false});return}
    if(newPw!==newPw2){setMsg({text:"两次新密码不一致",ok:false});return}
    if(newPw.length<4){setMsg({text:"新密码至少 4 位",ok:false});return}
    setLoading(true)
    let curPw = DEFAULT_PW
    try {
      const {data}=await sb.from("lulu_settings").select("teacher_password").eq("id",1).single()
      if(data?.teacher_password) curPw = data.teacher_password
    } catch(_){}
    if(oldPw!==curPw){setMsg({text:"旧密码错误",ok:false});setLoading(false);return}
    await sb.from("lulu_settings").update({teacher_password:newPw}).eq("id",1)
    setMsg({text:"密码已更新",ok:true})
    setOldPw("");setNewPw("");setNewPw2("")
    setLoading(false)
  }

  async function saveSchoolName(){
    if(!schoolName.trim()) return
    await sb.from("lulu_settings").update({school_name:schoolName}).eq("id",1)
    setMsg({text:"已保存",ok:true})
  }

  return(
    <div style={{padding:28,maxWidth:500}}>
      <Card style={{marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>课堂信息</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:7}}>学校 / 课堂名称</div>
        <div style={{display:"flex",gap:10}}>
          <input value={schoolName} onChange={e=>setSchoolName(e.target.value)}
            style={{...inp(),flex:1}}/>
          <Btn small onClick={saveSchoolName}>保存</Btn>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>修改教师密码</div>
        {[["旧密码",oldPw,setOldPw],["新密码",newPw,setNewPw],["确认新密码",newPw2,setNewPw2]].map(([label,val,setter])=>(
          <div key={label} style={{marginBottom:14}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:7}}>{label}</div>
            <input type="password" value={val} onChange={e=>setter(e.target.value)} style={inp()}/>
          </div>
        ))}
        {msg.text&&(
          <div style={{fontSize:13,color:msg.ok?C.accent:C.red,marginBottom:12}}>{msg.text}</div>
        )}
        <Btn onClick={changePw} disabled={loading}>{loading?"保存中…":"更新密码"}</Btn>
        <div style={{marginTop:16,padding:"12px 14px",borderRadius:9,background:"rgba(0,0,0,.02)",
          border:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>
          默认密码：<span style={{color:C.text,fontFamily:FM}}>lulu2025</span>
          <br/>建议首次登录后立即修改
        </div>
      </Card>
    </div>
  )
}

// ── ROOT ─────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState("home")
  const [sess,setSess]=useState(null)
  const [name,setName]=useState("")
  const [tAuthed,setTAuthed]=useState(false)

  if(screen==="home")     return <Home onTeacher={()=>setScreen("t-login")} onStudent={()=>setScreen("s-join")}/>
  if(screen==="t-login")  return <TLogin onSuccess={()=>{setTAuthed(true);setScreen("t-backend")}} onBack={()=>setScreen("home")}/>
  if(screen==="t-backend"&&tAuthed) return <TBackend/>
  if(screen==="s-join")   return <SJoin onJoin={(s,n)=>{setSess(s);setName(n);setScreen("s-main")}}/>
  if(screen==="s-main")   return <SMain session={sess} studentName={name}/>
  return null
}
