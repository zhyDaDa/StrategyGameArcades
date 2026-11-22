import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const UMAMI_ORIGIN = 'https://umami.zhydada.com'
const UMAMI_WEBSITE_ID = '6790549c-87ba-4429-a363-8d883eed34de'
const UMAMI_SCRIPTS = ['script.js', 'recorder.js'] as const

/** 统计脚本只进入构建产物，开发服务器不加载，避免污染线上数据。 */
function umamiPlugin(): Plugin {
  return {
    name: 'inject-umami',
    apply: 'build',
    transformIndexHtml: () =>
      UMAMI_SCRIPTS.map((file) => ({
        tag: 'script',
        attrs: {
          defer: true,
          src: `${UMAMI_ORIGIN}/${file}`,
          'data-website-id': UMAMI_WEBSITE_ID,
        },
        injectTo: 'head' as const,
      })),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), umamiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 发布脚本会传入同一次构建的时间，保证底栏时间与服务器版本号一致。
  define: {
    __BUILD_TIME__: JSON.stringify(process.env.BUILD_TIME ?? new Date().toISOString()),
  },
})