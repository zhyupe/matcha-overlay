import { cn } from '#lib/utils'
import { useImageUrl } from '../lib/image'
import type { ItemRecord } from '../lib/store/item'
import { xivapi } from '../lib/xivapi'

/** The game icon of an item, or an empty slot of the same size while it loads */
export function ItemIcon({
  record,
  className,
}: {
  record?: ItemRecord | null
  className?: string
}) {
  const url = useImageUrl(
    record?.i
      ? record.local
        ? record.i
        : xivapi.formatIconUrl(record.i)
      : undefined,
  )
  return url ? (
    <img alt="" src={url} className={cn('item-icon', className)} />
  ) : (
    <span className={cn('item-icon item-icon-empty', className)} />
  )
}
