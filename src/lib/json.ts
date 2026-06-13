export function tryParseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
