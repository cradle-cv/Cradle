'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import * as XLSX from 'xlsx'

export default function AdminBatchPage() {
  const [activeTab, setActiveTab] = useState('import')
  const fileRef = useRef(null)

  // Excel导入状态
  const [parsedData, setParsedData] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [presetMuseum, setPresetMuseum] = useState('')
  const [presetArtist, setPresetArtist] = useState('')
  const [museums, setMuseums] = useState([])
  const [galleryArtists, setGalleryArtists] = useState([])

  // AI生成状态
  const [works, setWorks] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [generating, setGenerating] = useState(false)
  const [generateType, setGenerateType] = useState('rike')
  const [generateResult, setGenerateResult] = useState(null)

  // 批量状态管理
  const [statusWorks, setStatusWorks] = useState([])
  const [statusSelected, setStatusSelected] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadMuseumsAndArtists(); loadWorks() }, [])

  async function loadMuseumsAndArtists() {
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

  // ========== Excel模板下载 ==========
  function downloadTemplate() {
    const headers = [
      '作品标题*', '英文标题', '艺术家', '艺术家英文名', '创作年份', '媒介/材质',
      '尺寸', '收藏地点', '作品简介', '封面图URL', '艺术家头像URL',
      '积分', '状态(draft/published)', '谜题内容', '日课内容'
    ]
    const example = [
      '星月夜', 'The Starry Night', '文森特·梵高', 'Vincent van Gogh', '1889', '布面油画',
      '73.7cm × 92.1cm', '纽约现代艺术博物馆', '梵高最具代表性的作品之一...', '', '',
      '50', 'draft', '', ''
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    // 设置列宽
    ws['!cols'] = headers.map((h, i) => ({ wch: i === 8 || i >= 13 ? 40 : 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '作品导入模板')
    XLSX.writeFile(wb, 'cradle_作品导入模板.xlsx')
  }

  // ========== Excel解析 ==========
  function handleExcelUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      if (rows.length < 2) { alert('Excel中没有数据行'); return }

      const headers = rows[0]
      const data = rows.slice(1).filter(row => row.some(cell => cell)).map(row => ({
        title: row[0] || '',
        title_en: row[1] || '',
        artist_name: row[2] || '',
        artist_name_en: row[3] || '',
        year: row[4] || '',
        medium: row[5] || '',
        dimensions: row[6] || '',
        collection_location: row[7] || '',
        description: row[8] || '',
        cover_image: row[9] || '',
        artist_avatar: row[10] || '',
        total_points: row[11] || 50,
        status: row[12] || 'draft',
        puzzle_content: row[13] || '',
        rike_content: row[14] || '',
      }))
      setParsedData(data)
      setImportResult(null)
    }
    reader.readAsBinaryString(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ========== 批量导入 ==========
  async function handleImport() {
    if (parsedData.length === 0) return
    setImporting(true)
    setImportResult(null)
    try {
      const resp = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_works',
          works: parsedData.map(w => ({
            ...w,
            museum_id: presetMuseum || null,
            gallery_artist_id: presetArtist || null,
          })),
        })
      })
      const result = await resp.json()
      setImportResult(result)
      if (result.success > 0) loadWorks()
    } catch (err) { setImportResult({ error: err.message }) }
    finally { setImporting(false) }
  }

  // ========== 批量封面上传 ==========
  async function handleBatchImages(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // 按文件名匹配已解析的数据
    for (let i = 0; i < files.length && i < parsedData.length; i++) {
      try {
        const { url } = await uploadImage(files[i], 'gallery')
        setParsedData(prev => prev.map((w, idx) => idx === i ? { ...w, cover_image: url } : w))
      } catch (err) { console.error(`第${i + 1}张上传失败`, err) }
    }
  }

  // ========== AI批量生成 ==========
  async function handleAiGenerate() {
    if (selectedIds.size === 0) { alert('请先勾选作品'); return }
    setGenerating(true)
    setGenerateResult(null)
    try {
      const resp = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai_generate',
          workIds: Array.from(selectedIds),
          generateType,
        })
      })
      const result = await resp.json()
      setGenerateResult(result)
      if (result.success > 0) loadWorks()
    } catch (err) { setGenerateResult({ error: err.message }) }
    finally { setGenerating(false) }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function selectAll() {
    const filtered = works.filter(w => generateType === 'puzzle' ? !w.puzzle_article_id : !w.rike_article_id)
    setSelectedIds(new Set(filtered.map(w => w.id)))
  }

  // ========== 批量状态管理 ==========
  async function handleBatchStatus(newStatus) {
    if (statusSelected.size === 0) { alert('请先勾选作品'); return }
    if (!confirm(`确定将 ${statusSelected.size} 个作品设为「${newStatus === 'published' ? '发布' : '草稿'}」？`)) return
    try {
      const resp = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_status',
          ids: Array.from(statusSelected),
          status: newStatus,
          table: 'gallery_works',
        })
      })
      const result = await resp.json()
      if (result.success) {
        alert(`✅ 已更新 ${result.updated} 个作品`)
        setStatusSelected(new Set())
        loadWorks()
      }
    } catch (err) { alert('操作失败: ' + err.message) }
  }

  function toggleStatusSelect(id) {
    setStatusSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const filteredStatusWorks = statusWorks.filter(w => statusFilter === 'all' || w.status === statusFilter)

  const tabs = [
    { key: 'import', label: '📥 Excel导入', desc: '批量导入作品' },
    { key: 'ai', label: '🤖 AI生成', desc: '批量生成谜题/日课' },
    { key: 'status', label: '📋 状态管理', desc: '批量发布/下架' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>⚡ 批量管理</h1>
      <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>快速导入、生成、管理平台内容</p>

      {/* Tab */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-5 py-3 rounded-xl text-sm font-medium transition"
            style={{
              backgroundColor: activeTab === t.key ? '#111827' : '#F3F4F6',
              color: activeTab === t.key ? '#FFFFFF' : '#6B7280',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ========== Excel导入 ========== */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* 步骤1: 下载模板 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-3" style={{ color: '#111827' }}>步骤1: 下载模板 → 填写数据</h2>
            <button onClick={downloadTemplate}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>
              📥 下载Excel模板
            </button>
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
              下载模板后填写作品信息，第一行为标题行不要改。带 * 号的列必填。封面图URL可以留空，后续批量上传图片。
            </p>
          </div>

          {/* 步骤2: 预设关联 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-3" style={{ color: '#111827' }}>步骤2: 预设关联（可选）</h2>
            <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>如果这批作品都属于同一个博物馆/艺术家，可以在这里预设</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>关联博物馆</label>
                <select value={presetMuseum} onChange={e => setPresetMuseum(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                  <option value="">不关联</option>
                  {museums.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>关联艺术家</label>
                <select value={presetArtist} onChange={e => setPresetArtist(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                  <option value="">不关联</option>
                  {galleryArtists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 步骤3: 上传Excel */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-3" style={{ color: '#111827' }}>步骤3: 上传Excel</h2>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
            <div className="flex items-center gap-4">
              <button onClick={() => fileRef.current?.click()}
                className="px-5 py-2.5 rounded-lg text-sm font-medium border transition hover:bg-gray-50"
                style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                📄 选择Excel文件
              </button>
              {parsedData.length > 0 && (
                <span className="text-sm font-medium" style={{ color: '#059669' }}>✅ 已解析 {parsedData.length} 条数据</span>
              )}
            </div>

            {/* 批量上传封面图（可选） */}
            {parsedData.length > 0 && (
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#F5F3FF' }}>
                <p className="text-xs mb-2" style={{ color: '#7C3AED' }}>💡 可选：批量上传封面图（按顺序对应每行数据）</p>
                <input type="file" accept="image/*" multiple onChange={handleBatchImages}
                  className="text-xs" style={{ color: '#6B7280' }} />
              </div>
            )}
          </div>

          {/* 预览表格 */}
          {parsedData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <h2 className="font-bold" style={{ color: '#111827' }}>预览（{parsedData.length} 条）</h2>
                <button onClick={handleImport} disabled={importing}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#7C3AED' }}>
                  {importing ? '导入中...' : `🚀 确认导入 ${parsedData.length} 条`}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>封面</th>
                      <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>标题</th>
                      <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>艺术家</th>
                      <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>年份</th>
                      <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>收藏地</th>
                      <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>谜题</th>
                      <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>日课</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((w, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-4 py-2 text-xs" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                        <td className="px-4 py-2">
                          {w.cover_image ? (
                            <img src={w.cover_image} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded flex items-center justify-center text-xs" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>无</div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-medium" style={{ color: '#111827' }}>{w.title || '—'}</span>
                          {w.title_en && <p className="text-xs" style={{ color: '#9CA3AF' }}>{w.title_en}</p>}
                        </td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#374151' }}>{w.artist_name || '—'}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.year || '—'}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.collection_location || '—'}</td>
                        <td className="px-4 py-2">{w.puzzle_content ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>有</span> : <span className="text-xs" style={{ color: '#D1D5DB' }}>无</span>}</td>
                        <td className="px-4 py-2">{w.rike_content ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>有</span> : <span className="text-xs" style={{ color: '#D1D5DB' }}>无</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 导入结果 */}
          {importResult && (
            <div className="p-5 rounded-xl" style={{
              backgroundColor: importResult.error ? '#FEF2F2' : importResult.failed > 0 ? '#FEF3C7' : '#ECFDF5',
              border: `1px solid ${importResult.error ? '#FCA5A5' : importResult.failed > 0 ? '#FCD34D' : '#6EE7B7'}`
            }}>
              {importResult.error ? (
                <p className="text-sm" style={{ color: '#DC2626' }}>❌ {importResult.error}</p>
              ) : (
                <>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>
                    ✅ 成功 {importResult.success} 条 {importResult.failed > 0 && `· ❌ 失败 ${importResult.failed} 条`}
                  </p>
                  {importResult.errors?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs" style={{ color: '#DC2626' }}>第{err.row}行「{err.title}」: {err.error}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== AI批量生成 ========== */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold" style={{ color: '#111827' }}>🤖 AI批量生成</h2>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>选择作品，AI自动生成谜题或日课内容</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={generateType} onChange={e => { setGenerateType(e.target.value); setSelectedIds(new Set()) }}
                  className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                  <option value="rike">📖 生成日课</option>
                  <option value="puzzle">🧩 生成谜题</option>
                </select>
                <button onClick={selectAll} className="px-3 py-2 rounded-lg text-xs border transition hover:bg-gray-50" style={{ color: '#6B7280', borderColor: '#D1D5DB' }}>
                  全选缺失的
                </button>
                <button onClick={handleAiGenerate} disabled={generating || selectedIds.size === 0}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#7C3AED' }}>
                  {generating ? '生成中...' : `🤖 生成 ${selectedIds.size} 个`}
                </button>
              </div>
            </div>

            {generateResult && (
              <div className="mb-4 p-3 rounded-lg" style={{
                backgroundColor: generateResult.error ? '#FEF2F2' : '#ECFDF5',
              }}>
                <p className="text-sm" style={{ color: generateResult.error ? '#DC2626' : '#059669' }}>
                  {generateResult.error || `✅ 成功 ${generateResult.success} 个 ${generateResult.failed > 0 ? `· 失败 ${generateResult.failed}` : ''}`}
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th className="px-4 py-2 text-left text-xs" style={{ color: '#6B7280' }}>
                      <input type="checkbox" onChange={e => e.target.checked ? selectAll() : setSelectedIds(new Set())} />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>作品</th>
                    <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>艺术家</th>
                    <th className="px-4 py-2 text-center text-xs font-medium" style={{ color: '#6B7280' }}>谜题</th>
                    <th className="px-4 py-2 text-center text-xs font-medium" style={{ color: '#6B7280' }}>日课</th>
                    <th className="px-4 py-2 text-center text-xs font-medium" style={{ color: '#6B7280' }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {works.map(w => (
                    <tr key={w.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={selectedIds.has(w.id)} onChange={() => toggleSelect(w.id)} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {w.cover_image ? <img src={w.cover_image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded" style={{ backgroundColor: '#F3F4F6' }} />}
                          <span className="font-medium" style={{ color: '#111827' }}>{w.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.artist_name || '—'}</td>
                      <td className="px-4 py-2 text-center">
                        {w.puzzle_article_id ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {w.rike_article_id ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          backgroundColor: w.status === 'published' ? '#ECFDF5' : '#F3F4F6',
                          color: w.status === 'published' ? '#059669' : '#9CA3AF',
                        }}>{w.status === 'published' ? '已发布' : '草稿'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========== 批量状态管理 ========== */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold" style={{ color: '#111827' }}>📋 批量状态管理</h2>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>勾选作品后一键发布或下架</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                  <option value="all">全部</option>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                </select>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>已选 {statusSelected.size} 个</span>
                <button onClick={() => handleBatchStatus('published')} disabled={statusSelected.size === 0}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#059669' }}>
                  ✅ 批量发布
                </button>
                <button onClick={() => handleBatchStatus('draft')} disabled={statusSelected.size === 0}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#6B7280' }}>
                  📥 批量下架
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th className="px-4 py-2 text-left text-xs" style={{ color: '#6B7280' }}>
                      <input type="checkbox" onChange={e => {
                        if (e.target.checked) setStatusSelected(new Set(filteredStatusWorks.map(w => w.id)))
                        else setStatusSelected(new Set())
                      }} />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>作品</th>
                    <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>艺术家</th>
                    <th className="px-4 py-2 text-center text-xs font-medium" style={{ color: '#6B7280' }}>当前状态</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatusWorks.map(w => (
                    <tr key={w.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={statusSelected.has(w.id)} onChange={() => toggleStatusSelect(w.id)} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {w.cover_image ? <img src={w.cover_image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded" style={{ backgroundColor: '#F3F4F6' }} />}
                          <span className="font-medium" style={{ color: '#111827' }}>{w.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.artist_name || '—'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          backgroundColor: w.status === 'published' ? '#ECFDF5' : '#F3F4F6',
                          color: w.status === 'published' ? '#059669' : '#9CA3AF',
                        }}>{w.status === 'published' ? '已发布' : '草稿'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}