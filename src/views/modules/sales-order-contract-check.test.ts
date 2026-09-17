import type { TFunction } from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import type { SalesContractCheck } from '@/api/sales/sales-contracts'
import {
  buildSalesOrderContractCheckLines,
  buildSalesOrderContractCheckParams,
  runSalesOrderContractCheck,
  type SalesOrderContractCheckDeps,
  shouldWarnSalesOrderContract,
} from './sales-order-contract-check'

const t = ((key: string, options?: Record<string, unknown>) =>
  options === undefined
    ? key
    : `${key}:${JSON.stringify(options)}`) as unknown as TFunction

function makeCheck(
  overrides: Partial<SalesContractCheck> = {},
): SalesContractCheck {
  return {
    hasContract: true,
    contractAmount: 1000,
    usedAmount: 800,
    remainingAmount: 200,
    contractTonnage: 100,
    usedTonnage: 90,
    remainingTonnage: 10,
    exceededAmount: 0,
    exceededTonnage: 0,
    message: '',
    ...overrides,
  }
}

describe('buildSalesOrderContractCheckParams', () => {
  it('从销售订单草稿提取项目、金额、吨位与排除单据 ID', () => {
    expect(
      buildSalesOrderContractCheckParams({
        id: '9000000000000000001',
        projectId: '8000000000000000002',
        totalAmount: 1234.5,
        totalWeight: 12.345,
      }),
    ).toEqual({
      projectId: '8000000000000000002',
      amount: 1234.5,
      tonnage: 12.345,
      excludeOrderId: '9000000000000000001',
    })
  })

  it('未选择项目时返回 null（跳过校验）', () => {
    expect(
      buildSalesOrderContractCheckParams({ totalAmount: 1, totalWeight: 1 }),
    ).toBeNull()
    expect(buildSalesOrderContractCheckParams({ projectId: '   ' })).toBeNull()
  })

  it('金额/吨位缺失或非法时按 0 处理', () => {
    expect(
      buildSalesOrderContractCheckParams({ projectId: '1', totalAmount: '' }),
    ).toEqual({ projectId: '1', amount: 0, tonnage: 0 })
  })
})

describe('shouldWarnSalesOrderContract', () => {
  it('无合同时不提示', () => {
    expect(
      shouldWarnSalesOrderContract(
        makeCheck({ hasContract: false, exceededAmount: 100 }),
      ),
    ).toBe(false)
  })

  it('金额或吨位任一超限即提示', () => {
    expect(
      shouldWarnSalesOrderContract(makeCheck({ exceededAmount: 0.01 })),
    ).toBe(true)
    expect(
      shouldWarnSalesOrderContract(makeCheck({ exceededTonnage: 0.5 })),
    ).toBe(true)
  })

  it('均未超限时不提示', () => {
    expect(shouldWarnSalesOrderContract(makeCheck())).toBe(false)
    expect(shouldWarnSalesOrderContract(null)).toBe(false)
  })
})

describe('buildSalesOrderContractCheckLines', () => {
  it('展示合同/已用/剩余，并在超出时追加超出量', () => {
    const lines = buildSalesOrderContractCheckLines(
      makeCheck({
        exceededAmount: 100,
        exceededTonnage: 5,
        message: '后端提示',
      }),
      t,
    )
    expect(
      lines.some((line) =>
        line.startsWith('modules.salesContractCheck.contractAmount'),
      ),
    ).toBe(true)
    expect(
      lines.some((line) =>
        line.startsWith('modules.salesContractCheck.usedAmount'),
      ),
    ).toBe(true)
    expect(
      lines.some((line) =>
        line.startsWith('modules.salesContractCheck.remainingTonnage'),
      ),
    ).toBe(true)
    expect(
      lines.some((line) =>
        line.startsWith('modules.salesContractCheck.exceededAmount'),
      ),
    ).toBe(true)
    expect(
      lines.some((line) =>
        line.startsWith('modules.salesContractCheck.exceededTonnage'),
      ),
    ).toBe(true)
    expect(lines.at(-1)).toBe('后端提示')
  })

  it('未超限时不追加超出量行', () => {
    const lines = buildSalesOrderContractCheckLines(makeCheck(), t)
    expect(
      lines.some((line) =>
        line.startsWith('modules.salesContractCheck.exceededAmount'),
      ),
    ).toBe(false)
    expect(
      lines.some((line) =>
        line.startsWith('modules.salesContractCheck.exceededTonnage'),
      ),
    ).toBe(false)
  })
})

describe('runSalesOrderContractCheck', () => {
  const baseRecord = { projectId: '1', totalAmount: 500, totalWeight: 50 }

  it('未选择项目时不发起请求，直接继续', async () => {
    const fetchCheck = vi.fn()
    const confirm = vi.fn()
    const decision = await runSalesOrderContractCheck({ totalAmount: 1 }, t, {
      fetchCheck,
      confirm,
      warn: vi.fn(),
    })
    expect(decision).toBe('continue')
    expect(fetchCheck).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('hasContract=false 时不提示，直接继续', async () => {
    const fetchCheck = vi.fn(() =>
      Promise.resolve(makeCheck({ hasContract: false })),
    )
    const confirm = vi.fn()
    const decision = await runSalesOrderContractCheck(baseRecord, t, {
      fetchCheck,
      confirm,
      warn: vi.fn(),
    })
    expect(decision).toBe('continue')
    expect(fetchCheck).toHaveBeenCalledWith({
      projectId: '1',
      amount: 500,
      tonnage: 50,
    })
    expect(confirm).not.toHaveBeenCalled()
  })

  it('超限时选择“仍然保存”则继续', async () => {
    const confirm = vi.fn(
      (_options: Parameters<SalesOrderContractCheckDeps['confirm']>[0]) =>
        Promise.resolve(true),
    )
    const decision = await runSalesOrderContractCheck(baseRecord, t, {
      fetchCheck: vi.fn(() =>
        Promise.resolve(makeCheck({ exceededAmount: 300 })),
      ),
      confirm,
      warn: vi.fn(),
    })
    expect(decision).toBe('continue')
    expect(confirm).toHaveBeenCalledTimes(1)
    const confirmArg = confirm.mock.calls[0][0]
    expect(confirmArg.okText).toBe('modules.salesContractCheck.stillSave')
    expect(confirmArg.cancelText).toBe('modules.salesContractCheck.backToEdit')
  })

  it('超限时选择“返回修改”则中止', async () => {
    const decision = await runSalesOrderContractCheck(baseRecord, t, {
      fetchCheck: vi.fn(() =>
        Promise.resolve(makeCheck({ exceededTonnage: 1 })),
      ),
      confirm: vi.fn(() => Promise.resolve(false)),
      warn: vi.fn(),
    })
    expect(decision).toBe('abort')
  })

  it('请求失败时不阻断，仅告警', async () => {
    const warn = vi.fn()
    const decision = await runSalesOrderContractCheck(baseRecord, t, {
      fetchCheck: vi.fn(() => Promise.reject(new Error('network'))),
      confirm: vi.fn(),
      warn,
    })
    expect(decision).toBe('continue')
    expect(warn).toHaveBeenCalledWith('modules.salesContractCheck.checkFailed')
  })
})
