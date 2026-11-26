import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const required = (name: string) => {
    const value = env[name]?.trim()
    if (!value) throw new Error(`${name} must be set`)
    return value
  }
  const name = required('VITE_APP_NAME')
  const themeColor = required('VITE_THEME_COLOR')
  const backgroundColor = required('VITE_BACKGROUND_COLOR')
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]!)

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'deployment-html-metadata',
        enforce: 'pre',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            return html
              .replaceAll('%VITE_APP_NAME%', escapeHtml(name))
              .replaceAll('%VITE_THEME_COLOR%', escapeHtml(themeColor))
          },
        },
      },
      VitePWA({
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name,
          short_name: name,
          description: name,
          theme_color: themeColor,
          background_color: backgroundColor,
          display: 'standalone',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2,webmanifest}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
