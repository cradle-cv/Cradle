'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'

// ================================================================
// 核心修复：fetch(cache:'no-store') → blob → blobURL → canvas → texture
//
// 原因：其他页面 <img src="url"> 不带 crossOrigin 先加载了图片，
// CDN/浏览器 缓存了不含 CORS 头的响应。
// 3D展厅再用 crossOrigin='anonymous' 请求同一URL → 命中缓存 → 无CORS头 → 被拒绝
//
// 解决：fetch(cache:'no-store') 强制跳过浏览器缓存，发新请求拿到CORS头，
// 转成 blob URL（同源），canvas绘制不再受CORS限制
// ================================================================
async function loadTexture(url, maxSize = 1024) {
  try {
    const resp = await fetch(url, {
      mode: 'cors',
      cache: 'no-store',     // 关键：跳过浏览器HTTP缓存
      credentials: 'omit',
    })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    const blob = await resp.blob()
    const blobUrl = URL.createObjectURL(blob)

    return await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight
        if (w > maxSize || h > maxSize) {
          const s = maxSize / Math.max(w, h)
          w = Math.round(w * s); h = Math.round(h * s)
        }
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(blobUrl)
        const tex = new THREE.CanvasTexture(c)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.needsUpdate = true
        resolve(tex)
      }
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null) }
      img.src = blobUrl   // blob: URL 是同源的，canvas不会被taint
    })
  } catch (err) {
    console.warn('[3D] loadTexture failed:', url, err.message)
    return null
  }
}

export default function Exhibition3DPage() {
  const { id } = useParams()
  const mountRef = useRef(null)
  const [exhibition, setExhibition] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState('loading')
  const [preloadStatus, setPreloadStatus] = useState('')
  const [viewingArtwork, setViewingArtwork] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  const artworksRef = useRef([])
  const exhibitionRef = useRef(null)
  const textureMapRef = useRef({})
  const moveState = useRef({ forward: false, backward: false, left: false, right: false })
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const raycasterRef = useRef(new THREE.Raycaster())
  const clockRef = useRef(new THREE.Clock())
  const animFrameRef = useRef(null)
  const boundsRef = useRef({ minX: -5, maxX: 5, minZ: -10, maxZ: 10 })
  const touchRef = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0, moving: false })
  const sceneInitRef = useRef(false)
  const clickTargetsRef = useRef([])

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
    loadData()
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); sceneInitRef.current = false }
  }, [id])

  async function loadData() {
    try {
      const { data: ex } = await supabase.from('exhibitions').select('*').eq('id', id).single()
      if (ex) { setExhibition(ex); exhibitionRef.current = ex }

      const { data: exArtworks } = await supabase
        .from('exhibition_artworks')
        .select('*, artworks(*, artists(display_name))')
        .eq('exhibition_id', id)
        .order('wall_side', { ascending: true })
        .order('wall_position', { ascending: true })

      let works = (exArtworks || [])
        .filter(ea => ea.artworks && ea.artworks.id)
        .map(ea => ({ ...ea.artworks, wall_side: ea.wall_side || 'left', wall_position: ea.wall_position || 0 }))

      if (works.length === 0) {
        const { data: fb } = await supabase.from('artworks').select('*, artists(display_name)')
          .eq('status', 'published').order('created_at', { ascending: false }).limit(20)
        works = (fb || []).map((a, i) => ({ ...a, wall_side: i % 2 === 0 ? 'left' : 'right', wall_position: Math.floor(i / 2) + 1 }))
      }

      setArtworks(works)
      artworksRef.current = works
      setPhase('ready')
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function startExperience() {
    setPhase('preloading')
    const arts = artworksRef.current
    const texMap = {}
    let ok = 0, fail = 0

    for (let i = 0; i < arts.length; i++) {
      const work = arts[i]
      if (work.image_url) {
        setPreloadStatus(`加载 ${i + 1}/${arts.length}：${work.title || ''}`)
        const tex = await loadTexture(work.image_url)
        if (tex) { texMap[work.id] = tex; ok++; console.log(`[3D] ✅ ${i+1}/${arts.length}: ${work.title}`) }
        else { fail++; console.warn(`[3D] ❌ ${i+1}/${arts.length}: ${work.title}`) }
      }
    }

    textureMapRef.current = texMap
    console.log(`[3D] 预加载完成: 成功${ok} 失败${fail}`)
    setPhase('scene')
    requestAnimationFrame(() => requestAnimationFrame(() => initThreeJS()))
  }

  function initThreeJS() {
    if (!mountRef.current || sceneInitRef.current) return
    sceneInitRef.current = true

    const W = mountRef.current.clientWidth, H = mountRef.current.clientHeight
    const arts = artworksRef.current, ex = exhibitionRef.current
    const style = ex?.gallery_style || 'classic', isWB = style === 'whitebox'
    const texMap = textureMapRef.current

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 200)
    camera.position.set(0, 1.6, 2)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    mountRef.current.appendChild(renderer.domElement)

    let controls = null
    if (!isMobile) controls = new PointerLockControls(camera, renderer.domElement)

    // === helpers ===
    function addPlane(w, h, mat, pos, rot) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
      m.position.set(...pos); m.rotation.set(...rot); scene.add(m)
    }
    function addLight(T, args, x, y, z) { const l = new T(...args); l.position.set(x, y, z); scene.add(l) }
    function addBench(pos, color) {
      const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), m); s.position.set(0, 0.45, 0); g.add(s)
      ;[[-0.65,-0.18],[0.65,-0.18],[-0.65,0.18],[0.65,0.18]].forEach(([x,z]) => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), m); l.position.set(x, 0.225, z); g.add(l)
      })
      g.position.set(...pos); scene.add(g)
    }

    const clickTargets = []

    function makePainting(work) {
      const pW = 2.0, pH = 1.5, fW = 0.08, fD = 0.05
      const group = new THREE.Group()
      const fm = new THREE.MeshStandardMaterial({ color: isWB ? 0x222222 : 0xc9a96e, metalness: 0.3, roughness: 0.5 })

      ;[[pW+fW*2,fW,fD,0,pH/2+fW/2,0],[pW+fW*2,fW,fD,0,-pH/2-fW/2,0],[fW,pH,fD,-pW/2-fW/2,0,0],[fW,pH,fD,pW/2+fW/2,0,0]].forEach(([gw,gh,gd,px,py,pz]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(gw,gh,gd), fm); m.position.set(px,py,pz); group.add(m)
      })

      const preTex = texMap[work.id]
      const cMat = preTex ? new THREE.MeshBasicMaterial({ map: preTex }) : new THREE.MeshBasicMaterial({ color: 0x444444 })
      const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(pW, pH), cMat)
      cMesh.position.set(0, 0, fD/2-0.005)
      cMesh.userData = { artworkId: work.id, artworkData: work }
      group.add(cMesh)
      clickTargets.push(cMesh)

      const lc = document.createElement('canvas'); lc.width = 512; lc.height = 128
      const ctx = lc.getContext('2d')
      ctx.fillStyle = isWB?'#f5f5f5':'#1a1a2e'; ctx.fillRect(0,0,512,128)
      ctx.fillStyle = isWB?'#222':'#c9a96e'; ctx.fillRect(0,0,512,2)
      ctx.font = 'bold 28px serif'; ctx.fillStyle = isWB?'#333':'#fff'; ctx.textAlign = 'center'
      ctx.fillText(work.title||'无题',256,48)
      ctx.font = '20px serif'; ctx.fillStyle = isWB?'#888':'#aac'
      ctx.fillText((work.artists?.display_name||'')+(work.year?` · ${work.year}`:''),256,82)
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.2), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(lc)}))
      lbl.position.set(0,-(pH/2+0.25),fD/2); group.add(lbl)
      return group
    }

    const leftW = arts.filter(w=>w.wall_side==='left').sort((a,b)=>a.wall_position-b.wall_position)
    const rightW = arts.filter(w=>w.wall_side==='right').sort((a,b)=>a.wall_position-b.wall_position)

    // ==================== BUILDERS ====================
    function buildClassic() {
      const sp=4.5,rW=12,rH=5,mx=Math.max(leftW.length,rightW.length,2),rL=mx*sp+6
      scene.background = new THREE.Color(0x1a1a2e); scene.fog = new THREE.Fog(0x1a1a2e,1,Math.max(rL,30))
      boundsRef.current = {minX:-rW/2+0.5,maxX:rW/2-0.5,minZ:-rL/2+0.5,maxZ:rL/2-0.5}
      const wM=new THREE.MeshStandardMaterial({color:0x2d2d3d,roughness:0.8})
      const fM=new THREE.MeshStandardMaterial({color:0x2a2a3a,roughness:0.4})
      addPlane(rW,rL,fM,[0,0,0],[-Math.PI/2,0,0])
      addPlane(rW,rL,new THREE.MeshStandardMaterial({color:0x222233}),[0,rH,0],[Math.PI/2,0,0])
      addPlane(rL,rH,wM,[-rW/2,rH/2,0],[0,Math.PI/2,0])
      addPlane(rL,rH,wM,[rW/2,rH/2,0],[0,-Math.PI/2,0])
      addPlane(rW,rH,wM,[0,rH/2,-rL/2],[0,0,0])
      addPlane(rW,rH,wM,[0,rH/2,rL/2],[0,Math.PI,0])
      scene.add(new THREE.AmbientLight(0x404060,0.7))
      addLight(THREE.DirectionalLight,[0xfff5e6,0.6],-rW/3,rH-0.5,-rL/4)
      addLight(THREE.DirectionalLight,[0xfff5e6,0.6],rW/3,rH-0.5,rL/4)
      const lc=Math.min(4,Math.max(2,Math.ceil(rL/15)))
      for(let i=0;i<lc;i++) addLight(THREE.PointLight,[0xfff5e6,0.5,rL/lc*2,1.5],0,rH-0.3,-rL/2+rL*(i+0.5)/lc)
      leftW.forEach((w,i)=>{const g=makePainting(w);g.position.set(-rW/2+0.06,1.7,-rL/2+3+i*sp);g.rotation.y=Math.PI/2;scene.add(g)})
      rightW.forEach((w,i)=>{const g=makePainting(w);g.position.set(rW/2-0.06,1.7,-rL/2+3+i*sp);g.rotation.y=-Math.PI/2;scene.add(g)})
      for(let z=-rL/2+6;z<rL/2-3;z+=sp*2) addBench([0,0,z],0x3a3a4a)
    }

    function buildWhitebox() {
      const sp=5.0,rW=14,rH=6,mx=Math.max(leftW.length,rightW.length,2),rL=mx*sp+8
      scene.background = new THREE.Color(0xf5f5f5); scene.fog = new THREE.Fog(0xf5f5f5,1,Math.max(rL,40))
      boundsRef.current = {minX:-rW/2+0.5,maxX:rW/2-0.5,minZ:-rL/2+0.5,maxZ:rL/2-0.5}
      const wM=new THREE.MeshStandardMaterial({color:0xfafafa,roughness:0.95})
      const fM=new THREE.MeshStandardMaterial({color:0xe8e8e8,roughness:0.3,metalness:0.05})
      addPlane(rW,rL,fM,[0,0,0],[-Math.PI/2,0,0])
      addPlane(rW,rL,new THREE.MeshStandardMaterial({color:0xffffff}),[0,rH,0],[Math.PI/2,0,0])
      addPlane(rL,rH,wM,[-rW/2,rH/2,0],[0,Math.PI/2,0])
      addPlane(rL,rH,wM,[rW/2,rH/2,0],[0,-Math.PI/2,0])
      addPlane(rW,rH,wM,[0,rH/2,-rL/2],[0,0,0])
      addPlane(rW,rH,wM,[0,rH/2,rL/2],[0,Math.PI,0])
      scene.add(new THREE.AmbientLight(0xffffff,0.9))
      addLight(THREE.DirectionalLight,[0xffffff,0.5],0,rH-0.2,0)
      addLight(THREE.DirectionalLight,[0xffffff,0.3],-rW/2,rH-0.5,0)
      addLight(THREE.DirectionalLight,[0xffffff,0.3],rW/2,rH-0.5,0)
      leftW.forEach((w,i)=>{const g=makePainting(w);g.position.set(-rW/2+0.06,1.8,-rL/2+4+i*sp);g.rotation.y=Math.PI/2;scene.add(g)})
      rightW.forEach((w,i)=>{const g=makePainting(w);g.position.set(rW/2-0.06,1.8,-rL/2+4+i*sp);g.rotation.y=-Math.PI/2;scene.add(g)})
      for(let z=-rL/2+8;z<rL/2-3;z+=sp*2) addBench([0,0,z],0xcccccc)
    }

    function buildLShape() {
      const sp=4.5,rW=12,rH=5,all=[...leftW,...rightW],half=Math.ceil(all.length/2)
      const seg1=all.slice(0,half),seg2=all.slice(half)
      const s1l=seg1.filter((_,i)=>i%2===0),s1r=seg1.filter((_,i)=>i%2===1)
      const s2t=seg2.filter((_,i)=>i%2===0),s2b=seg2.filter((_,i)=>i%2===1)
      const len1=Math.max(s1l.length,s1r.length,2)*sp+6,len2=Math.max(s2t.length,s2b.length,2)*sp+6
      scene.background = new THREE.Color(0x1a1a2e); scene.fog = new THREE.Fog(0x1a1a2e,1,60)
      boundsRef.current = {minX:-rW/2+0.5,maxX:len2+rW/2-0.5,minZ:-len1+rW/2+0.5,maxZ:rW/2-0.5}
      const wM=new THREE.MeshStandardMaterial({color:0x2d2d3d,roughness:0.8})
      const fM=new THREE.MeshStandardMaterial({color:0x2a2a3a,roughness:0.4})
      const cM=new THREE.MeshStandardMaterial({color:0x222233})
      addPlane(rW,len1,fM,[0,0,-len1/2+rW/2],[-Math.PI/2,0,0])
      addPlane(rW,len1,cM,[0,rH,-len1/2+rW/2],[Math.PI/2,0,0])
      addPlane(len1,rH,wM,[-rW/2,rH/2,-len1/2+rW/2],[0,Math.PI/2,0])
      addPlane(rW,rH,wM,[0,rH/2,-len1+rW/2],[0,0,0])
      addPlane(len2,rW,fM,[len2/2,0,0],[-Math.PI/2,0,0])
      addPlane(len2,rW,cM,[len2/2,rH,0],[Math.PI/2,0,0])
      addPlane(len2,rH,wM,[len2/2,rH/2,rW/2],[0,Math.PI,0])
      addPlane(len2,rH,wM,[len2/2,rH/2,-rW/2],[0,0,0])
      addPlane(rW,rH,wM,[len2,rH/2,0],[0,-Math.PI/2,0])
      scene.add(new THREE.AmbientLight(0x404060,0.7))
      addLight(THREE.DirectionalLight,[0xfff5e6,0.5],0,rH-0.5,-len1/3)
      addLight(THREE.DirectionalLight,[0xfff5e6,0.5],len2/2,rH-0.5,0)
      addLight(THREE.PointLight,[0xfff5e6,0.6,len1,1.5],0,rH-0.3,-len1/3)
      addLight(THREE.PointLight,[0xfff5e6,0.6,len2,1.5],len2/2,rH-0.3,0)
      s1l.forEach((w,i)=>{const z=-len1+rW/2+3+i*sp;const g=makePainting(w);g.position.set(-rW/2+0.06,1.7,z);g.rotation.y=Math.PI/2;scene.add(g)})
      s1r.forEach((w,i)=>{const z=-len1+rW/2+3+i*sp;const g=makePainting(w);g.position.set(rW/2-0.06,1.7,z);g.rotation.y=-Math.PI/2;scene.add(g)})
      s2t.forEach((w,i)=>{const x=3+i*sp;const g=makePainting(w);g.position.set(x,1.7,-rW/2+0.06);g.rotation.y=0;scene.add(g)})
      s2b.forEach((w,i)=>{const x=3+i*sp;const g=makePainting(w);g.position.set(x,1.7,rW/2-0.06);g.rotation.y=Math.PI;scene.add(g)})
    }

    function buildCircular() {
      const allW=[...leftW,...rightW],count=allW.length||1,radius=Math.max(count*1.2,8),rH=5
      scene.background = new THREE.Color(0x12121e); scene.fog = new THREE.Fog(0x12121e,1,radius*2.5)
      boundsRef.current = {minX:-radius,maxX:radius,minZ:-radius,maxZ:radius}
      const wm=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,rH,64,1,true),new THREE.MeshStandardMaterial({color:0x28283a,roughness:0.8,side:THREE.BackSide}))
      wm.position.set(0,rH/2,0);scene.add(wm)
      const fl=new THREE.Mesh(new THREE.CircleGeometry(radius,64),new THREE.MeshStandardMaterial({color:0x2a2a3a,roughness:0.4}));fl.rotation.x=-Math.PI/2;scene.add(fl)
      const cl=new THREE.Mesh(new THREE.CircleGeometry(radius,64),new THREE.MeshStandardMaterial({color:0x222233}));cl.rotation.x=Math.PI/2;cl.position.set(0,rH,0);scene.add(cl)
      scene.add(new THREE.AmbientLight(0x404060,0.7))
      addLight(THREE.PointLight,[0xfff5e6,1.0,radius*2,1],0,rH-0.5,0)
      addLight(THREE.DirectionalLight,[0xfff5e6,0.4],radius/2,rH-0.5,0)
      addLight(THREE.DirectionalLight,[0xfff5e6,0.4],-radius/2,rH-0.5,0)
      allW.forEach((w,i)=>{const a=(i/count)*Math.PI*2-Math.PI/2;const g=makePainting(w);g.position.set(Math.cos(a)*(radius-0.06),1.7,Math.sin(a)*(radius-0.06));g.rotation.y=-a+Math.PI;scene.add(g)})
      const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,0.8,16),new THREE.MeshStandardMaterial({color:0x3a3a4a,roughness:0.6}));ped.position.set(0,0.4,0);scene.add(ped)
    }

    if (style==='whitebox') buildWhitebox()
    else if (style==='lshape') buildLShape()
    else if (style==='circular') buildCircular()
    else buildClassic()

    clickTargetsRef.current = clickTargets

    // ==================== EVENTS ====================
    const onKD = (e) => { const m=moveState.current; if(e.code==='KeyW'||e.code==='ArrowUp')m.forward=true; if(e.code==='KeyS'||e.code==='ArrowDown')m.backward=true; if(e.code==='KeyA'||e.code==='ArrowLeft')m.left=true; if(e.code==='KeyD'||e.code==='ArrowRight')m.right=true }
    const onKU = (e) => { const m=moveState.current; if(e.code==='KeyW'||e.code==='ArrowUp')m.forward=false; if(e.code==='KeyS'||e.code==='ArrowDown')m.backward=false; if(e.code==='KeyA'||e.code==='ArrowLeft')m.left=false; if(e.code==='KeyD'||e.code==='ArrowRight')m.right=false }
    function checkPainting() { raycasterRef.current.setFromCamera(new THREE.Vector2(0,0),camera); const h=raycasterRef.current.intersectObjects(clickTargetsRef.current); if(h.length>0&&h[0].distance<4)setViewingArtwork(h[0].object.userData.artworkData) }
    const onClick = () => { if(!isMobile&&controls&&!controls.isLocked){controls.lock();return}; checkPainting() }
    const onTS = (e) => { const t=e.touches[0]; touchRef.current={startX:t.clientX,startY:t.clientY,lastX:t.clientX,lastY:t.clientY,moving:false} }
    const onTM = (e) => { e.preventDefault(); const t=e.touches[0]; const dx=t.clientX-touchRef.current.lastX,dy=t.clientY-touchRef.current.lastY; touchRef.current.lastX=t.clientX;touchRef.current.lastY=t.clientY;touchRef.current.moving=true; if(touchRef.current.startX>W/2){camera.rotation.y-=dx*0.005;camera.rotation.x=Math.max(-Math.PI/3,Math.min(Math.PI/3,camera.rotation.x-dy*0.005))}else{moveState.current.forward=dy<-2;moveState.current.backward=dy>2;moveState.current.left=dx<-2;moveState.current.right=dx>2} }
    const onTE = () => { moveState.current.forward=moveState.current.backward=moveState.current.left=moveState.current.right=false; if(!touchRef.current.moving)checkPainting() }
    document.addEventListener('keydown',onKD); document.addEventListener('keyup',onKU)
    renderer.domElement.addEventListener('click',onClick)
    if(isMobile){renderer.domElement.addEventListener('touchstart',onTS,{passive:false});renderer.domElement.addEventListener('touchmove',onTM,{passive:false});renderer.domElement.addEventListener('touchend',onTE)}
    window.addEventListener('resize',()=>{if(!mountRef.current)return;camera.aspect=mountRef.current.clientWidth/mountRef.current.clientHeight;camera.updateProjectionMatrix();renderer.setSize(mountRef.current.clientWidth,mountRef.current.clientHeight)})

    // ==================== ANIMATE ====================
    const spd=4.0, curStyle=style
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)
      const dt=Math.min(clockRef.current.getDelta(),0.1), b=boundsRef.current
      if(!isMobile&&controls&&controls.isLocked){velocity.current.x-=velocity.current.x*8*dt;velocity.current.z-=velocity.current.z*8*dt;direction.current.z=Number(moveState.current.forward)-Number(moveState.current.backward);direction.current.x=Number(moveState.current.right)-Number(moveState.current.left);direction.current.normalize();if(moveState.current.forward||moveState.current.backward)velocity.current.z-=direction.current.z*spd*dt;if(moveState.current.left||moveState.current.right)velocity.current.x-=direction.current.x*spd*dt;controls.moveRight(-velocity.current.x);controls.moveForward(-velocity.current.z)}
      if(isMobile){const ms=spd*dt;if(moveState.current.forward)camera.translateZ(-ms);if(moveState.current.backward)camera.translateZ(ms);if(moveState.current.left)camera.translateX(-ms);if(moveState.current.right)camera.translateX(ms)}
      if(curStyle==='circular'){const r=b.maxX-0.5,d=Math.sqrt(camera.position.x**2+camera.position.z**2);if(d>r){camera.position.x*=r/d;camera.position.z*=r/d}}
      else{camera.position.x=Math.max(b.minX,Math.min(b.maxX,camera.position.x));camera.position.z=Math.max(b.minZ,Math.min(b.maxZ,camera.position.z))}
      camera.position.y=1.6; renderer.render(scene,camera)
    }
    animate()
  }

  // ===================================================================
  if(loading) return <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center"><div className="text-4xl animate-pulse">🏛️</div></div>
  const sn={classic:'经典长廊',whitebox:'白盒子',lshape:'L型转角',circular:'环形展厅'}

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1a1a2e]" style={{fontFamily:'"Noto Serif SC",serif'}}>
      <div ref={mountRef} className="absolute inset-0"/>
      {phase!=='scene'&&(
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
          <div className="text-center max-w-lg px-8">
            <div className="text-6xl mb-6">🏛️</div>
            <h1 className="text-3xl font-bold text-white mb-3">{exhibition?.title||'每日一展'}</h1>
            <p className="text-white/50 mb-1 text-sm">{exhibition?.description||'走进三维艺术空间，沉浸式欣赏作品'}</p>
            <p className="text-white/30 text-xs mb-2">{artworks.length} 件作品 · {sn[exhibition?.gallery_style]||'经典长廊'}</p>
            {phase==='ready'&&(
              <>
                <button onClick={startExperience} className="mt-6 px-10 py-4 rounded-2xl text-lg font-bold text-white hover:scale-105 active:scale-95 transition-all"
                  style={{background:'linear-gradient(135deg,#c9a96e,#b08d4f)',boxShadow:'0 8px 30px rgba(201,169,110,0.3)'}}>进入展厅</button>
                <div className="mt-8 text-white/30 text-xs space-y-1">
                  {isMobile?<><p>📱 左侧滑动移动 · 右侧滑动视角</p><p>点击画作查看详情</p></>:<><p>🖱️ 点击锁定鼠标 · W/A/S/D 移动 · 点击画作查看</p><p>ESC 退出锁定</p></>}
                </div>
              </>
            )}
            {phase==='preloading'&&(
              <div className="mt-8">
                <div className="w-64 mx-auto h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" style={{animation:'pulse 1.5s ease-in-out infinite'}}/></div>
                <p className="text-white/50 text-sm mt-4">{preloadStatus||'准备中...'}</p>
              </div>
            )}
            <Link href={`/exhibitions/${id}`} className="inline-block mt-6 text-white/30 text-xs hover:text-white/60">← 返回展览</Link>
          </div>
        </div>
      )}
      {phase==='scene'&&(
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"><div className="w-6 h-6 border-2 border-white/30 rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-white/50 rounded-full"/></div></div>
          <div className="absolute top-4 left-4 z-10"><Link href={`/exhibitions/${id}`} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10">← 返回展览</Link></div>
          <div className="absolute top-4 right-4 z-10 text-right"><p className="text-white/40 text-xs">{exhibition?.title}</p><p className="text-white/20 text-xs">{artworks.length} 件 · {sn[exhibition?.gallery_style]||'经典长廊'}</p></div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"><p className="text-white/20 text-xs">{isMobile?'点击画作查看详情':'点击锁定视角 · 走近画作点击查看'}</p></div>
        </>
      )}
      {viewingArtwork&&(
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={()=>setViewingArtwork(null)}>
          <div className="bg-[#1e1e30] rounded-2xl overflow-hidden max-w-2xl w-full mx-4 shadow-2xl border border-white/10" onClick={e=>e.stopPropagation()}>
            {viewingArtwork.image_url&&<div style={{maxHeight:'50vh',overflow:'hidden'}}><img src={viewingArtwork.image_url} alt={viewingArtwork.title} className="w-full h-auto object-contain" style={{maxHeight:'50vh'}}/></div>}
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-1">{viewingArtwork.title}</h2>
              <p className="text-white/50 text-sm mb-3">{viewingArtwork.artists?.display_name}{viewingArtwork.year&&` · ${viewingArtwork.year}`}{viewingArtwork.medium&&` · ${viewingArtwork.medium}`}</p>
              {viewingArtwork.description&&<p className="text-white/40 text-sm leading-relaxed mb-4 line-clamp-3">{viewingArtwork.description}</p>}
              <div className="flex gap-3">
                <Link href={`/artworks/${viewingArtwork.id}`} className="flex-1 py-2.5 rounded-xl text-center text-sm font-medium text-white" style={{backgroundColor:'#c9a96e'}}>查看完整作品</Link>
                <button onClick={()=>setViewingArtwork(null)} className="px-6 py-2.5 rounded-xl text-sm text-white/60 border border-white/20 hover:bg-white/5">继续看展</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}