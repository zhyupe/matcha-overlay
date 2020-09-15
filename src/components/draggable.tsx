import React, { useState } from 'react'

export function Draggable({ children, onClick }: { children: any; onClick: Function }) {
  const [mouseDown, setMouseDown] = useState(0)

  return React.Children.map(children, (child) => {
    return React.cloneElement(child, {
      onMouseDown() {
        setMouseDown(Date.now())
      },
      onMouseUp(e) {
        if (Date.now() - mouseDown < 200) {
          console.log(e.isPropagationStopped())
          e.stopPropagation()
          onClick()
        }
      },
    })
  })
}
