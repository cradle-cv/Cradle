'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

const MOOD_LABELS = {
  image_sleeping: { label: '💤 睡觉', desc: '贴在右侧边缘，闭眼呼吸状态' },
  image_awake:    { label: '😊 醒来', desc: '鼠标hover时，睁眼探出身体' },
  image_happy:    { label: '🎉 开心', desc: '收到明信片时，蹦跳状态' },
}

export default function AdminParallelPage() {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState(null)
  const fileRef = useRef(null)
  const uploadTarget = useRef(null) // { stageId, field }

  useEffect(() => { loadStages() }, [])

  async function loadStages() {
    const { data } = await supabase.from('parallel_stages').select('*').order('stage')
    setStages(data || [])
    setLoading(false)
  }

  function triggerUpload(stageId, field) {
    uploadTarget.current = { stageId, field }
    fileRef.current?.click()
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget.current) return
    const { stageId, field } = uploadTarget.current
    setUploadingKey(`${stageId}-${field}`)
    try {
      const { url } = await uploadImage(file, 'parallel-pet')
      await supabase.from('parallel_stages').update({
        [field]: url, updated_at: new Date().toISOString()
      }).eq('id', stageId)
      await loadStages()
    } catch (err) { alert('上传失败: ' + err.message) }
    finally {
      setUploadingKey(null)
      uploadTarget.current = null
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeImage(stageId, field) {
    if (!confirm('确定移除？')) return
    await supabase.from('parallel_stages').update({
      [field]: '', updated_at: new Date().toISOString()
    }).eq('id', stageId)
    await loadStages()
  }

  async function updateText(stageId, field, value) {
    await supabase.from('parallel_stages').update({
      [field]: value, updated_at: new Date().toISOString()
    }).eq('id', stageId)
  }

  if (loading) return <div className="flex items-center justify-center py-20" style={{ color: '#9CA3AF' }}>加载中...</div>

  const uploadedCount = stages.reduce((sum, s) => {
    return sum + (s.image_sleeping ? 1 : 0) + (s.image_awake ? 1 : 0) + (s.image_happy ? 1 : 0)
  }, 0)
  const totalSlots = stages.length * 3

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>🐾 平行体形象管理</h1>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          共 {stages.length} 个成长阶段 · 已上传 {uploadedCount}/{totalSlots} 张图片
        </p>
        <p className="text-xs mt-2 p-3 rounded-lg" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
          💡 每个阶段需要3张图片：睡觉（默认贴在右侧）、醒来（hover探出）、开心（收到明信片）。
          图片建议用透明背景PNG，尺寸约 80×120px，角色朝左（面向页面内容方向）。
        </p>
      </div>

      <div className="space-y-6">
        {stages.map(stage => {
          const stageColors = ['', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95']
          const color = stageColors[stage.stage] || '#7C3AED'

          return (
            <div key={stage.id} className="bg-white rounded-xl shadow-sm overflow-hidden"
              style={{ border: `2px solid ${color}30` }}>

              {/* 阶段头部 */}
              <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: color + '10' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ backgroundColor: color }}>
                    {stage.stage}
                  </div>
                  <div>
                    <input value={stage.name} onBlur={e => updateText(stage.id, 'name', e.target.value)}
                      onChange={e => setStages(prev => prev.map(s => s.id === stage.id ? { ...s, name: e.target.value } : s))}
                      className="font-bold bg-transparent border-none outline-none" style={{ color: '#111827', fontSize: '16px' }} />
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>解锁等级: Lv{stage.unlock_level}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {['image_sleeping', 'image_awake', 'image_happy'].map(field => (
                    <div key={field} className="w-4 h-4 rounded-full" style={{ backgroundColor: stage[field] ? '#10B981' : '#E5E7EB' }}
                      title={stage[field] ? '已上传' : '未上传'} />
                  ))}
                </div>
              </div>

              {/* 描述 */}
              <div className="px-6 py-2">
                <input value={stage.description || ''} onBlur={e => updateText(stage.id, 'description', e.target.value)}
                  onChange={e => setStages(prev => prev.map(s => s.id === stage.id ? { ...s, description: e.target.value } : s))}
                  className="w-full text-sm bg-transparent border-none outline-none" style={{ color: '#6B7280' }}
                  placeholder="输入阶段描述..." />
              </div>

              {/* 三个状态图片 */}
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                {Object.entries(MOOD_LABELS).map(([field, info]) => {
                  const imgUrl = stage[field]
                  const isUploading = uploadingKey === `${stage.id}-${field}`

                  return (
                    <div key={field}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium" style={{ color: '#374151' }}>{info.label}</span>
                      </div>
                      <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>{info.desc}</p>

                      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden flex items-center justify-center cursor-pointer group"
                        style={{ backgroundColor: '#F9FAFB', border: imgUrl ? '2px solid #D1D5DB' : '2px dashed #D1D5DB' }}
                        onClick={() => triggerUpload(stage.id, field)}>

                        {isUploading ? (
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>上传中...</span>
                        ) : imgUrl ? (
                          <>
                            <img src={imgUrl} alt={`${stage.name} ${info.label}`} className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <span className="text-white text-xs">换图</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <div className="text-2xl mb-1" style={{ color: '#D1D5DB' }}>+</div>
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>上传图片</span>
                          </div>
                        )}
                      </div>

                      {imgUrl && (
                        <button onClick={() => removeImage(stage.id, field)}
                          className="mt-1 text-xs hover:underline" style={{ color: '#EF4444' }}>移除</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 设计指南 */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold mb-3" style={{ color: '#111827' }}>📐 设计指南</h2>
        <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
            <p className="font-medium mb-1">图片规格</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              透明背景 PNG · 建议尺寸 160×240px（2倍图，实际显示80×120）· 角色面朝左方（面向页面内容）
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
            <p className="font-medium mb-1">睡觉状态</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              角色贴在右侧边缘，只露出左半边身体。闭眼、放松姿态。身体竖直，四肢可以抱住边缘。
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
            <p className="font-medium mb-1">醒来状态</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              角色向左探出更多身体（通过CSS位移实现），睁眼、好奇表情。建议比睡觉状态多露出一些身体。
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
            <p className="font-medium mb-1">开心状态</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              角色完全探出，张开双臂或跳跃姿态。用于收到梦境明信片时短暂播放。
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
            <p className="font-medium mb-1" style={{ color: '#92400E' }}>成长形态建议</p>
            <p className="text-xs" style={{ color: '#78350F' }}>
              阶段1-3：抽象形态（光点→轮廓→蛋），不需要具体的动物造型。
              阶段4-5：小动物初生和幼年，形体小巧可爱。
              阶段6-7：少年和成年，体型增大，细节更丰富，适合承载装饰和徽章。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}