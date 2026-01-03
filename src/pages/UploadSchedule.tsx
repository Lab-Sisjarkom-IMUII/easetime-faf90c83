import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import FileUpload from '../components/FileUpload'
import { scheduleApi } from '../lib/scheduleApi'

const UploadSchedule = () => {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debug: Log environment variable on mount
  useEffect(() => {
    const base64Url = import.meta.env.VITE_BASE64_API_URL
    console.log('🔍 Base64 API URL:', base64Url || 'NOT SET')
    console.log('🔍 Current origin:', window.location.origin)
    
    if (!base64Url || base64Url === 'https://your-base64-backend.com/api') {
      console.warn('⚠️ VITE_BASE64_API_URL belum dikonfigurasi dengan benar!')
    }
  }, [])

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Pilih file terlebih dahulu')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const result = await scheduleApi.uploadAndScan(file)

      if (!result.success) {
        setError(result.error || 'Gagal mengunggah dan menganalisis file')
        setUploading(false)
        return
      }

      // Simpan hasil ke sessionStorage untuk halaman review
      sessionStorage.setItem(
        'scannedSchedules',
        JSON.stringify(result.schedules || [])
      )
      sessionStorage.setItem('uploadFileId', result.fileId || '')
      sessionStorage.setItem('uploadFileUrl', result.fileUrl || '')

      // Navigate ke halaman review
      navigate('/schedule/review')
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
          type="button"
        >
          <ArrowLeft size={20} />
          <span>Kembali ke Dashboard</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-3xl shadow-2xl border border-blue-100 overflow-hidden"
        >
          {/* Header dengan gradient */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white p-8 md:p-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Upload className="text-white" size={40} />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-center mb-3">
              Upload & Scan Jadwal
            </h1>
            <p className="text-blue-100 text-center text-lg">
              Unggah file jadwal Anda dan biarkan AI mengekstrak informasinya secara otomatis
            </p>
          </div>

          <div className="p-8 md:p-12">

            {/* File Upload */}
            <div className="mb-8">
              <FileUpload
                onFileSelect={handleFileSelect}
                disabled={uploading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 mb-1">Error:</p>
                    <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Upload Button */}
            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`
                  px-10 py-4 rounded-xl font-semibold text-white text-lg
                  transition-all duration-300 flex items-center space-x-3
                  transform hover:scale-105 active:scale-95
                  ${
                    !file || uploading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-2xl'
                  }
                `}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    <span>Memproses dengan AI...</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} />
                    <span>Upload & Scan Sekarang</span>
                  </>
                )}
              </button>
            </div>

            {/* Info */}
            <div className="mt-10 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
              <h3 className="font-bold text-blue-900 mb-3 text-lg">
                📋 Format yang didukung:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 text-center">
                  <span className="text-2xl mb-2 block">📄</span>
                  <span className="text-sm font-medium text-gray-700">PDF</span>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <span className="text-2xl mb-2 block">🖼️</span>
                  <span className="text-sm font-medium text-gray-700">JPG/PNG</span>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <span className="text-2xl mb-2 block">📝</span>
                  <span className="text-sm font-medium text-gray-700">DOCX</span>
                </div>
              </div>
              <p className="text-sm text-blue-800">
                ✨ AI akan mengekstrak informasi jadwal seperti tanggal, waktu, lokasi, dan judul acara dari dokumen Anda secara otomatis.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default UploadSchedule

