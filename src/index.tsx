import { prepareSource } from './source'

void prepareSource().then(() => import('./render')).catch(console.error)
