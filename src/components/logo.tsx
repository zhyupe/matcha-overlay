import { useContext } from 'react'
import { SeasonContext } from '../lib/season'

export function Logo({ ...props }) {
  const { icon } = useContext(SeasonContext)

  if (!icon) {
    return null
  }

  const { type, value } = icon
  if (type === 'img') {
    return (
      <div className="logo">
        <img {...props} src={value} alt="" />
      </div>
    )
  }

  return (
    <div className="logo">
      <svg viewBox="0 0 400 400" {...props}>
        <path d={value} />
      </svg>
    </div>
  )
}
