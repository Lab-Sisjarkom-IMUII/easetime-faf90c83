import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'EaseTime - Kelola Waktu Anda dengan AI',
        short_name: 'EaseTime',
        description: 'Aplikasi AI-based untuk manajemen waktu yang membantu Anda mengatur jadwal dengan lebih mudah dan efisien',
        theme_color: '#3B82F6',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Login',
            short_name: 'Login',
            description: 'Masuk ke akun EaseTime',
            url: '/auth/login',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Buka dashboard',
            url: '/dashboard',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude development files dari precaching
        globIgnores: ['**/node_modules/**/*', '**/dev-dist/**/*'],
        // Navigation fallback hanya untuk production
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // Tambahkan handler untuk file-file development (Vite HMR, dll)
          {
            urlPattern: /^http:\/\/localhost:5000\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dev-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 0 // No cache untuk dev
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        // Disable navigation fallback di dev mode
        navigateFallback: undefined,
        // Exclude file-file development dari service worker
        navigateFallbackDenylist: [
          /^\/_/,
          /\/[^/?]+\.[^/]+$/,
          /^\/src\/.*/,
          /^\/@react-refresh/,
          /^\/@vite\/client/,
          /^\/node_modules\/.*/
        ]
      }
    })
  ],
  server: {
    port: 5000,
  },
})
