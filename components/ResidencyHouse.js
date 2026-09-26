'use client'
// 目标路径：components/ResidencyHouse.js
// 摇篮驻地 · 动态剖面房子。整栋房子是一张实时绘制的 2D 画布，七个区域是房子的七个房间：
// 阁楼（天窗星空、串灯）、装帧台（杂志翻页、吊灯）、书桌（雨窗、台灯、落笔）、客厅沙发（壁炉篝火、吉他音符）、
// 休闲区蒲团（焚香、呼吸光晕、画布自己作画）、地下室（摇晃灯泡、猫眼、白布下的微光）、后院花园（月洞门里的心象山水）。
// 屋外的天色按北京时间变化。房间上方叠着真实的链接，等级门槛与原来一致。

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ZONES = [
  { id: 'attic', name: '阁楼', subtitle: '星空 · 夜间创作', href: '/residency/attic', requireLevel: 3 },
  { id: 'workshop', name: '装帧台', subtitle: '杂志 · 画册编辑', href: '/residency/workshop', requireLevel: 2 },
  { id: 'desk', name: '书桌', subtitle: '雨天玻璃 · 文字创作', href: '/residency/rain', requireLevel: 0 },
  { id: 'sofa', name: '客厅沙发', subtitle: '篝火 · 吉他和弦', href: '/residency/campfire', requireLevel: 2 },
  { id: 'cushion', name: '休闲区蒲团', subtitle: '冥想 · 绘画创作', href: '/residency/canvas', requireLevel: 3 },
  { id: 'garden', name: '后院花园', subtitle: '心象山水 · 一句话一幅画', href: '/residency/garden', requireLevel: 0 },
  { id: 'basement', name: '地下室', subtitle: '秘密进行中', href: '/residency/basement', requireLevel: 5 },
]
const LEVEL_NAMES = { 1: '初见', 2: '慢识', 3: '入心', 4: '深念', 5: '夜行', 6: '长留', 7: '入帷', 8: '生根', 9: '与共' }

/* ============================================================
   版式：宽屏一张横向剖面，窄屏竖向剖面
   房间的 bw/bh 是房间内陈设的设计尺寸，绘制时等比缩放、贴地居中
   ============================================================ */
function makeLayout(tall) {
  if (!tall) return {
    LW: 1000, LH: 720, houseL: 60, houseR: 700, cx: 380, apexY: 30, roofBase: 196, f1Top: 376, groundY: 556, baseBot: 700, f2Split: 400, f1Split: 440,
    sun: [870, 100],
    rooms: {
      attic: { x: 180, y: 76, w: 400, h: 120, bw: 360, bh: 120 },
      workshop: { x: 60, y: 196, w: 340, h: 180, bw: 340, bh: 180 },
      desk: { x: 400, y: 196, w: 300, h: 180, bw: 300, bh: 180 },
      sofa: { x: 60, y: 376, w: 380, h: 180, bw: 380, bh: 180 },
      cushion: { x: 440, y: 376, w: 260, h: 180, bw: 250, bh: 180 },
      basement: { x: 60, y: 556, w: 640, h: 144, bw: 620, bh: 140 },
      garden: { x: 712, y: 290, w: 280, h: 266, bw: 280, bh: 256 },
    },
  }
  return {
    LW: 1000, LH: 1210, houseL: 24, houseR: 736, cx: 380, apexY: 40, roofBase: 330, f1Top: 630, groundY: 930, baseBot: 1170, f2Split: 400, f1Split: 444,
    sun: [880, 120],
    rooms: {
      attic: { x: 150, y: 170, w: 460, h: 160, bw: 360, bh: 120 },
      workshop: { x: 24, y: 330, w: 376, h: 300, bw: 340, bh: 180 },
      desk: { x: 400, y: 330, w: 336, h: 300, bw: 300, bh: 180 },
      sofa: { x: 24, y: 630, w: 420, h: 300, bw: 380, bh: 180 },
      cushion: { x: 444, y: 630, w: 292, h: 300, bw: 250, bh: 180 },
      basement: { x: 24, y: 930, w: 712, h: 240, bw: 620, bh: 140 },
      garden: { x: 746, y: 640, w: 248, h: 290, bw: 280, bh: 256 },
    },
  }
}

/* ============================================================
   小工具
   ============================================================ */
const TAU = Math.PI * 2
const INK = '#2B2724'
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
function rngFrom(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function roomT(c, r) { const s = Math.min(r.w / r.bw, r.h / r.bh); c.translate(r.x + (r.w - r.bw * s) / 2, r.y + r.h); c.scale(s, s); return s }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
// 手绘感的线：同一条线描两遍，第二遍轻微错位
function sk(g, pts, w, rng, closed = false, col = INK) {
  for (let pass = 0; pass < 2; pass++) {
    g.beginPath()
    pts.forEach((p, i) => { const j = pass ? (rng() - 0.5) * 1.1 : (rng() - 0.5) * 0.4; i ? g.lineTo(p[0] + j, p[1] + j) : g.moveTo(p[0] + j, p[1] + j) })
    if (closed) g.closePath()
    g.strokeStyle = col; g.globalAlpha = pass ? 0.45 : 0.9; g.lineWidth = pass ? w * 0.6 : w; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke()
  }
  g.globalAlpha = 1
}
const skRect = (g, x, y, w, h, lw, rng, col) => sk(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], lw, rng, true, col)
function fillRect(g, x, y, w, h, fill, lw, rng) { g.fillStyle = fill; g.fillRect(x, y, w, h); if (lw) skRect(g, x, y, w, h, lw, rng) }
function beijing() {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', hour: 'numeric', hour12: false }).formatToParts(new Date())
    return Number(p.find(x => x.type === 'hour')?.value) % 24
  } catch (e) { return new Date().getHours() }
}
function timeOfDay() { const h = beijing(); return h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'dusk' : 'night' }
const SKY = { dawn: ['#B9C6D8', '#F3D3B2'], day: ['#C9DCE4', '#F2EBDC'], dusk: ['#7F7D9E', '#F0B489'], night: ['#141B2E', '#35395A'] }

/* ============================================================
   各房间：static 画进底图（只画一次），holes 是底图上要挖空的窗/洞，
   behind 画在底图之下（从洞里看到的东西），front 画在底图之上
   坐标：房间设计框左下角为原点，向上为负
   ============================================================ */
const ROOM = {
  attic: {
    tint: null,
    static(g, rng) {
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 3
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(40 + k * 70, 0); g.lineTo(180, -118); g.stroke() }
      g.fillStyle = '#6E5440'; g.beginPath(); g.arc(180, -78, 33, 0, TAU); g.fill()
      fillRect(g, 22, -16, 112, 14, '#C9B79C', 1.2, rng)
      g.fillStyle = '#7F98A3'; rr(g, 60, -20, 74, 10, 4); g.fill()
      g.fillStyle = '#EDE6D6'; rr(g, 26, -24, 30, 9, 4); g.fill(); sk(g, [[26, -20], [56, -20]], 0.8, rng)
      const books = ['#C4553F', '#E8DCC4', '#3F4A56', '#D8B25A']
      books.forEach((c, k) => { g.fillStyle = c; g.fillRect(142, -6 - k * 5, 30 - k * 3, 4.4) })
      g.strokeStyle = '#9A8E80'; g.lineWidth = 2.2; g.lineCap = 'round'
      g.beginPath(); g.moveTo(262, -46); g.lineTo(246, 0); g.moveTo(262, -46); g.lineTo(280, 0); g.moveTo(262, -46); g.lineTo(264, 0); g.stroke()
      g.save(); g.translate(262, -48); g.rotate(-0.62)
      g.fillStyle = '#3F4A56'; rr(g, -26, -6, 66, 12, 3); g.fill()
      g.fillStyle = '#C9A27A'; g.fillRect(-4, -6, 5, 12); g.fillRect(28, -7, 12, 14)
      g.fillStyle = '#2B2724'; g.fillRect(-34, -3, 9, 6)
      g.restore()
      g.fillStyle = '#E8DCC4'; g.fillRect(300, -14, 8, 14); g.fillStyle = '#6E5440'; g.fillRect(298, -2, 12, 2)
    },
    holes: [{ c: [180, -78, 29] }],
    behind(c, t, S) {
      c.save(); c.beginPath(); c.arc(180, -78, 30, 0, TAU); c.clip()
      const g = c.createLinearGradient(0, -110, 0, -48); g.addColorStop(0, '#0B1122'); g.addColorStop(1, '#27304E'); c.fillStyle = g; c.fillRect(140, -118, 80, 80)
      for (const s of S.atticStars) { const a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.f + s.p)); c.fillStyle = `rgba(255,250,235,${a})`; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill() }
      const ph = (t % 7) / 7
      if (ph < 0.18) { const k = ph / 0.18; const x = lerp(210, 150, k), y = lerp(-104, -64, k); const g2 = c.createLinearGradient(x, y, x + 18, y - 12); g2.addColorStop(0, 'rgba(255,255,240,.95)'); g2.addColorStop(1, 'rgba(255,255,240,0)'); c.strokeStyle = g2; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y - 12); c.stroke() }
      c.restore()
    },
    front(c, t, S, hov) {
      c.strokeStyle = 'rgba(40,34,30,.55)'; c.lineWidth = 1; c.beginPath()
      for (let i = 0; i <= 30; i++) { const u = i / 30, x = lerp(36, 324, u), y = -96 + Math.sin(u * Math.PI) * 16 + (u < 0.5 ? 0 : 0); i ? c.lineTo(x, y) : c.moveTo(x, y) }
      c.stroke()
      for (let i = 1; i < 16; i++) {
        const u = i / 16, x = lerp(36, 324, u), y = -96 + Math.sin(u * Math.PI) * 16 + 4
        const a = 0.55 + 0.45 * Math.sin(t * (hov ? 5 : 2.2) + i * 1.7)
        const g = c.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, `rgba(255,214,140,${0.55 * a})`); g.addColorStop(1, 'rgba(255,200,120,0)')
        c.fillStyle = g; c.fillRect(x - 9, y - 9, 18, 18)
        c.fillStyle = `rgba(255,${200 + (i % 3) * 18},${120 + (i % 2) * 60},${0.7 + 0.3 * a})`; c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill()
      }
      const f = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3)
      const g = c.createRadialGradient(304, -18, 0, 304, -18, 46); g.addColorStop(0, `rgba(255,200,120,${0.35 * f})`); g.addColorStop(1, 'rgba(255,190,110,0)')
      c.fillStyle = g; c.fillRect(250, -64, 110, 70)
      c.fillStyle = '#FFD890'; c.beginPath(); c.ellipse(304, -18 - f, 2.2, 4 * f, 0, 0, TAU); c.fill()
    },
  },

  workshop: {
    tint: '#EFE3CF',
    static(g, rng) {
      g.fillStyle = 'rgba(120,90,60,.08)'; g.fillRect(0, -50, 340, 50)
      const proofs = [[18, -168, 46, 58, '#C9A27A'], [72, -160, 40, 50, null], [236, -172, 48, 62, '#8FA9B3'], [292, -158, 34, 44, null]]
      for (const [x, y, w, h, col] of proofs) {
        fillRect(g, x, y, w, h, '#FBF8F1', 0.8, rng)
        let yy = y + 8
        if (col) { g.fillStyle = col; g.fillRect(x + 5, y + 6, w - 10, h * 0.4); yy = y + 10 + h * 0.4 }
        g.fillStyle = 'rgba(43,39,36,.35)'; for (; yy < y + h - 5; yy += 5) g.fillRect(x + 5, yy, (w - 10) * (0.6 + rng() * 0.4), 1.3)
        g.fillStyle = '#B0413E'; g.beginPath(); g.arc(x + w / 2, y + 2.5, 2, 0, TAU); g.fill()
      }
      fillRect(g, 234, -100, 100, 4, '#6E5440', 0, rng)
      let bx = 238; const bc = ['#9C6B4E', '#5E7A7F', '#C8B38A', '#7D6A8A', '#3F4A56', '#C4553F', '#D8B25A', '#5E7A7F']
      for (const col of bc) { const w = 6 + rng() * 5, h = 20 + rng() * 12; g.fillStyle = col; g.fillRect(bx, -100 - h, w, h); bx += w + 1; if (bx > 326) break }
      fillRect(g, 22, -66, 298, 7, '#8A6A4F', 1.2, rng)
      fillRect(g, 34, -59, 6, 59, '#7A5A43', 0, rng); fillRect(g, 302, -59, 6, 59, '#7A5A43', 0, rng)
      sk(g, [[40, -20], [302, -20]], 1.2, rng)
      g.fillStyle = '#5F7F6E'; g.fillRect(40, -70, 138, 4)
      const mags = ['#C4553F', '#E8DCC4', '#3F4A56', '#D8B25A', '#E8DCC4', '#8FA9B3']
      mags.forEach((col, k) => { g.fillStyle = col; g.fillRect(226 + k, -70 - k * 4, 66 - k * 2, 3.6) })
      g.fillStyle = '#6E5440'; g.beginPath(); g.ellipse(180, -34, 20, 4, 0, 0, TAU); g.fill()
      sk(g, [[166, -32], [160, 0]], 1.6, rng); sk(g, [[194, -32], [200, 0]], 1.6, rng)
      sk(g, [[170, -180], [170, -130]], 0.9, rng)
      g.fillStyle = '#3A3430'; g.beginPath(); g.moveTo(154, -130); g.lineTo(186, -130); g.lineTo(196, -114); g.lineTo(144, -114); g.closePath(); g.fill()
      g.fillStyle = '#3A3430'; g.beginPath(); g.moveTo(96, -70); g.lineTo(112, -122); g.lineTo(128, -70); g.closePath(); g.globalAlpha = 0.25; g.fill(); g.globalAlpha = 1
    },
    front(c, t, S, hov) {
      const fl = 0.16 + 0.03 * Math.sin(t * 3.1)
      const g = c.createLinearGradient(0, -114, 0, -66); g.addColorStop(0, `rgba(255,232,170,${fl + 0.08})`); g.addColorStop(1, 'rgba(255,232,170,0)')
      c.fillStyle = g; c.beginPath(); c.moveTo(146, -114); c.lineTo(194, -114); c.lineTo(250, -66); c.lineTo(90, -66); c.closePath(); c.fill()
      c.fillStyle = 'rgba(255,236,190,.95)'; c.beginPath(); c.ellipse(170, -114, 22, 2.2, 0, 0, TAU); c.fill()
      // 立在书架上的杂志，正在翻页
      const sp = 112, base = -72, ph = 34, pw = 32
      const dur = hov ? 1.6 : 4.2, cyc = Math.floor(t / dur), p = (t % dur) / dur
      const spreads = S.spreads, a = spreads[cyc % spreads.length], b = spreads[(cyc + 1) % spreads.length]
      const page = (x0, w, content) => {
        c.fillStyle = '#FFFDF7'; c.fillRect(x0, base - ph, w, ph)
        c.strokeStyle = 'rgba(43,39,36,.6)'; c.lineWidth = 0.7; c.strokeRect(x0, base - ph, w, ph)
        if (Math.abs(w) < 3) return
        c.save(); c.beginPath(); c.rect(x0, base - ph, w, ph); c.clip()
        const xl = Math.min(x0, x0 + w), ww = Math.abs(w)
        c.fillStyle = content.col; c.fillRect(xl + 3, base - ph + 3, ww - 6, ph * 0.45)
        c.fillStyle = 'rgba(43,39,36,.35)'; for (let k = 0; k < 4; k++) c.fillRect(xl + 3, base - ph * 0.42 + k * 5, (ww - 6) * (k === 3 ? 0.5 : 1), 1.2)
        c.restore()
      }
      page(sp - pw, pw, a.l); page(sp, pw, b.r)
      const e = p < 0.2 ? 0 : p > 0.8 ? 1 : (p - 0.2) / 0.6
      const ang = e * Math.PI, w = pw * Math.cos(ang)
      page(sp, w, w >= 0 ? a.r : b.l)
      c.strokeStyle = 'rgba(43,39,36,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sp - pw - 4, base + 1); c.lineTo(sp + pw + 4, base + 1); c.stroke()
    },
  },

  desk: {
    tint: '#DCE2E5',
    static(g, rng) {
      fillRect(g, 56, -174, 188, 116, '#6E5440', 1.4, rng)
      g.fillStyle = '#B9A48A'
      g.beginPath(); g.moveTo(40, -178); g.quadraticCurveTo(52, -120, 44, -62); g.lineTo(60, -62); g.quadraticCurveTo(64, -120, 58, -178); g.closePath(); g.fill()
      g.beginPath(); g.moveTo(242, -178); g.quadraticCurveTo(236, -120, 240, -62); g.lineTo(258, -62); g.quadraticCurveTo(250, -120, 260, -178); g.closePath(); g.fill()
      sk(g, [[34, -180], [266, -180]], 1.8, rng)
      fillRect(g, 28, -58, 250, 7, '#7A5A43', 1.2, rng)
      fillRect(g, 34, -51, 62, 34, '#8A6A4F', 1, rng); g.fillStyle = INK; g.fillRect(60, -36, 10, 2)
      fillRect(g, 34, -17, 6, 17, '#7A5A43', 0, rng); fillRect(g, 268, -51, 6, 51, '#7A5A43', 0, rng)
      fillRect(g, 226, -98, 7, 54, '#5A4538', 0, rng); fillRect(g, 198, -46, 52, 6, '#5A4538', 0, rng)
      sk(g, [[204, -40], [200, 0]], 1.6, rng); sk(g, [[244, -40], [248, 0]], 1.6, rng)
      g.fillStyle = '#3F4A56'; g.beginPath(); g.ellipse(76, -60, 12, 3, 0, 0, TAU); g.fill()
      sk(g, [[76, -60], [84, -98], [108, -106]], 2.2, rng, false, '#3F4A56')
      g.fillStyle = '#3F4A56'; g.beginPath(); g.moveTo(100, -110); g.lineTo(120, -104); g.lineTo(116, -92); g.lineTo(96, -98); g.closePath(); g.fill()
      g.fillStyle = '#FBF8F1'; g.fillRect(122, -61, 60, 3); g.fillRect(126, -63, 56, 2)
      g.fillStyle = '#E8DCC4'; g.fillRect(186, -64, 14, 6)
      fillRect(g, 206, -74, 14, 15, '#EFE8DA', 1, rng); sk(g, [[220, -70], [226, -68], [224, -62], [220, -62]], 1, rng)
    },
    holes: [{ r: [64, -166, 172, 100] }],
    behind(c, t, S, hov) {
      c.save(); c.beginPath(); c.rect(64, -166, 172, 100); c.clip()
      const night = S.tod === 'night'
      const g = c.createLinearGradient(0, -166, 0, -66); g.addColorStop(0, night ? '#1E2636' : '#5D6D7D'); g.addColorStop(1, night ? '#39445A' : '#93A1AC')
      c.fillStyle = g; c.fillRect(64, -166, 172, 100)
      c.fillStyle = night ? 'rgba(20,24,34,.7)' : 'rgba(70,82,94,.55)'
      c.beginPath(); c.moveTo(64, -80); c.lineTo(90, -96); c.lineTo(110, -88); c.lineTo(140, -104); c.lineTo(172, -90); c.lineTo(200, -100); c.lineTo(236, -86); c.lineTo(236, -66); c.lineTo(64, -66); c.closePath(); c.fill()
      if (night) { for (let k = 0; k < 5; k++) { c.fillStyle = `rgba(255,210,140,${0.5 + 0.3 * Math.sin(t + k)})`; c.fillRect(96 + k * 28, -84 + (k % 2) * 6, 3, 3) } }
      const heavy = hov ? 1.8 : 1
      c.strokeStyle = 'rgba(220,230,238,.45)'; c.lineWidth = 0.8; c.beginPath()
      for (let i = 0; i < 46 * heavy; i++) { const x = 64 + ((i * 37.3 + t * 30) % 190) - 10, y = -170 + ((t * 260 + i * 53.7) % 120); c.moveTo(x, y); c.lineTo(x - 3, y + 10) }
      c.stroke()
      for (const d of S.drops) {
        const y = -166 + ((t * d.v * heavy + d.o) % 108)
        c.strokeStyle = 'rgba(230,238,244,.35)'; c.lineWidth = d.r * 0.8; c.beginPath(); c.moveTo(d.x, y - d.r * 6); c.lineTo(d.x, y); c.stroke()
        c.fillStyle = 'rgba(236,242,246,.75)'; c.beginPath(); c.arc(d.x, y, d.r, 0, TAU); c.fill()
        c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(d.x - d.r * 0.3, y - d.r * 0.3, d.r * 0.35, 0, TAU); c.fill()
      }
      if ((t % 26) < 0.14) { c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(64, -166, 172, 100) }
      c.restore()
    },
    front(c, t, S, hov) {
      c.fillStyle = '#6E5440'; c.fillRect(148, -166, 4, 100); c.fillRect(64, -120, 172, 4)
      c.fillStyle = '#7A5A43'; c.fillRect(52, -66, 196, 6)
      const g = c.createRadialGradient(110, -96, 0, 110, -80, 70); g.addColorStop(0, 'rgba(255,220,150,.45)'); g.addColorStop(1, 'rgba(255,210,140,0)')
      c.fillStyle = g; c.beginPath(); c.moveTo(96, -98); c.lineTo(120, -92); c.lineTo(170, -58); c.lineTo(60, -58); c.closePath(); c.fill()
      c.fillStyle = 'rgba(255,236,190,.9)'; c.beginPath(); c.ellipse(108, -95, 10, 2, 0.3, 0, TAU); c.fill()
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.5 + k * 0.5) % 1; c.globalAlpha = 1 - ph; c.beginPath()
        for (let i = 0; i <= 10; i++) { const u = i / 10, y = -76 - u * 22 - ph * 10, x = 212 + k * 4 + Math.sin(u * 6 + t * 2 + k) * 3; i ? c.lineTo(x, y) : c.moveTo(x, y) }
        c.stroke()
      }
      c.globalAlpha = 1
      const wp = (t % 6) / 6
      c.strokeStyle = 'rgba(43,39,36,.8)'; c.lineWidth = 0.7; c.beginPath()
      const n = Math.floor(wp * 40)
      for (let i = 0; i <= n; i++) { const x = 126 + i * 1.3, y = -62.2 - Math.abs(Math.sin(i * 1.7)) * 1.2; i ? c.lineTo(x, y) : c.moveTo(x, y) }
      c.stroke()
      const px = 126 + n * 1.3
      c.strokeStyle = '#3F4A56'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(px, -62); c.lineTo(px + 8, -78); c.stroke()
    },
  },

  sofa: {
    tint: '#F0D9BE',
    static(g, rng) {
      g.strokeStyle = 'rgba(150,100,60,.10)'; g.lineWidth = 5; for (let x = 150; x < 380; x += 16) { g.beginPath(); g.moveTo(x, -180); g.lineTo(x, -40); g.stroke() }
      g.fillStyle = 'rgba(120,80,50,.1)'; g.fillRect(0, -40, 380, 40)
      fillRect(g, 28, -180, 98, 52, '#A6958A', 1.2, rng)
      fillRect(g, 16, -126, 122, 126, '#A6958A', 1.4, rng)
      g.strokeStyle = 'rgba(60,50,44,.35)'; g.lineWidth = 1
      for (let y = -120; y < 0; y += 12) for (let x = 18 + ((y / 12) % 2 ? 0 : 10); x < 136; x += 22) { g.strokeRect(x, y, 20, 11) }
      for (let y = -176; y < -128; y += 12) for (let x = 30 + ((y / 12) % 2 ? 0 : 10); x < 124; x += 22) g.strokeRect(x, y, 20, 11)
      g.fillStyle = '#231B17'; g.beginPath(); g.moveTo(40, 0); g.lineTo(40, -58); g.quadraticCurveTo(40, -88, 77, -88); g.quadraticCurveTo(114, -88, 114, -58); g.lineTo(114, 0); g.closePath(); g.fill()
      sk(g, [[40, 0], [40, -58], [48, -78], [77, -88], [106, -78], [114, -58], [114, 0]], 1.6, rng)
      fillRect(g, 8, -132, 138, 8, '#6E5440', 1.2, rng)
      fillRect(g, 8, -6, 138, 6, '#4A3F3A', 0, rng)
      fillRect(g, 26, -148, 6, 16, '#F2E8D8', 0.8, rng)
      g.fillStyle = '#5E7A7F'; g.beginPath(); g.moveTo(106, -132); g.quadraticCurveTo(100, -146, 108, -154); g.lineTo(116, -154); g.quadraticCurveTo(124, -146, 118, -132); g.closePath(); g.fill()
      fillRect(g, 60, -150, 22, 18, '#FBF8F1', 1, rng); g.fillStyle = '#C9A27A'; g.fillRect(63, -147, 16, 12)
      g.fillStyle = 'rgba(169,88,63,.85)'; g.beginPath(); g.ellipse(262, -3, 112, 6, 0, 0, TAU); g.fill()
      g.strokeStyle = 'rgba(240,220,190,.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse(262, -3, 96, 4, 0, 0, TAU); g.stroke()
      fillRect(g, 234, -164, 88, 50, '#FBF8F1', 1.4, rng)
      g.fillStyle = '#C4553F'; g.fillRect(240, -158, 30, 24); g.fillStyle = '#2F4858'; g.fillRect(266, -146, 36, 26); g.fillStyle = '#D8B25A'; g.beginPath(); g.arc(300, -150, 9, 0, TAU); g.fill()
      g.fillStyle = '#7C8B7E'
      rr(g, 204, -98, 146, 50, 12); g.fill(); rr(g, 196, -54, 162, 42, 8); g.fill()
      g.fillStyle = '#6D7C70'; rr(g, 186, -74, 28, 62, 10); g.fill(); rr(g, 342, -74, 28, 62, 10); g.fill()
      sk(g, [[214, -54], [342, -54]], 1, rng); sk(g, [[278, -54], [278, -14]], 1, rng)
      g.fillStyle = '#D9B36C'; g.beginPath(); g.ellipse(232, -62, 16, 11, -0.3, 0, TAU); g.fill()
      g.fillStyle = '#4A3F3A'; g.fillRect(202, -12, 5, 12); g.fillRect(348, -12, 5, 12)
      g.save(); g.translate(168, -4); g.rotate(-0.28)
      g.fillStyle = '#B8783F'; g.beginPath(); g.arc(0, -20, 18, 0, TAU); g.arc(0, -44, 13, 0, TAU); g.fill()
      g.fillStyle = '#9A6130'; g.fillRect(-16, -33, 32, 6)
      g.fillStyle = '#B8783F'; g.beginPath(); g.arc(0, -20, 17, 0, TAU); g.fill(); g.beginPath(); g.arc(0, -44, 12, 0, TAU); g.fill()
      g.fillStyle = '#2B2019'; g.beginPath(); g.arc(0, -36, 5.5, 0, TAU); g.fill()
      g.fillStyle = '#4A3322'; g.fillRect(-6, -14, 12, 3)
      g.fillStyle = '#5A3E2B'; g.fillRect(-3, -104, 6, 50); g.fillRect(-4.5, -118, 9, 15)
      g.restore()
    },
    holes: [{ p: [[42, 0], [42, -58], [48, -76], [77, -86], [106, -76], [112, -58], [112, 0]] }],
    behind(c, t, S, hov) {
      c.save(); c.beginPath(); c.moveTo(40, 0); c.lineTo(40, -58); c.quadraticCurveTo(40, -88, 77, -88); c.quadraticCurveTo(114, -88, 114, -58); c.lineTo(114, 0); c.closePath(); c.clip()
      const g = c.createLinearGradient(0, -88, 0, 0); g.addColorStop(0, '#120C0A'); g.addColorStop(1, '#3A2217'); c.fillStyle = g; c.fillRect(40, -90, 76, 90)
      const k = hov ? 1.35 : 1
      for (let layer = 0; layer < 3; layer++) {
        c.fillStyle = ['rgba(214,84,36,.92)', 'rgba(246,152,58,.92)', 'rgba(255,226,150,.95)'][layer]
        for (let i = 0; i < 5; i++) {
          const x = 52 + i * 12.5, w = (8 - layer * 2) * (i === 2 ? 1.3 : 1)
          const h = (34 - layer * 9) * k * (0.75 + 0.35 * Math.sin(t * (7 + i) + i * 2 + layer) * Math.sin(t * 3.1 + i)) * (i === 2 ? 1.3 : i === 0 || i === 4 ? 0.7 : 1)
          const sw = Math.sin(t * 5 + i + layer) * 3
          c.beginPath(); c.moveTo(x - w, -12); c.quadraticCurveTo(x - w * 1.1, -12 - h * 0.55, x + sw, -12 - h); c.quadraticCurveTo(x + w * 1.1, -12 - h * 0.55, x + w, -12); c.closePath(); c.fill()
        }
      }
      c.fillStyle = '#4A2E1E'; c.save(); c.translate(77, -9); c.rotate(0.18); rr(c, -30, -5, 60, 9, 4); c.fill(); c.rotate(-0.36); rr(c, -30, -5, 60, 9, 4); c.fill(); c.restore()
      c.fillStyle = 'rgba(255,120,50,.8)'; c.fillRect(56, -8, 44, 3)
      c.restore()
    },
    front(c, t, S, hov) {
      const f = 0.8 + 0.2 * Math.sin(t * 7) * Math.sin(t * 3.3)
      c.globalCompositeOperation = 'lighter'
      const g = c.createRadialGradient(77, -30, 10, 77, -30, hov ? 260 : 210); g.addColorStop(0, `rgba(255,140,60,${0.22 * f})`); g.addColorStop(1, 'rgba(255,120,50,0)')
      c.fillStyle = g; c.fillRect(-20, -200, 420, 200)
      c.globalCompositeOperation = 'source-over'
      for (const s of S.sparks) {
        const life = ((t * s.v + s.o) % 1); const y = -20 - life * 80, x = 77 + s.dx + Math.sin(life * 8 + s.o * 9) * 6
        if (y < -84 && Math.abs(x - 77) > 30) continue
        c.fillStyle = `rgba(255,${180 + s.o * 60 | 0},90,${1 - life})`; c.fillRect(x, y, 1.6, 1.6)
      }
      for (const n of S.notes) {
        const age = t - n.t0; if (age < 0 || age > 3.2) continue
        const a = 1 - age / 3.2, x = n.x + age * 14 + Math.sin(age * 3 + n.p) * 6, y = n.y - age * 30
        c.save(); c.globalAlpha = a; c.translate(x, y); c.fillStyle = INK; c.strokeStyle = INK; c.lineWidth = 1.2
        c.beginPath(); c.ellipse(0, 0, 3.4, 2.4, -0.4, 0, TAU); c.fill()
        c.beginPath(); c.moveTo(3, -1); c.lineTo(3, -14); c.quadraticCurveTo(8, -11, 8, -6); c.stroke()
        if (n.dbl) { c.beginPath(); c.ellipse(10, 2, 3.4, 2.4, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(13, 1); c.lineTo(13, -12); c.moveTo(3, -14); c.lineTo(13, -12); c.stroke() }
        c.restore()
      }
    },
  },

  cushion: {
    tint: '#E4E6D8',
    static(g, rng) {
      fillRect(g, 18, -172, 40, 88, '#F6F1E4', 1, rng)
      g.fillStyle = '#4A3F3A'; g.fillRect(14, -174, 48, 4); g.fillRect(14, -86, 48, 4)
      g.fillStyle = 'rgba(43,39,36,.55)'; g.beginPath(); g.moveTo(22, -104); g.lineTo(32, -134); g.lineTo(40, -118); g.lineTo(46, -128); g.lineTo(54, -104); g.closePath(); g.fill()
      g.fillStyle = 'rgba(43,39,36,.3)'; g.beginPath(); g.moveTo(22, -100); g.lineTo(36, -114); g.lineTo(54, -100); g.closePath(); g.fill()
      g.fillStyle = '#AF3629'; g.fillRect(48, -160, 5, 6)
      fillRect(g, 118, -28, 74, 5, '#6E5440', 1, rng); sk(g, [[124, -23], [124, 0]], 1.4, rng); sk(g, [[186, -23], [186, 0]], 1.4, rng)
      g.fillStyle = '#6B5B4B'; g.beginPath(); g.ellipse(154, -34, 11, 5, 0, 0, Math.PI); g.fill(); g.fillRect(143, -36, 22, 2)
      sk(g, [[156, -36], [160, -62]], 0.8, rng, false, '#8A5A3A')
      g.fillStyle = '#C9A66B'; g.beginPath(); g.ellipse(72, -9, 34, 9, 0, 0, TAU); g.fill()
      g.strokeStyle = 'rgba(120,90,50,.6)'; g.lineWidth = 0.8; for (let k = 1; k < 4; k++) { g.beginPath(); g.ellipse(72, -10, 34 - k * 8, 9 - k * 2, 0, 0, TAU); g.stroke() }
      g.fillStyle = 'rgba(52,48,44,.82)'; g.beginPath(); g.arc(72, -58, 7, 0, TAU); g.fill()
      g.beginPath(); g.moveTo(62, -48); g.quadraticCurveTo(72, -52, 82, -48); g.quadraticCurveTo(94, -28, 100, -14); g.lineTo(44, -14); g.quadraticCurveTo(50, -28, 62, -48); g.closePath(); g.fill()
      sk(g, [[222, -130], [206, 0]], 1.8, rng, false, '#7A5A43'); sk(g, [[222, -130], [240, 0]], 1.8, rng, false, '#7A5A43'); sk(g, [[222, -130], [226, 0]], 1.2, rng, false, '#7A5A43')
      fillRect(g, 196, -132, 52, 62, '#FFFDF8', 1.2, rng)
      fillRect(g, 198, -70, 48, 3, '#7A5A43', 0, rng)
      g.fillStyle = '#9C6B4E'; g.beginPath(); g.moveTo(8, -22); g.lineTo(32, -22); g.lineTo(28, 0); g.lineTo(12, 0); g.closePath(); g.fill()
    },
    front(c, t, S, hov) {
      const br = (Math.sin(t * TAU / 8) + 1) / 2
      const r = 40 + br * 12
      const g = c.createRadialGradient(72, -40, r * 0.5, 72, -40, r)
      g.addColorStop(0, 'rgba(230,200,140,0)'); g.addColorStop(0.8, `rgba(230,200,140,${0.1 + br * 0.12})`); g.addColorStop(1, 'rgba(230,200,140,0)')
      c.fillStyle = g; c.fillRect(72 - r, -40 - r, r * 2, r * 2)
      c.fillStyle = `rgba(255,120,60,${0.6 + 0.4 * Math.sin(t * 4)})`; c.beginPath(); c.arc(160, -62, 1.4, 0, TAU); c.fill()
      c.strokeStyle = 'rgba(120,116,110,.35)'; c.lineWidth = 1.1
      for (let k = 0; k < 3; k++) {
        c.beginPath()
        for (let i = 0; i <= 24; i++) { const u = i / 24, y = -62 - u * 90, x = 160 + Math.sin(u * 5 - t * 1.2 + k * 2) * (3 + u * 14) + k * 2; i ? c.lineTo(x, y) : c.moveTo(x, y) }
        c.globalAlpha = 0.8 - k * 0.2; c.stroke()
      }
      c.globalAlpha = 1
      // 画布自己作画
      const cyc = 20, n = Math.floor(t / cyc), ct = t % cyc
      const strokes = S.paint(n)
      const fade = ct > cyc - 2 ? (cyc - ct) / 2 : 1
      c.save(); c.beginPath(); c.rect(197, -131, 50, 60); c.clip(); c.globalAlpha = fade; c.lineCap = 'round'
      strokes.forEach((s, i) => {
        const p = clamp((ct * (hov ? 2 : 1) - i * 1.7) / 1.4, 0, 1); if (p <= 0) return
        c.strokeStyle = s.col; c.lineWidth = s.w; c.beginPath()
        for (let j = 0; j <= 16 * p; j++) { const u = j / 16, x = (1 - u) * (1 - u) * s.a[0] + 2 * (1 - u) * u * s.b[0] + u * u * s.d[0], y = (1 - u) * (1 - u) * s.a[1] + 2 * (1 - u) * u * s.b[1] + u * u * s.d[1]; j ? c.lineTo(x, y) : c.moveTo(x, y) }
        c.stroke()
      })
      c.restore(); c.globalAlpha = 1
      c.fillStyle = '#4E6B4E'
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.45 + Math.sin(t * 1.3 + k) * 0.08
        c.save(); c.translate(20, -22); c.rotate(a); c.beginPath(); c.ellipse(16, 0, 16, 4, 0, 0, TAU); c.fill(); c.restore()
      }
    },
  },

  basement: {
    tint: '#3B3531',
    static(g, rng) {
      g.strokeStyle = 'rgba(255,240,220,.07)'; g.lineWidth = 1.2
      for (let y = -134; y < -4; y += 16) for (let x = ((y / 16) % 2 ? 0 : 14) + rng() * 6; x < 620; x += 30 + rng() * 10) { rr(g, x, y, 26 + rng() * 6, 13, 4); g.stroke() }
      g.strokeStyle = '#6B625A'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, -130); g.lineTo(620, -130); g.stroke()
      g.lineWidth = 4; g.beginPath(); g.moveTo(0, -120); g.lineTo(440, -120); g.lineTo(440, -104); g.stroke()
      g.fillStyle = '#5A524B'; for (const x of [120, 300, 500]) g.fillRect(x, -134, 8, 8)
      g.strokeStyle = '#7A6E62'; g.lineWidth = 3; g.beginPath(); g.moveTo(600, -140); g.lineTo(476, 0); g.stroke()
      g.fillStyle = '#5A4E44'; for (let k = 0; k < 8; k++) { const x = 600 - k * 16, y = -140 + k * 17.5; g.fillRect(x - 22, y, 26, 4) }
      for (const y of [-100, -60]) fillRect(g, 16, y, 124, 4, '#6E5440', 0, rng)
      const jc = ['#7E8C6A', '#8C6A5A', '#6A7A8C', '#9A8A5A']
      for (const y of [-100, -60]) for (let x = 22; x < 132; x += 18 + rng() * 6) { const h = 16 + rng() * 10; g.fillStyle = jc[(x | 0) % 4]; rr(g, x, y - h, 13, h, 3); g.fill(); g.fillStyle = '#4A3F3A'; g.fillRect(x + 1, y - h - 3, 11, 3) }
      fillRect(g, 20, -30, 40, 30, '#6E5A48', 1, rng); fillRect(g, 64, -22, 30, 22, '#7A6450', 1, rng)
      g.fillStyle = '#B8B0A4'; g.beginPath(); g.moveTo(236, 0); g.quadraticCurveTo(232, -62, 270, -86); g.quadraticCurveTo(312, -106, 352, -88); g.quadraticCurveTo(390, -64, 386, 0); g.closePath(); g.fill()
      g.strokeStyle = 'rgba(80,72,64,.55)'; g.lineWidth = 1.2
      for (const [a, b] of [[[262, -80], [252, 0]], [[304, -98], [300, 0]], [[340, -90], [352, 0]]]) { g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2 + 8, -40, b[0], b[1]); g.stroke() }
      fillRect(g, 404, -34, 40, 34, '#6E5A48', 1, rng); sk(g, [[404, -34], [444, 0]], 0.8, rng); sk(g, [[444, -34], [404, 0]], 0.8, rng)
    },
    front(c, t, S, hov) {
      const sw = Math.sin(t * 0.9) * 0.09, bx = 200 + Math.sin(sw) * 40, by = -130 + Math.cos(sw) * 40
      c.strokeStyle = '#2B2724'; c.lineWidth = 1; c.beginPath(); c.moveTo(200, -130); c.lineTo(bx, by); c.stroke()
      const flick = (t % 9) > 8.6 ? 0.3 + 0.7 * Math.abs(Math.sin(t * 40)) : 0.92 + 0.08 * Math.sin(t * 13)
      c.globalCompositeOperation = 'lighter'
      const g = c.createRadialGradient(bx, by + 6, 0, bx, by + 6, hov ? 240 : 190); g.addColorStop(0, `rgba(255,196,120,${0.32 * flick})`); g.addColorStop(1, 'rgba(255,180,100,0)')
      c.fillStyle = g; c.fillRect(-20, -150, 660, 160)
      const g2 = c.createRadialGradient(312, -4, 0, 312, -4, 70); const pu = 0.2 + 0.15 * Math.sin(t * 1.6)
      g2.addColorStop(0, `rgba(150,110,240,${pu})`); g2.addColorStop(1, 'rgba(150,110,240,0)')
      c.fillStyle = g2; c.fillRect(240, -60, 150, 64)
      c.globalCompositeOperation = 'source-over'
      c.fillStyle = `rgba(255,236,190,${0.7 + 0.3 * flick})`; c.beginPath(); c.ellipse(bx, by + 6, 5, 7, sw, 0, TAU); c.fill()
      c.fillStyle = '#3F3A36'; c.fillRect(bx - 3, by - 2, 6, 4)
      for (const d of S.dust) { const x = d.x + Math.sin(t * d.f + d.p) * 12, y = d.y + Math.cos(t * d.f * 0.8 + d.p) * 8; const dist = Math.hypot(x - bx, y - by); if (dist > 130) continue; c.fillStyle = `rgba(255,236,200,${(1 - dist / 130) * 0.6})`; c.fillRect(x, y, 1.3, 1.3) }
      const blink = (t % 5.3) < 0.14 ? 0.1 : 1, look = hov ? Math.sin(t * 0.8) * 1.2 : 0
      for (const ex of [532, 546]) {
        const g3 = c.createRadialGradient(ex, -20, 0, ex, -20, 9); g3.addColorStop(0, 'rgba(210,240,120,.45)'); g3.addColorStop(1, 'rgba(210,240,120,0)')
        c.fillStyle = g3; c.fillRect(ex - 9, -29, 18, 18)
        c.fillStyle = '#D8F07A'; c.beginPath(); c.ellipse(ex, -20, 3.6, 3 * blink, 0, 0, TAU); c.fill()
        if (blink > 0.5) { c.fillStyle = '#111'; c.beginPath(); c.ellipse(ex + look, -20, 0.9, 2.6, 0, 0, TAU); c.fill() }
      }
      const dp = (t % 3.2) / 3.2
      if (dp < 0.55) { const y = lerp(-104, 0, (dp / 0.55) ** 2); c.fillStyle = 'rgba(180,200,210,.8)'; c.beginPath(); c.ellipse(440, y, 1.4, 2.2, 0, 0, TAU); c.fill() }
      else { const k = (dp - 0.55) / 0.45; c.strokeStyle = `rgba(180,200,210,${0.6 * (1 - k)})`; c.lineWidth = 0.8; c.beginPath(); c.ellipse(440, -1, 4 + k * 14, 1 + k * 3, 0, 0, TAU); c.stroke() }
    },
  },

  garden: {
    tint: null,
    static(g, rng) {
      g.fillStyle = '#EFE8D8'; g.fillRect(26, -178, 228, 178)
      g.strokeStyle = 'rgba(120,100,80,.18)'; g.lineWidth = 1; for (let y = -170; y < 0; y += 22) { g.beginPath(); g.moveTo(26, y); g.lineTo(254, y); g.stroke() }
      g.fillStyle = '#3F3834'; g.fillRect(18, -190, 244, 12)
      for (let x = 20; x < 260; x += 8) { g.beginPath(); g.arc(x + 4, -190, 3.6, Math.PI, 0); g.fill() }
      skRect(g, 26, -178, 228, 178, 1.4, rng)
      g.strokeStyle = '#8C7B68'; g.lineWidth = 5; g.beginPath(); g.arc(140, -76, 70, 0, TAU); g.stroke()
      sk(g, [[14, 0], [22, -60], [18, -110], [34, -160], [46, -214]], 5, rng, false, '#3A302A')
      sk(g, [[22, -110], [56, -142], [72, -200]], 3, rng, false, '#3A302A'); sk(g, [[34, -160], [10, -196]], 2.4, rng, false, '#3A302A'); sk(g, [[56, -142], [94, -168]], 2, rng, false, '#3A302A')
      for (let k = 0; k < 34; k++) { const x = 8 + rng() * 96, y = -120 - rng() * 100; g.fillStyle = `rgba(${200 + rng() * 30 | 0},${80 + rng() * 40 | 0},${90 + rng() * 30 | 0},.85)`; g.beginPath(); g.arc(x, y, 2.4 + rng() * 1.6, 0, TAU); g.fill() }
      g.fillStyle = '#8A8378'
      g.fillRect(242, -14, 30, 14); g.fillRect(252, -46, 10, 32); g.fillRect(240, -52, 34, 6); g.fillRect(244, -74, 26, 22)
      g.beginPath(); g.moveTo(234, -74); g.lineTo(280, -74); g.lineTo(257, -92); g.closePath(); g.fill(); g.beginPath(); g.arc(257, -95, 4, 0, TAU); g.fill()
      for (const [x, w] of [[124, 30], [132, 22], [138, 16]]) { g.fillStyle = '#B9B1A2'; g.beginPath(); g.ellipse(x + w / 2, -2 - (x - 124) * 0.2, w / 2, 3, 0, 0, TAU); g.fill() }
    },
    holes: [{ c: [140, -76, 67] }, { r: [250, -70, 14, 14] }],
    behind(c, t, S) {
      c.save(); c.beginPath(); c.arc(140, -76, 68, 0, TAU); c.clip()
      const night = S.tod === 'night'
      const g = c.createLinearGradient(0, -144, 0, -8); g.addColorStop(0, night ? '#39405A' : '#E9E3D4'); g.addColorStop(1, night ? '#5A6076' : '#F4EFE4'); c.fillStyle = g; c.fillRect(60, -150, 160, 150)
      c.fillStyle = night ? 'rgba(246,243,232,.9)' : 'rgba(192,64,44,.8)'; c.beginPath(); c.arc(104, -112, 8, 0, TAU); c.fill()
      const layers = [[-70, 26, 0.22, 4, night ? 'rgba(20,24,36,.35)' : 'rgba(60,64,70,.28)'], [-52, 30, 0.5, 7, night ? 'rgba(20,24,36,.55)' : 'rgba(40,42,46,.45)'], [-30, 18, 1, 12, night ? 'rgba(14,16,24,.8)' : 'rgba(30,30,32,.7)']]
      for (const [base, amp, sp, fr, col] of layers) {
        c.fillStyle = col; c.beginPath(); c.moveTo(60, 0)
        for (let x = 60; x <= 222; x += 3) { const u = (x + t * 6 * sp) / 40; const y = base - amp * Math.abs(Math.sin(u * 0.9 + fr) * 0.7 + Math.sin(u * 2.3 + fr * 2) * 0.3); c.lineTo(x, y) }
        c.lineTo(222, 0); c.closePath(); c.fill()
        c.fillStyle = night ? 'rgba(90,96,118,.35)' : 'rgba(244,240,230,.55)'; c.fillRect(60, base + 4, 162, 6)
      }
      const bx = 80 + ((t * 5) % 160); c.fillStyle = 'rgba(30,28,26,.85)'; c.beginPath(); c.moveTo(bx - 7, -16); c.quadraticCurveTo(bx, -12, bx + 7, -17); c.quadraticCurveTo(bx, -14.5, bx - 7, -16); c.fill(); c.fillRect(bx + 2, -22, 1.2, 5)
      c.restore()
      c.fillStyle = S.tod === 'night' || S.tod === 'dusk' ? `rgba(255,${190 + 20 * Math.sin(t * 3)},110,.95)` : '#4A433C'; c.fillRect(250, -70, 14, 14)
    },
    front(c, t, S, hov) {
      const lit = S.tod === 'night' || S.tod === 'dusk'
      if (lit) { const g = c.createRadialGradient(257, -63, 0, 257, -63, 40); g.addColorStop(0, 'rgba(255,200,120,.4)'); g.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = g; c.fillRect(217, -103, 80, 80) }
      for (const p of S.petals) {
        const life = (t * p.v + p.o) % 1; const x = p.x + life * 70 + Math.sin(life * 9 + p.o * 10) * 8, y = -200 + life * 200
        c.save(); c.translate(x, y); c.rotate(life * 8 + p.o * 6); c.fillStyle = `rgba(214,120,130,${0.85 * (1 - life * 0.6)})`; c.beginPath(); c.ellipse(0, 0, 3, 1.6, 0, 0, TAU); c.fill(); c.restore()
      }
      if (lit) for (const f of S.flies) { const x = f.x + Math.sin(t * 0.7 * f.s + f.p) * 18, y = f.y + Math.cos(t * 0.9 * f.s + f.p) * 12, a = 0.5 + 0.5 * Math.sin(t * 2.4 * f.s + f.p); const g = c.createRadialGradient(x, y, 0, x, y, 6); g.addColorStop(0, `rgba(230,250,150,${a})`); g.addColorStop(1, 'rgba(230,250,150,0)'); c.fillStyle = g; c.fillRect(x - 6, y - 6, 12, 12) }
      else for (let k = 0; k < 2; k++) {
        const x = 150 + Math.sin(t * 0.4 + k * 3) * 110, y = -120 + Math.sin(t * 0.9 + k) * 40, fl = Math.abs(Math.sin(t * 12 + k))
        c.save(); c.translate(x, y); c.fillStyle = k ? 'rgba(230,170,70,.9)' : 'rgba(250,246,236,.95)'; c.strokeStyle = 'rgba(43,39,36,.6)'; c.lineWidth = 0.6
        for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 4 * fl, -2, 4 * fl + 0.5, 5, s * 0.4, 0, TAU); c.fill(); c.stroke() }
        c.fillStyle = INK; c.fillRect(-0.6, -5, 1.2, 8); c.restore()
      }
      c.strokeStyle = '#4E6B4E'; c.lineWidth = 1.3; c.lineCap = 'round'
      for (const b of S.grass) { const sw = Math.sin(t * 1.6 + b.x * 0.08) * (hov ? 5 : 3); c.beginPath(); c.moveTo(b.x, 2); c.quadraticCurveTo(b.x + sw * 0.4, -b.h * 0.5, b.x + sw + b.l, -b.h); c.stroke() }
    },
  },
}

/* ============================================================
   屋子外壳：地面、墙、楼板、屋顶、烟囱
   ============================================================ */
function drawStructure(g, L, rng) {
  const { LW, LH, houseL, houseR, cx, apexY, roofBase, f1Top, groundY, baseBot, f2Split, f1Split } = L
  const soil = g.createLinearGradient(0, groundY, 0, LH); soil.addColorStop(0, '#9C8A72'); soil.addColorStop(1, '#6F604F')
  g.fillStyle = soil
  g.beginPath(); g.rect(0, groundY, LW, LH - groundY); g.rect(houseR + 8, groundY, -(houseR - houseL + 16), baseBot + 8 - groundY); g.fill('evenodd')
  for (let k = 0; k < 140; k++) { const x = rng() * LW, y = groundY + 10 + rng() * (LH - groundY - 10); if (x > houseL - 6 && x < houseR + 6 && y < baseBot + 8) continue; g.fillStyle = `rgba(60,48,38,${0.2 + rng() * 0.3})`; g.beginPath(); g.ellipse(x, y, 2 + rng() * 5, 1.4 + rng() * 3, rng(), 0, TAU); g.fill() }
  g.fillStyle = '#6E8A5A'; g.fillRect(0, groundY - 4, LW, 6)
  g.strokeStyle = '#5C7A4C'; g.lineWidth = 1.2
  for (let x = 2; x < LW; x += 5 + rng() * 6) { if (x > houseL - 8 && x < houseR + 8) continue; const h = 4 + rng() * 9; g.beginPath(); g.moveTo(x, groundY - 2); g.lineTo(x + (rng() - 0.5) * 4, groundY - 2 - h); g.stroke() }
  g.fillStyle = '#5E7A52'; for (const [x, r] of [[26, 18], [44, 13]]) { if (x < houseL - 4) { g.beginPath(); g.arc(x, groundY - r * 0.6, r, Math.PI, 0); g.fill() } }
  const wall = '#5A4E44'
  g.fillStyle = wall
  g.fillRect(houseL - 8, roofBase, 8, baseBot - roofBase + 8); g.fillRect(houseR, roofBase, 8, baseBot - roofBase + 8)
  g.fillRect(houseL - 8, roofBase - 5, houseR - houseL + 16, 9)
  g.fillRect(houseL - 8, f1Top - 4, houseR - houseL + 16, 8)
  g.fillRect(houseL - 8, groundY - 5, houseR - houseL + 16, 10)
  g.fillRect(houseL - 8, baseBot, houseR - houseL + 16, 8)
  g.fillRect(f2Split - 3, roofBase, 6, f1Top - roofBase)
  g.fillRect(f1Split - 3, f1Top, 6, groundY - f1Top)
  const dh = Math.min(120, (groundY - f1Top) * 0.66)
  g.fillStyle = '#8A6A4F'; g.fillRect(houseR - 1, groundY - 5 - dh, 10, dh); g.fillStyle = '#D8B25A'; g.fillRect(houseR + 1, groundY - 5 - dh * 0.5, 3, 5)
  const oL = houseL - 34, oR = houseR + 34, iL = houseL + 2, iR = houseR - 2, iA = apexY + 30
  const slopeY = x => (x < cx ? lerp(roofBase, apexY, (x - oL) / (cx - oL)) : lerp(apexY, roofBase, (x - cx) / (oR - cx)))
  const chX = houseL + 56, chW = 38
  g.fillStyle = '#8C6B5A'; g.fillRect(chX, slopeY(chX + chW) - 62, chW, 70)
  g.strokeStyle = 'rgba(60,40,30,.5)'; g.lineWidth = 1
  for (let y = slopeY(chX + chW) - 58; y < slopeY(chX); y += 9) { g.beginPath(); g.moveTo(chX, y); g.lineTo(chX + chW, y); g.stroke() }
  g.fillStyle = '#4A3F3A'; g.fillRect(chX - 5, slopeY(chX + chW) - 68, chW + 10, 8)
  L.chimney = [chX + chW / 2, slopeY(chX + chW) - 70]
  g.beginPath(); g.moveTo(oL, roofBase + 4); g.lineTo(cx, apexY); g.lineTo(oR, roofBase + 4); g.lineTo(iR, roofBase); g.lineTo(cx, iA); g.lineTo(iL, roofBase); g.closePath()
  g.fillStyle = '#4A3F3A'; g.fill()
  g.save(); g.clip()
  g.strokeStyle = 'rgba(255,240,220,.12)'; g.lineWidth = 1.2
  for (let k = 1; k < 5; k++) { const d = k * 6; g.beginPath(); g.moveTo(oL + d * 1.6, roofBase + 4 - d * 0.2); g.lineTo(cx, apexY + d); g.lineTo(oR - d * 1.6, roofBase + 4 - d * 0.2); g.stroke() }
  for (let x = oL; x < oR; x += 14) { const y = slopeY(x); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x < cx ? 12 : -12) * 0.3, y + 26); g.stroke() }
  g.restore()
  sk(g, [[oL, roofBase + 4], [cx, apexY], [oR, roofBase + 4]], 2.4, rng)
  g.fillStyle = '#3A302A'; g.beginPath(); g.arc(cx, apexY + 2, 5, 0, TAU); g.fill()
  sk(g, [[houseL - 8, roofBase], [houseL - 8, baseBot + 8], [houseR + 8, baseBot + 8], [houseR + 8, roofBase]], 1.6, rng)
}

function atticPoly(L) { return [[L.houseL + 2, L.roofBase], [L.cx, L.apexY + 30], [L.houseR - 2, L.roofBase]] }

function buildStatic(L, k) {
  const c = document.createElement('canvas'); c.width = Math.ceil(L.LW * k); c.height = Math.ceil(L.LH * k)
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0)
  const rng = rngFrom(20260926)
  const ap = atticPoly(L)
  g.fillStyle = '#2E3550'; g.beginPath(); ap.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill()
  for (const [id, r] of Object.entries(L.rooms)) {
    const R = ROOM[id]
    if (R.tint) { g.fillStyle = R.tint; g.fillRect(r.x, r.y, r.w, r.h) }
  }
  for (const [id, r] of Object.entries(L.rooms)) {
    g.save()
    if (id === 'attic') { g.beginPath(); ap.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip() }
    else if (id !== 'garden') { g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip() }
    roomT(g, r); ROOM[id].static(g, rng); g.restore()
  }
  drawStructure(g, L, rng)
  g.globalCompositeOperation = 'destination-out'
  for (const [id, r] of Object.entries(L.rooms)) {
    for (const h of ROOM[id].holes || []) {
      g.save(); roomT(g, r); g.beginPath()
      if (h.c) g.arc(h.c[0], h.c[1], h.c[2], 0, TAU)
      else if (h.r) g.rect(h.r[0], h.r[1], h.r[2], h.r[3])
      else if (h.p) { h.p.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath() }
      g.fillStyle = '#000'; g.fill(); g.restore()
    }
  }
  g.globalCompositeOperation = 'source-over'
  return c
}

function makeState(L) {
  const r = rngFrom(7)
  const S = { tod: timeOfDay(), notes: [], lastNote: 0 }
  S.atticStars = Array.from({ length: 26 }, () => ({ x: 150 + r() * 60, y: -108 + r() * 60, r: 0.5 + r() * 1.1, f: 0.8 + r() * 2.5, p: r() * TAU }))
  S.drops = Array.from({ length: 16 }, () => ({ x: 68 + r() * 164, v: 6 + r() * 18, o: r() * 100, r: 1.2 + r() * 1.6 }))
  S.sparks = Array.from({ length: 22 }, () => ({ v: 0.35 + r() * 0.5, o: r(), dx: (r() - 0.5) * 40 }))
  S.dust = Array.from({ length: 50 }, () => ({ x: r() * 600, y: -130 + r() * 125, f: 0.2 + r() * 0.5, p: r() * TAU }))
  S.petals = Array.from({ length: 10 }, () => ({ x: r() * 120, v: 0.06 + r() * 0.08, o: r() }))
  S.flies = Array.from({ length: 10 }, () => ({ x: 30 + r() * 220, y: -20 - r() * 150, s: 0.6 + r(), p: r() * TAU }))
  S.grass = Array.from({ length: 34 }, (_, i) => ({ x: 4 + i * 8 + r() * 4, h: 8 + r() * 14, l: (r() - 0.5) * 6 }))
  const cols = ['#C4553F', '#2F4858', '#D8B25A', '#5E7A7F', '#1F1A17', '#8FA9B3', '#E3A76F']
  S.spreads = Array.from({ length: 6 }, () => ({ l: { col: cols[Math.floor(r() * cols.length)] }, r: { col: cols[Math.floor(r() * cols.length)] } }))
  const cache = new Map()
  S.paint = n => {
    if (cache.has(n)) return cache.get(n)
    const q = rngFrom(n * 7919 + 13), P = () => [197 + q() * 50, -131 + q() * 60]
    const arr = Array.from({ length: 9 }, () => ({ a: P(), b: P(), d: P(), w: 2 + q() * 7, col: cols[Math.floor(q() * cols.length)] }))
    cache.clear(); cache.set(n, arr); return arr
  }
  S.clouds = Array.from({ length: 4 }, (_, i) => ({ x: r() * L.LW, y: 40 + r() * (L.roofBase - 40), s: 0.6 + r() * 0.8, v: 4 + r() * 6 }))
  S.stars = Array.from({ length: 70 }, () => ({ x: r() * L.LW, y: r() * (L.groundY - 60), r: 0.4 + r(), p: r() * TAU }))
  return S
}

function drawSky(c, L, S, t) {
  const [a, b] = SKY[S.tod]
  const g = c.createLinearGradient(0, 0, 0, L.groundY); g.addColorStop(0, a); g.addColorStop(1, b)
  c.fillStyle = g; c.fillRect(0, 0, L.LW, L.groundY)
  const night = S.tod === 'night'
  if (night) for (const s of S.stars) { c.fillStyle = `rgba(255,250,235,${0.3 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.p))})`; c.fillRect(s.x, s.y, s.r * 1.4, s.r * 1.4) }
  const [sx, sy] = L.sun
  if (night) {
    const g2 = c.createRadialGradient(sx, sy, 14, sx, sy, 90); g2.addColorStop(0, 'rgba(246,243,232,.3)'); g2.addColorStop(1, 'rgba(246,243,232,0)'); c.fillStyle = g2; c.fillRect(sx - 90, sy - 90, 180, 180)
    c.fillStyle = '#F4F0E4'; c.beginPath(); c.arc(sx, sy, 22, 0, TAU); c.fill()
    c.fillStyle = a; c.beginPath(); c.arc(sx + 10, sy - 6, 19, 0, TAU); c.fill()
  } else {
    const col = S.tod === 'dusk' ? 'rgba(214,86,52,.9)' : S.tod === 'dawn' ? 'rgba(240,150,100,.85)' : 'rgba(255,236,190,.95)'
    const y = S.tod === 'day' ? sy : sy + 90
    const g2 = c.createRadialGradient(sx, y, 10, sx, y, 80); g2.addColorStop(0, S.tod === 'day' ? 'rgba(255,240,200,.5)' : 'rgba(240,140,90,.35)'); g2.addColorStop(1, 'rgba(255,220,180,0)')
    c.fillStyle = g2; c.fillRect(sx - 80, y - 80, 160, 160); c.fillStyle = col; c.beginPath(); c.arc(sx, y, 24, 0, TAU); c.fill()
  }
  for (const cl of S.clouds) {
    const x = ((cl.x + t * cl.v) % (L.LW + 300)) - 150
    c.fillStyle = night ? 'rgba(120,128,160,.18)' : 'rgba(255,255,255,.6)'
    for (const [dx, dy, r] of [[0, 0, 22], [22, -8, 26], [46, 0, 20], [24, 6, 22]]) { c.beginPath(); c.arc(x + dx * cl.s, cl.y + dy * cl.s, r * cl.s, 0, TAU); c.fill() }
  }
  if (S.tod === 'day' || S.tod === 'dawn') {
    const fx = ((t * 26) % (L.LW + 400)) - 200
    c.strokeStyle = 'rgba(43,39,36,.6)'; c.lineWidth = 1.2
    for (let k = 0; k < 5; k++) { const x = fx - k * 16, y = 70 + (k % 2) * 8 + k * 3, f = Math.sin(t * 9 + k) * 3; c.beginPath(); c.moveTo(x - 5, y - f); c.quadraticCurveTo(x - 2, y - 3, x, y); c.quadraticCurveTo(x + 2, y - 3, x + 5, y - f); c.stroke() }
  }
}
function drawChimneySmoke(c, L, t) {
  if (!L.chimney) return
  const [x, y] = L.chimney
  for (let k = 0; k < 9; k++) {
    const ph = (t * 0.18 + k / 9) % 1
    c.fillStyle = `rgba(200,196,188,${0.35 * (1 - ph)})`
    c.beginPath(); c.arc(x + ph * 60 + Math.sin(ph * 6 + k) * 6, y - ph * 90, 6 + ph * 18, 0, TAU); c.fill()
  }
}

/* ============================================================
   组件
   ============================================================ */
export default function ResidencyHouse() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const hoverRef = useRef(null)
  const lockedRef = useRef(new Set())
  const [userLevel, setUserLevel] = useState(0)
  const [loggedIn, setLoggedIn] = useState(false)
  const [tall, setTall] = useState(false)
  const [hovered, setHovered] = useState(null)
  const [asked, setAsked] = useState(null)

  useEffect(() => {
    async function fetchLevel() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        setLoggedIn(true)
        const { data } = await supabase.from('users').select('level').eq('auth_id', session.user.id).maybeSingle()
        if (data) setUserLevel(data.level || 0)
      } catch (e) {}
    }
    fetchLevel()
  }, [])

  const getZoneStatus = useCallback(zone => {
    if (zone.requireLevel === -1) return 'coming'
    if (zone.requireLevel === 0) return 'open'
    if (!loggedIn) return 'locked'
    if (userLevel >= zone.requireLevel) return 'open'
    return 'locked'
  }, [loggedIn, userLevel])

  useEffect(() => { lockedRef.current = new Set(ZONES.filter(z => getZoneStatus(z) !== 'open').map(z => z.id)) }, [getZoneStatus])

  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return
    const ro = new ResizeObserver(() => { const w = wrap.clientWidth; setTall(w < 640) })
    ro.observe(wrap); return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current; if (!canvas || !wrap) return
    const L = makeLayout(tall)
    const S = makeState(L)
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stat = null, k = 1, raf = 0, visible = true, last = performance.now(), T = 0
    function size() {
      const w = wrap.clientWidth, dpr = Math.min(window.devicePixelRatio || 1, 2)
      const h = w * L.LH / L.LW
      canvas.style.height = `${h}px`
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      k = canvas.width / L.LW
      stat = buildStatic(L, k)
    }
    size()
    const ro = new ResizeObserver(() => size()); ro.observe(wrap)
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting }); io.observe(canvas)
    const todTimer = setInterval(() => { S.tod = timeOfDay() }, 5 * 60 * 1000)
    const ctx = canvas.getContext('2d')
    function frame(now) {
      raf = requestAnimationFrame(frame)
      const dt = clamp((now - last) / 1000, 0, 0.05); last = now
      if (!visible || !stat) return
      T += dt * (reduced ? 0.35 : 1)
      const t = T, hov = hoverRef.current
      if (hov === 'sofa' || T - S.lastNote > 5.5) {
        if (T - S.lastNote > (hov === 'sofa' ? 0.45 : 5.5)) { S.lastNote = T; S.notes.push({ t0: T, x: 160 + Math.random() * 10, y: -50, p: Math.random() * 6, dbl: Math.random() < 0.35 }); if (S.notes.length > 14) S.notes.shift() }
      }
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
      drawSky(ctx, L, S, t)
      for (const [id, r] of Object.entries(L.rooms)) { const R = ROOM[id]; if (!R.behind) continue; ctx.save(); roomT(ctx, r); R.behind(ctx, t, S, hov === id); ctx.restore() }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(stat, 0, 0); ctx.setTransform(k, 0, 0, k, 0, 0)
      drawChimneySmoke(ctx, L, t)
      const ap = atticPoly(L)
      for (const [id, r] of Object.entries(L.rooms)) {
        ctx.save()
        if (id === 'attic') { ctx.beginPath(); ap.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip() }
        else if (id !== 'garden') { ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip() }
        const clipPath = () => { if (id === 'attic') { ctx.beginPath(); ap.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath() } else { ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h) } }
        ctx.save(); roomT(ctx, r); ROOM[id].front(ctx, t, S, hov === id); ctx.restore()
        if (hov === id) { clipPath(); ctx.fillStyle = 'rgba(255,236,200,.10)'; ctx.fill() }
        if (lockedRef.current.has(id)) { clipPath(); ctx.fillStyle = 'rgba(40,36,34,.34)'; ctx.fill() }
        ctx.restore()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); clearInterval(todTimer) }
  }, [tall])

  const L = makeLayout(tall)
  const pct = (v, total) => `${(v / total) * 100}%`
  const setHov = id => { hoverRef.current = id; setHovered(id) }

  return (
    <div>
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
        <div className="text-center py-4" style={{ background: 'linear-gradient(180deg, #1F2937 0%, #2D3748 100%)', borderBottom: '3px solid #111827' }}>
          <p style={{ fontSize: '10px', letterSpacing: '6px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cradle Residency</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', letterSpacing: '4px', marginTop: '2px' }}>摇 篮 驻 地</p>
        </div>

        <div ref={wrapRef} className="relative" style={{ lineHeight: 0 }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} aria-label="摇篮驻地的剖面房子：阁楼、装帧台、书桌、客厅沙发、休闲区蒲团、地下室与后院花园" />
          {ZONES.map(zone => {
            const r = L.rooms[zone.id]
            const status = getZoneStatus(zone)
            const isOpen = status === 'open'
            const isHovered = hovered === zone.id
            const dark = zone.id === 'attic' || zone.id === 'basement'
            const style = { position: 'absolute', left: pct(r.x, L.LW), top: pct(r.y, L.LH), width: pct(r.w, L.LW), height: pct(r.h, L.LH), lineHeight: 1.4, textDecoration: 'none', display: 'block', outlineOffset: '-3px', cursor: 'pointer', background: 'transparent', border: 0, padding: 0, textAlign: 'left' }
            const inner = (
              <>
                <span style={{ position: 'absolute', left: tall ? 6 : 10, top: zone.id === 'attic' ? '46%' : (tall ? 6 : 10), transform: zone.id === 'attic' ? 'translateY(-50%)' : 'none', display: 'inline-flex', flexDirection: 'column', gap: 1, padding: tall ? '3px 6px' : '4px 8px', borderRadius: 4, background: dark ? 'rgba(20,22,32,.55)' : 'rgba(255,255,255,.78)', backdropFilter: 'blur(4px)', border: dark ? '0.5px solid rgba(255,255,255,.18)' : '0.5px solid rgba(17,24,39,.12)', transition: 'all .3s', boxShadow: isHovered ? '0 4px 14px -6px rgba(0,0,0,.35)' : 'none' }}>
                  <span style={{ fontSize: tall ? 11 : 13, fontWeight: 600, letterSpacing: 2, color: dark ? '#F3EFE6' : '#111827' }}>{zone.name}</span>
                  <span style={{ fontSize: tall ? 9 : 10, letterSpacing: 1, color: dark ? 'rgba(243,239,230,.7)' : '#6B7280' }}>{zone.subtitle}</span>
                  {status === 'locked' && <span style={{ fontSize: tall ? 9 : 10, letterSpacing: 1, color: dark ? '#E8C9A0' : '#9A6B3F' }}>需 {LEVEL_NAMES[zone.requireLevel]}</span>}
                </span>
                {(isHovered || asked === zone.id) && (
                  <span style={{ position: 'absolute', right: 10, bottom: 8, fontSize: tall ? 10 : 11, letterSpacing: 1, padding: '2px 8px', borderRadius: 10, background: 'rgba(17,24,39,.72)', color: '#F9FAFB' }}>
                    {isOpen ? '坐下来 →' : loggedIn ? `还需到 ${LEVEL_NAMES[zone.requireLevel]}` : '请先登录'}
                  </span>
                )}
              </>
            )
            const events = { onMouseEnter: () => setHov(zone.id), onMouseLeave: () => setHov(null), onFocus: () => setHov(zone.id), onBlur: () => setHov(null) }
            return isOpen
              ? <Link key={zone.id} href={zone.href} style={style} aria-label={`${zone.name}，${zone.subtitle}`} {...events}>{inner}</Link>
              : <button key={zone.id} type="button" style={style} aria-label={`${zone.name}，${zone.subtitle}，${loggedIn ? '还需到' + LEVEL_NAMES[zone.requireLevel] : '请先登录'}`} onClick={() => setAsked(a => (a === zone.id ? null : zone.id))} {...events}>{inner}</button>
          })}
        </div>
      </div>

      <div className="text-center mt-6">
        <p style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px', lineHeight: 1.8 }}>
          每个角落都是一种安静。选一个位置坐下来，时间是你自己的。
        </p>
      </div>
    </div>
  )
}
