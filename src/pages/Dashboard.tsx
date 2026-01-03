import { useSession } from '../hooks/useSession'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, User, Mail, Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  const { user, profile } = useSession()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-2xl shadow-lg border border-blue-100 p-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Selamat datang di EaseTime</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
            >
              <LogOut size={18} />
              <span>Keluar</span>
            </button>
          </div>

          {/* User Info */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-100">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-300 rounded-xl flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username || 'User'}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <User className="text-white" size={32} />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {profile?.username || user?.email?.split('@')[0] || 'User'}
                </h2>
                <div className="flex items-center space-x-2 mt-1 text-gray-600">
                  <Mail size={16} />
                  <span className="text-sm">{user?.email}</span>
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {profile?.provider || 'email'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Placeholder */}
          <div className="mt-8">
            <Link
              to="/schedule/upload"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all"
            >
              <Upload size={20} />
              <span>Upload & Scan Jadwal</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard

