// Base64 Backend as a Service Client
// Menggunakan Supabase Storage + OpenAI API langsung

import { supabase } from './supabase'

// Lazy load pdfjs-dist hanya saat diperlukan (untuk PDF)
let pdfjsLib: any = null

// Setup pdf.js worker (lazy)
const setupPdfWorker = async () => {
  if (typeof window === 'undefined') return
  
  try {
    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist')
    }
    
    // Gunakan worker lokal dari public folder
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
  } catch (error) {
    console.error('Failed to setup PDF worker:', error)
  }
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export interface Base64Response<T> {
  success: boolean
  data?: T
  error?: string
}

export class Base64Client {
  constructor() {
    // Validasi OpenAI API Key
    if (!OPENAI_API_KEY) {
      console.warn('⚠️ VITE_OPENAI_API_KEY belum di-set!')
      console.warn('⚠️ Silakan tambahkan VITE_OPENAI_API_KEY di file .env')
    } else {
      console.log('✅ OpenAI API Key configured')
    }
  }

  async uploadFile(file: File): Promise<Base64Response<{ fileId: string; fileUrl: string }>> {
    try {
      // Upload langsung ke Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `schedules/${fileName}`

      console.log('📤 Uploading file to Supabase Storage...', file.name)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('schedule-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        return {
          success: false,
          error: uploadError.message || 'Failed to upload file to storage',
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('schedule-files')
        .getPublicUrl(filePath)

      console.log('✅ File uploaded successfully:', urlData.publicUrl)

      return {
        success: true,
        data: {
          fileId: uploadData.path,
          fileUrl: urlData.publicUrl,
        },
      }
    } catch (error: any) {
      console.error('❌ Upload exception:', error)
      return {
        success: false,
        error: error.message || 'Network error during upload',
      }
    }
  }

  async invokeLLM(prompt: string, fileId?: string): Promise<Base64Response<any>> {
    try {
      if (!OPENAI_API_KEY) {
        return {
          success: false,
          error: 'OpenAI API key tidak dikonfigurasi. Silakan set VITE_OPENAI_API_KEY di file .env',
        }
      }

      // Jika fileId ada, download file dari storage
      let fileContent = ''
      let fileType = ''
      let fileBlob: Blob | null = null
      let fileName = ''
      
      if (fileId) {
        console.log('📥 Downloading file from storage:', fileId)
        
        const { data, error } = await supabase.storage
          .from('schedule-files')
          .download(fileId)

        if (error) {
          console.warn('⚠️ Could not download file:', error.message)
        } else if (data) {
          fileType = data.type || ''
          fileBlob = data
          fileName = fileId.split('/').pop() || fileId
          
          // Untuk file text, baca sebagai text
          if (data.type?.includes('text') || data.type?.includes('json') || data.type?.includes('plain')) {
            fileContent = await data.text()
            console.log('✅ File content extracted as text:', fileContent.substring(0, 200))
          } else {
            console.log('ℹ️ File type:', data.type)
          }
        }
      }

      console.log('🤖 Calling OpenAI API...')

      // Deteksi file type
      const isImage = fileType?.includes('image') || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      const isPDF = fileType?.includes('pdf') || fileName.match(/\.pdf$/i)
      
      if (isImage && fileBlob) {
        // Vision API untuk image (PNG, JPG, dll)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1]
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(fileBlob!)
        })

        console.log('🖼️ Using Vision API for image')

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: prompt,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${fileType};base64,${base64}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.3,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('❌ OpenAI API error:', data)
          return {
            success: false,
            error: data.error?.message || 'OpenAI API error',
          }
        }

        const responseText = data.choices[0]?.message?.content || '[]'
        console.log('✅ OpenAI Vision response received')
        console.log('📄 Response preview:', responseText.substring(0, 500))

        return {
          success: true,
          data: responseText,
        }
      } else if (isPDF && fileBlob) {
        // Convert PDF ke image menggunakan pdf.js
        console.log('📄 Converting PDF to image...')
        
        try {
          // Setup worker dan load pdfjs-dist jika belum
          await setupPdfWorker()
          
          if (!pdfjsLib) {
            throw new Error('Failed to load pdfjs-dist library')
          }
          
          // Convert blob ke array buffer
          const arrayBuffer = await fileBlob.arrayBuffer()
          
          // Load PDF
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
          const pdf = await loadingTask.promise
          
          console.log('📄 PDF loaded, pages:', pdf.numPages)
          
          // Render halaman pertama ke canvas
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 2.0 }) // Scale untuk kualitas lebih baik
          
          // Create canvas
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          if (!context) {
            throw new Error('Could not get canvas context')
          }
          
          // Render PDF page ke canvas
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise
          
          // Convert canvas ke base64
          const base64 = canvas.toDataURL('image/png').split(',')[1]
          
          console.log('✅ PDF converted to image, using Vision API')

          // Kirim ke Vision API
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: prompt,
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/png;base64,${base64}`,
                      },
                    },
                  ],
                },
              ],
              temperature: 0.3,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            console.error('❌ OpenAI API error:', data)
            return {
              success: false,
              error: data.error?.message || 'OpenAI API error',
            }
          }

          const responseText = data.choices[0]?.message?.content || '[]'
          console.log('✅ OpenAI Vision response received for PDF')
          console.log('📄 Response preview:', responseText.substring(0, 500))

          return {
            success: true,
            data: responseText,
          }
        } catch (pdfError: any) {
          console.error('❌ PDF conversion error:', pdfError)
          return {
            success: false,
            error: `Failed to process PDF: ${pdfError.message}. Pastikan file PDF tidak corrupt.`,
          }
        }
      } else {
        // Untuk file text atau tanpa file, gunakan text API biasa
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: prompt + (fileContent ? `\n\nFile content:\n${fileContent}` : ''),
              },
            ],
            temperature: 0.3,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('❌ OpenAI API error:', data)
          return {
            success: false,
            error: data.error?.message || 'OpenAI API error',
          }
        }

        const responseText = data.choices[0]?.message?.content || '[]'
        console.log('✅ OpenAI response received')
        console.log('📄 Response preview:', responseText.substring(0, 500))

        return {
          success: true,
          data: responseText,
        }
      }
    } catch (error: any) {
      console.error('❌ LLM invoke exception:', error)
      return {
        success: false,
        error: error.message || 'Network error during LLM call',
      }
    }
  }
}

export const base64Client = new Base64Client()
