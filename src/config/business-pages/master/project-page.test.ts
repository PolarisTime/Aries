import { describe, expect, it } from 'vitest'
import {
  groupFieldsByRow,
  moveDocumentNoFieldsToSectionEnd,
} from '@/module-system/presentation/module-field-layout'
import {
  getModuleFormFieldSpan,
  packWizardFieldRows,
} from '@/views/modules/editor-wizard'
import { masterProjectPageConfigs } from './project-page'

describe('projectPageConfig', () => {
  it('新建表单按四列栅格紧凑排列（基础 → 取价规则 → 允许范围 → 比价配置）', () => {
    const rows = groupFieldsByRow(
      masterProjectPageConfigs.project.formFields ?? [],
    )

    expect(rows.map((row) => row.map((field) => field.key))).toEqual([
      ['projectCode', 'projectName', 'projectNameAbbr', 'customerId'],
      ['settlementCompanyId', 'projectManager', 'projectAddress', 'status'],
      ['remark'],
      // 取价规则：基准日期/顺延交易日数/休市口径/时段策略（与专用弹层 ProjectPricingBasisFields 同口径）
      ['quoteSource', 'quoteRegion', 'priceDateBasis', 'priceDateOffsetDays'],
      [
        'priceClosedSettleDirection',
        'priceClosedSettleDays',
        'pricePeriodPolicy',
        'pricePeriodFixed',
      ],
      // 价格规定（多条网价浮动）：整行清单编辑器，自带保存按钮（独立端点 PUT .../price-rules）
      ['priceRules'],
      // 允许品牌/材质的「不匹配处理方式」各自紧跟本字段，不单独占行
      ['allowedBrands', 'allowedBrandSeverity'],
      ['allowedMaterials', 'allowedMaterialSeverity'],
      // 比价配置（2026-11-16 起为唯一配置点）：两个长清单（品牌×品种矩阵、商品规格）各占整行，
      // 其余两项按 12 栅格成对 —— 不再出现 12+6+6 那种一行三种宽度、竖边对不齐的排法
      ['quoteBrandCategories'],
      ['quoteProducts'],
      ['quoteLengthPremium', 'quoteHrb400eFallback'],
    ])
  })

  it('三步向导内每步均无半行空洞，且第 1 步主编码停在备注之前', () => {
    const config = masterProjectPageConfigs.project
    const fields = config.formFields ?? []
    const step1Ordered = moveDocumentNoFieldsToSectionEnd(
      fields.filter((field) => field.formStep === 1),
      [config.primaryNoKey ?? ''],
    )
    expect(step1Ordered.map((field) => field.key)).toEqual([
      'projectName',
      'projectNameAbbr',
      'customerId',
      'settlementCompanyId',
      'projectManager',
      'projectAddress',
      'status',
      'projectCode',
      'remark',
    ])

    // 校验每一步按 24 栅格打包后，所有行均铺满 24（零半行空洞）
    for (const stepNo of [1, 2, 3]) {
      const stepFields = moveDocumentNoFieldsToSectionEnd(
        fields.filter((field) => field.formStep === stepNo),
        [config.primaryNoKey ?? ''],
      )
      const sections = new Map<string, typeof stepFields>()
      for (const field of stepFields) {
        const key = field.section ?? ''
        const list = sections.get(key) ?? []
        list.push(field)
        sections.set(key, list)
      }
      for (const [section, sectionFields] of sections.entries()) {
        for (const row of packWizardFieldRows(sectionFields)) {
          const rowSpan = row.reduce(
            (sum, field) => sum + getModuleFormFieldSpan(field, 'default'),
            0,
          )
          expect(rowSpan, `step ${stepNo} / ${section} 出现半行空洞`).toBe(24)
        }
      }
    }
  })

  it('基础文案字段 maxLength 与 md_project 列宽一致（varchar 契约）', () => {
    /*
     * 权威来源（只读核对，不要猜）：
     * leo/src/main/resources/db/migration/V1__baseline.sql → CREATE TABLE public.md_project：
     * project_code varchar(64) / project_name varchar(200) / project_name_abbr varchar(100) /
     * project_manager varchar(32) / project_address varchar(255) / remark varchar(255)。
     * 后端 ProjectRequest 已同步 `@Size(max=…)` 且数值一致；前端 maxLength 若小于列宽会白白限制输入，
     * 大于列宽则超长内容打到 varchar 上限才报错 —— 所以这里锁「等于」。
     */
    const fields = new Map(
      (masterProjectPageConfigs.project.formFields ?? []).map((field) => [
        field.key,
        field,
      ]),
    )
    const expectedMaxLengths = {
      projectCode: 64,
      projectName: 200,
      projectNameAbbr: 100,
      projectManager: 32,
      projectAddress: 255,
      remark: 255,
    } as const

    for (const [key, maxLength] of Object.entries(expectedMaxLengths)) {
      expect(fields.get(key), `缺少字段 ${key}`).toBeDefined()
      expect(fields.get(key)?.maxLength, `${key} 的 maxLength`).toBe(maxLength)
    }

    // 受控取值（客户/结算主体/状态/取价策略等）不声明 maxLength：
    // 它们由后端按枚举或 ID 校验，前端写长度反而会与后端语义字段的 @Size 口径混淆。
    expect(
      [...fields.values()]
        .filter((field) => field.maxLength != null)
        .map((field) => field.key)
        .sort(),
    ).toEqual(Object.keys(expectedMaxLengths).sort())
  })
})
