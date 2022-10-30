import { useState } from 'react'
import './index.css'
import { List, Map } from 'immutable'
import {
  MarketRecord,
  MarketItemRecord,
  MarketPriceRecord,
  MarketBoardItemListingCountDTO,
  MarketBoardItemListingDTO,
} from './interface'
import { Cell } from './mods/cell'
import { OverlayProps } from '../../interface'
import { useConfigBoolean } from '../../../lib/config'
import { HQ, SwitchHorizontal, Trash } from '../../../components/icon'
import { useEvent } from '../../../lib/event'

function updatePriceRow(records: List<MarketPriceRecord>, data: MarketRecord[]): List<MarketPriceRecord> {
  const ret = data.reduce((records, { price, quantity, hq }) => {
    const index = records.findIndex((record) => record.get('price') === price)
    if (index === -1) {
      return records.push(
        MarketPriceRecord({
          price,
          quantity,
          hq: hq ? quantity : 0,
        }),
      )
    }

    return records.update(index, (record) =>
      record.update('quantity', (value) => value + quantity).update('hq', (value) => value + (hq ? quantity : 0)),
    )
  }, records)

  return ret
}

export function MarketOverlay({ language, eventEmitter, active, setActive }: OverlayProps) {
  const [worlds, setWorlds] = useState(List<number>())
  const [items, setItems] = useState(List<MarketItemRecord>())
  const [transpose, { toggle: toggleTranspose }] = useConfigBoolean('market-transpose')
  const [hqOnly, { toggle: toggleHQOnly }] = useConfigBoolean('market-hq-only')

  const reset = () => {
    setWorlds((servers) => servers.clear())
    setItems((items) => items.clear())
  }

  useEvent<MarketBoardItemListingDTO>(eventEmitter, 'MarketBoardItemListing', (data) => {
    if (!active) {
      setActive()
    }

    setWorlds((servers) => {
      if (!servers.includes(data.world)) {
        return servers.push(data.world)
      } else {
        return servers
      }
    })

    setItems((items) => {
      const index = items.findIndex((item) => item.get('id') === data.item)
      if (index === -1) {
        return items.push(
          MarketItemRecord({
            id: data.item,
            rows: Map<number, List<MarketPriceRecord>>().set(data.world, updatePriceRow(List(), data.data)),
          }),
        )
      }

      return items.update(index, (item) =>
        item.update('rows', (rows) => {
          if (rows.has(data.world)) {
            return rows.update(data.world, (records) => updatePriceRow(records, data.data))
          } else {
            return rows.set(data.world, updatePriceRow(List<MarketPriceRecord>(), data.data))
          }
        }),
      )
    })
  })

  useEvent<MarketBoardItemListingCountDTO>(eventEmitter, 'MarketBoardItemListingCount', (data) => {
    setItems((items) => {
      const index = items.findIndex((item) => item.get('id') === data.item)
      if (index === -1) {
        return items
      }

      return items.update(index, (item) =>
        item.update('rows', (rows) => {
          return rows.set(data.world, List<MarketPriceRecord>())
        }),
      )
    })
  })

  if (!active) return null

  const renderWorld = (world: number | null) =>
    world === null ? <th>服务器</th> : <Cell.WorldName id={world} key={world} />

  const renderItem = (item: MarketItemRecord | null) => {
    if (item === null) {
      return <th key="0">物品名</th>
    }

    const id = item.get('id')
    return <Cell.ItemName key={id} item={id} language={language} />
  }

  const columnType = transpose ? 'world' : 'item'
  const rowType = transpose ? 'item' : 'world'
  const firstRow: List<number | MarketItemRecord> = columnType === 'world' ? worlds : items
  const firstColumn: List<number | MarketItemRecord> = rowType === 'world' ? worlds : items

  const columnRender = (columnType === 'world' ? renderWorld : renderItem) as (
    item: number | MarketItemRecord | null,
  ) => JSX.Element
  const rowRender = (rowType === 'world' ? renderWorld : renderItem) as (
    item: number | MarketItemRecord | null,
  ) => JSX.Element

  return (
    <>
      <div className="notice">
        <span className="tag" style={{ paddingLeft: 0 }}>
          [公告]
        </span>
        由于 Universalis 服务异常，目前跨服物价查询功能不可用。请耐心等待维护者修复服务。
      </div>
      <table className="overlay-market">
        <thead>
          <tr>
            <th style={{ width: 100 }}>
              <div className="buttons">
                <button
                  className={`transpose button button-circle ${transpose ? 'button-active' : ''}`}
                  onClick={toggleTranspose}
                  style={{ marginRight: 10 }}
                >
                  <SwitchHorizontal />
                </button>
                <button
                  className={`button button-circle ${hqOnly ? 'button-active' : ''}`}
                  onClick={toggleHQOnly}
                  style={{ marginRight: 10 }}
                >
                  <HQ />
                </button>
                <button className="button button-circle" onClick={reset}>
                  <Trash />
                </button>
              </div>
            </th>
            {firstRow.isEmpty() ? columnRender(null) : firstRow.map(columnRender)}
          </tr>
        </thead>
        <tbody>
          {firstColumn.isEmpty() ? (
            <tr>
              {rowRender(null)}
              {firstRow.isEmpty() ? <Cell.Empty /> : firstRow.map((_) => <Cell.Empty />)}
            </tr>
          ) : (
            firstColumn.map((row) => {
              return (
                <tr>
                  {rowRender(row as MarketItemRecord)}
                  {firstRow.isEmpty() ? (
                    <Cell.Empty />
                  ) : (
                    firstRow.map((column) => {
                      const item = (rowType === 'world' ? column : row) as MarketItemRecord
                      const world = (rowType === 'world' ? row : column) as number

                      return <Cell key={`${world}-${item.get('id')}`} world={world} item={item} hqOnly={hqOnly} />
                    })
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </>
  )
}
