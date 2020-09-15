import React, { ReactElement } from 'react'
import './index.css'

export interface AlertProps {
  title?: string
  children: string | ReactElement
}

export function Alert({ title = '', children }: AlertProps) {
  return (
    <div className="alert">
      {title ? <h3 className="alert-title">{title}</h3> : null}
      {children || null}
    </div>
  )
}
