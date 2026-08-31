import { describe, expect, it } from 'vitest'
import { groupFieldsByRow } from '@/module-system/presentation/module-field-layout'
import { masterProjectPageConfigs } from './project-page'

describe('projectPageConfig', () => {
  it('新建表单按四列栅格紧凑排列基础字段', () => {
    const rows = groupFieldsByRow(
      masterProjectPageConfigs.project.formFields ?? [],
    )

    expect(rows.map((row) => row.map((field) => field.key))).toEqual([
      ['projectCode', 'projectName', 'projectNameAbbr', 'customerId'],
      ['settlementCompanyId', 'projectManager', 'status'],
      ['projectAddress'],
      ['remark'],
    ])
  })
})
