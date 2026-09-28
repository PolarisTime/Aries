// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { buildRowContextMenus, isEditableFieldTarget } from './row-context-menu'
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

  it('传入 onMenuOpen 时 config.onOpen 触发并携带该行', () => {
    const onMenuOpen = vi.fn()
    const menus = buildRowContextMenus({
      ...params(() => [{ key: 'view', label: '查看明细', onClick: vi.fn() }]),
      onMenuOpen,
    })
    expect(typeof menus.get('1')?.onOpen).toBe('function')
    expect(onMenuOpen).not.toHaveBeenCalled()

    menus.get('2')?.onOpen?.()
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
    expect(onMenuOpen).toHaveBeenCalledWith(RECORDS[1])
  })

  it('未传 onMenuOpen 时 config 不带 onOpen(保持既有配置形状)', () => {
    const menus = buildRowContextMenus(
      params(() => [{ key: 'view', label: '查看明细', onClick: vi.fn() }]),
    )
    expect(menus.get('1')).not.toHaveProperty('onOpen')
  })
})

/**
 * 行菜单"是否放行原生右键"的判定: 只有**正在编辑**的文本/数字输入控件或下拉
 * 才需要浏览器原生菜单(粘贴/全选); 其余(含已禁用/只读控件、选择框)一律走行菜单。
 */
describe('isEditableFieldTarget 右键目标判定', () => {
  function mount(html: string): HTMLElement {
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)
    return host
  }

  /** 取容器内第一个匹配元素作为事件目标。 */
  function targetOf(html: string, selector: string): Element {
    const host = mount(html)
    const node = host.querySelector(selector)
    if (!node) throw new Error(`未找到 ${selector}`)
    return node
  }

  it('非元素/无控件命中时返回 false', () => {
    expect(isEditableFieldTarget(null)).toBe(false)
    const host = mount('<span class="plain">纯文本</span>')
    expect(isEditableFieldTarget(host.querySelector('.plain'))).toBe(false)
  })

  it('可编辑文本输入返回 true(保留粘贴/全选)', () => {
    expect(
      isEditableFieldTarget(targetOf('<input class="t" type="text" />', '.t')),
    ).toBe(true)
  })

  it('禁用或只读的输入返回 false(已不可编辑, 应走行菜单)', () => {
    expect(
      isEditableFieldTarget(
        targetOf('<input class="d" type="text" disabled />', '.d'),
      ),
    ).toBe(false)
    expect(
      isEditableFieldTarget(
        targetOf('<input class="r" type="text" readonly />', '.r'),
      ),
    ).toBe(false)
  })

  it('数字输入(type=number)按可编辑状态判定', () => {
    expect(
      isEditableFieldTarget(
        targetOf('<input class="n" type="number" />', '.n'),
      ),
    ).toBe(true)
    expect(
      isEditableFieldTarget(
        targetOf('<input class="nd" type="number" disabled />', '.nd'),
      ),
    ).toBe(false)
  })

  it('选择框/单选框不属于文本输入: 即使可点也走行菜单', () => {
    expect(
      isEditableFieldTarget(
        targetOf('<input class="c" type="checkbox" />', '.c'),
      ),
    ).toBe(false)
    expect(
      isEditableFieldTarget(
        targetOf('<input class="rd" type="radio" />', '.rd'),
      ),
    ).toBe(false)
  })

  it('textarea 按可编辑状态判定', () => {
    expect(
      isEditableFieldTarget(
        targetOf('<textarea class="ta"></textarea>', '.ta'),
      ),
    ).toBe(true)
    expect(
      isEditableFieldTarget(
        targetOf('<textarea class="tad" disabled></textarea>', '.tad'),
      ),
    ).toBe(false)
  })

  it('contenteditable=true 视为可编辑', () => {
    expect(
      isEditableFieldTarget(
        targetOf('<div class="ce" contenteditable="true"></div>', '.ce'),
      ),
    ).toBe(true)
  })

  it('antd 下拉/数字输入以内层 input 的可编辑状态为准', () => {
    const enabled = targetOf(
      '<div class="ant-select"><span class="ant-select-content"><input class="si" /></span></div>',
      '.si',
    )
    expect(isEditableFieldTarget(enabled)).toBe(true)

    const disabledInner = targetOf(
      '<div class="ant-select ant-select-disabled"><input class="sd" disabled /></div>',
      '.sd',
    )
    expect(isEditableFieldTarget(disabledInner)).toBe(false)

    const disabledHost = targetOf(
      '<div class="ant-select ant-select-disabled"><span class="host">x</span></div>',
      '.host',
    )
    expect(isEditableFieldTarget(disabledHost)).toBe(false)
  })

  it('命中子元素时按最近的控件祖先判定', () => {
    const icon = targetOf(
      '<div class="ant-input-number"><span class="icon">+</span></div>',
      '.icon',
    )
    expect(isEditableFieldTarget(icon)).toBe(true)
  })

  it('无内层 input 的 antd 控件(纯展示下拉)视为可操作控件', () => {
    expect(
      isEditableFieldTarget(
        targetOf(
          '<div class="ant-select"><span class="lbl">全部</span></div>',
          '.lbl',
        ),
      ),
    ).toBe(true)
  })
})
