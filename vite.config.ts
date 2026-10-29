import 'dotenv/config'
import { defineConfig } from 'vite'
import { existsSync, readFileSync } from 'fs'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const mockLogs = existsSync('./.dev.logs') ? readFileSync('./.dev.logs', 'utf-8') : null

const buildTime = Date.now() - new Date(2020, 0, 1).getTime()
export default defineConfig(({ mode }) => ({
  base: '',
  define: {
    'process.env.build': `'${pkg.version}-${Math.floor(buildTime / 1000 / 60 / 60)}'`,
    'process.env.MOCK_LOGS': JSON.stringify(mockLogs)
  },
  plugins: [
    tailwindcss(),
    ...(mode === 'mojito' ? [{
      name: 'mojito-html',
      transformIndexHtml(html: string) {
        return html.replace(/<script[^>]*src="https:\/\/www.googletagmanager.com[^>]*><\/script>/g, '').replace(/<script>\s*window\.dataLayer[\s\S]*?<\/script>/g, '')
      },
    }] : []),
  ],
  build: {
    assetsInlineLimit: mode === 'mojito' ? 0 : 4096,
    rolldownOptions: {
      checks: {
        moduleLevelDirective: false,
      },
      input: {
        main: 'index.html',
        ...(mode === 'mojito' ? {} : { map: 'map.html' }),
      },
    },
  },
}))
