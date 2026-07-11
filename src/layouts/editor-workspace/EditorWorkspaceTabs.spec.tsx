import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditorWorkspaceTabs } from '@/layouts/editor-workspace/EditorWorkspaceTabs'
import type { EditorTask } from '@/layouts/editor-workspace/editor-task-types'

const task = (
  key: string,
  title: string,
  status: EditorTask['status'] = 'clean',
): EditorTask => ({
  key,
  userKey: 'user-1',
  moduleKey: 'sales-order',
  mode: 'edit',
  recordId: key,
  path: '/sales-order',
  title,
  status,
  updatedAt: 1000,
  closable: true,
})

describe('EditorWorkspaceTabs', () => {
  it('does not reserve layout space without editing tasks', () => {
    const { container } = render(
      <EditorWorkspaceTabs
        activeKey={null}
        tasks={[]}
        onActivate={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders editing tasks with an Ant Design overflow menu', () => {
    const { container } = render(
      <EditorWorkspaceTabs
        activeKey="task-1"
        tasks={[task('task-1', '销售订单 SO-001')]}
        onActivate={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(container.querySelector('.editor-workspace-tabs')).toBeTruthy()
    expect(screen.getByText('销售订单 SO-001')).toBeTruthy()
  })

  it('activates a selected task', () => {
    const onActivate = vi.fn()
    render(
      <EditorWorkspaceTabs
        activeKey="task-1"
        tasks={[
          task('task-1', '销售订单 SO-001'),
          task('task-2', '销售订单 SO-002'),
        ]}
        onActivate={onActivate}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('销售订单 SO-002'))
    expect(onActivate).toHaveBeenCalledWith('task-2')
  })

  it('marks dirty tasks and exposes the state to assistive technology', () => {
    render(
      <EditorWorkspaceTabs
        activeKey="task-1"
        tasks={[task('task-1', '销售订单 SO-001', 'dirty')]}
        onActivate={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('未保存')).toBeTruthy()
  })

  it('does not offer a close action while a task is saving', () => {
    render(
      <EditorWorkspaceTabs
        activeKey="task-1"
        tasks={[task('task-1', '销售订单 SO-001', 'saving')]}
        onActivate={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('关闭 销售订单 SO-001')).toBeNull()
    expect(screen.getByLabelText('正在保存')).toBeTruthy()
  })
})
