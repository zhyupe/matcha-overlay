import axios from 'axios'
import { debounce } from 'debounce'
import { Cache } from '../cache'

interface QueryTask {
  id: number
  language: string
  resolve: (record: ItemRecord | PromiseLike<ItemRecord>) => any
  reject: (e: Error) => any
}
export interface ItemInfo {
  ID: number
  Icon: string
  LevelItem: number
  IsAdvancedMeldingPermitted: number
  MateriaSlotCount: number
  Name_chs: string
  Name_en: string
  Name_de: string
  Name_fr: string
  Name_ja: string
}

export interface ItemRecord {
  /**
   * Name
   */
  n: Record<string, string>
  /**
   * Icon
   */
  i: string
  /**
   * MateriaSlotCount
   */
  s: number
  /**
   * IsAdvancedMeldingPermitted
   */
  a: number
  /**
   * LevelItem
   */
  l: number
}

export interface XivapiPagedResponse<T> {
  Pagination: {
    Page: number
    PageNext: number
    PagePrev: number
    PageTotal: number
    Results: number
    ResultsPerPage: number
    ResultsTotal: number
  }
  Results: T[]
}

export const xivapiRoot = {
  global: 'https://xivapi.com',
  china: 'https://cafemaker.wakingsands.com',
}
const itemCache = new Cache<number, ItemRecord>('gearset-item')
const queryColumns: Array<keyof ItemInfo> = [
  'ID',
  'Icon',
  'LevelItem',
  'MateriaSlotCount',
  'IsAdvancedMeldingPermitted',
  'Name_chs',
  'Name_en',
  'Name_de',
  'Name_fr',
  'Name_ja',
]

let itemQueryList: QueryTask[] = []

const queryXivapi = (root: string, list: QueryTask[]) => {
  if (list.length === 0) return

  const ids = Array.from(new Set(list.map(({ id }) => id))).join(',')
  axios
    .get<XivapiPagedResponse<ItemInfo>>(
      `${root}/item?columns=${encodeURIComponent(queryColumns.join(','))}&ids=${encodeURIComponent(ids)}`,
    )
    .then((res) => {
      for (const result of res.data.Results) {
        const record = {
          n: {
            chs: result.Name_chs,
            en: result.Name_en,
            de: result.Name_de,
            fr: result.Name_fr,
            ja: result.Name_ja,
          },
          i: result.Icon,
          s: result.MateriaSlotCount,
          a: result.IsAdvancedMeldingPermitted,
          l: result.LevelItem,
        }

        itemCache.set(result.ID, record)
        for (let i = 0; i < list.length; ) {
          if (list[i].id !== result.ID) {
            ++i
            continue
          }

          list[i].resolve(record)
          list.splice(i, 1)
        }
      }

      list.forEach((item) => item.reject(new Error('Not Found')))
    })
    .catch((e) => {
      list.forEach((item) => item.reject(e))
    })
}

const doQuery = debounce(function () {
  const list = itemQueryList.slice()
  itemQueryList = []

  queryXivapi(
    xivapiRoot.global,
    list.filter((item) => item.language !== 'chs'),
  )
  queryXivapi(
    xivapiRoot.china,
    list.filter((item) => item.language === 'chs'),
  )
}, 200)

export function queryItem(id: number, language: string): Promise<ItemRecord> {
  const queryLanguage = ['en', 'de', 'fr', 'ja', 'chs'].includes(language) ? language : 'en'
  const fromCache = itemCache.get(id)
  if (fromCache && typeof fromCache.l === 'number' && typeof fromCache.n === 'object' && fromCache.n[queryLanguage]) {
    return Promise.resolve(fromCache)
  }

  return new Promise((resolve, reject) => {
    itemQueryList.push({ id, language: queryLanguage, resolve, reject })
    doQuery()
  })
}

export function itemName(item: ItemRecord, language: string) {
  return item.n[language] || item.n.en
}
