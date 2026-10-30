import { describe, expect, it } from 'vitest'
import { groupFieldsByRow } from '@/module-system/presentation/module-field-layout'
import { masterProjectPageConfigs } from './project-page'

describe('projectPageConfig', () => {
  it('新建表单按四列栅格紧凑排列（基础 → 取价规则 → 允许范围）', () => {
    const rows = groupFieldsByRow(
      masterProjectPageConfigs.project.formFields ?? [],
    )

    expect(rows.map((row) => row.map((field) => field.key))).toEqual([
      ['projectCode', 'projectName', 'projectNameAbbr', 'customerId'],
      ['settlementCompanyId', 'projectManager', 'status'],
      ['projectAddress'],
      ['remark'],
      // 取价规则：基准日期/顺延交易日数/休市口径/时段策略（与专用弹层 ProjectPricingBasisFields 同口径）
      ['quoteSource', 'quoteRegion', 'priceDateBasis', 'priceDateOffsetDays'],
      [
        'priceClosedSettleDirection',
        'priceClosedSettleDays',
        'pricePeriodPolicy',
        'pricePeriodFixed',
      ],
      // 允许品牌/材质的「不匹配处理方式」各自紧跟本字段，不单独占行
      ['allowedBrands', 'allowedBrandSeverity'],
      ['allowedMaterials', 'allowedMaterialSeverity'],
    ])
  })
})
