// ── Minimal QR encoder（字节模式，纠错等级 M，版本 1–40）──────────────
// 返回 boolean[][] 矩阵（true = 黑）
const ECC_M = [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28]
const BLK_M = [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49]

function rawModules(v){
  let r = (16*v+128)*v+64
  if(v>=2){ const a=Math.floor(v/7)+2; r -= (25*a-10)*a-55; if(v>=7) r -= 36 }
  return r
}
function dataCodewords(v){ return Math.floor(rawModules(v)/8) - ECC_M[v]*BLK_M[v] }
function alignPos(v){
  if(v===1) return []
  const n=Math.floor(v/7)+2, step = v===32?26:Math.ceil((v*4+4)/(n*2-2))*2
  const r=[6]; for(let p=v*4+10; r.length<n; p-=step) r.splice(1,0,p)
  return r
}
function gfMul(x,y){ let z=0; for(let i=7;i>=0;i--){ z=(z<<1)^((z>>>7)*0x11D); z^=((y>>>i)&1)*x } return z }
function rsDiv(data,deg){
  let g=[1]; let root=1
  for(let i=0;i<deg;i++){ const ng=new Array(g.length+1).fill(0); for(let j=0;j<g.length;j++){ ng[j]^=gfMul(g[j],root); ng[j+1]^=g[j] } g=ng; root=gfMul(root,2) }
  const res=new Array(deg).fill(0)
  for(const b of data){ const f=b^res.shift(); res.push(0); for(let i=0;i<deg;i++) res[i]^=gfMul(g[deg-1-i],f) }
  return res
}
function utf8(str){ return Array.from(new TextEncoder().encode(str)) }

export function qrMatrix(text){
  const bytes = utf8(text)
  let v=1
  for(;v<=40;v++){ const cap=dataCodewords(v)*8, hdr = 4 + (v<=9?8:16); if(bytes.length*8+hdr<=cap) break }
  if(v>40) throw new Error("QR too long")
  const bits=[]
  const push=(val,n)=>{ for(let i=n-1;i>=0;i--) bits.push((val>>>i)&1) }
  push(4,4); push(bytes.length, v<=9?8:16); bytes.forEach(b=>push(b,8))
  const cap=dataCodewords(v)*8
  push(0, Math.min(4, cap-bits.length)); while(bits.length%8) bits.push(0)
  for(let pad=0xEC; bits.length<cap; pad^=0xEC^0x11) push(pad,8)
  const data=[]; for(let i=0;i<bits.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|bits[i+j]; data.push(b) }

  // 分块 + 交织
  const nb=BLK_M[v], ecl=ECC_M[v], raw=Math.floor(rawModules(v)/8), shortLen=Math.floor(raw/nb)-ecl, nShort=nb-raw%nb
  const blocks=[]; let k=0
  for(let i=0;i<nb;i++){ const len=shortLen+(i<nShort?0:1); const d=data.slice(k,k+len); k+=len; const ec=rsDiv(d,ecl); if(i<nShort) d.push(-1); blocks.push(d.concat(ec)) }
  const cw=[]
  for(let i=0;i<blocks[0].length;i++) blocks.forEach((b,j)=>{ if(!(i===shortLen && j<nShort)) cw.push(b[i]) })

  // 模块矩阵
  const N=v*4+17
  const m=Array.from({length:N},()=>new Array(N).fill(false))
  const fn=Array.from({length:N},()=>new Array(N).fill(false))
  const set=(x,y,val)=>{ m[y][x]=val; fn[y][x]=true }
  const finder=(cx,cy)=>{ for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++){ const d=Math.max(Math.abs(dx),Math.abs(dy)), x=cx+dx,y=cy+dy; if(x>=0&&x<N&&y>=0&&y<N) set(x,y,d!==2&&d!==4) } }
  const align=(cx,cy)=>{ for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) set(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1) }
  for(let i=0;i<N;i++){ set(6,i,i%2===0); set(i,6,i%2===0) }
  finder(3,3); finder(N-4,3); finder(3,N-4)
  const ap=alignPos(v)
  for(let i=0;i<ap.length;i++) for(let j=0;j<ap.length;j++){ if((i===0&&j===0)||(i===0&&j===ap.length-1)||(i===ap.length-1&&j===0)) continue; align(ap[i],ap[j]) }
  const drawFormat=(mask)=>{
    const d=(0<<3)|mask  // 纠错 M = 00
    let r=d; for(let i=0;i<10;i++) r=(r<<1)^((r>>>9)*0x537)
    const b=((d<<10)|r)^0x5412
    const bit=i=>(b>>>i)&1
    for(let i=0;i<=5;i++) set(8,i,bit(i))
    set(8,7,bit(6)); set(8,8,bit(7)); set(7,8,bit(8))
    for(let i=9;i<15;i++) set(14-i,8,bit(i))
    for(let i=0;i<8;i++) set(N-1-i,8,bit(i))
    for(let i=8;i<15;i++) set(8,N-15+i,bit(i))
    set(8,N-8,true)
  }
  drawFormat(0)
  if(v>=7){
    let r=v; for(let i=0;i<12;i++) r=(r<<1)^((r>>>11)*0x1F25)
    const b=(v<<12)|r
    for(let i=0;i<18;i++){ const bit=(b>>>i)&1, a=N-11+i%3, c=Math.floor(i/3); set(a,c,bit); set(c,a,bit) }
  }
  // 放置数据
  let i=0
  for(let right=N-1; right>=1; right-=2){
    if(right===6) right=5
    for(let vert=0;vert<N;vert++) for(let j=0;j<2;j++){
      const x=right-j, up=((right+1)&2)===0, y=up?N-1-vert:vert
      if(!fn[y][x] && i<cw.length*8){ m[y][x]=((cw[i>>>3]>>>(7-(i&7)))&1)!==0; i++ }
    }
  }
  // 选择掩码（惩罚分最低）
  const maskFn=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0]
  const apply=(mk)=>{ for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(!fn[y][x]&&maskFn[mk](x,y)) m[y][x]=!m[y][x] }
  const penalty=()=>{
    let p=0
    for(let y=0;y<N;y++){ let run=1; for(let x=1;x<N;x++){ if(m[y][x]===m[y][x-1]){ run++; if(run===5)p+=3; else if(run>5)p++ } else run=1 } }
    for(let x=0;x<N;x++){ let run=1; for(let y=1;y<N;y++){ if(m[y][x]===m[y-1][x]){ run++; if(run===5)p+=3; else if(run>5)p++ } else run=1 } }
    for(let y=0;y<N-1;y++) for(let x=0;x<N-1;x++){ const c=m[y][x]; if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1]) p+=3 }
    let dark=0; for(const row of m) for(const c of row) if(c) dark++
    p+=Math.floor(Math.abs(dark*20-N*N*10)/(N*N))*10
    return p
  }
  let best=0, bestP=Infinity
  for(let mk=0;mk<8;mk++){ apply(mk); drawFormat(mk); const p=penalty(); if(p<bestP){bestP=p;best=mk} apply(mk) }
  apply(best); drawFormat(best)
  return m
}

export function qrSvgPath(matrix){
  let d=""
  matrix.forEach((row,y)=>row.forEach((c,x)=>{ if(c) d+=`M${x} ${y}h1v1h-1z` }))
  return d
}
