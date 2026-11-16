// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useState } from 'react'
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

  /**
   * 受控输入的真实键入模拟：必须走原生 setter 再派发 input 事件，
   * React 的 value tracker 才会认为「用户改了值」并触发 onChange（直接赋值会被当成没变）。
   */
  const typeTon = (input: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  /**
   * 有状态父级：像真实页面一样在 onTonChange 后把值回写到 row.ton（ton-column 的 patchRow）。
   *
   * <p>S3 / S4 / S5 都只在「父级回写后重渲染」这条真实路径上才暴露：
   * 旧实现 `key` 含 row.ton，回写即重挂载 —— 焦点掉到 body、后续失焦提交被吞。</p>
   */
  const renderStateful = (
    initialTon: number | undefined = 5,
    onMoveFocus: TonCellProps['onMoveFocus'] = vi.fn(() => false),
  ) => {
    const onTonChange = vi.fn()
    const StatefulTonCell = () => {
      const [ton, setTon] = useState<number | undefined>(initialTon)
      return createElement(TonCell, {
        row: { ...baseRow, ton },
        rowId: 'r1',
        disabled: false,
        rowLockDisabled: false,
        onTonChange: (value, warnPositive) => {
          onTonChange(value, warnPositive)
          if (!warnPositive) setTon(value)
        },
        onMoveFocus,
      })
    }
    act(() => {
      root.render(createElement(StatefulTonCell))
    })
    return { onTonChange, onMoveFocus }
  }

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
      typeTon(input, '12.5')
      // React 的 onBlur 走 focusout 委托: 只派发原生 blur 不会触发处理器
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenCalledWith(12.5, false)
  })

  it('失焦时 0 / 负数不写回：回调给 undefined + 告警标记，输入框还原并标红', () => {
    const props = render()
    const input = tonInput() as HTMLInputElement
    act(() => {
      typeTon(input, '0')
      // React 的 onBlur 走 focusout 委托: 只派发原生 blur 不会触发处理器
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenCalledWith(undefined, true)
    // 受控 value 必须自己回退，否则格子显示 0、合计按旧值算
    expect((tonInput() as HTMLInputElement).value).toBe('5')
    expect((tonInput() as HTMLInputElement).className).toContain(
      'ant-input-status-error',
    )
    expect((tonInput() as HTMLInputElement).getAttribute('aria-invalid')).toBe(
      'true',
    )

    act(() => {
      typeTon(input, '-3')
      // React 的 onBlur 走 focusout 委托: 只派发原生 blur 不会触发处理器
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenLastCalledWith(undefined, true)
    expect((tonInput() as HTMLInputElement).value).toBe('5')
  })

  it('清空输入提交 undefined 且不告警(清空不是非法值)', () => {
    const props = render()
    const input = tonInput() as HTMLInputElement
    act(() => {
      typeTon(input, '')
      // React 的 onBlur 走 focusout 委托: 只派发原生 blur 不会触发处理器
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenCalledWith(undefined, false)
  })

  it('回车提交合法吨位：原样回传，随后的失焦不重复提交', () => {
    const props = render()
    const input = tonInput() as HTMLInputElement
    act(() => {
      typeTon(input, '8')
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(props.onTonChange).toHaveBeenCalledWith(8, false)

    act(() => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenCalledTimes(1)
  })

  /*
   * 用户实测（2026-11-16）：吨位格输入 -3 按回车，合计变成「合计 -3」，
   * 并发出 PUT /quote-sheets/{id}/items/{itemId} 带 "ton":-3。
   * 根因是回车路径把 warnPositive 写死成 false，等于跳过校验。
   */
  it('回车与失焦同一套校验：负数回车不写回，且输入框还原', () => {
    const props = render()
    const input = tonInput() as HTMLInputElement
    act(() => {
      typeTon(input, '-3')
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(props.onTonChange).toHaveBeenCalledWith(undefined, true)
    expect(props.onTonChange).not.toHaveBeenCalledWith(-3, expect.anything())
    expect((tonInput() as HTMLInputElement).value).toBe('5')
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

  /*
   * 以下三条对应用户实测场景（2026-11-16，HANDOFF R2）：
   * - S3：输入 -3 按回车，格内仍残留 -3（直接改 DOM 回滚，被 antd 内部 value 写回）。
   * - S4：回车后再改值，失焦不提交（key 含 row.ton → 重挂载；skipBlurCommitRef 残留吞掉下一次失焦）。
   * - S5：回车后焦点掉到 body（同一次重挂载）。
   * 三条都必须在「父级把值回写到 row.ton 并重渲染」的真实路径上验证，静态 props 测不出来。
   */
  it('S3 回车提交负数被拒：格内还原成已提交值，不残留 -3', () => {
    const props = renderStateful()
    const input = tonInput() as HTMLInputElement
    act(() => {
      input.focus()
      typeTon(input, '-3')
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(props.onTonChange).toHaveBeenCalledWith(undefined, true)
    expect(props.onTonChange).not.toHaveBeenCalledWith(-3, expect.anything())
    const restored = tonInput() as HTMLInputElement
    expect(restored.value).toBe('5')
    expect(restored.className).toContain('ant-input-status-error')
    expect(restored.getAttribute('aria-invalid')).toBe('true')
    // 旧实现重挂载会让焦点掉到 body；受控后本格不卸载，焦点留在输入框
    expect(document.activeElement).toBe(restored)
  })

  it('S4/S5 回车提交后不重挂载：焦点留在本格，随后改值失焦仍提交', () => {
    const props = renderStateful()
    const input = tonInput() as HTMLInputElement
    act(() => {
      input.focus()
      typeTon(input, '8')
    })
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(props.onTonChange).toHaveBeenNthCalledWith(1, 8, false)
    // 父级回写 row.ton=8 后仍应是同一个 DOM 节点（key 不含 row.ton），焦点不能掉到 body（S5）
    const afterEnter = tonInput() as HTMLInputElement
    expect(afterEnter).toBe(input)
    expect(afterEnter.value).toBe('8')
    expect(document.activeElement).toBe(afterEnter)

    // 回车后继续改值 → 失焦必须仍然提交（旧实现 skipBlurCommitRef 残留会吞掉这次提交，S4）
    act(() => {
      typeTon(afterEnter, '7')
    })
    act(() => {
      afterEnter.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onTonChange).toHaveBeenLastCalledWith(7, false)
    expect((tonInput() as HTMLInputElement).value).toBe('7')
  })

  it('回车提交后调用 onMoveFocus(1) 下移；同步 blur 不会重复提交同一格', () => {
    // 真实浏览器里 onMoveFocus 会 focus 下一行 → 同步触发本格 blur。
    // 这里用外部 input 复现这个顺序，锁定「回车只提交一次」。
    const nextInput = document.createElement('input')
    document.body.appendChild(nextInput)
    const onMoveFocus = vi.fn(() => {
      nextInput.focus()
      return true
    })
    const props = renderStateful(5, onMoveFocus)
    const input = tonInput() as HTMLInputElement
    act(() => {
      input.focus()
      typeTon(input, '8')
    })
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(onMoveFocus).toHaveBeenCalledWith(1)
    expect(props.onTonChange).toHaveBeenCalledTimes(1)
    expect(props.onTonChange).toHaveBeenCalledWith(8, false)
    expect(document.activeElement).toBe(nextInput)
    nextInput.remove()
  })
})
