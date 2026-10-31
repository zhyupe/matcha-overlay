import { imageUrls } from '../transport'

export function mapStyles() {
  const images = imageUrls()
  return {
    css: (text: string) =>
      text.replace(
        /url\(["']?(data:[^)"']+)["']?\)/g,
        (_, url: string) => `url("${images.data(url)}")`,
      ),
    dispose() {
      images.dispose()
    },
  }
}
