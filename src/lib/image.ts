import { useEffect, useState } from 'react'
import { mojitoSource } from '../source'
import { imageUrls } from '../transport'

export function useImageUrl(input?: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!mojitoSource || !input) return
    const images = imageUrls()
    let disposed = false
    setUrl(undefined)
    void images
      .load(input)
      .then((value) => {
        if (!disposed) setUrl(value)
      })
      .catch(() => {})
    return () => {
      disposed = true
      images.dispose()
    }
  }, [input])
  return mojitoSource ? url : input
}
