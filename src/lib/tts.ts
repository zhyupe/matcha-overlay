import { adapter } from '../adapter'

export function speak(text: string) {
  void adapter.speak(text).catch(console.error)
}
