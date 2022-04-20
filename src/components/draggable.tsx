import { useState } from 'react'

export function Draggable({ children, onClick }: { children: any; onClick: () => void }): any {
  const [mouseDown, setMouseDown] = useState(0)

  // eslint-disable-next-line
  return React.Children.map(children, (child) => {
    return React.cloneElement(child, {
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
