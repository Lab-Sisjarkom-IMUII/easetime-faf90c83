import { motion } from 'framer-motion'
import { LogIn, Hourglass } from 'lucide-react'

const Navbar = () => {
  const menuItems = ['Features', 'How it Works', 'Contact']

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-white to-gray-50 rounded-lg flex items-center justify-center shadow-sm">
              <Hourglass className="text-blue-300" size={20} />
            </div>
            <span className="text-xl font-bold text-gray-900">EaseTime</span>
          </motion.div>

          {/* Menu Items - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                whileHover={{ scale: 1.05 }}
                className="text-gray-700 hover:text-primary-blue transition-colors cursor-pointer"
              >
                {item}
              </motion.a>
            ))}
          </div>

          {/* Login Button */}
          <motion.a
            href="/auth/login"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-300 text-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <LogIn size={18} />
            <span className="font-medium">Login</span>
          </motion.a>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar

