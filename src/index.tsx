import { createRoot } from 'react-dom/client'
import './index.css'
import { StrictMode } from 'react'
import { RecoilRoot } from 'recoil'
import App from './app'
import { SeasonProvider } from './lib/season'
import { trackVersion } from './lib/track'

const build = process.env.build
trackVersion('overlay', build as string)

const container = document.getElementById('root')
const root = createRoot(container as HTMLDivElement)
root.render(
  <StrictMode>
    <RecoilRoot>
      <SeasonProvider>
        <App />
      </SeasonProvider>
    </RecoilRoot>
  </StrictMode>,
)
