import { json, write } from './common.mjs'

Promise.all([
  fetch('https://xivapi.com/servers/dc').then((res) => res.json()),
  fetch('https://xivapi.com/world?limit=10000').then((res) => res.json()),
  fetch('https://zhyupe.github.io/ffxiv-datamining-worker/server.json').then((res) => res.json()),
]).then(([dc, data, cnServer]) => {
  const dcMap = {}
  const worlds = {}
  const overlayWorlds = {}

  data.Results.forEach((row) => {
    const dcName = Object.keys(dc).find((key) => dc[key].includes(row.Name))
    if (!dcName) return

    worlds[row.ID] = {
      name: row.Name,
      name_en: row.Name,
      dc: dcName,
      dc_en: dcName,
    }
  })

  cnServer.forEach((server) => {
    dcMap[server.name_chs] = server.dc
    server.worlds.forEach((item) => {
      worlds[item.id] = {
        name: item.name_chs,
        name_en: item.name_en,
        dc: server.name_chs,
        dc_en: server.name_en,
      }
    })
  })

  for (const [id, { name, name_en, dc, dc_en }] of Object.entries(worlds)) {
    const cnDCId = dcMap[dc]
    overlayWorlds[id] = {
      region: dc === dc_en ? 'global' : 'cn',
      dc: cnDCId || undefined,
      name: name !== name_en ? name : undefined,
      en: name_en,
    }
  }

  const code = `/* eslint-disable */

  export interface IWorldData {
    region: string
    dc?: number
    name?: string
    en: string
  }
  
  export enum DC {
  ${Object.entries(dcMap)
    .map(([k, v]) => `  ${k} = ${v},`)
    .join('\n')}
  }
  
  export const Worlds: Record<number, IWorldData> = ${json(overlayWorlds)}
  `
  write('worlds', code)
})
