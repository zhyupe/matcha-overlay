import { callOverlayHandler } from '../ngld'

export function speak(text: string) {
  void callOverlayHandler({
    call: 'say',
    text,
  })
}
