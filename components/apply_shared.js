'use client'

import { useState } from 'react'

// ═══ 文件上传小组件(调用你现有的 /api/upload) ═══
export function FileUploadField({ label, required, accept, maxSizeMB = 20, folder, value, onChange, hint }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`文件过大,超过 ${maxSizeMB}MB`)
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (folder) fd.append('folder', folder)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '上传失败')
      }
      const { url } = await res.json()
      onChange({ url, name: file.name, size: file.size, type: file.type })
    } catch (e) {
      setError(e.message || '上传失败,请重试')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeFile() {
    onChange(null)
    setError('')
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
        {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
      </label>

      {/* 持久提示 - 无论文件是否已上传都显示 */}
      {hint && (
        <p className="text-xs mb-2" style={{ color: '#6B7280', lineHeight: 1.7 }}>
          {hint}
        </p>
      )}

      {!value && (
        <label
          className="flex items-center justify-center cursor-pointer transition hover:opacity-80"
          style={{
            padding: '20px',
            border: '1.5px dashed #D1D5DB',
            borderRadius: '10px',
            backgroundColor: '#FAFAFA',
            minHeight: '90px',
            flexDirection: 'column',
          }}>
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          <span style={{ color: uploading ? '#9CA3AF' : '#374151', fontSize: '13px' }}>
            {uploading ? '上传中…' : '点击选择文件'}
          </span>
        </label>
      )}

      {value && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg"
          style={{ backgroundColor: '#F3F4F6', border: '0.5px solid #E5E7EB' }}
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate" style={{ color: '#111827' }}>{value.name || '已上传'}</div>
            {value.size && (
              <div className="text-xs" style={{ color: '#9CA3AF' }}>
                {(value.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded"
            style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
            预览
          </a>
          <button
            type="button"
            onClick={removeFile}
            className="text-xs px-3 py-1.5 rounded"
            style={{ color: '#DC2626', border: '0.5px solid #FECACA' }}>
            移除
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs mt-2" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  )
}

// ═══ 文本输入 ═══
export function TextInput({ label, required, value, onChange, placeholder, maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
        {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-4 py-3 rounded-xl border outline-none"
        style={{ borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' }}
      />
      {maxLength && (
        <p className="text-xs mt-1 text-right" style={{ color: '#9CA3AF' }}>
          {(value || '').length} / {maxLength}
        </p>
      )}
    </div>
  )
}

// ═══ 文本域 ═══
export function TextArea({ label, required, value, onChange, placeholder, rows = 5, maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
        {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full px-4 py-3 rounded-xl border outline-none resize-y"
        style={{ borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF', lineHeight: 1.8 }}
      />
      {maxLength && (
        <p className="text-xs mt-1 text-right" style={{ color: '#9CA3AF' }}>
          {(value || '').length} / {maxLength}
        </p>
      )}
    </div>
  )
}

// ═══ URL 列表 (可动态增删) ═══
export function UrlListField({ label, values, onChange, placeholder = 'https://...', maxItems = 5 }) {
  function updateAt(i, val) {
    const next = [...values]
    next[i] = val
    onChange(next)
  }
  function addOne() {
    if (values.length >= maxItems) return
    onChange([...values, ''])
  }
  function removeAt(i) {
    const next = values.filter((_, idx) => idx !== i)
    onChange(next.length === 0 ? [''] : next)
  }
  const safeValues = values.length === 0 ? [''] : values

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>{label}</label>
      <div className="space-y-2">
        {safeValues.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="url"
              value={v}
              onChange={e => updateAt(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-4 py-2.5 rounded-xl border outline-none"
              style={{ borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' }}
            />
            {safeValues.length > 1 && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="px-3 rounded-xl text-sm"
                style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {safeValues.length < maxItems && (
        <button
          type="button"
          onClick={addOne}
          className="text-xs mt-2"
          style={{ color: '#6B7280' }}>
          + 添加一个链接
        </button>
      )}
    </div>
  )
}

// ═══ 按钮 ═══
export function PrimaryButton({ children, onClick, disabled, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-3.5 rounded-xl font-medium text-white transition"
      style={{
        backgroundColor: disabled || loading ? '#9CA3AF' : '#111827',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
      }}>
      {loading ? '提交中…' : children}
    </button>
  )
}

// ═══ 草稿保存 hook ═══
export function useDraft(key, defaultValues) {
  const [form, setFormRaw] = useState(() => {
    if (typeof window === 'undefined') return defaultValues
    try {
      const saved = localStorage.getItem(key)
      if (saved) return { ...defaultValues, ...JSON.parse(saved) }
    } catch (e) {}
    return defaultValues
  })

  function setForm(updater) {
    setFormRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch (e) {}
      return next
    })
  }

  function clearDraft() {
    try { localStorage.removeItem(key) } catch (e) {}
  }

  return [form, setForm, clearDraft]
}
