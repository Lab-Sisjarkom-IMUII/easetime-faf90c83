import { useAuth } from '../contexts/AuthContext'

export const useSession = () => {
  const { user, session, profile, loading } = useAuth()

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
  }
}

