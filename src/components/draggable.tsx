import { Children, cloneElement, useState } from 'react'

export function Draggable({ children, onClick }: { children: any; onClick: () => void }): any {
  const [mouseDown, setMouseDown] = useState(0)

  return Children.map(children, (child) => {
    return cloneElement(child, {
      onMouseDown() {
        setMouseDown(Date.now())
      },
      onMouseUp(e) {
        if (Date.now() - mouseDown < 200) {
          e.stopPropagation()
          onClick()
        }
      },
    })
  })
}
