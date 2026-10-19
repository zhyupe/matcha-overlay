import 'dotenv/config'
import { defineConfig } from 'vite'
import { existsSync, readFileSync } from 'fs'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const mockLogs = existsSync('./.dev.logs') ? readFileSync('./.dev.logs', 'utf-8') : null

const buildTime = Date.now() - new Date(2020, 0, 1).getTime()
export default defineConfig({
  base: '',
  define: {
    'process.env.build': `'${pkg.version}-${Math.floor(buildTime / 1000 / 60 / 60)}'`,
    'process.env.MOCK_LOGS': JSON.stringify(mockLogs)
  },
  plugins: [
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      checks: {
        moduleLevelDirective: false,
      },
      input: {
        main: 'index.html',
        map: 'map.html',
      },
    },
  },
})
