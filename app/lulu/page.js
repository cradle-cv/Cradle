'use client'

import React, { useState, useEffect, useRef, Component } from "react"
import { createClient } from "@supabase/supabase-js"

class ErrorBoundary extends Component {
  constructor(p){ super(p); this.state={err:null,info:null} }
  static getDerivedStateFromError(err){ return {err} }
  componentDidCatch(err,info){ this.setState({err,info}) }
  render(){
    if(this.state.err) return(
      <div style={{padding:32,fontFamily:"monospace",background:"#fff",minHeight:"100vh",color:"#111"}}>
        <h2 style={{color:"#dc2626",marginBottom:16}}>⚠️ 页面错误（请截图发给开发者）</h2>
        <pre style={{background:"#f5f5f5",padding:16,borderRadius:8,whiteSpace:"pre-wrap",
          wordBreak:"break-all",fontSize:12,marginBottom:16}}>
          {this.state.err.toString()}{"\n\n"}{this.state.err.stack}
        </pre>
        <button onClick={()=>window.location.reload()}
          style={{padding:"10px 24px",background:"#2563eb",color:"white",border:"none",
          borderRadius:8,cursor:"pointer",fontSize:14}}>刷新页面</button>
      </div>
    )
    return this.props.children
  }
}

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

// ── Fallback task (used when no layout_task_id in session) ───
const TASK={
  maxScore:100,timeLimit:600,
  rawHtml:`<p>春季电商大促 — 精选商品推荐</p>
<p>欢迎来到本季最受期待的电商大促活动！以下商品均为限时特惠，数量有限，先到先得。</p>
<p>潮流服饰</p>
<p>本季主打简约风格与高性价比，适合日常通勤与休闲出行。</p>
<p>数码电器</p>
<p>全系旗舰产品降价幅度最高达 30%，含保修与正品认证。</p>
<p>美妆护肤</p>
<p>精选国际大牌与国货新星，买二送一，直播间专属优惠码 PROMO2025。</p>
<p>活动有效期至月底，请尽快下单。</p>`,
  targetHtml:`<h1 style="font-size:22px;font-weight:900;color:#111827;line-height:1.3;margin:0 0 10px;font-family:Georgia,serif;">春季电商大促 — 精选商品推荐</h1>
<p style="margin:0 0 12px;color:#374151;font-family:Georgia,serif;">欢迎来到本季最受期待的电商大促活动！以下商品均为<strong>限时特惠</strong>，数量有限，先到先得。</p>
<h2 style="font-size:17px;font-weight:800;margin:20px 0 6px;color:#2563eb;font-family:Georgia,serif;">潮流服饰</h2>
<p style="margin:0 0 12px;color:#374151;font-family:Georgia,serif;">本季主打简约风格与高性价比，适合日常通勤与休闲出行。</p>
<h2 style="font-size:17px;font-weight:800;margin:20px 0 6px;color:#dc2626;font-family:Georgia,serif;">数码电器</h2>
<p style="margin:0 0 12px;color:#374151;font-family:Georgia,serif;">全系旗舰产品<strong>降价幅度最高达 30%</strong>，含保修与正品认证。</p>
<h2 style="font-size:17px;font-weight:800;margin:20px 0 6px;color:#059669;font-family:Georgia,serif;">美妆护肤</h2>
<p style="margin:0 0 12px;color:#374151;font-family:Georgia,serif;">精选国际大牌与国货新星，<strong>买二送一</strong>，直播间专属优惠码 PROMO2025。</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;font-family:Georgia,serif;"><tr style="background:#f0f4f8"><th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:left;font-weight:700">商品</th><th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:left;font-weight:700">单价</th><th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:left;font-weight:700">折扣价</th><th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:left;font-weight:700">备注</th></tr><tr><td style="border:1px solid #cbd5e1;padding:8px 12px">休闲上衣</td><td style="border:1px solid #cbd5e1;padding:8px 12px">199</td><td style="border:1px solid #cbd5e1;padding:8px 12px">149</td><td style="border:1px solid #cbd5e1;padding:8px 12px">限量200件</td></tr><tr style="background:#f8fafc"><td style="border:1px solid #cbd5e1;padding:8px 12px">无线耳机</td><td style="border:1px solid #cbd5e1;padding:8px 12px">399</td><td style="border:1px solid #cbd5e1;padding:8px 12px">279</td><td style="border:1px solid #cbd5e1;padding:8px 12px">赠品耳机包</td></tr><tr><td style="border:1px solid #cbd5e1;padding:8px 12px">护肤套装</td><td style="border:1px solid #cbd5e1;padding:8px 12px">580</td><td style="border:1px solid #cbd5e1;padding:8px 12px">399</td><td style="border:1px solid #cbd5e1;padding:8px 12px">买二送一</td></tr></table>
<p style="margin:0;color:#777;font-size:12px;font-family:Georgia,serif;">活动有效期至月底，请尽快下单。</p>`,
  reqs:[
    {id:"h1",type:"h1",pts:20,desc:"将大标题设为 H1 样式"},
    {id:"h2",type:"h2",min:3,pts:20,desc:"将三个分类名设为 H2（≥3 个）"},
    {id:"table",type:"table",min_rows:3,min_cols:2,pts:20,desc:"插入 ≥3行×2列 价格对比表格"},
    {id:"bold",type:"bold",min:2,pts:20,desc:"促销词加粗（≥2 处）"},
    {id:"color_h2",type:"color_h2",min:3,pts:20,desc:"为三个 H2 标题各添加文字颜色"},
  ]
}

// ── Generic rule evaluator (replaces hardcoded checkReqs) ────
function evalRules(el, rules){
  const done=new Set()
  if(!el||!rules) return done
  rules.forEach(rule=>{
    switch(rule.type){
      case "h1":
        if(el.querySelector("h1")) done.add(rule.id)
        break
      case "h2_count":
        if(el.querySelectorAll("h2").length>=(rule.count||1)) done.add(rule.id)
        break
      case "table":{
        const t=el.querySelector("table")
        if(!t) break
        const rows=t.querySelectorAll("tr").length
        const cols=t.querySelector("tr")?.querySelectorAll("td,th").length||0
        if(rows>=(rule.rows||1)&&cols>=(rule.cols||1)) done.add(rule.id)
        break
      }
      case "bold":
        if(el.querySelectorAll("b,strong,[style*='font-weight: bold'],[style*='font-weight:bold'],[style*='font-weight: 700'],[style*='font-weight:700']").length>=(rule.count||1)) done.add(rule.id)
        break
      case "color_h2":{
        const h2s=Array.from(el.querySelectorAll("h2"))
        const colored=h2s.filter(h=>hasColorApplied(h))
        if(colored.length>=(rule.count||rule.min||1)) done.add(rule.id)
        break
      }
      case "align_center":
        if(el.querySelectorAll("[style*='text-align: center'],[style*='text-align:center'],center").length>=(rule.count||1)) done.add(rule.id)
        break
    }
  })
  return done
}

// Fallback task (used if DB load fails)


// Rule type definitions (for the editor UI)
const RULE_TYPES=[
  {type:"h1",      label:"H1 大标题",    params:[],                          defaultDesc:"将大标题设为 H1 样式"},
  {type:"h2_count",label:"H2 小标题数量",params:[{key:"count",label:"最少数量",default:3}],defaultDesc:"将 {count} 个小标题设为 H2"},
  {type:"table",   label:"插入表格",      params:[{key:"rows",label:"最少行数",default:3},{key:"cols",label:"最少列数",default:2}],defaultDesc:"插入 ≥{rows}行×{cols}列 表格"},
  {type:"bold",    label:"文字加粗",      params:[{key:"count",label:"最少处数",default:2}],defaultDesc:"关键词加粗（≥{count} 处）"},
  {type:"color_h2",label:"H2 标题颜色",  params:[{key:"count",label:"最少数量",default:3}],defaultDesc:"为 {count} 个 H2 标题设置颜色"},
  {type:"align_center",label:"居中对齐", params:[{key:"count",label:"最少处数",default:1}],defaultDesc:"至少 {count} 处居中对齐"},
]


// ── DECLARATIVE SCORING ENGINE ────────────────────────────────
const REQ_TYPES = {
  h1:       {label:"H1大标题",    toolbar:"h1",    params:[],                    hint:"选中大标题，点工具栏 H1"},
  h2:       {label:"H2小标题",    toolbar:"h2",    params:[{k:"min",label:"至少几个",default:1}], hint:"选中各小标题，点工具栏 H2"},
  table:    {label:"插入表格",    toolbar:"table", params:[{k:"min_rows",label:"至少几行（含表头）",default:3},{k:"min_cols",label:"至少几列",default:2}], hint:"点工具栏「插入表格」"},
  bold:     {label:"加粗文字",    toolbar:"bold",  params:[{k:"min",label:"至少几处",default:2}],  hint:"选中文字，点工具栏「加粗」"},
  color_h2: {label:"H2标题颜色", toolbar:"color", params:[{k:"min",label:"至少几个H2上色",default:3}], hint:"选中H2内文字，点「文字颜色」选色"},
  align:    {label:"居中对齐",    toolbar:"align", params:[{k:"min",label:"至少几处",default:1}],  hint:"选中文字，点工具栏「居中」"},
  list:        {label:"插入列表",    toolbar:"list",       params:[{k:"type",label:"类型(ul/ol)",default:"ul"}], hint:"点工具栏「无序列表」或「有序列表」"},
  indent_first:{label:"首行缩进",    toolbar:"indent_first",params:[{k:"min",label:"至少几段",default:1}],              hint:"光标置于段落内，点「首行缩进」按钮"},
  line_height: {label:"行距设置",    toolbar:"line_height", params:[{k:"min",label:"至少几处",default:1},{k:"min_value",label:"最小行距(如1.5)",default:1.5}], hint:"光标置于段落，用「行距」下拉菜单设置"},
  space_before:{label:"段前间距",    toolbar:"space_before",params:[{k:"min",label:"至少几段",default:1},{k:"min_px",label:"最小段前距px(如12)",default:12}],    hint:"光标置于段落，用「段前间距」菜单设置"},
  space_after: {label:"段后间距",    toolbar:"space_after", params:[{k:"min",label:"至少几段",default:1},{k:"min_px",label:"最小段后距px(如12)",default:12}],    hint:"光标置于段落，用「段后间距」菜单设置"},
  indent_block:{label:"左右缩进",    toolbar:"indent_block",params:[{k:"min",label:"至少几处",default:1},{k:"min_px",label:"最小缩进px(如24)",default:24}],   hint:"光标置于段落，点「增加缩进」按钮"},
}

// Check if an element specifically has a color applied (not just any style)
function hasColorApplied(h){
  // Direct color on the h2 itself
  if(h.style.color && h.style.color !== "" && h.style.color !== "inherit") return true
  // <font color="..."> child
  if(h.querySelector("font[color]")) return true
  // <span style="color:..."> or similar with actual color value
  for(const el of h.querySelectorAll("[style]")){
    if(el.style.color && el.style.color !== "" && el.style.color !== "inherit") return true
  }
  return false
}

function evalReqs(el, reqs) {
  const nd = new Set()
  for(const r of reqs){
    switch(r.type){
      case "h1":
        if(el.querySelector("h1")) nd.add(r.id)
        break
      case "h2":
        if(el.querySelectorAll("h2").length>=(r.min||1)) nd.add(r.id)
        break
      case "table": {
        const t=el.querySelector("table")
        if(t){
          const rows=t.querySelectorAll("tr").length
          // Use MAX cols across all rows (handles varied row structures)
          let maxCols=0
          t.querySelectorAll("tr").forEach(tr=>{
            const c=tr.querySelectorAll("td,th").length
            if(c>maxCols) maxCols=c
          })
          if(rows>=(r.min_rows||1) && maxCols>=(r.min_cols||1)) nd.add(r.id)
        }
        break
      }
      case "bold": {
        // Count distinct bold regions (not nested bold inside bold)
        const boldEls=el.querySelectorAll("b,strong")
        // Also check spans with explicit font-weight
        const boldSpans=Array.from(el.querySelectorAll("[style]")).filter(e=>{
          const fw=e.style.fontWeight
          return fw==="bold"||fw==="700"||fw==="800"||fw==="900"
        })
        const total=boldEls.length+boldSpans.length
        if(total>=(r.min||1)) nd.add(r.id)
        break
      }
      case "color_h2": {
        // Use specific color check to avoid false positives from bold/other styles
        const colored=Array.from(el.querySelectorAll("h2")).filter(h=>hasColorApplied(h))
        if(colored.length>=(r.min||1)) nd.add(r.id)
        break
      }
      case "align": {
        // Only match actual text-align:center, not other CSS containing "center"
        const aligned=Array.from(el.querySelectorAll("[style],[align]")).filter(e=>{
          return e.style.textAlign==="center"||e.getAttribute("align")==="center"
        })
        if(aligned.length>=(r.min||1)) nd.add(r.id)
        break
      }
      case "list":
        if(el.querySelector("ul,ol")) nd.add(r.id)
        break
      case "indent_first": {
        // Check paragraphs/elements with text-indent set (>=1em or >=16px)
        const indented=Array.from(el.querySelectorAll("[style]")).filter(e=>{
          const ti=e.style.textIndent
          if(!ti||ti==="0px"||ti==="0em"||ti==="0") return false
          const val=parseFloat(ti)
          return !isNaN(val)&&val>0
        })
        if(indented.length>=(r.min||1)) nd.add(r.id)
        break
      }
      case "line_height": {
        const minVal=parseFloat(r.min_value)||1.5
        const lhEls=Array.from(el.querySelectorAll("[style]")).filter(e=>{
          const lh=e.style.lineHeight
          if(!lh) return false
          const val=parseFloat(lh)
          return !isNaN(val)&&val>=minVal
        })
        if(lhEls.length>=(r.min||1)) nd.add(r.id)
        break
      }
      case "space_before": {
        // 段前间距 - margin-top
        const minPx=parseFloat(r.min_px)||12
        const spaced=Array.from(el.querySelectorAll("[style]")).filter(e=>{
          return (parseFloat(e.style.marginTop)||0)>=minPx
        })
        if(spaced.length>=(r.min||1)) nd.add(r.id)
        break
      }
      case "space_after": {
        // 段后间距 - margin-bottom
        const minPx=parseFloat(r.min_px)||12
        const spaced=Array.from(el.querySelectorAll("[style]")).filter(e=>{
          return (parseFloat(e.style.marginBottom)||0)>=minPx
        })
        if(spaced.length>=(r.min||1)) nd.add(r.id)
        break
      }
      case "indent_block": {
        const minPx=parseFloat(r.min_px)||24
        const indented=Array.from(el.querySelectorAll("[style],blockquote")).filter(e=>{
          if(e.nodeName==="BLOCKQUOTE") return true
          const ml=parseFloat(e.style.marginLeft)||0
          return ml>=minPx
        })
        if(indented.length>=(r.min||1)) nd.add(r.id)
        break
      }
    }
  }
  return nd
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
const Card=({children,style={},onClick})=>(
  <div onClick={onClick} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,.07)',cursor:onClick?'pointer':undefined,...style}}>
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
  const [taskLibrary,setTaskLibrary]=useState([])
  const [selectedTaskId,setSelectedTaskId]=useState(null)

  useEffect(()=>{
    sb.from("lulu_layout_tasks").select("id,title,description,scoring_rules,time_limit")
      .order("created_at",{ascending:false})
      .then(({data})=>{
        if(data&&data.length){
          setTaskLibrary(data)
          setSelectedTaskId(data[0].id) // default to first task
          setTimeLab(data[0].time_limit)
        }
      })
  },[])
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
  const [layoutTasks,setLayoutTasks]=useState([])
  const [layoutTaskId,setLayoutTaskId]=useState(null)
  const [excelTasks,setExcelTasks]=useState([])
  const [excelTaskId,setExcelTaskId]=useState(null)
  useEffect(()=>{
    sb.from("lulu_layout_tasks").select("id,title,time_limit").order("created_at",{ascending:false})
      .then(({data})=>{ if(data){setLayoutTasks(data);if(data[0]){setLayoutTaskId(data[0].id);setTimeLab(data[0].time_limit)}} })
    sb.from("lulu_excel_tasks").select("id,title,time_limit").order("created_at",{ascending:false})
      .then(({data})=>{ if(data){setExcelTasks(data);if(data[0]) setExcelTaskId(data[0].id)} })
  },[])

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
      code,title,task_id:"ecommerce_v1",status:"active",layout_task_id:layoutTaskId||null,
      excel_task_id:excelTaskId||null,
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
              <div style={{fontSize:12,color:C.muted,marginBottom:7}}>排版时限（跟随题目）</div>
              <input type="number" value={timeLab} onChange={e=>setTimeLab(Number(e.target.value))} style={inp({color:C.accent})}/>
            </div>
          </div>
          <div style={{marginTop:16}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:8}}>选择排版题目 *</div>
            {layoutTasks.length===0?(
              <div style={{padding:"10px 14px",borderRadius:8,background:"rgba(220,38,38,.06)",
                border:"1px solid rgba(220,38,38,.2)",fontSize:13,color:C.red}}>
                ⚠ 题库为空，请先在「排版题库」标签创建题目
              </div>
            ):(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {layoutTasks.map(t=>(
                  <button key={t.id} onClick={()=>{setLayoutTaskId(t.id);setTimeLab(t.time_limit)}} style={{
                    padding:"9px 18px",borderRadius:9,cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
                    border:`2px solid ${t.id===layoutTaskId?C.gold:C.border}`,
                    background:t.id===layoutTaskId?"rgba(217,119,6,.08)":"transparent",
                    color:t.id===layoutTaskId?C.gold:C.muted
                  }}>{t.title}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{marginTop:14}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:8}}>选择 Excel 表格题目（可选）</div>
            {excelTasks.length===0?(
              <div style={{fontSize:13,color:C.muted}}>题库暂无 Excel 题目，可在「表格题库」标签创建</div>
            ):(
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <button onClick={()=>setExcelTaskId(null)} style={{
                  padding:"8px 16px",borderRadius:9,cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
                  border:`2px solid ${!excelTaskId?C.gold:C.border}`,
                  background:!excelTaskId?"rgba(217,119,6,.08)":"transparent",
                  color:!excelTaskId?C.gold:C.muted
                }}>不使用</button>
                {excelTasks.map(t=>(
                  <button key={t.id} onClick={()=>setExcelTaskId(t.id)} style={{
                    padding:"8px 16px",borderRadius:9,cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
                    border:`2px solid ${t.id===excelTaskId?C.gold:C.border}`,
                    background:t.id===excelTaskId?"rgba(217,119,6,.08)":"transparent",
                    color:t.id===excelTaskId?C.gold:C.muted
                  }}>{t.title}</button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Task picker */}
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>排版竞赛题目</div>
          {!taskLibrary.length&&(
            <div style={{fontSize:13,color:C.muted}}>题目库为空，请先在「题目库」标签中创建题目</div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
            {taskLibrary.map(t=>(
              <div key={t.id} onClick={()=>{setSelectedTaskId(t.id);setTimeLab(t.time_limit)}}
                style={{padding:"12px 14px",borderRadius:10,cursor:"pointer",
                  border:`2px solid ${selectedTaskId===t.id?C.accent:C.border}`,
                  background:selectedTaskId===t.id?"rgba(37,99,235,.06)":"rgba(0,0,0,.02)"}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4,
                  color:selectedTaskId===t.id?C.accent:C.text}}>{t.title}</div>
                {t.description&&<div style={{fontSize:11,color:C.muted,marginBottom:6}}>{t.description}</div>}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {(t.scoring_rules||[]).map(r=>(
                    <span key={r.id} style={{fontSize:10,padding:"1px 6px",borderRadius:4,
                      background:"rgba(0,0,0,.05)",color:C.muted}}>{r.pts}分</span>
                  ))}
                  <span style={{fontSize:10,color:C.muted}}>
                    满分{(t.scoring_rules||[]).reduce((s,r)=>s+r.pts,0)}分 · {Math.floor(t.time_limit/60)}分钟
                  </span>
                </div>
              </div>
            ))}
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
  const toggleDis=async d=>{
    const newActive=!d.is_active
    // Optimistic local update immediately
    setDiscussions(p=>p.map(x=>({...x,is_active:x.id===d.id?newActive:false})))
    // Sync to DB: deactivate all first, then activate if needed
    await sb.from("lulu_discussions").update({is_active:false}).eq("session_id",sess.id)
    if(newActive) await sb.from("lulu_discussions").update({is_active:true}).eq("id",d.id)
  }
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

  const phases=[["checkin","签到"],["quiz","抢答"],["quiz_result","结算"],["discussion","讨论"],["lab","Word排版"],["excel","Excel制表"],["finished","结果"]]

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
              <Btn small onClick={()=>setPhase("lab")} color={C.accent}>→ Word 排版</Btn>
              <Btn small onClick={()=>setPhase("excel")} color={C.gold}>→ Excel 制表</Btn>
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
                <Btn small onClick={()=>{setPhase("quiz_result");pushQ(0)}} color={C.gold}>📊 结算</Btn>
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

        {/* QUIZ RESULT */}
        {sess.phase==="quiz_result"&&(
          <QuizResultScreen
            sessionId={sess.id}
            groups={groups} isTeacher={true}
            onNext={()=>setPhase("discussion")}
            onLab={()=>setPhase("lab")}
          />
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
                        const pct=sub?Math.round(sub.score/100*100):0
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

        {/* EXCEL */}
        {sess.phase==="excel"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:20}}>
            <div>
              <div style={{fontSize:13,color:C.muted,marginBottom:14}}>实时监控各组 Excel 完成情况</div>
              {groups.map(g=>{
                const members=checkins.filter(c=>c.group_id===g.id)
                return(
                  <Card key={g.id} style={{marginBottom:14,borderLeft:`3px solid ${g.color}`}}>
                    <div style={{display:"flex",alignItems:"center",marginBottom:10}}>
                      <span style={{fontSize:14,fontWeight:700,color:g.color,flex:1}}>{g.name}</span>
                      <span style={{fontSize:12,color:C.muted}}>
                        均分 <span style={{color:g.color,fontWeight:900,fontSize:18,fontFamily:"'DM Mono',monospace"}}>
                          {members.length?Math.round(members.reduce((s,m)=>{
                            const sub=submissions.find(x=>x.student_name===m.student_name)
                            return s+(sub?.score||0)
                          },0)/members.length):0}
                        </span>
                      </span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                      {members.map(m=>{
                        const sub=submissions.find(x=>x.student_name===m.student_name)
                        const pct=sub?Math.round(sub.score/80*100):0
                        return(
                          <div key={m.student_name} style={{padding:"8px 12px",borderRadius:8,background:"rgba(0,0,0,.03)"}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                              <span>{m.student_name}</span>
                              <span style={{color:C.gold,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{sub?.score||0}</span>
                            </div>
                            <div style={{height:4,borderRadius:2,background:"rgba(0,0,0,.06)"}}>
                              <div style={{height:"100%",borderRadius:2,background:g.color,width:`${pct}%`,transition:"width .5s"}}/>
                            </div>
                            {sub?.submitted&&<div style={{fontSize:10,color:C.gold,marginTop:3}}>✓ 已提交</div>}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )
              })}
            </div>
            <GroupRankPanel groupRank={groupRank} label="Excel 积分排名"/>
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

// ── QUIZ RESULT SCREEN ───────────────────────────────────────
function QuizResultScreen({sessionId,groups,isTeacher,onNext,onLab}){
  const [show,setShow]=useState(false)
  const [checkins,setCheckins]=useState([])
  const [answers,setAnswers]=useState([])
  const [questions,setQuestions]=useState([])
  const [loaded,setLoaded]=useState(false)

  useEffect(()=>{
    Promise.all([
      sb.from("word_lab_checkins").select("student_name,group_id").eq("session_id",sessionId),
      sb.from("word_lab_answers").select("student_name,points_earned").eq("session_id",sessionId),
      sb.from("word_lab_questions").select("points").eq("session_id",sessionId),
    ]).then(([{data:c},{data:a},{data:q}])=>{
      if(c) setCheckins(c)
      if(a) setAnswers(a)
      if(q) setQuestions(q)
      setLoaded(true)
      setTimeout(()=>setShow(true),300)
    })
  },[sessionId])

  if(!loaded) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a5f 0%,#0f2027 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,.5)",
      fontFamily:F,fontSize:14}}>加载结算数据…</div>
  )

  // Calculate quiz scores
  const quizScores={}
  answers.forEach(a=>{quizScores[a.student_name]=(quizScores[a.student_name]||0)+a.points_earned})

  // Group scores
  const groupData=groups.map(g=>{
    const members=checkins.filter(c=>c.group_id===g.id)
    const names=members.map(m=>m.student_name)
    const total=names.reduce((s,n)=>s+(quizScores[n]||0),0)
    const top=[...names].sort((a,b)=>(quizScores[b]||0)-(quizScores[a]||0))[0]
    return{...g,members:names.length,total,top,topScore:quizScores[top]||0}
  }).sort((a,b)=>b.total-a.total)

  // Individual top 5
  const allStudents=[...new Set(checkins.map(c=>c.student_name))]
  const indvTop=allStudents
    .map(name=>({name,score:quizScores[name]||0,group_id:checkins.find(c=>c.student_name===name)?.group_id}))
    .sort((a,b)=>b.score-a.score).slice(0,5)

  const medals=["🥇","🥈","🥉","4️⃣","5️⃣"]
  const totalQs=questions.length
  const totalPts=questions.reduce((s,q)=>s+q.points,0)

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a5f 0%,#0f2027 100%)",
      fontFamily:F,color:"white",padding:isTeacher?"24px":"0",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      <div style={{width:"100%",maxWidth:860,padding:"32px 24px"}}>
        {/* Title */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:12,letterSpacing:4,color:"rgba(255,255,255,.5)",marginBottom:8,fontFamily:FM}}>
            ROUND 1 · 抢答热身
          </div>
          <div style={{fontSize:36,fontWeight:900,letterSpacing:-1}}>
            📊 第一阶段结算
          </div>
          {isTeacher&&totalQs>0&&(
            <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginTop:8}}>
              共 {totalQs} 题 · 满分 {totalPts} 分
            </div>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:isTeacher?"1fr 280px":"1fr",gap:20,marginBottom:28}}>
          {/* Group ranking */}
          <div>
            <div style={{fontSize:12,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:16,fontFamily:FM}}>
              小组排名
            </div>
            {groupData.map((g,i)=>(
              <div key={g.id} style={{
                marginBottom:12,padding:"16px 20px",borderRadius:14,
                background:i===0?"rgba(245,200,66,.12)":"rgba(255,255,255,.06)",
                border:`1px solid ${i===0?"rgba(245,200,66,.4)":"rgba(255,255,255,.1)"}`,
                transform:show?"translateY(0)":"translateY(20px)",
                opacity:show?1:0,
                transition:`all .5s ease ${i*0.12}s`
              }}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:28,minWidth:36}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                      <div style={{width:12,height:12,borderRadius:3,background:g.color,flexShrink:0}}/>
                      <span style={{fontSize:17,fontWeight:900}}>{g.name}</span>
                      <span style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{g.members}人</span>
                    </div>
                    {g.top&&(
                      <div style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>
                        ⭐ 本组最高分：{g.top} · {g.topScore}分
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:32,fontWeight:900,color:i===0?C.gold:"white",fontFamily:FM}}>
                      {g.total}
                    </div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>总分</div>
                  </div>
                  {/* Score bar */}
                  <div style={{position:"absolute"}}/>
                </div>
                {/* Progress bar */}
                <div style={{marginTop:10,height:4,borderRadius:2,background:"rgba(255,255,255,.1)"}}>
                  <div style={{
                    height:"100%",borderRadius:2,background:g.color,
                    width:show&&groupData[0].total>0?`${Math.round(g.total/groupData[0].total*100)}%`:"0%",
                    transition:`width .8s ease ${i*0.12+0.3}s`
                  }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Individual top */}
          {isTeacher&&(
            <div>
              <div style={{fontSize:12,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:16,fontFamily:FM}}>
                个人TOP 5
              </div>
              {indvTop.map((s,i)=>{
                const g=groups.find(x=>x.id===s.group_id)
                return(
                  <div key={s.name} style={{
                    marginBottom:10,padding:"12px 16px",borderRadius:10,
                    background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",
                    transform:show?"translateX(0)":"translateX(20px)",
                    opacity:show?1:0,
                    transition:`all .5s ease ${i*0.1+0.4}s`
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:18,minWidth:28}}>{medals[i]}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700}}>{s.name}</div>
                        {g&&<div style={{fontSize:11,color:g.color}}>{g.name}</div>}
                      </div>
                      <span style={{fontSize:18,fontWeight:900,color:C.gold,fontFamily:FM}}>{s.score}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Teacher controls */}
        {isTeacher&&(
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <button onClick={onNext} style={{
              padding:"14px 36px",borderRadius:12,border:`2px solid ${C.purple}`,
              background:"transparent",color:C.purple,fontSize:15,fontWeight:700,
              fontFamily:F,cursor:"pointer"
            }}>→ 进入讨论</button>
            <button onClick={onLab} style={{
              padding:"14px 36px",borderRadius:12,border:"none",
              background:C.accent,color:"white",fontSize:15,fontWeight:700,
              fontFamily:F,cursor:"pointer"
            }}>→ 开始排版竞赛</button>
          </div>
        )}
        {!isTeacher&&(
          <div style={{textAlign:"center",color:"rgba(255,255,255,.4)",fontSize:13,marginTop:8}}>
            等待老师进入下一阶段…
          </div>
        )}
      </div>
    </div>
  )
}


// ── TASK LIBRARY (teacher backend tab) ───────────────────────
function TTaskLibrary(){
  const [tasks,setTasks]=useState([])
  const [loading,setLoading]=useState(true)
  const [editing,setEditing]=useState(null) // null=list, 'new'=new, task=edit

  useEffect(()=>{ loadTasks() },[])

  async function loadTasks(){
    setLoading(true)
    const {data}=await sb.from("lulu_layout_tasks").select().order("created_at",{ascending:false})
    if(data) setTasks(data)
    setLoading(false)
  }

  async function deleteTask(id,e){
    e.stopPropagation()
    if(!confirm("确定删除这道题目？")) return
    await sb.from("lulu_layout_tasks").delete().eq("id",id)
    setTasks(p=>p.filter(t=>t.id!==id))
  }

  if(editing) return(
    <TaskEditor
      task={editing==="new"?null:editing}
      onSave={t=>{
        if(editing==="new") setTasks(p=>[t,...p])
        else setTasks(p=>p.map(x=>x.id===t.id?t:x))
        setEditing(null)
      }}
      onCancel={()=>setEditing(null)}
    />
  )

  return(
    <div style={{padding:28,maxWidth:900}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700}}>排版题目库</div>
          <div style={{fontSize:13,color:C.muted,marginTop:2}}>共 {tasks.length} 道题目，创建课堂时可选用</div>
        </div>
        <Btn onClick={()=>setEditing("new")} color={C.accent}>＋ 新建题目</Btn>
      </div>
      {loading&&<div style={{color:C.muted,fontSize:13}}>加载中…</div>}
      {!loading&&!tasks.length&&(
        <Card style={{textAlign:"center",padding:48,color:C.muted}}>暂无题目，点「新建题目」创建</Card>
      )}
      {tasks.map(t=>(
        <Card key={t.id} style={{marginBottom:12,padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700}}>{t.title}</div>
              {t.description&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{t.description}</div>}
              <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                {(t.scoring_rules||[]).map(r=>(
                  <span key={r.id} style={{fontSize:11,padding:"2px 8px",borderRadius:5,
                    background:"rgba(37,99,235,.08)",color:C.accent,border:`1px solid ${C.accent}33`}}>
                    {r.desc} · {r.pts}分
                  </span>
                ))}
              </div>
            </div>
            <div style={{fontSize:12,color:C.muted,textAlign:"right",flexShrink:0}}>
              <div>时限 {Math.floor(t.time_limit/60)}分钟</div>
              <div style={{marginTop:4}}>满分 {(t.scoring_rules||[]).reduce((s,r)=>s+r.pts,0)} 分</div>
            </div>
            <Btn small onClick={()=>setEditing(t)} style={{background:"rgba(0,0,0,.06)",color:C.text}}>编辑</Btn>
            <button onClick={e=>deleteTask(t.id,e)} style={{background:"none",border:"none",
              color:"rgba(220,38,38,.5)",cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── TASK EDITOR ───────────────────────────────────────────────
function TaskEditor({task,onSave,onCancel}){
  const [title,setTitle]=useState(task?.title||"")
  const [description,setDescription]=useState(task?.description||"")
  const [rawHtml,setRawHtml]=useState(task?.raw_html||"")
  const [targetHtml,setTargetHtml]=useState(task?.target_html||"")
  const [rules,setRules]=useState(task?.scoring_rules||[])
  const [timeLimit,setTimeLimit]=useState(task?.time_limit||600)
  const [tab,setTab]=useState("content") // content | rules | target
  const [aiLoading,setAiLoading]=useState(false)
  const [saving,setSaving]=useState(false)
  const [previewTarget,setPreviewTarget]=useState(false)

  function addRule(type){
    const def=RULE_TYPES.find(r=>r.type===type)
    if(!def) return
    const params={}
    def.params.forEach(p=>{ params[p.key]=p.default })
    let desc=def.defaultDesc
    def.params.forEach(p=>{ desc=desc.replace(`{${p.key}}`,p.default) })
    setRules(prev=>[...prev,{id:type+"_"+Date.now(),type,...params,pts:20,desc}])
  }

  function updateRule(idx,field,val){
    setRules(prev=>prev.map((r,i)=>{
      if(i!==idx) return r
      const updated={...r,[field]:field==="pts"?Number(val):val}
      // Auto-update desc from template
      const def=RULE_TYPES.find(x=>x.type===r.type)
      if(def&&field!=="desc"){
        let desc=def.defaultDesc
        def.params.forEach(p=>{ desc=desc.replace(`{${p.key}}`,updated[p.key]??p.default) })
        updated.desc=desc
      }
      return updated
    }))
  }

  function removeRule(idx){ setRules(prev=>prev.filter((_,i)=>i!==idx)) }

  async function generateTarget(){
    if(!rawHtml.trim()){alert("请先填写原始文档内容");return}
    if(!rules.length){alert("请先添加至少一条评分规则");return}
    setAiLoading(true)
    try{
      const rulesDesc=rules.map((r,i)=>`${i+1}. ${r.desc}（${r.pts}分）`).join("\n")
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:2000,
          messages:[{role:"user",content:`你是一个 Word 文档排版助手。下面是一段未经排版的纯文本文档，请根据评分要求生成格式化后的 HTML 版本作为"目标效果"供学生参考。

原始文档内容：
${rawHtml}

评分要求（学生需要完成这些操作才能得分）：
${rulesDesc}

要求：
1. 只返回 HTML 片段（不需要 html/head/body 标签）
2. 使用语义化标签：h1、h2、p、strong、table 等
3. 为每个 H2 标题加不同的 inline color 样式（如 color:#2563eb）
4. 表格使用 border="1" style="border-collapse:collapse;width:100%"，td/th 用 padding:8px 12px
5. 加粗使用 <strong> 标签
6. 不要添加任何 CSS class，只用 inline style
7. 直接返回 HTML，不要任何解释文字`}]
        })
      })
      const data=await resp.json()
      const html=data.content?.find(c=>c.type==="text")?.text||""
      // Strip markdown code fences if present
      const clean=html.replace(/^```html?\n?/,"").replace(/\n?```$/,"").trim()
      setTargetHtml(clean)
      setTab("target")
    }catch(e){alert("生成失败："+e.message)}
    setAiLoading(false)
  }

  async function save(){
    if(!title.trim()){alert("请填写题目名称");return}
    if(!rawHtml.trim()){alert("请填写原始文档内容");return}
    if(!rules.length){alert("请添加至少一条评分规则");return}
    setSaving(true)
    const payload={title,description,raw_html:rawHtml,target_html:targetHtml,
      scoring_rules:rules,time_limit:timeLimit}
    let result
    if(task?.id){
      const {data}=await sb.from("lulu_layout_tasks").update(payload).eq("id",task.id).select().single()
      result=data
    } else {
      const {data}=await sb.from("lulu_layout_tasks").insert(payload).select().single()
      result=data
    }
    setSaving(false)
    if(result) onSave(result)
    else alert("保存失败，请重试")
  }

  const totalPts=rules.reduce((s,r)=>s+r.pts,0)
  const tabBtn=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{padding:"8px 20px",borderRadius:8,border:"none",
      cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
      background:tab===t?C.accent:"transparent",color:tab===t?"#ffffff":C.muted}}>
      {label}
    </button>
  )

  return(
    <div style={{padding:28,maxWidth:860,fontFamily:F,color:C.text}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
        <button onClick={onCancel} style={{background:"none",border:"none",
          color:C.muted,cursor:"pointer",fontSize:22,lineHeight:1}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:700}}>{task?"编辑题目":"新建题目"}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>满分 <span style={{color:C.accent,fontWeight:700}}>{totalPts}</span> 分</div>
        </div>
        <Btn onClick={save} disabled={saving}>{saving?"保存中…":"保存题目"}</Btn>
      </div>

      {/* Basic info */}
      <Card style={{marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 120px",gap:14}}>
          <div>
            <div style={{fontSize:12,color:C.muted,marginBottom:6}}>题目名称</div>
            <input value={title} onChange={e=>setTitle(e.target.value)} style={inp()}/>
          </div>
          <div>
            <div style={{fontSize:12,color:C.muted,marginBottom:6}}>题目说明（选填）</div>
            <input value={description} onChange={e=>setDescription(e.target.value)} style={inp()}/>
          </div>
          <div>
            <div style={{fontSize:12,color:C.muted,marginBottom:6}}>时限（秒）</div>
            <input type="number" value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))}
              style={inp({color:C.accent})}/>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,background:C.panel,padding:5,borderRadius:10,
        marginBottom:16,width:"fit-content",border:`1px solid ${C.border}`}}>
        {tabBtn("content","原始文档")}
        {tabBtn("rules","评分规则")}
        {tabBtn("target","目标效果")}
      </div>

      {/* Content tab */}
      {tab==="content"&&(
        <Card>
          <div style={{fontSize:13,color:C.muted,marginBottom:10}}>
            粘贴未经排版的纯文本文档（使用 &lt;p&gt; 标签或纯文本均可）
          </div>
          <textarea value={rawHtml} onChange={e=>setRawHtml(e.target.value)} rows={12}
            placeholder="<p>在这里粘贴原始文档内容...</p>"
            style={{...inp({resize:"vertical",lineHeight:1.7,fontFamily:"'DM Mono',monospace",fontSize:12}),width:"100%",boxSizing:"border-box"}}/>
        </Card>
      )}

      {/* Rules tab */}
      {tab==="rules"&&(
        <div>
          <Card style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>添加评分规则</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {RULE_TYPES.map(rt=>(
                <Btn key={rt.type} small onClick={()=>addRule(rt.type)}
                  style={{background:"rgba(0,0,0,.05)",color:C.text}}>
                  ＋ {rt.label}
                </Btn>
              ))}
            </div>
          </Card>
          {!rules.length&&(
            <Card style={{textAlign:"center",padding:32,color:C.muted}}>暂无规则，点上方按钮添加</Card>
          )}
          {rules.map((rule,idx)=>{
            const def=RULE_TYPES.find(r=>r.type===rule.type)
            return(
              <Card key={rule.id} style={{marginBottom:10}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={{fontSize:12,padding:"3px 10px",borderRadius:5,background:"rgba(37,99,235,.1)",
                        color:C.accent,fontWeight:700}}>{def?.label||rule.type}</span>
                      <span style={{fontSize:12,color:C.muted}}>→</span>
                      <input value={rule.desc} onChange={e=>updateRule(idx,"desc",e.target.value)}
                        style={{...inp({flex:1,fontSize:12})}}/>
                    </div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                      {def?.params.map(p=>(
                        <div key={p.key} style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:11,color:C.muted}}>{p.label}</span>
                          <input type="number" value={rule[p.key]??p.default}
                            onChange={e=>updateRule(idx,p.key,Number(e.target.value))} min={1}
                            style={{...inp({width:60,padding:"5px 8px",fontSize:12,textAlign:"center"})}}/>
                        </div>
                      ))}
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:11,color:C.muted}}>分值</span>
                        <input type="number" value={rule.pts}
                          onChange={e=>updateRule(idx,"pts",e.target.value)} min={1}
                          style={{...inp({width:60,padding:"5px 8px",fontSize:12,textAlign:"center",color:C.accent})}}/>
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>removeRule(idx)} style={{background:"none",border:"none",
                    color:"rgba(220,38,38,.5)",cursor:"pointer",fontSize:18,marginTop:2}}>✕</button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Target tab */}
      {tab==="target"&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center"}}>
            <Btn onClick={generateTarget} disabled={aiLoading} color={C.purple}>
              {aiLoading?"AI 生成中…":"✨ AI 一键生成目标效果"}
            </Btn>
            <span style={{fontSize:12,color:C.muted}}>根据原始文档和评分规则自动生成</span>
            {targetHtml&&(
              <button onClick={()=>setPreviewTarget(p=>!p)}
                style={{marginLeft:"auto",background:"none",border:`1px solid ${C.border}`,
                borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,color:C.muted}}>
                {previewTarget?"查看 HTML":"预览效果"}
              </button>
            )}
          </div>
          {previewTarget&&targetHtml?(
            <Card>
              <div style={{fontSize:11,color:C.muted,marginBottom:10}}>目标效果预览</div>
              <div style={{background:"white",padding:"28px 36px",borderRadius:6,
                border:`1px solid ${C.border}`,fontFamily:"Georgia,serif",fontSize:14,lineHeight:1.9}}
                dangerouslySetInnerHTML={{__html:targetHtml}}/>
            </Card>
          ):(
            <Card>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>目标效果 HTML（可手动编辑）</div>
              <textarea value={targetHtml} onChange={e=>setTargetHtml(e.target.value)} rows={14}
                placeholder="点击上方「AI 一键生成」，或手动粘贴 HTML..."
                style={{...inp({resize:"vertical",lineHeight:1.6,fontFamily:"'DM Mono',monospace",fontSize:11}),width:"100%",boxSizing:"border-box"}}/>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// LAYOUT TASK LIBRARY
// ══════════════════════════════════════════════════════════════
function LayoutTaskLibrary({onEdit,onSelect,selectedId}){
  const [tasks,setTasks]=useState([])
  const [loading,setLoading]=useState(true)

  const load=async()=>{
    setLoading(true)
    const {data}=await sb.from("lulu_layout_tasks").select().order("created_at",{ascending:false})
    if(data) setTasks(data)
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  async function del(id,e){
    e.stopPropagation()
    if(!confirm("确定删除这道题？")) return
    await sb.from("lulu_layout_tasks").delete().eq("id",id)
    setTasks(p=>p.filter(t=>t.id!==id))
  }

  if(loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}>加载中…</div>

  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700}}>排版题库</div>
          <div style={{fontSize:13,color:C.muted,marginTop:2}}>{tasks.length} 道题目</div>
        </div>
        <Btn small onClick={()=>onEdit(null)} color={C.accent}>＋ 新建排版题</Btn>
      </div>
      {!tasks.length&&(
        <Card style={{textAlign:"center",padding:48,color:C.muted}}>暂无题目，点「新建排版题」创建第一道</Card>
      )}
      {tasks.map(t=>(
        <Card key={t.id} style={{marginBottom:12,
          border:selectedId===t.id?`2px solid ${C.accent}`:`1px solid ${C.border}`,
          cursor:"pointer"}} onClick={()=>onSelect&&onSelect(t)}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{t.title}</div>
              {t.description&&<div style={{fontSize:13,color:C.muted,marginBottom:8}}>{t.description}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(t.requirements||[]).map((r,i)=>(
                  <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:5,
                    background:"rgba(37,99,235,.08)",color:C.accent,border:`1px solid ${C.accent}22`}}>
                    {r.pts}分 · {r.desc}
                  </span>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0,alignItems:"center"}}>
              <span style={{fontSize:12,color:C.muted,fontFamily:FM}}>{Math.floor(t.time_limit/60)}分钟</span>
              <Btn small onClick={e=>{e.stopPropagation();onEdit(t)}} style={{background:"rgba(0,0,0,.06)",color:C.text}}>编辑</Btn>
              <button onClick={e=>del(t.id,e)} style={{background:"none",border:"none",
                color:"rgba(220,38,38,.5)",cursor:"pointer",fontSize:16,lineHeight:1}}>✕</button>
            </div>
          </div>
          {selectedId===t.id&&(
            <div style={{marginTop:8,fontSize:12,color:C.accent,fontWeight:700}}>✓ 已选择此题</div>
          )}
        </Card>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// LAYOUT TASK EDITOR
// ══════════════════════════════════════════════════════════════
function LayoutTaskEditor({task,onSave,onBack}){
  const isNew=!task
  const [title,setTitle]=useState(task?.title||"")
  const [desc,setDesc]=useState(task?.description||"")
  const [rawHtml,setRawHtml]=useState(task?.raw_html||"")
  const [timeLimit,setTimeLimit]=useState(task?.time_limit||600)
  const [reqs,setReqs]=useState(task?.requirements||[])
  const [saving,setSaving]=useState(false)
  const [tab,setTab]=useState("basic") // basic | target | reqs
  const targetRef=useRef(null)

  useEffect(()=>{
    if(tab==="target"&&targetRef.current&&task?.target_html){
      targetRef.current.innerHTML=task.target_html||''
    }
  },[tab])

  function addReq(){
    const id="req_"+Date.now()
    setReqs(p=>[...p,{id,type:"h1",pts:20,desc:""}])
  }
  function updReq(i,f,v){setReqs(p=>p.map((r,idx)=>idx===i?{...r,[f]:v}:r))}
  function delReq(i){setReqs(p=>p.filter((_,idx)=>idx!==i))}
  function autoDesc(i,type){
    const t=REQ_TYPES[type]
    if(t) updReq(i,"desc",t.label)
  }

  async function save(){
    if(!title.trim()){alert("请填写题目名称");return}
    if(!rawHtml.trim()){alert("请填写学生初始文本");return}
    setSaving(true)
    const targetHtml=targetRef.current?.innerHTML||""
    const payload={title,description:desc,raw_html:rawHtml,target_html:targetHtml,requirements:reqs,time_limit:timeLimit}
    let error
    if(isNew){
      ({error}=await sb.from("lulu_layout_tasks").insert(payload))
    } else {
      ({error}=await sb.from("lulu_layout_tasks").update(payload).eq("id",task.id))
    }
    if(error){alert("保存失败:"+error.message)}
    else{onSave()}
    setSaving(false)
  }

  // Editor CSS
  const docCSS=`
    .te-paper h1{font-size:22px;font-weight:900;color:#111827;line-height:1.3;margin:0 0 10px;font-family:Georgia,serif;}
    .te-paper h2{font-size:17px;font-weight:800;margin:20px 0 6px;font-family:Georgia,serif;}
    .te-paper p{margin:0 0 12px;color:#374151;font-family:Georgia,serif;}
    .te-paper table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;}
    .te-paper td,.te-paper th{border:1px solid #cbd5e1;padding:8px 12px;text-align:left;}
    .te-paper th{background:#f0f4f8;font-weight:700;}
    .te-paper strong,.te-paper b{font-weight:700;}
  `

  const savedSelE=useRef(null)
  function saveSelE(){const s=window.getSelection();if(s&&s.rangeCount>0)savedSelE.current=s.getRangeAt(0).cloneRange()}
  function restSelE(){if(!savedSelE.current)return;const s=window.getSelection();s.removeAllRanges();s.addRange(savedSelE.current)}
  function execE(cmd,val=null){targetRef.current?.focus();restSelE();document.execCommand(cmd,false,val)}
  const [showColorE,setShowColorE]=useState(false)

  const tabBtn2=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{padding:"7px 18px",borderRadius:8,border:"none",
      cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
      background:tab===t?C.accent:"transparent",color:tab===t?"white":C.muted}}>
      {label}
    </button>
  )

  return(
    <div style={{padding:24,fontFamily:F,color:C.text,maxWidth:900}}>
      <style>{docCSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>← 返回</button>
        <div style={{fontSize:16,fontWeight:700}}>{isNew?"新建排版题":"编辑排版题"}</div>
        <div style={{flex:1}}/>
        <Btn onClick={save} disabled={saving}>{saving?"保存中…":"保存题目"}</Btn>
      </div>

      <div style={{display:"flex",gap:4,background:C.panel,padding:4,borderRadius:10,
        marginBottom:20,width:"fit-content",border:`1px solid ${C.border}`}}>
        {tabBtn2("basic","基本信息")}
        {tabBtn2("target","制作样板")}
        {tabBtn2("reqs","评分规则")}
      </div>

      {/* Basic info */}
      {tab==="basic"&&(
        <div style={{display:"grid",gap:16,maxWidth:600}}>
          <Card>
            <div style={{fontSize:12,color:C.muted,marginBottom:7}}>题目名称 *</div>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：春季电商文案排版"
              style={inp()}/>
            <div style={{fontSize:12,color:C.muted,marginTop:14,marginBottom:7}}>题目描述（可选）</div>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="例：将电商文案排版成规范的 Word 格式"
              style={inp()}/>
            <div style={{fontSize:12,color:C.muted,marginTop:14,marginBottom:7}}>排版时限（秒）</div>
            <input type="number" value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))} min={60}
              style={inp({width:100,color:C.accent})}/>
          </Card>
          <Card>
            <div style={{fontSize:12,color:C.muted,marginBottom:4}}>学生初始文本（纯文字，学生从这里开始排版）</div>
            <div style={{fontSize:11,color:"#9ca3af",marginBottom:10}}>
              每段用空行隔开，系统会自动转换成段落。不要在这里加任何格式。
            </div>
            <textarea value={rawHtml} onChange={e=>setRawHtml(e.target.value)} rows={10}
              placeholder={"大标题\n\n第一段正文\n\n小标题一\n\n正文…"}
              style={{...inp(),resize:"vertical",lineHeight:1.7,whiteSpace:"pre-wrap"}}/>
            <div style={{marginTop:10}}>
              <Btn small onClick={()=>{
                // Convert plain text to <p> tags
                const converted=rawHtml.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean).map(s=>`<p>${s}</p>`).join("\n")
                setRawHtml(converted)
              }} style={{background:"rgba(0,0,0,.06)",color:C.text}}>转换为段落格式</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Target editor */}
      {tab==="target"&&(
        <div>
          <div style={{fontSize:13,color:C.muted,marginBottom:14}}>
            在下方制作「标准答案」样板文档。学生在比赛时会看到这个效果作为参考目标。
          </div>
          {/* Mini toolbar */}
          <div style={{display:"flex",gap:6,padding:"8px 12px",background:"#1e3a5f",
            borderRadius:"10px 10px 0 0",flexWrap:"wrap",alignItems:"center"}}>
            {[["H1",()=>execE("formatBlock","h1")],["H2",()=>execE("formatBlock","h2")],
              ["加粗",()=>execE("bold")],["居中",()=>execE("justifyCenter")],
              ["左对齐",()=>execE("justifyLeft")]].map(([label,action])=>(
              <button key={label} onMouseDown={e=>{e.preventDefault();saveSelE();action()}} style={{
                padding:"5px 12px",borderRadius:6,border:"none",background:"rgba(255,255,255,.15)",
                color:"white",fontSize:12,cursor:"pointer",fontFamily:F,fontWeight:700}}>
                {label}
              </button>
            ))}
            {/* Paragraph format buttons for editor */}
            {[
              ["⇥ 首行缩进",()=>{ const sel=window.getSelection();if(!sel?.rangeCount)return;let n=sel.getRangeAt(0).startContainer;while(n&&n!==targetRef.current){if(["P","H1","H2","H3","DIV"].includes(n.nodeName))break;n=n.parentNode}if(n&&n!==targetRef.current)n.style.textIndent="2em" }],
              ["→ 缩进",()=>{ const sel=window.getSelection();if(!sel?.rangeCount)return;let n=sel.getRangeAt(0).startContainer;while(n&&n!==targetRef.current){if(["P","H1","H2","H3","DIV"].includes(n.nodeName))break;n=n.parentNode}if(n&&n!==targetRef.current)n.style.marginLeft=(parseFloat(n.style.marginLeft)||0)+24+"px" }],
            ].map(([label,action])=>(
              <button key={label} onMouseDown={e=>{e.preventDefault();saveSelE();action()}} style={{
                padding:"5px 12px",borderRadius:6,border:"none",background:"rgba(255,255,255,.1)",
                color:"rgba(255,255,255,.8)",fontSize:12,cursor:"pointer",fontFamily:F}}>
                {label}
              </button>
            ))}
            <select onMouseDown={e=>e.preventDefault()}
              onChange={e=>{ const sel=window.getSelection();if(!sel?.rangeCount)return;let n=sel.getRangeAt(0).startContainer;while(n&&n!==targetRef.current){if(["P","H1","H2","H3","DIV"].includes(n.nodeName))break;n=n.parentNode}if(n&&n!==targetRef.current){n.style.lineHeight=e.target.value};e.target.value="" }}
              style={{padding:"4px 8px",borderRadius:6,border:"none",background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.8)",fontSize:12,cursor:"pointer",fontFamily:F}}>
              <option value="">行距</option>
              {["1.0","1.2","1.5","1.8","2.0","2.5"].map(v=><option key={v} value={v}>{v}x</option>)}
            </select>
            <select onMouseDown={e=>e.preventDefault()}
              onChange={e=>{ const sel=window.getSelection();if(!sel?.rangeCount)return;let n=sel.getRangeAt(0).startContainer;while(n&&n!==targetRef.current){if(["P","H1","H2","H3","DIV"].includes(n.nodeName))break;n=n.parentNode}if(n&&n!==targetRef.current){n.style.marginTop=e.target.value+"px"};e.target.value="" }}
              style={{padding:"4px 8px",borderRadius:6,border:"none",background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.8)",fontSize:12,cursor:"pointer",fontFamily:F}}>
              <option value="">段前距</option>
              {[["0","0"],["6","6px"],["12","12px"],["18","18px"],["24","24px"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <select onMouseDown={e=>e.preventDefault()}
              onChange={e=>{ const sel=window.getSelection();if(!sel?.rangeCount)return;let n=sel.getRangeAt(0).startContainer;while(n&&n!==targetRef.current){if(["P","H1","H2","H3","DIV"].includes(n.nodeName))break;n=n.parentNode}if(n&&n!==targetRef.current){n.style.marginBottom=e.target.value+"px"};e.target.value="" }}
              style={{padding:"4px 8px",borderRadius:6,border:"none",background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.8)",fontSize:12,cursor:"pointer",fontFamily:F}}>
              <option value="">段后距</option>
              {[["0","0"],["6","6px"],["12","12px"],["18","18px"],["24","24px"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <div style={{position:"relative"}}>
              <button onMouseDown={e=>{e.preventDefault();saveSelE();setShowColorE(p=>!p)}}
                style={{padding:"5px 12px",borderRadius:6,border:"none",
                  background:"rgba(255,255,255,.15)",color:"white",fontSize:12,cursor:"pointer",fontFamily:F,fontWeight:700}}>
                颜色 ▾
              </button>
              {showColorE&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:200,
                  display:"flex",gap:5,background:"white",padding:6,borderRadius:8,
                  boxShadow:"0 4px 16px rgba(0,0,0,.15)",border:`1px solid ${C.border}`}}>
                  {["#2563eb","#dc2626","#059669","#d97706","#7c3aed","#0284c7","#111827"].map(col=>(
                    <div key={col} onMouseDown={e=>{e.preventDefault();execE("foreColor",col);setShowColorE(false)}}
                      style={{width:24,height:24,borderRadius:5,background:col,cursor:"pointer",
                        border:"2px solid white",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                  ))}
                </div>
              )}
            </div>
            <button onMouseDown={e=>{e.preventDefault();
              const rows=parseInt(prompt("行数（含表头）","4")||"4")
              const cols=parseInt(prompt("列数","3")||"3")
              if(!rows||!cols) return
              let h="<table><tr>"+Array(cols).fill(0).map((_,i)=>`<th>列${i+1}</th>`).join("")+"</tr>"
              for(let r=1;r<rows;r++) h+="<tr>"+Array(cols).fill(0).map((_,i)=>`<td>内容${r}-${i+1}</td>`).join("")+"</tr>"
              h+="</table>"
              targetRef.current?.focus();execE("insertHTML",h)
            }} style={{padding:"5px 12px",borderRadius:6,border:"none",
              background:"rgba(255,255,255,.15)",color:"white",fontSize:12,cursor:"pointer",fontFamily:F,fontWeight:700}}>
              表格
            </button>
          </div>
          {/* Editor area */}
          <div className="te-paper" style={{background:"white",padding:"32px 40px",
            borderRadius:"0 0 10px 10px",border:`1px solid ${C.border}`,minHeight:400,
            boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
            <div ref={targetRef} contentEditable suppressContentEditableWarning
              onMouseUp={saveSelE} onKeyDown={saveSelE}
              style={{minHeight:360,outline:"none",fontSize:14,lineHeight:1.9,
                color:"#1a1a1a",fontFamily:"Georgia,serif"}}/>
          </div>
          <div style={{marginTop:10,fontSize:12,color:C.muted}}>
            提示：选中文字后点工具栏按钮应用格式。此处的样式会原样显示给学生作为参考目标。
          </div>
        </div>
      )}

      {/* Requirements */}
      {tab==="reqs"&&(
        <div style={{maxWidth:700}}>
          <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
            <div style={{flex:1,fontSize:13,color:C.muted}}>设置评分规则，系统将自动检验学生操作</div>
            <Btn small onClick={addReq} color={C.blue}>＋ 添加评分项</Btn>
          </div>
          {!reqs.length&&(
            <Card style={{textAlign:"center",padding:40,color:C.muted}}>暂无评分项，点右上角添加</Card>
          )}
          {reqs.map((r,i)=>(
            <Card key={r.id} style={{marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"160px 1fr 80px auto",gap:10,alignItems:"start"}}>
                {/* Type */}
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>检验类型</div>
                  <select value={r.type} onChange={e=>{updReq(i,"type",e.target.value);autoDesc(i,e.target.value)}}
                    style={{...inp({padding:"8px 10px"}),cursor:"pointer"}}>
                    {Object.entries(REQ_TYPES).map(([k,v])=>(
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>{REQ_TYPES[r.type]?.hint}</div>
                </div>
                {/* Desc */}
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>显示给学生的任务说明</div>
                  <input value={r.desc} onChange={e=>updReq(i,"desc",e.target.value)}
                    placeholder="例：将大标题设为 H1 样式" style={inp()}/>
                  {/* Type-specific params */}
                  {(REQ_TYPES[r.type]?.params||[]).length>0&&(
                    <div style={{display:"flex",gap:10,marginTop:8}}>
                      {REQ_TYPES[r.type].params.map(p=>(
                        <div key={p.k}>
                          <div style={{fontSize:10,color:C.muted,marginBottom:3}}>{p.label}</div>
                          <input type="number" min={1} max={20}
                            value={r[p.k]??p.default}
                            onChange={e=>updReq(i,p.k,Number(e.target.value))}
                            style={inp({width:60,padding:"5px 8px",fontSize:13})}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Points */}
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>分值</div>
                  <input type="number" value={r.pts} min={1} max={100}
                    onChange={e=>updReq(i,"pts",Number(e.target.value))}
                    style={inp({color:C.accent,fontWeight:700})}/>
                </div>
                {/* Delete */}
                <button onClick={()=>delReq(i)} style={{background:"none",border:"none",
                  color:C.red,cursor:"pointer",fontSize:20,marginTop:24}}>×</button>
              </div>
            </Card>
          ))}
          {reqs.length>0&&(
            <div style={{marginTop:8,padding:"10px 14px",borderRadius:8,
              background:"rgba(37,99,235,.06)",border:`1px solid ${C.accent}22`,fontSize:13,color:C.muted}}>
              总分：<span style={{color:C.accent,fontWeight:700}}>{reqs.reduce((s,r)=>s+r.pts,0)}</span> 分
              · {reqs.length} 项评分规则
            </div>
          )}
        </div>
      )}
    </div>
  )
}



// ══════════════════════════════════════════════════════════════
// EXCEL FORMULA ENGINE
// ══════════════════════════════════════════════════════════════
const EXCEL_RAW = [
  ['KH001','普通会员','202X-01-15','广东',638,'是'],
  ['KH002','黄金会员','202X-03-22','浙江',1580,'是'],
  ['KH003','白金会员','202X-02-10','北京',3260,'是'],
  ['KH004','普通会员','202X-05-08','湖南',296,'否'],
  ['KH005','白银会员','202X-04-16','江苏',890,'是'],
  ['KH006','普通会员','202X-06-23','上海',450,'否'],
  ['KH007','黄金会员','202X-01-30','四川',1680,'是'],
  ['KH008','普通会员','202X-07-11','重庆',358,'否'],
  ['KH009','白银会员','202X-03-05','湖北',920,'是'],
  ['KH010','白金会员','202X-02-18','福建',2850,'是'],
  ['KH011','黄金会员','202X-05-27','河南',1420,'是'],
  ['KH012','普通会员','202X-06-09','陕西',580,'否'],
  ['KH013','普通会员','202X-04-30','天津',720,'否'],
  ['KH014','普通会员','202X-07-25','安徽',398,'否'],
  ['KH015','白银会员','202X-01-08','广西',850,'是'],
  ['KH016','普通会员','202X-03-14','云南',420,'否'],
  ['KH017','黄金会员','202X-05-12','贵州',1360,'是'],
  ['KH018','普通会员','202X-06-17','甘肃',560,'否'],
  ['KH019','白银会员','202X-02-24','青海',980,'是'],
  ['KH020','黄金会员','202X-04-03','宁夏',1250,'是'],
  ['KH021','白金会员','202X-01-22','黑龙江',3580,'是'],
  ['KH022','普通会员','202X-03-30','吉林',650,'否'],
  ['KH023','黄金会员','202X-05-01','辽宁',1720,'是'],
  ['KH024','普通会员','202X-06-28','内蒙古',480,'否'],
  ['KH025','白银会员','202X-02-05','新疆',1050,'是'],
  ['KH026','黄金会员','202X-04-19','海南',1480,'是'],
  ['KH027','普通会员','202X-07-04','西藏',380,'否'],
  ['KH028','普通会员','202X-01-12','台湾',750,'否'],
  ['KH029','白金会员','202X-03-18','香港',2980,'是'],
  ['KH030','黄金会员','202X-05-21','澳门',1650,'是'],
]
const EXCEL_COL_LABELS = ['客户ID','会员等级','注册时间','所属省份','累计消费金额（元）','是否复购','客户消费排名','等级','会员数量','销售金额总和']
const EXCEL_COL_LETTERS = ['A','B','C','D','E','F','G','H','I','J']
const EXCEL_COL_W = [72,82,96,76,140,66,96,76,80,120]
const EXCEL_SUMMARY = ['普通会员','白银会员','白金会员','黄金会员']

function exParseAddr(raw){
  const s=raw.replace(/\$/g,'').toUpperCase()
  const m=s.match(/^([A-Z]+)(\d+)$/)
  if(!m) return null
  const c=m[1].split('').reduce((n,ch)=>n*26+(ch.charCodeAt(0)-64),0)-1
  return {r:parseInt(m[2])-1, c}
}
function exGetRange(s){
  const [a,b]=s.split(':')
  const from=exParseAddr(a),to=exParseAddr(b)
  if(!from||!to) return []
  const out=[]
  for(let r=from.r;r<=to.r;r++) for(let c=from.c;c<=to.c;c++) out.push({r,c})
  return out
}
function exSplitArgs(s){
  const args=[];let depth=0,cur=''
  for(const ch of s){
    if(ch==='('){depth++;cur+=ch}
    else if(ch===')'){depth--;cur+=ch}
    else if(ch===','&&depth===0){args.push(cur.trim());cur=''}
    else{cur+=ch}
  }
  if(cur.trim()) args.push(cur.trim())
  return args
}

function buildExcelStaticGrid(){
  const g=Array.from({length:51},()=>Array(10).fill(null))
  EXCEL_COL_LABELS.forEach((h,c)=>{g[0][c]=h})
  EXCEL_RAW.forEach((row,i)=>{for(let c=0;c<6;c++)g[i+1][c]=row[c]})
  EXCEL_SUMMARY.forEach((t,i)=>{g[i+1][7]=t})
  return g
}
const EX_STATIC = buildExcelStaticGrid()

function exGetCellVal(r,c,userForms){
  if(r<0||r>50||c<0||c>9) return ''
  const key=`${r},${c}`
  if(userForms&&userForms[key]!==undefined){
    const f=userForms[key]
    if(!f) return ''
    if(typeof f==='string'&&f.startsWith('=')) return exEval(f,userForms)
    const n=Number(f); return isNaN(n)?f:n
  }
  return EX_STATIC[r]?.[c]??''
}
function exResolveArg(arg,userForms){
  const t=arg.trim()
  if((t.startsWith('"')&&t.endsWith('"'))||(t.startsWith("'")&&t.endsWith("'"))) return t.slice(1,-1)
  const n=Number(t); if(!isNaN(n)&&t!=='') return n
  const addr=exParseAddr(t.replace(/\$/g,''))
  if(addr) return exGetCellVal(addr.r,addr.c,userForms)
  return t
}
function exEval(formula,userForms){
  if(!formula||typeof formula!=='string') return ''
  const f=formula.trim()
  if(!f.startsWith('=')){const n=Number(f);return isNaN(n)?f:n}
  const expr=f.slice(1).trim(),up=expr.toUpperCase()
  try{
    if(up.startsWith('RANK(')){
      const args=exSplitArgs(expr.slice(5,-1))
      const val=Number(exResolveArg(args[0],userForms))
      const cells=exGetRange(args[1].trim())
      const order=args[2]?Number(exResolveArg(args[2],userForms)):0
      const vals=cells.map(({r,c})=>{const v=exGetCellVal(r,c,userForms);return(v!==null&&v!==''&&!isNaN(Number(v)))?Number(v):null}).filter(v=>v!==null)
      const sorted=order===0?[...vals].sort((a,b)=>b-a):[...vals].sort((a,b)=>a-b)
      const rank=sorted.indexOf(val)+1; return rank>0?rank:'#N/A'
    }
    if(up.startsWith('COUNTIF(')){
      const args=exSplitArgs(expr.slice(8,-1))
      const cells=exGetRange(args[0].trim())
      const crit=String(exResolveArg(args[1],userForms))
      return cells.filter(({r,c})=>String(exGetCellVal(r,c,userForms))===crit).length
    }
    if(up.startsWith('SUMIF(')){
      const args=exSplitArgs(expr.slice(6,-1))
      const cells=exGetRange(args[0].trim())
      const crit=String(exResolveArg(args[1],userForms))
      const sumCells=exGetRange(args[2].trim())
      let sum=0
      cells.forEach(({r,c},i)=>{
        if(String(exGetCellVal(r,c,userForms))===crit){
          const sv=exGetCellVal(sumCells[i].r,sumCells[i].c,userForms)
          if(sv!==null&&sv!==''&&!isNaN(Number(sv)))sum+=Number(sv)
        }
      }); return sum
    }
    const addr=exParseAddr(expr.replace(/\$/g,''))
    if(addr) return exGetCellVal(addr.r,addr.c,userForms)
    return '#UNSUP'
  }catch(e){return '#ERR'}
}

function exIsEditable(r,c){
  if(r===0) return false
  if(c===6&&r>=1&&r<=30) return true
  if(c===8&&r>=1&&r<=4) return true
  if(c===9&&r>=1&&r<=4) return true
  return false
}
function exDisplayVal(r,c,userForms){
  if(exIsEditable(r,c)){
    const f=userForms[`${r},${c}`]
    if(!f) return ''
    if(typeof f==='string'&&f.startsWith('=')){const v=exEval(f,userForms);return v===null?'':String(v)}
    return String(f)
  }
  const v=EX_STATIC[r]?.[c]; return v===null||v===undefined?'':String(v)
}

function calcExcelScore(task,userForms,cellStyles){
  const rules=(task?.scoring_rules)||[
    {id:'rank',keyword:'RANK',cells:'G2:G31',expected:[21,8,2,30,16,25,6,29,15,4,10,22,19,27,17,26,11,23,14,12,1,20,5,24,13,9,28,18,3,7],pts_each:1,total_pts:30,desc:'RANK 函数'},
    {id:'countif',keyword:'COUNTIF',cells:'I2:I5',expected:[13,5,4,8],pts_each:5,total_pts:20,desc:'COUNTIF 函数'},
    {id:'sumif',keyword:'SUMIF',cells:'J2:J5',expected:[6680,4690,12670,12140],pts_each:5,total_pts:20,desc:'SUMIF 函数'},
    {id:'beauty',type:'style',pts:10,desc:'数据美化'},
  ]
  let total=0; const detail={}
  rules.forEach(rule=>{
    if(rule.type==='style'){
      const headerBold=EXCEL_COL_LABELS.some((_,c)=>cellStyles[`0,${c}`]?.bold)
      const hasBg=Object.values(cellStyles).some(s=>s.bg&&s.bg!=='#ffffff'&&s.bg!=='')
      const pts=(headerBold?Math.ceil(rule.pts/2):0)+(hasBg?Math.floor(rule.pts/2):0)
      total+=pts; detail[rule.id]={pts,max:rule.pts,label:rule.desc}
    } else {
      const cellList=exGetRange(rule.cells)
      const exp=rule.expected||[]
      let pts=0; const items=[]
      cellList.forEach(({r,c},i)=>{
        const key=`${r},${c}`
        const f=userForms[key]||''
        const hasKw=f.toUpperCase().includes(rule.keyword+'(')
        const val=hasKw?exEval(f.startsWith('=')?f:`=${f}`,userForms):null
        const ok=hasKw&&Number(val)===exp[i]
        if(ok) pts+=(rule.pts_each||1)
        items.push({r,c,ok,val,exp:exp[i]})
      })
      total+=pts; detail[rule.id]={pts,max:rule.total_pts,label:rule.desc,items}
    }
  })
  return {total,rules,detail}
}

// ══════════════════════════════════════════════════════════════
// EXCEL SHEET (student view)
// ══════════════════════════════════════════════════════════════
function ExcelSheet({task:taskProp,excelTaskId,studentName,sessionId,onSubmit,onBack}){
  const [task,setTask]=useState(taskProp||null)
  const [userForms,setUserForms]=useState({})
  const [cellStyles,setCellStyles]=useState({})
  const [selected,setSelected]=useState(null)
  const [editVal,setEditVal]=useState('')
  const [submitted,setSubmitted]=useState(false)
  const [finalScore,setFinalScore]=useState(null)
  const fbarRef=useRef(null)

  useEffect(()=>{
    if(excelTaskId&&!taskProp){
      sb.from("lulu_excel_tasks").select().eq("id",excelTaskId).single()
        .then(({data})=>{ if(data) setTask(data) })
    }
  },[excelTaskId])

  const score=calcExcelScore(task,userForms,cellStyles)
  const isEdit=(r,c)=>exIsEditable(r,c)

  function selectCell(r,c){
    setSelected({r,c})
    const key=`${r},${c}`
    setEditVal(isEdit(r,c)?(userForms[key]||''):String(EX_STATIC[r]?.[c]??''))
    if(isEdit(r,c)) setTimeout(()=>fbarRef.current?.focus(),10)
  }

  function commitEdit(){
    if(!selected||!isEdit(selected.r,selected.c)) return
    setUserForms(p=>({...p,[`${selected.r},${selected.c}`]:editVal}))
  }

  function onKey(e){
    if(e.key==='Enter'){e.preventDefault();commitEdit();if(selected&&selected.r<30)selectCell(selected.r+1,selected.c)}
    if(e.key==='Escape') setEditVal(userForms[`${selected?.r},${selected?.c}`]||'')
    if(e.key==='Tab'){e.preventDefault();commitEdit()}
  }

  function toggleBold(){
    if(!selected) return
    const key=`${selected.r},${selected.c}`
    setCellStyles(p=>{const cur=p[key]||{};return{...p,[key]:{...cur,bold:!cur.bold}}})
  }
  function setBg(col){
    if(!selected) return
    const key=`${selected.r},${selected.c}`
    setCellStyles(p=>{const cur=p[key]||{};return{...p,[key]:{...cur,bg:col}}})
  }

  async function handleSubmit(){
    const s=calcExcelScore(task,userForms,cellStyles)
    if(sessionId){
      await sb.from("word_lab_submissions").upsert({
        session_id:sessionId,student_name:studentName,
        score:s.total,max_score:80,submitted:true,
        completed_tasks:Object.keys(s.detail).filter(k=>s.detail[k].pts>0)
      },{onConflict:"session_id,student_name"})
    }
    setFinalScore(s); setSubmitted(true)
    if(onSubmit) onSubmit(s.total)
  }

  // Results screen
  if(submitted&&finalScore){
    const s=finalScore
    return(
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",fontFamily:F,padding:24,gap:14}}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <div style={{fontSize:36}}>📊</div>
        <div style={{fontSize:22,fontWeight:900}}>{studentName}</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
          {s.rules.map(rule=>{
            const d=s.detail[rule.id]; if(!d) return null
            const pct=Math.round(d.pts/d.max*100)
            return(
              <div key={rule.id} style={{background:C.panel,borderRadius:12,padding:"14px 20px",
                textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,.07)",
                border:`2px solid ${d.pts===d.max?C.accent:C.border}`}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:3}}>{d.label}</div>
                <div style={{fontSize:26,fontWeight:900,color:d.pts===d.max?C.accent:C.gold,fontFamily:"'DM Mono',monospace"}}>{d.pts}</div>
                <div style={{fontSize:11,color:C.muted}}>/ {d.max}</div>
              </div>
            )
          })}
        </div>
        <div style={{background:C.panel,borderRadius:14,padding:"16px 36px",textAlign:"center",
          boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:3}}>总分</div>
          <div style={{fontSize:48,fontWeight:900,color:C.accent,fontFamily:"'DM Mono',monospace"}}>{s.total}</div>
          <div style={{fontSize:12,color:C.muted}}>/ 80 分</div>
        </div>
      </div>
    )
  }

  const BG_COLS=['#ffffff','#fef9c3','#dbeafe','#dcfce7','#fee2e2','#f3e8ff','#1e3a5f','#ffedd5']
  const selKey=selected?`${selected.r},${selected.c}`:null
  const selSt=selKey?cellStyles[selKey]||{}:{}
  const fbarEditable=selected&&isEdit(selected.r,selected.c)

  return(
    <div style={{height:"100vh",display:"grid",gridTemplateRows:"auto auto 1fr auto",
      background:C.bg,fontFamily:F,color:C.text,overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {/* Header */}
      <div style={{background:"#1e3a5f",padding:"8px 16px",display:"flex",alignItems:"center",gap:12,color:"white"}}>
        {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
          color:"white",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:12,fontFamily:F}}>← 返回</button>}
        <div style={{fontSize:14,fontWeight:700}}>📊 Excel 制表 · {studentName}</div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:6}}>
          {s.rules.map(r=>{
            const d=s.detail[r.id]; if(!d) return null
            return <span key={r.id} style={{fontSize:11,padding:"2px 7px",borderRadius:4,
              background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.85)"}}>
              {d.label.split('(')[0]} {d.pts}/{d.max}
            </span>
          })}
          <span style={{fontSize:14,fontWeight:900,color:s.total>=60?"#6ee7b7":"#fcd34d",
            fontFamily:"'DM Mono',monospace",marginLeft:4}}>{s.total}/80</span>
        </div>
        <button onClick={handleSubmit} style={{padding:"6px 16px",borderRadius:7,border:"none",
          background:"#f59e0b",color:"white",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer"}}>
          提交
        </button>
      </div>
      {/* Toolbar */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,
        padding:"5px 10px",display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:C.muted,minWidth:44,
          textAlign:"center",background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:5,padding:"3px 6px"}}>
          {selected?`${EXCEL_COL_LETTERS[selected.c]}${selected.r+1}`:'--'}
        </div>
        <div style={{width:1,height:18,background:C.border}}/>
        <span style={{fontSize:12,color:C.muted}}>fx</span>
        <input ref={fbarRef} value={fbarEditable?editVal:String(EX_STATIC[selected?.r]?.[selected?.c]??'')}
          onChange={e=>fbarEditable&&setEditVal(e.target.value)}
          onKeyDown={onKey} onBlur={commitEdit}
          readOnly={!fbarEditable}
          placeholder={fbarEditable?"输入公式，如 =RANK(E2,$E$2:$E$31,0)":"只读"}
          style={{flex:1,padding:"4px 8px",borderRadius:6,fontSize:12,fontFamily:"'DM Mono',monospace",
            border:`1px solid ${fbarEditable?"#ca8a04":C.border}`,
            background:fbarEditable?"#fefce8":"#f9fafb",outline:"none",minWidth:180}}/>
        <div style={{width:1,height:18,background:C.border}}/>
        <button onMouseDown={e=>{e.preventDefault();toggleBold()}} style={{
          padding:"4px 10px",borderRadius:5,border:`1px solid ${C.border}`,
          background:selSt.bold?"rgba(37,99,235,.1)":"white",
          color:selSt.bold?C.accent:C.text,fontWeight:900,cursor:"pointer",fontSize:13}}>B</button>
        <span style={{fontSize:11,color:C.muted}}>填充:</span>
        {BG_COLS.map(col=>(
          <div key={col} onMouseDown={e=>{e.preventDefault();setBg(col)}} style={{
            width:16,height:16,borderRadius:3,background:col,cursor:"pointer",
            border:`2px solid ${selSt.bg===col?"#333":C.border}`}}/>
        ))}
      </div>
      {/* Grid */}
      <div style={{overflow:"auto",background:"#e8ecf1"}}>
        <table style={{borderCollapse:"collapse",tableLayout:"fixed",background:"white",userSelect:"none"}}>
          <colgroup>
            <col style={{width:32}}/>
            {EXCEL_COL_W.map((w,i)=><col key={i} style={{width:w}}/>)}
          </colgroup>
          <thead style={{position:"sticky",top:0,zIndex:10}}>
            <tr>
              <th style={{background:"#e8ecf1",border:`1px solid ${C.border}`,padding:"3px",fontSize:10,color:C.muted,textAlign:"center"}}>#</th>
              {EXCEL_COL_LETTERS.map((l,c)=>(
                <th key={c} style={{background:"#e8ecf1",border:`1px solid ${C.border}`,padding:"3px",
                  fontSize:10,color:C.muted,textAlign:"center",fontFamily:"'DM Mono',monospace"}}>{l}</th>
              ))}
            </tr>
            <tr>
              <td style={{background:"#e8ecf1",border:`1px solid ${C.border}`,padding:"3px",fontSize:10,color:C.muted,textAlign:"center",fontFamily:"'DM Mono',monospace"}}>1</td>
              {EXCEL_COL_LABELS.map((h,c)=>{
                const st=cellStyles[`0,${c}`]||{}
                const isSel=selected?.r===0&&selected?.c===c
                return(
                  <td key={c} onClick={()=>selectCell(0,c)} style={{
                    border:`${isSel?2:1}px solid ${isSel?C.accent:C.border}`,
                    padding:"4px 5px",fontSize:11,fontWeight:st.bold?700:700,
                    background:st.bg||"#1e3a5f",color:st.color||"white",
                    cursor:"default",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"
                  }}>{h}</td>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {EXCEL_RAW.map((_,rowIdx)=>{
              const r=rowIdx+1
              return(
                <tr key={r}>
                  <td style={{background:"#e8ecf1",border:`1px solid ${C.border}`,padding:"2px 3px",
                    fontSize:10,color:C.muted,textAlign:"center",fontFamily:"'DM Mono',monospace"}}>{r+1}</td>
                  {EXCEL_COL_LETTERS.map((_,c)=>{
                    const key=`${r},${c}`
                    const st=cellStyles[key]||{}
                    const edit=isEdit(r,c)
                    const isSel=selected?.r===r&&selected?.c===c
                    const dv=exDisplayVal(r,c,userForms)
                    const isErr=typeof dv==='string'&&dv.startsWith('#')
                    // Cell status
                    let status=null
                    if(edit&&userForms[key]){
                      const rules=(task?.scoring_rules)||[
                        {id:'rank',keyword:'RANK',cells:'G2:G31',expected:[21,8,2,30,16,25,6,29,15,4,10,22,19,27,17,26,11,23,14,12,1,20,5,24,13,9,28,18,3,7]},
                        {id:'countif',keyword:'COUNTIF',cells:'I2:I5',expected:[13,5,4,8]},
                        {id:'sumif',keyword:'SUMIF',cells:'J2:J5',expected:[6680,4690,12670,12140]},
                      ]
                      const rule=c===6?rules[0]:c===8?rules[1]:c===9?rules[2]:null
                      if(rule){
                        const cellList=exGetRange(rule.cells)
                        const idx=cellList.findIndex(cl=>cl.r===r&&cl.c===c)
                        const hasKw=userForms[key].toUpperCase().includes(rule.keyword+'(')
                        const val=hasKw?exEval(userForms[key].startsWith('=')?userForms[key]:('='+userForms[key]),userForms):null
                        const ok=hasKw&&Number(val)===rule.expected[idx]
                        status=ok?'ok':hasKw?'wrong':'nofn'
                      }
                    }
                    return(
                      <td key={c} onClick={()=>selectCell(r,c)}
                        style={{
                          border:`${isSel?2:1}px solid ${isSel?C.accent:edit?"#ca8a0499":C.border}`,
                          padding:"2px 5px",fontSize:11,
                          background:st.bg||(edit?"#fefce8":"white"),
                          color:isErr?C.red:st.color||C.text,
                          fontWeight:st.bold?700:400,cursor:edit?"cell":"default",
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                          textAlign:(c>=4&&c<=6)?'right':'left',position:"relative"
                        }}>
                        {dv||(!edit?'':<span style={{color:"#ca8a04",fontSize:9,fontStyle:"italic"}}>
                          {c===6?"=RANK(...)":c===8?"=COUNTIF(...)":"=SUMIF(...)"}
                        </span>)}
                        {status&&<span style={{position:"absolute",top:1,right:2,fontSize:8,
                          color:status==='ok'?"#059669":status==='wrong'?C.red:"#d97706"}}>
                          {status==='ok'?'✓':status==='wrong'?'✗':'!'}
                        </span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Status bar */}
      <div style={{background:C.panel,borderTop:`1px solid ${C.border}`,padding:"4px 14px",
        display:"flex",gap:14,fontSize:11,color:C.muted,alignItems:"center"}}>
        <span>💡 点击黄色单元格 → 公式栏输入公式 → Enter 确认</span>
        <div style={{flex:1}}/>
        {s.rules.map(r=>{const d=s.detail[r.id];if(!d)return null;return(
          <span key={r.id}>{d.label.split('(')[0]} {d.pts}/{d.max}</span>
        )})}
        <span style={{color:C.accent,fontWeight:700}}>总分 {s.total}/80</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// EXCEL TASK LIBRARY (teacher backend)
// ══════════════════════════════════════════════════════════════
function ExcelTaskLibrary({onSelect,selectedId}){
  const [tasks,setTasks]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    sb.from("lulu_excel_tasks").select("id,title,description,scoring_rules,time_limit")
      .order("created_at",{ascending:false})
      .then(({data})=>{if(data)setTasks(data);setLoading(false)})
  },[])

  async function del(id,e){
    e.stopPropagation()
    if(!confirm("确定删除这道题？")) return
    await sb.from("lulu_excel_tasks").delete().eq("id",id)
    setTasks(p=>p.filter(t=>t.id!==id))
  }

  if(loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}>加载中…</div>

  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700}}>表格题库</div>
          <div style={{fontSize:13,color:C.muted,marginTop:2}}>{tasks.length} 道 Excel 题目</div>
        </div>
      </div>
      {!tasks.length&&<Card style={{textAlign:"center",padding:48,color:C.muted}}>暂无题目</Card>}
      {tasks.map(t=>(
        <Card key={t.id} style={{marginBottom:12,cursor:"pointer",
          border:selectedId===t.id?`2px solid ${C.accent}`:`1px solid ${C.border}`}}
          onClick={()=>onSelect&&onSelect(t)}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{t.title}</div>
              {t.description&&<div style={{fontSize:13,color:C.muted,marginBottom:8}}>{t.description}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(t.scoring_rules||[]).map((r,i)=>(
                  <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:5,
                    background:"rgba(217,119,6,.08)",color:C.gold,border:`1px solid ${C.gold}22`}}>
                    {r.total_pts||r.pts}分 · {r.desc}
                  </span>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
              <span style={{fontSize:12,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{Math.floor(t.time_limit/60)}分钟</span>
              <button onClick={e=>del(t.id,e)} style={{background:"none",border:"none",
                color:"rgba(220,38,38,.5)",cursor:"pointer",fontSize:16,lineHeight:1}}>✕</button>
            </div>
          </div>
          {selectedId===t.id&&<div style={{marginTop:8,fontSize:12,color:C.accent,fontWeight:700}}>✓ 已选择此题</div>}
        </Card>
      ))}
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
  const [activeTask,setActiveTask]=useState(null) // loaded from DB
  const [taskLoaded,setTaskLoaded]=useState(false)  // true when task confirmed
  const [labInitialized,setLabInitialized]=useState(false) // editor init once

  useEffect(()=>{
    sb.from("lulu_groups").select().eq("session_id",init.id).order("seq").then(({data})=>data&&setGroups(data))
    sb.from("word_lab_checkins").upsert({session_id:init.id,student_name:studentName},{onConflict:"session_id,student_name"})
      .then(()=>setCheckedIn(true))
    sb.from("word_lab_checkins").select("group_id").eq("session_id",init.id).eq("student_name",studentName).single()
      .then(({data})=>{ if(data?.group_id) setMyGroupId(data.group_id) })
    // Load layout task from library
    if(init.layout_task_id){
      sb.from("lulu_layout_tasks").select().eq("id",init.layout_task_id).single()
        .then(({data})=>{
          if(data) setActiveTask(data)
          setTaskLoaded(true)
        }).catch(()=>setTaskLoaded(true))
    } else { setTaskLoaded(true) } // no task, use TASK fallback immediately
  },[])

  useEffect(()=>{
    const ch=sb.channel(`smain-${init.id}-${studentName}`)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"word_lab_sessions",filter:`id=eq.${init.id}`},
        async({new:s})=>{
          try {
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
              // upsert to avoid duplicate error if student reconnects
              const {data:sub}=await sb.from("word_lab_submissions").upsert(
                {session_id:s.id,student_name:studentName,score:0,max_score:((activeTask?.requirements)||TASK.reqs).reduce((s,r)=>s+r.pts,0),completed_tasks:[]},
                {onConflict:"session_id,student_name",ignoreDuplicates:false}
              ).select().single()
              if(sub) setSubId(sub.id)
            }
          } catch(e){ console.error("session listener error",e) }
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

  // Init editor exactly once when BOTH: phase=lab AND task is confirmed loaded
  useEffect(()=>{
    if(sess.phase==="lab" && taskLoaded && editorRef.current && !labInitialized){
      editorRef.current.innerHTML = activeTask?.raw_html || TASK.rawHtml
      setLabInitialized(true)
    }
  },[sess.phase, taskLoaded])

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
    // Optimistically update UI first
    const ok=idx===q.correct_index
    setAnswered(p=>({...p,[q.id]:idx}))
    setQuizPts(p=>p+(ok?q.points:0))
    setFlash(ok?"correct":"wrong")
    setTimeout(()=>setFlash(null),1200)
    try {
      await sb.from("word_lab_answers").upsert({
        session_id:init.id,question_id:q.id,student_name:studentName,
        answer_index:idx,is_correct:ok,points_earned:ok?q.points:0
      },{onConflict:"question_id,student_name"})
    } catch(e){ console.error("answer error",e) }
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

  // Apply CSS style to the block element containing current cursor position
  function applyBlockStyle(styleProp, value){
    editorRef.current?.focus()
    restSel()
    const sel=window.getSelection()
    if(!sel||!sel.rangeCount) return
    let node=sel.getRangeAt(0).startContainer
    // Walk up to nearest block element inside the editor
    while(node&&node!==editorRef.current){
      const tag=node.nodeName
      if(["P","H1","H2","H3","DIV","LI","BLOCKQUOTE"].includes(tag)) break
      node=node.parentNode
    }
    if(node&&node!==editorRef.current){
      node.style[styleProp]=value
      checkReqs()
    }
  }

  function checkReqs(){
    if(!editorRef.current) return
    const reqs=(activeTask?.requirements)||TASK.reqs
    const nd=evalReqs(editorRef.current,reqs)
    setDone(nd)
  }

  async function save(){
    if(!subId) return
    const taskReqs=(activeTask?.requirements)||TASK.reqs
    const score=taskReqs.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)
    await sb.from("word_lab_submissions").update({
      score,completed_tasks:[...done],
      html_content:editorRef.current?.innerHTML||"",
      last_active:new Date().toISOString()
    }).eq("id",subId)
  }

  async function handleSubmit(){
    if(submitted) return
    await save()
    const taskReqs=(activeTask?.requirements)||TASK.reqs
    const score=taskReqs.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)
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
  const taskReqs=(activeTask?.requirements)||TASK.reqs
    const score=taskReqs.filter(r=>done.has(r.id)).reduce((s,r)=>s+r.pts,0)

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
                      color:col,fontSize:14,fontWeight:700,cursor:myAns!==undefined?"default":"pointer",
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

  // Quiz result screen
  if(sess.phase==="quiz_result"){
    return(
      <QuizResultScreen
        sessionId={init.id}
        groups={groups} isTeacher={false}
        onNext={()=>{}} onLab={()=>{}}
      />
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
  if(sess.phase==="lab"&&!taskLoaded) return <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F,color:C.muted}}>题目加载中…</div>
  if(sess.phase==="lab"){
    // Shared CSS injected into both panels so styles are identical
    const docCSS = `
      .doc-paper h1{font-size:22px;font-weight:900;color:#111827;line-height:1.3;margin:0 0 10px;font-family:Georgia,serif;}
      .doc-paper h2{font-size:17px;font-weight:800;margin:20px 0 6px;font-family:Georgia,serif;}
      .doc-paper p{margin:0 0 12px;color:#374151;font-family:Georgia,serif;}
      .doc-paper table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;}
      .doc-paper td,.doc-paper th{border:1px solid #cbd5e1;padding:8px 12px;text-align:left;}
      .doc-paper th{background:#f0f4f8;font-weight:700;}
      .doc-paper tr:nth-child(even) td{background:#f8fafc;}
      .doc-paper strong,.doc-paper b{font-weight:700;}
    `
    const toolBtn=(label,action,extra={})=>(
      <button onMouseDown={e=>{e.preventDefault();saveSel();action()}} style={{
        padding:"7px 14px",borderRadius:7,border:`1px solid ${C.border}`,
        background:"white",color:C.text,fontSize:13,cursor:"pointer",fontFamily:F,
        fontWeight:700,...extra
      }}>{label}</button>
    )
    return(
      <div style={{height:"100vh",background:"#e8edf4",fontFamily:F,color:C.text,
        display:"grid",gridTemplateRows:"auto 1fr",overflow:"hidden"}}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <style>{docCSS}</style>

        {/* ── Toolbar ── */}
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",
          background:"#1e3a5f",color:"white",flexWrap:"wrap"}}>
          <span style={{fontSize:15,fontWeight:900,color:"#7dd3fc",fontFamily:FM,minWidth:54}}>{fmtTime(labTime)}</span>
          {myGroup&&<span style={{fontSize:11,color:myGroup.color,fontWeight:700,
            background:"rgba(255,255,255,.1)",padding:"2px 8px",borderRadius:5}}>▪ {myGroup.name}</span>}
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",margin:"0 6px"}}/>
          {/* Dynamic toolbar - shows only buttons needed by this task */}
          {(()=>{
            const needs=new Set(taskReqs.map(r=>REQ_TYPES[r.type]?.toolbar))
            const s={background:"#334155",color:"white",border:"none"}
            return <>
              {(needs.has("h1")||needs.has("h2"))&&toolBtn("H1",()=>exec("formatBlock","h1"),{background:"#1d4ed8",color:"white",border:"none",fontWeight:900})}
              {needs.has("h2")&&toolBtn("H2",()=>exec("formatBlock","h2"),{...s})}
              {needs.has("bold")&&toolBtn("B 加粗",()=>exec("bold"),{...s,fontWeight:900,fontStyle:"italic"})}
              {needs.has("align")&&<>
                {toolBtn("居中",()=>exec("justifyCenter"),{...s})}
                {toolBtn("左对齐",()=>exec("justifyLeft"),{...s})}
              </>}
              {needs.has("list")&&<>
                {toolBtn("• 无序",()=>exec("insertUnorderedList"),{...s})}
                {toolBtn("1. 有序",()=>exec("insertOrderedList"),{...s})}
              </>}
              {needs.has("indent_first")&&
                toolBtn("⇥ 首行缩进",()=>{saveSel();applyBlockStyle("textIndent","2em")},{...s})
              }
              {needs.has("indent_block")&&<>
                {toolBtn("→ 增加缩进",()=>{
                  saveSel()
                  const sel=window.getSelection()
                  if(!sel?.rangeCount) return
                  let n=sel.getRangeAt(0).startContainer
                  while(n&&n!==editorRef.current){if(["P","H1","H2","H3","DIV"].includes(n.nodeName))break;n=n.parentNode}
                  if(n&&n!==editorRef.current){n.style.marginLeft=(parseFloat(n.style.marginLeft)||0)+24+"px";checkReqs()}
                },{...s})}
                {toolBtn("← 减少缩进",()=>{
                  saveSel()
                  const sel=window.getSelection()
                  if(!sel?.rangeCount) return
                  let n=sel.getRangeAt(0).startContainer
                  while(n&&n!==editorRef.current){if(["P","H1","H2","H3","DIV"].includes(n.nodeName))break;n=n.parentNode}
                  if(n&&n!==editorRef.current){n.style.marginLeft=Math.max(0,(parseFloat(n.style.marginLeft)||0)-24)+"px";checkReqs()}
                },{...s})}
              </>}
              {needs.has("line_height")&&(
                <select onMouseDown={e=>e.preventDefault()}
                  onChange={e=>{saveSel();applyBlockStyle("lineHeight",e.target.value);e.target.value=""}}
                  style={{padding:"6px 10px",borderRadius:7,border:"none",background:"#334155",
                    color:"white",fontSize:12,cursor:"pointer",fontFamily:F}}>
                  <option value="">行距 ▾</option>
                  {[["1.0","1.0x"],["1.2","1.2x"],["1.5","1.5x"],["1.8","1.8x"],["2.0","2.0x"],["2.5","2.5x"]].map(([v,l])=>(
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              )}
              {needs.has("space_before")&&(
                <select onMouseDown={e=>e.preventDefault()}
                  onChange={e=>{saveSel();applyBlockStyle("marginTop",e.target.value+"px");e.target.value=""}}
                  style={{padding:"6px 10px",borderRadius:7,border:"none",background:"#334155",
                    color:"white",fontSize:12,cursor:"pointer",fontFamily:F}}>
                  <option value="">段前间距 ▾</option>
                  {[["0","无 0px"],["6","6px"],["12","12px"],["18","18px"],["24","24px"],["36","36px"]].map(([v,l])=>(
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              )}
              {needs.has("space_after")&&(
                <select onMouseDown={e=>e.preventDefault()}
                  onChange={e=>{saveSel();applyBlockStyle("marginBottom",e.target.value+"px");e.target.value=""}}
                  style={{padding:"6px 10px",borderRadius:7,border:"none",background:"#334155",
                    color:"white",fontSize:12,cursor:"pointer",fontFamily:F}}>
                  <option value="">段后间距 ▾</option>
                  {[["0","无 0px"],["6","6px"],["12","12px"],["18","18px"],["24","24px"],["36","36px"]].map(([v,l])=>(
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              )}
            </>
          })()}
          {/* Color picker */}
          <div style={{position:"relative"}}>
            <button onMouseDown={e=>{e.preventDefault();saveSel();setShowColor(p=>!p)}} style={{
              padding:"7px 14px",borderRadius:7,border:"none",background:"#334155",
              color:"white",fontSize:13,cursor:"pointer",fontFamily:F,fontWeight:700}}>
              文字颜色 ▾
            </button>
            {showColor&&(
              <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,
                display:"flex",gap:6,background:"white",padding:8,borderRadius:10,
                boxShadow:"0 8px 24px rgba(0,0,0,.18)",border:`1px solid ${C.border}`}}>
                {[["#2563eb","蓝色"],["#dc2626","红色"],["#059669","绿色"],
                  ["#d97706","橙色"],["#7c3aed","紫色"],["#0284c7","青色"],["#111827","黑色"]].map(([col,name])=>(
                  <div key={col}
                    onMouseDown={e=>{e.preventDefault();exec("foreColor",col);setShowColor(false)}}
                    title={name} style={{
                      width:28,height:28,borderRadius:7,background:col,cursor:"pointer",
                      border:"2px solid white",boxShadow:"0 1px 4px rgba(0,0,0,.25)"}}/>
                ))}
              </div>
            )}
          </div>
          {/* Table inserter */}
          <div style={{position:"relative"}}>
            <button onMouseDown={e=>{e.preventDefault();setShowTable(p=>!p)}} style={{
              padding:"7px 14px",borderRadius:7,border:"none",background:"#334155",
              color:"white",fontSize:13,cursor:"pointer",fontFamily:F,fontWeight:700}}>
              插入表格 ▾
            </button>
            {showTable&&(
              <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,zIndex:200,
                background:"white",padding:"16px 18px",borderRadius:12,
                boxShadow:"0 8px 32px rgba(0,0,0,.18)",border:`1px solid ${C.border}`,
                minWidth:220}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:12,fontWeight:700}}>设置表格尺寸</div>
                <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:4}}>行数</div>
                    <input type="number" value={tRows} onChange={e=>setTRows(Number(e.target.value))} min={2} max={8}
                      style={{...inp({fontSize:14,padding:"8px 10px",textAlign:"center",fontWeight:700})}}/>
                  </div>
                  <span style={{fontSize:18,color:C.muted,marginTop:16}}>×</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:4}}>列数</div>
                    <input type="number" value={tCols} onChange={e=>setTCols(Number(e.target.value))} min={2} max={6}
                      style={{...inp({fontSize:14,padding:"8px 10px",textAlign:"center",fontWeight:700})}}/>
                  </div>
                </div>
                <Btn full onClick={insertTable} color={C.accent}>插入表格</Btn>
              </div>
            )}
          </div>
          <div style={{flex:1}}/>
          <span style={{fontSize:15,color:"white",fontWeight:900,fontFamily:FM}}>
            {score}<span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>/{((activeTask?.requirements)||TASK.reqs).reduce((s,r)=>s+r.pts,0)}</span>
          </span>
          {!submitted&&<Btn small onClick={handleSubmit} color="#f59e0b">提交答卷</Btn>}
          {submitted&&<span style={{fontSize:12,color:"#6ee7b7",fontWeight:700}}>✓ 已提交</span>}
        </div>

        {/* ── Three-column body ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",overflow:"hidden",gap:0}}>

          {/* ── 左：目标文档 ── */}
          <div style={{borderRight:`2px solid #cbd5e1`,overflow:"hidden",
            display:"flex",flexDirection:"column"}}>
            <div style={{padding:"7px 14px",background:"#1e3a5f",
              display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{fontSize:12,fontWeight:700,color:"white",letterSpacing:.5}}>🎯 目标效果</span>
              <span style={{fontSize:10,color:"rgba(255,255,255,.45)",marginLeft:"auto"}}>只读参考</span>
            </div>
            <div style={{flex:1,overflow:"auto",padding:16,background:"#e8edf4"}}>
              <div className="doc-paper" style={{background:"white",padding:"32px 40px",
                borderRadius:4,boxShadow:"0 2px 12px rgba(0,0,0,.1)",maxWidth:540,margin:"0 auto",
                fontSize:14,lineHeight:1.9}}>
                <div dangerouslySetInnerHTML={{__html:activeTask?.target_html||TASK.targetHtml}}/>
              </div>
            </div>
          </div>

          {/* ── 中：编辑区 ── */}
          <div style={{overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"7px 14px",background:"#334155",
              display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{fontSize:12,fontWeight:700,color:"white",letterSpacing:.5}}>✏️ 你的文档</span>
              <span style={{fontSize:10,color:"rgba(255,255,255,.45)",marginLeft:"auto"}}>在此处编辑排版</span>
            </div>
            <div style={{flex:1,overflow:"auto",padding:16,background:"#e8edf4"}}>
              <div className="doc-paper" style={{background:"white",padding:"32px 40px",
                borderRadius:4,boxShadow:"0 2px 12px rgba(0,0,0,.1)",maxWidth:540,margin:"0 auto",
                fontSize:14,lineHeight:1.9}}>
                <div ref={editorRef} contentEditable={!submitted} onInput={checkReqs}
                  onKeyUp={checkReqs} onMouseUp={saveSel} onKeyDown={saveSel}
                  style={{minHeight:360,color:"#1a1a1a",outline:"none",fontFamily:"Georgia,serif"}}/>
              </div>
            </div>
          </div>

          {/* ── 右：任务清单 ── */}
          <div style={{background:"white",borderLeft:`2px solid #cbd5e1`,
            overflow:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"10px 14px",background:"#1e3a5f",flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:700,color:"white"}}>📋 评分任务</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.45)",marginTop:2}}>完成即自动得分</div>
            </div>
            <div style={{padding:14,flex:1}}>
              {((activeTask?.requirements)||TASK.reqs).map((r,i)=>{
                const ok=done.has(r.id)
                return(
                  <div key={r.id} style={{marginBottom:14,padding:"12px 14px",borderRadius:10,
                    border:`1.5px solid ${ok?C.accent:C.border}`,
                    background:ok?"rgba(37,99,235,.06)":"white",
                    transition:"all .3s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:18,color:ok?C.accent:"#d1d5db"}}>
                        {ok?"✓":"○"}
                      </span>
                      <span style={{fontSize:20,fontWeight:900,fontFamily:FM,
                        color:ok?C.accent:"#d1d5db"}}>
                        {r.pts}
                      </span>
                      <span style={{fontSize:10,color:ok?C.accent:"#9ca3af",fontWeight:700}}>分</span>
                    </div>
                    <div style={{fontSize:12,color:ok?C.text:C.muted,lineHeight:1.5}}>
                      {r.desc}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Total */}
            <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,
              background:"#f8fafc",textAlign:"center"}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:4}}>当前得分</div>
              <div style={{fontSize:36,fontWeight:900,color:C.accent,fontFamily:FM,lineHeight:1}}>
                {score}
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>/ {((activeTask?.requirements)||TASK.reqs).reduce((s,r)=>s+r.pts,0)} 分</div>
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
  const [editingTask,setEditingTask]=useState(null)

  if(inDash&&sess) return <TDash session={sess} onBack={()=>{setInDash(false);setSess(null)}}/>
  if(tab==="tasks"&&editingTask!==null){
    return <LayoutTaskEditor
      task={editingTask==="new"?null:editingTask}
      onSave={()=>setEditingTask(null)}
      onBack={()=>setEditingTask(null)}/>
  }

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
      <div style={{display:"flex",alignItems:"center",gap:16,padding:"14px 28px",
        background:C.panel,borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:20,fontWeight:900}}>录录 <span style={{color:C.accent}}>教师后台</span></div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:4,background:"rgba(0,0,0,.04)",padding:4,borderRadius:10,border:"1px solid #dde3ec"}}>
          {tabBtn("new","新建课堂",C.accent)}
          {tabBtn("tasks","排版题库",C.gold)}
          {tabBtn("excel","表格题库","#d97706")}
          {tabBtn("history","历史课堂",C.blue)}
          {tabBtn("settings","设置",C.muted)}
        </div>
      </div>
      {tab==="new"&&<TSetup onCreate={s=>{setSess(s);setInDash(true)}}/>}
      {tab==="tasks"&&<LayoutTaskLibrary onEdit={t=>setEditingTask(t||"new")} selectedId={null}/>}
      {tab==="excel"&&<ExcelTaskLibrary/>}
      {tab==="history"&&<THistory onResume={s=>{setSess(s);setInDash(true)}}/>}
      {tab==="settings"&&<TSettings/>}
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
function AppInner(){
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

export default function App(){
  return <ErrorBoundary><AppInner/></ErrorBoundary>
}