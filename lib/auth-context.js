'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useRouter, usePathname } from 'next/navigation'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 登录页不需要检查（这个应该不会被调用，因为 layout 已经过滤了）
    if (pathname === '/admin') {
      setLoading(false)
      return
    }

    checkAuth()
  }, [pathname])

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/admin')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (!userData) {
        router.push('/admin')
        return
      }

      setUser(session.user)
      setUserData(userData)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}