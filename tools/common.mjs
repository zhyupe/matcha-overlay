import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'

export const json = (v) =>
  JSON.stringify(v, null, 2)
    .replace(/"(\d+|\w+)":/g, '$1:')
    .replace(/"(.+?)"/g, "'$1'")
    .replace(/'(\n\s+)\}/g, "',$1}")

export const write = async (file, code) => {
  const target = fileURLToPath(new URL(`../src/data/${file}.ts`, import.meta.url))
  writeFileSync(
    target,
    await prettier.format(code, {
      filepath: target,
      semi: false,
      singleQuote: true,
    }),
  )
}
