import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildPurchaseOrderOverview,
  renderPurchaseOrderAmount,
  renderPurchaseOrderAmountDifference,
  renderPurchaseOrderNo,
  renderPurchaseOrderReceiptProgress,
  renderPurchaseOrderWeightVariance,
} from './purchase-order-rules'

/** 递归判断元素树里是否还带「下游引用状态图标」（旧实现的 `statuses` 属性）。 */
function hasReferenceStatusIcons(node: unknown): boolean {
  if (!isValidElement(node)) {
    return false
  }
  const props = node.props as { statuses?: unknown; children?: unknown }
  if (Array.isArray(props.statuses)) {
    return true
  }
  const list = Array.isArray(props.children) ? props.children : [props.children]
  return list.some((child) => hasReferenceStatusIcons(child))
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
    const node = renderPurchaseOrderNo('PO-1')
    expect(node).toBeTruthy()
    expect(node).toHaveProperty('props')
  })

  it('单号列只渲染单号文本，不再渲染下游引用图标', () => {
    const node = renderPurchaseOrderNo('PO-1') as ReactElement<{
      children?: unknown
    }>

    expect(collectText(node)).toBe('PO-1')
    // 旧实现会在单号后追加 DocumentReferenceStatusIcons（props 里带 statuses）
    expect(hasReferenceStatusIcons(node)).toBe(false)
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
  /*
   * 「金额」一列按状态显示：暂定与实际互斥。
   * 未过磅时后端 totalActualAmount 为 null → 显示暂定总金额 + 「暂定」标签；
   * 过磅后 → 直接显示实际货值，不再挂暂定标签。
   */
  it('未过磅：显示暂定总金额并附「暂定」标签', () => {
    const node = renderPurchaseOrderAmount(1234.5, {} as never)
    expect(collectText(node)).toContain('1234.50')
    expect(collectText(node)).toContain('暂定')
  })

  it('已过磅：显示实际货值且不再带「暂定」标签', () => {
    const node = renderPurchaseOrderAmount(1234.5, {
      totalActualAmount: 1200.5,
    } as never)
    expect(collectText(node)).toBe('1200.50')
    expect(collectText(node)).not.toContain('暂定')
    expect(collectText(node)).not.toContain('1234.50')
  })

  it('两个口径都缺失时回落短横线', () => {
    expect(renderPurchaseOrderAmount(null, {} as never)).toBe('-')
    expect(
      renderPurchaseOrderAmount(undefined, {
        totalActualAmount: null,
      } as never),
    ).toBe('-')
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

  /*
   * 原「未入库」列已并入这一列：剩余件数 = 总件数 − 已入库，
   * 直接写成「部分入库 · 还剩 1」，免得用户自己相减。
   */
  it('入库进度按状态 + 剩余件数表述，收满时只给状态', () => {
    const notStarted = collectText(
      renderPurchaseOrderReceiptProgress(0, {
        totalRemainingQuantity: 8,
      } as unknown as ModuleRecord),
    )
    expect(notStarted).toContain('未入库')
    expect(notStarted).toContain('还剩 8')

    const partial = collectText(
      renderPurchaseOrderReceiptProgress(7, {
        totalRemainingQuantity: 1,
      } as unknown as ModuleRecord),
    )
    expect(partial).toContain('部分入库')
    expect(partial).toContain('还剩 1')

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
