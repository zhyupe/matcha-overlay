const axios = require('axios').default
const fs = require('fs')
const path = require('path')

const output = path.join(__dirname, '../public/icon/materia')
const css = 'https://img.finalfantasyxiv.com/lds/h/M/0kxkkawCCBg1ArBrU_c1cydINM.css'

axios.get(css).then((res) => {
  const style = res.data
  const files = []

  const regex = /\.db.+?__materia__(\w+) \.(\w+)(?:\:after)?[\s\S]+?url\((.+?)\)/gm
  const count = {
    normal: 0,
    overmeld: 0,
  }
  while (match = regex.exec(style)) {
    const type = match[1] === 'normal' ? 'normal' : 'overmeld'
    const index = match[2] === 'socket' ? 'empty' : `grade${(count[type]++).toString().padStart(2, '0')}`

    files.push({
      url: new URL(match[3], css).href,
      name: `slot_${type}_${index}.png`
    })
  }

  console.log(files)
  Promise.all(files.map(async ({ url, name }) => {
    const res = await axios.get(url, {
      responseType: 'stream'
    })
    res.data.pipe(fs.createWriteStream(path.join(output, name)))
  }))
})