import './methane.scss'

const useAprilStyle = (() => {
  const now = new Date()
  return now.getMonth() + 1 === 4 && now.getDate() === 1
})()

export const getAppSeason = (): string => {
  if (useAprilStyle) {
    return ' app-season-methane'
  }

  return ''
}

export const getAppIcon = (): string => {
  if (useAprilStyle) {
    return 'methane'
  }

  return ''
}

export const getSeasonTitle = (short = false): string | null => {
  if (useAprilStyle) {
    return short ? 'Methane Egg' : '甲烷矿蛋'
  }

  return null
}

export const getSeasonFooter = (): string | null => {
  if (useAprilStyle) {
    return " / Aprils' Special"
  }

  return null
}
