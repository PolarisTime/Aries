// @vitest-environment jsdom

import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useMeasureRowA11y } from '@/hooks/useMeasureRowA11y'

/**
 * 等 rAF 合并后的接管落地。
 *
 * <p>hook 用 rAF 合并 MutationObserver 的连续回调。测试里「插入 DOM」与「等待」发生在
 * 同一个任务里，MutationObserver 的回调是微任务：它排在我们自己排的那帧**之后**，
 * 因此要连等两帧 —— 第二帧跑到的才是 hook 排进来的接管任务。</p>
 */
const settleFrames = async () => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

/** 构造 antd 真实渲染出来的测量行结构（aria-hidden + 0 高 + 克隆表头）。 */
function appendMeasureRow(host: HTMLElement) {
  const row = document.createElement('tr')
  row.className = 'ant-table-measure-row'
  row.setAttribute('aria-hidden', 'true')
  row.style.height = '0px'
  row.innerHTML = `
    <td><label class="ant-checkbox-wrapper"><span class="ant-checkbox"><input class="ant-checkbox-input" type="checkbox" aria-label="全选当前页所有行"></span></label></td>
    <td><span class="column-header-menu-trigger" role="button" tabindex="0">订单编号</span></td>
    <td><button type="button" class="column-header-menu-button">列操作</button></td>
  `
  host.querySelector('tbody')?.appendChild(row)
  return row
}

describe('useMeasureRowA11y', () => {
  let root: Root
  let container: HTMLDivElement
  let hostRef: { current: HTMLDivElement | null }

  function Probe() {
    const ref = useRef<HTMLDivElement | null>(null)
    hostRef = ref
    useMeasureRowA11y(ref)
    return createElement(
      'div',
      { ref, className: 'module-table-shell' },
      createElement(
        'table',
        { className: 'ant-table' },
        createElement('tbody', null),
      ),
    )
  }

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(createElement(Probe))
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  /** 读取测量行内仍留在 Tab 序列里的元素。 */
  const remainingFocusable = () => {
    // 判定「是否还在 Tab 序列里」必须同时看原生可聚焦性**与** tabindex：
    // `input`/`button` 被置 tabindex="-1" 后仍能匹配 `input:not([disabled])`，
    // 只查原生控件选择器会把已接管成功的元素误报成残留。
    const notDisabled = ':not([disabled]):not([tabindex="-1"])'
    const selector = [
      'a[href]:not([tabindex="-1"])',
      `button${notDisabled}`,
      `input${notDisabled}`,
      `select${notDisabled}`,
      `textarea${notDisabled}`,
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')
    return [
      ...(hostRef.current?.querySelectorAll(
        `.ant-table-measure-row ${selector}`,
      ) ?? []),
    ]
  }

  it('把测量行里的 tabindex=0 触发器、checkbox、button 全部退出 Tab 序列', async () => {
    const host = hostRef.current
    expect(host).toBeTruthy()
    const row = appendMeasureRow(host as HTMLDivElement)
    expect(
      remainingFocusable(),
      '前置条件：新插入的测量行确实可聚焦',
    ).toHaveLength(3)

    await act(async () => {
      await settleFrames()
    })

    expect(remainingFocusable(), '测量行内不得残留可聚焦元素').toHaveLength(0)
    expect(
      row
        .querySelector('.column-header-menu-trigger')
        ?.getAttribute('tabindex'),
    ).toBe('-1')
    expect(
      row.querySelector('.ant-checkbox-input')?.getAttribute('tabindex'),
      '没有 tabindex 属性的原生 checkbox 也必须被接管',
    ).toBe('-1')
    expect(row.querySelector('button')?.getAttribute('tabindex')).toBe('-1')
  })

  it('测量行被重建（rc-table 重渲染）后 MutationObserver 会重新接管', async () => {
    const host = hostRef.current as HTMLDivElement
    appendMeasureRow(host)
    await act(async () => {
      await settleFrames()
    })
    expect(remainingFocusable()).toHaveLength(0)

    // 模拟 antd 重建测量行（旧节点整体替换，新节点的 tabindex 又回到 0）
    host.querySelector('.ant-table-measure-row')?.remove()
    appendMeasureRow(host)
    expect(remainingFocusable(), '重建后的新行初始是可聚焦的').toHaveLength(3)

    await act(async () => {
      await settleFrames()
    })
    expect(remainingFocusable(), '观察器必须重夺').toHaveLength(0)
  })

  it('被改回 tabindex=0 时重夺，不留下停靠点', async () => {
    const host = hostRef.current as HTMLDivElement
    const row = appendMeasureRow(host)
    await act(async () => {
      await settleFrames()
    })

    // rc-tabs/rc-table 之类的受控属性会被上游写回
    await act(async () => {
      row.querySelectorAll('[tabindex]').forEach((element) => {
        element.setAttribute('tabindex', '0')
      })
      await settleFrames()
    })

    expect(remainingFocusable()).toHaveLength(0)
  })

  it('不影响测量行之外的同名元素（真实表头仍可聚焦）', async () => {
    const host = hostRef.current as HTMLDivElement
    const realRow = document.createElement('tr')
    realRow.className = 'ant-table-row'
    realRow.innerHTML =
      '<td><span class="column-header-menu-trigger" role="button" tabindex="0">订单编号</span></td>'
    host.querySelector('tbody')?.appendChild(realRow)
    appendMeasureRow(host)

    await act(async () => {
      await settleFrames()
    })

    expect(
      realRow
        .querySelector('.column-header-menu-trigger')
        ?.getAttribute('tabindex'),
      '真实表头的触发器必须保持可聚焦',
    ).toBe('0')
  })
})
