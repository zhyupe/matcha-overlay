import { Menu as BaseMenu } from '@base-ui/react/menu'
import { Check } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'

import { cn } from '#lib/utils'

/** A list of choices opened from a trigger (Mojito Menu) */
export function Menu({
  trigger,
  children,
  align = 'start',
  className,
}: {
  trigger: ReactElement
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner
          align={align}
          sideOffset={4}
          collisionPadding={6}
          className="z-50 outline-hidden"
        >
          <BaseMenu.Popup
            className={cn(
              'min-w-40 origin-(--transform-origin) rounded-panel border border-line bg-pop p-1 text-fg shadow-pop outline-hidden transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[.98] data-ending-style:opacity-0 data-starting-style:scale-[.98] data-starting-style:opacity-0',
              className,
            )}
          >
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  )
}

const item =
  'flex min-h-7.5 select-none items-center gap-2 rounded-control px-2 text-sm text-fg-2 outline-hidden data-highlighted:bg-selected data-highlighted:text-fg data-disabled:opacity-45 [&_svg]:size-3.5 [&_svg]:shrink-0'

export function MenuItem({
  children,
  onClick,
  checked,
  disabled,
}: {
  children: ReactNode
  onClick(): void
  /** The current choice, marked with a lime check */
  checked?: boolean
  disabled?: boolean
}) {
  return (
    <BaseMenu.Item
      onClick={onClick}
      disabled={disabled}
      className={cn(item, checked && 'text-fg')}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked && <Check className="text-lime" aria-hidden="true" />}
    </BaseMenu.Item>
  )
}

export function MenuSeparator() {
  return <BaseMenu.Separator className="-mx-1 my-1 h-px bg-line" />
}
