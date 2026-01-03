import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { notificationService } from './services/notificationService'
import LandingPage from './pages/LandingPage/LandingPage'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import AuthCallback from './pages/Auth/Callback'
import Dashboard from './pages/Dashboard/Dashboard'
import UploadSchedule from './pages/UploadSchedule'
import ReviewSchedule from './pages/ReviewSchedule'
import SchedulesByCategory from './pages/SchedulesByCategory'
import ChatbotPage from './pages/ChatbotPage/ChatbotPage'
import RecommendationsPage from './pages/RecommendationsPage/RecommendationsPage'
import AllSchedulesPage from './pages/AllSchedules/AllSchedulesPage'

function App() {
  // Request notification permission on app load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      notificationService.checkPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('✅ Notification permission granted')
        } else {
          console.log('⚠️ Notification permission denied')
        }
      })
    }
  }, [])
  return (
    <AuthProvider>
      <BrowserRouter>
        <PWAInstallPrompt />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule/upload"
            element={
              <ProtectedRoute>
                <UploadSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule/review"
            element={
              <ProtectedRoute>
                <ReviewSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedules/category"
            element={
              <ProtectedRoute>
                <SchedulesByCategory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedules/all"
            element={
              <ProtectedRoute>
                <AllSchedulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <ChatbotPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <RecommendationsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
