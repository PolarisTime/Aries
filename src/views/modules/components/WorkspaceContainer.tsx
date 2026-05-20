import Splitter from 'antd/es/splitter'
import { useEffect, useMemo, useRef, useState } from 'react'

interface Props {
  gridContent: React.ReactNode
  editorContent: React.ReactNode
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

export function WorkspaceContainer({
  gridContent,
  editorContent,
  hasActiveEditor,
}: Props) {
  const isNarrow = useResponsiveSplit()
  const containerRef = useRef<HTMLDivElement>(null)

  const splitter = useMemo(() => {
    if (isNarrow) {
      return hasActiveEditor ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {editorContent}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {gridContent}
        </div>
      )
    }

    return (
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
          {gridContent}
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
            }}
          >
            {hasActiveEditor ? editorContent : null}
          </div>
        </Panel>
      </Splitter>
    )
  }, [isNarrow, hasActiveEditor, gridContent, editorContent])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {splitter}
    </div>
  )
}
