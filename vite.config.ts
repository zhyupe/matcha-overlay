import 'dotenv/config'
import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const buildTime = Date.now() - new Date(2020, 0, 1).getTime()
export default defineConfig({
  define: {
    'process.env.build': `'${pkg.version}-${Math.floor(buildTime / 1000 / 60 / 60)}'`,
    'process.env.POST_MOOGLE_API': `'${process.env.POST_MOOGLE_API}'`,
    'process.env.POST_MOOGLE_NATS': `'${process.env.POST_MOOGLE_NATS}'`,
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        map: 'map.html',
      },
    },
  },
  esbuild: {
    jsxInject: 'import React from "react"',
  },
})
