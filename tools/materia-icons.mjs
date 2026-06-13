import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const output = fileURLToPath(new URL('../public/icon/materia', import.meta.url))
const page = 'https://jp.finalfantasyxiv.com/lodestone/character/'

const cssRegex = /<link href="([^"]+\.css)" rel="stylesheet">/g
const materiaRegex =
  /\.db.+?__materia__(\w+) \.(\w+)(?::after)?[\s\S]+?url\((.+?)\)/gm

export async function updateMateriaIcons() {
  const html = await fetch(page).then((res) => res.text())
  const cssMatch = html.matchAll(cssRegex)
  for (const item of cssMatch) {
    const link = item[1]
    console.log(link)

    const res = await fetch(link)
    const style = await res.text()
    const materiaMatch = style.matchAll(materiaRegex)

    const files = []
    const count = {
      normal: 0,
      overmeld: 0,
    }

    for (const match of materiaMatch) {
      const type = match[1] === 'normal' ? 'normal' : 'overmeld'
      const index =
        match[2] === 'socket'
          ? 'empty'
          : `grade${(count[type]++).toString().padStart(2, '0')}`

      files.push({
        url: new URL(match[3], link).href,
        name: `slot_${type}_${index}.png`,
      })
    }

    console.log(files)
    if (files.length) {
      Promise.all(
        files.map(async ({ url, name }) => {
          const res = await fetch(url)
          const buf = await res.arrayBuffer()

          writeFileSync(join(output, name), Buffer.from(buf))
        }),
      )

      break
    }
  }
}
