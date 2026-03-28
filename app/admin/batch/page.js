'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import * as XLSX from 'xlsx'

export default function AdminBatchPage() {
  const [activeTab, setActiveTab] = useState('import')
  const fileRef = useRef(null)

  // Excel导入
  const [sheetData, setSheetData] = useState({ works: [], questions: [], rike: [], comments: [] })
  const [previewSheet, setPreviewSheet] = useState('works')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [presetMuseum, setPresetMuseum] = useState('')
  const [presetArtist, setPresetArtist] = useState('')
  const [museums, setMuseums] = useState([])
  const [galleryArtists, setGalleryArtists] = useState([])

  // AI生成
  const [works, setWorks] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [generating, setGenerating] = useState(false)
  const [generateType, setGenerateType] = useState('rike')
  const [generateResult, setGenerateResult] = useState(null)

  // 批量状态
  const [statusWorks, setStatusWorks] = useState([])
  const [statusSelected, setStatusSelected] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadRefs(); loadWorks() }, [])

  async function loadRefs() {
    const { data: m } = await supabase.from('museums').select('id, name').eq('status', 'active').order('name')
    setMuseums(m || [])
    const { data: a } = await supabase.from('gallery_artists').select('id, name').eq('status', 'active').order('name')
    setGalleryArtists(a || [])
  }

  async function loadWorks() {
    const { data } = await supabase.from('gallery_works')
      .select('id, title, artist_name, status, puzzle_article_id, rike_article_id, cover_image')
      .order('created_at', { ascending: false }).limit(200)
    setWorks(data || [])
    setStatusWorks(data || [])
  }

  // ========== 下载多Sheet模板 ==========
  function downloadTemplate() {
    const wb = XLSX.utils.book_new()

    // Sheet1: 作品信息
    const worksHeaders = ['作品标题*', '英文标题', '艺术家*', '艺术家英文名', '创作年份', '媒介/材质', '尺寸', '收藏地点', '作品简介', '封面图URL', '艺术家头像URL', '积分', '排序', '状态(draft/published)', '谜题文章标题', '谜题文章简介', '谜题文章正文']
    const worksExample = ['星月夜', 'The Starry Night', '文森特·梵高', 'Vincent van Gogh', '1889', '布面油画', '73.7cm × 92.1cm', '纽约现代艺术博物馆', '梵高最著名的作品之一，描绘了圣雷米精神病院窗外的夜景...', '', '', '50', '10', 'draft', '星月夜 - 谜题', '关于这幅画，你知道多少？', '《星月夜》创作于1889年6月...']
    const ws1 = XLSX.utils.aoa_to_sheet([worksHeaders, worksExample])
    ws1['!cols'] = worksHeaders.map((_, i) => ({ wch: [14, 16][i] > 8 ? [40, 40, 14, 18, 8, 12, 16, 18, 50, 30, 30, 6, 6, 14, 20, 40, 60][i] || 16 : 16 }))
    XLSX.utils.book_append_sheet(wb, ws1, '作品信息')

    // Sheet2: 谜题题目
    const qHeaders = ['关联作品标题*', '序号', '题目类型(单选/多选/判断)', '题目内容*', '选项A*', '选项B*', '选项C', '选项D', '正确答案*(如A或AB)', '答案解析', '分值']
    const qExample1 = ['星月夜', '1', '单选', '《星月夜》创作于哪一年？', '1885', '1889', '1890', '1895', 'B', '梵高于1889年6月在圣雷米精神病院创作了这幅画', '20']
    const qExample2 = ['星月夜', '2', '多选', '以下哪些元素出现在《星月夜》中？', '旋涡状星云', '柏树', '向日葵', '教堂尖塔', 'ABD', '画中有旋涡星云、柏树和远处的教堂尖塔，但没有向日葵', '20']
    const qExample3 = ['星月夜', '3', '判断', '《星月夜》是梵高在户外写生时完成的', '正确', '错误', '', '', 'B', '这幅画是梵高凭记忆在室内创作的，融合了想象与观察', '20']
    const ws2 = XLSX.utils.aoa_to_sheet([qHeaders, qExample1, qExample2, qExample3])
    ws2['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 16 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 50 }, { wch: 6 }]
    XLSX.utils.book_append_sheet(wb, ws2, '谜题题目')

    // Sheet3: 日课内容
    const rHeaders = ['关联作品标题*', '日课文章标题', '日课简介', '日课正文*']
    const rExample = ['星月夜', '星月夜 - 日课导读', '在旋涡与星光之间，感受梵高最炽烈的表达', '1889年6月的一个夜晚，文森特·梵高透过圣雷米疗养院的窗户...\n\n柏树如同黑色的火焰向天空升腾...\n\n那些旋转的星云并非科学观察的结果，而是梵高内心情感的外化...']
    const ws3 = XLSX.utils.aoa_to_sheet([rHeaders, rExample])
    ws3['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 40 }, { wch: 80 }]
    XLSX.utils.book_append_sheet(wb, ws3, '日课内容')

    // Sheet4: 风赏短评
    const cHeaders = ['关联作品标题*', '序号', '评论人*', '身份/头衔', '评价内容*', '评分(1-5)', '来源', '是否精选(是/否)']
    const cExample = ['星月夜', '1', '约翰·伯格', '艺术评论家', '梵高的星空不是他看到的天空，而是他感受到的天空。那些旋涡是情感的湍流。', '5', '《观看之道》', '是']
    const ws4 = XLSX.utils.aoa_to_sheet([cHeaders, cExample])
    ws4['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 60 }, { wch: 8 }, { wch: 24 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws4, '风赏短评')

    XLSX.writeFile(wb, 'cradle_完整导入模板.xlsx')
  }

  // ========== 解析多Sheet ==========
  function handleExcelUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const result = { works: [], questions: [], rike: [], comments: [] }

      // Sheet1: 作品信息
      if (wb.SheetNames[0]) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
        result.works = rows.slice(1).filter(r => r[0]).map(r => ({
          title: r[0] || '', title_en: r[1] || '', artist_name: r[2] || '', artist_name_en: r[3] || '',
          year: r[4] || '', medium: r[5] || '', dimensions: r[6] || '', collection_location: r[7] || '',
          description: r[8] || '', cover_image: r[9] || '', artist_avatar: r[10] || '',
          total_points: r[11] || 50, display_order: r[12] || '', status: r[13] || 'draft',
          puzzle_title: r[14] || '', puzzle_intro: r[15] || '', puzzle_content: r[16] || '',
        }))
      }

      // Sheet2: 谜题题目
      if (wb.SheetNames[1]) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]], { header: 1 })
        result.questions = rows.slice(1).filter(r => r[0] && r[3]).map(r => ({
          work_title: r[0] || '', order: r[1] || '', question_type: r[2] || '单选',
          question_text: r[3] || '', option_a: r[4] || '', option_b: r[5] || '',
          option_c: r[6] || '', option_d: r[7] || '', correct_answer: r[8] || '',
          explanation: r[9] || '', points: r[10] || 20,
        }))
      }

      // Sheet3: 日课内容
      if (wb.SheetNames[2]) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[2]], { header: 1 })
        result.rike = rows.slice(1).filter(r => r[0]).map(r => ({
          work_title: r[0] || '', title: r[1] || '', intro: r[2] || '', content: r[3] || '',
        }))
      }

      // Sheet4: 风赏短评
      if (wb.SheetNames[3]) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[3]], { header: 1 })
        result.comments = rows.slice(1).filter(r => r[0] && r[4]).map(r => ({
          work_title: r[0] || '', order: r[1] || '', author_name: r[2] || '',
          author_title: r[3] || '', content: r[4] || '', rating: r[5] || 5,
          source: r[6] || '', is_featured: r[7] || '',
        }))
      }

      setSheetData(result)
      setImportResult(null)
    }
    reader.readAsBinaryString(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ========== 导入 ==========
  async function handleImport() {
    if (sheetData.works.length === 0) { alert('没有作品数据'); return }
    setImporting(true); setImportResult(null)
    try {
      const resp = await fetch('/api/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_full',
          works: sheetData.works.map(w => ({ ...w, museum_id: presetMuseum || null, gallery_artist_id: presetArtist || null })),
          questions: sheetData.questions,
          rikeData: sheetData.rike,
          comments: sheetData.comments,
          museumId: presetMuseum || null,
          artistId: presetArtist || null,
        })
      })
      const result = await resp.json()
      setImportResult(result)
      if (result.worksOk > 0) loadWorks()
    } catch (err) { setImportResult({ error: err.message }) }
    finally { setImporting(false) }
  }

  const totalParsed = sheetData.works.length + sheetData.questions.length + sheetData.rike.length + sheetData.comments.length

  // ========== AI生成 ==========
  async function handleAiGenerate() {
    if (selectedIds.size === 0) return
    setGenerating(true); setGenerateResult(null)
    try {
      const resp = await fetch('/api/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_generate', workIds: Array.from(selectedIds), generateType })
      })
      setGenerateResult(await resp.json())
      loadWorks()
    } catch (err) { setGenerateResult({ error: err.message }) }
    finally { setGenerating(false) }
  }

  function toggleSelect(id) { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function selectAllMissing() {
    const filtered = works.filter(w => generateType === 'puzzle' ? !w.puzzle_article_id : !w.rike_article_id)
    setSelectedIds(new Set(filtered.map(w => w.id)))
  }

  // ========== 批量状态 ==========
  async function handleBatchStatus(newStatus) {
    if (statusSelected.size === 0) return
    if (!confirm(`将 ${statusSelected.size} 个作品设为「${newStatus === 'published' ? '发布' : '草稿'}」？`)) return
    const resp = await fetch('/api/batch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'batch_status', ids: Array.from(statusSelected), status: newStatus, table: 'gallery_works' })
    })
    const result = await resp.json()
    if (result.success) { alert(`✅ 已更新 ${result.updated} 个`); setStatusSelected(new Set()); loadWorks() }
  }

  function toggleStatusSelect(id) { setStatusSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  const filteredStatusWorks = statusWorks.filter(w => statusFilter === 'all' || w.status === statusFilter)

  const previewSheets = [
    { key: 'works', label: '作品', count: sheetData.works.length, icon: '🖼️' },
    { key: 'questions', label: '谜题', count: sheetData.questions.length, icon: '🧩' },
    { key: 'rike', label: '日课', count: sheetData.rike.length, icon: '📖' },
    { key: 'comments', label: '风赏', count: sheetData.comments.length, icon: '🎐' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>⚡ 批量管理</h1>
      <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>快速导入、生成、管理平台内容</p>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'import', label: '📥 Excel导入' },
          { key: 'ai', label: '🤖 AI生成' },
          { key: 'status', label: '📋 状态管理' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-5 py-3 rounded-xl text-sm font-medium transition"
            style={{ backgroundColor: activeTab === t.key ? '#111827' : '#F3F4F6', color: activeTab === t.key ? '#FFF' : '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ========== Excel导入 ========== */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* 步骤1 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-2" style={{ color: '#111827' }}>步骤1: 下载模板</h2>
            <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>模板含4个Sheet：作品信息、谜题题目、日课内容、风赏短评。每个Sheet都有示例行和完整的列说明。</p>
            <button onClick={downloadTemplate} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>
              📥 下载完整模板（4个Sheet）
            </button>
          </div>

          {/* 模板结构说明 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-3" style={{ color: '#111827' }}>模板结构说明</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
                <p className="font-medium text-sm mb-2" style={{ color: '#111827' }}>🖼️ Sheet1: 作品信息</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>标题*、英文标题、艺术家*、年份、媒介、尺寸、收藏地、简介、封面URL、头像URL、积分、状态、谜题文章标题/简介/正文</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F5F3FF' }}>
                <p className="font-medium text-sm mb-2" style={{ color: '#7C3AED' }}>🧩 Sheet2: 谜题题目</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>关联作品标题*、序号、题型（单选/多选/判断）、题目*、选项A-D、正确答案（如B或ABD）、解析、分值</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                <p className="font-medium text-sm mb-2" style={{ color: '#2563EB' }}>📖 Sheet3: 日课内容</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>关联作品标题*、日课标题、日课简介、日课正文*（支持换行，用回车分段）</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEF3C7' }}>
                <p className="font-medium text-sm mb-2" style={{ color: '#B45309' }}>🎐 Sheet4: 风赏短评</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>关联作品标题*、序号、评论人*、身份、内容*、评分(1-5)、来源、是否精选</p>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <p className="text-xs" style={{ color: '#92400E' }}>💡 关键：谜题/日课/风赏通过「关联作品标题」列和作品建立关系，请确保标题完全一致。一个作品可以有多道谜题和多条短评。</p>
            </div>
          </div>

          {/* 步骤2 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-3" style={{ color: '#111827' }}>步骤2: 预设关联（可选）</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>统一关联博物馆</label>
                <select value={presetMuseum} onChange={e => setPresetMuseum(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                  <option value="">不关联</option>
                  {museums.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>统一关联艺术家</label>
                <select value={presetArtist} onChange={e => setPresetArtist(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                  <option value="">不关联</option>
                  {galleryArtists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 步骤3 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-3" style={{ color: '#111827' }}>步骤3: 上传Excel</h2>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
            <div className="flex items-center gap-4">
              <button onClick={() => fileRef.current?.click()} className="px-5 py-2.5 rounded-lg text-sm font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>📄 选择Excel文件</button>
              {totalParsed > 0 && <span className="text-sm font-medium" style={{ color: '#059669' }}>✅ 已解析 {totalParsed} 条数据</span>}
            </div>
          </div>

          {/* 预览 */}
          {totalParsed > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <div className="flex items-center gap-2">
                  {previewSheets.map(s => (
                    <button key={s.key} onClick={() => setPreviewSheet(s.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      style={{
                        backgroundColor: previewSheet === s.key ? '#111827' : s.count > 0 ? '#ECFDF5' : '#F3F4F6',
                        color: previewSheet === s.key ? '#FFF' : s.count > 0 ? '#059669' : '#9CA3AF',
                      }}>
                      {s.icon} {s.label} ({s.count})
                    </button>
                  ))}
                </div>
                <button onClick={handleImport} disabled={importing}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#7C3AED' }}>
                  {importing ? '导入中...' : `🚀 确认导入`}
                </button>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                {/* 作品预览 */}
                {previewSheet === 'works' && (
                  <table className="w-full text-sm">
                    <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                      {['#', '标题', '艺术家', '年份', '收藏地', '谜题文章', '状态'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{sheetData.works.map((w, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-4 py-2 text-xs" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                        <td className="px-4 py-2"><span className="font-medium" style={{ color: '#111827' }}>{w.title}</span>{w.title_en && <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>{w.title_en}</span>}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#374151' }}>{w.artist_name || '—'}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.year || '—'}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.collection_location || '—'}</td>
                        <td className="px-4 py-2">{w.puzzle_content ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>有</span> : <span className="text-xs" style={{ color: '#D1D5DB' }}>无</span>}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.status}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}

                {/* 谜题预览 */}
                {previewSheet === 'questions' && (
                  <table className="w-full text-sm">
                    <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                      {['#', '关联作品', '题型', '题目', 'A', 'B', 'C', 'D', '正确答案', '解析'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{sheetData.questions.map((q, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-3 py-2 text-xs" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                        <td className="px-3 py-2 text-xs font-medium" style={{ color: '#7C3AED' }}>{q.work_title}</td>
                        <td className="px-3 py-2"><span className="text-xs px-1.5 py-0.5 rounded" style={{
                          backgroundColor: q.question_type === '多选' ? '#F5F3FF' : q.question_type === '判断' ? '#FEF3C7' : '#EFF6FF',
                          color: q.question_type === '多选' ? '#7C3AED' : q.question_type === '判断' ? '#B45309' : '#2563EB',
                        }}>{q.question_type}</span></td>
                        <td className="px-3 py-2 text-xs" style={{ color: '#111827', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question_text}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: '#374151' }}>{q.option_a || '—'}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: '#374151' }}>{q.option_b || '—'}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: '#374151' }}>{q.option_c || '—'}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: '#374151' }}>{q.option_d || '—'}</td>
                        <td className="px-3 py-2 text-xs font-bold" style={{ color: '#059669' }}>{q.correct_answer}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: '#6B7280', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.explanation || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}

                {/* 日课预览 */}
                {previewSheet === 'rike' && (
                  <table className="w-full text-sm">
                    <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                      {['#', '关联作品', '日课标题', '简介', '正文预览'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{sheetData.rike.map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-4 py-2 text-xs" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                        <td className="px-4 py-2 text-xs font-medium" style={{ color: '#2563EB' }}>{r.work_title}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#111827' }}>{r.title || '—'}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.intro || '—'}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#374151', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content?.substring(0, 80) || '—'}...</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}

                {/* 风赏预览 */}
                {previewSheet === 'comments' && (
                  <table className="w-full text-sm">
                    <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                      {['#', '关联作品', '评论人', '身份', '内容', '评分', '精选'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{sheetData.comments.map((c, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-4 py-2 text-xs" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                        <td className="px-4 py-2 text-xs font-medium" style={{ color: '#B45309' }}>{c.work_title}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#111827' }}>{c.author_name}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{c.author_title || '—'}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#374151', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.content}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#F59E0B' }}>{'★'.repeat(parseInt(c.rating) || 5)}</td>
                        <td className="px-4 py-2">{c.is_featured === '是' ? <span className="text-xs" style={{ color: '#059669' }}>✅</span> : ''}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 导入结果 */}
          {importResult && (
            <div className="p-5 rounded-xl" style={{ backgroundColor: importResult.error ? '#FEF2F2' : '#ECFDF5', border: `1px solid ${importResult.error ? '#FCA5A5' : '#6EE7B7'}` }}>
              {importResult.error ? (
                <p className="text-sm" style={{ color: '#DC2626' }}>❌ {importResult.error}</p>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: '#111827' }}>导入完成：</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span style={{ color: '#059669' }}>🖼️ 作品 {importResult.worksOk} 成功</span>
                    {importResult.worksFail > 0 && <span style={{ color: '#DC2626' }}>❌ {importResult.worksFail} 失败</span>}
                    <span style={{ color: '#7C3AED' }}>🧩 谜题 {importResult.questionsOk} 道</span>
                    <span style={{ color: '#2563EB' }}>📖 日课 {importResult.rikeOk} 篇</span>
                    <span style={{ color: '#B45309' }}>🎐 短评 {importResult.commentsOk} 条</span>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs" style={{ color: '#DC2626' }}>[{e.sheet} 第{e.row}行] {e.msg}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== AI批量生成 ========== */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold" style={{ color: '#111827' }}>🤖 AI批量生成</h2>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>选择作品，AI自动生成谜题或日课内容</p>
            </div>
            <div className="flex items-center gap-3">
              <select value={generateType} onChange={e => { setGenerateType(e.target.value); setSelectedIds(new Set()) }}
                className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                <option value="rike">📖 生成日课</option><option value="puzzle">🧩 生成谜题</option>
              </select>
              <button onClick={selectAllMissing} className="px-3 py-2 rounded-lg text-xs border hover:bg-gray-50" style={{ color: '#6B7280', borderColor: '#D1D5DB' }}>全选缺失的</button>
              <button onClick={handleAiGenerate} disabled={generating || selectedIds.size === 0}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#7C3AED' }}>
                {generating ? '生成中...' : `🤖 生成 ${selectedIds.size} 个`}
              </button>
            </div>
          </div>
          {generateResult && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: generateResult.error ? '#FEF2F2' : '#ECFDF5' }}>
              <p className="text-sm" style={{ color: generateResult.error ? '#DC2626' : '#059669' }}>
                {generateResult.error || `✅ 成功 ${generateResult.success} 个${generateResult.failed > 0 ? ` · 失败 ${generateResult.failed}` : ''}`}
              </p>
            </div>
          )}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="px-4 py-2 text-left text-xs sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}><input type="checkbox" onChange={e => e.target.checked ? selectAllMissing() : setSelectedIds(new Set())} /></th>
                <th className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>作品</th>
                <th className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>艺术家</th>
                <th className="px-4 py-2 text-center text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>谜题</th>
                <th className="px-4 py-2 text-center text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>日课</th>
              </tr></thead>
              <tbody>{works.map(w => (
                <tr key={w.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                  <td className="px-4 py-2"><input type="checkbox" checked={selectedIds.has(w.id)} onChange={() => toggleSelect(w.id)} /></td>
                  <td className="px-4 py-2"><div className="flex items-center gap-2">{w.cover_image ? <img src={w.cover_image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded" style={{ backgroundColor: '#F3F4F6' }} />}<span className="font-medium" style={{ color: '#111827' }}>{w.title}</span></div></td>
                  <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.artist_name || '—'}</td>
                  <td className="px-4 py-2 text-center">{w.puzzle_article_id ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                  <td className="px-4 py-2 text-center">{w.rike_article_id ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== 批量状态 ========== */}
      {activeTab === 'status' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ color: '#111827' }}>📋 批量状态管理</h2>
            <div className="flex items-center gap-3">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                <option value="all">全部</option><option value="draft">草稿</option><option value="published">已发布</option>
              </select>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>已选 {statusSelected.size}</span>
              <button onClick={() => handleBatchStatus('published')} disabled={statusSelected.size === 0} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#059669' }}>✅ 批量发布</button>
              <button onClick={() => handleBatchStatus('draft')} disabled={statusSelected.size === 0} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#6B7280' }}>📥 批量下架</button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="px-4 py-2 text-left text-xs sticky top-0 bg-gray-50"><input type="checkbox" onChange={e => { if (e.target.checked) setStatusSelected(new Set(filteredStatusWorks.map(w => w.id))); else setStatusSelected(new Set()) }} /></th>
                <th className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>作品</th>
                <th className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>艺术家</th>
                <th className="px-4 py-2 text-center text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>状态</th>
              </tr></thead>
              <tbody>{filteredStatusWorks.map(w => (
                <tr key={w.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                  <td className="px-4 py-2"><input type="checkbox" checked={statusSelected.has(w.id)} onChange={() => toggleStatusSelect(w.id)} /></td>
                  <td className="px-4 py-2"><div className="flex items-center gap-2">{w.cover_image ? <img src={w.cover_image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded" style={{ backgroundColor: '#F3F4F6' }} />}<span className="font-medium" style={{ color: '#111827' }}>{w.title}</span></div></td>
                  <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.artist_name || '—'}</td>
                  <td className="px-4 py-2 text-center"><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: w.status === 'published' ? '#ECFDF5' : '#F3F4F6', color: w.status === 'published' ? '#059669' : '#9CA3AF' }}>{w.status === 'published' ? '已发布' : '草稿'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}