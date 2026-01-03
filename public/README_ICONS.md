# PWA Icons

File icon saat ini menggunakan SVG placeholder. Untuk production, disarankan mengganti dengan icon PNG yang proper.

## Ukuran Icon yang Diperlukan

1. **pwa-192x192.png** - 192x192 pixels (untuk Android)
2. **pwa-512x512.png** - 512x512 pixels (untuk Android)
3. **apple-touch-icon.png** - 180x180 pixels (untuk iOS)
4. **favicon.ico** - 32x32 atau 16x16 pixels

## Cara Membuat Icon

1. Buat design icon dengan ukuran 512x512 pixels
2. Export ke berbagai ukuran yang diperlukan
3. Ganti file di folder `public/`
4. Update `vite.config.ts` untuk menggunakan PNG icons

## Tools untuk Membuat Icon

- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Figma](https://figma.com) atau design tool lainnya
