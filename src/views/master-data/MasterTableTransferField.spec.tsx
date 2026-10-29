// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import { useState } from 'react'
import { MasterTableTransferField } from './MasterTableTransferField'

const OPTIONS = [
  { label: '中天', value: '中天' },
  { label: '永钢', value: '永钢' },
  { label: '镔鑫', value: '镔鑫' },
]

describe('经营品牌表格穿梭框', () => {
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
    document.body.innerHTML = ''
  })

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  function Harness() {
    const [value, setValue] = useState<string[]>(['永钢'])
    return (
      <>
        <MasterTableTransferField
          onChange={setValue}
          options={OPTIONS}
          value={value}
        />
        <span data-testid="value">{value.join(',')}</span>
      </>
    )
  }

  async function render() {
    await act(async () => {
      root.render(createElement(Harness))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const clickButton = async (label: string, scope: ParentNode = document) => {
    const button = [...scope.querySelectorAll('button')].find(
      (item) => (item.textContent ?? '').replace(/\s/g, '') === label,
    )
    expect(button, `未找到按钮 ${label}`).toBeTruthy()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  it('表单里显示已选品牌的标签', async () => {
    await render()
    expect(
      container.querySelector('.master-transfer-field')?.textContent,
    ).toContain('永钢')
    expect(container.textContent).toContain('选择品牌')
  })

  it('弹窗里用表格穿梭框：点行选中后确认回写表单', async () => {
    await render()
    await clickButton('选择品牌')

    const modal = document.querySelector('.ant-modal')
    expect(modal).not.toBeNull()
    // 左右两栏表格
    expect(document.querySelectorAll('.ant-transfer-section').length).toBe(2)

    const leftRow = [
      ...document.querySelectorAll('.ant-transfer-section tbody tr'),
    ].find((row) => row.textContent?.includes('中天'))
    await act(async () => {
      leftRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    // 选中后点中间的「›」把品牌移到右侧已选列表
    const moveButton = document.querySelector('.ant-transfer-actions button')
    expect(moveButton).toBeTruthy()
    await act(async () => {
      moveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    const okButton = [
      ...(document
        .querySelector('.ant-modal-footer')
        ?.querySelectorAll('button') ?? []),
    ].at(-1)
    await act(async () => {
      okButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    const value = container.querySelector('[data-testid="value"]')?.textContent
    expect(value).toContain('永钢')
    expect(value).toContain('中天')
  })

  it('品牌多时两栏定高、表体内部滚动，弹窗不被撑出视口', async () => {
    await render()
    await clickButton('选择品牌')

    // 两栏定高（styles.section）：品牌 30+ 条也不会让弹窗长高
    const sections = [...document.querySelectorAll('.ant-transfer-section')]
    expect(sections.length).toBe(2)
    for (const section of sections) {
      expect((section as HTMLElement).style.height).toBe('380px')
    }

    // 表体滚动：只有设置了 scroll.y 才会渲染 .ant-table-body
    const tableBodies = [
      ...document.querySelectorAll('.master-transfer .ant-table-body'),
    ] as HTMLElement[]
    expect(tableBodies.length).toBe(2)
    expect(tableBodies[0].style.maxHeight || tableBodies[0].style.height).toBe(
      '280px',
    )

    // 弹窗内容区限高，内容过多时整体可滚动而不是溢出视口
    const modalBody = document.querySelector('.ant-modal-body') as HTMLElement
    expect(modalBody.style.maxHeight).toContain('64vh')
    expect(modalBody.style.overflowY).toBe('auto')
  })

  it('取消不写回表单', async () => {
    await render()
    await clickButton('选择品牌')
    const leftRow = [
      ...document.querySelectorAll('.ant-transfer-section tbody tr'),
    ].find((row) => row.textContent?.includes('镔鑫'))
    await act(async () => {
      leftRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
    await clickButton('取消', document.querySelector('.ant-modal-footer')!)

    expect(container.querySelector('[data-testid="value"]')?.textContent).toBe(
      '永钢',
    )
  })
})
