export function getConfig(key: string, defaultValue?: string) {
  return window.localStorage.getItem(`config:${key}`) || defaultValue
}

export function setConfig(key: string, value: string) {
  return window.localStorage.setItem(`config:${key}`, value)
}
