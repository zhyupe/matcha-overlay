import clsx from 'clsx'
import './index.scss'

export function Switch({
  value,
  onChange,
}: {
  value: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div
      className={clsx('switch', value && 'active')}
      onClick={() => onChange(!value)}
    ></div>
  )
}
