import { adapter } from './adapter'

window.addEventListener('pagehide', () => adapter.dispose(), { once: true })
void adapter
  .prepare()
  .then(() => import('./render'))
  .catch(console.error)
