import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import type {
  SalesContractResponse,
  SalesContractStatus,
} from '@/api/sales/sales-contracts'
import {
  buildSalesContractFormValues,
  buildSalesContractUpsertPayload,
  getStatusActionTarget,
  isSalesContractDateRangeValid,
  isSalesContractVersionConflict,
  resolveSalesContractCapabilities,
  validateSalesContractForm,
} from './sales-contract-model'

const t = ((key: string, options?: Record<string, unknown>) =>
  options === undefined
    ? key
    : `${key}:${JSON.stringify(options)}`) as unknown as TFunction

function makeRecord(
  overrides: Partial<SalesContractResponse> = {},
): SalesContractResponse {
  return {
    id: '9000000000000000001',
    contractNo: 'HT-001',
    name: '年度销售合同',
    customerId: '1001',
    customerName: '客户甲',
    projectId: '2001',
    projectName: '项目一',
    signDate: '2026-01-01',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    totalAmount: 1000,
    totalTonnage: 100,
    status: '草稿',
    remark: '备注',
    version: '3',
    ...overrides,
  }
}

function versionConflictError(status: number, code?: number): Error {
  return Object.assign(new Error('conflict'), {
    status,
    ...(code ? { code } : {}),
  })
}

describe('resolveSalesContractCapabilities', () => {
  it('草稿：可编辑/删除/审核/作废', () => {
    expect(resolveSalesContractCapabilities({ status: '草稿' })).toEqual({
      canEdit: true,
      canDelete: true,
      canAudit: true,
      canIssue: false,
      canArchive: false,
      canVoid: true,
    })
  })

  it('审核：不可编辑删除，可签发/作废', () => {
    expect(resolveSalesContractCapabilities({ status: '审核' })).toEqual({
      canEdit: false,
      canDelete: false,
      canAudit: false,
      canIssue: true,
      canArchive: false,
      canVoid: true,
    })
  })

  it('签发：仅可归档，不可作废', () => {
    expect(resolveSalesContractCapabilities({ status: '签发' })).toEqual({
      canEdit: false,
      canDelete: false,
      canAudit: false,
      canIssue: false,
      canArchive: true,
      canVoid: false,
    })
  })

  it('归档：仅可作废', () => {
    expect(resolveSalesContractCapabilities({ status: '归档' })).toEqual({
      canEdit: false,
      canDelete: false,
      canAudit: false,
      canIssue: false,
      canArchive: false,
      canVoid: true,
    })
  })

  it('作废：只读', () => {
    expect(resolveSalesContractCapabilities({ status: '作废' })).toEqual({
      canEdit: false,
      canDelete: false,
      canAudit: false,
      canIssue: false,
      canArchive: false,
      canVoid: false,
    })
  })

  it('未知/缺失状态按只读处理', () => {
    expect(resolveSalesContractCapabilities(undefined).canEdit).toBe(false)
    expect(
      resolveSalesContractCapabilities({ status: '' as SalesContractStatus })
        .canVoid,
    ).toBe(false)
  })
})

describe('getStatusActionTarget', () => {
  it('映射到目标状态', () => {
    expect(getStatusActionTarget('audit')).toBe('审核')
    expect(getStatusActionTarget('issue')).toBe('签发')
    expect(getStatusActionTarget('archive')).toBe('归档')
    expect(getStatusActionTarget('void')).toBe('作废')
  })
})

describe('isSalesContractVersionConflict', () => {
  it('412/428 及业务码均判定为版本冲突', () => {
    expect(isSalesContractVersionConflict(versionConflictError(412))).toBe(true)
    expect(isSalesContractVersionConflict(versionConflictError(428))).toBe(true)
    expect(
      isSalesContractVersionConflict(versionConflictError(409, 4120)),
    ).toBe(true)
    expect(
      isSalesContractVersionConflict(versionConflictError(409, 4280)),
    ).toBe(true)
  })

  it('其他错误不误判', () => {
    expect(isSalesContractVersionConflict(versionConflictError(500))).toBe(
      false,
    )
    expect(isSalesContractVersionConflict(new Error('network'))).toBe(false)
    expect(isSalesContractVersionConflict(null)).toBe(false)
  })
})

describe('isSalesContractDateRangeValid', () => {
  it('结束不早于开始为合法', () => {
    expect(
      isSalesContractDateRangeValid({
        startDate: '2026-01-01',
        endDate: '2026-01-01',
      }),
    ).toBe(true)
    expect(
      isSalesContractDateRangeValid({
        startDate: '2026-01-01',
        endDate: '2026-02-01',
      }),
    ).toBe(true)
  })

  it('结束早于开始为非法', () => {
    expect(
      isSalesContractDateRangeValid({
        startDate: '2026-02-01',
        endDate: '2026-01-31',
      }),
    ).toBe(false)
  })

  it('缺省任一端视为合法（交给必填规则）', () => {
    expect(isSalesContractDateRangeValid({ startDate: '2026-02-01' })).toBe(
      true,
    )
    expect(isSalesContractDateRangeValid({})).toBe(true)
  })
})

describe('validateSalesContractForm', () => {
  const valid = {
    name: '年度销售合同',
    customerId: '1001',
    projectId: '2001',
    signDate: '2026-01-01',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    totalAmount: 100,
    totalTonnage: 10,
  }

  it('通过合法表单（合同编号可空）', () => {
    expect(validateSalesContractForm(valid, t)).toBeNull()
    expect(
      validateSalesContractForm({ ...valid, contractNo: '' }, t),
    ).toBeNull()
  })

  it('名称/客户/项目必填', () => {
    expect(validateSalesContractForm({ ...valid, name: '' }, t)).toBe(
      'modules.formField.inputRequired:{"label":"modules.salesContract.name"}',
    )
    expect(validateSalesContractForm({ ...valid, customerId: '' }, t)).toBe(
      'modules.formField.selectRequired:{"label":"modules.salesContract.customer"}',
    )
    expect(validateSalesContractForm({ ...valid, projectId: '' }, t)).toBe(
      'modules.formField.selectRequired:{"label":"modules.salesContract.project"}',
    )
  })

  it('签订日期必填', () => {
    expect(validateSalesContractForm({ ...valid, signDate: null }, t)).toBe(
      'modules.formField.selectRequired:{"label":"modules.salesContract.signDate"}',
    )
    expect(validateSalesContractForm({ ...valid, signDate: '' }, t)).toBe(
      'modules.formField.selectRequired:{"label":"modules.salesContract.signDate"}',
    )
  })

  it('金额/吨位必填且非负', () => {
    expect(validateSalesContractForm({ ...valid, totalAmount: null }, t)).toBe(
      'modules.formField.inputRequired:{"label":"modules.salesContract.totalAmount"}',
    )
    expect(validateSalesContractForm({ ...valid, totalTonnage: '' }, t)).toBe(
      'modules.formField.inputRequired:{"label":"modules.salesContract.totalTonnage"}',
    )
    expect(validateSalesContractForm({ ...valid, totalAmount: -1 }, t)).toBe(
      'modules.formField.nonNegative:{"label":"modules.salesContract.totalAmount"}',
    )
    expect(validateSalesContractForm({ ...valid, totalTonnage: -0.5 }, t)).toBe(
      'modules.formField.nonNegative:{"label":"modules.salesContract.totalTonnage"}',
    )
  })

  it('起止日期倒置时报错', () => {
    expect(
      validateSalesContractForm(
        { ...valid, startDate: '2026-02-01', endDate: '2026-01-01' },
        t,
      ),
    ).toBe('modules.salesContract.dateRangeInvalid')
  })
})

describe('buildSalesContractFormValues', () => {
  it('从记录回填表单（日期归一为 yyyy-MM-dd）', () => {
    const values = buildSalesContractFormValues(makeRecord())
    expect(values).toMatchObject({
      contractNo: 'HT-001',
      name: '年度销售合同',
      customerId: '1001',
      projectId: '2001',
      signDate: '2026-01-01',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      totalAmount: 1000,
      totalTonnage: 100,
    })
  })

  it('名称为空时归一为空串', () => {
    expect(buildSalesContractFormValues(makeRecord({ name: null })).name).toBe(
      '',
    )
  })

  it('新建时给出空表单', () => {
    expect(buildSalesContractFormValues(null)).toMatchObject({
      contractNo: '',
      customerId: '',
      projectId: '',
    })
  })
})

describe('buildSalesContractUpsertPayload', () => {
  it('归一日期与数字，剔除客户/项目名称快照', () => {
    const payload = buildSalesContractUpsertPayload({
      contractNo: ' HT-002 ',
      name: ' 补充合同 ',
      customerId: '1001',
      projectId: '2001',
      signDate: '2026-03-01',
      startDate: '2026-03-01',
      endDate: '2026-06-30',
      totalAmount: '1200.5',
      totalTonnage: '12.5',
      remark: ' 备注 ',
    })
    expect(payload).toEqual({
      contractNo: 'HT-002',
      name: '补充合同',
      customerId: '1001',
      projectId: '2001',
      signDate: '2026-03-01',
      startDate: '2026-03-01',
      endDate: '2026-06-30',
      totalAmount: 1200.5,
      totalTonnage: 12.5,
      remark: '备注',
    })
    expect(payload).not.toHaveProperty('customerName')
    expect(payload).not.toHaveProperty('projectName')
  })

  it('空合同编号/空可选日期/空备注不进入载荷，签订日期恒提交', () => {
    const payload = buildSalesContractUpsertPayload({
      contractNo: '   ',
      name: '合同',
      customerId: '1',
      projectId: '2',
      signDate: '2026-05-01',
      startDate: '',
      endDate: undefined,
      totalAmount: 0,
      totalTonnage: 0,
      remark: '  ',
    })
    expect(payload).not.toHaveProperty('contractNo')
    expect(payload).not.toHaveProperty('startDate')
    expect(payload).not.toHaveProperty('endDate')
    expect(payload).not.toHaveProperty('remark')
    expect(payload.signDate).toBe('2026-05-01')
  })
})
