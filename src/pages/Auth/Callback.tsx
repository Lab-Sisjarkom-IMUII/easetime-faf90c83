import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Tunggu session ter-load dengan benar
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          navigate('/auth/login?error=auth_failed', { replace: true })
          return
        }

        if (data.session) {
          // Check if profile exists, create if not (for OAuth users)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single()

          if (!profile && profileError?.code === 'PGRST116') {
            // PGRST116 = no rows returned, create profile
            const provider = data.session.user.app_metadata?.provider || 'google'
            const { error: insertError } = await supabase.from('profiles').insert({
              id: data.session.user.id,
              username: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
              provider: provider,
              google_id: data.session.user.user_metadata?.sub || null,
            })
            
            if (insertError) {
              console.error('Error creating profile:', insertError)
              // Continue anyway, profile can be created later
            }
          }

          // Tunggu sebentar untuk memastikan session ter-sync dengan AuthContext
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Gunakan navigate instead of window.location.href untuk menghindari full page reload
          // Ini memastikan React Router dan AuthContext tetap ter-sync
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/auth/login', { replace: true })
        }
      } catch (error) {
        console.error('Error in auth callback:', error)
        navigate('/auth/login?error=auth_failed', { replace: true })
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Memproses autentikasi...</p>
      </div>
    </div>
  )
}

export default AuthCallback

