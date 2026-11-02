// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { ModuleLineItem } from '@/types/module-page'
import type {
  FreightStatementItemGroup,
  FreightStatementProjectGroup,
} from '@/views/modules/freight-statement-item-groups'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'

const group: FreightStatementItemGroup<ModuleLineItem> = {
  key: 'bill-1',
  sourceNo: '353135744191045632',
  billTime: '2026-11-01',
  totalQuantity: 18,
  totalWeightTon: 40.56,
  unitPrice: 12.5,
  totalFreight: 507,
  projectGroups: [],
}

const projectGroup: FreightStatementProjectGroup<ModuleLineItem> = {
  key: 'project-1',
  customerName: '浙江申援建设有限公司',
  projectName:
    '海宁市高新区启辉路西侧之江北路北侧地块项目（1#-20#楼、1#和2#配电房）',
  totalQuantity: 10,
  totalWeightTon: 10.081,
  items: [],
}

describe('物流对账单分组卡片头', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (node: React.ReactElement) => {
    act(() => {
      root.render(node)
    })
  }

  it('展示来源物流单单号与数量/重量/运费指标', () => {
    render(createElement(FreightStatementItemGroupHeader, { group }))

    const text = container.textContent ?? ''
    expect(text).toContain('来源物流单')
    expect(text).toContain('353135744191045632')
    expect(text).toContain('单据日期')
    expect(text).toContain('数量')
    expect(text).toContain('18')
    expect(text).toContain('重量')
    expect(text).toContain('40.560')
    expect(text).toContain('运费单价')
    expect(text).toContain('12.50')
    expect(text).toContain('运费总价')
    expect(text).toContain('507.00')
    expect(
      container.querySelector('.module-items-freight-group-title'),
    ).not.toBeNull()
  })

  it('单据日期有值时展示格式化日期', () => {
    render(createElement(FreightStatementItemGroupHeader, { group }))

    expect(container.textContent ?? '').toContain('单据日期')
    expect(container.textContent ?? '').toContain('2026年11月01日')
  })

  it('单据日期缺失时字段仍在、值为「-」，不同卡片的字段数量一致', () => {
    render(
      createElement(FreightStatementItemGroupHeader, {
        group: { ...group, billTime: '' },
      }),
    )

    const text = container.textContent ?? ''
    expect(text).toContain('单据日期')
    expect(text).toContain('-')
    expect(text).toContain('来源物流单')
  })

  it('项目小节头展示客户、项目与小计，项目全称保留在 title 里', () => {
    render(
      createElement(FreightStatementProjectGroupHeader, {
        group: projectGroup,
      }),
    )

    const text = container.textContent ?? ''
    expect(text).toContain('客户')
    expect(text).toContain('浙江申援建设有限公司')
    expect(text).toContain('项目')
    expect(text).toContain('小计')
    expect(text).toContain('10 件')
    expect(text).toContain('10.081')

    const projectName = container.querySelector(
      '.module-items-project-group-project',
    )
    expect(projectName?.getAttribute('title')).toBe(projectGroup.projectName)
  })

  it('showSubtotal=false 时不渲染小计', () => {
    render(
      createElement(FreightStatementProjectGroupHeader, {
        group: projectGroup,
        showSubtotal: false,
      }),
    )

    const text = container.textContent ?? ''
    expect(text).not.toContain('小计')
    expect(text).toContain('浙江申援建设有限公司')
  })
})
