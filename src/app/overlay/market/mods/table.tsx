import type { List, Seq } from 'immutable'
import { Trash2 } from 'lucide-react'
import type { ReactElement } from 'react'
import { Button } from '#components/ui/button'
import { Empty, SegmentedControl, ToggleButton } from '#components/ui/controls'
import { HQ } from '../../../../components/icon'
import { useConfigBoolean } from '../../../../lib/config'
import type { MarketItemsMap } from '../interface'
import { Cell } from './cell'

const renderWorldHeader = (world: number | null) =>
  world === null ? (
    <th key="_null" />
  ) : (
    <Cell.WorldName id={world} key={world} />
  )

const renderItemHeader = (language: string, id: number | null) => {
  if (id === null) {
    return <th key="0" />
  }

  return <Cell.ItemName key={id} item={id} language={language} />
}

const toHeader = <T extends number>(
  input: List<T> | Seq.Indexed<T>,
  render: (value: T | null) => ReactElement,
) => {
  const array: Array<T | null> = input.isEmpty() ? [null] : input.toJSON()

  return array.map((value) => ({
    value,
    header: render(value),
  }))
}

const handleTranspose = <X, Y>(columns: X[], rows: Y[], transpose = false) => {
  const [visualColumns, visualRows] = transpose
    ? [rows, columns]
    : [columns, rows]

  return {
    rows: visualRows,
    columns: visualColumns,
    at(visualColumn: number, visualRow: number) {
      const [column, row] = transpose
        ? [visualRow, visualColumn]
        : [visualColumn, visualRow]
      return {
        column: columns[column],
        row: rows[row],
      }
    },
  }
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
  const [transpose, { toggle: toggleTranspose }] =
    useConfigBoolean('market-transpose')
  const [hqOnly, { toggle: toggleHQOnly }] = useConfigBoolean('market-hq-only')

  const worldHeaders = toHeader(worlds, renderWorldHeader)
  const itemHeaders = toHeader(
    items.keySeq(),
    renderItemHeader.bind(null, language),
  )

  const { rows, columns, at } = handleTranspose(
    itemHeaders,
    worldHeaders,
    transpose,
  )

  if (items.isEmpty()) {
    return <Empty>在市场板查询物品后，各服务器的价格会显示在这里</Empty>
  }

  return (
    <>
      <div className="market-toolbar">
        <SegmentedControl
          label="排列"
          value={transpose ? 'item' : 'world'}
          onValueChange={(value) => {
            if ((value === 'item') !== transpose) toggleTranspose()
          }}
          options={[
            { value: 'world', label: '按服务器' },
            { value: 'item', label: '按物品' },
          ]}
        />
        <ToggleButton pressed={hqOnly} onPressedChange={toggleHQOnly}>
          <HQ /> 仅 HQ
        </ToggleButton>
        <span className="flex-1" />
        <Button variant="ghost" onClick={onReset}>
          <Trash2 />
          清空
        </Button>
      </div>
      <div className="market-panel">
        <table className="overlay-market">
          <thead>
            <tr>
              <th>{transpose ? '物品' : '服务器'}</th>
              {columns.map((item) => item.header)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              return (
                <tr key={row.value}>
                  {row.header}
                  {columns.map((_, columnIndex) => {
                    const cell = at(columnIndex, rowIndex)
                    const item = cell.column.value
                    const world = cell.row.value

                    const itemMap = item ? items.get(item) : undefined
                    if (!item || !world || !itemMap) {
                      return (
                        <td key={`${world}-${item}`} className="no-record">
                          —
                        </td>
                      )
                    }

                    return (
                      <Cell
                        key={`${world}-${item}`}
                        world={world}
                        item={itemMap}
                        hqOnly={hqOnly}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
