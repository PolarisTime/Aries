// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { Form, Input } from 'antd'

/**
 * 主数据表单「长说明」的 antd 渲染前提。
 *
 * <p>说明文本落在 `extra` 上, 并由控件 `aria-describedby` 引用(读屏路径);
 * 标签旁的 ⓘ 是 antd 自己渲染的 `tabIndex=-1` span, **不可 Tab**. 因此纯键盘用户
 * 只能靠 workspace-overlay.css 里 `:focus-within` 的样式还原拿到说明 —— 这条断言就是
 * 那个 CSS 规则存在的前提, antd 若改成可聚焦图标则应同步复核该规则。</p>
 */

describe('主数据表单说明的 antd 渲染前提', () => {
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
  })

  it('说明落在 extra 上并由控件 aria-describedby 引用; ⓘ 不可 Tab', () => {
    const description = '长说明: 一句话及以上的字段解释'
    act(() => {
      root.render(
        createElement(
          Form,
          { className: 'master-form', layout: 'vertical' },
          createElement(
            Form.Item,
            {
              name: 'demo',
              label: '字段',
              tooltip: description,
              extra: description,
            },
            createElement(Input, { id: 'demo' }),
          ),
        ),
      )
    })
    const extra = container.querySelector('.master-form .ant-form-item-extra')
    expect(extra?.textContent).toBe(description)
    // 读屏路径: antd 把 extra 的 id 写进控件的 aria-describedby
    const input = container.querySelector<HTMLInputElement>('#demo')
    const describedBy = input?.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(extra?.id).toBe(describedBy)
    // 键盘路径的前提: 标签旁的 ⓘ 是 antd 自己的不可聚焦 span
    const icon = container.querySelector('.master-form .ant-form-item-tooltip')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('tabindex')).toBe('-1')
  })
})
