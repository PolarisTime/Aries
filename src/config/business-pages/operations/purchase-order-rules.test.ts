import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/DocumentReferenceStatusIcons', () => ({
  DocumentReferenceStatusIcons: () => null,
}))

import { isValidElement, type ReactElement } from 'react'
import type { DocumentReferenceStatus } from '@/components/DocumentReferenceStatusIcons'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildPurchaseOrderOverview,
  renderPurchaseOrderActualAmount,
  renderPurchaseOrderAmountDifference,
  renderPurchaseOrderNo,
  renderPurchaseOrderReceiptProgress,
  renderPurchaseOrderTotalAmount,
  renderPurchaseOrderWeightVariance,
} from './purchase-order-rules'

interface IconsElementProps {
  statuses: readonly DocumentReferenceStatus[]
}

/**
 * `renderPurchaseOrderNo` 只负责创建元素树（不渲染），因此直接从返回的
 * React 元素中读取传给 `DocumentReferenceStatusIcons` 的 `statuses`。
 */
function capturedStatuses(node: unknown): readonly DocumentReferenceStatus[] {
  if (!isValidElement(node)) {
    throw new Error('renderPurchaseOrderNo 应返回 React 元素')
  }
  const children = (node.props as { children?: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  const icons = list.find(
    (child): child is ReactElement<IconsElementProps> =>
      isValidElement(child) &&
      Array.isArray((child.props as { statuses?: unknown }).statuses),
  )
  if (!icons) {
    throw new Error('未找到引用状态组件')
  }
  return icons.props.statuses
}

describe('purchase-order-rules', () => {
  it('空行集合返回零值概览', () => {
    const overview = buildPurchaseOrderOverview([])
    expect(overview).toHaveLength(3)
    expect(overview.every((item) => String(item.value).startsWith('0'))).toBe(
      true,
    )
  })

  it('汇总订单金额', () => {
    const overview = buildPurchaseOrderOverview([
      { totalAmount: 100.5 },
      { totalAmount: 200 },
    ] as unknown as ModuleRecord[])
    expect(String(overview[2].value)).toContain('300.50')
  })

  it('renderPurchaseOrderNo 返回 React 元素', () => {
    const node = renderPurchaseOrderNo('PO-1', {
      id: '1932500000000000001',
      referencedBySalesOrder: true,
    })
    expect(node).toBeTruthy()
    expect(node).toHaveProperty('props')
  })

  it('同时传入销售订单与采购入库两个引用状态', () => {
    const node = renderPurchaseOrderNo('PO-1', {
      id: '1932500000000000001',
      referencedBySalesOrder: true,
      referencedByPurchaseInbound: false,
    })

    const statuses = capturedStatuses(node)
    expect(statuses.map((status) => status.key)).toEqual([
      'sales-order',
      'purchase-inbound',
    ])
    expect(statuses.map((status) => status.label)).toEqual([
      '已被销售订单引用',
      '已被采购入库引用',
    ])
  })

  it('两个引用状态按记录取值透传', () => {
    const node = renderPurchaseOrderNo('PO-1', {
      id: '1932500000000000001',
      referencedBySalesOrder: false,
      referencedByPurchaseInbound: true,
    })

    const statuses = capturedStatuses(node)
    expect(
      statuses.find((status) => status.key === 'sales-order'),
    ).toMatchObject({ referenced: false })
    expect(
      statuses.find((status) => status.key === 'purchase-inbound'),
    ).toMatchObject({ referenced: true })
  })

  it('缺失引用字段时按未引用处理', () => {
    const node = renderPurchaseOrderNo('PO-1', { id: '1932500000000000001' })

    const statuses = capturedStatuses(node)
    expect(statuses.every((status) => status.referenced === false)).toBe(true)
  })
})

/** 递归收集 React 元素树中的字符串片段，便于断言 Tag / span 的可见文本。 */
function collectText(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join('')
  }
  if (isValidElement(node)) {
    return collectText((node.props as { children?: unknown }).children)
  }
  return ''
}

/** 读取元素上的 Tooltip 标题（强制结单说明）。 */
function elementTitle(node: unknown): string {
  if (!isValidElement(node)) {
    return ''
  }
  const title = (node.props as { title?: unknown }).title
  return typeof title === 'string' ? title : ''
}

describe('采购订单金额与进度派生渲染', () => {
  it('总金额渲染附带「暂定」标签', () => {
    const node = renderPurchaseOrderTotalAmount(1234.5)
    expect(collectText(node)).toContain('1,234.50')
    expect(collectText(node)).toContain('暂定')
  })

  it('实际货值按金额格式化，空值回落短横线', () => {
    expect(renderPurchaseOrderActualAmount(2000)).toBe('2,000.00')
    expect(renderPurchaseOrderActualAmount('2500.5')).toBe('2,500.50')
    expect(renderPurchaseOrderActualAmount(null)).toBe('-')
    expect(renderPurchaseOrderActualAmount(undefined)).toBe('-')
  })

  it('差额正数显示需补款标识，负数显示需退款标识并取绝对值', () => {
    const pay = renderPurchaseOrderAmountDifference(100)
    expect(collectText(pay)).toContain('需补款')
    expect(collectText(pay)).toContain('100.00')

    const refund = renderPurchaseOrderAmountDifference(-250.5)
    expect(collectText(refund)).toContain('需退款')
    expect(collectText(refund)).toContain('250.50')
    expect(collectText(refund)).not.toContain('-250')
  })

  it('差额为零显示原值，空值回落短横线', () => {
    expect(renderPurchaseOrderAmountDifference(0)).toBe('0.00')
    expect(renderPurchaseOrderAmountDifference(null)).toBe('-')
  })

  it('入库进度按书面表述推导未入库、部分入库与已全部入库', () => {
    const notStarted = collectText(
      renderPurchaseOrderReceiptProgress(0, {
        totalRemainingQuantity: 8,
      } as unknown as ModuleRecord),
    )
    expect(notStarted).toContain('未入库')
    expect(notStarted).toContain('已入库 0 / 8')

    const partial = collectText(
      renderPurchaseOrderReceiptProgress(7, {
        totalRemainingQuantity: 1,
      } as unknown as ModuleRecord),
    )
    expect(partial).toContain('部分入库')
    expect(partial).toContain('已入库 7 / 8')

    const done = collectText(
      renderPurchaseOrderReceiptProgress(8, {
        totalRemainingQuantity: 0,
      } as unknown as ModuleRecord),
    )
    // 收满时只给状态: 「已全部入库」已含收满之意, 不重复 "已入库 8 / 8"
    expect(done).toContain('已全部入库')
    expect(done).not.toContain('8 / 8')
  })

  it('入库进度两项均缺失时回落短横线', () => {
    expect(
      renderPurchaseOrderReceiptProgress(null, {} as unknown as ModuleRecord),
    ).toBe('-')
  })

  it('强制结单的订单入库进度显示强制结单标记, 并带出作废件数/操作人/原因', () => {
    const rendered = renderPurchaseOrderReceiptProgress(0, {
      totalRemainingQuantity: 0,
      forceClose: {
        reason: '剩余 1 件报废',
        remainingQuantity: 1,
        operatorName: '系统管理员',
        closedAt: '2026-10-09T13:50:43+08:00',
      },
    } as unknown as ModuleRecord)

    const text = collectText(rendered)
    expect(text).toContain('强制结单')
    // 强制结单不能与"收满自动完成"混为一谈: 不再渲染已全部入库
    expect(text).not.toContain('已全部入库')

    const tooltip = elementTitle(rendered)
    expect(tooltip).toContain('剩余 1 件')
    expect(tooltip).toContain('系统管理员')
    expect(tooltip).toContain('剩余 1 件报废')
  })

  it('强制结单缺少件数快照时仍给出可读说明, 不渲染 undefined/NaN', () => {
    const rendered = renderPurchaseOrderReceiptProgress(9, {
      totalRemainingQuantity: 0,
      forceClose: { reason: '整单作废' },
    } as unknown as ModuleRecord)

    const tooltip = elementTitle(rendered)
    expect(tooltip).toContain('强制结单')
    expect(tooltip).not.toContain('undefined')
    expect(tooltip).not.toContain('NaN')
  })

  it('forceClose 为 null 或缺失时按普通完成度渲染', () => {
    const nullValue = collectText(
      renderPurchaseOrderReceiptProgress(8, {
        totalRemainingQuantity: 0,
        forceClose: null,
      } as unknown as ModuleRecord),
    )
    expect(nullValue).toContain('已全部入库')
    expect(nullValue).not.toContain('强制结单')

    const absent = collectText(
      renderPurchaseOrderReceiptProgress(8, {
        totalRemainingQuantity: 0,
      } as unknown as ModuleRecord),
    )
    expect(absent).toContain('已全部入库')
  })

  it('磅差按 实际重 − 暂定重 计算并保留 3 位小数', () => {
    expect(
      renderPurchaseOrderWeightVariance(0, {
        actualWeightTon: 3.5,
        weightTon: 3.2,
      } as unknown as ModuleRecord),
    ).toBe('0.300')

    expect(
      renderPurchaseOrderWeightVariance(0, {
        actualWeightTon: 2.8,
        weightTon: 3.15,
      } as unknown as ModuleRecord),
    ).toBe('-0.350')
  })

  it('磅差任一侧为空时回落短横线', () => {
    expect(
      renderPurchaseOrderWeightVariance(0, {
        actualWeightTon: null,
        weightTon: 3.2,
      } as unknown as ModuleRecord),
    ).toBe('-')
    expect(
      renderPurchaseOrderWeightVariance(0, {
        actualWeightTon: 3.2,
        weightTon: null,
      } as unknown as ModuleRecord),
    ).toBe('-')
  })
})
