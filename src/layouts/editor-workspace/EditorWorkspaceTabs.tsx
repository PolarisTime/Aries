import {
  CloseOutlined,
  CloseSquareOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  LockOutlined,
  MoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Badge, Button, Dropdown, Tabs } from 'antd'
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { EditorTaskDrawer } from '@/layouts/editor-workspace/EditorTaskDrawer'
import type { EditorTask } from '@/layouts/editor-workspace/editor-task-types'

interface Props {
  activeKey: string | null
  tasks: EditorTask[]
  style?: CSSProperties
  onActivate: (key: string) => void
  onCloseTasks: (keys: string[]) => void
}

const isTaskCloseable = (task: EditorTask): boolean =>
  task.closable && task.status !== 'saving'

const isSavedTask = (task: EditorTask): boolean =>
  task.status === 'clean' ||
  task.status === 'saved' ||
  task.status === 'readonly'

const renderTaskStatus = (
  task: EditorTask,
  labels: Record<'dirty' | 'saving' | 'error' | 'readonly', string>,
): ReactNode => {
  if (task.status === 'dirty') {
    return (
      <span
        className="editor-task-status is-dirty"
        role="status"
        aria-label={labels.dirty}
      />
    )
  }
  if (task.status === 'saving') {
    return <LoadingOutlined spin aria-label={labels.saving} />
  }
  if (task.status === 'error') {
    return <ExclamationCircleFilled aria-label={labels.error} />
  }
  if (task.status === 'readonly') {
    return <LockOutlined aria-label={labels.readonly} />
  }
  return null
}

export const EditorWorkspaceTabs = ({
  activeKey,
  tasks,
  style,
  onActivate,
  onCloseTasks,
}: Props): React.JSX.Element | null => {
  const { t } = useTranslation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!tasks.length) {
    return null
  }

  const closeableTasks = tasks.filter(isTaskCloseable)
  const savedTasks = closeableTasks.filter(isSavedTask)
  const statusLabels = {
    dirty: t('layouts.editorTasks.status.dirty'),
    saving: t('layouts.editorTasks.status.saving'),
    error: t('layouts.editorTasks.status.error'),
    readonly: t('layouts.editorTasks.status.readonly'),
  }

  const items = tasks.map((task) => {
    const otherTasks = closeableTasks.filter((item) => item.key !== task.key)
    const menuItems: MenuProps['items'] = [
      {
        disabled: !isTaskCloseable(task),
        icon: <CloseOutlined />,
        key: 'close-current',
        label: t('layouts.editorTasks.closeCurrent'),
      },
      {
        disabled: !otherTasks.length,
        icon: <CloseSquareOutlined />,
        key: 'close-others',
        label: t('layouts.editorTasks.closeOthers'),
      },
      { type: 'divider' },
      {
        disabled: !savedTasks.length,
        icon: <UnorderedListOutlined />,
        key: 'close-saved',
        label: t('layouts.editorTasks.closeSaved'),
      },
      {
        danger: true,
        disabled: !closeableTasks.length,
        icon: <DeleteOutlined />,
        key: 'close-all',
        label: t('layouts.editorTasks.closeAll'),
      },
    ]

    const moduleTitle = task.displayMeta?.moduleTitle
    const recordLabel = task.displayMeta?.recordLabel
    return {
      key: task.key,
      closable: isTaskCloseable(task),
      closeIcon: isTaskCloseable(task) ? (
        <CloseOutlined
          aria-label={t('layouts.editorTasks.closeTask', {
            title: task.title,
          })}
        />
      ) : undefined,
      label: (
        <Dropdown
          menu={{
            items: menuItems,
            onClick: ({ domEvent, key }) => {
              domEvent.stopPropagation()
              if (key === 'close-current') {
                onCloseTasks([task.key])
              } else if (key === 'close-others') {
                onCloseTasks(otherTasks.map((item) => item.key))
              } else if (key === 'close-saved') {
                onCloseTasks(savedTasks.map((item) => item.key))
              } else if (key === 'close-all') {
                onCloseTasks(closeableTasks.map((item) => item.key))
              }
            },
          }}
          trigger={['contextMenu']}
        >
          <span className="editor-task-tab-label" title={task.title}>
            {renderTaskStatus(task, statusLabels)}
            <span className="editor-task-tab-title">
              {moduleTitle ? (
                <>
                  <span className="editor-task-tab-module">{moduleTitle}</span>
                  {recordLabel ? (
                    <span className="editor-task-tab-record">
                      {recordLabel}
                    </span>
                  ) : null}
                </>
              ) : (
                task.title
              )}
            </span>
          </span>
        </Dropdown>
      ),
    }
  })

  const handleEdit = (
    targetKey: KeyboardEvent | MouseEvent | string,
    action: 'add' | 'remove',
  ): void => {
    if (action === 'remove' && typeof targetKey === 'string') {
      onCloseTasks([targetKey])
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
        more={{
          icon: (
            <MoreOutlined
              aria-label={t('layouts.editorTasks.moreOverflowTasks')}
            />
          ),
          trigger: 'click',
        }}
        size="small"
        tabBarExtraContent={{
          left: (
            <Badge count={tasks.length} overflowCount={99} size="small">
              <Button
                aria-label={t('layouts.editorTasks.openAllTasks', {
                  count: tasks.length,
                })}
                className="editor-task-switcher"
                icon={<UnorderedListOutlined />}
                size="small"
                type="text"
                onClick={() => setDrawerOpen(true)}
              >
                <span className="editor-task-switcher-label">
                  {t('layouts.editorTasks.allTasks')}
                </span>
              </Button>
            </Badge>
          ),
        }}
        type="editable-card"
        onChange={onActivate}
        onEdit={handleEdit}
        onTabClick={(key) => {
          if (key === activeKey) {
            onActivate(key)
          }
        }}
      />
      <EditorTaskDrawer
        activeKey={activeKey}
        open={drawerOpen}
        tasks={tasks}
        onActivate={onActivate}
        onCloseTasks={onCloseTasks}
        onOpenChange={setDrawerOpen}
      />
    </section>
  )
}
