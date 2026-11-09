import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { moveDocumentNoFieldsToSectionEnd } from '@/module-system/presentation/module-field-layout'
import type { ModulePageConfig } from '@/types/module-page'
import { renderProjectNameCell } from '@/utils/project-display'

let salesOrdersPageConfig: ModulePageConfig

describe('销售订单报单日期配置', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
    ;({ salesOrdersPageConfig } = await import(
      '@/config/business-pages/operations/sales-order-page'
    ))
  })

  it('表单提供必填的报单日期，且与交货日期、销售员同处第 2 行', () => {
    const formFields = salesOrdersPageConfig.formFields ?? []
    const keys = formFields.map((field) => field.key)

    expect(formFields.find((field) => field.key === 'orderDate')).toMatchObject(
      {
        label: '报单日期',
        type: 'date',
        required: true,
        row: 2,
      },
    )
    expect(keys.indexOf('orderDate')).toBeLessThan(keys.indexOf('deliveryDate'))
  })

  /**
   * 抬头不再分区（2026-11）：原先「基本信息 / 日期与经手」两个 Divider 各占一行、
   * 信息量为零，用户要求移除。配置侧一条 section 都不能留 —— 留下任意一条，
   * `ModuleEditorFormSection` 就会把该段重新渲染成带标题的区块。
   */
  it('抬头不声明任何分区，因此不渲染「基本信息 / 日期与经手」标题', () => {
    const formFields = salesOrdersPageConfig.formFields ?? []
    expect(formFields.length).toBeGreaterThan(0)
    for (const field of formFields) {
      expect(field.section, `${field.key} 不应声明 section`).toBeUndefined()
    }
  })

  /**
   * 表头顺序契约（2026-11 修订）：运行时第 1 行是「客户 → 项目 → 订单编号 → 采购订单号」，
   * 第 2 行「报单日期 → 交货日期 → 销售员」，备注整行收尾。
   *
   * <p>单号类字段（主单号 + 来源单号）由 `moveDocumentNoFieldsToSectionEnd` 在渲染时
   * 移到段末（抬头已不分区，整张表就是一段），`groupFieldsByRow` 仍按 `row` 归组，
   * 所以单号不会跑到整张表单最后。本断言必须走同一口径，否则锁的是配置顺序、
   * 不是用户看到的顺序。新建时主单号隐藏，第 1 行只剩「客户 → 项目 → 采购订单号」。</p>
   */
  it('表头行内顺序符合统一口径', () => {
    const formFields = salesOrdersPageConfig.formFields ?? []
    const ordered = moveDocumentNoFieldsToSectionEnd(
      formFields,
      [
        salesOrdersPageConfig.primaryNoKey,
        salesOrdersPageConfig.parentImport?.parentFieldKey,
      ].filter((key): key is string => Boolean(key)),
    )
    const keysOfRow = (row: number) =>
      ordered.filter((field) => field.row === row).map((field) => field.key)

    expect(keysOfRow(1)).toEqual([
      'customerId',
      'projectId',
      'orderNo',
      'purchaseOrderNo',
    ])
    // 新建：主单号在渲染时被隐藏，单号只剩来源单号，仍在客户/项目之后。
    expect(
      ordered
        .filter((field) => field.key !== salesOrdersPageConfig.primaryNoKey)
        .filter((field) => field.row === 1)
        .map((field) => field.key),
    ).toEqual(['customerId', 'projectId', 'purchaseOrderNo'])
    expect(keysOfRow(2)).toEqual(['orderDate', 'deliveryDate', 'salesName'])
    expect(keysOfRow(3)).toEqual(['remark'])
  })

  it('列表在交货日期之前展示报单日期列', () => {
    const keys = salesOrdersPageConfig.columns.map((column) => column.dataIndex)

    expect(
      salesOrdersPageConfig.columns.find(
        (column) => column.dataIndex === 'orderDate',
      ),
    ).toMatchObject({ title: '报单日期', width: 120, type: 'date' })
    expect(keys.indexOf('orderDate')).toBeLessThan(keys.indexOf('deliveryDate'))
  })

  it('详情在交货日期之前展示报单日期', () => {
    const keys = salesOrdersPageConfig.detailFields.map((field) => field.key)

    expect(
      salesOrdersPageConfig.detailFields.find(
        (field) => field.key === 'orderDate',
      ),
    ).toMatchObject({ label: '报单日期', type: 'date' })
    expect(keys.indexOf('orderDate')).toBeLessThan(keys.indexOf('deliveryDate'))
  })

  it('筛选栏不新增报单日期条件（保持范围最小）', () => {
    expect(
      salesOrdersPageConfig.filters.some(
        (filter) => filter.key === 'orderDate',
      ),
    ).toBe(false)
  })

  /**
   * 项目下拉的空态必须说明前置条件。
   *
   * <p>项目按客户过滤(未选客户时列表必然为空)。antd 默认只说"暂无数据", 用户分不清是确实
   * 没有项目还是要先选客户 —— 实测新建销售订单时项目下拉就是 0 项, 只报"暂无数据"。
   * 空态写成"请先选择客户"才指向可执行的下一步。</p>
   */
  it('项目字段的下拉空态说明"先选客户"这一前置条件', () => {
    const projectField = (salesOrdersPageConfig.formFields ?? []).find(
      (field) => field.key === 'projectId',
    )
    expect(projectField, '项目字段必须存在').toBeTruthy()
    expect(projectField?.emptyHint).toBeTruthy()
    expect(projectField?.emptyHint).toContain('客户')
  })

  it('「项目名称」列显示「简称（全称）」，无简称时只显示全称', () => {
    const column = salesOrdersPageConfig.columns.find(
      (item) => item.dataIndex === 'projectName',
    )

    expect(column?.render).toBe(renderProjectNameCell)
    expect(column?.width).toBe(240)
    expect(
      column?.render?.(undefined, {
        id: '1',
        projectNameAbbr: '东钢',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('东钢（广东东钢供应链有限公司）')
    expect(
      column?.render?.(undefined, {
        id: '1',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('广东东钢供应链有限公司')
  })
})
