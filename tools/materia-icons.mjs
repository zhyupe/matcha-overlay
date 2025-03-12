import { writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const output = fileURLToPath(new URL('../public/icon/materia', import.meta.url))
const css = 'https://lds-img.finalfantasyxiv.com/h/T/uO7XkVAGwkyx_gUrfgvedPRK_c.css'

const res = await fetch(css)
const style = await res.text()
const files = []

const regex = /\.db.+?__materia__(\w+) \.(\w+)(?:\:after)?[\s\S]+?url\((.+?)\)/gm
const count = {
  normal: 0,
  overmeld: 0,
}

let match
while ((match = regex.exec(style))) {
  const type = match[1] === 'normal' ? 'normal' : 'overmeld'
  const index = match[2] === 'socket' ? 'empty' : `grade${(count[type]++).toString().padStart(2, '0')}`

  files.push({
    url: new URL(match[3], css).href,
    name: `slot_${type}_${index}.png`,
  })
}

console.log(files)
Promise.all(
  files.map(async ({ url, name }) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()

    writeFileSync(join(output, name), Buffer.from(buf))
  }),
)
