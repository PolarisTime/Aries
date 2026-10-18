// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { SaveResultFieldSummary } from './SaveResultFieldSummary'
import {
  resolveSummaryDisplayNameKey,
  resolveSummaryDisplayValue,
} from './save-result-field-values'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

/**
 * P1-5 回归：回执的「客户名称 / 项目名称」必须显示名字，不是雪花 ID。
 *
 * <p>用「ID 与名字不同」的数据锁定 —— 两者恰好同值时，仍然渲染 ID 的实现也会绿，
 * 那正是漏掉分叉的假绿。</p>
 */
const CUSTOMER_ID = '333229770902872064'
const PROJECT_ID = '334872390498512896'

const config = {
  key: 'sales-order',
  title: '销售订单',
  formFields: [
    { key: 'orderNo', label: '订单编号', type: 'input' },
    { key: 'customerId', label: '客户名称', type: 'select' },
    { key: 'projectId', label: '项目名称', type: 'select' },
    { key: 'remark', label: '备注', type: 'input' },
  ],
} as unknown as ModulePageConfig

describe('resolveSummaryDisplayNameKey', () => {
  it('外键字段映射到同名 Name 字段', () => {
    expect(resolveSummaryDisplayNameKey('customerId')).toBe('customerName')
    expect(resolveSummaryDisplayNameKey('projectId')).toBe('projectName')
    expect(resolveSummaryDisplayNameKey('settlementCompanyId')).toBe(
      'settlementCompanyName',
    )
  })

  it('非外键字段没有显示名映射', () => {
    expect(resolveSummaryDisplayNameKey('orderNo')).toBe('')
    expect(resolveSummaryDisplayNameKey('id')).toBe('')
    expect(resolveSummaryDisplayNameKey('ids')).toBe('')
  })
})

describe('resolveSummaryDisplayValue', () => {
  it('优先取显示名', () => {
    const record = {
      customerId: CUSTOMER_ID,
      customerName: '浙江景华建设有限公司',
    }
    expect(resolveSummaryDisplayValue(record, 'customerId')).toBe(
      '浙江景华建设有限公司',
    )
  })

  it('显示名为空白时回退原值（雪花 ID 是刻意保留的设计，不能让整行消失）', () => {
    expect(
      resolveSummaryDisplayValue({ customerId: CUSTOMER_ID }, 'customerId'),
    ).toBe(CUSTOMER_ID)
    expect(
      resolveSummaryDisplayValue(
        { customerId: CUSTOMER_ID, customerName: '   ' },
        'customerId',
      ),
    ).toBe(CUSTOMER_ID)
  })

  it('非外键字段原样返回', () => {
    expect(resolveSummaryDisplayValue({ orderNo: 'SO-1' }, 'orderNo')).toBe(
      'SO-1',
    )
  })
})

describe('SaveResultFieldSummary 渲染', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
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

  const render = (record: object) => {
    act(() => {
      root.render(createElement(SaveResultFieldSummary, { config, record }))
    })
    return container.textContent || ''
  }

  it('回执里出现客户名与项目名，且不出现 19 位雪花 ID', () => {
    const text = render({
      orderNo: 'SO-20261014-001',
      customerId: CUSTOMER_ID,
      customerName: '浙江景华建设有限公司',
      projectId: PROJECT_ID,
      projectName: '海宁市袁花镇稻米加工中心项目',
    })
    expect(text).toContain('客户名称：浙江景华建设有限公司')
    expect(text).toContain('项目名称：海宁市袁花镇稻米加工中心项目')
    expect(text).not.toContain(CUSTOMER_ID)
    expect(text).not.toContain(PROJECT_ID)
  })

  it('订单编号等非外键字段照旧显示', () => {
    const text = render({ orderNo: 'SO-20261014-001', customerId: CUSTOMER_ID })
    expect(text).toContain('订单编号：SO-20261014-001')
  })

  it('空值字段照旧跳过，不渲染空行', () => {
    const text = render({ orderNo: 'SO-1', remark: '' })
    expect(text).toContain('订单编号')
    expect(text).not.toContain('备注')
  })
})
