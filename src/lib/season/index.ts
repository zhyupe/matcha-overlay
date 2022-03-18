import './mofish.scss'

const useAprilStyle = (() => {
  const now = new Date()
  return now.getMonth() + 1 === 4 && now.getDate() === 1
})()

export const getAppSeason = (): string => {
  if (useAprilStyle) {
    return ' app-season-mofish'
  }

  return ''
}

export const getAppIcon = (): string => {
  if (useAprilStyle) {
    return 'mofish'
  }

  return ''
}

export const getSeasonTitle = (short = false): string | null => {
  if (useAprilStyle) {
    return short ? 'Mofish' : '摸鱼 Mofish'
  }

  return null
}

export const getSeasonFooter = (): string | null => {
  if (useAprilStyle) {
    return " / Aprils' Special"
  }

  return null
}
