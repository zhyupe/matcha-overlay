import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import type { ReactNode } from 'react'

import { cn } from '#lib/utils'

const focusRing =
  'outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/** A few values of one setting side by side; the chosen one is lime (Mojito SegmentedControl) */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: T
  onValueChange(value: T): void
  options: readonly { value: T; label: ReactNode }[]
  label: string
  className?: string
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => next[0] && onValueChange(next[0] as T)}
      aria-label={label}
      className={cn(
        'inline-flex h-7 shrink-0 gap-0.5 rounded-control bg-surface p-0.75',
        className,
      )}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className={cn(
            'inline-flex min-w-0 select-none items-center justify-center gap-1 whitespace-nowrap rounded-[calc(var(--radius-control)-3px)] px-2.5 text-sm text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg active:bg-muted active:duration-0',
            'data-pressed:finish-primary data-pressed:bg-lime data-pressed:font-medium data-pressed:text-lime-ink data-pressed:hover:bg-lime-hi',
            focusRing,
          )}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

/** A filter that stays pressed, such as 仅 HQ */
export function ToggleButton({
  pressed,
  onPressedChange,
  children,
  label,
}: {
  pressed: boolean
  onPressedChange(pressed: boolean): void
  children: ReactNode
  label?: string
}) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      aria-label={label}
      className={cn(
        'finish-raised finish-press inline-flex h-7 shrink-0 select-none items-center gap-1.5 rounded-control border border-line-strong bg-surface px-2.5 text-sm font-medium text-fg-2 duration-150 hover:bg-muted hover:text-fg',
        'data-pressed:border-lime/60 data-pressed:bg-ok-soft data-pressed:text-ok-fg',
        focusRing,
      )}
    >
      {children}
    </Toggle>
  )
}

/** States and labels: what something is, never something to click (Mojito StatusChip / Badge) */
export function Chip({
  tone,
  children,
  className,
}: {
  tone?: 'ok' | 'warn' | 'danger'
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium tabular-nums [&_svg]:size-3',
        tone === 'ok'
          ? 'bg-ok-soft text-ok-fg'
          : tone === 'warn'
            ? 'bg-warn-soft text-warn-fg'
            : tone === 'danger'
              ? 'bg-danger-soft text-danger-fg'
              : 'bg-chip text-fg-2',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Nothing to show yet: what is missing and how it gets filled */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-24 items-center justify-center px-4 py-6 text-center text-sm text-fg-3">
      {children}
    </div>
  )
}
