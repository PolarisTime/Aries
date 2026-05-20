import Tabs from 'antd/es/tabs'
import type { EditorSession } from '@/views/modules/useEditorTabs'

interface Props {
  sessions: EditorSession[]
  activeKey: string | null
  onSwitch: (key: string) => void
  onClose: (key: string) => void
}

export function EditorTabBar({
  sessions,
  activeKey,
  onSwitch,
  onClose,
}: Props) {
  if (sessions.length === 0) return null

  const items = sessions.map((session) => ({
    key: session.key,
    label: (
      <span
        style={{
          fontSize: 'calc(var(--app-font-size, 12px) - 1px)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {session.isDirty ? (
          <span
            style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--theme-primary, #2458e6)',
              flexShrink: 0,
            }}
          />
        ) : null}
        {session.title}
      </span>
    ),
    closable: true,
  }))

  return (
    <Tabs
      type="editable-card"
      hideAdd
      activeKey={activeKey ?? undefined}
      items={items}
      size="small"
      onChange={(key) => onSwitch(key)}
      onEdit={(key, action) => {
        if (action === 'remove' && typeof key === 'string') {
          onClose(key)
        }
      }}
      style={{
        marginBottom: 0,
        background: '#f5f7fa',
        borderBottom: '1px solid var(--theme-border-subtle, rgba(226,232,240,0.92))',
        paddingInline: 4,
      }}
      tabBarStyle={{ marginBottom: 0 }}
    />
  )
}
