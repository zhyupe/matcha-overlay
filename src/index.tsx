import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app'
import { RecoilRoot } from 'recoil'
import { StrictMode } from 'react'
import { trackVersion } from './lib/track'

const build = process.env.build
trackVersion('overlay', build!)

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(
  <StrictMode>
    <RecoilRoot>
      <App />
    </RecoilRoot>
  </StrictMode>,
)
