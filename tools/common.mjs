import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'

export const json = (v) =>
  JSON.stringify(v, null, 2)
    .replace(/"(\d+|\w+)":/g, '$1:')
    .replace(/"(.+?)"/g, "'$1'")
    .replace(/'(\n\s+)\}/g, "',$1}")

export const write = async (file, code) => {
  const target = fileURLToPath(
    new URL(`../src/data/${file}.ts`, import.meta.url),
  )

  console.log('Writing', target)
  writeFileSync(
    target,
    await prettier.format(code, {
      filepath: target,
      semi: false,
      singleQuote: true,
    }),
  )
}

const rowId = (row) =>
  typeof row.subrow_id === 'undefined'
    ? row.row_id
    : `${row.row_id}:${row.subrow_id}`

export const rowGet = (row, key) => {
  let pointer = row
  for (const part of key.split('.')) {
    pointer = pointer.fields[part]
  }

  return pointer
}

export const xivapiTable = async (name, fields) => {
  const search = new URLSearchParams({
    fields: fields.join(','),
    limit: 10000,
  })

  const rows = []
  let after = ''
  while (true) {
    const url = `https://xivapi-v2.xivcdn.com/api/sheet/${name}?${search}`
    console.log(url)

    const res = await fetch(url)
    const data = await res.json()

    if (data.rows.length === 0) {
      break
    }

    rows.push(...data.rows)
    after = rowId(data.rows.at(-1))
    search.set('after', after)
  }

  return rows
}
