// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ProjectConfigModal } from './ProjectConfigModal'
import type { ProjectConfig } from './types'

/**
 * 比价「配置」弹层：**品牌只读、只写运费**。
 *
 * <p>2026-11-16 定稿：品牌/品种/规格/加价/代取/指定品牌只在项目资料维护，
 * 弹层里不应再出现增删品牌、品类、商品等控件；保存回调只带回运费变化。</p>
 */

const config = (): ProjectConfig => ({
  brands: [
    { name: '中天', freight: 30 },
    { name: '沙钢', freight: 25 },
  ],
  lengthPremium: 30,
  hrb400eFallback: false,
})

describe('ProjectConfigModal：品牌只读 + 只写运费', () => {
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

  afterEach(async () => {
    act(() => root.unmount())
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    })
    container.remove()
  })

  const render = (onSave = vi.fn()) => {
    act(() => {
      root.render(
        createElement(ProjectConfigModal, {
          config: config(),
          onClose: () => {},
          onSave,
          open: true,
        }),
      )
    })
    return onSave
  }

  it('品牌来自服务端配置且只读：只有品牌名与运费输入，没有增删/品类/商品控件', () => {
    render()
    const rows = document.querySelectorAll('.pc-brand-row')
    expect(rows).toHaveLength(2)
    expect(
      Array.from(document.querySelectorAll('.pc-brand-name')).map(
        (node) => node.textContent,
      ),
    ).toEqual(['中天', '沙钢'])
    // 每个品牌只有运费一个输入框
    expect(document.querySelectorAll('.pc-freight-input')).toHaveLength(2)
    // 删除品牌 / 添加品牌 / 品类 / 商品区一律不存在（配置点已归并到项目资料）
    expect(document.querySelector('[aria-label="Remove brand"]')).toBeNull()
    expect(document.querySelectorAll('.pc-remove-brand')).toHaveLength(0)
    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(0)
  })

  it('运费列有明确口径：列头「品牌 / 运费(元/吨)」，输入框后缀单位，顶部说明运费计入比价', () => {
    render()
    const head = document.querySelector('.pc-freight-head')
    expect(head?.textContent).toContain(
      i18n.t('priceCompare.config.freightColumnBrand'),
    )
    // 列头写清「运费(元/吨)」，不再是一排没有口径的数字
    expect(head?.textContent).toContain('运费(元/吨)')
    // 输入框内还有单位后缀，截屏/打印时也能看出量纲
    expect(
      document.querySelectorAll('.pc-freight-unit').length,
    ).toBeGreaterThan(0)
    expect(document.body.textContent ?? '').toContain(
      i18n.t('priceCompare.config.freightIntro'),
    )
    // 列头不算数据行：品牌行仍是 2 条
    expect(document.querySelectorAll('.pc-brand-row')).toHaveLength(2)
  })

  it('顶部提示与「去项目资料维护」入口', () => {
    render()
    const text = document.body.textContent ?? ''
    expect(text).toContain(i18n.t('priceCompare.config.freightOnlyHint'))
    const link = document.querySelector('.price-compare-config-goto-project')
    expect(link?.getAttribute('href')).toBe('/project')
  })

  it('保存只带回运费：其它配置字段保持调用方传入的值', () => {
    const onSave = render()
    // 直接触发 antd Modal 的确定按钮（文案为「保存」）
    const okButton = Array.from(
      document.querySelectorAll('.ant-modal-footer button'),
    ).find((button) => (button.textContent ?? '').includes('保'))
    if (!okButton) throw new Error('未找到弹层的保存按钮')
    act(() => {
      ;(okButton as HTMLButtonElement).click()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0]?.[0] as ProjectConfig
    expect(saved.brands.map((brand) => brand.name)).toEqual(['中天', '沙钢'])
    expect(saved.brands.map((brand) => brand.freight)).toEqual([30, 25])
    expect(saved.lengthPremium).toBe(30)
    expect(saved.hrb400eFallback).toBe(false)
  })

  it('没有品牌时不渲染运费行，而是给出空态提示', () => {
    act(() => {
      root.render(
        createElement(ProjectConfigModal, {
          config: { brands: [], lengthPremium: 0, hrb400eFallback: false },
          onClose: () => {},
          onSave: vi.fn(),
          open: true,
        }),
      )
    })
    expect(document.querySelectorAll('.pc-brand-row')).toHaveLength(0)
    expect(document.body.textContent).toContain(
      i18n.t('priceCompare.config.noBrands'),
    )
  })
})
