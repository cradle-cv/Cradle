import {scoreLocal} from '@/lib/lulu-local-score'
import {smart} from '@/lib/lulu-word-mode'
import {supabase} from '@/lib/supabase'
import {createClient} from '@supabase/supabase-js'
import {profile,compare} from '../xiaoxin-studio/grade.mjs'
export const runtime='nodejs'
export const maxDuration=60
const kinds=['教案','题目','知识','作业'],keys=['text','align','font','tables','pics']
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}})
const limits=new Map()
export async function POST(req){try{
if(+(req.headers.get('content-length')||0)>3500000)return reply({error:'文件请小于 2 MB'},413);
const {action,token,data={}}=await req.json();
async function teacher(op,p={}){const r=await supabase.rpc('xx_studio_teacher',{p_token:token||'',p_op:op,p_data:p});if(r.error)throw Error(r.error.message);return r.data}
const read=()=>{if(typeof data.file!=='string'||data.file.length>2800000)throw Error('文件请小于 2 MB');return profile(Buffer.from(data.file,'base64'))}
if(action==='reuse'){let mine=await teacher('list');if(!mine.some(i=>i.kind==='作业'&&i.id===data.id))throw Error('作业不存在');let db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});let {data:t,error}=await db.from('xx_studio_items').select('title,body,answer').eq('id',data.id).single();if(error||!t)throw Error('读取题目失败');return reply(await teacher('save',{...t,kind:'作业'}))}
if(action==='templates'||action==='assign'){await teacher('list');let query=supabase.from('lulu_layout_tasks');if(action==='templates'){let {data:rows,error}=await query.select('id,title,requirements');if(error)throw Error('题库读取失败');return reply(rows.filter(smart).map(t=>({id:t.id,title:t.title,points:t.requirements.reduce((s,r)=>s+r.pts,0),count:t.requirements.length})))}
let {data:t,error}=await query.select('id,title,description,raw_html,target_html,requirements').eq('id',data.id).single();if(error||!t||!smart(t))throw Error('该题不属于文件评分题库');let picture=t.target_html?.match(/src="(data:image\/jpeg;base64,[A-Za-z0-9+/=]+)"/)?.[1];return reply(await teacher('save',{kind:'作业',title:t.title,body:t.description||t.title,answer:{rules:t.requirements,source:t.id,original:(t.raw_html||'').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,''),picture}}))}
if(['info','submit'].includes(action)){
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error('作业服务尚未配置服务器密钥');const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,key,{auth:{persistSession:false}});
const {data:t,error}=await db.from('xx_studio_items').select('id,title,body,answer').eq('id',data.id).eq('kind','作业').single();if(error||!t)throw Error('作业不存在');
if(action==='info')return reply({title:t.title,body:t.body,fields:t.answer.fields||[],rubric:t.answer.rules?.map(r=>r.desc+"（"+r.pts+"分）"),original:t.answer.original,picture:t.answer.picture});
const name=String(data.name||'').trim().slice(0,30);if(!name)throw Error('请填写课堂姓名');
let ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'local',k=ip+data.id+name;if(Date.now()-(limits.get(k)||0)<5000)throw Error('请稍候再提交');if(limits.size>10000)limits.clear();limits.set(k,Date.now());
let result;if(t.answer.rules){if(typeof data.file!=='string'||data.file.length>2800000)throw Error('请选择 2 MB 以内的 Word 文件');const j=await scoreLocal(data.file,'docx',t.answer.rules);if(!j.max||!Array.isArray(j.details)||j.details.length!==t.answer.rules.length)throw Error('文件评分未完成，请检查 docx 后重试');result={score:Math.round(100*j.total/j.max),details:j.details.map(d=>({key:d.id,label:d.desc,matched:d.pts,total:d.max,unit:'分'}))}}else result=compare(t.answer.ref,read(),t.answer.fields);
const write=await db.from('xx_studio_work').insert({task:t.id,student_name:name,document:data.file,result});if(write.error)throw Error('未能保存答卷，请重试');return reply(result)}
return reply({error:'未知操作'},400)}catch(e){return reply({error:e.message},400)}}