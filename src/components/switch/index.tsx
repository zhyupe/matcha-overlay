import cn from 'classnames'
import './index.scss'

export function Switch({ value, onChange }: { value: boolean; onChange: (val: boolean) => void }) {
  return <div className={cn('switch', value && 'active')} onClick={() => onChange(!value)}></div>
}
