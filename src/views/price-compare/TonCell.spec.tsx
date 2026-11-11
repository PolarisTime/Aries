// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { TON_BUBBLE_CLASS, TonCell, type TonCellProps } from './TonCell'
import type { PriceRow } from './types'

const baseRow: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ton: 5,
}

/**
 * 报单吨位单元格的回归契约。
 *
 * <p>吨位是比价页里**唯一**的吨位字段: 已开/未开等采购进度口径随采购订单解耦一并移除,
 * 因此这里既锁定"吨位输入仍可用"(校验、可访问名、Tab 导航、锁定原因), 也锁定
 * "采购相关节点一个都不再渲染"(进度数字 / 明细图标 / 弹层)。</p>
 */
describe('TonCell 报单吨位输入', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    // antd 的浮层挂在 body 上: 不清理会让下一条用例命中上一条残留的气泡文案
    document.querySelectorAll('.ant-tooltip, .ant-popover').forEach((node) => {
      node.remove()
    })
    vi.clearAllMocks()
  })

  const render = (overrides: Partial<TonCellProps> = {}) => {
    const merged = {
      row: baseRow,
      rowId: 'r1',
      disabled: false,
      rowLockDisabled: false,
      lockReason: undefined as string | undefined,
      lockedClassName: undefined as string | undefined,
      onTonChange: vi.fn(),
      onMoveFocus: vi.fn(() => false),
      ...overrides,
    }
    act(() => {
      root.render(
        createElement(TonCell, {
          row: merged.row,
          rowId: merged.rowId,
          disabled: merged.disabled,
          rowLockDisabled: merged.rowLockDisabled,
          lockReason: merged.lockReason,
          lockedClassName: merged.lockedClassName,
          onTonChange: merged.onTonChange,
          onMoveFocus: merged.onMoveFocus,
        }),
      )
    })
    return merged
  }

  const tonInput = () =>
    container.querySelector<HTMLInputElement>('input[data-ton="r1"]')

  it('渲染吨位输入框并回显当前吨位, 不渲染任何采购相关节点', () => {
    render()
    const input = tonInput()
    expect(input).not.toBeNull()
    expect(input?.value).toBe('5')
    // 采购进度 / 明细入口 / ⓘ 弹层三类节点一律不再存在
    expect(container.querySelector('.price-compare-ton-progress')).toBeNull()
    expect(container.querySelector('.price-compare-ton-info')).toBeNull()
    expect(container.querySelector('.price-compare-ton-figure')).toBeNull()
    expect(container.querySelector('.price-compare-ton-issued')).toBeNull()
  })

  it('可访问名包含列名与该行商品文案', () => {
    render()
    expect(tonInput()?.getAttribute('aria-label')).toBe(
      '报单吨位，螺纹钢 HRB400E 12 9米',
    )
  })

  it('未选商品的行用占位说明填可访问名, 不留空标签', () => {
    render({
      row: { id: 'r2', category: '', material: '', spec: null, length: '' },
      rowId: 'r2',
    })
    expect(
      container
        .querySelector('input[data-ton="r2"]')
        ?.getAttribute('aria-label'),
    ).toContain('报单吨位')
    expect(
      container
        .querySelector('input[data-ton="r2"]')
        ?.getAttribute('aria-label'),
    ).not.toBe(' 报单吨位')
  })

  it('失焦提交合法吨位: 原样回传数值且不告警', () => {
    const props = render()
    const input = tonInput() as HTMLInputElement
    act(() => {
      input.value = '12.5'
      // React 的 onBlur 走 focusout 委托: 只派发原生 blur 不会触发处理器
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenCalledWith(12.5, false)
  })

  it('失焦时 0 / 负数告警(不写回), 由列层给 warning 文案', () => {
    const props = render()
    const input = tonInput() as HTMLInputElement
    act(() => {
      input.value = '0'
      // React 的 onBlur 走 focusout 委托: 只派发原生 blur 不会触发处理器
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenCalledWith(0, true)

    const negative = render()
    const negativeInput = tonInput() as HTMLInputElement
    act(() => {
      negativeInput.value = '-3'
      // React 的 onBlur 走 focusout 委托: 只派发原生 blur 不会触发处理器
      negativeInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(negative.onTonChange).toHaveBeenCalledWith(-3, true)
  })

  it('清空输入提交 undefined 且不告警(清空不是非法值)', () => {
    const props = render()
    const input = tonInput() as HTMLInputElement
    act(() => {
      input.value = ''
      // React 的 onBlur 走 focusout 委托: 只派发原生 blur 不会触发处理器
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenCalledWith(undefined, false)
  })

  it('回车提交不重复告警(告警只由失焦给出)', () => {
    const props = render()
    const input = tonInput() as HTMLInputElement
    act(() => {
      input.value = '8'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(props.onTonChange).toHaveBeenCalledWith(8, false)
  })

  it('列尾按 Tab 不吞键: 放行默认行为, 由浏览器把焦点移出本格', () => {
    const props = render({ onMoveFocus: vi.fn(() => false) })
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      tonInput()?.dispatchEvent(event)
    })
    expect(props.onMoveFocus).toHaveBeenCalledWith(1)
    // 关键: 没有 preventDefault, 否则单行单据时焦点会被永久锁死在吨位格
    expect(event.defaultPrevented).toBe(false)
  })

  it('列内可移动时拦截默认 Tab, 交给 moveFocus 处理', () => {
    const props = render({ onMoveFocus: vi.fn(() => true) })
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      tonInput()?.dispatchEvent(event)
    })
    expect(props.onMoveFocus).toHaveBeenCalledWith(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('Shift+Tab 反向移动, 边界同样放行', () => {
    const props = render({ onMoveFocus: vi.fn(() => false) })
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      tonInput()?.dispatchEvent(event)
    })
    expect(props.onMoveFocus).toHaveBeenCalledWith(-1)
    expect(event.defaultPrevented).toBe(false)
  })

  it('单据锁或行锁命中时输入只读', () => {
    render({ disabled: true })
    expect(tonInput()?.disabled).toBe(true)
    render({ disabled: false, rowLockDisabled: true })
    expect(tonInput()?.disabled).toBe(true)
  })

  it('只读且给了原因时, 锁定原因气泡带不透明气泡类名', async () => {
    render({
      disabled: true,
      lockReason: '该行已锁定，规格与吨位不可修改',
    })
    const wrap = container.querySelector(
      '.price-compare-ton-lock-reason',
    ) as HTMLElement
    expect(wrap).not.toBeNull()
    // 禁用输入框不派发 mouseenter: 气泡必须挂在外层包装上才有效
    await act(async () => {
      wrap.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(
      document.querySelector(`.ant-tooltip.${TON_BUBBLE_CLASS}`),
    ).not.toBeNull()
  })

  it('未锁定时不渲染锁定原因包装层(不误报只读)', () => {
    render()
    expect(container.querySelector('.price-compare-ton-lock-reason')).toBeNull()
  })
})
