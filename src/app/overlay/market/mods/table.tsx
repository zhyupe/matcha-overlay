import classNames from 'classnames'
import { List, Map, Seq } from 'immutable'
import { CSSProperties, PropsWithChildren } from 'react'
import { HQ, SwitchHorizontal, Trash } from '../../../../components/icon'
import { useConfigBoolean } from '../../../../lib/config'
import { MarketItemsMap } from '../interface'
import { Cell } from './cell'

const renderWorldHeader = (world: number | null) =>
  world === null ? <th key="_null">服务器</th> : <Cell.WorldName id={world} key={world} />

const renderItemHeader = (language: string, id: number | null) => {
  if (id === null) {
    return <th key="0">物品名</th>
  }

  return <Cell.ItemName key={id} item={id} language={language} />
}

const toHeader = function <T>(input: List<T> | Seq.Indexed<T>, render: (value: T | null) => JSX.Element) {
  const array: Array<T | null> = input.isEmpty() ? [null] : input.toJSON()

  return array.map((value) => ({
    value,
    header: render(value),
  }))
}

const handleTranspose = function <X, Y>(columns: X[], rows: Y[], transpose = false) {
  const [visualColumns, visualRows] = transpose ? [rows, columns] : [columns, rows]

  return {
    rows: visualRows,
    columns: visualColumns,
    at(visualColumn: number, visualRow: number) {
      const [column, row] = transpose ? [visualRow, visualColumn] : [visualColumn, visualRow]
      return {
        column: columns[column],
        row: rows[row],
      }
    },
  }
}

function Button({
  active,
  className,
  style,
  children,
  onClick,
}: PropsWithChildren<{
  active?: boolean
  className?: string
  style?: CSSProperties
  onClick?: () => void
}>) {
  return (
    <button
      className={classNames('button', 'button-circle', className, active && 'button-active')}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  )
}

export function MarketTable({
  worlds,
  items,
  language,
  onReset,
}: {
  worlds: List<number>
  items: MarketItemsMap
  language: string
  onReset: () => void
}) {
  const [transpose, { toggle: toggleTranspose }] = useConfigBoolean('market-transpose')
  const [hqOnly, { toggle: toggleHQOnly }] = useConfigBoolean('market-hq-only')

  const worldHeaders = toHeader(worlds, renderWorldHeader)
  const itemHeaders = toHeader(items.keySeq(), renderItemHeader.bind(null, language))

  const { rows, columns, at } = handleTranspose(itemHeaders, worldHeaders, transpose)

  return (
    <table className="overlay-market">
      <thead>
        <tr>
          <th style={{ width: 100 }}>
            <div className="buttons">
              <Button active={transpose} className="transpose" onClick={toggleTranspose} style={{ marginRight: 10 }}>
                <SwitchHorizontal />
              </Button>
              <Button active={hqOnly} onClick={toggleHQOnly} style={{ marginRight: 10 }}>
                <HQ />
              </Button>
              <Button onClick={onReset}>
                <Trash />
              </Button>
            </div>
          </th>
          {columns.map((item) => item.header)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => {
          return (
            <tr>
              {row.header}
              {columns.map((_, columnIndex) => {
                const cell = at(columnIndex, rowIndex)
                const item = cell.column.value
                const world = cell.row.value

                const itemMap = item ? items.get(item) : undefined
                if (!item || !world || !itemMap) {
                  return <Cell.Empty />
                }

                return <Cell key={`${world}-${item}`} world={world} item={itemMap} hqOnly={hqOnly} />
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
