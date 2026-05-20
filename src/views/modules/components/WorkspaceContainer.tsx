import Splitter from 'antd/es/splitter'
import { type ReactNode, useEffect, useState } from 'react'

interface Props {
  children: ReactNode
  hasActiveEditor: boolean
}

const { Panel } = Splitter

function useResponsiveSplit(): boolean {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 960)
  useEffect(() => {
    const handle = () => setIsNarrow(window.innerWidth < 960)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])
  return isNarrow
}

export function WorkspaceContainer({ children, hasActiveEditor }: Props) {
  const isNarrow = useResponsiveSplit()
  const [gridChild, editorChild] = (() => {
    const arr = Array.isArray(children)
      ? children
      : [children]
    return [arr[0] ?? null, arr[1] ?? null]
  })()

  if (isNarrow) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {hasActiveEditor && editorChild ? editorChild : gridChild}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <Splitter style={{ flex: 1, minHeight: 0 }}>
        <Panel
          defaultSize="50%"
          min={360}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          {gridChild}
        </Panel>
        <Panel
          defaultSize="50%"
          min={360}
          collapsible
          collapsed={!hasActiveEditor}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {hasActiveEditor ? editorChild : null}
          </div>
        </Panel>
      </Splitter>
    </div>
  )
}
