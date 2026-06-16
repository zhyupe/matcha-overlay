import type { Models } from '@thewakingsands/xivapi-v2'
import { debounce } from 'debounce'
import { Cache } from '../cache'
import { xivapi } from '../xivapi'

interface QueryTask {
  id: number
  language: string
  resolve: (record: ItemRecord | PromiseLike<ItemRecord>) => any
  reject: (e: Error) => any
}

export type Language = 'chs' | 'tc' | 'en' | 'de' | 'fr' | 'ja' | 'ko'

type ItemNameFields = {
  [K in `Name@lang(${Language})`]: string
}

interface ItemIcon {
  id: number
  path: string
  path_hr1?: string
}

type ItemReference =
  | number
  | XivapiV2Reference<unknown>
  | {
      id?: number
      row_id?: number
      value?: number
    }

export type ItemInfo = ItemNameFields & {
  Icon: ItemIcon | string
  LevelItem: ItemReference
  IsAdvancedMeldingPermitted: boolean
  MateriaSlotCount: number
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

export interface XivapiV2Row<T> {
  row_id: number
  subrow_id?: number
  fields: T
}

export interface XivapiV2Reference<T> extends XivapiV2Row<T> {
  sheet: string
  value: number
}

export interface XivapiPagedResponse<T> {
  rows: XivapiV2Row<T>[]
}

const itemCache = new Cache<number, ItemRecord>('gearset-item', {
  version: '2026.06.13',
})

const languages: Language[] = ['chs', 'tc', 'en', 'de', 'fr', 'ja', 'ko']
const queryLanguages = new Set<string>(languages)

const nameField = (lang: string) => `Name@lang(${lang})`

const normalizeIcon = (icon: ItemInfo['Icon']) => {
  if (typeof icon === 'string') {
    return icon
  }

  return icon.path_hr1 || icon.path
}

const normalizeReference = (reference: ItemReference) => {
  if (typeof reference === 'number') return reference

  return (
    reference.value ??
    ('id' in reference ? reference.id : undefined) ??
    reference.row_id ??
    0
  )
}

const queryColumns = [
  'Icon',
  'LevelItem.id',
  'MateriaSlotCount',
  'IsAdvancedMeldingPermitted',
  ...languages.map(nameField),
]
let itemQueryList: QueryTask[] = []

const queryXivapi = async (list: QueryTask[]) => {
  if (list.length === 0) return

  const ids = Array.from(new Set(list.map(({ id }) => id)))

  try {
    const res = (await xivapi.items.list({
      rows: ids.join(','),
      fields: queryColumns.join(','),
    } as any)) as Models.SheetResponse<ItemInfo, unknown>
    for (const result of res.rows) {
      const { fields } = result
      const record = {
        n: Object.fromEntries(
          languages.map((language) => [
            language,
            fields[`Name@lang(${language})`],
          ]),
        ),
        i: normalizeIcon(fields.Icon),
        s: fields.MateriaSlotCount,
        a: fields.IsAdvancedMeldingPermitted ? 1 : 0,
        l: normalizeReference(fields.LevelItem),
      }

      itemCache.set(result.row_id, record)
      for (let i = 0; i < list.length; ) {
        if (list[i].id !== result.row_id) {
          ++i
          continue
        }

        list[i].resolve(record)
        list.splice(i, 1)
      }
    }

    list.forEach((item) => {
      item.reject(new Error('Not Found'))
    })
  } catch (e) {
    list.forEach((item) => {
      item.reject(e as Error)
    })
  }
}

const doQuery = debounce(() => {
  const list = itemQueryList.slice()
  itemQueryList = []

  queryXivapi(list)
}, 200)

export function queryItem(id: number, language: string): Promise<ItemRecord> {
  const queryLanguage = queryLanguages.has(language) ? language : 'en'
  const fromCache = itemCache.get(id)
  if (
    fromCache &&
    typeof fromCache.l === 'number' &&
    typeof fromCache.n === 'object' &&
    fromCache.n[queryLanguage]
  ) {
    return Promise.resolve(fromCache)
  }

  return new Promise((resolve, reject) => {
    itemQueryList.push({ id, language: queryLanguage, resolve, reject })
    doQuery()
  })
}

export function itemName(item: ItemRecord, language: string): string {
  return item.n[language] || item.n.en
}
