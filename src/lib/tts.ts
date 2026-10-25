import { callOverlayHandler } from '../ngld'
import { command, mojitoSource, setSourceStatus } from '../source'

export function speak(text: string) {
  if (mojitoSource) {
    void command('say', { text }).catch((error: unknown) => setSourceStatus('error', String(error)))
    return
  }
  void callOverlayHandler({
    call: 'say',
    text,
  })
}
