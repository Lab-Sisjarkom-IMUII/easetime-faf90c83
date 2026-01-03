import { useState, useRef, DragEvent } from 'react'
import { Upload, File, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUploadState } from '../types/schedule'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  acceptedTypes?: string[]
  maxSizeMB?: number
  disabled?: boolean
}

const FileUpload = ({
  onFileSelect,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'],
  maxSizeMB = 10,
  disabled = false,
}: FileUploadProps) => {
  const [state, setState] = useState<FileUploadState>({
    file: null,
    uploading: false,
    uploadProgress: 0,
    error: null,
  })
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Accepted: ${acceptedTypes.join(', ')}`
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`
    }

    return null
  }

  const handleFile = (file: File) => {
    const error = validateFile(file)
    if (error) {
      setState(prev => ({ ...prev, error, file: null }))
      return
    }

    setState(prev => ({ ...prev, file, error: null }))
    onFileSelect(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setState({ file: null, uploading: false, uploadProgress: 0, error: null })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 sm:p-12
          transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-105'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <AnimatePresence mode="wait">
          {!state.file ? (
            <motion.div
              key="upload-prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="text-blue-600" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Jadwal Anda
              </h3>
              <p className="text-gray-600 mb-4">
                Drag & drop file di sini atau klik untuk memilih
              </p>
              <p className="text-sm text-gray-500">
                Format: {acceptedTypes.join(', ')} • Maks: {maxSizeMB}MB
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="file-selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200"
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <File className="text-blue-600" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {state.file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(state.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {!disabled && (
                <button
                  onClick={handleRemove}
                  className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-sm text-red-600">{state.error}</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default FileUpload

