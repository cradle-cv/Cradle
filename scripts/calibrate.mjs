import { QUESTIONS, PROFILES } from '../lib/quiz/catBank.js'
import { sampleQuestions, scoreAnswers } from '../lib/quiz/engine.js'

// 语义目标（设计锚点，驱动作答行为；匹配向量将由质心生成）
const TARGETS = {
  lihua:      [0.65,0.90,0.85,0.20],
  ragdoll:    [0.15,0.15,0.35,0.40],
  siamese:    [0.25,0.35,0.35,0.85],
  russianblue:[0.90,0.40,0.45,0.15],
  mainecoon:  [0.50,0.25,0.90,0.60],
  blackcat:   [0.75,0.85,0.70,0.60],
  orange:     [0.15,0.10,0.20,0.80],
  silver:     [0.50,0.50,0.50,0.50],
  calico:     [0.40,0.55,0.80,0.85],
  white:      [0.78,0.35,0.85,0.22],
  cow:        [0.10,0.70,0.15,0.95],
}

function describeChoice(target, q){
  const fits = q.options.map(o=>{
    let d=0, n=0
    for(let k=0;k<4;k++){
      if (o.w[k]!==0){ d += Math.abs((0.5+o.w[k]/2)-target[k]); n++ }
    }
    return n? d/n : 0.5
  })
  const tau=0.12
  const ex = fits.map(f=>Math.exp(-f/tau))
  const sum = ex.reduce((s,v)=>s+v,0)
  let r = Math.random()*sum
  for(let i=0;i<ex.length;i++){ r-=ex[i]; if(r<=0) return i }
  return ex.length-1
}

const centroids = {}
for (const p of PROFILES){
  const t = TARGETS[p.id]
  const acc=[0,0,0,0]; const N=1500
  for(let i=0;i<N;i++){
    const s = sampleQuestions(QUESTIONS)
    const choices={}; s.forEach(q=>choices[q.id]=describeChoice(t,q))
    const U = scoreAnswers(s,choices)
    for(let k=0;k<4;k++) acc[k]+=U[k]
  }
  centroids[p.id]=acc.map(v=>+(v/N).toFixed(3))
  console.log(p.name, '质心', centroids[p.id].join(','))
}
console.log('\n两两距离（<0.15）:')
for(let i=0;i<PROFILES.length;i++)for(let j=i+1;j<PROFILES.length;j++){
  const a=centroids[PROFILES[i].id], b=centroids[PROFILES[j].id]
  const d=Math.sqrt(a.reduce((s,v,k)=>s+(v-b[k])**2,0))
  if(d<0.15) console.log(' ', PROFILES[i].name,'↔',PROFILES[j].name, d.toFixed(3), d<0.10?'★':'△')
}
console.log('CENTROIDS='+JSON.stringify(centroids))
