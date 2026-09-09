import { describe, expect, it } from 'vitest'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import {
  buildCompanySettingFormValues,
  buildPayload,
  normalizeSubmittedSettlementAccounts,
} from './company-settings-form-model'

describe('company-settings-form-model 纯逻辑', () => {
  it('buildCompanySettingFormValues 空 profile 回退默认值', () => {
    const values = buildCompanySettingFormValues(null)
    expect(values).toEqual({
      id: undefined,
      companyName: '',
      taxNo: '',
      status: STATUS.NORMAL,
      remark: '',
      settlementAccounts: [],
    })
  })

  it('buildCompanySettingFormValues 归一化结算账户列表', () => {
    const values = buildCompanySettingFormValues({
      id: '1',
      companyName: '公司A',
      taxNo: 'TAX-1',
      status: STATUS.DISABLED,
      remark: '备注',
      settlementAccounts: [
        {
          id: '11',
          accountName: '账户',
          bankName: '银行',
          bankAccount: '6222',
          usageType: SETTLEMENT_TYPE.RECEIPT,
          status: STATUS.NORMAL,
          remark: '',
        },
      ],
    })
    expect(values.settlementAccounts).toHaveLength(1)
    expect(values.settlementAccounts[0]).toMatchObject({
      id: '11',
      accountName: '账户',
    })
  })

  it('normalizeSubmittedSettlementAccounts 丢弃全空行并补默认值', () => {
    const normalized = normalizeSubmittedSettlementAccounts([
      {
        id: undefined,
        accountName: '  ',
        bankName: '',
        bankAccount: '',
        usageType: '',
        status: '',
        remark: '',
      },
      {
        id: 12,
        accountName: '收款户',
        bankName: '工商银行',
        bankAccount: ' 6222 ',
        usageType: SETTLEMENT_TYPE.PAYMENT,
        status: STATUS.NORMAL,
        remark: ' 日常 ',
      },
    ] as Parameters<typeof normalizeSubmittedSettlementAccounts>[0])
    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toEqual({
      id: '12',
      accountName: '收款户',
      bankName: '工商银行',
      bankAccount: '6222',
      usageType: SETTLEMENT_TYPE.PAYMENT,
      status: STATUS.NORMAL,
      remark: '日常',
    })
  })

  it('normalizeSubmittedSettlementAccounts 空数组返回空数组', () => {
    expect(normalizeSubmittedSettlementAccounts([])).toEqual([])
  })

  it('buildPayload 去除首尾空白并保留状态回退', () => {
    const payload = buildPayload({
      companyName: ' 公司A ',
      taxNo: ' TAX ',
      status: '',
      remark: '  ',
      settlementAccounts: [],
    })
    expect(payload).toEqual({
      companyName: '公司A',
      taxNo: 'TAX',
      settlementAccounts: [],
      status: STATUS.NORMAL,
      remark: '',
    })
  })
})
