import cn from 'classnames'
import './index.scss'

export interface RadioItem<T> {
  value: T
  label: string
}

export function RadioGroup<T>({
  value,
  onChange,
  data,
}: {
  value: T
  onChange: (val: T) => void
  data: RadioItem<T>[]
}) {
  return (
    <div className="radio-group">
      {data.map((item) => (
        <button
          key={`${item.value}`}
          className={cn(item.value === value && 'active')}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
