const showDebugLogs = ['localhost', '127.0.0.1'].includes(window.location.hostname)
export function debug(...args: any[]) {
  showDebugLogs && console.log(...args)
}
