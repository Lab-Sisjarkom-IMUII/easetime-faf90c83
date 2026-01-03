import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, username?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingProfileRef = useRef(false) // Ref untuk cegah multiple calls (synchronous)
  const previousUserIdRef = useRef<string | null>(null) // Ref untuk simpan previous user ID
  const profileCacheRef = useRef<Profile | null>(null) // Cache profile untuk cegah fetch berulang

  const fetchProfile = async (userId: string) => {
    // Cegah multiple calls dengan ref (synchronous check)
    if (fetchingProfileRef.current) {
      console.log('Profile fetch already in progress, skipping...')
      return
    }

    // Cek cache - jika profile sudah ada untuk user ini, skip fetch
    if (profileCacheRef.current?.id === userId) {
      console.log('Profile already cached, using cache')
      setProfile(profileCacheRef.current)
      setLoading(false)
      return
    }

    // Set flag SEBELUM async operation (synchronous)
    fetchingProfileRef.current = true

    try {
      console.log('Fetching profile for user:', userId)
      
      // Tambahkan timeout untuk memastikan tidak hang selamanya
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      )
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error fetching profile:', error)
        setProfile(null)
        profileCacheRef.current = null
      } else {
        console.log('Profile fetched:', data)
        const profileData = data || null
        setProfile(profileData)
        profileCacheRef.current = profileData // Cache profile
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error)
      setProfile(null)
      profileCacheRef.current = null
    } finally {
      fetchingProfileRef.current = false
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    let initialSessionLoaded = false // Flag untuk cegah double fetch dari getSession dan onAuthStateChange

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return
      
      if (error) {
        console.error('Error getting session:', error)
        setLoading(false)
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        initialSessionLoaded = true
        previousUserIdRef.current = session.user.id
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        profileCacheRef.current = null
        setLoading(false)
      }
    }).catch((error) => {
      if (!mounted) return
      console.error('Error in getSession:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      
      const previousUserId = previousUserIdRef.current
      const currentUserId = session?.user?.id || null
      
      // Skip jika ini initial load yang sudah di-handle oleh getSession
      if (initialSessionLoaded && previousUserId === currentUserId && currentUserId !== null) {
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Hanya fetch jika user berbeda
        if (previousUserId !== currentUserId) {
          setLoading(true)
          previousUserIdRef.current = currentUserId
          await fetchProfile(session.user.id)
        } else {
          // User sama, gunakan cache jika ada
          if (profileCacheRef.current) {
            setProfile(profileCacheRef.current)
          }
          setLoading(false)
        }
      } else {
        setProfile(null)
        profileCacheRef.current = null
        previousUserIdRef.current = null
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        },
      },
    })

    if (!error && data.user) {
      // Create profile after signup
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: username || email.split('@')[0],
        provider: 'email',
      })

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    return { error }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // Jika berhasil, update session dan user langsung
    if (!error && data.session) {
      setSession(data.session)
      setUser(data.user)
      if (data.user) {
        await fetchProfile(data.user.id)
      } else {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
    
    return { error }
  }

  const signInWithGoogle = async () => {
    // Hardcode production URL
    const PRODUCTION_URL = 'https://ease-time-cursor-3.vercel.app'
    
    // Deteksi apakah di production
    const isProduction = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('netlify.app')
    
    // Selalu gunakan production URL jika di production
    const baseUrl = isProduction ? PRODUCTION_URL : window.location.origin
    const redirectUrl = `${baseUrl}/auth/callback`
    
    console.log('OAuth redirect URL:', redirectUrl) // Debug
    console.log('Is Production:', isProduction) // Debug
    console.log('Current URL:', window.location.href) // Debug
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })
    if (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const resetPassword = async (email: string) => {
    // Hardcode production URL untuk konsistensi
    const PRODUCTION_URL = 'https://ease-time-cursor-3.vercel.app'
    
    // Deteksi apakah di production
    const isProduction = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('netlify.app')
    
    // Selalu gunakan production URL jika di production
    const baseUrl = isProduction ? PRODUCTION_URL : window.location.origin
    const redirectUrl = `${baseUrl}/auth/reset-password`
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })
    return { error }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: { message: 'No user logged in' } }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (!error) {
      await fetchProfile(user.id)
    }

    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

