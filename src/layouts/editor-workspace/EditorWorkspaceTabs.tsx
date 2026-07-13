import {
  CloseOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { Tabs } from 'antd'
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import type { EditorTask } from '@/layouts/editor-workspace/editor-task-types'

interface Props {
  activeKey: string | null
  tasks: EditorTask[]
  style?: CSSProperties
  onActivate: (key: string) => void
  onClose: (key: string) => void
}

const renderTaskStatus = (task: EditorTask): ReactNode => {
  if (task.status === 'dirty') {
    return (
      <span
        className="editor-task-status is-dirty"
        role="status"
        aria-label="未保存"
      />
    )
  }
  if (task.status === 'saving') {
    return <LoadingOutlined spin aria-label="正在保存" />
  }
  if (task.status === 'error') {
    return <ExclamationCircleFilled aria-label="保存失败" />
  }
  if (task.status === 'readonly') {
    return <LockOutlined aria-label="只读" />
  }
  return null
}

export const EditorWorkspaceTabs = ({
  activeKey,
  tasks,
  style,
  onActivate,
  onClose,
}: Props): React.JSX.Element | null => {
  if (!tasks.length) {
    return null
  }

  const items = tasks.map((task) => ({
    key: task.key,
    closable: task.closable && task.status !== 'saving',
    closeIcon:
      task.closable && task.status !== 'saving' ? (
        <CloseOutlined aria-label={`关闭 ${task.title}`} />
      ) : undefined,
    label: (
      <span className="editor-task-tab-label">
        {renderTaskStatus(task)}
        <span className="editor-task-tab-title">{task.title}</span>
      </span>
    ),
  }))

  const handleEdit = (
    targetKey: KeyboardEvent | MouseEvent | string,
    action: 'add' | 'remove',
  ): void => {
    if (action === 'remove' && typeof targetKey === 'string') {
      onClose(targetKey)
    }
  }

  return (
    <section
      className="editor-workspace-tabs tab-layout-tabs"
      aria-label="编辑工作区"
      style={style}
    >
      <Tabs
        activeKey={activeKey ?? undefined}
        className="editor-workspace-tabs-antd"
        hideAdd
        items={items}
        more={{ trigger: 'click' }}
        size="small"
        type="editable-card"
        onChange={onActivate}
        onEdit={handleEdit}
        onTabClick={(key) => {
          if (key === activeKey) {
            onActivate(key)
          }
        }}
      />
    </section>
  )
}
