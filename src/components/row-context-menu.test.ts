import { describe, expect, it, vi } from 'vitest'
import { buildRowContextMenus } from './row-context-menu'
import type { ActionItem } from './TableActions'

interface Row {
  id: string
  no: string
}

const RECORDS: Row[] = [
  { id: '1', no: 'PO-1' },
  { id: '2', no: 'PO-2' },
]

const params = (
  buildActions: (row: Row) => ActionItem[],
  requestConfirm = vi.fn(),
) => ({
  records: RECORDS,
  buildActions,
  labelOf: (row: Row) => row.no,
  ariaLabelOf: (label: string) => `「${label}」行操作菜单`,
  okText: '确定',
  cancelText: '取消',
  requestConfirm,
})

describe('buildRowContextMenus', () => {
  it('按行 key 生成菜单, 可访问名带行标识', () => {
    const menus = buildRowContextMenus(
      params(() => [{ key: 'view', label: '查看明细', onClick: vi.fn() }]),
    )
    expect([...menus.keys()]).toEqual(['1', '2'])
    expect(menus.get('2')?.ariaLabel).toBe('「PO-2」行操作菜单')
  })

  it('菜单项与可见按钮同源: label/disabled/danger 原样透传', () => {
    const menus = buildRowContextMenus(
      params(() => [
        { key: 'view', label: '查看明细', onClick: vi.fn() },
        { key: 'edit', label: '编辑', disabled: true, onClick: vi.fn() },
        { key: 'remove', label: '删除', danger: true, onClick: vi.fn() },
      ]),
    )
    expect(menus.get('1')?.items).toEqual([
      {
        key: 'view',
        label: '查看明细',
        icon: undefined,
        danger: undefined,
        disabled: undefined,
      },
      {
        key: 'edit',
        label: '编辑',
        icon: undefined,
        danger: undefined,
        disabled: true,
      },
      {
        key: 'remove',
        label: '删除',
        icon: undefined,
        danger: true,
        disabled: undefined,
      },
    ])
  })

  it('visible=false 的动作不进菜单; 全部不可见时该行不生成菜单', () => {
    const menus = buildRowContextMenus(
      params((row) =>
        row.id === '2'
          ? [
              {
                key: 'hidden',
                label: '隐藏动作',
                visible: false,
                onClick: vi.fn(),
              },
            ]
          : [{ key: 'view', label: '查看明细', onClick: vi.fn() }],
      ),
    )
    expect([...menus.keys()]).toEqual(['1'])
  })

  it('点击菜单项执行对应动作(与按钮同一回调)', () => {
    const onView = vi.fn()
    const onEdit = vi.fn()
    const menus = buildRowContextMenus(
      params(() => [
        { key: 'view', label: '查看明细', onClick: onView },
        { key: 'edit', label: '编辑', onClick: onEdit },
      ]),
    )
    menus.get('1')?.onClick?.({ key: 'edit' } as never)
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onView).not.toHaveBeenCalled()
  })

  it('禁用项点击无副作用', () => {
    const onEdit = vi.fn()
    const menus = buildRowContextMenus(
      params(() => [
        { key: 'edit', label: '编辑', disabled: true, onClick: onEdit },
      ]),
    )
    menus.get('1')?.onClick?.({ key: 'edit' } as never)
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('带 confirm 的动作走二次确认, 确认后才执行', () => {
    const onDelete = vi.fn()
    const requestConfirm = vi.fn()
    const menus = buildRowContextMenus(
      params(
        () => [
          {
            key: 'remove',
            label: '删除',
            danger: true,
            confirm: '删除该单据？',
            onClick: onDelete,
          },
        ],
        requestConfirm,
      ),
    )
    menus.get('1')?.onClick?.({ key: 'remove' } as never)
    expect(onDelete).not.toHaveBeenCalled()
    expect(requestConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '删除该单据？',
        okText: '确定',
        cancelText: '取消',
        danger: true,
      }),
    )
    requestConfirm.mock.calls[0]?.[0]?.onOk?.()
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('未知 key 不抛错也不执行任何动作', () => {
    const onView = vi.fn()
    const menus = buildRowContextMenus(
      params(() => [{ key: 'view', label: '查看明细', onClick: onView }]),
    )
    expect(() =>
      menus.get('1')?.onClick?.({ key: 'nope' } as never),
    ).not.toThrow()
    expect(onView).not.toHaveBeenCalled()
  })
})
