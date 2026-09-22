'use client'

import React, { useState, useEffect, useRef, Component } from "react"
import { createClient } from "@supabase/supabase-js"

const SB_URL = "https://ghnrxnoqqteuxxtqlzfv.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobnJ4bm9xcXRldXh4dHFsemZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTY2NjIsImV4cCI6MjA4NTQzMjY2Mn0.dGQJ33N4LISXbHfMwBSmlEXRlmCflpFP3zfziMOPGk4"
const sb = createClient(SB_URL, SB_KEY)
const DEFAULT_PW = "lulu2025"

const C = {
  bg:"#f1f5f9", panel:"#ffffff", border:"#e2e8f0", text:"#0f172a", muted:"#64748b",
  accent:"#0891b2", accentDark:"#0e7490", gold:"#d97706", green:"#059669", red:"#dc2626", purple:"#7c3aed"
}
const F = "'Noto Sans SC',system-ui,sans-serif"
const FM = "'DM Mono','Courier New',monospace"
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap"

const PARTS = [
  {id:"cpu",    name:"CPU 处理器",  emoji:"🧠", req:true,  hint:"如 Intel i5-12400F"},
  {id:"mb",     name:"主板",        emoji:"🟩", req:true,  hint:"如 华硕 B760M"},
  {id:"ram",    name:"内存条",      emoji:"📏", req:true,  hint:"如 金士顿 DDR4 16G"},
  {id:"ssd",    name:"固态硬盘",    emoji:"💾", req:true,  hint:"如 三星 990 EVO 1T"},
  {id:"gpu",    name:"显卡",        emoji:"🎮", req:true,  hint:"如 RTX 4060（核显可填0元）"},
  {id:"cooler", name:"CPU 散热器",  emoji:"🌀", req:true,  hint:"如 利民 AX120"},
  {id:"psu",    name:"电源",        emoji:"⚡", req:true,  hint:"如 长城 650W 金牌"},
  {id:"case",   name:"机箱",        emoji:"🗄️", req:true,  hint:"如 先马 平头哥M2"},
  {id:"monitor",name:"显示器",      emoji:"🖥️", req:false, hint:"如 AOC 27寸 2K"},
  {id:"kb",     name:"键盘",        emoji:"⌨️", req:false, hint:"如 罗技 K845"},
  {id:"mouse",  name:"鼠标",        emoji:"🖱️", req:false, hint:"如 罗技 G102"},
  {id:"hdd",    name:"机械硬盘",    emoji:"📀", req:false, hint:"如 希捷 2T（可选）"},
]
const REQ_IDS = PARTS.filter(p=>p.req).map(p=>p.id)
const LAPTOP_PARTS = [
  {id:"laptop", name:"笔记本整机",    emoji:"💻", req:true,  hint:"品牌+型号，如 联想 小新 Pro 14 2025", wide:true},
  {id:"monitor",name:"外接显示器",    emoji:"🖥️", req:false, hint:"如 AOC 27寸 2K（可选）"},
  {id:"kb",     name:"键盘",          emoji:"⌨️", req:false, hint:"如 罗技 K845（可选）"},
  {id:"mouse",  name:"鼠标",          emoji:"🖱️", req:false, hint:"如 罗技 G102（可选）"},
  {id:"bag",    name:"电脑包 / 支架", emoji:"🎒", req:false, hint:"如 绿联 笔记本支架（可选）"},
]
const LAPTOP_SPECS = [
  {k:"cpu",    label:"CPU",  hint:"如 酷睿 Ultra 5 125H"},
  {k:"ram",    label:"内存", hint:"如 32G LPDDR5X"},
  {k:"ssd",    label:"硬盘", hint:"如 1T 固态"},
  {k:"gpu",    label:"显卡", hint:"如 集成显卡 / RTX 4060"},
  {k:"screen", label:"屏幕", hint:"如 14寸 2.8K 120Hz"},
]
const MODE_LABEL = {desktop:"台式机组装", laptop:"笔记本整机", either:"学生自选"}
const metasFor = mode => mode==="laptop"?LAPTOP_PARTS:PARTS
const ALL_IDS = [...new Set([...PARTS,...LAPTOP_PARTS].map(p=>p.id))]


const emptyParts = () => ALL_IDS.map(id=>({id, model:"", price:"", img:"", link:"", ...(id==="laptop"?{specs:{}}:{})}))
const extractUrl = t => { const m=String(t||"").match(/https?:\/\/[^\s"'<>，。）】]+/); return m?m[0]:"" }
const num = v => { const n=parseFloat(v); return isNaN(n)?0:n }
const calcTotal = (parts,mode="desktop") => { const ids=metasFor(mode).map(m=>m.id); return parts.filter(p=>ids.includes(p.id)).reduce((s,p)=>s+num(p.price),0) }

function scoreBuild(parts, budget, mode="desktop"){
  if(mode==="laptop"){
    const lp=parts.find(p=>p.id==="laptop")||{model:"",price:"",img:"",link:"",specs:{}}
    const specN=LAPTOP_SPECS.filter(s=>String(lp.specs?.[s.k]||"").trim()).length
    const total=calcTotal(parts,"laptop")
    const inBudget=total>0&&total<=budget
    const detail=[
      {desc:"填写整机品牌型号",         got:lp.model.trim()?1:0, of:1, pts:lp.model.trim()?20:0, max:20},
      {desc:"整机有图片或商品链接",     got:(lp.img||extractUrl(lp.link))?1:0, of:1, pts:(lp.img||extractUrl(lp.link))?20:0, max:20},
      {desc:"填写主要配置参数",         got:specN, of:5, pts:Math.round(specN/5*20), max:20},
      {desc:"填写整机价格",             got:num(lp.price)>0?1:0, of:1, pts:num(lp.price)>0?20:0, max:20},
      {desc:`总价控制在预算 ¥${budget} 内`, got:inBudget?1:0, of:1, pts:inBudget?20:0, max:20},
    ]
    return {score:detail.reduce((s,d)=>s+d.pts,0), detail, total}
  }
  const req = parts.filter(p=>REQ_IDS.includes(p.id))
  const models = req.filter(p=>p.model.trim()).length
  const imgs = req.filter(p=>p.img||extractUrl(p.link)).length
  const prices = req.filter(p=>p.price!==""&&num(p.price)>=0&&(p.id==="gpu"||num(p.price)>0)).length
  const total = calcTotal(parts,"desktop")
  const inBudget = total>0 && total<=budget
  const detail = [
    {desc:"必选硬件填写型号", got:models, of:8, pts:Math.round(models/8*40), max:40},
    {desc:"必选硬件有图片或商品链接", got:imgs,   of:8, pts:Math.round(imgs/8*20),   max:20},
    {desc:"必选硬件填写价格", got:prices, of:8, pts:Math.round(prices/8*20), max:20},
    {desc:`总价控制在预算 ¥${budget} 内`, got:inBudget?1:0, of:1, pts:inBudget?20:0, max:20},
  ]
  return {score:detail.reduce((s,d)=>s+d.pts,0), detail, total}
}

function compressImage(file, maxSide=420){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onerror=reject
    reader.onload=()=>{
      const img=new Image()
      img.onerror=reject
      img.onload=()=>{
        const r=Math.min(1,maxSide/Math.max(img.width,img.height))
        const cv=document.createElement("canvas")
        cv.width=Math.round(img.width*r); cv.height=Math.round(img.height*r)
        const ctx=cv.getContext("2d")
        ctx.fillStyle="#fff"; ctx.fillRect(0,0,cv.width,cv.height)
        ctx.drawImage(img,0,0,cv.width,cv.height)
        resolve(cv.toDataURL("image/jpeg",0.72))
      }
      img.src=reader.result
    }
    reader.readAsDataURL(file)
  })
}

class ErrorBoundary extends Component {
  constructor(p){ super(p); this.state={err:null} }
  static getDerivedStateFromError(err){ return {err} }
  render(){
    if(this.state.err) return(
      <div style={{padding:32,fontFamily:"monospace"}}>
        <div style={{color:C.red,fontWeight:700,marginBottom:8}}>页面出错</div>
        <pre style={{whiteSpace:"pre-wrap",fontSize:12}}>{String(this.state.err?.message||this.state.err)}</pre>
        <button onClick={()=>location.reload()} style={{marginTop:16,padding:"8px 20px"}}>刷新</button>
      </div>
    )
    return this.props.children
  }
}

const Btn=({children,onClick,color=C.accent,small,disabled,style={}})=>(
  <button onClick={onClick} disabled={disabled} style={{
    padding:small?"7px 16px":"12px 26px",borderRadius:9,border:"none",
    background:disabled?"#cbd5e1":color,color:"#fff",fontSize:small?12:14,fontWeight:700,
    fontFamily:F,cursor:disabled?"not-allowed":"pointer",...style}}>{children}</button>
)
const Card=({children,style={}})=>(
  <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:20,
    boxShadow:"0 1px 3px rgba(0,0,0,.05)",...style}}>{children}</div>
)
const inp=(x={})=>({width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.border}`,
  fontSize:14,fontFamily:F,outline:"none",boxSizing:"border-box",background:"#f8fafc",...x})
const Page=({children,style={}})=>(
  <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,color:C.text,...style}}>
    <link href={FONT_LINK} rel="stylesheet"/>
    {children}
  </div>
)

/* ── Build sheet (shared by student edit + teacher view) ── */
function PartCard({part,meta,readOnly,active,onActivate,onChange,onFile}){
  const fileRef=useRef(null)
  const [drag,setDrag]=useState(false)
  const url=extractUrl(part.link)
  const filled=part.model.trim()&&(part.img||url)&&part.price!==""
  function pick(e){ const f=e.target.files?.[0]; if(f) onFile(f); e.target.value="" }
  function drop(e){
    e.preventDefault(); setDrag(false); onActivate&&onActivate()
    const f=[...(e.dataTransfer?.files||[])].find(x=>x.type.startsWith("image/"))
    if(f) onFile(f)
  }
  return(
    <div onMouseDown={()=>!readOnly&&onActivate&&onActivate()} style={{background:"#fff",borderRadius:12,overflow:"hidden",
      gridColumn:meta.wide?"1 / -1":undefined,
      border:`2px solid ${active?C.accent:filled?"#6ee7b7":meta.req?C.border:"#f1f5f9"}`,
      boxShadow:active?"0 0 0 3px #cffafe":"none",transition:"box-shadow .15s"}}>
      <div onDragOver={e=>{if(readOnly)return;e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
        onDrop={readOnly?undefined:drop}
        style={{height:meta.wide?180:120,background:drag?"#cffafe":"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",
          position:"relative",borderBottom:`1px solid ${C.border}`}}>
        {part.img
          ? <img src={part.img} alt={meta.name} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",padding:6}}/>
          : <div style={{textAlign:"center",color:"#94a3b8",fontSize:11,lineHeight:1.6}}>
              <div style={{fontSize:28}}>{meta.emoji}</div>
              {readOnly
                ? <div>{url?"未传图，见商品链接":"未上传图片"}</div>
                : <>
                    <div>{active?"按 Ctrl+V 粘贴截图":"点选卡片后 Ctrl+V 粘贴"}</div>
                    <div>或拖入图片 · <span onClick={e=>{e.stopPropagation();fileRef.current?.click()}}
                      style={{color:C.accent,cursor:"pointer",textDecoration:"underline"}}>选择文件</span></div>
                  </>}
            </div>}
        {part.img&&!readOnly&&(
          <button onClick={e=>{e.stopPropagation();onChange({...part,img:""})}} style={{position:"absolute",top:6,right:6,
            width:22,height:22,borderRadius:11,border:"none",background:"rgba(0,0,0,.45)",color:"#fff",cursor:"pointer",fontSize:12}}>✕</button>
        )}
        {part.img&&!readOnly&&(
          <button onClick={e=>{e.stopPropagation();fileRef.current?.click()}} style={{position:"absolute",bottom:6,right:6,
            padding:"2px 8px",borderRadius:6,border:"none",background:"rgba(0,0,0,.45)",color:"#fff",cursor:"pointer",fontSize:10}}>换图</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={pick} style={{display:"none"}}/>
      </div>
      <div style={{padding:"10px 12px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:700}}>{meta.emoji} {meta.name}</span>
          <span style={{fontSize:10,padding:"2px 7px",borderRadius:5,fontWeight:700,
            background:meta.req?"#fee2e2":"#f1f5f9",color:meta.req?C.red:C.muted}}>{meta.req?"必选":"可选"}</span>
        </div>
        {readOnly
          ? <>
              <div style={{fontSize:12,color:part.model?C.text:"#94a3b8",minHeight:18}}>{part.model||"未填写型号"}</div>
              {meta.id==="laptop"&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:4,margin:"6px 0",fontSize:12}}>
                  {LAPTOP_SPECS.map(s=>(
                    <div key={s.k}><span style={{color:C.muted}}>{s.label}：</span>
                      <span style={{color:part.specs?.[s.k]?C.text:"#cbd5e1"}}>{part.specs?.[s.k]||"未填"}</span></div>
                  ))}
                </div>
              )}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
                <span style={{fontSize:15,fontWeight:900,color:C.accent,fontFamily:FM}}>
                  {part.price!==""?`¥${num(part.price).toLocaleString()}`:"—"}</span>
                {url&&<a href={url} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:11,color:C.accent,fontWeight:700,textDecoration:"none"}}>🔗 查看商品</a>}
              </div>
            </>
          : <>
              <input value={part.model} maxLength={40} placeholder={meta.hint}
                onChange={e=>onChange({...part,model:e.target.value})}
                style={inp({padding:"7px 9px",fontSize:12,marginBottom:6})}/>
              {meta.id==="laptop"&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:6,marginBottom:6}}>
                  {LAPTOP_SPECS.map(s=>(
                    <div key={s.k} style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:11,color:C.muted,minWidth:28}}>{s.label}</span>
                      <input value={part.specs?.[s.k]||""} maxLength={30} placeholder={s.hint}
                        onChange={e=>onChange({...part,specs:{...(part.specs||{}),[s.k]:e.target.value}})}
                        style={inp({padding:"6px 8px",fontSize:12})}/>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{fontSize:13,color:C.muted}}>¥</span>
                <input type="number" min="0" value={part.price} placeholder="参考价格"
                  onChange={e=>onChange({...part,price:e.target.value})}
                  style={inp({padding:"7px 9px",fontSize:13,fontWeight:700,fontFamily:FM})}/>
              </div>
              <input value={part.link||""} placeholder="🔗 粘贴商品链接（可代替图片）"
                onChange={e=>onChange({...part,link:e.target.value})}
                onBlur={e=>{const u=extractUrl(e.target.value); if(u&&u!==e.target.value) onChange({...part,link:u})}}
                style={inp({padding:"6px 9px",fontSize:11,color:url?C.accentDark:C.text,
                  borderColor:part.link&&!url?"#fca5a5":C.border})}/>
              {part.link&&!url&&<div style={{fontSize:10,color:C.red,marginTop:3}}>没识别到网址，请复制完整链接</div>}
            </>}
      </div>
    </div>
  )
}

function BuildGrid({parts,readOnly,onPart,mode="desktop"}){
  const [activeId,setActiveId]=useState(null)
  const partsRef=useRef(parts); partsRef.current=parts
  const onPartRef=useRef(onPart); onPartRef.current=onPart
  const getPart=id=>partsRef.current.find(p=>p.id===id)||{id,model:"",price:"",img:"",link:"",specs:{}}

  async function addFile(id,file){
    try{ const d=await compressImage(file); onPartRef.current&&onPartRef.current({...getPart(id),img:d}) }
    catch(_){ alert("图片读取失败，请换一张") }
  }

  useEffect(()=>{
    if(readOnly) return
    function onPaste(e){
      if(!activeId) return
      const items=[...(e.clipboardData?.items||[])]
      const imgItem=items.find(it=>it.kind==="file"&&it.type.startsWith("image/"))
      if(imgItem){ e.preventDefault(); const f=imgItem.getAsFile(); if(f) addFile(activeId,f); return }
      const tag=(e.target?.tagName||"").toLowerCase()
      if(tag==="input"||tag==="textarea") return
      const u=extractUrl(e.clipboardData?.getData("text"))
      if(u){ e.preventDefault(); onPartRef.current&&onPartRef.current({...getPart(activeId),link:u}) }
    }
    document.addEventListener("paste",onPaste)
    return()=>document.removeEventListener("paste",onPaste)
  },[activeId,readOnly])

  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>
      {metasFor(mode).map(meta=>{
        const part={link:"",specs:{},...(parts.find(p=>p.id===meta.id)||{id:meta.id,model:"",price:"",img:""})}
        return <PartCard key={meta.id} part={part} meta={meta} readOnly={readOnly}
          active={!readOnly&&activeId===meta.id} onActivate={()=>setActiveId(meta.id)}
          onFile={f=>addFile(meta.id,f)} onChange={np=>onPart&&onPart(np)}/>
      })}
    </div>
  )
}

function ScoreDetail({detail}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {(detail||[]).map((d,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:13}}>
          <span style={{width:18,color:d.pts===d.max?C.green:d.pts>0?C.gold:C.red}}>
            {d.pts===d.max?"✓":d.pts>0?"◐":"✗"}</span>
          <span style={{flex:1}}>{d.desc}{d.of>1?`（${d.got}/${d.of}）`:""}</span>
          <span style={{fontFamily:FM,fontWeight:700}}>{d.pts}/{d.max}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Home / login ── */
function Home({onTeacher,onStudent}){
  return(
    <Page style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:44,padding:24,
      background:"linear-gradient(135deg,#ecfeff 0%,#f1f5f9 100%)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,letterSpacing:5,color:"#94a3b8",marginBottom:14,fontFamily:FM}}>信息技术基础 · 装机实训工具</div>
        <div style={{fontSize:72,fontWeight:900,lineHeight:1,letterSpacing:-2}}>配<span style={{color:C.accent}}>配</span></div>
        <div style={{fontSize:13,color:C.muted,marginTop:16}}>选硬件 · 找图片 · 查价格 · 控预算</div>
      </div>
      <div style={{display:"flex",gap:14}}>
        <button onClick={onTeacher} style={{padding:"16px 44px",borderRadius:12,border:`2px solid ${C.accent}`,
          background:"transparent",color:C.accent,fontSize:16,fontWeight:700,fontFamily:F,cursor:"pointer"}}>教师端</button>
        <button onClick={onStudent} style={{padding:"16px 44px",borderRadius:12,border:"none",
          background:C.accent,color:"#fff",fontSize:16,fontWeight:700,fontFamily:F,cursor:"pointer"}}>学生端</button>
      </div>
    </Page>
  )
}

function TLogin({onSuccess,onBack}){
  const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false)
  async function login(){
    if(!pw.trim()) return
    setLoading(true); setErr("")
    let correct=DEFAULT_PW
    try{ const {data}=await sb.from("lulu_settings").select("teacher_password").eq("id",1).single()
      if(data?.teacher_password) correct=data.teacher_password }catch(_){}
    if(pw===correct) onSuccess(); else { setErr("密码错误，请重试"); setLoading(false) }
  }
  return(
    <Page style={{display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <Card style={{width:"100%",maxWidth:320}}>
        <div style={{fontSize:20,fontWeight:900,marginBottom:4}}>教师端登录</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:20}}>与录录共用教师密码</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
          placeholder="教师密码" style={inp({marginBottom:10})}/>
        {err&&<div style={{fontSize:12,color:C.red,marginBottom:10}}>{err}</div>}
        <Btn onClick={login} disabled={loading} style={{width:"100%"}}>{loading?"验证中…":"登录"}</Btn>
        <button onClick={onBack} style={{marginTop:12,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13}}>← 返回</button>
      </Card>
    </Page>
  )
}

/* ── Teacher admin ── */
function TaskForm({task,onSaved,onCancel}){
  const [title,setTitle]=useState(task?.title||"")
  const [scenario,setScenario]=useState(task?.scenario||"")
  const [budget,setBudget]=useState(task?.budget_limit||5000)
  const [dtype,setDtype]=useState(task?.device_type||"desktop")
  const [saving,setSaving]=useState(false)
  async function save(){
    if(!title.trim()||!scenario.trim()||!(budget>0)){ alert("请填写任务名称、场景说明和预算"); return }
    setSaving(true)
    const payload={title:title.trim(),scenario:scenario.trim(),budget_limit:budget,device_type:dtype}
    const {error}=task
      ? await sb.from("pei_tasks").update(payload).eq("id",task.id)
      : await sb.from("pei_tasks").insert(payload)
    setSaving(false)
    if(error) alert("保存失败："+error.message); else onSaved()
  }
  return(
    <Card style={{marginBottom:12,border:`2px solid ${C.accent}`}}>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="任务名称，如 学生游戏主机" style={inp({marginBottom:8,fontWeight:700})}/>
      <textarea value={scenario} onChange={e=>setScenario(e.target.value)} rows={3} placeholder="描述客户需求，学生据此选配硬件"
        style={inp({resize:"vertical",lineHeight:1.7,marginBottom:8})}/>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {Object.entries(MODE_LABEL).map(([k,l])=>(
          <button key={k} onClick={()=>setDtype(k)} style={{flex:1,padding:"6px 4px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:12,fontWeight:700,
            border:`1.5px solid ${dtype===k?C.accent:C.border}`,background:dtype===k?"#ecfeff":"#fff",color:dtype===k?C.accentDark:C.muted}}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:12,color:C.muted}}>预算 ¥</span>
        <input type="number" min={500} value={budget} onChange={e=>setBudget(Number(e.target.value))}
          style={inp({width:120,fontFamily:FM,fontWeight:700})}/>
        <div style={{flex:1}}/>
        <Btn small onClick={onCancel} color="#94a3b8">取消</Btn>
        <Btn small onClick={save} disabled={saving}>{saving?"保存中…":"保存"}</Btn>
      </div>
    </Card>
  )
}

function TAdmin({onLogout}){
  const [tasks,setTasks]=useState([])
  const [counts,setCounts]=useState({})
  const [selId,setSelId]=useState(null)
  const [editing,setEditing]=useState(null)
  const [subs,setSubs]=useState([])
  const [cls,setCls]=useState("全部")
  const [view,setView]=useState("list")
  const [openId,setOpenId]=useState(null)
  const [openParts,setOpenParts]=useState(null)
  const [tScore,setTScore]=useState("")
  const [tNote,setTNote]=useState("")

  async function loadTasks(){
    const {data}=await sb.from("pei_tasks").select().order("created_at",{ascending:true})
    if(data){ setTasks(data); if(!selId&&data[0]) setSelId(data[0].id) }
    const {data:all}=await sb.from("pei_submissions").select("task_id,submitted")
    const c={}; (all||[]).forEach(s=>{ c[s.task_id]=c[s.task_id]||{n:0,done:0}; c[s.task_id].n++; if(s.submitted)c[s.task_id].done++ })
    setCounts(c)
  }
  useEffect(()=>{ loadTasks() },[])

  useEffect(()=>{
    if(!selId) return
    setOpenId(null)
    const load=()=>sb.from("pei_submissions")
      .select("id,class_name,student_name,total_price,submitted,auto_score,auto_detail,teacher_score,teacher_note,updated_at,build_mode")
      .eq("task_id",selId).then(({data})=>data&&setSubs(data))
    load(); const t=setInterval(load,6000)
    return()=>clearInterval(t)
  },[selId])

  const task=tasks.find(t=>t.id===selId)
  const budget=num(task?.budget_limit)
  const classes=["全部",...[...new Set(subs.map(s=>s.class_name))].sort()]
  const rows=subs.filter(s=>cls==="全部"||s.class_name===cls)
    .map(s=>({...s,final:s.teacher_score??s.auto_score??0}))
    .sort((a,b)=>b.final-a.final)

  async function toggleOpen(t){
    await sb.from("pei_tasks").update({is_open:!t.is_open}).eq("id",t.id); loadTasks()
  }
  async function delTask(t){
    if(!confirm(`删除「${t.title}」？该任务下所有学生配置单也会一起删除。`)) return
    await sb.from("pei_tasks").delete().eq("id",t.id)
    if(selId===t.id) setSelId(null)
    loadTasks()
  }
  async function openSub(s){
    if(openId===s.id){ setOpenId(null); return }
    setOpenId(s.id); setOpenParts(null)
    const {data}=await sb.from("pei_submissions").select("parts").eq("id",s.id).single()
    setOpenParts(data?.parts||[])
    setTScore(s.teacher_score??s.auto_score??""); setTNote(s.teacher_note||"")
  }
  async function saveScore(s){
    const v=parseInt(tScore); if(isNaN(v)){ alert("请输入分数"); return }
    const {error}=await sb.from("pei_submissions").update({teacher_score:v,teacher_note:tNote}).eq("id",s.id)
    if(error){ alert("保存失败："+error.message); return }
    setSubs(p=>p.map(x=>x.id===s.id?{...x,teacher_score:v,teacher_note:tNote}:x))
  }
  async function unlock(s){
    if(!confirm(`退回 ${s.student_name} 的配置单，让他重新修改？`)) return
    await sb.from("pei_submissions").update({submitted:false}).eq("id",s.id)
    setSubs(p=>p.map(x=>x.id===s.id?{...x,submitted:false}:x))
  }

  return(
    <Page>
      <div style={{display:"flex",alignItems:"center",padding:"14px 24px",background:"#fff",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:20,fontWeight:900,flex:1}}>配<span style={{color:C.accent}}>配</span> 教师后台</div>
        <Btn small onClick={onLogout} color="#94a3b8">退出</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:20,padding:20,maxWidth:1300,margin:"0 auto"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",marginBottom:10}}>
            <span style={{flex:1,fontSize:14,fontWeight:700}}>装机任务</span>
            {editing===null&&<Btn small onClick={()=>setEditing("new")}>＋ 新建</Btn>}
          </div>
          {editing==="new"&&<TaskForm onSaved={()=>{setEditing(null);loadTasks()}} onCancel={()=>setEditing(null)}/>}
          {tasks.map(t=>editing===t.id
            ? <TaskForm key={t.id} task={t} onSaved={()=>{setEditing(null);loadTasks()}} onCancel={()=>setEditing(null)}/>
            : <div key={t.id} onClick={()=>setSelId(t.id)} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer",
                border:`2px solid ${selId===t.id?C.accent:C.border}`,opacity:t.is_open?1:.6}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{flex:1,fontSize:14,fontWeight:700}}>{t.title}</span>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:5,fontWeight:700,
                    background:t.is_open?"#d1fae5":"#f1f5f9",color:t.is_open?C.green:C.muted}}>{t.is_open?"开放中":"已关闭"}</span>
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>
                  {MODE_LABEL[t.device_type||"desktop"]} · 预算 ¥{num(t.budget_limit).toLocaleString()} · {counts[t.id]?.done||0}/{counts[t.id]?.n||0} 人已提交
                </div>
                {selId===t.id&&(
                  <div style={{display:"flex",gap:6,marginTop:10}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setEditing(t.id)} style={miniBtn}>编辑</button>
                    <button onClick={()=>toggleOpen(t)} style={miniBtn}>{t.is_open?"关闭":"开放"}</button>
                    <button onClick={()=>delTask(t)} style={{...miniBtn,color:C.red}}>删除</button>
                  </div>
                )}
              </div>)}
        </div>

        <div>
          {!task
            ? <Card style={{textAlign:"center",color:C.muted,padding:48}}>选择左侧任务查看学生配置单</Card>
            : <>
                <Card style={{marginBottom:14,background:"#ecfeff",border:"1px solid #a5f3fc",padding:"14px 18px"}}>
                  <div style={{fontSize:16,fontWeight:900,marginBottom:4}}>{task.title}
                    <span style={{fontSize:13,color:C.accent,fontFamily:FM,marginLeft:10}}>¥{budget.toLocaleString()}</span></div>
                  <div style={{fontSize:13,lineHeight:1.7}}>{task.scenario}</div>
                </Card>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                  {classes.map(c=>(
                    <button key={c} onClick={()=>setCls(c)} style={{padding:"6px 14px",borderRadius:8,cursor:"pointer",fontFamily:F,fontSize:12,fontWeight:700,
                      border:`1.5px solid ${cls===c?C.accent:C.border}`,background:cls===c?"#ecfeff":"#fff",color:cls===c?C.accentDark:C.muted}}>{c}</button>
                  ))}
                  <div style={{flex:1}}/>
                  <Btn small onClick={()=>setView(view==="list"?"rank":"list")} color={view==="list"?C.gold:C.accent}>
                    {view==="list"?"🏆 排行榜":"← 返回列表"}</Btn>
                </div>

                {view==="rank"
                  ? <FinalRank rows={rows}/>
                  : !rows.length
                    ? <Card style={{textAlign:"center",color:C.muted,padding:40}}>还没有学生开始这个任务</Card>
                    : rows.map(s=>{
                        const total=num(s.total_price), over=total>budget
                        return(
                          <Card key={s.id} style={{marginBottom:8,padding:"12px 16px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>openSub(s)}>
                              <span style={{fontSize:11,color:C.muted,minWidth:60}}>{s.class_name}</span>
                              <span title={MODE_LABEL[s.build_mode||"desktop"]} style={{fontSize:16}}>{s.build_mode==="laptop"?"💻":"🖥️"}</span>
                              <span style={{fontSize:15,fontWeight:700,minWidth:80}}>{s.student_name}</span>
                              <span style={{fontSize:11,padding:"2px 8px",borderRadius:5,fontWeight:700,
                                background:s.submitted?"#d1fae5":"#f1f5f9",color:s.submitted?C.green:C.muted}}>{s.submitted?"已提交":"配机中"}</span>
                              <span style={{flex:1,fontSize:12,fontFamily:FM,color:over?C.red:C.text}}>¥{total.toLocaleString()}{over?" 超预算":""}</span>
                              <span><span style={{fontSize:22,fontWeight:900,fontFamily:FM,color:C.accent}}>{s.final}</span>
                                <span style={{fontSize:11,color:C.muted}}>/100</span></span>
                              {s.teacher_score!=null&&<span style={{fontSize:10,color:C.purple}}>已定分</span>}
                              <span style={{color:C.muted}}>{openId===s.id?"▲":"▼"}</span>
                            </div>
                            {openId===s.id&&(
                              <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                                {openParts===null
                                  ? <div style={{color:C.muted,fontSize:13}}>加载中…</div>
                                  : <>
                                      <BuildGrid parts={openParts} readOnly mode={s.build_mode||"desktop"}/>
                                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:14}}>
                                        <div>
                                          <div style={{fontSize:12,color:C.muted,marginBottom:8}}>自动评分</div>
                                          <ScoreDetail detail={s.auto_detail}/>
                                        </div>
                                        <div>
                                          <div style={{fontSize:12,color:C.muted,marginBottom:8}}>教师定分（覆盖自动分）</div>
                                          <div style={{display:"flex",gap:8,marginBottom:8}}>
                                            <input type="number" value={tScore} onChange={e=>setTScore(e.target.value)} style={inp({width:90,fontFamily:FM,fontWeight:700})}/>
                                            <Btn small onClick={()=>saveScore(s)} color={C.purple}>确认分数</Btn>
                                            {s.submitted&&<Btn small onClick={()=>unlock(s)} color="#94a3b8">退回修改</Btn>}
                                          </div>
                                          <input value={tNote} onChange={e=>setTNote(e.target.value)} placeholder="评语，如：电源功率偏小" style={inp({fontSize:13})}/>
                                        </div>
                                      </div>
                                    </>}
                              </div>
                            )}
                          </Card>
                        )
                      })}
              </>}
        </div>
      </div>
    </Page>
  )
}
const miniBtn={padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,color:C.text}

function FinalRank({rows}){
  const [show,setShow]=useState(false)
  useEffect(()=>{ const t=setTimeout(()=>setShow(true),150); return()=>clearTimeout(t) },[])
  return(
    <div style={{background:"linear-gradient(135deg,#083344,#0f172a)",borderRadius:18,padding:"28px 24px",color:"#fff"}}>
      <div style={{textAlign:"center",fontSize:34,fontWeight:900,marginBottom:20,color:"#67e8f9"}}>🏆 装机排行榜</div>
      {!rows.length&&<div style={{textAlign:"center",color:"#94a3b8"}}>暂无数据</div>}
      {rows.map((r,i)=>(
        <div key={r.id} style={{display:"flex",alignItems:"center",gap:14,padding:"11px 16px",marginBottom:8,borderRadius:12,
          background:i<3?"rgba(103,232,249,.12)":"rgba(255,255,255,.05)",
          transform:show?"translateX(0)":"translateX(-24px)",opacity:show?1:0,transition:`all .5s ease ${Math.min(i,15)*70}ms`}}>
          <span style={{fontSize:i<3?24:15,minWidth:34,fontFamily:FM}}>{["🥇","🥈","🥉"][i]||i+1}</span>
          <span style={{fontSize:12,color:"#94a3b8",minWidth:60}}>{r.class_name}</span>
          <span style={{flex:1,fontSize:16,fontWeight:700}}>{r.student_name}</span>
          <span style={{fontSize:12,color:"#94a3b8",fontFamily:FM}}>¥{num(r.total_price).toLocaleString()}</span>
          <span style={{fontSize:24,fontWeight:900,fontFamily:FM,color:i<3?"#fcd34d":"#fff",minWidth:50,textAlign:"right"}}>{r.final}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Student ── */
function SLogin({onEnter,onBack}){
  const [cls,setCls]=useState(""); const [name,setName]=useState("")
  useEffect(()=>{
    try{ const v=JSON.parse(localStorage.getItem("pei_student")||"null"); if(v){ setCls(v.cls||""); setName(v.name||"") } }catch(_){}
  },[])
  function go(){
    if(!cls.trim()||!name.trim()){ alert("请填写班级和姓名"); return }
    const v={cls:cls.trim(),name:name.trim()}
    try{ localStorage.setItem("pei_student",JSON.stringify(v)) }catch(_){}
    onEnter(v)
  }
  return(
    <Page style={{display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <Card style={{width:"100%",maxWidth:340}}>
        <div style={{fontSize:22,fontWeight:900,marginBottom:4}}>开始装机</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:18}}>下次用同样的班级和姓名进入，可以继续修改</div>
        <input value={cls} onChange={e=>setCls(e.target.value)} placeholder="班级，如 电商2401" maxLength={20} style={inp({marginBottom:10})}/>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="姓名" maxLength={12}
          onKeyDown={e=>e.key==="Enter"&&go()} style={inp({marginBottom:14})}/>
        <Btn onClick={go} style={{width:"100%"}}>进入</Btn>
        <button onClick={onBack} style={{marginTop:12,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13}}>← 返回</button>
      </Card>
    </Page>
  )
}

function STasks({me,onPick,onBack}){
  const [tasks,setTasks]=useState(null)
  const [mine,setMine]=useState({})
  useEffect(()=>{
    sb.from("pei_tasks").select().eq("is_open",true).order("created_at",{ascending:true}).then(({data})=>setTasks(data||[]))
    sb.from("pei_submissions").select("task_id,submitted,auto_score,teacher_score,total_price")
      .eq("class_name",me.cls).eq("student_name",me.name)
      .then(({data})=>{ const m={}; (data||[]).forEach(s=>m[s.task_id]=s); setMine(m) })
  },[])
  return(
    <Page style={{padding:24}}>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:18}}>
          <div style={{flex:1}}>
            <div style={{fontSize:22,fontWeight:900}}>选择装机任务</div>
            <div style={{fontSize:13,color:C.muted,marginTop:2}}>{me.cls} · {me.name}</div>
          </div>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13}}>切换身份</button>
        </div>
        {tasks===null&&<div style={{color:C.muted}}>加载中…</div>}
        {tasks&&!tasks.length&&<Card style={{textAlign:"center",color:C.muted,padding:40}}>老师还没有开放装机任务</Card>}
        {(tasks||[]).map(t=>{
          const s=mine[t.id]; const final=s?(s.teacher_score??s.auto_score??0):null
          return(
            <Card key={t.id} style={{marginBottom:12,cursor:"pointer"}}>
              <div onClick={()=>onPick(t)} style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:900}}>{t.title}
                    <span style={{fontSize:13,color:C.accent,fontFamily:FM,marginLeft:10}}>预算 ¥{num(t.budget_limit).toLocaleString()}</span>
                    <span style={{fontSize:11,marginLeft:8,padding:"2px 8px",borderRadius:5,background:"#f1f5f9",color:C.muted,fontWeight:700}}>{MODE_LABEL[t.device_type||"desktop"]}</span></div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginTop:4}}>{t.scenario}</div>
                </div>
                <div style={{textAlign:"right",minWidth:90}}>
                  {!s&&<Btn small>开始</Btn>}
                  {s&&!s.submitted&&<div><div style={{fontSize:12,color:C.gold,fontWeight:700}}>进行中</div><div style={{fontSize:11,color:C.muted}}>点击继续</div></div>}
                  {s&&s.submitted&&<div><div style={{fontSize:24,fontWeight:900,color:C.accent,fontFamily:FM}}>{final}</div>
                    <div style={{fontSize:11,color:s.teacher_score!=null?C.purple:C.muted}}>{s.teacher_score!=null?"老师已定分":"已提交"}</div></div>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}

function SBuild({me,task,onBack}){
  const [parts,setParts]=useState(emptyParts())
  const [loaded,setLoaded]=useState(false)
  const [sub,setSub]=useState(null)
  const [saving,setSaving]=useState("")
  const saveTimer=useRef(null)
  const budget=num(task.budget_limit)
  const dtype=task.device_type||"desktop"
  const [mode,setMode]=useState(dtype==="laptop"?"laptop":"desktop")
  const modeRef=useRef(mode); modeRef.current=mode
  const key={task_id:task.id,class_name:me.cls,student_name:me.name}

  useEffect(()=>{
    const load=(first)=>sb.from("pei_submissions").select("parts,submitted,auto_score,auto_detail,teacher_score,teacher_note,build_mode")
      .eq("task_id",task.id).eq("class_name",me.cls).eq("student_name",me.name).maybeSingle()
      .then(({data})=>{
        if(data){
          if(first){ const saved=data.parts||[]; setParts(emptyParts().map(e=>({...e,...(saved.find(s=>s.id===e.id)||{})}))); if(dtype==="either"&&data.build_mode) setMode(data.build_mode) }
          setSub({...data,parts:undefined})
        }
        if(first) setLoaded(true)
      })
    load(true)
    const t=setInterval(()=>load(false),8000)
    return()=>{ clearInterval(t); clearTimeout(saveTimer.current) }
  },[])

  async function persist(next,submit=false,m=modeRef.current){
    const {score,detail,total}=scoreBuild(next,budget,m)
    setSaving("保存中…")
    const {error}=await sb.from("pei_submissions").upsert({...key,parts:next,build_mode:m,total_price:total,auto_score:score,auto_detail:detail,
      updated_at:new Date().toISOString(),...(submit?{submitted:true}:{})},{onConflict:"task_id,class_name,student_name"})
    setSaving(error?"保存失败，请检查网络":"已自动保存")
    if(!error) setSub(s=>({...(s||{}),auto_score:score,auto_detail:detail,...(submit?{submitted:true}:{})}))
    return !error
  }
  const locked=!!sub?.submitted
  function onPart(np){
    if(locked) return
    const next=parts.map(p=>p.id===np.id?np:p)
    setParts(next)
    clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(()=>persist(next),1200)
  }
  async function submit(){
    const missing=metasFor(mode).filter(m=>m.req).filter(m=>!(parts.find(p=>p.id===m.id)?.model||"").trim()).length
    if(missing&&!confirm(mode==="laptop"?"还没填笔记本整机型号，确定提交吗？":`还有 ${missing} 个必选硬件没填型号，确定提交吗？`)) return
    clearTimeout(saveTimer.current)
    await persist(parts,true)
  }
  async function withdraw(){
    if(sub?.teacher_score!=null){ alert("老师已经评分，不能撤回"); return }
    await sb.from("pei_submissions").update({submitted:false}).eq("task_id",task.id).eq("class_name",me.cls).eq("student_name",me.name)
    setSub(s=>({...s,submitted:false}))
  }

  function switchMode(m){
    if(locked||m===mode) return
    setMode(m); clearTimeout(saveTimer.current); persist(parts,false,m)
  }
  const {score,detail,total}=scoreBuild(parts,budget,mode)
  const over=total>budget
  const pct=Math.min(100,budget?total/budget*100:0)
  const final=sub?.teacher_score??(locked?sub?.auto_score:score)

  if(!loaded) return <Page style={{display:"flex",alignItems:"center",justifyContent:"center",color:C.muted}}>加载中…</Page>

  return(
    <Page>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#0e7490",color:"#fff",padding:"12px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#a5f3fc",cursor:"pointer",fontSize:13}}>← 任务</button>
          <div style={{fontWeight:900,fontSize:15}}>{task.title}</div>
          <div style={{flex:1,minWidth:160}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
              <span>总价 <b style={{fontFamily:FM,fontSize:15}}>¥{total.toLocaleString()}</b></span>
              <span style={{color:over?"#fecaca":"#a5f3fc"}}>{over?`超出 ¥${(total-budget).toLocaleString()}`:`预算 ¥${budget.toLocaleString()}`}</span>
            </div>
            <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,.2)"}}>
              <div style={{height:"100%",borderRadius:3,width:`${pct}%`,background:over?"#f87171":"#67e8f9",transition:"width .3s"}}/>
            </div>
          </div>
          <div style={{fontSize:12,textAlign:"right"}}>
            <div>{sub?.teacher_score!=null?"最终得分":"预估得分"} <b style={{fontFamily:FM,fontSize:16}}>{final}</b></div>
            <div style={{opacity:.7}}>{saving}</div>
          </div>
          {locked
            ? <Btn small onClick={withdraw} color="rgba(255,255,255,.25)">撤回修改</Btn>
            : <Btn small onClick={submit} color={C.gold}>提交配置单</Btn>}
        </div>
      </div>
      <div style={{padding:20,maxWidth:1100,margin:"0 auto"}}>
        <Card style={{marginBottom:16,background:"#ecfeff",border:"1px solid #a5f3fc",padding:"14px 18px"}}>
          <div style={{fontSize:13,lineHeight:1.7}}>{task.scenario}</div>
          {dtype==="either"&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
              <span style={{fontSize:12,color:C.muted}}>方案类型</span>
              {["desktop","laptop"].map(m=>(
                <button key={m} onClick={()=>switchMode(m)} disabled={locked} style={{padding:"6px 14px",borderRadius:8,fontFamily:F,fontSize:12,fontWeight:700,
                  cursor:locked?"not-allowed":"pointer",border:`1.5px solid ${mode===m?C.accent:C.border}`,
                  background:mode===m?"#fff":"transparent",color:mode===m?C.accentDark:C.muted}}>{m==="laptop"?"💻 笔记本整机":"🖥️ 台式机组装"}</button>
              ))}
              <span style={{fontSize:11,color:C.muted}}>切换后两边填的内容都会保留，按当前选中的方案计分</span>
            </div>
          )}
          <div style={{fontSize:12,color:C.muted,marginTop:6}}>在电商平台搜索硬件，填写型号和当前售价。图片可截图后点选卡片按 Ctrl+V 粘贴，也可直接粘贴商品分享链接代替图片。内容自动保存。</div>
        </Card>
        {locked&&(
          <Card style={{marginBottom:16,padding:"14px 18px"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:10}}>✓ 已提交，配置单已锁定</div>
            <ScoreDetail detail={sub?.auto_detail||detail}/>
            {sub?.teacher_score!=null&&<div style={{marginTop:10,fontSize:13,color:C.purple,fontWeight:700}}>老师定分：{sub.teacher_score}</div>}
            {sub?.teacher_note&&<div style={{marginTop:8,padding:"10px 12px",background:"#f5f3ff",borderRadius:8,fontSize:13}}>💬 {sub.teacher_note}</div>}
          </Card>
        )}
        <BuildGrid parts={parts} readOnly={locked} onPart={onPart} mode={mode}/>
      </div>
    </Page>
  )
}

/* ── App ── */
function AppInner(){
  const [screen,setScreen]=useState("home")
  const [me,setMe]=useState(null)
  const [task,setTask]=useState(null)
  if(screen==="home")    return <Home onTeacher={()=>setScreen("t-login")} onStudent={()=>setScreen("s-login")}/>
  if(screen==="t-login") return <TLogin onSuccess={()=>setScreen("t-admin")} onBack={()=>setScreen("home")}/>
  if(screen==="t-admin") return <TAdmin onLogout={()=>setScreen("home")}/>
  if(screen==="s-login") return <SLogin onEnter={v=>{setMe(v);setScreen("s-tasks")}} onBack={()=>setScreen("home")}/>
  if(screen==="s-tasks") return <STasks me={me} onPick={t=>{setTask(t);setScreen("s-build")}} onBack={()=>setScreen("s-login")}/>
  if(screen==="s-build") return <SBuild me={me} task={task} onBack={()=>setScreen("s-tasks")}/>
  return null
}

export default function App(){
  return <ErrorBoundary><AppInner/></ErrorBoundary>
}
