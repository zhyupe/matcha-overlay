import { useEffect, useState } from 'react'
import { adapter } from '../adapter'

export function useImageUrl(input?: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let disposed = false
    let release: (() => void) | undefined
    setUrl(undefined)
    if (input)
      void adapter
        .resolveImage(input)
        .then((image) => {
          if (disposed) image.dispose()
          else {
            release = image.dispose
            setUrl(image.url)
          }
        })
        .catch(console.error)
    return () => {
      disposed = true
      release?.()
    }
  }, [input])
  return url
}
