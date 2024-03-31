import { getAppIcon } from '../lib/season'

export function Logo({ ...props }) {
  const { type, value } = getAppIcon()

  if (type === 'img') {
    return <img className="logo" {...props} src={value} alt="" />
  }

  return (
    <svg className="logo" viewBox="0 0 400 400" {...props}>
      <path d={value} />
    </svg>
  )
}
