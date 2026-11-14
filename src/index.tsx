import { adapter } from './adapter'

const root = document.getElementById('root')

window.addEventListener('pagehide', () => adapter.dispose(), { once: true })
void adapter
  .prepare()
  .then(() => import('./render'))
  .catch((error) => {
    console.error(error)
    if (root) root.textContent = '数据源连接失败，请重新加载。'
  })
