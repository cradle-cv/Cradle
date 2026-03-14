// ================================================
// 灵感值 Hook - 前端统一调用接口
// 路径: lib/useInspiration.js
// ================================================
'use client'

import { useState, useCallback } from 'react'

export function useInspiration() {
  const [loading, setLoading] = useState(false)

  // 添加灵感值
  const addPoints = useCallback(async (userId, type, options = {}) => {
    setLoading(true)
    try {
      const resp = await fetch('/api/inspiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
          points: options.points,
          referenceId: options.referenceId,
          description: options.description,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error)
      return data
    } catch (err) {
      console.error('添加灵感值失败:', err)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // 每日签到
  const checkIn = useCallback(async (userId) => {
    setLoading(true)
    try {
      const resp = await fetch('/api/inspiration/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error)
      return data
    } catch (err) {
      console.error('签到失败:', err)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // 查询灵感值信息
  const getInfo = useCallback(async (userId) => {
    try {
      const resp = await fetch(`/api/inspiration?userId=${userId}`)
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error)
      return data
    } catch (err) {
      console.error('查询灵感值失败:', err)
      return { error: err.message }
    }
  }, [])

  // 消耗灵感值（发布作品等）
  const spendPoints = useCallback(async (userId, type, options = {}) => {
    setLoading(true)
    try {
      const resp = await fetch('/api/inspiration/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type, ...options }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error)
      return data
    } catch (err) {
      console.error('消耗灵感值失败:', err)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  return { addPoints, checkIn, getInfo, spendPoints, loading }
}