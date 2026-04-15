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
const SCORE_OFFICE_URL = "https://ghnrxnoqqteuxxtqlzfv.supabase.co/functions/v1/score-office"
const STORAGE_BASE = "https://ghnrxnoqqteuxxtqlzfv.supabase.co/storage/v1/object/public/lulu-submissions"

function uploadFileToStorage(b64, fileName){
  return new Promise(async(resolve)=>{
    try{
      const raw = b64.replace(/^data:[^;]+;base64,/, '')
      const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
      const ext = (fileName.split('.').pop()||'xlsx').toLowerCase()
      const mime = ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream'
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`
      const blob = new Blob([bytes], {type: mime})
      const {data, error} = await sb.storage.from('lulu-submissions').upload(path, blob, {contentType: mime, upsert: false})
      if(error){console.error('Storage upload error:', error.message, JSON.stringify(error)); resolve(null); return}
      console.log('Storage upload success:', path)
      resolve(`${STORAGE_BASE}/${path}`)
    } catch(e) {
      console.error('Storage upload exception:', e.message)
      resolve(null)
    }
  })
}

function exParseAddr(raw){
  if(!raw||typeof raw!=='string')return null
  const s=raw.replace(/\$/g,'').toUpperCase()
  const m=s.match(/^([A-Z]+)(\d+)$/)
  if(!m)return null
  const c=m[1].split('').reduce((n,ch)=>n*26+(ch.charCodeAt(0)-64),0)-1
  return{r:parseInt(m[2])-1,c}
}
const C={
  bg:"#f0f4f8",panel:"#ffffff",panel2:"#f3f6fa",
  border:"#dde3ec",accent:"#2563eb",
  gold:"#d97706",red:"#dc2626",blue:"#0284c7",purple:"#7c3aed",
  muted:"#6b7280",text:"#111827",green:"#059669"
}
const GROUP_COLORS=["#2563eb","#059669","#d97706","#dc2626","#7c3aed","#ea580c","#0891b2","#db2777"]
const DEFAULT_QS=[
  {seq:1,question:"计数函数count，在选择数据区域时，要选择以下哪一类数据？",options:["非空单元格","包含数字单元格","空白单元格","满足条件单元格"],correct_index:3,points:10,time_limit:15},
  {seq:2,question:"要计算农产品销售表中，各商品的总销量，应使用以下哪一个函数？",options:["countif","sum","sumif","if"],correct_index:4,points:10,time_limit:10},
  {seq:3,question:"判断是否同时满足多条件，应用以下哪一个函数？",options:["if","and","or","countif"],correct_index:3,points:10,time_limit:12},
  {seq:4,question:"只统计销量大于 200的产品的平均单价，直接用 AVERAGE 可以实现吗？",options:["可以，AVERAGE 会自动筛选","不可以，需要用 AVERAGEIF 函数","可以，直接选数据区域即可","不可以，应使用 COUNT 函数"],correct_index:3,points:10,time_limit:12},
 ]
const TASK={
  maxScore:100,timeLimit:600,
  rawHtml:`<p>春季电商大促 — 精选商品推荐</p>
<p>欢迎来到本季最受期待的电商大促活动！以下商品均为限时特惠，数量有限，先到先得。</p>
<p>潮流服饰</p><p>本季主打简约风格与高性价比，适合日常通勤与休闲出行。</p>
<p>数码电器</p><p>全系旗舰产品降价幅度最高达 30%，含保修与正品认证。</p>
<p>美妆护肤</p><p>精选国际大牌与国货新星，买二送一，直播间专属优惠码 PROMO2025。</p>
<p>活动有效期至月底，请尽快下单。</p>`,
  targetHtml:`<h1>春季电商大促 — 精选商品推荐</h1>
<p>欢迎来到本季最受期待的电商大促活动！以下商品均为<strong>限时特惠</strong>，数量有限，先到先得。</p>
<h2 style="color:#2563eb">潮流服饰</h2><p>本季主打简约风格与高性价比，适合日常通勤与休闲出行。</p>
<h2 style="color:#dc2626">数码电器</h2><p>全系旗舰产品<strong>降价幅度最高达 30%</strong>，含保修与正品认证。</p>
<h2 style="color:#059669">美妆护肤</h2><p>精选国际大牌与国货新星，<strong>买二送一</strong>，直播间专属优惠码 PROMO2025。</p>
<table border="1" style="border-collapse:collapse;width:100%"><tr><th>商品</th><th>单价</th><th>折扣价</th><th>备注</th></tr><tr><td>休闲上衣</td><td>199</td><td>149</td><td>限量200件</td></tr><tr><td>无线耳机</td><td>399</td><td>279</td><td>赠品耳机包</td></tr><tr><td>护肤套装</td><td>580</td><td>399</td><td>买二送一</td></tr></table>
<p style="color:#777;font-size:12px">活动有效期至月底，请尽快下单。</p>`,
  reqs:[
    {id:"h1",type:"h1",pts:20,desc:"将大标题设为 H1 样式"},
    {id:"h2",type:"h2",min:3,pts:20,desc:"将三个分类名设为 H2（≥3 个）"},
    {id:"table",type:"table",min_rows:3,min_cols:2,pts:20,desc:"插入 ≥3行×2列 价格对比表格"},
    {id:"bold",type:"bold",min:2,pts:20,desc:"促销词加粗（≥2 处）"},
    {id:"color_h2",type:"color_h2",min:3,pts:20,desc:"为三个 H2 标题各添加文字颜色"},
  ]
}
function hasColorApplied(h){
  if(h.style.color&&h.style.color!==""&&h.style.color!=="inherit")return true
  if(h.querySelector("font[color]"))return true
  for(const el of h.querySelectorAll("[style]")){if(el.style.color&&el.style.color!==""&&el.style.color!=="inherit")return true}
  return false
}
function evalReqs(el,reqs){
  const nd=new Set()
  for(const r of reqs){
    switch(r.type){
      case "h1":if(el.querySelector("h1"))nd.add(r.id);break
      case "h2":if(el.querySelectorAll("h2").length>=(r.min||1))nd.add(r.id);break
      case "table":{const t=el.querySelector("table");if(t){const rows=t.querySelectorAll("tr").length;let mx=0;t.querySelectorAll("tr").forEach(tr=>{const c=tr.querySelectorAll("td,th").length;if(c>mx)mx=c});if(rows>=(r.min_rows||1)&&mx>=(r.min_cols||1))nd.add(r.id)}break}
      case "bold":{const be=el.querySelectorAll("b,strong");const bs=Array.from(el.querySelectorAll("[style]")).filter(e=>{const fw=e.style.fontWeight;return fw==="bold"||fw==="700"||fw==="800"||fw==="900"});if(be.length+bs.length>=(r.min||1))nd.add(r.id);break}
      case "color_h2":{const colored=Array.from(el.querySelectorAll("h2")).filter(h=>hasColorApplied(h));if(colored.length>=(r.min||1))nd.add(r.id);break}
      case "align":{const al=Array.from(el.querySelectorAll("[style],[align]")).filter(e=>e.style.textAlign==="center"||e.getAttribute("align")==="center");if(al.length>=(r.min||1))nd.add(r.id);break}
      case "list":if(el.querySelector("ul,ol"))nd.add(r.id);break
      case "indent_first":{const ind=Array.from(el.querySelectorAll("[style]")).filter(e=>{const ti=e.style.textIndent;if(!ti||ti==="0px"||ti==="0")return false;return parseFloat(ti)>0});if(ind.length>=(r.min||1))nd.add(r.id);break}
      case "line_height":{const mv=parseFloat(r.min_value)||1.5;const lh=Array.from(el.querySelectorAll("[style]")).filter(e=>{const v=parseFloat(e.style.lineHeight);return!isNaN(v)&&v>=mv});if(lh.length>=(r.min||1))nd.add(r.id);break}
      case "space_before":{const mp=parseFloat(r.min_px)||12;const sp=Array.from(el.querySelectorAll("[style]")).filter(e=>(parseFloat(e.style.marginTop)||0)>=mp);if(sp.length>=(r.min||1))nd.add(r.id);break}
      case "space_after":{const mp=parseFloat(r.min_px)||12;const sp=Array.from(el.querySelectorAll("[style]")).filter(e=>(parseFloat(e.style.marginBottom)||0)>=mp);if(sp.length>=(r.min||1))nd.add(r.id);break}
      case "indent_block":{const mp=parseFloat(r.min_px)||24;const ind=Array.from(el.querySelectorAll("[style],blockquote")).filter(e=>e.nodeName==="BLOCKQUOTE"||(parseFloat(e.style.marginLeft)||0)>=mp);if(ind.length>=(r.min||1))nd.add(r.id);break}
    }
  }
  return nd
}
const REQ_TYPES={
  h1:{label:"H1大标题",toolbar:"h1",params:[],hint:"选中大标题，点工具栏 H1"},
  h2:{label:"H2小标题",toolbar:"h2",params:[{k:"min",label:"至少几个",default:1}],hint:"选中各小标题，点工具栏 H2"},
  table:{label:"插入表格",toolbar:"table",params:[{k:"min_rows",label:"至少几行（含表头）",default:3},{k:"min_cols",label:"至少几列",default:2}],hint:"点工具栏「插入表格」"},
  bold:{label:"加粗文字",toolbar:"bold",params:[{k:"min",label:"至少几处",default:2}],hint:"选中文字，点工具栏「加粗」"},
  color_h2:{label:"H2标题颜色",toolbar:"color",params:[{k:"min",label:"至少几个H2上色",default:3}],hint:"选中H2内文字，点「文字颜色」选色"},
  align:{label:"居中对齐",toolbar:"align",params:[{k:"min",label:"至少几处",default:1}],hint:"选中文字，点工具栏「居中」"},
  list:{label:"插入列表",toolbar:"list",params:[{k:"type",label:"类型(ul/ol)",default:"ul"}],hint:"点工具栏「无序列表」或「有序列表」"},
  indent_first:{label:"首行缩进",toolbar:"indent_first",params:[{k:"min",label:"至少几段",default:1}],hint:"光标置于段落内，点「首行缩进」按钮"},
  line_height:{label:"行距设置",toolbar:"line_height",params:[{k:"min",label:"至少几处",default:1},{k:"min_value",label:"最小行距(如1.5)",default:1.5}],hint:"光标置于段落，用「行距」下拉菜单设置"},
  space_before:{label:"段前间距",toolbar:"space_before",params:[{k:"min",label:"至少几段",default:1},{k:"min_px",label:"最小段前距px",default:12}],hint:"光标置于段落，用「段前间距」菜单设置"},
  space_after:{label:"段后间距",toolbar:"space_after",params:[{k:"min",label:"至少几段",default:1},{k:"min_px",label:"最小段后距px",default:12}],hint:"光标置于段落，用「段后间距」菜单设置"},
  indent_block:{label:"左右缩进",toolbar:"indent_block",params:[{k:"min",label:"至少几处",default:1},{k:"min_px",label:"最小缩进px",default:24}],hint:"光标置于段落，点「增加缩进」按钮"},
}
const RULE_TYPES=[
  {type:"h1",label:"H1 大标题",params:[],defaultDesc:"将大标题设为 H1 样式"},
  {type:"h2_count",label:"H2 小标题数量",params:[{key:"count",label:"最少数量",default:3}],defaultDesc:"将 {count} 个小标题设为 H2"},
  {type:"table",label:"插入表格",params:[{key:"rows",label:"最少行数",default:3},{key:"cols",label:"最少列数",default:2}],defaultDesc:"插入 ≥{rows}行×{cols}列 表格"},
  {type:"bold",label:"文字加粗",params:[{key:"count",label:"最少处数",default:2}],defaultDesc:"关键词加粗（≥{count} 处）"},
  {type:"color_h2",label:"H2 标题颜色",params:[{key:"count",label:"最少数量",default:3}],defaultDesc:"为 {count} 个 H2 标题设置颜色"},
  {type:"align_center",label:"居中对齐",params:[{key:"count",label:"最少处数",default:1}],defaultDesc:"至少 {count} 处居中对齐"},
]
const genCode=()=>Math.random().toString(36).slice(2,7).toUpperCase()
const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
const F="'Noto Sans SC',sans-serif"
const FM="'DM Mono','Courier New',monospace"
const BG_COLS=["#fef3c7","#dbeafe","#dcfce7","#fce7f3","#ede9fe","#ffedd5","#f1f5f9","#fee2e2"]
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
  <div onClick={onClick} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,.07)",cursor:onClick?"pointer":undefined,...style}}>
    {children}
  </div>
)
const inp=(extra={})=>({
  width:"100%",padding:"10px 14px",borderRadius:9,border:`1px solid ${C.border}`,
  background:"rgba(0,0,0,.03)",color:C.text,fontSize:13,
  boxSizing:"border-box",fontFamily:F,outline:"none",...extra
})
const EXCEL_RAW=[
  ['KH001','普通会员','202X-01-15','广东',638,'是'],['KH002','黄金会员','202X-03-22','浙江',1580,'是'],
  ['KH003','白金会员','202X-02-10','北京',3260,'是'],['KH004','普通会员','202X-05-08','湖南',296,'否'],
  ['KH005','白银会员','202X-04-16','江苏',890,'是'],['KH006','普通会员','202X-06-23','上海',450,'否'],
  ['KH007','黄金会员','202X-01-30','四川',1680,'是'],['KH008','普通会员','202X-07-11','重庆',358,'否'],
  ['KH009','白银会员','202X-03-05','湖北',920,'是'],['KH010','白金会员','202X-02-18','福建',2850,'是'],
  ['KH011','黄金会员','202X-05-27','河南',1420,'是'],['KH012','普通会员','202X-06-09','陕西',580,'否'],
  ['KH013','普通会员','202X-04-30','天津',720,'否'],['KH014','普通会员','202X-07-25','安徽',398,'否'],
  ['KH015','白银会员','202X-01-08','广西',850,'是'],['KH016','普通会员','202X-03-14','云南',420,'否'],
  ['KH017','黄金会员','202X-05-12','贵州',1360,'是'],['KH018','普通会员','202X-06-17','甘肃',560,'否'],
  ['KH019','白银会员','202X-02-24','青海',980,'是'],['KH020','黄金会员','202X-04-03','宁夏',1250,'是'],
  ['KH021','白金会员','202X-01-22','黑龙江',3580,'是'],['KH022','普通会员','202X-03-30','吉林',650,'否'],
  ['KH023','黄金会员','202X-05-01','辽宁',1720,'是'],['KH024','普通会员','202X-06-28','内蒙古',480,'否'],
  ['KH025','白银会员','202X-02-05','新疆',1050,'是'],['KH026','黄金会员','202X-04-19','海南',1480,'是'],
  ['KH027','普通会员','202X-07-04','西藏',380,'否'],['KH028','普通会员','202X-01-12','台湾',750,'否'],
  ['KH029','白金会员','202X-03-18','香港',2980,'是'],['KH030','黄金会员','202X-05-21','澳门',1650,'是'],
]
const EXCEL_COL_LABELS=['客户ID','会员等级','注册时间','所属省份','累计消费金额（元）','是否复购','客户消费排名','等级','会员数量','销售金额总和']
const EXCEL_COL_LETTERS=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
const EXCEL_COL_W=[72,82,96,76,140,66,96,76,80,120]
const EXCEL_SUMMARY=['普通会员','白银会员','白金会员','黄金会员']

function Home({onTeacher,onStudent}){
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0f4ff 0%,#e8f4f8 100%)",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:F,padding:24,gap:48}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,letterSpacing:5,color:"#94a3b8",marginBottom:16,fontFamily:FM}}>信息技术基础 · 教学工具</div>
        <div style={{fontSize:72,fontWeight:900,color:"#0f172a",lineHeight:1,letterSpacing:-2}}>
          录<span style={{color:C.accent}}>录</span>
        </div>
        <div style={{fontSize:13,color:C.muted,marginTop:16,lineHeight:2.2}}>
          签到 &nbsp;·&nbsp; 抢答 &nbsp;·&nbsp; 小组讨论 &nbsp;·&nbsp; 实操竞赛
        </div>
      </div>
      <div style={{display:"flex",gap:14}}>
        <button onClick={onTeacher} style={{padding:"18px 48px",borderRadius:12,
          border:`2px solid ${C.accent}`,background:"transparent",color:C.accent,
          fontSize:16,fontWeight:700,fontFamily:F,cursor:"pointer"}}>教师端</button>
        <button onClick={onStudent} style={{padding:"18px 48px",borderRadius:12,
          border:"none",background:C.accent,color:"#ffffff",
          fontSize:16,fontWeight:700,fontFamily:F,cursor:"pointer"}}>学生端</button>
      </div>
    </div>
  )
}
function TSetup({onCreate}){
  const [title,setTitle]=useState("信息技术基础教学课堂")
  const [timeLab,setTimeLab]=useState(600)
  const [groups,setGroups]=useState([
    {seq:1,name:"第一组",color:GROUP_COLORS[0]},{seq:2,name:"第二组",color:GROUP_COLORS[1]},
    {seq:3,name:"第三组",color:GROUP_COLORS[2]},{seq:4,name:"第四组",color:GROUP_COLORS[3]},
  ])
  const [qs,setQs]=useState(DEFAULT_QS.map(q=>({...q,options:[...q.options]})))
  const [discussions,setDiscussions]=useState([
    {topic:"在农产品销售表中，想要对“实付金额“大于500的产品，定为”热销产品“，使用MAX函数能实现吗？"},
    {topic:"已知农产品销售情况表包含字段：产品名称（A列）、销售数量（B列）、单价（C列），请使用IF 函数完成逻辑判断，要求如下：1.判断规则：若销售数量≥50，判定为「热销产品」，否则判定为「普通产品」；2.写出对应单元格的 IF 函数公式"},
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
      .then(({data})=>{if(data){setLayoutTasks(data);if(data[0]){setLayoutTaskId(data[0].id);setTimeLab(data[0].time_limit)}}})
    sb.from("lulu_excel_tasks").select("id,title,time_limit").order("created_at",{ascending:false})
      .then(({data})=>{if(data){setExcelTasks(data);if(data[0])setExcelTaskId(data[0].id)}})
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
      excel_task_id:excelTaskId||null,time_limit:timeLab,phase:"checkin",started_at:new Date().toISOString()
    }).select().single()
    if(error){alert("创建失败:"+error.message);setLoading(false);return}
    await sb.from("lulu_groups").insert(groups.map(g=>({...g,session_id:sess.id})))
    const validQs=qs.filter(q=>q.question.trim())
    if(validQs.length)await sb.from("word_lab_questions").insert(validQs.map(q=>({...q,session_id:sess.id})))
    const validDis=discussions.filter(d=>d.topic.trim())
    if(validDis.length)await sb.from("lulu_discussions").insert(validDis.map(d=>({topic:d.topic,session_id:sess.id})))
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
        <Card style={{marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 160px",gap:16}}>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:7}}>课堂名称</div>
              <input value={title} onChange={e=>setTitle(e.target.value)} style={inp()}/>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:7}}>时限（秒）</div>
              <input type="number" value={timeLab} onChange={e=>setTimeLab(Number(e.target.value))} style={inp({color:C.accent})}/>
            </div>
          </div>
          <div style={{marginTop:14}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:8}}>选择排版题目</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {layoutTasks.map(t=>(
                <button key={t.id} onClick={()=>{setLayoutTaskId(t.id);setTimeLab(t.time_limit)}} style={{
                  padding:"8px 16px",borderRadius:9,cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
                  border:`2px solid ${t.id===layoutTaskId?C.gold:C.border}`,
                  background:t.id===layoutTaskId?"rgba(217,119,6,.08)":"transparent",
                  color:t.id===layoutTaskId?C.gold:C.muted}}>{t.title}</button>
              ))}
              {!layoutTasks.length&&<span style={{fontSize:13,color:C.muted}}>题库为空，请先创建题目</span>}
            </div>
          </div>
          <div style={{marginTop:14}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:8}}>选择 Excel 题目（可选）</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={()=>setExcelTaskId(null)} style={{
                padding:"8px 16px",borderRadius:9,cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
                border:`2px solid ${!excelTaskId?C.gold:C.border}`,
                background:!excelTaskId?"rgba(217,119,6,.08)":"transparent",
                color:!excelTaskId?C.gold:C.muted}}>不使用</button>
              {excelTasks.map(t=>(
                <button key={t.id} onClick={()=>setExcelTaskId(t.id)} style={{
                  padding:"8px 16px",borderRadius:9,cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,
                  border:`2px solid ${t.id===excelTaskId?C.gold:C.border}`,
                  background:t.id===excelTaskId?"rgba(217,119,6,.08)":"transparent",
                  color:t.id===excelTaskId?C.gold:C.muted}}>{t.title}</button>
              ))}
            </div>
          </div>
        </Card>
        <div style={{display:"flex",gap:4,background:C.panel,padding:5,borderRadius:10,marginBottom:16,width:"fit-content"}}>
          {tabBtn("groups","小组设置")}{tabBtn("quiz","抢答题目")}{tabBtn("discuss","讨论议题")}
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
                  <span style={{flex:1,fontSize:13}}>{q.question||"未填写"}</span>
                  <span style={{fontSize:11,color:C.muted}}>{q.points}分·{q.time_limit}s</span>
                </div>
                {editQ===i&&(
                  <div style={{padding:14,borderTop:`1px solid ${C.border}`}}>
                    <textarea value={q.question} onChange={e=>updQ(i,"question",e.target.value)} rows={2}
                      style={{...inp(),resize:"vertical",marginBottom:12}}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      {q.options.map((opt,j)=>(
                        <div key={j} style={{display:"flex",gap:8,alignItems:"center"}}>
                          <button onClick={()=>updQ(i,"correct_index",j)} style={{
                            width:28,height:28,borderRadius:7,
                            border:`2px solid ${j===q.correct_index?C.accent:C.border}`,
                            background:j===q.correct_index?"rgba(37,99,235,.15)":"transparent",
                            color:j===q.correct_index?C.accent:C.muted,cursor:"pointer",
                            fontSize:12,fontWeight:700,fontFamily:FM,flexShrink:0}}>{"ABCD"[j]}</button>
                          <input value={opt} onChange={e=>updOpt(i,j,e.target.value)} style={inp()}/>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:5}}>分值</div>
                        <input type="number" value={q.points} onChange={e=>updQ(i,"points",Number(e.target.value))} min={1} style={inp({width:70,color:C.accent})}/>
                      </div>
                      <div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:5}}>时限(秒)</div>
                        <input type="number" value={q.time_limit} onChange={e=>updQ(i,"time_limit",Number(e.target.value))} min={5} style={inp({width:70})}/>
                      </div>
                      <div style={{flex:1}}/>
                      <Btn small onClick={()=>delQ(i)} style={{background:C.red}}>删除</Btn>
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
              <Btn small onClick={()=>setDiscussions(p=>[...p,{topic:""}])} color={C.purple}>＋ 新增</Btn>
            </div>
            {discussions.map((d,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                <input value={d.topic} onChange={e=>updDis(i,e.target.value)} placeholder="输入讨论议题…" style={{...inp(),flex:1}}/>
                <button onClick={()=>setDiscussions(p=>p.filter((_,idx)=>idx!==i))}
                  style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:18}}>×</button>
              </div>
            ))}
          </Card>
        )}
        <div style={{marginTop:24}}>
          <Btn onClick={create} disabled={loading}>{loading?"创建中…":"创建课堂房间 →"}</Btn>
        </div>
      </div>
    </div>
  )
}
// ── FINAL RANK SCREEN ───────────────────────────────────────
function FinalRankScreen({studentRank,groupRank,groups,sess}){
  const [show,setShow]=useState(false)
  const [showPodium,setShowPodium]=useState(false)
  const [showList,setShowList]=useState(false)
  useEffect(()=>{
    setTimeout(()=>setShow(true),100)
    setTimeout(()=>setShowPodium(true),600)
    setTimeout(()=>setShowList(true),1400)
  },[])
  const top3=studentRank.slice(0,3)
  const rest=studentRank.slice(3)
  const podiumOrder=[1,0,2] // 2nd, 1st, 3rd
  const podiumH=["120px","160px","90px"]
  const podiumColor=["#94a3b8","#f59e0b","#b45309"]
  const podiumLabel=["🥈","🥇","🥉"]
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",
      fontFamily:F,color:"white",padding:"20px 24px",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:32,
        transform:show?"translateY(0)":"translateY(-30px)",
        opacity:show?1:0,transition:"all .6s ease"}}>
        <div style={{fontSize:11,letterSpacing:6,color:"rgba(255,255,255,.4)",marginBottom:8,fontFamily:FM}}>
          {sess?.title||"信息技术基础教学课堂"} · 最终结算
        </div>
        <div style={{fontSize:48,fontWeight:900,letterSpacing:-2,background:"linear-gradient(135deg,#f59e0b,#fbbf24,#f59e0b)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          🏆 最终排名
        </div>
      </div>

      {/* Podium - top 3 */}
      {studentRank.length>=1&&(
        <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:16,marginBottom:36,height:220}}>
          {podiumOrder.map((rankIdx,pos)=>{
            const student=top3[rankIdx]
            if(!student) return <div key={pos} style={{width:140}}/>
            const g=groups.find(x=>x.id===student.group_id)
            const delay=pos===1?0:pos===0?200:400
            return(
              <div key={rankIdx} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                transform:showPodium?"translateY(0)":"translateY(60px)",
                opacity:showPodium?1:0,
                transition:`all .7s ease ${delay}ms`}}>
                {/* Student card */}
                <div style={{textAlign:"center",padding:"10px 14px",borderRadius:12,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",
                  backdropFilter:"blur(8px)",minWidth:130}}>
                  <div style={{fontSize:24,marginBottom:4}}>{podiumLabel[pos]}</div>
                  <div style={{fontSize:15,fontWeight:900,marginBottom:2}}>{student.name}</div>
                  {g&&<div style={{fontSize:11,color:g.color,fontWeight:700,marginBottom:6}}>{g.name}</div>}
                  <div style={{fontSize:28,fontWeight:900,color:podiumColor[pos],fontFamily:FM}}>{student.total}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:3}}>
                    抢答{student.quiz} · 排版{student.lab}{student.bonus>0?` · 讨论+${student.bonus}`:""}
                  </div>
                </div>
                {/* Podium block */}
                <div style={{
                  width:130,height:podiumH[pos],borderRadius:"8px 8px 0 0",
                  background:`linear-gradient(180deg,${podiumColor[pos]}44,${podiumColor[pos]}22)`,
                  border:`1px solid ${podiumColor[pos]}66`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:32,fontWeight:900,color:podiumColor[pos],fontFamily:FM}}>
                  {rankIdx+1}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Group ranking + rest of individual ranking */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:960,margin:"0 auto",
        transform:showList?"translateY(0)":"translateY(30px)",
        opacity:showList?1:0,transition:"all .6s ease"}}>

        {/* Group ranking */}
        <div>
          <div style={{fontSize:13,letterSpacing:2,color:"rgba(255,255,255,.4)",
            marginBottom:14,fontFamily:FM,fontWeight:700}}>小组排名</div>
          {groupRank.map((g,i)=>(
            <div key={g.id} style={{
              marginBottom:10,padding:"14px 18px",borderRadius:12,
              background:i===0?"rgba(245,200,66,.12)":"rgba(255,255,255,.06)",
              border:`1px solid ${i===0?"rgba(245,200,66,.3)":"rgba(255,255,255,.08)"}`,
              display:"flex",alignItems:"center",gap:12,
              transform:showList?"translateX(0)":"translateX(-20px)",
              opacity:showList?1:0,
              transition:`all .5s ease ${i*100}ms`}}>
              <span style={{fontSize:22,minWidth:32}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
              <div style={{width:10,height:10,borderRadius:2,background:g.color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:900}}>{g.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>
                  抢答{g.quizSum} · 排版均分{g.labAvg} · {g.memberCount}人
                </div>
              </div>
              <div style={{fontSize:30,fontWeight:900,color:i===0?"#f59e0b":"white",fontFamily:FM}}>
                {g.total}
              </div>
            </div>
          ))}
        </div>

        {/* Individual rank 4+ */}
        <div>
          <div style={{fontSize:13,letterSpacing:2,color:"rgba(255,255,255,.4)",
            marginBottom:14,fontFamily:FM,fontWeight:700}}>个人完整排名</div>
          {studentRank.map((r,i)=>{
            const g=groups.find(x=>x.id===r.group_id)
            return(
              <div key={r.name} style={{
                marginBottom:8,padding:"10px 14px",borderRadius:10,
                background:i<3?"rgba(245,200,66,.08)":"rgba(255,255,255,.05)",
                border:`1px solid ${i<3?"rgba(245,200,66,.2)":"rgba(255,255,255,.06)"}`,
                display:"flex",alignItems:"center",gap:10,
                transform:showList?"translateX(0)":"translateX(20px)",
                opacity:showList?1:0,
                transition:`all .5s ease ${i*80}ms`}}>
                <span style={{fontSize:i<3?18:13,minWidth:26,color:i<3?"#f59e0b":"rgba(255,255,255,.4)",fontFamily:FM,fontWeight:900}}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                </span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{r.name}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.35)",marginTop:1}}>
                    {g&&<span style={{color:g.color}}>{g.name} · </span>}
                    抢答{r.quiz}{r.lab>0?` · 排版${r.lab}`:""}{r.bonus>0?` · 讨论+${r.bonus}`:""}
                  </div>
                </div>
                <span style={{fontSize:i<3?20:16,fontWeight:900,color:i<3?"#f59e0b":"rgba(255,255,255,.8)",fontFamily:FM}}>
                  {r.total}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

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
  const [bonusStep,setBonusStep]=useState(5)
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
        ({new:r})=>setCheckins(p=>p.some(x=>x.student_name===r.student_name)?p.map(x=>x.student_name===r.student_name?r:x):[...p,r]))
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
    // Fallback poll every 6s in case realtime misses events
    const pollRef=setInterval(()=>{
      sb.from("word_lab_checkins").select().eq("session_id",init.id)
        .then(({data})=>data&&setCheckins(data))
    },6000)
    return()=>{sb.removeChannel(ch);clearInterval(timerRef.current);clearInterval(pollRef)}
  },[init.id])
  useEffect(()=>{
    if(sess.phase==="quiz"&&sess.current_question>0){
      const q=questions.find(x=>x.seq===sess.current_question)
      if(!q)return
      setQTimer(q.time_limit)
      clearInterval(timerRef.current)
      timerRef.current=setInterval(()=>setQTimer(t=>{if(t<=1){clearInterval(timerRef.current);return 0}return t-1}),1000)
    }
    return()=>clearInterval(timerRef.current)
  },[sess.phase,sess.current_question,questions])
  const setPhase=async p=>{await sb.from("word_lab_sessions").update({phase:p}).eq("id",sess.id)}
  const pushQ=async seq=>{await sb.from("word_lab_sessions").update({current_question:seq}).eq("id",sess.id)}
  const toggleDis=async d=>{
    const newActive=!d.is_active
    setDiscussions(p=>p.map(x=>({...x,is_active:x.id===d.id?newActive:false})))
    await sb.from("lulu_discussions").update({is_active:false}).eq("session_id",sess.id)
    if(newActive)await sb.from("lulu_discussions").update({is_active:true}).eq("id",d.id)
  }
  const endSession=async()=>{await sb.from("word_lab_sessions").update({phase:"finished",status:"finished"}).eq("id",sess.id)}
  const curQ=questions.find(q=>q.seq===sess.current_question)
  const curAnswers=answers.filter(a=>a.question_id===curQ?.id)
  const activeDis=discussions.find(d=>d.is_active)
  const activePosts=posts.filter(p=>p.discussion_id===activeDis?.id)
  const quizScores={}; answers.forEach(a=>{quizScores[a.student_name]=(quizScores[a.student_name]||0)+a.points_earned})
  // Sum ALL phases per student
  const labScores={}; submissions.forEach(s=>{labScores[s.student_name]=(labScores[s.student_name]||0)+s.score})
  const allStudents=[...new Set(checkins.map(c=>c.student_name))]
  const studentRank=allStudents.map(name=>{
    const ci=checkins.find(c=>c.student_name===name)
    const bonus=ci?.bonus_pts||0
    return{name,group_id:ci?.group_id,quiz:quizScores[name]||0,lab:labScores[name]||0,bonus,total:(quizScores[name]||0)+(labScores[name]||0)+bonus}
  }).sort((a,b)=>b.total-a.total)
  const groupRank=groups.map(g=>{
    const members=checkins.filter(c=>c.group_id===g.id)
    const names=members.map(m=>m.student_name)
    const labAvg=names.length?Math.round(names.reduce((s,n)=>s+(labScores[n]||0),0)/names.length):0
    const quizSum=names.reduce((s,n)=>s+(quizScores[n]||0),0)
    return{...g,memberCount:names.length,labAvg,quizSum,total:quizSum+labAvg}
  }).sort((a,b)=>b.total-a.total)
  const phases=[["checkin","签到"],["quiz","抢答"],["quiz_result","结算"],["discussion","讨论"],["lab","Word排版"],["excel","Excel制表"],["files","文件审阅"],["finished","结果"]]
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{display:"flex",alignItems:"center",gap:16,padding:"12px 24px",
        background:C.panel,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
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
        <Btn small onClick={endSession} style={{background:C.red}}>结束</Btn>
        {onBack&&<Btn small onClick={onBack} style={{background:"rgba(0,0,0,.06)",color:C.text}}>← 后台</Btn>}
      </div>
      <div style={{padding:24}}>
        {sess.phase==="checkin"&&(
          <div>
            <div style={{display:"flex",gap:14,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:14,color:C.muted}}>学生签到后可自选小组</span>
              <Btn small onClick={()=>setPhase("quiz")} color={C.blue}>→ 开始抢答</Btn>
              <Btn small onClick={()=>setPhase("discussion")} color={C.purple}>→ 直接讨论</Btn>
              <Btn small onClick={()=>setPhase("lab")} color={C.accent}>→ Word 排版</Btn>
              <Btn small onClick={()=>{setPhase("excel");pushQ(0)}} color={C.gold}>→ Excel 制表</Btn>
              <Btn small onClick={()=>setPhase("files")} color={C.green}>→ 文件审阅</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(groups.length,4)},1fr)`,gap:14}}>
              {groups.map(g=>{
                const members=checkins.filter(c=>c.group_id===g.id)
                return(
                  <Card key={g.id} style={{borderTop:`3px solid ${g.color}`}}>
                    <div style={{fontSize:14,fontWeight:700,color:g.color,marginBottom:8}}>{g.name}</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:10}}>{members.length} 人</div>
                    {members.map(m=>(
                      <div key={m.student_name} style={{fontSize:13,padding:"6px 10px",borderRadius:7,background:"rgba(0,0,0,.03)",marginBottom:6}}>✓ {m.student_name}</div>
                    ))}
                  </Card>
                )
              })}
            </div>
          </div>
        )}
        {sess.phase==="quiz"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:20}}>
            <div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
                {questions.map(q=>(
                  <button key={q.seq} onClick={()=>pushQ(q.seq)} style={{
                    padding:"10px 18px",borderRadius:9,border:`2px solid ${sess.current_question===q.seq?C.accent:C.border}`,
                    background:sess.current_question===q.seq?"rgba(37,99,235,.08)":"transparent",
                    color:sess.current_question===q.seq?C.accent:C.muted,
                    cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FM}}>Q{q.seq}</button>
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
        {sess.phase==="quiz_result"&&(
          <QuizResultScreen sessionId={sess.id} groups={groups} isTeacher={true}
            onNext={()=>setPhase("discussion")} onLab={()=>setPhase("lab")}/>
        )}
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
              <div style={{marginTop:14}}><Btn small onClick={()=>setPhase("lab")} color={C.accent} full>→ 开始排版</Btn></div>
            </div>
            <div>
              {activeDis?(
                <>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"12px 16px",
                    background:"rgba(124,58,237,.08)",borderRadius:10,border:`1px solid ${C.purple}44`}}>
                    <div style={{fontSize:15,fontWeight:700,flex:1}}>💬 {activeDis.topic}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                      <span style={{fontSize:11,color:C.muted}}>加分：</span>
                      {[2,3,5,10].map(n=>(
                        <button key={n} onClick={()=>setBonusStep(n)} style={{
                          padding:"3px 9px",borderRadius:6,border:`1px solid ${bonusStep===n?C.gold:C.border}`,
                          background:bonusStep===n?"rgba(217,119,6,.1)":"transparent",
                          color:bonusStep===n?C.gold:C.muted,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:F}}>+{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                    {activePosts.map(p=>{
                      const g=groups.find(x=>x.id===p.group_id)
                      return(
                        <Card key={p.id} style={{borderLeft:`3px solid ${g?.color||C.border}`,padding:"12px 14px"}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,color:g?.color||C.muted,fontWeight:700,marginBottom:5}}>
                                {p.student_name}{g?` · ${g.name}`:""}
                                {(checkins.find(c=>c.student_name===p.student_name)?.bonus_pts||0)>0&&(
                                  <span style={{marginLeft:6,fontSize:10,color:C.gold,background:"rgba(217,119,6,.1)",
                                    padding:"1px 6px",borderRadius:4,fontWeight:700}}>
                                    +{checkins.find(c=>c.student_name===p.student_name)?.bonus_pts}分
                                  </span>
                                )}
                              </div>
                              <div style={{fontSize:13,lineHeight:1.6}}>{p.content}</div>
                            </div>
                            <button onClick={async()=>{
                              const ci=checkins.find(c=>c.student_name===p.student_name)
                              if(!ci)return
                              const newPts=(ci.bonus_pts||0)+bonusStep
                              await sb.from("word_lab_checkins").update({bonus_pts:newPts})
                                .eq("session_id",sess.id).eq("student_name",p.student_name)
                              setCheckins(prev=>prev.map(c=>c.student_name===p.student_name?{...c,bonus_pts:newPts}:c))
                            }} style={{
                              padding:"5px 10px",borderRadius:8,border:`1px solid ${C.gold}`,
                              background:"rgba(217,119,6,.08)",color:C.gold,cursor:"pointer",
                              fontSize:12,fontWeight:700,fontFamily:F,flexShrink:0}}>＋{bonusStep}</button>
                          </div>
                        </Card>
                      )
                    })}
                    {!activePosts.length&&<div style={{fontSize:13,color:C.muted,gridColumn:"1/-1",padding:20}}>等待学生发言…</div>}
                  </div>
                </>
              ):(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:C.muted,fontSize:14}}>← 点击左侧议题激活</div>
              )}
            </div>
          </div>
        )}
        {sess.phase==="lab"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:20}}>
            <div>
              {groups.map(g=>{
                const members=checkins.filter(c=>c.group_id===g.id)
                const avgScore=members.length?Math.round(members.reduce((s,m)=>{
                  const sub=submissions.find(x=>x.student_name===m.student_name&&x.phase==="lab")
                  return s+(sub?.score||0)},0)/members.length):0
                return(
                  <Card key={g.id} style={{marginBottom:14,borderLeft:`3px solid ${g.color}`}}>
                    <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
                      <span style={{fontSize:14,fontWeight:700,color:g.color,flex:1}}>{g.name}</span>
                      <span style={{fontSize:12,color:C.muted}}>均分 <span style={{color:g.color,fontWeight:900,fontSize:20,fontFamily:FM}}>{avgScore}</span></span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                      {members.map(m=>{
                        const sub=submissions.find(x=>x.student_name===m.student_name&&x.phase==="lab")
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
                      <span style={{fontSize:12,color:C.muted}}>均分 <span style={{color:g.color,fontWeight:900,fontSize:18,fontFamily:FM}}>
                        {members.length?Math.round(members.reduce((s,m)=>{
                          const sub=submissions.find(x=>x.student_name===m.student_name&&x.phase==='excel')
                          return s+(sub?.score||0)},0)/members.length):0}
                      </span></span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                      {members.map(m=>{
                        const sub=submissions.find(x=>x.student_name===m.student_name&&x.phase==='excel')
                        const pct=sub?Math.round(sub.score/(sub.max_score||30)*100):0
                        return(
                          <div key={m.student_name} style={{padding:"8px 12px",borderRadius:8,background:"rgba(0,0,0,.03)"}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                              <span>{m.student_name}</span>
                              <span style={{color:C.gold,fontWeight:700,fontFamily:FM}}>{sub?.score||0}</span>
                            </div>
                            <div style={{height:4,borderRadius:2,background:"rgba(0,0,0,.06)"}}>
                              <div style={{height:"100%",borderRadius:2,background:g.color,width:`${Math.min(pct,100)}%`,transition:"width .5s"}}/>
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
        {sess.phase==="files"&&(<FileReviewPanel sessionId={sess.id}/>)}
        {sess.phase==="finished"&&(
          <FinalRankScreen studentRank={studentRank} groupRank={groupRank} groups={groups} sess={sess}/>
        )}
      </div>
    </div>
  )
}
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
      if(c)setCheckins(c);if(a)setAnswers(a);if(q)setQuestions(q)
      setLoaded(true);setTimeout(()=>setShow(true),300)
    })
  },[sessionId])
  if(!loaded)return(<div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a5f 0%,#0f2027 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,.5)",fontFamily:F,fontSize:14}}>加载结算数据…</div>)
  const quizScores={}
  answers.forEach(a=>{quizScores[a.student_name]=(quizScores[a.student_name]||0)+a.points_earned})
  const groupData=groups.map(g=>{
    const members=checkins.filter(c=>c.group_id===g.id)
    const names=members.map(m=>m.student_name)
    const total=names.reduce((s,n)=>s+(quizScores[n]||0),0)
    const top=[...names].sort((a,b)=>(quizScores[b]||0)-(quizScores[a]||0))[0]
    return{...g,members:names.length,total,top,topScore:quizScores[top]||0}
  }).sort((a,b)=>b.total-a.total)
  const allStudents=[...new Set(checkins.map(c=>c.student_name))]
  const indvTop=allStudents.map(name=>({name,score:quizScores[name]||0,group_id:checkins.find(c=>c.student_name===name)?.group_id})).sort((a,b)=>b.score-a.score).slice(0,5)
  const medals=["🥇","🥈","🥉","4️⃣","5️⃣"]
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a5f 0%,#0f2027 100%)",fontFamily:F,color:"white",padding:isTeacher?"24px":"0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:860,padding:"32px 24px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:12,letterSpacing:4,color:"rgba(255,255,255,.5)",marginBottom:8,fontFamily:FM}}>ROUND 1 · 抢答热身</div>
          <div style={{fontSize:36,fontWeight:900,letterSpacing:-1}}>📊 第一阶段结算</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isTeacher?"1fr 280px":"1fr",gap:20,marginBottom:28}}>
          <div>
            {groupData.map((g,i)=>(
              <div key={g.id} style={{marginBottom:12,padding:"16px 20px",borderRadius:14,
                background:i===0?"rgba(245,200,66,.12)":"rgba(255,255,255,.06)",
                border:`1px solid ${i===0?"rgba(245,200,66,.4)":"rgba(255,255,255,.1)"}`,
                transform:show?"translateY(0)":"translateY(20px)",opacity:show?1:0,transition:`all .5s ease ${i*0.12}s`}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:28,minWidth:36}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                      <div style={{width:12,height:12,borderRadius:3,background:g.color,flexShrink:0}}/>
                      <span style={{fontSize:17,fontWeight:900}}>{g.name}</span>
                      <span style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{g.members}人</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:32,fontWeight:900,color:i===0?C.gold:"white",fontFamily:FM}}>{g.total}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>总分</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {isTeacher&&(
            <div>
              <div style={{fontSize:12,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:16,fontFamily:FM}}>个人TOP 5</div>
              {indvTop.map((s,i)=>{
                const g=groups.find(x=>x.id===s.group_id)
                return(
                  <div key={s.name} style={{marginBottom:10,padding:"12px 16px",borderRadius:10,
                    background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",
                    transform:show?"translateX(0)":"translateX(20px)",opacity:show?1:0,transition:`all .5s ease ${i*0.1+0.4}s`}}>
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
        {isTeacher&&(
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <button onClick={onNext} style={{padding:"14px 36px",borderRadius:12,border:`2px solid ${C.purple}`,background:"transparent",color:C.purple,fontSize:15,fontWeight:700,fontFamily:F,cursor:"pointer"}}>→ 进入讨论</button>
            <button onClick={onLab} style={{padding:"14px 36px",borderRadius:12,border:"none",background:C.accent,color:"white",fontSize:15,fontWeight:700,fontFamily:F,cursor:"pointer"}}>→ 开始排版竞赛</button>
          </div>
        )}
        {!isTeacher&&(<div style={{textAlign:"center",color:"rgba(255,255,255,.4)",fontSize:13,marginTop:8}}>等待老师进入下一阶段…</div>)}
      </div>
    </div>
  )
}
function LayoutTaskLibrary({onEdit,onSelect,selectedId}){
  const [tasks,setTasks]=useState([]);const [loading,setLoading]=useState(true)
  const load=async()=>{setLoading(true);const {data}=await sb.from("lulu_layout_tasks").select().order("created_at",{ascending:false});if(data)setTasks(data);setLoading(false)}
  useEffect(()=>{load()},[])
  async function del(id,e){e.stopPropagation();if(!confirm("确定删除这道题？"))return;await sb.from("lulu_layout_tasks").delete().eq("id",id);setTasks(p=>p.filter(t=>t.id!==id))}
  if(loading)return <div style={{padding:40,textAlign:"center",color:C.muted}}>加载中…</div>
  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>排版题库</div><div style={{fontSize:13,color:C.muted,marginTop:2}}>{tasks.length} 道题目</div></div>
        <Btn small onClick={()=>onEdit(null)} color={C.accent}>＋ 新建排版题</Btn>
      </div>
      {!tasks.length&&<Card style={{textAlign:"center",padding:48,color:C.muted}}>暂无题目，点「新建排版题」创建第一道</Card>}
      {tasks.map(t=>(
        <Card key={t.id} style={{marginBottom:12,border:selectedId===t.id?`2px solid ${C.accent}`:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>onSelect&&onSelect(t)}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{t.title}</div>
              {t.description&&<div style={{fontSize:13,color:C.muted,marginBottom:8}}>{t.description}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(t.requirements||[]).map((r,i)=>(
                  <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"rgba(37,99,235,.08)",color:C.accent,border:`1px solid ${C.accent}22`}}>{r.pts}分 · {r.desc}</span>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0,alignItems:"center"}}>
              <Btn small onClick={e=>{e.stopPropagation();onEdit(t)}} style={{background:"rgba(0,0,0,.06)",color:C.text}}>编辑</Btn>
              <button onClick={e=>del(t.id,e)} style={{background:"none",border:"none",color:"rgba(220,38,38,.5)",cursor:"pointer",fontSize:16,lineHeight:1}}>✕</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
function LayoutTaskEditor({task,onSave,onBack}){
  const isNew=!task
  const [title,setTitle]=useState(task?.title||"")
  const [desc,setDesc]=useState(task?.description||"")
  const [rawHtml,setRawHtml]=useState(task?.raw_html||"")
  const [timeLimit,setTimeLimit]=useState(task?.time_limit||600)
  const [reqs,setReqs]=useState(task?.requirements||[])
  const [saving,setSaving]=useState(false)
  const [tab,setTab]=useState("basic")
  const targetRef=useRef(null)
  useEffect(()=>{
    if(tab==="target"&&targetRef.current){
      const base=task?.target_html&&task.target_html.trim()?task.target_html:(task?.raw_html||'')
      if(!targetRef.current.innerHTML.trim())targetRef.current.innerHTML=base
    }
  },[tab])
  function addReq(){setReqs(p=>[...p,{id:"req_"+Date.now(),type:"h1",pts:20,desc:""}])}
  function updReq(i,f,v){setReqs(p=>p.map((r,idx)=>idx===i?{...r,[f]:v}:r))}
  function delReq(i){setReqs(p=>p.filter((_,idx)=>idx!==i))}
  async function save(){
    if(!title.trim()){alert("请填写题目名称");return}
    if(!rawHtml.trim()){alert("请填写学生初始文本");return}
    setSaving(true)
    const targetHtml=targetRef.current?.innerHTML||""
    const payload={title,description:desc,raw_html:rawHtml,
      target_html:targetHtml.replace(/<[^>]*>/g,'').trim()?targetHtml:"",
      requirements:reqs,time_limit:timeLimit}
    let error
    if(isNew){({error}=await sb.from("lulu_layout_tasks").insert(payload))}
    else{({error}=await sb.from("lulu_layout_tasks").update(payload).eq("id",task.id))}
    if(error)alert("保存失败:"+error.message)
    else onSave()
    setSaving(false)
  }
  const tabBtn2=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:700,background:tab===t?C.accent:"transparent",color:tab===t?"white":C.muted}}>{label}</button>
  )
  return(
    <div style={{padding:24,fontFamily:F,color:C.text,maxWidth:900}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>← 返回</button>
        <div style={{fontSize:16,fontWeight:700}}>{isNew?"新建排版题":"编辑排版题"}</div>
        <div style={{flex:1}}/>
        <Btn onClick={save} disabled={saving}>{saving?"保存中…":"保存题目"}</Btn>
      </div>
      <div style={{display:"flex",gap:4,background:C.panel,padding:4,borderRadius:10,marginBottom:20,width:"fit-content",border:`1px solid ${C.border}`}}>
        {tabBtn2("basic","基本信息")}{tabBtn2("target","制作样板")}{tabBtn2("reqs","评分规则")}
      </div>
      {tab==="basic"&&(
        <div style={{display:"grid",gap:16,maxWidth:600}}>
          <Card>
            <div style={{fontSize:12,color:C.muted,marginBottom:7}}>题目名称 *</div>
            <input value={title} onChange={e=>setTitle(e.target.value)} style={inp()}/>
            <div style={{fontSize:12,color:C.muted,marginTop:14,marginBottom:7}}>题目描述（可选）</div>
            <input value={desc} onChange={e=>setDesc(e.target.value)} style={inp()}/>
            <div style={{fontSize:12,color:C.muted,marginTop:14,marginBottom:7}}>排版时限（秒）</div>
            <input type="number" value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))} min={60} style={inp({width:100,color:C.accent})}/>
          </Card>
          <Card>
            <div style={{fontSize:12,color:C.muted,marginBottom:4}}>学生初始文本</div>
            <textarea value={rawHtml} onChange={e=>setRawHtml(e.target.value)} rows={10}
              placeholder={"大标题\n\n第一段正文\n\n小标题一\n\n正文…"}
              style={{...inp(),resize:"vertical",lineHeight:1.7}}/>
          </Card>
        </div>
      )}
      {tab==="target"&&(
        <div>
          <div style={{fontSize:13,color:C.muted,marginBottom:14}}>在下方制作「标准答案」样板文档。</div>
          <div style={{background:"white",padding:"32px 40px",borderRadius:10,border:`1px solid ${C.border}`,minHeight:400}}>
            <div ref={targetRef} contentEditable suppressContentEditableWarning
              style={{minHeight:360,outline:"none",fontSize:14,lineHeight:1.9,color:"#1a1a1a",fontFamily:"Georgia,serif"}}/>
          </div>
        </div>
      )}
      {tab==="reqs"&&(
        <div style={{maxWidth:700}}>
          <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
            <div style={{flex:1,fontSize:13,color:C.muted}}>设置评分规则</div>
            <Btn small onClick={addReq} color={C.blue}>＋ 添加评分项</Btn>
          </div>
          {!reqs.length&&<Card style={{textAlign:"center",padding:40,color:C.muted}}>暂无评分项，点右上角添加</Card>}
          {reqs.map((r,i)=>(
            <Card key={r.id} style={{marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"160px 1fr 80px auto",gap:10,alignItems:"start"}}>
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>检验类型</div>
                  <select value={r.type} onChange={e=>updReq(i,"type",e.target.value)} style={{...inp({padding:"8px 10px"}),cursor:"pointer"}}>
                    {Object.entries(REQ_TYPES).map(([k,v])=>(<option key={k} value={k}>{v.label}</option>))}
                  </select>
                  <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>{REQ_TYPES[r.type]?.hint}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>任务说明</div>
                  <input value={r.desc} onChange={e=>updReq(i,"desc",e.target.value)} style={inp()}/>
                  {(REQ_TYPES[r.type]?.params||[]).length>0&&(
                    <div style={{display:"flex",gap:10,marginTop:8}}>
                      {REQ_TYPES[r.type].params.map(p=>(
                        <div key={p.k}>
                          <div style={{fontSize:10,color:C.muted,marginBottom:3}}>{p.label}</div>
                          <input type="number" min={1} max={20} value={r[p.k]??p.default} onChange={e=>updReq(i,p.k,Number(e.target.value))} style={inp({width:60,padding:"5px 8px",fontSize:13})}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>分值</div>
                  <input type="number" value={r.pts} min={1} max={100} onChange={e=>updReq(i,"pts",Number(e.target.value))} style={inp({color:C.accent,fontWeight:700})}/>
                </div>
                <button onClick={()=>delReq(i)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:20,marginTop:24}}>×</button>
              </div>
            </Card>
          ))}
          {reqs.length>0&&(
            <div style={{marginTop:8,padding:"10px 14px",borderRadius:8,background:"rgba(37,99,235,.06)",border:`1px solid ${C.accent}22`,fontSize:13,color:C.muted}}>
              总分：<span style={{color:C.accent,fontWeight:700}}>{reqs.reduce((s,r)=>s+r.pts,0)}</span> 分
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function exGetRange(s){
  if(!s||typeof s!=='string')return[]
  const[a,b]=s.split(':'); const from=exParseAddr(a),to=exParseAddr(b||a)
  if(!from||!to)return[]; const out=[]
  for(let r=from.r;r<=to.r;r++)for(let c=from.c;c<=to.c;c++)out.push({r,c})
  return out
}
function exSplitArgs(s){
  const args=[];let depth=0,cur=''
  for(const ch of s){
    if(ch==='('){depth++;cur+=ch}else if(ch===')'){depth--;cur+=ch}
    else if(ch===','&&depth===0){args.push(cur.trim());cur=''}else cur+=ch
  }
  if(cur.trim())args.push(cur.trim()); return args
}

// ── Build static grid from task data ───────────────────────
function buildExcelGrid(task){
  const data = task?.initial_data
  const headers = task?.col_headers || EXCEL_COL_LABELS
  const colCount = headers.length || 10
  if(data&&data.length>0){
    const rowCount = data.length+1
    const g = Array.from({length:rowCount},()=>Array(colCount).fill(null))
    headers.forEach((h,c)=>{g[0][c]=h})
    data.forEach((row,ri)=>{row.forEach((v,c)=>{g[ri+1][c]=v})})
    ;(task?.raw_cells||[]).forEach(({r,c,v})=>{if(g[r])g[r][c]=v})
    return g
  }
  // Default: 教案2
  const g=Array.from({length:51},()=>Array(10).fill(null))
  EXCEL_COL_LABELS.forEach((h,c)=>{g[0][c]=h})
  EXCEL_RAW.forEach((row,i)=>{for(let c=0;c<6;c++)g[i+1][c]=row[c]})
  EXCEL_SUMMARY.forEach((t,i)=>{g[i+1][7]=t})
  ;(task?.raw_cells||[]).forEach(({r,c,v})=>{if(g[r])g[r][c]=v})
  return g
}

// ── Cell value resolution ───────────────────────────────────
function exGetCellVal(r,c,userForms,staticGrid){
  if(r<0||c<0)return''
  const key=`${r},${c}`
  if(userForms&&userForms[key]!==undefined){
    const f=userForms[key]; if(!f)return''
    if(typeof f==='string'&&f.startsWith('='))return exEvalFull(f,userForms,staticGrid)
    const n=Number(f); return isNaN(n)?f:n
  }
  return staticGrid?.[r]?.[c]??''
}

function exResolveArg(arg,userForms,grid){
  const t=arg.trim()
  if((t.startsWith('"')&&t.endsWith('"'))||(t.startsWith("'")&&t.endsWith("'")))return t.slice(1,-1)
  const n=Number(t); if(!isNaN(n)&&t!=='')return n
  const addr=exParseAddr(t.replace(/\$/g,''))
  if(addr)return exGetCellVal(addr.r,addr.c,userForms,grid)
  return t
}

function exGetRangeVals(rangeStr,userForms,grid){
  return exGetRange(rangeStr).map(({r,c})=>{
    const v=exGetCellVal(r,c,userForms,grid)
    return(v!==null&&v!==''&&!isNaN(Number(v)))?Number(v):null
  }).filter(v=>v!==null)
}

// ── Core function evaluator ─────────────────────────────────
function exEvalFunc(fn,args,userForms,grid){
  const up=fn.toUpperCase()
  const numVals=a=>a.includes(':')?exGetRangeVals(a.trim(),userForms,grid):[Number(exResolveArg(a,userForms,grid))].filter(v=>!isNaN(v))

  switch(up){
    case 'SUM':{let s=0;args.forEach(a=>numVals(a).forEach(v=>s+=v));return s}
    case 'AVERAGE':{const v=[].concat(...args.map(numVals));return v.length?v.reduce((s,x)=>s+x,0)/v.length:'#DIV/0!'}
    case 'MAX':{const v=[].concat(...args.map(numVals));return v.length?Math.max(...v):0}
    case 'MIN':{const v=[].concat(...args.map(numVals));return v.length?Math.min(...v):0}
    case 'COUNT':{return[].concat(...args.map(a=>{
      if(a.includes(':'))return exGetRange(a.trim()).map(({r,c})=>exGetCellVal(r,c,userForms,grid))
      return[exResolveArg(a,userForms,grid)]
    })).filter(v=>v!==null&&v!==''&&!isNaN(Number(v))).length}
    case 'COUNTA':{return[].concat(...args.map(a=>{
      if(a.includes(':'))return exGetRange(a.trim()).map(({r,c})=>exGetCellVal(r,c,userForms,grid))
      return[exResolveArg(a,userForms,grid)]
    })).filter(v=>v!==null&&v!=='').length}
    case 'PRODUCT':{const v=[].concat(...args.map(numVals));return v.length?v.reduce((p,x)=>p*x,1):0}
    case 'ROUND':{const v=Number(exResolveArg(args[0],userForms,grid)),d=args[1]?Number(exResolveArg(args[1],userForms,grid)):0;return Math.round(v*Math.pow(10,d))/Math.pow(10,d)}
    case 'ROUNDUP':{const v=Number(exResolveArg(args[0],userForms,grid)),d=args[1]?Number(exResolveArg(args[1],userForms,grid)):0;const f=Math.pow(10,d);return Math.ceil(v*f)/f}
    case 'ROUNDDOWN':{const v=Number(exResolveArg(args[0],userForms,grid)),d=args[1]?Number(exResolveArg(args[1],userForms,grid)):0;const f=Math.pow(10,d);return Math.floor(v*f)/f}
    case 'ABS':return Math.abs(Number(exResolveArg(args[0],userForms,grid)))
    case 'SQRT':return Math.sqrt(Number(exResolveArg(args[0],userForms,grid)))
    case 'INT':return Math.floor(Number(exResolveArg(args[0],userForms,grid)))
    case 'MOD':{const a=Number(exResolveArg(args[0],userForms,grid)),b=Number(exResolveArg(args[1],userForms,grid));return a%b}
    case 'POWER':return Math.pow(Number(exResolveArg(args[0],userForms,grid)),Number(exResolveArg(args[1],userForms,grid)))
    case 'CONCATENATE':case 'CONCAT':return args.map(a=>exResolveArg(a,userForms,grid)).join('')
    case 'LEN':return String(exResolveArg(args[0],userForms,grid)).length
    case 'LEFT':{const s=String(exResolveArg(args[0],userForms,grid));return s.slice(0,args[1]?Number(exResolveArg(args[1],userForms,grid)):1)}
    case 'RIGHT':{const s=String(exResolveArg(args[0],userForms,grid));const n=args[1]?Number(exResolveArg(args[1],userForms,grid)):1;return s.slice(-n)}
    case 'MID':{const s=String(exResolveArg(args[0],userForms,grid));return s.substr(Number(exResolveArg(args[1],userForms,grid))-1,Number(exResolveArg(args[2],userForms,grid)))}
    case 'UPPER':return String(exResolveArg(args[0],userForms,grid)).toUpperCase()
    case 'LOWER':return String(exResolveArg(args[0],userForms,grid)).toLowerCase()
    case 'TRIM':return String(exResolveArg(args[0],userForms,grid)).trim()
    case 'TEXT':{const v=Number(exResolveArg(args[0],userForms,grid));return isNaN(v)?String(exResolveArg(args[0],userForms,grid)):v.toLocaleString()}
    case 'VALUE':return Number(exResolveArg(args[0],userForms,grid))
    case 'ISNUMBER':return!isNaN(Number(exResolveArg(args[0],userForms,grid)))
    case 'ISBLANK':{const v=exResolveArg(args[0],userForms,grid);return v===null||v===''||v===undefined}
    case 'NOT':return!exEvalCond(args[0].trim(),userForms,grid)
    case 'AND':return args.every(a=>exEvalCond(a.trim(),userForms,grid))
    case 'OR':return args.some(a=>exEvalCond(a.trim(),userForms,grid))
    default: return '#FUNC?'
  }
}

// ── IF evaluator ────────────────────────────────────────────
function exEvalIF(inner,userForms,grid){
  const args=exSplitArgs(inner)
  if(args.length<2)return '#ERR'
  const condStr=args[0].trim()
  let cond
  // If condition is a function call (AND/OR/NOT/etc.), evaluate via formula engine
  if(/^[A-Z]+\(/i.test(condStr)){
    const r=exEvalFull('='+condStr,userForms,grid)
    // r will be 1/0 (after engine boolean fix), or '#UNSUP'/'#ERR' on failure
    // Fall back to direct exEvalCond if engine returns error
    if(typeof r==='string'&&r.startsWith('#')){
      cond=exEvalCond(condStr,userForms,grid)
    } else {
      cond=r===true||(typeof r==='number'&&r!==0)||(typeof r==='string'&&r!==''&&r!=='0'&&r.toUpperCase()!=='FALSE'&&!r.startsWith('#'))
    }
  } else {
    cond=exEvalCond(condStr,userForms,grid)
  }
  const tv=args[1]?exResolveArg(args[1].trim(),userForms,grid):''
  const fv=args[2]!==undefined?exResolveArg(args[2].trim(),userForms,grid):''
  return cond?tv:fv
}
function exEvalCond(cond,userForms,grid){
  const ct=cond.trim()
  // Handle function calls directly: AND(...), OR(...), NOT(...)
  const fnM=ct.match(/^([A-Z]+)\(([\s\S]*)\)$/i)
  if(fnM){
    const r=exEvalFunc(fnM[1],exSplitArgs(fnM[2]),userForms,grid)
    return r!==false&&r!==0&&r!==''&&r!=='FALSE'&&r!==null
  }
  for(const op of['<>','<=','>=','=','<','>']){
    const idx=cond.indexOf(op)
    if(idx>0){
      const l=exResolveArg(cond.slice(0,idx).trim(),userForms,grid)
      const r=exResolveArg(cond.slice(idx+op.length).trim(),userForms,grid)
      const lv=isNaN(Number(l))?String(l):Number(l)
      const rv=isNaN(Number(r))?String(r):Number(r)
      if(op==='=')return lv==rv; if(op==='<>')return lv!=rv
      if(op==='<')return lv<rv; if(op==='>')return lv>rv
      if(op==='<=')return lv<=rv; if(op==='>=')return lv>=rv
    }
  }
  const v=exResolveArg(cond,userForms,grid)
  return!!v&&v!=='0'&&v!=='FALSE'&&v!==false
}

// ── VLOOKUP / HLOOKUP ──────────────────────────────────────
function exEvalVLOOKUP(inner,userForms,grid){
  const args=exSplitArgs(inner); if(args.length<3)return '#ERR'
  const lv=String(exResolveArg(args[0].trim(),userForms,grid))
  const tbl=exGetRange(args[1].trim())
  const ci=Number(exResolveArg(args[2].trim(),userForms,grid))-1
  const exact=args[3]?exResolveArg(args[3].trim(),userForms,grid)===0:true
  if(!tbl.length)return '#ERR'
  const minR=Math.min(...tbl.map(x=>x.r)),minC=Math.min(...tbl.map(x=>x.c))
  for(let r=minR;r<=Math.max(...tbl.map(x=>x.r));r++){
    if(String(exGetCellVal(r,minC,userForms,grid))===lv)
      return exGetCellVal(r,minC+ci,userForms,grid)
  }
  return '#N/A'
}

// ── Main formula evaluator ──────────────────────────────────
function exEvalFull(formula,userForms,grid){
  if(!formula||typeof formula!=='string')return''
  const f=formula.trim()
  if(!f.startsWith('=')){const n=Number(f);return isNaN(n)?f:n}
  let s=f.slice(1).trim(); const up=s.toUpperCase()
  try{
    // Named functions that need special handling
    if(up.startsWith('RANK(')){
      const args=exSplitArgs(s.slice(5,-1))
      const val=Number(exResolveArg(args[0],userForms,grid))
      const cells=exGetRange(args[1].trim())
      const order=args[2]?Number(exResolveArg(args[2],userForms,grid)):0
      const vals=cells.map(({r,c})=>{const v=exGetCellVal(r,c,userForms,grid);return(v!==null&&v!==''&&!isNaN(Number(v)))?Number(v):null}).filter(v=>v!==null)
      const sorted=order===0?[...vals].sort((a,b)=>b-a):[...vals].sort((a,b)=>a-b)
      const rank=sorted.indexOf(val)+1; return rank>0?rank:'#N/A'
    }
    if(up.startsWith('COUNTIF(')){
      const args=exSplitArgs(s.slice(8,-1))
      const cells=exGetRange(args[0].trim())
      const crit=String(exResolveArg(args[1],userForms,grid))
      return cells.filter(({r,c})=>String(exGetCellVal(r,c,userForms,grid))===crit).length
    }
    if(up.startsWith('COUNTIFS(')){
      // COUNTIFS(range1,criteria1,range2,criteria2,...)
      const args=exSplitArgs(s.slice(9,-1)); let count=0
      const range0=exGetRange(args[0].trim())
      range0.forEach(({r,c},i)=>{
        let match=true
        for(let k=0;k<args.length;k+=2){
          const rng=exGetRange(args[k].trim()); const crit=String(exResolveArg(args[k+1],userForms,grid))
          if(rng[i]&&String(exGetCellVal(rng[i].r,rng[i].c,userForms,grid))!==crit)match=false
        }
        if(match)count++
      }); return count
    }
    if(up.startsWith('SUMIF(')){
      const args=exSplitArgs(s.slice(6,-1))
      const cells=exGetRange(args[0].trim())
      const crit=String(exResolveArg(args[1],userForms,grid))
      const sc=exGetRange(args[2].trim()); let sum=0
      cells.forEach(({r,c},i)=>{
        if(String(exGetCellVal(r,c,userForms,grid))===crit){
          const sv=exGetCellVal(sc[i].r,sc[i].c,userForms,grid)
          if(sv!==null&&sv!==''&&!isNaN(Number(sv)))sum+=Number(sv)
        }
      }); return sum
    }
    if(up.startsWith('SUMIFS(')){
      const args=exSplitArgs(s.slice(7,-1))
      const sumRng=exGetRange(args[0].trim()); let sum=0
      sumRng.forEach(({r,c},i)=>{
        let match=true
        for(let k=1;k<args.length;k+=2){
          const rng=exGetRange(args[k].trim()); const crit=String(exResolveArg(args[k+1],userForms,grid))
          if(rng[i]&&String(exGetCellVal(rng[i].r,rng[i].c,userForms,grid))!==crit)match=false
        }
        if(match){const sv=exGetCellVal(r,c,userForms,grid);if(sv!==null&&sv!==''&&!isNaN(Number(sv)))sum+=Number(sv)}
      }); return sum
    }
    if(up.startsWith('IF(')){return exEvalIF(s.slice(3,-1),userForms,grid)}
    if(up.startsWith('IFS(')){
      // IFS(cond1,val1,cond2,val2,...)
      const args=exSplitArgs(s.slice(4,-1))
      for(let k=0;k<args.length;k+=2){
        if(exEvalCond(args[k].trim(),userForms,grid))return exResolveArg(args[k+1].trim(),userForms,grid)
      }
      return '#N/A'
    }
    if(up.startsWith('VLOOKUP(')){return exEvalVLOOKUP(s.slice(8,-1),userForms,grid)}
    if(up.startsWith('HLOOKUP(')){
      const args=exSplitArgs(s.slice(8,-1)); if(args.length<3)return '#ERR'
      const lv=String(exResolveArg(args[0].trim(),userForms,grid))
      const tbl=exGetRange(args[1].trim()); const ri=Number(exResolveArg(args[2].trim(),userForms,grid))-1
      const minR=Math.min(...tbl.map(x=>x.r)),minC=Math.min(...tbl.map(x=>x.c))
      for(let c=minC;c<=Math.max(...tbl.map(x=>x.c));c++){
        if(String(exGetCellVal(minR,c,userForms,grid))===lv)return exGetCellVal(minR+ri,c,userForms,grid)
      }
      return '#N/A'
    }
    // AND/OR/NOT handled here to preserve boolean result (expression engine converts to string)
    if(up.startsWith('AND(')){
      const args=exSplitArgs(s.slice(4,-1))
      return args.every(a=>exEvalCond(a.trim(),userForms,grid))
    }
    if(up.startsWith('OR(')){
      const args=exSplitArgs(s.slice(3,-1))
      return args.some(a=>exEvalCond(a.trim(),userForms,grid))
    }
    if(up.startsWith('NOT(')){
      return !exEvalCond(s.slice(4,-1).trim(),userForms,grid)
    }

    // Expression engine: process nested function calls, then evaluate arithmetic
    let expr=s
    for(let i=0;i<8;i++){
      const prev=expr
      expr=expr.replace(/\b([A-Z]+)\(([^()]*)\)/gi,(match,fn,argStr)=>{
        const r=exEvalFunc(fn,exSplitArgs(argStr),userForms,grid)
        // Convert booleans to 1/0 so arithmetic eval works
        if(typeof r==='boolean') return r?'1':'0'
        return String(r??0)
      })
      if(expr===prev)break
    }
    // Replace remaining cell references
    expr=expr.replace(/\$?[A-Z]+\$?\d+/gi,m=>{
      const addr=exParseAddr(m.replace(/\$/g,''))
      if(!addr)return'0'
      const v=exGetCellVal(addr.r,addr.c,userForms,grid)
      return(v===null||v===''||isNaN(Number(v)))?`"${v}"`:String(Number(v))
    })
    // Safe arithmetic eval
    if(/^[\d\s+\-*/%.(),"]+$/.test(expr.replace(/\s/g,''))){
      try{return Function(`"use strict";return(${expr})`)()}
      catch(e){return'#ERR'}
    }
    return'#UNSUP'
  }catch(e){return'#ERR'}
}

// ── Editable cell check (supports dynamic formula_cells) ───
function exIsEditable(r,c,task){
  // Always check formula_cells first (supports both header row 0 and data rows)
  const fc=task?.formula_cells
  if(fc&&fc.length>0){
    return fc.some(f=>exGetRange(f.range).some(({r:cr,c:cc})=>cr===r&&cc===c))
  }
  if(r===0)return false
  // Default 教案2 fallback
  if(c===6&&r>=1&&r<=30)return true
  if(c===8&&r>=1&&r<=4)return true
  if(c===9&&r>=1&&r<=4)return true
  return false
}

function exGetHint(r,c,task){
  const fc=task?.formula_cells||[]
  for(const f of fc){
    if(exGetRange(f.range).some(({r:cr,c:cc})=>cr===r&&cc===c))return f.hint||''
  }
  if(c===6)return'=RANK(...)'
  if(c===8)return'=COUNTIF(...)'
  if(c===9)return'=SUMIF(...)'
  return''
}

// ── Scoring engine ──────────────────────────────────────────
function exDisplayVal(r,c,userForms,grid,task){
  if(exIsEditable(r,c,task)){
    const f=userForms[`${r},${c}`]
    if(!f) return ''
    if(typeof f==='string'&&f.startsWith('=')){const v=exEvalFull(f,userForms,grid);return v===null?'':String(v)}
    return String(f)
  }
  const v=grid?.[r]?.[c]; return v===null||v===undefined?'':String(v)
}

function calcExcelScore(task,userForms,cellStyles,grid){
  const rules=(task?.scoring_rules)||[
    {id:'rank',keyword:'RANK',cells:'G2:G31',expected:[21,8,2,30,16,25,6,29,15,4,10,22,19,27,17,26,11,23,14,12,1,20,5,24,13,9,28,18,3,7],pts_each:1,total_pts:30,desc:'RANK 函数'},
    {id:'countif',keyword:'COUNTIF',cells:'I2:I5',expected:[13,5,4,8],pts_each:5,total_pts:20,desc:'COUNTIF 函数'},
    {id:'sumif',keyword:'SUMIF',cells:'J2:J5',expected:[6680,4690,12670,12140],pts_each:5,total_pts:20,desc:'SUMIF 函数'},
    {id:'beauty',type:'style',pts:10,desc:'数据美化'},
  ]
  let total=0; const detail={}
  rules.forEach(rule=>{
    if(rule.type==='style'){
      let beautyPts=0
      if(rule.id==='currency'){
        // Check if D(col3) and F(col5) columns have currency style applied
        const dCurr=Object.entries(cellStyles).some(([k,s])=>{
          const[r,c]=k.split(',').map(Number); return c===3&&r>=1&&s?.currency
        })
        const fCurr=Object.entries(cellStyles).some(([k,s])=>{
          const[r,c]=k.split(',').map(Number); return c===5&&r>=1&&s?.currency
        })
        beautyPts=(dCurr||fCurr)?rule.pts:0
      } else if(rule.id==='header_fmt'){
        // Check if header row (row 0) has bold or color applied
        const headerStyled=Object.entries(cellStyles).some(([k,s])=>{
          const rowIdx=parseInt(k.split(',')[0])
          return rowIdx===0&&(s?.bold||(s?.bg&&s.bg!=='#ffffff'&&s.bg!=='')||(s?.color&&s.color!=='#111827'))
        })
        beautyPts=headerStyled?rule.pts:0
      } else {
        // Generic: any styling done → full marks
        const hb=Object.values(cellStyles).some(s=>s?.bold)
        const bg=Object.entries(cellStyles).some(([k,s])=>{
          const rowIdx=parseInt(k.split(',')[0])
          return rowIdx>=1&&s.bg&&s.bg!=='#ffffff'&&s.bg!==''
        })
        beautyPts=(hb||bg)?rule.pts:0
      }
      total+=beautyPts; detail[rule.id]={pts:beautyPts,max:rule.pts,label:rule.desc}
    } else {
      // text_match: check if cell contains a substring
      if(rule.type==='text_match'){
        const cells=exGetRange(rule.cells||'')
        let pts=0; const items=[]
        cells.forEach(({r,c},i)=>{
          const key=`${r},${c}`
          // For row 0 (header), check colHeaders first, then userForms
          let val=''
          if(r===0) val=String(userForms[key]||grid?.[r]?.[c]||'')
          else val=String(exGetCellVal(r,c,userForms,grid)||'')
          const match=rule.match||''
          const ok=match?val.includes(match):val.trim().length>0
          if(ok) pts+=(rule.pts_each||rule.pts||0)
          items.push({r,c,ok,val})
        })
        const maxPts=rule.total_pts||rule.pts||pts
      // If correct count >= max points threshold, award full marks
      const cappedPts=pts>=maxPts?maxPts:pts
      total+=cappedPts; detail[rule.id]={pts:cappedPts,max:maxPts,label:rule.desc,items}
        return
      }
      const cellList=exGetRange(rule.cells||''); const exp=rule.expected||[]; let pts=0; const items=[]
      // Chart rules cannot be evaluated in browser - skip silently
      if(rule.type==='chart'||!rule.cells){
        detail[rule.id]={pts:0,max:rule.pts||0,label:rule.desc,items:[],skipped:true}
        return
      }
      const kw=rule.keyword||''
      cellList.forEach(({r,c},i)=>{
        const key=`${r},${c}`; const f=userForms[key]||''
        const hasKw=kw?f.toUpperCase().includes(kw+'('):(f.startsWith('=')||f.length>0)
        let val=null
        if(hasKw||rule.type==='value_match'){
          val=exEvalFull(f.startsWith('=')?f:`=${f}`,userForms,grid)
        }
        const expVal=exp[i]
        // Value comparison: support both string and number
        function valMatch(v,e){
          if(e===undefined||e===null)return true
          if(String(v)===String(e))return true
          const nv=Number(v),ne=Number(e)
          return!isNaN(nv)&&!isNaN(ne)&&Math.abs(nv-ne)<0.01
        }
        const ok=rule.type==='value_match'
          ?valMatch(val,expVal)
          :rule.type==='formula_any'
          ?(f.startsWith('='))
          :(!kw
            ?(f.startsWith('=')&&valMatch(val,expVal))
            :(hasKw&&valMatch(val,expVal)))
        if(ok) pts+=(rule.pts_each||1)
        items.push({r,c,ok,val,exp:expVal})
      })
      const maxPts2=rule.total_pts||rule.pts||pts
      const finalPts=pts>=maxPts2?maxPts2:pts
      total+=finalPts; detail[rule.id]={pts:finalPts,max:maxPts2,label:rule.desc,items}
    }
  })
  return{total,rules,detail}
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
  const [selRange,setSelRange]=useState(null) // {r1,c1,r2,c2} for multi-select
  const [submitted,setSubmitted]=useState(false)
  const [finalScore,setFinalScore]=useState(null)
  const [fileScore,setFileScore]=useState(null) // score from file upload
  const fbarRef=useRef(null)

  useEffect(()=>{
    if(excelTaskId&&!taskProp){
      sb.from("lulu_excel_tasks").select().eq("id",excelTaskId).single()
        .then(({data})=>{ if(data) setTask(data) })
    }
  },[excelTaskId])

  // Build grid from task data (dynamic or default)
  const staticGrid = buildExcelGrid(task)
  const colHeaders = task?.col_headers || EXCEL_COL_LABELS
  const colWidths  = task?.col_widths  || EXCEL_COL_W
  const dataRows   = task?.initial_data ? task.initial_data.length : EXCEL_RAW.length
  // Compute extra columns needed by formula_cells beyond colHeaders
  const formulaMaxCol = (task?.formula_cells||[]).reduce((mx,f)=>{
    const cells=exGetRange(f.range); 
    const maxC=cells.reduce((m,{c})=>Math.max(m,c),-1)
    return Math.max(mx,maxC)
  },-1)
  const totalCols = Math.max(colHeaders.length, formulaMaxCol+1)
  const extHeaders = Array.from({length:totalCols},(_, i)=>colHeaders[i]||'')
  const extWidths  = Array.from({length:totalCols},(_, i)=>colWidths[i]||80)

  const score=calcExcelScore(task,userForms,cellStyles,staticGrid)
  const isEdit=(r,c)=>exIsEditable(r,c,task)

  function selectCell(r,c,shiftKey=false){
    if(shiftKey&&selected){
      // Extend selection range
      setSelRange({
        r1:Math.min(selected.r,r),c1:Math.min(selected.c,c),
        r2:Math.max(selected.r,r),c2:Math.max(selected.c,c)
      })
      return
    }
    setSelRange(null)
    setSelected({r,c})
    const key=`${r},${c}`
    setEditVal(isEdit(r,c)?(userForms[key]||''):String(staticGrid?.[r]?.[c]??''))
    if(isEdit(r,c)) setTimeout(()=>fbarRef.current?.focus(),10)
  }

  function commitEdit(){
    if(!selected||!isEdit(selected.r,selected.c)) return
    setUserForms(p=>({...p,[`${selected.r},${selected.c}`]:editVal}))
  }

  // Fill formula down: works on range selection too
  function fillDown(){
    if(!editVal.startsWith('=')) return
    // If range selected, fill from top of range to bottom
    const startR=selRange?selRange.r1:selected?.r
    const col=selRange?selRange.c1:selected?.c
    if(startR===undefined||col===undefined) return
    const endR=selRange?selRange.r2:null
    const {r,c}=selected||{r:startR,c:col}
    // Find all editable cells below in same column
    const fc=task?.formula_cells||[]
    const editableRows=[]
    for(let row=r+1;row<=200;row++){
      if(exIsEditable(row,c,task)) editableRows.push(row)
      else if(editableRows.length>0) break // stop at first non-editable
    }
    if(!editableRows.length) return
    // Adjust row references in formula: replace non-$ row numbers
    setUserForms(p=>{
      const next={...p}
      editableRows.forEach(targetRow=>{
        const adjusted=editVal.replace(/(?<!\$)([A-Za-z]+)(\d+)/g,(match,col,rowNum)=>{
          if(parseInt(rowNum)===r+1) return col+(targetRow+1)
          return match
        })
        next[`${targetRow},${c}`]=adjusted
      })
      return next
    })
  }

  function onKey(e){
    if(e.key==='Enter'){e.preventDefault();commitEdit();if(selected&&selected.r<30)selectCell(selected.r+1,selected.c)}
    if(e.key==='Escape') setEditVal(userForms[`${selected?.r},${selected?.c}`]||'')
    if(e.key==='Tab'){e.preventDefault();commitEdit()}
  }

  // Get all cells in current selection (single or range)
  function getSelCells(){
    if(selRange){
      const cells=[]
      for(let r=selRange.r1;r<=selRange.r2;r++)
        for(let c=selRange.c1;c<=selRange.c2;c++)
          cells.push({r,c})
      return cells
    }
    return selected?[selected]:[]
  }

  function toggleBold(){
    const cells=getSelCells(); if(!cells.length) return
    const anyBold=cells.some(({r,c})=>cellStyles[`${r},${c}`]?.bold)
    setCellStyles(p=>{
      const next={...p}
      cells.forEach(({r,c})=>{const k=`${r},${c}`;const cur=next[k]||{};next[k]={...cur,bold:!anyBold}})
      return next
    })
  }
  function setBg(col){
    const cells=getSelCells(); if(!cells.length) return
    setCellStyles(p=>{
      const next={...p}
      cells.forEach(({r,c})=>{const k=`${r},${c}`;const cur=next[k]||{};next[k]={...cur,bg:col}})
      return next
    })
  }
  function setFontColor(col){
    const cells=getSelCells(); if(!cells.length) return
    setCellStyles(p=>{
      const next={...p}
      cells.forEach(({r,c})=>{const k=`${r},${c}`;const cur=next[k]||{};next[k]={...cur,color:col}})
      return next
    })
  }
  function toggleCurrency(){
    const cells=getSelCells(); if(!cells.length) return
    const anyCurr=cells.some(({r,c})=>cellStyles[`${r},${c}`]?.currency)
    setCellStyles(p=>{
      const next={...p}
      cells.forEach(({r,c})=>{const k=`${r},${c}`;const cur=next[k]||{};next[k]={...cur,currency:!anyCurr}})
      return next
    })
  }

  async function handleSubmit(){
    const finalS=calcExcelScore(task,userForms,cellStyles,staticGrid)
    if(sessionId){
      await sb.from("word_lab_submissions").upsert({
        session_id:sessionId,student_name:studentName,
        score:finalS.total,max_score:finalS.rules.reduce((s,r)=>s+(r.total_pts||r.pts||0),0),submitted:true,phase:'excel',
        completed_tasks:Object.keys(finalS.detail).filter(k=>finalS.detail[k].pts>0)
      },{onConflict:'session_id,student_name,phase'})
    }
    setFinalScore(finalS); setSubmitted(true)
    if(onSubmit) onSubmit(finalS.total)
  }

  // Results screen
  if(submitted&&finalScore){
    const fs=finalScore
    return(
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",fontFamily:F,padding:24,gap:14}}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <div style={{fontSize:36}}>📊</div>
        <div style={{fontSize:22,fontWeight:900}}>{studentName}</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
          {fs.rules.map(rule=>{
            const d=fs.detail[rule.id]; if(!d) return null
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
          <div style={{fontSize:48,fontWeight:900,color:C.accent,fontFamily:"'DM Mono',monospace"}}>{fs.total}</div>
          <div style={{fontSize:12,color:C.muted}}>/ {fs.rules.reduce((s,r)=>s+(r.total_pts||r.pts||0),0)} 分</div>
        </div>
      </div>
    )
  }

  const BG_COLS=['#ffffff','#fef9c3','#dbeafe','#dcfce7','#fee2e2','#f3e8ff','#1e3a5f','#ffedd5']
  const selKey=selected?`${selected.r},${selected.c}`:null
  const selSt=selKey?cellStyles[selKey]||{}:{}
  const fbarEditable=selected&&isEdit(selected.r,selected.c)

  function downloadCSV(){
    const headers=colHeaders
    const rows=(task?.initial_data)||EXCEL_RAW.map(r=>[...r,null])
    const lines=[headers,...rows].map(row=>
      row.map(v=>v===null?'':'"'+String(v).replace(/"/g,'""')+'"').join(',')
    )
    const csv='\uFEFF'+lines.join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a')
    a.href=url;a.download=(task?.title||'表格题目')+'.csv';a.click()
    URL.revokeObjectURL(url)
  }
  const sc=score // alias for use in render

  return(
    <div style={{height:"100vh",display:"grid",gridTemplateRows:"auto auto 1fr auto",
      background:C.bg,fontFamily:F,color:C.text,overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {/* Header */}
      <div style={{background:"#1e3a5f",padding:"8px 16px",display:"flex",alignItems:"center",gap:12,color:"white"}}>
        {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
          color:"white",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:12,fontFamily:F}}>← 返回</button>}
        <div style={{fontSize:14,fontWeight:700}}>📊 Excel 制表 · {studentName}</div>
        <button onClick={downloadCSV} style={{padding:"4px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,.3)",
          background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.85)",cursor:"pointer",
          fontSize:11,fontFamily:F,whiteSpace:"nowrap"}} title="下载原始表格到本地Excel操作后上传">
          ⬇ 下载原始表
        </button>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {fileScore?(
            <>
              {fileScore.details.map((d,i)=>(
                <span key={i} style={{fontSize:11,padding:"2px 7px",borderRadius:4,
                  background:d.ok?"rgba(110,231,183,.25)":"rgba(255,255,255,.12)",
                  color:d.ok?"#6ee7b7":"rgba(255,255,255,.6)"}}>
                  {d.ok?"✓":"✗"} {(d.desc||'').split('（')[0]} {d.pts||0}/{d.max||0}
                </span>
              ))}
              <span style={{fontSize:14,fontWeight:900,color:"#6ee7b7",
                fontFamily:"'DM Mono',monospace",marginLeft:4}}>
                {fileScore.total}/{fileScore.max}
                <span style={{fontSize:10,color:"rgba(255,255,255,.6)",marginLeft:3}}>文件分✓</span>
              </span>
            </>
          ):(
            <>
              {sc.rules.map(r=>{
                const d=sc.detail[r.id]; if(!d) return null
                return <span key={r.id} style={{fontSize:11,padding:"2px 7px",borderRadius:4,
                  background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.85)"}}>
                  {d.label?.split('(')[0]} {d.pts}/{d.max}
                </span>
              })}
              <span style={{fontSize:14,fontWeight:900,color:sc.total>=60?"#6ee7b7":"#fcd34d",
                fontFamily:"'DM Mono',monospace",marginLeft:4}}>
                {sc.total}/{sc.rules.reduce((s,r)=>s+(r.total_pts||r.pts||0),0)}
              </span>
            </>
          )}
        </div>
        {!fileScore&&<button onClick={handleSubmit} style={{padding:"6px 16px",borderRadius:7,border:"none",
          background:"#f59e0b",color:"white",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer"}}>
          提交
        </button>}
        {fileScore&&<div style={{padding:"4px 10px",borderRadius:7,background:"rgba(5,150,105,.2)",
          color:"#6ee7b7",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>✓ 文件已提交</div>}
        <div style={{width:1,height:18,background:"rgba(255,255,255,.2)"}}/>
        <div style={{position:"relative"}}>
          <input type="file" accept=".xlsx,.xls" id="exUpload" style={{display:"none"}}
            onChange={async e=>{
              const file=e.target.files?.[0]; if(!file) return
              const b64=await new Promise((res)=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(file)})
              const resp=await fetch(SCORE_OFFICE_URL,{method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({fileBase64:b64,fileType:'xlsx',scoringRules:sc.rules})})
              const data=await resp.json()
              if(!data.error){
                // Show result then mark as submitted with file score
                const scoreLines=(data.details||[]).map(d=>`${d.ok?'✓':'✗'} ${d.desc} ${d.pts||0}分`).join('\n')
                alert(`文件评分：${data.total}/${data.max} 分\n${scoreLines}\n\n文件评分已自动提交，无需再点「提交」按钮`)
                // Save to DB so teacher can review
                if(sessionId){
                  const storageUrl = await uploadFileToStorage(b64, file.name)
                  await sb.from("lulu_file_submissions").insert({
                    session_id:sessionId, student_name:studentName,
                    task_id:excelTaskId||null, file_name:file.name,
                    file_base64:b64, file_type:'xlsx',
                    storage_url:storageUrl,
                    auto_score:data.total, auto_max:data.max||0,
                    auto_detail:data.details||[]
                  })
                  // Also submit score to word_lab_submissions so it counts in rankings
                  await sb.from("word_lab_submissions").upsert({
                    session_id:sessionId, student_name:studentName,
                    score:data.total, max_score:data.max||0,
                    submitted:true, phase:'excel',
                    completed_tasks:(data.details||[]).filter(d=>d.ok).map(d=>d.id)
                  },{onConflict:'session_id,student_name,phase'})
                }
                // Update UI to show file score
                setFileScore({total:data.total,max:data.max||0,details:data.details||[]})
              } else alert('解析失败：'+data.error)
              e.target.value=''
            }}/>
          <label htmlFor="exUpload" style={{padding:"6px 14px",borderRadius:7,
            background:"rgba(255,255,255,.15)",color:"white",fontSize:12,cursor:"pointer",
            fontWeight:700,fontFamily:F,whiteSpace:"nowrap"}}>📎 上传文件评分</label>
        </div>
        <div style={{width:1,height:18,background:"rgba(255,255,255,.2)"}}/>
        <div style={{position:"relative"}}>
          <input type="file" accept="image/*" id="exScreenshot" style={{display:"none"}}
            onChange={async e=>{
              const file=e.target.files?.[0]; if(!file) return
              const b64=await new Promise((res)=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(file)})
              if(sessionId){
                // Find latest file submission for this student/session and attach screenshot
                const {data:latest}=await sb.from("lulu_file_submissions")
                  .select("id").eq("session_id",sessionId).eq("student_name",studentName)
                  .order("created_at",{ascending:false}).limit(1).maybeSingle()
                if(latest?.id){
                  await sb.from("lulu_file_submissions").update({screenshot_base64:b64}).eq("id",latest.id)
                  alert("截图已上传，老师可在文件审阅中查看")
                } else {
                  alert("请先上传文件评分，再上传截图")
                }
              }
              e.target.value=''
            }}/>
          <label htmlFor="exScreenshot" style={{padding:"6px 14px",borderRadius:7,
            background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.85)",fontSize:12,cursor:"pointer",
            fontWeight:700,fontFamily:F,whiteSpace:"nowrap"}}>🖼 上传图表截图</label>
        </div>
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
        <input ref={fbarRef} value={fbarEditable?editVal:String(staticGrid?.[selected?.r]?.[selected?.c]??'')}
          onChange={e=>fbarEditable&&setEditVal(e.target.value)}
          onKeyDown={onKey} onBlur={commitEdit}
          readOnly={!fbarEditable}
          placeholder={fbarEditable?(selected?.r===0?"输入列标题，如：优质订单判断":`输入公式，如 ${exGetHint(selected?.r,selected?.c,task)||'=IF(...)'}`): "只读"}
          style={{flex:1,padding:"4px 8px",borderRadius:6,fontSize:12,fontFamily:"'DM Mono',monospace",
            border:`1px solid ${fbarEditable?"#ca8a04":C.border}`,
            background:fbarEditable?"#fefce8":"#f9fafb",outline:"none",minWidth:180}}/>
        <div style={{width:1,height:18,background:C.border}}/>
        {/* Fill down button */}
        {fbarEditable&&editVal.startsWith('=')&&(
          <button onMouseDown={e=>{e.preventDefault();fillDown()}} style={{
            padding:"4px 10px",borderRadius:5,border:`1px solid ${C.gold}`,
            background:"rgba(217,119,6,.08)",color:C.gold,cursor:"pointer",
            fontSize:12,fontWeight:700,fontFamily:F,whiteSpace:"nowrap"
          }} title="把当前公式填充到下方所有空白格">⬇ 向下填充</button>
        )}
        <div style={{width:1,height:18,background:C.border}}/>
        <button onMouseDown={e=>{e.preventDefault();toggleBold()}} style={{
          padding:"4px 10px",borderRadius:5,border:`1px solid ${C.border}`,
          background:selSt.bold?"rgba(37,99,235,.1)":"white",
          color:selSt.bold?C.accent:C.text,fontWeight:900,cursor:"pointer",fontSize:13}}>B</button>
        <button onMouseDown={e=>{e.preventDefault();toggleCurrency()}} title="货币格式（¥）" style={{
          padding:"4px 10px",borderRadius:5,border:`1px solid ${selSt.currency?"#059669":C.border}`,
          background:selSt.currency?"rgba(5,150,105,.1)":"white",
          color:selSt.currency?"#059669":C.text,fontWeight:700,cursor:"pointer",fontSize:13}}>¥</button>
        <span style={{fontSize:11,color:C.muted}}>填充:</span>
        {BG_COLS.map(col=>(
          <div key={col} onMouseDown={e=>{e.preventDefault();setBg(col)}} style={{
            width:16,height:16,borderRadius:3,background:col,cursor:"pointer",
            border:`2px solid ${selSt.bg===col?"#333":C.border}`}}/>
        ))}
        <div style={{width:1,height:18,background:C.border}}/>
        <span style={{fontSize:11,color:C.muted}}>字色:</span>
        {['#111827','#dc2626','#2563eb','#059669','#d97706','#7c3aed','#ffffff'].map(col=>(
          <div key={col} onMouseDown={e=>{e.preventDefault();setFontColor(col)}} style={{
            width:16,height:16,borderRadius:3,background:col,cursor:"pointer",
            border:`2px solid ${selSt.color===col?"#333":C.border}`}}/>
        ))}
      </div>
      {/* Grid */}
      <div style={{overflow:"auto",background:"#e8ecf1"}}>
        <table style={{borderCollapse:"collapse",tableLayout:"fixed",background:"white",userSelect:"none"}}>
          <colgroup>
            <col style={{width:32}}/>
            {extWidths.map((w,i)=><col key={i} style={{width:w}}/>)}
          </colgroup>
          <thead style={{position:"sticky",top:0,zIndex:10}}>
            <tr>
              <th style={{background:"#e8ecf1",border:`1px solid ${C.border}`,padding:"3px",fontSize:10,color:C.muted,textAlign:"center"}}>#</th>
              {extHeaders.map((_,c)=>(
                <th key={c} style={{background:"#e8ecf1",border:`1px solid ${C.border}`,padding:"3px",
                  fontSize:10,color:C.muted,textAlign:"center",fontFamily:"'DM Mono',monospace"}}>{EXCEL_COL_LETTERS[c]||String.fromCharCode(65+c)}</th>
              ))}
            </tr>
            <tr>
              <td style={{background:"#e8ecf1",border:`1px solid ${C.border}`,padding:"3px",fontSize:10,color:C.muted,textAlign:"center",fontFamily:"'DM Mono',monospace"}}>1</td>
              {extHeaders.map((h,c)=>{
                const st=cellStyles[`0,${c}`]||{}
                const isSel=selected?.r===0&&selected?.c===c
                const isHeaderEdit=exIsEditable(0,c,task)
                const headerVal=userForms[`0,${c}`]||h
                return(
                  <td key={c} onClick={e=>selectCell(0,c,e.shiftKey)} style={{
                    border:`${isSel?2:1}px solid ${isSel?C.accent:isHeaderEdit?"#ca8a04":"#9ca3af"}`,
                    padding:"4px 5px",fontSize:11,
                    fontWeight:st.bold?700:400,
                    background:st.bg||(isHeaderEdit?"#fef3c7":"#f3f4f6"),
                    color:st.color||(isHeaderEdit?"#92400e":"#374151"),
                    cursor:isHeaderEdit?"cell":"default",
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"
                  }}>
                    {isHeaderEdit
                      ? (userForms[`0,${c}`]
                          ? userForms[`0,${c}`]
                          : <span style={{opacity:.5,fontSize:9,fontStyle:"italic"}}>输入列标题</span>)
                      : h}
                  </td>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({length:dataRows},(_,rowIdx)=>{
              const r=rowIdx+1
              return(
                <tr key={r}>
                  <td style={{background:"#e8ecf1",border:`1px solid ${C.border}`,padding:"2px 3px",
                    fontSize:10,color:C.muted,textAlign:"center",fontFamily:"'DM Mono',monospace"}}>{r+1}</td>
                  {extHeaders.map((_,c)=>{
                    const key=`${r},${c}`
                    const st=cellStyles[key]||{}
                    const edit=isEdit(r,c)
                    const isSel=selected?.r===r&&selected?.c===c
                    const inRange=selRange&&r>=selRange.r1&&r<=selRange.r2&&c>=selRange.c1&&c<=selRange.c2
                    const rawDv=exDisplayVal(r,c,userForms,staticGrid,task)
                    const isCurrency=cellStyles[`${r},${c}`]?.currency
                    const dv=isCurrency&&rawDv!==''&&!isNaN(Number(rawDv))?'¥'+Number(rawDv).toFixed(2):rawDv
                    const isErr=typeof dv==='string'&&dv.startsWith('#')
                    // Cell status
                    let status=null
                    if(edit&&userForms[key]){
                      const f=userForms[key]
                      const rules=(task?.scoring_rules)||[]
                      const matchRule=rules.find(ru=>{
                        if(ru.type==='style')return false
                        return exGetRange(ru.cells||'').some(({r:cr,c:cc})=>cr===r&&cc===c)
                      })
                      if(matchRule){
                        const cellList=exGetRange(matchRule.cells)
                        const idx=cellList.findIndex(cl=>cl.r===r&&cl.c===c)
                        const kw=matchRule.keyword||''
                        const hasKw=kw?f.toUpperCase().includes(kw+'('):f.startsWith('=')
                        const val=exEvalFull(f.startsWith('=')?f:('='+f),userForms,staticGrid)
                        const expVal=matchRule.expected?.[idx]
                        const ok=kw
                          ?(hasKw&&(expVal===undefined||Math.abs(Number(val)-Number(expVal))<0.001))
                          :(f.startsWith('='))
                        status=ok?'ok':hasKw?'wrong':'nofn'
                      } else if(f.startsWith('=')){
                        // No rule but has formula - show neutral
                        status='nofn'
                      }
                    }
                    return(
                      <td key={c} onClick={e=>selectCell(r,c,e.shiftKey)}
                        style={{
                          border:`${isSel?2:inRange?1:1}px solid ${isSel?C.accent:inRange?"#93c5fd":edit?"#ca8a0499":C.border}`,
                          background: inRange&&!isSel?(edit?"#fef9c3":"#eff6ff"):undefined,
                          padding:"2px 5px",fontSize:11,
                          background:st.bg||(edit?"#fefce8":"white"),
                          color:isErr?C.red:st.color||C.text,
                          fontWeight:st.bold?700:400,cursor:edit?"cell":"default",
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                          textAlign:(c>=4&&c<=6)?'right':'left',position:"relative"
                        }}>
                        {dv||(!edit?'':<span style={{color:"#ca8a04",fontSize:9,fontStyle:"italic",opacity:.6}}>
                          {(()=>{const h=exGetHint(r,c,task);if(!h)return'输入公式';if(r===0)return'点击输入列标题';const fn=h.replace(/^=/,'').split('(')[0].toUpperCase();return fn?`=${fn}(…)`:'输入公式'})()}
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
        {fileScore&&(
          <span style={{color:"#059669",fontWeight:700}}>
            ✓ 文件已提交 · 得分 {fileScore.total}/{fileScore.max} 分（已计入排名）
          </span>
        )}
        {!fileScore&&<span>💡 Shift+点击 多选单元格 → 批量设置格式 &nbsp;|&nbsp; 图表题请下载原始表在Excel制作后上传文件评分</span>}
        {selRange&&<span style={{color:C.gold,fontWeight:700}}>
          已选 {(selRange.r2-selRange.r1+1)*(selRange.c2-selRange.c1+1)} 格
        </span>}
        <div style={{flex:1}}/>
        {sc.rules.map(r=>{const d=sc.detail[r.id];if(!d)return null;return(
          <span key={r.id}>{d.label.split('(')[0]} {d.pts}/{d.max}</span>
        )})}
        <span style={{color:C.accent,fontWeight:700}}>总分 {sc.total}/{sc.rules.reduce((s,r)=>s+(r.total_pts||r.pts||0),0)}</span>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// EXCEL TASK EDITOR (teacher backend)
// ══════════════════════════════════════════════════════════════
function ExcelTaskEditor({task,onSave,onBack}){
  const isNew=!task
  const [title,setTitle]=useState(task?.title||'')
  const [desc,setDesc]=useState(task?.description||'')
  const [timeLimit,setTimeLimit]=useState(task?.time_limit||600)
  const [colHeadersStr,setColHeadersStr]=useState((task?.col_headers||[]).join(','))
  const [csvData,setCsvData]=useState('')
  const [initialData,setInitialData]=useState(task?.initial_data||[])
  const [formulaCells,setFormulaCells]=useState(task?.formula_cells||[{range:'',hint:''}])
  const [rules,setRules]=useState(task?.scoring_rules||[{id:'r1',type:'formula_keyword',keyword:'',cells:'',expected:[],pts_each:5,total_pts:20,desc:''}])
  const [tab,setTab]=useState('basic')
  const [saving,setSaving]=useState(false)
  const [csvMsg,setCsvMsg]=useState('')

  function parseCsv(){
    if(!csvData.trim()){setCsvMsg('请先粘贴数据');return}
    const rows=csvData.trim().split('\n').map(r=>r.split('\t').map(v=>v.trim()))
    const data=rows.map(row=>row.map(v=>{
      if(v===''||v===null)return null
      const n=Number(v); return isNaN(n)?v:n
    }))
    setInitialData(data)
    // Auto-detect headers from first row if they look like text
    if(rows[0]&&rows[0].some(v=>isNaN(Number(v)))){
      setColHeadersStr(rows[0].join(','))
      setInitialData(data.slice(1))
      setCsvMsg(`已导入 ${data.length-1} 行数据，第一行识别为表头`)
    } else {
      setCsvMsg(`已导入 ${data.length} 行数据`)
    }
  }

  function addFC(){setFormulaCells(p=>[...p,{range:'',hint:''}])}
  function updFC(i,f,v){setFormulaCells(p=>p.map((x,idx)=>idx===i?{...x,[f]:v}:x))}
  function delFC(i){setFormulaCells(p=>p.filter((_,idx)=>idx!==i))}

  function addRule(){setRules(p=>[...p,{id:'r'+(Date.now()),type:'formula_keyword',keyword:'',cells:'',expected:[],pts_each:5,total_pts:20,desc:''}])}
  function updRule(i,f,v){setRules(p=>p.map((x,idx)=>idx===i?{...x,[f]:v}:x))}
  function delRule(i){setRules(p=>p.filter((_,idx)=>idx!==i))}

  function parseExpected(str){
    return str.split(',').map(s=>s.trim()).map(v=>{const n=Number(v);return isNaN(n)?v:n})
  }
  function expectedToStr(arr){return(arr||[]).join(',')}

  async function save(){
    if(!title.trim()){alert('请填写题目名称');return}
    if(!initialData.length){alert('请先导入表格数据');return}
    setSaving(true)
    const headers=colHeadersStr.split(',').map(s=>s.trim()).filter(Boolean)
    const payload={
      title,description:desc,time_limit:timeLimit,
      col_headers:headers,
      col_widths:headers.map(()=>100),
      initial_data:initialData,
      formula_cells:formulaCells.filter(f=>f.range.trim()),
      scoring_rules:rules.map(r=>({
        ...r,
        expected:typeof r.expected==='string'?parseExpected(r.expected):r.expected
      })),
      raw_cells:[]
    }
    let error
    if(isNew){({error}=await sb.from('lulu_excel_tasks').insert(payload))}
    else{({error}=await sb.from('lulu_excel_tasks').update(payload).eq('id',task.id))}
    setSaving(false)
    if(error){alert('保存失败:'+error.message)}else{onSave()}
  }

  const tabBtn=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{padding:'7px 18px',borderRadius:8,border:'none',
      cursor:'pointer',fontFamily:F,fontSize:13,fontWeight:700,
      background:tab===t?C.gold:'transparent',color:tab===t?'white':C.muted}}>
      {label}
    </button>
  )

  return(
    <div style={{padding:24,fontFamily:F,color:C.text,maxWidth:860}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:14}}>← 返回</button>
        <div style={{fontSize:16,fontWeight:700}}>{isNew?'新建 Excel 题目':'编辑 Excel 题目'}</div>
        <div style={{flex:1}}/>
        <Btn onClick={save} disabled={saving} color={C.gold}>{saving?'保存中…':'保存题目'}</Btn>
      </div>

      <div style={{display:'flex',gap:4,background:C.panel,padding:4,borderRadius:10,
        marginBottom:20,width:'fit-content',border:`1px solid ${C.border}`}}>
        {tabBtn('basic','基本信息')}
        {tabBtn('data','表格数据')}
        {tabBtn('formulas','公式格子')}
        {tabBtn('rules','评分规则')}
      </div>

      {/* 基本信息 */}
      {tab==='basic'&&(
        <Card>
          <div style={{display:'grid',gridTemplateColumns:'1fr 160px',gap:16,marginBottom:16}}>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:7}}>题目名称 *</div>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：员工销售业绩分析" style={inp()}/>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted,marginBottom:7}}>时限（秒）</div>
              <input type="number" value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))} style={inp({color:C.gold})}/>
            </div>
          </div>
          <div style={{fontSize:12,color:C.muted,marginBottom:7}}>题目描述</div>
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="简要描述题目要求" style={inp({marginBottom:16})}/>
          <div style={{fontSize:12,color:C.muted,marginBottom:7}}>列标题（逗号分隔）</div>
          <input value={colHeadersStr} onChange={e=>setColHeadersStr(e.target.value)}
            placeholder="例：姓名,部门,销售额,排名,是否达标" style={inp()}/>
          <div style={{fontSize:11,color:'#9ca3af',marginTop:6}}>
            填写每列的标题，会显示在表头行
          </div>
        </Card>
      )}

      {/* 表格数据 */}
      {tab==='data'&&(
        <Card>
          <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>粘贴表格数据</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.7}}>
            从 Excel 中选中数据区域（含表头）复制，粘贴到下方文本框，然后点「导入」。<br/>
            <b style={{color:C.text}}>公式格子留空</b>（学生需要自己填写的格子，在 Excel 里不要填数据）。
          </div>
          <textarea value={csvData} onChange={e=>setCsvData(e.target.value)} rows={10}
            placeholder={"从 Excel 复制数据粘贴到这里（Tab 分隔）\n姓名\t部门\t销售额\t排名\n张三\t销售部\t\t\n李四\t技术部\t\t"}
            style={{...inp({resize:'vertical',lineHeight:1.6,fontFamily:"'DM Mono',monospace"}),width:'100%',boxSizing:'border-box',marginBottom:10}}/>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <Btn small onClick={parseCsv} color={C.gold}>导入数据</Btn>
            {csvMsg&&<span style={{fontSize:13,color:C.green}}>{csvMsg}</span>}
          </div>
          {initialData.length>0&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>预览（前5行）</div>
              <div style={{overflow:'auto',borderRadius:8,border:`1px solid ${C.border}`}}>
                <table style={{borderCollapse:'collapse',fontSize:12,whiteSpace:'nowrap'}}>
                  {colHeadersStr&&(
                    <thead>
                      <tr>
                        {colHeadersStr.split(',').map((h,i)=>(
                          <th key={i} style={{background:'#1e3a5f',color:'white',padding:'6px 10px',
                            border:`1px solid ${C.border}`,fontWeight:700}}>{h.trim()}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {initialData.slice(0,5).map((row,ri)=>(
                      <tr key={ri}>
                        {row.map((v,ci)=>(
                          <td key={ci} style={{padding:'5px 10px',border:`1px solid ${C.border}`,
                            background:v===null?'#fefce8':undefined,color:v===null?'#ca8a04':undefined}}>
                            {v===null?'（公式格）':String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:6}}>黄色格子 = 学生需要填写公式的位置</div>
            </div>
          )}
        </Card>
      )}

      {/* 公式格子 */}
      {tab==='formulas'&&(
        <Card>
          <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
            <div style={{flex:1,fontSize:13,color:C.muted}}>定义哪些格子是公式格（学生需要填写）</div>
            <Btn small onClick={addFC} color={C.gold}>＋ 添加</Btn>
          </div>
          {formulaCells.map((fc,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'140px 1fr auto',gap:10,marginBottom:10,alignItems:'end'}}>
              <div>
                <div style={{fontSize:11,color:C.muted,marginBottom:5}}>单元格范围</div>
                <input value={fc.range} onChange={e=>updFC(i,'range',e.target.value)}
                  placeholder="如 D2:D20" style={inp({fontFamily:"'DM Mono',monospace"})}/>
              </div>
              <div>
                <div style={{fontSize:11,color:C.muted,marginBottom:5}}>给学生的提示（显示在格子里）</div>
                <input value={fc.hint} onChange={e=>updFC(i,'hint',e.target.value)}
                  placeholder="如 =RANK(D2,$D$2:$D$20,0)" style={inp({fontFamily:"'DM Mono',monospace"})}/>
              </div>
              <button onClick={()=>delFC(i)} style={{background:'none',border:'none',
                color:C.red,cursor:'pointer',fontSize:18,paddingBottom:2}}>×</button>
            </div>
          ))}
          {!formulaCells.length&&<div style={{color:C.muted,fontSize:13}}>暂无公式格定义</div>}
          <div style={{marginTop:14,padding:'10px 14px',borderRadius:8,background:'#f8fafc',
            border:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>
            💡 范围格式：A1 (单格) 或 D2:D20 (区域)。导入数据时留空的格子会自动标黄，也可以在这里手动指定。
          </div>
        </Card>
      )}

      {/* 评分规则 */}
      {tab==='rules'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
            <div style={{flex:1,fontSize:13,color:C.muted}}>设置评分规则，系统自动检验</div>
            <Btn small onClick={addRule} color={C.gold}>＋ 添加规则</Btn>
          </div>
          {rules.map((r,i)=>(
            <Card key={r.id||i} style={{marginBottom:12}}>
              <div style={{display:'grid',gridTemplateColumns:'200px 1fr auto',gap:10,marginBottom:12,alignItems:'start'}}>
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>评分类型</div>
                  <select value={r.type} onChange={e=>updRule(i,'type',e.target.value)}
                    style={{...inp({padding:'8px 10px',cursor:'pointer'})}}>
                    {RULE_TYPES.map(t=><option key={t.k} value={t.k}>{t.label}</option>)}
                  </select>
                  <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>
                    {RULE_TYPES.find(t=>t.k===r.type)?.hint}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>显示给学生的说明</div>
                  <input value={r.desc} onChange={e=>updRule(i,'desc',e.target.value)}
                    placeholder="例：用 RANK 函数计算销售排名" style={inp()}/>
                </div>
                <button onClick={()=>delRule(i)} style={{background:'none',border:'none',
                  color:C.red,cursor:'pointer',fontSize:18,marginTop:20}}>×</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'130px 1fr 80px 80px',gap:10,alignItems:'end'}}>
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>检验单元格范围</div>
                  <input value={r.cells||''} onChange={e=>updRule(i,'cells',e.target.value)}
                    placeholder="如 D2:D20" style={inp({fontFamily:"'DM Mono',monospace"})}/>
                </div>
                {r.type==='formula_keyword'&&(
                  <div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:5}}>必须包含的函数名</div>
                    <input value={r.keyword||''} onChange={e=>updRule(i,'keyword',e.target.value.toUpperCase())}
                      placeholder="如 SUM / RANK / IF" style={inp({fontFamily:"'DM Mono',monospace"})}/>
                  </div>
                )}
                {(r.type==='formula_keyword'||r.type==='value_match')&&(
                  <div style={{gridColumn:r.type==='value_match'?'2/4':'auto',flex:1}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:5}}>期望结果（逗号分隔）</div>
                    <input value={expectedToStr(r.expected)} onChange={e=>updRule(i,'expected',parseExpected(e.target.value))}
                      placeholder="如 100,200,300" style={inp({fontFamily:"'DM Mono',monospace"})}/>
                  </div>
                )}
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>每格分值</div>
                  <input type="number" value={r.pts_each||0} min={0}
                    onChange={e=>{const v=Number(e.target.value);const cells=exGetRange(r.cells||'');updRule(i,'pts_each',v);updRule(i,'total_pts',v*cells.length)}}
                    style={inp({color:C.gold})}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:5}}>总分</div>
                  <input type="number" value={r.total_pts||r.pts||0} readOnly
                    style={inp({color:C.gold,background:'#f9fafb'})}/>
                </div>
              </div>
              <div style={{marginTop:10,fontSize:11,color:C.muted}}>
                预计 {r.type==='style'?'—':exGetRange(r.cells||'').length} 格 × {r.pts_each||0} 分 = {r.total_pts||0} 分
              </div>
            </Card>
          ))}
          {rules.length>0&&(
            <div style={{marginTop:6,padding:'10px 14px',borderRadius:8,
              background:'rgba(217,119,6,.06)',border:`1px solid ${C.gold}33`,fontSize:13,color:C.muted}}>
              总分：<span style={{color:C.gold,fontWeight:700}}>{rules.reduce((s,r)=>s+(Number(r.total_pts)||Number(r.pts)||0),0)}</span> 分
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// EXCEL TASK LIBRARY (teacher backend)
// ══════════════════════════════════════════════════════════════
function ExcelTaskLibrary({onSelect,selectedId}){
  const [tasks,setTasks]=useState([])
  const [loading,setLoading]=useState(true)
  const [editing,setEditing]=useState(null) // null=list, task|"new"=editor

  const load=()=>{
    setLoading(true)
    sb.from("lulu_excel_tasks").select("id,title,description,scoring_rules,time_limit")
      .order("created_at",{ascending:false})
      .then(({data})=>{if(data)setTasks(data);setLoading(false)})
  }
  useEffect(()=>{load()},[])

  async function del(id,e){
    e.stopPropagation()
    if(!confirm("确定删除这道题？")) return
    await sb.from("lulu_excel_tasks").delete().eq("id",id)
    setTasks(p=>p.filter(t=>t.id!==id))
  }

  if(editing!==null){
    return <ExcelTaskEditor
      task={editing==="new"?null:editing}
      onSave={()=>{setEditing(null);load()}}
      onBack={()=>setEditing(null)}/>
  }

  if(loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}>加载中…</div>

  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700}}>表格题库</div>
          <div style={{fontSize:13,color:C.muted,marginTop:2}}>{tasks.length} 道 Excel 题目</div>
        </div>
        <Btn small onClick={()=>setEditing("new")} color={C.gold}>＋ 新建题目</Btn>
      </div>
      {!tasks.length&&<Card style={{textAlign:"center",padding:48,color:C.muted}}>
        暂无题目，点「新建题目」创建
      </Card>}
      {tasks.map(t=>(
        <Card key={t.id} style={{marginBottom:12,cursor:"pointer",
          border:selectedId===t.id?`2px solid ${C.gold}`:`1px solid ${C.border}`}}
          onClick={()=>onSelect&&onSelect(t)}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>📊 {t.title}</div>
              {t.description&&<div style={{fontSize:13,color:C.muted,marginBottom:8}}>{t.description}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(t.scoring_rules||[]).map((r,i)=>(
                  <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:5,
                    background:"rgba(217,119,6,.08)",color:C.gold,border:`1px solid ${C.gold}22`}}>
                    {r.total_pts||r.pts||0}分 · {r.desc}
                  </span>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
              <span style={{fontSize:12,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{Math.floor((t.time_limit||600)/60)}分钟</span>
              <Btn small onClick={e=>{e.stopPropagation();setEditing(t)}} style={{background:"rgba(0,0,0,.06)",color:C.text}}>编辑</Btn>
              <button onClick={e=>del(t.id,e)} style={{background:"none",border:"none",
                color:"rgba(220,38,38,.5)",cursor:"pointer",fontSize:16,lineHeight:1}}>✕</button>
            </div>
          </div>
          {selectedId===t.id&&<div style={{marginTop:8,fontSize:12,color:C.gold,fontWeight:700}}>✓ 已选择此题</div>}
        </Card>
      ))}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// UPLOAD SCORE PANEL (file-based scoring via Edge Function)
// ══════════════════════════════════════════════════════════════
function UploadScorePanel({fileType, scoringRules, onScore, sessionId, studentName, taskId}){
  const [loading,setLoading]=useState(false)
  const [result,setResult]=useState(null)
  const [error,setError]=useState(null)
  const inputRef=useRef(null)

  async function handleFile(e){
    const file=e.target.files?.[0]
    if(!file) return
    setLoading(true); setResult(null); setError(null)
    try{
      // Read as base64
      const b64=await new Promise((res,rej)=>{
        const reader=new FileReader()
        reader.onload=()=>res(reader.result)
        reader.onerror=()=>rej(reader.error)
        reader.readAsDataURL(file)
      })
      const resp=await fetch(SCORE_OFFICE_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({fileBase64:b64,fileType,scoringRules})
      })
      if(!resp.ok) throw new Error(`服务器错误 ${resp.status}`)
      const data=await resp.json()
      if(data.error) throw new Error(data.error)
      setResult(data)
      if(onScore) onScore(data)
      // Save to DB if sessionId and taskId provided
      if(sessionId&&taskId){
        const storageUrl2 = await uploadFileToStorage(b64, file.name)
        await sb.from("lulu_file_submissions").insert({
          session_id:sessionId, student_name:studentName||"匿名",
          task_id:taskId, file_name:file.name,
          file_base64:b64, file_type:fileType,
          storage_url:storageUrl2||null,
          auto_score:data.total, auto_max:data.max,
          auto_detail:data.details||[]
        })
        // Create placeholder so teacher confirm fires UPDATE (not INSERT)
        // docx→lab phase, xlsx→excel phase
        const uploadPhase=(fileType==='docx')?'lab':'excel'
        await sb.from("word_lab_submissions").upsert({
          session_id:sessionId, student_name:studentName||"匿名",
          score:data.total, max_score:data.max||0,
          submitted:true, phase:uploadPhase,
          completed_tasks:(data.details||[]).filter(d=>d.ok).map(d=>d.id)
        },{onConflict:'session_id,student_name,phase',ignoreDuplicates:true})
      }
    }catch(err){
      setError(err.message)
    }
    setLoading(false)
    e.target.value=''
  }

  return(
    <div style={{marginTop:16,padding:"14px 16px",borderRadius:10,
      background:"rgba(5,150,105,.06)",border:"1px solid rgba(5,150,105,.2)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"#059669",marginBottom:2}}>
            📎 上传真实文件评分
          </div>
          <div style={{fontSize:11,color:C.muted}}>
            上传你在本机 {fileType==='xlsx'?'Excel':'Word'} 中完成的文件，获得更精准的评分
          </div>
        </div>
        <input ref={inputRef} type="file"
          accept={fileType==='xlsx'?'.xlsx,.xls':'.docx'}
          onChange={handleFile} style={{display:'none'}}/>
        <button onClick={()=>inputRef.current?.click()} disabled={loading} style={{
          padding:"8px 16px",borderRadius:8,border:"1px solid #059669",
          background:loading?"rgba(5,150,105,.1)":"white",
          color:"#059669",cursor:loading?"wait":"pointer",
          fontSize:12,fontWeight:700,fontFamily:F,whiteSpace:"nowrap"
        }}>{loading?"解析中…":"选择文件"}</button>
      </div>
      {error&&(
        <div style={{marginTop:10,padding:"8px 12px",borderRadius:7,
          background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.2)",
          fontSize:12,color:C.red}}>⚠ {error}</div>
      )}
      {result&&(
        <div style={{marginTop:12}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:8}}>文件评分结果：</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {result.details?.map((d,i)=>(
              <div key={i} style={{padding:"6px 12px",borderRadius:8,fontSize:12,
                background:d.ok?"rgba(5,150,105,.08)":"rgba(220,38,38,.06)",
                border:`1px solid ${d.ok?"rgba(5,150,105,.3)":"rgba(220,38,38,.2)"}`,
                color:d.ok?"#059669":C.red}}>
                {d.ok?"✓":"✗"} {d.desc}
                {d.pts>0&&d.ok&&<span style={{marginLeft:4,fontWeight:700}}>+{d.pts}</span>}
                {d.items&&<span style={{marginLeft:4,color:C.muted}}>
                  ({d.items.filter((x)=>x.ok).length}/{d.items.length})
                </span>}
              </div>
            ))}
          </div>
          <div style={{padding:"8px 14px",borderRadius:8,
            background:"rgba(5,150,105,.1)",border:"1px solid rgba(5,150,105,.3)",
            fontSize:14,fontWeight:700,color:"#059669",textAlign:"center"}}>
            文件评分：{result.total} / {result.max} 分
          </div>
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// INLINE FILE VIEWER
// ══════════════════════════════════════════════════════════════
function InlineFileViewer({sub}){
  const [html,setHtml]=useState(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState(null)

  const officeViewerUrl = sub.storage_url
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(sub.storage_url)}&wdAllowInteractivity=False&wdDownloadButton=False`
    : null

  function renderFile(){
    if(html)return
    // Office Online: show iframe directly
    if(officeViewerUrl){setHtml('office_online');return}
    // Fallback: parse locally with SheetJS / mammoth
    setLoading(true); setError(null)
    const b64=sub.file_base64
    if(!b64){setError("无文件数据");setLoading(false);return}
    const raw=b64.replace(/^data:[^;]+;base64,/,'')
    const isXlsx=sub.file_type==='xlsx'||sub.file_name?.endsWith('.xlsx')||sub.file_name?.endsWith('.xls')
    const isDocx=sub.file_type==='docx'||sub.file_name?.endsWith('.docx')

    function loadScript(src, check){
      return new Promise((res,rej)=>{
        if(check()){res();return}
        const s=document.createElement('script')
        s.src=src; s.onload=res; s.onerror=rej
        document.head.appendChild(s)
      })
    }

    if(isXlsx){
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',()=>!!window.XLSX)
        .then(()=>{
          const wb=window.XLSX.read(raw,{type:'base64'})
          const tabStyle=`.sheet-tabs{display:flex;gap:4px;padding:6px 8px 0;background:#f3f4f6;border-bottom:1px solid #d1d9e6}.sheet-tab{padding:4px 12px;border-radius:6px 6px 0 0;cursor:pointer;font-size:12px;background:white;border:1px solid #d1d9e6;border-bottom:none;color:#374151}.sheet-tab.active{color:#2563eb;font-weight:700;border-bottom:1px solid white;margin-bottom:-1px}.sheet-content{display:none;padding:8px;overflow:auto}.sheet-content.active{display:block}table{border-collapse:collapse;font-size:12px;font-family:system-ui;min-width:100%}td,th{border:1px solid #d1d9e6;padding:4px 8px;white-space:nowrap}tr:first-child td,tr:first-child th{background:#f3f4f6;font-weight:700}`
          const tabs=wb.SheetNames.map((n,i)=>`<div class="sheet-tab${i===0?' active':''}" onclick="this.parentElement.querySelectorAll('.sheet-tab').forEach(t=>t.classList.remove('active'));this.classList.add('active');document.querySelectorAll('.sheet-content').forEach(c=>c.classList.remove('active'));document.getElementById('sc${i}').classList.add('active')">${n}</div>`).join('')
          const sheets=wb.SheetNames.map((n,i)=>`<div id="sc${i}" class="sheet-content${i===0?' active':''}">${window.XLSX.utils.sheet_to_html(wb.Sheets[n])}</div>`).join('')
          setHtml(`<style>${tabStyle}</style><div class="sheet-tabs">${tabs}</div>${sheets}`)
          setLoading(false)
        }).catch(e=>{setError("预览失败："+e.message);setLoading(false)})
    } else if(isDocx){
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',()=>!!window.mammoth)
        .then(()=>{
          const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0))
          return window.mammoth.convertToHtml({arrayBuffer:bytes.buffer})
        })
        .then(result=>{
          setHtml(`<style>.dp{font-family:Georgia,serif;line-height:1.8;padding:8px}.dp h1{font-size:20px;font-weight:900;margin:12px 0 8px}.dp h2{font-size:16px;font-weight:800;margin:10px 0 6px}.dp p{margin:0 0 10px}.dp table{border-collapse:collapse;width:100%;margin:12px 0}.dp td,.dp th{border:1px solid #cbd5e1;padding:6px 10px}</style><div class="dp">${result.value}</div>`)
          setLoading(false)
        }).catch(e=>{setError("预览失败："+e.message);setLoading(false)})
    } else {
      setError("不支持此文件类型（支持 .xlsx / .docx）")
      setLoading(false)
    }
  }

  return(
    <div style={{marginTop:12,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
      {!html&&!loading&&(
        <button onClick={renderFile} style={{
          width:"100%",padding:"12px",background:"#f8fafc",border:"none",
          cursor:"pointer",fontSize:13,color:C.accent,fontFamily:F,fontWeight:700
        }}>📄 点击在线预览文件{officeViewerUrl?" （Office Online，含图表）":" （本地解析）"}</button>
      )}
      {loading&&<div style={{padding:20,textAlign:"center",color:C.muted,fontSize:13}}>加载中…</div>}
      {error&&<div style={{padding:12,color:C.red,fontSize:12}}>{error}</div>}
      {html==='office_online'&&officeViewerUrl&&(
        <iframe src={officeViewerUrl}
          style={{width:"100%",height:520,border:"none",display:"block"}}
          title="文件预览"/>
      )}
      {html&&html!=='office_online'&&(
        <div style={{maxHeight:500,overflow:"auto",padding:12,background:"white"}}
          dangerouslySetInnerHTML={{__html:html}}/>
      )}
      {/* Screenshot section */}
      {sub.screenshot_base64&&(
        <div style={{borderTop:`1px solid ${C.border}`}}>
          <div style={{padding:"8px 12px",fontSize:12,color:C.muted,background:"#f8fafc",fontWeight:700}}>
            📊 图表截图
          </div>
          <div style={{padding:12,background:"white",textAlign:"center"}}>
            <img src={sub.screenshot_base64} alt="图表截图"
              style={{maxWidth:"100%",maxHeight:400,borderRadius:6,border:`1px solid ${C.border}`}}/>
          </div>
        </div>
      )}
      {!sub.screenshot_base64&&html&&(
        <div style={{padding:"8px 12px",fontSize:11,color:C.muted,background:"#f8fafc",
          borderTop:`1px solid ${C.border}`,textAlign:"center"}}>
          暂无图表截图（学生可点「🖼 上传图表截图」上传）
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// FILE REVIEW PANEL (teacher: view submitted files + score)
// ══════════════════════════════════════════════════════════════
function FileReviewPanel({sessionId}){
  const [subs,setSubs]=useState([])
  const [loading,setLoading]=useState(true)
  const [expanded,setExpanded]=useState(null)
  const [editScore,setEditScore]=useState({})
  const [editNote,setEditNote]=useState({})
  const [saving,setSaving]=useState({})

  useEffect(()=>{
    if(!sessionId){setLoading(false);return}
    sb.from("lulu_file_submissions")
      .select("id,session_id,student_name,file_name,file_type,file_base64,storage_url,screenshot_base64,auto_score,auto_max,auto_detail,teacher_score,teacher_note,created_at")
      .eq("session_id",sessionId)
      .order("created_at",{ascending:false})
      .then(({data})=>{if(data)setSubs(data);setLoading(false)})
  },[sessionId])

  async function saveScore(id){
    setSaving(p=>({...p,[id]:true}))
    const sub=subs.find(s=>s.id===id)
    const score=editScore[id]!==undefined?Number(editScore[id]):(sub?.teacher_score??sub?.auto_score??0)
    const note=editNote[id]!==undefined?editNote[id]:(sub?.teacher_note||'')
    // Update file submission record
    await sb.from("lulu_file_submissions").update({
      teacher_score:score, teacher_note:note
    }).eq("id",id)
    // Sync final score to word_lab_submissions
    const sid=sub?.session_id
    const sname=sub?.student_name
    // docx=文字排版(lab), xlsx=表格制作(excel)
    const subPhase=(sub?.file_type==='docx'||sub?.file_name?.toLowerCase().endsWith('.docx'))?'lab':'excel'
    if(sid&&sname){
      await sb.from("word_lab_submissions").upsert({
        session_id:sid, student_name:sname,
        score, max_score:sub.auto_max||0, submitted:true, phase:subPhase,
        completed_tasks:(sub.auto_detail||[]).filter(d=>d.ok).map(d=>d.id)
      },{onConflict:'session_id,student_name,phase',ignoreDuplicates:false})
    } else {
      console.warn("saveScore: missing session_id or student_name", {sid,sname,sub})
    }
    setSubs(p=>p.map(s=>s.id===id?{...s,teacher_score:score,teacher_note:note}:s))
    setSaving(p=>({...p,[id]:false}))
  }

  if(loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}>加载中…</div>
  if(!subs.length) return(
    <div style={{padding:40,textAlign:"center",color:C.muted}}>
      暂无提交的文件。学生上传文件后会在此显示。
    </div>
  )

  return(
    <div style={{padding:16,fontFamily:F}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>
        文件提交记录 · {subs.length} 份
      </div>
      {subs.map(sub=>{
        const isOpen=expanded===sub.id
        const detail=sub.auto_detail||[]
        const finalScore=sub.teacher_score!==null&&sub.teacher_score!==undefined
          ?sub.teacher_score:sub.auto_score
        return(
          <Card key={sub.id} style={{marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700}}>{sub.student_name}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                  {sub.file_name||"未命名"} · {new Date(sub.created_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:C.muted}}>自动评分</div>
                <div style={{fontSize:18,fontWeight:900,color:C.gold,fontFamily:FM}}>
                  {sub.auto_score}<span style={{fontSize:11,color:C.muted}}>/{sub.auto_max}</span>
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:C.muted}}>最终分</div>
                <div style={{fontSize:18,fontWeight:900,color:C.accent,fontFamily:FM}}>
                  {finalScore}<span style={{fontSize:11,color:C.muted}}>/{sub.auto_max}</span>
                </div>
              </div>
              <button onClick={()=>setExpanded(isOpen?null:sub.id)} style={{
                background:isOpen?C.accent:"none",
                border:`1px solid ${isOpen?C.accent:C.border}`,borderRadius:7,
                padding:"5px 14px",cursor:"pointer",fontSize:12,
                color:isOpen?"white":C.muted,fontFamily:F
              }}>{isOpen?"收起▲":"查看▼"}</button>
            </div>

            {isOpen&&(
              <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
                {/* Inline file preview */}
                <InlineFileViewer sub={sub}/>

                {/* Auto score detail */}
                {detail.length>0&&(
                  <div style={{margin:"14px 0"}}>
                    <div style={{fontSize:12,color:C.muted,marginBottom:8}}>自动评分详情：</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {detail.map((d,i)=>(
                        <span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:6,
                          background:d.ok?"rgba(5,150,105,.08)":"rgba(220,38,38,.06)",
                          border:`1px solid ${d.ok?"rgba(5,150,105,.3)":"rgba(220,38,38,.2)"}`,
                          color:d.ok?"#059669":C.red}}>
                          {d.ok?"✓":"✗"} {d.desc}{d.pts>0&&d.ok?` +${d.pts}分`:""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher score override */}
                <div style={{display:"grid",gridTemplateColumns:"120px 1fr auto",gap:10,alignItems:"end",
                  padding:"12px",borderRadius:8,background:"rgba(37,99,235,.04)",border:`1px solid ${C.accent}22`}}>
                  <div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:5}}>老师定分（覆盖自动分）</div>
                    <input type="number" min={0} max={sub.auto_max}
                      value={editScore[sub.id]!==undefined?editScore[sub.id]:(sub.teacher_score??sub.auto_score)}
                      onChange={e=>setEditScore(p=>({...p,[sub.id]:e.target.value}))}
                      style={inp({color:C.accent,fontWeight:700})}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:5}}>评语</div>
                    <input
                      value={editNote[sub.id]!==undefined?editNote[sub.id]:(sub.teacher_note||'')}
                      onChange={e=>setEditNote(p=>({...p,[sub.id]:e.target.value}))}
                      placeholder="如：图表缺少标题，扣2分"
                      style={inp()}/>
                  </div>
                  <Btn small onClick={()=>saveScore(sub.id)} disabled={saving[sub.id]} color={C.accent}>
                    {saving[sub.id]?"保存…":"确认分数"}
                  </Btn>
                </div>
              </div>
            )}
          </Card>
        )
      })}
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
  const [labScore,setLabScore]=useState(0)
  const [excelScore,setExcelScore]=useState(0)
  const [bonusScore,setBonusScore]=useState(0)
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
    // Load existing total score from all phases
    sb.from("word_lab_submissions").select("score,phase").eq("session_id",init.id).eq("student_name",studentName)
      .then(({data})=>{
        if(data&&data.length>0){
          const lab=data.filter(r=>r.phase==="lab").reduce((s,r)=>s+(r.score||0),0)
          const excel=data.filter(r=>r.phase==="excel").reduce((s,r)=>s+(r.score||0),0)
          setLabScore(lab); setExcelScore(excel); setFinalScore(lab+excel)
        }
      })
    // Load bonus pts
    sb.from("word_lab_checkins").select("bonus_pts").eq("session_id",init.id).eq("student_name",studentName).maybeSingle()
      .then(({data})=>{ if(data) setBonusScore(data.bonus_pts||0) })
    // Load layout task from library
    if(init.layout_task_id){
      sb.from("lulu_layout_tasks").select().eq("id",init.layout_task_id).single()
        .then(({data})=>{
          if(data) setActiveTask(data)
          setTaskLoaded(true)
        }).catch(()=>setTaskLoaded(true))
    } else { setTaskLoaded(true) } // no task, use TASK fallback immediately
  },[])

  // Poll score when finished - hooks must be before any conditional returns
  useEffect(()=>{
    if(sess.phase!=="finished") return
    function applyScores(data){
      if(!data||!data.length) return
      const lab=data.filter(r=>r.phase==="lab").reduce((s,r)=>s+(r.score||0),0)
      const excel=data.filter(r=>r.phase==="excel").reduce((s,r)=>s+(r.score||0),0)
      setLabScore(lab); setExcelScore(excel); setFinalScore(lab+excel)
    }
    // Initial load
    sb.from("word_lab_submissions").select("score,phase")
      .eq("session_id",init.id).eq("student_name",studentName)
      .then(({data})=>applyScores(data))
    // Also load bonus from checkin
    sb.from("word_lab_checkins").select("bonus_pts")
      .eq("session_id",init.id).eq("student_name",studentName).single()
      .then(({data})=>{ if(data) setBonusScore(data.bonus_pts||0) })
    const poll=setInterval(()=>{
      sb.from("word_lab_submissions").select("score,phase")
        .eq("session_id",init.id).eq("student_name",studentName)
        .then(({data})=>applyScores(data))
    },3000)
    return()=>clearInterval(poll)
  },[sess.phase])

  useEffect(()=>{
    const ch=sb.channel(`smain-${init.id}`)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"word_lab_sessions",filter:`id=eq.${init.id}`},
        async({new:s})=>{
          try {
            setSess(s)
            // If switching to excel, reload session to get excel_task_id
            if(s.phase==="excel"&&!init.excel_task_id){
              sb.from("word_lab_sessions").select("excel_task_id").eq("id",init.id).single()
                .then(({data})=>{ if(data?.excel_task_id) init.excel_task_id=data.excel_task_id })
            }
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
                {session_id:s.id,student_name:studentName,score:0,max_score:((activeTask?.requirements)||TASK.reqs).reduce((s,r)=>s+r.pts,0),completed_tasks:[],phase:'lab'},
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
      // Listen for own submission score changes (teacher override) - both INSERT and UPDATE
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"word_lab_submissions",filter:`session_id=eq.${init.id}`},
        ({new:s})=>{
          if(s.student_name===studentName){
            sb.from("word_lab_submissions").select("score,phase").eq("session_id",init.id).eq("student_name",studentName)
              .then(({data})=>{
                if(data){
                  const lab=data.filter(r=>r.phase==="lab").reduce((s,r)=>s+(r.score||0),0)
                  const excel=data.filter(r=>r.phase==="excel").reduce((s,r)=>s+(r.score||0),0)
                  setLabScore(lab);setExcelScore(excel);setFinalScore(lab+excel)
                }
              })
          }
        })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"word_lab_submissions",filter:`session_id=eq.${init.id}`},
        ({new:s})=>{
          if(s.student_name===studentName){
            sb.from("word_lab_submissions").select("score,phase").eq("session_id",init.id).eq("student_name",studentName)
              .then(({data})=>{
                if(data){
                  const lab=data.filter(r=>r.phase==="lab").reduce((s,r)=>s+(r.score||0),0)
                  const excel=data.filter(r=>r.phase==="excel").reduce((s,r)=>s+(r.score||0),0)
                  setLabScore(lab);setExcelScore(excel);setFinalScore(lab+excel)
                }
              })
          }
        })
      .subscribe()
    // Fallback poll every 6s in case realtime misses events
    const pollRef=setInterval(()=>{
      sb.from("word_lab_checkins").select().eq("session_id",init.id)
        .then(({data})=>data&&setCheckins(data))
    },6000)
    return()=>{sb.removeChannel(ch);clearInterval(timerRef.current);clearInterval(pollRef)}
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
    await sb.from("word_lab_submissions").update({submitted:true,score,phase:'lab'}).eq("id",subId)
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

  // Excel phase
  if(sess.phase==="excel"){
    return(
      <ExcelSheet
        task={null}
        excelTaskId={sess.excel_task_id}
        studentName={studentName}
        sessionId={init.id}
        onBack={null}
      />
    )
  }

  // Lab screen
  if(sess.phase==="lab"&&!taskLoaded) return <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F,color:C.muted}}>题目加载中…</div>

  // Open-ended subjective task: upload-only UI, no browser editor
  const isOpenEnded=activeTask?.target_html==='__open_ended__'||(activeTask&&!(activeTask.requirements||[]).length&&!activeTask.target_html)
  if(sess.phase==="lab"&&taskLoaded&&isOpenEnded){
    return(
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,color:C.text}}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <div style={{background:"#1e3a5f",padding:"14px 24px",display:"flex",alignItems:"center",gap:16}}>
          <div style={{color:"white",fontWeight:700,fontSize:15}}>📝 {activeTask?.title||"排版作业"}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.6)",flex:1}}>主观排版 · 老师评分</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.5)",fontFamily:FM}}>{studentName}</div>
        </div>
        <div style={{maxWidth:800,margin:"40px auto",padding:"0 24px"}}>
          <Card style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:8,color:C.accent}}>📋 作业要求</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.8}}>{activeTask?.description}</div>
            <div style={{fontSize:12,color:C.muted,borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:12}}>
              根据以下原始数据，在本机 Word 中自由设计一份完整的数据分析报告，完成后保存为 .docx 上传
            </div>
          </Card>
          <Card style={{marginBottom:20,background:"#f8fafc"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10}}>📄 原始数据素材</div>
            <div style={{fontSize:13,lineHeight:2,color:C.text,fontFamily:"Georgia,serif"}}
              dangerouslySetInnerHTML={{__html:activeTask?.raw_html||""}}/>
          </Card>
          <Card style={{border:`2px solid ${C.accent}22`,background:"rgba(37,99,235,.03)"}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>📤 上传完成的报告</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>在本机 Word 完成排版后，另存为 .docx 格式上传，由老师查阅评分</div>
            <UploadScorePanel
              fileType="docx"
              scoringRules={[]}
              sessionId={init.id}
              studentName={studentName}
              taskId={activeTask?.id||null}
              onScore={null}
            />
            <div style={{marginTop:12,fontSize:12,color:C.muted,textAlign:"center"}}>
              上传后老师会在「文件审阅」中查看你的报告并手动打分
            </div>
          </Card>
        </div>
      </div>
    )
  }

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
                <div dangerouslySetInnerHTML={{__html:
                    (activeTask?.target_html&&activeTask.target_html.trim())
                      ? activeTask.target_html
                      : (activeTask?.raw_html
                          ? `<div style="color:#6b7280;font-size:12px;padding:8px 0 16px;border-bottom:1px solid #e5e7eb;margin-bottom:16px">⚠ 此题暂无样板效果，请参考任务清单完成排版</div>${activeTask.raw_html}`
                          : TASK.targetHtml)
                  }}/>
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
            {/* Upload file scoring */}
            <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`}}>
              <UploadScorePanel
                fileType="docx"
                scoringRules={(activeTask?.requirements)||TASK.reqs}
                sessionId={init.id}
                studentName={studentName}
                taskId={activeTask?.id||null}
                onScore={null}
              />
            </div>
          </div>

        </div>
      </div>
    )
  }
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:F,gap:16,padding:24}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{fontSize:40}}>🏅</div>
      <div style={{fontSize:28,fontWeight:900}}>{studentName}</div>
      {myGroup&&<div style={{fontSize:14,color:myGroup.color,fontWeight:700}}>{myGroup.name}</div>}
      <div style={{display:"flex",gap:14,marginTop:8}}>
        <Card style={{textAlign:"center",padding:"14px 20px"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>抢答</div>
          <div style={{fontSize:28,fontWeight:900,color:C.blue,fontFamily:FM}}>{quizPts}</div>
        </Card>
        {bonusScore>0&&<Card style={{textAlign:"center",padding:"14px 20px"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>讨论</div>
          <div style={{fontSize:28,fontWeight:900,color:C.purple,fontFamily:FM}}>+{bonusScore}</div>
        </Card>}
        <Card style={{textAlign:"center",padding:"14px 20px"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>文字排版</div>
          <div style={{fontSize:28,fontWeight:900,color:C.accent,fontFamily:FM}}>{labScore||score}</div>
        </Card>
        <Card style={{textAlign:"center",padding:"14px 20px"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>表格制作</div>
          <div style={{fontSize:28,fontWeight:900,color:C.green,fontFamily:FM}}>{excelScore}</div>
        </Card>
        <Card style={{textAlign:"center",padding:"14px 20px",border:`2px solid ${C.gold}22`}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>总分</div>
          <div style={{fontSize:28,fontWeight:900,color:C.gold,fontFamily:FM}}>{quizPts+bonusScore+(finalScore||score)}</div>
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
      sb.from("word_lab_submissions").select("student_name,score,phase,submitted").eq("session_id",sid),
      sb.from("word_lab_answers").select("student_name,points_earned").eq("session_id",sid),
      sb.from("lulu_groups").select("id,name,color").eq("session_id",sid),
    ])
    const quizScores={}
    ;(answers||[]).forEach(a=>{quizScores[a.student_name]=(quizScores[a.student_name]||0)+a.points_earned})
    const labScores={}
    // Sum ALL phases per student
    ;(subs||[]).forEach(s=>{labScores[s.student_name]=(labScores[s.student_name]||0)+s.score})
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
