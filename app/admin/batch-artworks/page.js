'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import * as XLSX from 'xlsx'

export default function AdminBatchArtworksPage() {
  const [activeTab, setActiveTab] = useState('artworks')
  const fileRef = useRef(null)
  const imgRef = useRef(null)

  // 数据
  const [artists, setArtists] = useState([])
  const [collections, setCollections] = useState([])
  const [artworks, setArtworks] = useState([])
  const [tags, setTags] = useState([])

  // Excel导入
  const [parsedArtworks, setParsedArtworks] = useState([])
  const [parsedCollections, setParsedCollections] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [presetArtist, setPresetArtist] = useState('')
  const [presetCollection, setPresetCollection] = useState('')

  // 批量图片上传
  const [uploadFiles, setUploadFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadArtist, setUploadArtist] = useState('')
  const [uploadCollection, setUploadCollection] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadResult, setUploadResult] = useState(null)

  // 批量状态
  const [statusSelected, setStatusSelected] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState('all')

  // 批量标签
  const [tagSelected, setTagSelected] = useState(new Set())
  const [assignTag, setAssignTag] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [a, c, w, t] = await Promise.all([
      supabase.from('artists').select('id, display_name').order('display_name'),
      supabase.from('collections').select('id, title, artist_id').order('title'),
      supabase.from('artworks').select('id, title, image_url, status, artist_id, collection_id, category').order('created_at', { ascending: false }).limit(300),
      supabase.from('tags').select('id, name').order('name'),
    ])
    setArtists(a.data || [])
    setCollections(c.data || [])
    setArtworks(w.data || [])
    setTags(t.data || [])
  }

  // ========== 下载作品模板 ==========
  function downloadArtworksTemplate() {
    const wb = XLSX.utils.book_new()
    const headers = ['标题*', '描述', '图片URL', '分类', '媒介/材质', '尺寸', '年份', '价格', '是否出售(是/否)', '状态(draft/published)']
    const example = ['星空下的猫', '一幅描绘猫在星空下沉思的油画', '', '绘画', '布面油画', '60×80cm', '2024', '5000', '是', 'draft']
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, '作品导入')
    XLSX.writeFile(wb, 'cradle_批量作品模板.xlsx')
  }

  // ========== 下载作品集模板 ==========
  function downloadCollectionsTemplate() {
    const wb = XLSX.utils.book_new()
    const headers = ['标题*', '英文标题', '描述', '封面图URL', '分类', '状态(draft/published)']
    const example = ['星空系列', 'Starry Series', '以星空为主题的系列创作', '', '绘画', 'draft']
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 30 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, '作品集导入')
    XLSX.writeFile(wb, 'cradle_批量作品集模板.xlsx')
  }

  // ========== 解析作品Excel ==========
  function handleArtworksExcel(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
      setParsedArtworks(rows.slice(1).filter(r => r[0]).map(r => ({
        title: r[0] || '', description: r[1] || '', image_url: r[2] || '',
        category: r[3] || '', medium: r[4] || '', size: r[5] || '',
        year: r[6] || '', price: r[7] || '', is_for_sale: r[8] === '是' || r[8] === 'true',
        status: r[9] || 'draft',
      })))
      setImportResult(null)
    }
    reader.readAsBinaryString(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ========== 解析作品集Excel ==========
  function handleCollectionsExcel(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
      setParsedCollections(rows.slice(1).filter(r => r[0]).map(r => ({
        title: r[0] || '', title_en: r[1] || '', description: r[2] || '',
        cover_image: r[3] || '', category: r[4] || '', status: r[5] || 'draft',
      })))
      setImportResult(null)
    }
    reader.readAsBinaryString(file)
  }

  // ========== 导入作品 ==========
  async function importArtworks() {
    if (parsedArtworks.length === 0) return
    setImporting(true); setImportResult(null)
    const results = { success: 0, failed: 0, errors: [] }
    for (let i = 0; i < parsedArtworks.length; i++) {
      const w = parsedArtworks[i]
      try {
        const { error } = await supabase.from('artworks').insert({
          title: w.title.trim(), description: w.description?.trim() || null,
          image_url: w.image_url?.trim() || null, category: w.category?.trim() || null,
          medium: w.medium?.trim() || null, size: w.size?.trim() || null,
          year: parseInt(w.year) || null, price: parseFloat(w.price) || null,
          is_for_sale: w.is_for_sale || false, status: w.status || 'draft',
          artist_id: presetArtist || null, collection_id: presetCollection || null,
        })
        if (error) throw error
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push({ row: i + 2, title: w.title, error: err.message })
      }
    }
    setImportResult(results)
    if (results.success > 0) loadAll()
    setImporting(false)
  }

  // ========== 导入作品集 ==========
  async function importCollections() {
    if (parsedCollections.length === 0) return
    setImporting(true); setImportResult(null)
    const results = { success: 0, failed: 0, errors: [] }
    for (let i = 0; i < parsedCollections.length; i++) {
      const c = parsedCollections[i]
      try {
        const { error } = await supabase.from('collections').insert({
          title: c.title.trim(), title_en: c.title_en?.trim() || null,
          description: c.description?.trim() || null, cover_image: c.cover_image?.trim() || null,
          category: c.category?.trim() || null, status: c.status || 'draft',
          artist_id: presetArtist || null,
        })
        if (error) throw error
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push({ row: i + 2, title: c.title, error: err.message })
      }
    }
    setImportResult(results)
    if (results.success > 0) loadAll()
    setImporting(false)
  }

  // ========== 批量图片上传 ==========
  function handleImageSelect(e) {
    setUploadFiles(Array.from(e.target.files || []))
    setUploadResult(null)
  }

  async function handleBatchUpload() {
    if (uploadFiles.length === 0) return
    setUploading(true); setUploadProgress(0); setUploadResult(null)
    const results = { success: 0, failed: 0 }
    for (let i = 0; i < uploadFiles.length; i++) {
      try {
        const { url } = await uploadImage(uploadFiles[i], 'artworks')
        const title = uploadFiles[i].name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        const insertData = { title, image_url: url, status: 'draft' }
        if (uploadArtist) insertData.artist_id = uploadArtist
        if (uploadCollection) insertData.collection_id = uploadCollection
        if (uploadCategory) insertData.category = uploadCategory
        const { error } = await supabase.from('artworks').insert(insertData)
        if (error) throw error
        results.success++
      } catch (err) { results.failed++; results.lastError = err.message || JSON.stringify(err) }
      setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100))
    }
    setUploadResult(results)
    if (results.success > 0) loadAll()
    setUploading(false); setUploadFiles([])
    if (imgRef.current) imgRef.current.value = ''
  }

  // ========== 批量状态 ==========
  async function handleBatchStatus(newStatus) {
    if (statusSelected.size === 0) return
    if (!confirm(`将 ${statusSelected.size} 个作品设为「${newStatus === 'published' ? '发布' : newStatus === 'draft' ? '草稿' : '删除'}」？`)) return
    if (newStatus === 'delete') {
      const { error } = await supabase.from('artworks').delete().in('id', Array.from(statusSelected))
      if (error) { alert('删除失败: ' + error.message); return }
    } else {
      const { error } = await supabase.from('artworks').update({ status: newStatus }).in('id', Array.from(statusSelected))
      if (error) { alert('更新失败: ' + error.message); return }
    }
    alert(`✅ 已处理 ${statusSelected.size} 个作品`)
    setStatusSelected(new Set()); loadAll()
  }

  // ========== 批量标签 ==========
  async function handleAssignTags() {
    if (tagSelected.size === 0 || !assignTag) { alert('请选择作品和标签'); return }
    let ok = 0
    for (const artworkId of tagSelected) {
      try {
        await supabase.from('artwork_tags').upsert(
          { artwork_id: artworkId, tag_id: assignTag },
          { onConflict: 'artwork_id,tag_id' }
        )
        ok++
      } catch (e) {}
    }
    alert(`✅ 已为 ${ok} 个作品添加标签`)
    setTagSelected(new Set())
  }

  const filteredWorks = artworks.filter(w => statusFilter === 'all' || w.status === statusFilter)
  const inputCls = "w-full px-3 py-2 border rounded-lg text-sm text-gray-900"

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>⚡ 批量作品管理</h1>
      <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>批量导入作品/作品集、上传图片、管理状态和标签</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'artworks', label: '🎨 导入作品' },
          { key: 'collections', label: '📚 导入作品集' },
          { key: 'images', label: '📸 批量上传图片' },
          { key: 'status', label: '📋 状态管理' },
          { key: 'tags', label: '🏷️ 分配标签' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition"
            style={{ backgroundColor: activeTab === t.key ? '#111827' : '#F3F4F6', color: activeTab === t.key ? '#FFF' : '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ========== 导入作品 ========== */}
      {activeTab === 'artworks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold" style={{ color: '#111827' }}>🎨 批量导入作品（artworks表）</h2>
              <button onClick={downloadArtworksTemplate} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>📥 下载模板</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>预设艺术家</label>
                <select value={presetArtist} onChange={e => setPresetArtist(e.target.value)} className={inputCls} style={{ borderColor: '#D1D5DB' }}>
                  <option value="">不关联</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>预设作品集</label>
                <select value={presetCollection} onChange={e => setPresetCollection(e.target.value)} className={inputCls} style={{ borderColor: '#D1D5DB' }}>
                  <option value="">不关联</option>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            </div>

            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleArtworksExcel} className="hidden" />
            <div className="flex items-center gap-4">
              <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>📄 选择Excel</button>
              {parsedArtworks.length > 0 && <span className="text-sm font-medium" style={{ color: '#059669' }}>✅ {parsedArtworks.length} 条</span>}
            </div>
          </div>

          {parsedArtworks.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <span className="text-sm font-medium" style={{ color: '#111827' }}>预览 {parsedArtworks.length} 条</span>
                <button onClick={importArtworks} disabled={importing} className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#7C3AED' }}>
                  {importing ? '导入中...' : '🚀 确认导入'}
                </button>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                    {['#', '标题', '分类', '媒介', '年份', '价格', '出售', '状态'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{parsedArtworks.map((w, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-4 py-2 text-xs" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                      <td className="px-4 py-2 font-medium" style={{ color: '#111827' }}>{w.title}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.category || '—'}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.medium || '—'}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.year || '—'}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.price || '—'}</td>
                      <td className="px-4 py-2 text-xs">{w.is_for_sale ? '✅' : '—'}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.status}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {importResult && <ResultBanner result={importResult} />}
        </div>
      )}

      {/* ========== 导入作品集 ========== */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold" style={{ color: '#111827' }}>📚 批量导入作品集（collections表）</h2>
              <button onClick={downloadCollectionsTemplate} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>📥 下载模板</button>
            </div>
            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>预设艺术家</label>
              <select value={presetArtist} onChange={e => setPresetArtist(e.target.value)} className={inputCls} style={{ borderColor: '#D1D5DB', maxWidth: 300 }}>
                <option value="">不关联</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
              </select>
            </div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleCollectionsExcel} className="hidden" id="colFile" />
            <div className="flex items-center gap-4">
              <button onClick={() => document.getElementById('colFile')?.click()} className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>📄 选择Excel</button>
              {parsedCollections.length > 0 && <span className="text-sm font-medium" style={{ color: '#059669' }}>✅ {parsedCollections.length} 条</span>}
            </div>
          </div>

          {parsedCollections.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <span className="text-sm font-medium" style={{ color: '#111827' }}>预览 {parsedCollections.length} 条</span>
                <button onClick={importCollections} disabled={importing} className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#7C3AED' }}>
                  {importing ? '导入中...' : '🚀 确认导入'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                    {['#', '标题', '英文标题', '分类', '状态'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{parsedCollections.map((c, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-4 py-2 text-xs" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                      <td className="px-4 py-2 font-medium" style={{ color: '#111827' }}>{c.title}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{c.title_en || '—'}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{c.category || '—'}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{c.status}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {importResult && <ResultBanner result={importResult} />}
        </div>
      )}

      {/* ========== 批量上传图片 ========== */}
      {activeTab === 'images' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-2" style={{ color: '#111827' }}>📸 批量上传图片自动创建作品</h2>
          <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>选择多张图片，每张自动创建一个草稿作品，标题取自文件名。</p>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>关联艺术家</label>
              <select value={uploadArtist} onChange={e => setUploadArtist(e.target.value)} className={inputCls} style={{ borderColor: '#D1D5DB' }}>
                <option value="">不关联</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>关联作品集</label>
              <select value={uploadCollection} onChange={e => setUploadCollection(e.target.value)} className={inputCls} style={{ borderColor: '#D1D5DB' }}>
                <option value="">不关联</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>分类</label>
              <input value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className={inputCls} style={{ borderColor: '#D1D5DB' }} placeholder="绘画" />
            </div>
          </div>

          <input ref={imgRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => imgRef.current?.click()} className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>🖼️ 选择图片（可多选）</button>
            {uploadFiles.length > 0 && <span className="text-sm" style={{ color: '#059669' }}>已选 {uploadFiles.length} 张</span>}
          </div>

          {uploadFiles.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {uploadFiles.slice(0, 20).map((f, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {uploadFiles.length > 20 && <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>+{uploadFiles.length - 20}</div>}
              </div>
              <button onClick={handleBatchUpload} disabled={uploading} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#7C3AED' }}>
                {uploading ? `上传中 ${uploadProgress}%` : `🚀 上传并创建 ${uploadFiles.length} 个作品`}
              </button>
              {uploading && (
                <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, backgroundColor: '#7C3AED' }} />
                </div>
              )}
            </div>
          )}

          {uploadResult && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7' }}>
              <p className="text-sm" style={{ color: uploadResult.failed > 0 ? '#DC2626' : '#059669' }}>
  {uploadResult.success > 0 && `✅ 成功 ${uploadResult.success} 个 `}
  {uploadResult.failed > 0 && `❌ 失败 ${uploadResult.failed} 个`}
  {uploadResult.lastError && <><br/>错误: {uploadResult.lastError}</>}
</p>
            </div>
          )}
        </div>
      )}

      {/* ========== 批量状态管理 ========== */}
      {activeTab === 'status' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ color: '#111827' }}>📋 批量状态管理</h2>
            <div className="flex items-center gap-3">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                <option value="all">全部 ({artworks.length})</option>
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>已选 {statusSelected.size}</span>
              <button onClick={() => handleBatchStatus('published')} disabled={statusSelected.size === 0} className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#059669' }}>✅ 批量发布</button>
              <button onClick={() => handleBatchStatus('draft')} disabled={statusSelected.size === 0} className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#6B7280' }}>📥 批量下架</button>
              <button onClick={() => handleBatchStatus('delete')} disabled={statusSelected.size === 0} className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#EF4444' }}>🗑️ 批量删除</button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="px-4 py-2 text-left text-xs sticky top-0 bg-gray-50"><input type="checkbox" onChange={e => setStatusSelected(e.target.checked ? new Set(filteredWorks.map(w => w.id)) : new Set())} /></th>
                <th className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>作品</th>
                <th className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>分类</th>
                <th className="px-4 py-2 text-center text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>状态</th>
              </tr></thead>
              <tbody>{filteredWorks.map(w => (
                <tr key={w.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                  <td className="px-4 py-2"><input type="checkbox" checked={statusSelected.has(w.id)} onChange={() => { const n = new Set(statusSelected); n.has(w.id) ? n.delete(w.id) : n.add(w.id); setStatusSelected(n) }} /></td>
                  <td className="px-4 py-2"><div className="flex items-center gap-2">{w.image_url ? <img src={w.image_url} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded" style={{ backgroundColor: '#F3F4F6' }} />}<span className="font-medium" style={{ color: '#111827' }}>{w.title}</span></div></td>
                  <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.category || '—'}</td>
                  <td className="px-4 py-2 text-center"><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: w.status === 'published' ? '#ECFDF5' : '#F3F4F6', color: w.status === 'published' ? '#059669' : '#9CA3AF' }}>{w.status === 'published' ? '已发布' : '草稿'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== 批量标签 ========== */}
      {activeTab === 'tags' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ color: '#111827' }}>🏷️ 批量分配标签</h2>
            <div className="flex items-center gap-3">
              <select value={assignTag} onChange={e => setAssignTag(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                <option value="">选择标签</option>
                {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>已选 {tagSelected.size}</span>
              <button onClick={handleAssignTags} disabled={tagSelected.size === 0 || !assignTag} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#7C3AED' }}>🏷️ 添加标签</button>
            </div>
          </div>
          {tags.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: '#9CA3AF' }}>暂无标签，请先在标签管理页面创建标签</p>
          )}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="px-4 py-2 text-left text-xs sticky top-0 bg-gray-50"><input type="checkbox" onChange={e => setTagSelected(e.target.checked ? new Set(artworks.map(w => w.id)) : new Set())} /></th>
                <th className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>作品</th>
                <th className="px-4 py-2 text-left text-xs font-medium sticky top-0 bg-gray-50" style={{ color: '#6B7280' }}>分类</th>
              </tr></thead>
              <tbody>{artworks.map(w => (
                <tr key={w.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                  <td className="px-4 py-2"><input type="checkbox" checked={tagSelected.has(w.id)} onChange={() => { const n = new Set(tagSelected); n.has(w.id) ? n.delete(w.id) : n.add(w.id); setTagSelected(n) }} /></td>
                  <td className="px-4 py-2"><div className="flex items-center gap-2">{w.image_url ? <img src={w.image_url} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded" style={{ backgroundColor: '#F3F4F6' }} />}<span className="font-medium" style={{ color: '#111827' }}>{w.title}</span></div></td>
                  <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>{w.category || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultBanner({ result }) {
  return (
    <div className="p-4 rounded-xl" style={{
      backgroundColor: result.error ? '#FEF2F2' : result.failed > 0 ? '#FEF3C7' : '#ECFDF5',
      border: `1px solid ${result.error ? '#FCA5A5' : result.failed > 0 ? '#FCD34D' : '#6EE7B7'}`
    }}>
      {result.error ? (
        <p className="text-sm" style={{ color: '#DC2626' }}>❌ {result.error}</p>
      ) : (
        <>
          <p className="text-sm font-medium" style={{ color: '#111827' }}>✅ 成功 {result.success} 条 {result.failed > 0 && `· ❌ 失败 ${result.failed} 条`}</p>
          {result.errors?.length > 0 && <div className="mt-2 space-y-1">{result.errors.map((e, i) => (
            <p key={i} className="text-xs" style={{ color: '#DC2626' }}>第{e.row}行「{e.title}」: {e.error}</p>
          ))}</div>}
        </>
      )}
    </div>
  )
}