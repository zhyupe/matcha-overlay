import React, { useState, useEffect, useReducer, ReducerWithoutAction } from 'react'
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
import { MatchaEvent, OverlayProps } from '../../interface'
import { getConfig, setConfig } from '../../../lib/config'
import { HQ, SwitchHorizontal, Trash } from '../../../components/icon'

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

export function MarketOverlay({ eventEmitter, active, setActive }: OverlayProps) {
  const [worlds, setWorlds] = useState(List<number>())
  const [items, setItems] = useState(List<MarketItemRecord>())
  const [transpose, toggleTranspose] = useReducer<ReducerWithoutAction<boolean>, undefined>(
    (prev) => {
      const value = !prev
      setConfig('market-transpose', `${value}`)
      return value
    },
    undefined,
    () => getConfig('market-transpose') === 'true',
  )
  const [hqOnly, toggleHQOnly] = useReducer<ReducerWithoutAction<boolean>, undefined>(
    (prev) => {
      const value = !prev
      setConfig('market-hq-only', `${value}`)
      return value
    },
    undefined,
    () => getConfig('market-hq-only') === 'true',
  )

  const reset = () => {
    setWorlds((servers) => servers.clear())
    setItems((items) => items.clear())
  }

  useEffect(() => {
    const handleCount = function (log: MatchaEvent<MarketBoardItemListingCountDTO>) {
      const data = log.content

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
    }

    const handleListing = function (log: MatchaEvent<MarketBoardItemListingDTO>) {
      if (!active) {
        setActive()
      }

      const data = log.content

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
    }

    // [MarketBoardItemListingCount] {"item":12604,"world":1044,"count":10,"EventType":6}
    // [MarketBoardItemListing] {"item":12604,"world":0,"data":[{"price":1750,"quantity":39,"hq":false}],"EventType":5}
    eventEmitter.on('MarketBoardItemListing', handleListing)
    eventEmitter.on('MarketBoardItemListingCount', handleCount)

    return () => {
      eventEmitter.off('MarketBoardItemListing', handleListing)
      eventEmitter.off('MarketBoardItemListingCount', handleCount)
    }
  }, [active, eventEmitter, setActive])

  if (!active) return null

  const renderWorld = (world: number | null) =>
    world === null ? <th>服务器</th> : <Cell.WorldName id={world} key={world} />

  const renderItem = (item: MarketItemRecord | null) => {
    if (item === null) {
      return <th key="0">物品名</th>
    }

    const id = item.get('id')
    return <Cell.ItemName key={id} item={id} />
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
  )
}
