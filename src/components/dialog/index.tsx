import cn from 'classnames'
import { PropsWithChildren } from 'react'
import './index.scss'

export function Dialog({
  className,
  direction,
  children,
}: PropsWithChildren<{
  className?: string
  direction: 'top-right' | 'top-left'
}>) {
  return <div className={cn('dialog', `dialog-${direction}`, className)}>{children}</div>
}
