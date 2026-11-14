import clsx from 'clsx'
import type { PropsWithChildren } from 'react'
import './index.scss'

export function Dialog({
  className,
  direction,
  children,
}: PropsWithChildren<{
  className?: string
  direction: 'top-right' | 'top-left'
}>) {
  return (
    <div className={clsx('dialog', `dialog-${direction}`, className)}>
      {children}
    </div>
  )
}
