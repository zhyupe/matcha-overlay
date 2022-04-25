export interface EventData {
  event_category: string
  event_label: string
  value?: number
  debug_mode?: boolean
}

export function track(name: string, data?: EventData) {
  try {
    ;(window as any).gtag?.('event', name, data)
  } catch (e) {
    //
  }
}

export function trackVersion(type: string, value: string) {
  track('version', {
    event_category: type,
    event_label: value,
  })
}
