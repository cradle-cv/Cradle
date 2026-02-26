'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const UserAuthContext = createContext({})

export function UserAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初始化检查
    checkSession()

    // 监听认证变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session) {
        await loadUserData(session.user.id)
      } else {
        setUserData(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
        await loadUserData(session.user.id)
      }
    } catch (error) {
      console.error('Session check error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUserData(authId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle()
    setUserData(data)
  }

  async function signUp({ email, password, username }) {
    // 1. Supabase Auth 注册
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    })
    if (authError) throw authError

    // 2. 创建 users 表记录
    if (authData.user) {
      const { error: userError } = await supabase.from('users').insert({
        auth_id: authData.user.id,
        email: email,
        username: username,
        role: 'user',
        total_points: 0,
        level: 1
      })
      if (userError) throw userError

      // 重新加载用户数据
      await loadUserData(authData.user.id)
    }

    return authData
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setUserData(null)
  }

  async function refreshUserData() {
    if (session) {
      await loadUserData(session.user.id)
    }
  }

  return (
    <UserAuthContext.Provider value={{
      session,
      userData,
      loading,
      signUp,
      signIn,
      signOut,
      refreshUserData,
      isLoggedIn: !!session && !!userData
    }}>
      {children}
    </UserAuthContext.Provider>
  )
}

export function useUserAuth() {
  return useContext(UserAuthContext)
}