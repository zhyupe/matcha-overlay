import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
const pkg = require('./package.json')

const buildTime = Date.now() - new Date(2020, 0, 1).getTime()
export default defineConfig({
  define: {
    'process.env.build': `'${pkg.version}-${Math.floor(buildTime / 1000 / 60 / 60)}'`
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        map: 'map.html'
      }
    },
  }
})