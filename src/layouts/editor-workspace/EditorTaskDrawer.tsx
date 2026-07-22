import { CloseOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Drawer, Empty, Input, Segmented, Tooltip } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sortEditorTasksByRecent } from '@/layouts/editor-workspace/editor-task-model'
import type {
  EditorTask,
  EditorTaskStatus,
} from '@/layouts/editor-workspace/editor-task-types'

type TaskFilter = 'all' | 'dirty' | 'error' | 'readonly'

interface Props {
  activeKey: string | null
  open: boolean
  tasks: EditorTask[]
  onActivate: (key: string) => void
  onCloseTasks: (keys: string[]) => void
  onOpenChange: (open: boolean) => void
}

const isTaskCloseable = (task: EditorTask): boolean =>
  task.closable && task.status !== 'saving'

const isSavedTask = (task: EditorTask): boolean =>
  task.status === 'clean' ||
  task.status === 'saved' ||
  task.status === 'readonly'

const matchesFilter = (task: EditorTask, filter: TaskFilter): boolean => {
  if (filter === 'dirty') {
    return task.status === 'dirty' || task.status === 'saving'
  }
  return filter === 'all' || task.status === filter
}

const getTaskStatusLabelKey = (status: EditorTaskStatus): string => {
  switch (status) {
    case 'dirty':
      return 'layouts.editorTasks.status.dirty'
    case 'saving':
      return 'layouts.editorTasks.status.saving'
    case 'error':
      return 'layouts.editorTasks.status.error'
    case 'readonly':
      return 'layouts.editorTasks.status.readonly'
    case 'clean':
    case 'saved':
      return 'layouts.editorTasks.status.saved'
  }
}

const getTaskModuleTitle = (task: EditorTask): string =>
  task.displayMeta?.moduleTitle || task.title

const getTaskRecordLabel = (task: EditorTask): string =>
  task.displayMeta?.recordLabel || ''

export const EditorTaskDrawer = ({
  activeKey,
  open,
  tasks,
  onActivate,
  onCloseTasks,
  onOpenChange,
}: Props): React.JSX.Element => {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('all')

  const visibleTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase()
    return sortEditorTasksByRecent(tasks).filter((task) => {
      if (!matchesFilter(task, filter)) {
        return false
      }
      if (!normalizedKeyword) {
        return true
      }
      return [
        task.title,
        task.moduleKey,
        task.recordId,
        task.displayMeta?.moduleTitle,
        task.displayMeta?.recordLabel,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase().includes(normalizedKeyword),
        )
    })
  }, [filter, keyword, tasks])

  const closeableTasks = tasks.filter(isTaskCloseable)
  const savedTasks = closeableTasks.filter(isSavedTask)
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  )

  return (
    <Drawer
      className="editor-task-drawer"
      destroyOnHidden
      footer={
        <div className="editor-task-drawer-footer">
          <Button
            disabled={!savedTasks.length}
            onClick={() => onCloseTasks(savedTasks.map((task) => task.key))}
          >
            {t('layouts.editorTasks.closeSaved')}
          </Button>
          <Button
            danger
            disabled={!closeableTasks.length}
            onClick={() => onCloseTasks(closeableTasks.map((task) => task.key))}
          >
            {t('layouts.editorTasks.closeAll')}
          </Button>
        </div>
      }
      open={open}
      size="min(440px, calc(100vw - 16px))"
      title={t('layouts.editorTasks.drawerTitle', { count: tasks.length })}
      onClose={() => onOpenChange(false)}
    >
      <div className="editor-task-drawer-toolbar">
        <Input
          allowClear
          placeholder={t('layouts.editorTasks.searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Segmented<TaskFilter>
          block
          options={[
            { label: t('layouts.editorTasks.filter.all'), value: 'all' },
            { label: t('layouts.editorTasks.filter.dirty'), value: 'dirty' },
            { label: t('layouts.editorTasks.filter.error'), value: 'error' },
            {
              label: t('layouts.editorTasks.filter.readonly'),
              value: 'readonly',
            },
          ]}
          size="small"
          value={filter}
          onChange={setFilter}
        />
      </div>

      {visibleTasks.length ? (
        <ul className="editor-task-list">
          {visibleTasks.map((task) => {
            const moduleTitle = getTaskModuleTitle(task)
            const recordLabel = getTaskRecordLabel(task)
            const statusLabel = t(getTaskStatusLabelKey(task.status))
            return (
              <li
                className={`editor-task-list-item${task.key === activeKey ? ' is-active' : ''}`}
                key={task.key}
              >
                <button
                  aria-current={task.key === activeKey ? 'page' : undefined}
                  className="editor-task-list-main"
                  type="button"
                  onClick={() => {
                    onActivate(task.key)
                    onOpenChange(false)
                  }}
                >
                  <span className="editor-task-list-heading">
                    <strong>{moduleTitle}</strong>
                    {recordLabel ? <span>{recordLabel}</span> : null}
                  </span>
                  <span className="editor-task-list-meta">
                    <span
                      className={`editor-task-list-status is-${task.status}`}
                    >
                      {statusLabel}
                    </span>
                    <span>
                      {t('layouts.editorTasks.lastVisited', {
                        time: dateTimeFormatter.format(
                          task.lastActivatedAt || task.updatedAt,
                        ),
                      })}
                    </span>
                  </span>
                </button>
                <Tooltip title={t('layouts.editorTasks.closeCurrent')}>
                  <Button
                    aria-label={t('layouts.editorTasks.closeTask', {
                      title: task.title,
                    })}
                    className="editor-task-list-close"
                    disabled={!isTaskCloseable(task)}
                    icon={<CloseOutlined />}
                    shape="circle"
                    size="small"
                    type="text"
                    onClick={() => onCloseTasks([task.key])}
                  />
                </Tooltip>
              </li>
            )
          })}
        </ul>
      ) : (
        <Empty
          className="editor-task-list-empty"
          description={t('layouts.editorTasks.empty')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Drawer>
  )
}
