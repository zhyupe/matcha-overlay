import { useContext } from 'react'
import { useImageUrl } from '../lib/image'
import { SeasonContext } from '../lib/season'

export function Logo({ ...props }) {
  const { icon } = useContext(SeasonContext)
  const image = useImageUrl(icon?.type === 'img' ? icon.value : undefined)

  if (!icon) {
    return null
  }

  const { type, value } = icon
  if (type === 'img') {
    return (
      <div className="logo">
        <img {...props} src={image} alt="" />
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
