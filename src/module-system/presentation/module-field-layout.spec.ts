import { describe, expect, it } from 'vitest'
import { paymentPageConfigs } from '@/config/business-pages/finance/payment-pages'
import { statementPageConfigs } from '@/config/business-pages/finance/statement-pages'
import { freightOperationsPageConfigs } from '@/config/business-pages/operations/freight-operations'
import { purchaseOperationsPageConfigs } from '@/config/business-pages/operations/purchase-operations'
import { salesOperationsPageConfigs } from '@/config/business-pages/operations/sales-operations'
import type {
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import { groupFieldsByRow } from './module-field-layout'
import { isModuleFormFieldVisible } from './module-form-field-visibility'

/**
 * 编辑器表单的行宽守卫。
 *
 * <p><b>为什么需要</b>：`ModuleEditorFormSection` 把同一 `row` 的字段放进同一个 antd `<Row>`，
 * 每个字段 `span` 由 `getFieldSpan` 决定（普通字段 6，`fullRow`/`textarea` 为 24）。
 * 一个 `<Row>` 的栅格总宽超过 24 时，antd 不会报错，而是把溢出的第 5 个字段**挤到下一行最左**——
 * 视觉上就是「单据信息」那张表单里「交货日期」孤零零挂在第二行的样子，像排版坏了。
 *
 * <p>这类配置错误不是一次性的：实测销售订单、付款单、客户对账单、货运对账单各有一处
 * （后两者是 7 个字段挤一行）。因此把「每行不超过 24 栅格」固化成守卫，而不是修完就算。</p>
 *
 * <p><b>为什么只覆盖单据表单、不含主数据</b>：主数据（物料/供应商/客户/项目/仓库/物流商…）
 * 走的是 `MasterDataEditor`，它把**整个 section 的字段放进同一个 `<Row>`**，只按
 * `field.fullRow ? 24 : 6` 决定列宽，**完全不读 `row`** —— 多余字段由 antd 自然流到下一行，
 * 不会出现「声明行边界导致孤立字段」那种缺陷。对这些配置断言 24 栅格等于约束一份没人消费的数据。</p>
 *
 * <p>口径刻意与运行时一致：先按 {@link isModuleFormFieldVisible} 过滤（隐藏字段不参与排版，
 * 例如收款单的 `status` 恒为 `visibleWhen: () => false`，若不过滤会误报 30 栅格），
 * 再按 `groupFieldsByRow` 分组，最后用与 `ModuleEditorFormSection` 相同的 `span` 规则求和。</p>
 */

/** 与 `ModuleEditorFormSection.getFieldSpan` 的 default 变体保持一致。 */
function spanOf(field: ModuleFormFieldDefinition): number {
  if (typeof field.colSpan === 'number' && Number.isFinite(field.colSpan)) {
    return Math.max(6, Math.min(24, Math.trunc(field.colSpan)))
  }
  if (field.fullRow || field.type === 'textarea') {
    return 24
  }
  return 6
}

/**
 * 只有这些 group 的表单由 `ModuleEditorFormSection` 渲染（经 `ModuleEditorFormArea`），
 * 也就是 `row` 真正生效的地方。新增单据模块时把它加进来。
 */
const DOCUMENT_FORM_CONFIG_GROUPS: Record<
  string,
  Record<string, ModulePageConfig>
> = {
  purchase: purchaseOperationsPageConfigs,
  sales: salesOperationsPageConfigs,
  freight: freightOperationsPageConfigs,
  payment: paymentPageConfigs,
  statement: statementPageConfigs,
}

describe('编辑器表单行宽守卫', () => {
  it('任何单据表单的任一行都不超过 24 栅格', () => {
    const overflows: string[] = []

    for (const [domain, configs] of Object.entries(
      DOCUMENT_FORM_CONFIG_GROUPS,
    )) {
      for (const [pageKey, config] of Object.entries(configs)) {
        const formFields = config.formFields
        if (!formFields?.length) {
          continue
        }
        // 与运行时同一口径：隐藏字段不参与排版
        const visible = formFields.filter((field) =>
          isModuleFormFieldVisible(field, {}),
        )
        groupFieldsByRow(visible).forEach((row, index) => {
          const total = row.reduce((sum, field) => sum + spanOf(field), 0)
          if (total > 24) {
            overflows.push(
              `${domain}/${pageKey} 第 ${index + 1} 行 = ${total} 栅格: ` +
                row.map((field) => `${field.key}[${spanOf(field)}]`).join(', '),
            )
          }
        })
      }
    }

    expect(
      overflows,
      '以下表单行超过 24 栅格：antd 会把溢出字段挤到下一行最左，看起来像排版坏了。' +
        '修法是把溢出的字段挪到下一个 row，或让 fullRow 字段独占一行。',
    ).toEqual([])
  })
})

describe('groupFieldsByRow', () => {
  it('显式 row 优先，并按 row 升序输出', () => {
    const rows = groupFieldsByRow([
      { row: 2, key: 'c' } as never,
      { row: 1, key: 'a' } as never,
      { row: 2, key: 'd' } as never,
      { row: 1, key: 'b' } as never,
    ])
    expect(
      rows.map((row) => row.map((field) => (field as { key: string }).key)),
    ).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('未声明 row 时每 4 个自动成行，整行字段单独成行', () => {
    const rows = groupFieldsByRow([
      { key: 'a' } as never,
      { key: 'b' } as never,
      { key: 'c' } as never,
      { key: 'd' } as never,
      { key: 'e' } as never,
      { key: 'full', fullRow: true } as never,
      { key: 'f' } as never,
    ])
    expect(
      rows.map((row) => row.map((field) => (field as { key: string }).key)),
    ).toEqual([['a', 'b', 'c', 'd'], ['e'], ['full'], ['f']])
  })
})
