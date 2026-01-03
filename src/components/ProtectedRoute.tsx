import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useSession()
  const [timeoutReached, setTimeoutReached] = useState(false)

  // Timeout fallback: jika loading lebih dari 5 detik, anggap ada masalah
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('Loading timeout reached, forcing state update')
        setTimeoutReached(true)
      }, 5000)

      return () => clearTimeout(timer)
    } else {
      setTimeoutReached(false)
    }
  }, [loading])

  // Jika timeout atau loading terlalu lama, coba render children jika authenticated
  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Jika timeout tapi authenticated, render children (fallback)
  if (timeoutReached && isAuthenticated) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}

