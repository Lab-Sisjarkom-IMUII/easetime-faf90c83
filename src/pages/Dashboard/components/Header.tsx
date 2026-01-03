import { useState } from 'react'
import { User, LogOut, Settings, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../../contexts/AuthContext'
import { useSession } from '../../../hooks/useSession'

const Header = () => {
  const { user } = useSession()
  const { signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-50 bg-blue-50/95 backdrop-blur-lg border-b border-blue-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              EaseTime
            </h1>
          </div>

          {/* Right Side: Notifications & User Menu */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-blue-100 rounded-lg transition-colors"
                aria-label="Notifications"
                type="button"
              >
                <Bell className="text-gray-600" size={20} />
                {/* Notification Badge */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-80 bg-blue-50 rounded-xl shadow-lg border border-blue-200 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-blue-200">
                      <h3 className="text-sm font-semibold text-gray-900">Notifikasi</h3>
                    </div>
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      Tidak ada notifikasi baru
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 hover:bg-blue-100 rounded-lg transition-colors"
                aria-label="User menu"
                type="button"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                  <User className="text-white" size={16} />
                </div>
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-blue-50 rounded-xl shadow-lg border border-blue-200 py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-blue-200">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        // Navigate to settings if exists
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 flex items-center space-x-2"
                      type="button"
                    >
                      <Settings size={16} />
                      <span>Pengaturan</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      type="button"
                    >
                      <LogOut size={16} />
                      <span>Keluar</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

