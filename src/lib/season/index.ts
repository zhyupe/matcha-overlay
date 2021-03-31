import './cocoa.scss'

const now = new Date()
export const getAppSeason = (): string => {
  if (now.getMonth() + 1 === 4 && now.getDate() === 1) {
    return ' app-season-cocoa'
  }

  return ''
}

export const getSeasonTitle = (short = false): string | null => {
  if (now.getMonth() + 1 === 4 && now.getDate() === 1) {
    return short ? 'Cocoa' : '可可 Cocoa'
  }

  return null
}

export const getSeasonFooter = (): string | null => {
  if (now.getMonth() + 1 === 4 && now.getDate() === 1) {
    return " / Aprils' Special"
  }

  return null
}
