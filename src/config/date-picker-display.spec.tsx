// @vitest-environment jsdom

import { ConfigProvider, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appAntdLocale } from './antd-locale'

/** RangePicker 依赖 ResizeObserver，jsdom 未实现（与其它用例一致地打桩）。 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)

/**
 * 日期选择器的展示口径：需求要求「系统内所有展示日期为 X年X月X日，月/日个位数补零」。
 *
 * <p>这里锁住最关键的一条：**不传 `format` 的选择器也必须显示中文口径**（rc-picker 的 locale
 * 兜底是 ISO `YYYY-MM-DD`，只靠组件逐处传 format 迟早会漂移），同时 TimePicker 的时间部分不受影响。</p>
 */
describe('日期选择器展示口径', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('未传 format 的日期选择器展示 X年X月X日, 月/日补零', async () => {
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          { locale: appAntdLocale },
          createElement(DatePicker, { value: dayjs('2026-03-02') }),
          createElement(DatePicker.RangePicker, {
            value: [dayjs('2026-09-01'), dayjs('2026-10-13')],
          }),
          createElement(DatePicker, {
            showTime: true,
            value: dayjs('2026-10-13 08:05:00'),
          }),
        ),
      )
      await Promise.resolve()
    })

    const values = Array.from(
      container.querySelectorAll<HTMLInputElement>('.ant-picker-input input'),
    ).map((input) => input.value)

    expect(values).toEqual([
      '2026年03月02日',
      '2026年09月01日',
      '2026年10月13日',
      '2026年10月13日 08:05:00',
    ])
  })

  it('显式传 format 的调用方仍以自己的格式为准', async () => {
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          { locale: appAntdLocale },
          createElement(DatePicker, {
            format: ['YYYY年MM月DD日', 'YYYY-MM-DD'],
            value: dayjs('2026-03-02'),
          }),
        ),
      )
      await Promise.resolve()
    })

    const input = container.querySelector<HTMLInputElement>(
      '.ant-picker-input input',
    )
    expect(input?.value).toBe('2026年03月02日')
  })
})
