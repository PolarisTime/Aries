import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { ProjectOpeningBalanceRecord } from '@/api/finance/project-opening-balances'
import {
  buildOpeningBalanceFormValues,
  buildOpeningBalancePayload,
  canUnlockOpeningBalance,
  isDraftOpeningBalance,
  isOpeningBalanceVersionConflict,
  resolveOpeningBalanceCapabilities,
} from './project-opening-balance-model'

function sampleRecord(
  overrides: Partial<ProjectOpeningBalanceRecord> = {},
): ProjectOpeningBalanceRecord {
  return {
    id: '9007199254740993',
    balanceNo: 'OB-9007199254740993',
    projectId: '10001',
    projectName: '测试项目A',
    projectNameAbbr: '项A',
    customerId: '20001',
    customerCode: 'C001',
    customerName: '测试客户A',
    settlementCompanyId: '30001',
    settlementCompanyName: '测试主体A',
    balanceType: 'RECEIVABLE',
    cutoffDate: '2025-12-31',
    openingAmount: 120000,
    settledAmount: 0,
    remainingAmount: 120000,
    status: 'CONFIRMED',
    confirmedAt: '2026-01-01T10:00:00',
    confirmedBy: '1',
    confirmedByName: 'admin',
    legacyDocNo: 'OLD-2025',
    remark: '历史对账函',
    createdAt: '2026-01-01T09:00:00',
    updatedAt: '2026-01-01T10:00:00',
    version: '2',
    ...overrides,
  }
}

describe('project-opening-balance-model', () => {
  it('resolves granular RBAC capabilities accurately', () => {
    expect(
      resolveOpeningBalanceCapabilities([
        'project-opening-balances:read',
        'project-opening-balances:create',
      ]),
    ).toEqual({
      canCreate: true,
      canUpdate: false,
      canDelete: false,
      canConfirm: false,
    })

    expect(
      resolveOpeningBalanceCapabilities(['project-opening-balances:*']),
    ).toEqual({
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canConfirm: true,
    })
  })

  it('blocks unlocking when opening receivable has settled receipts', () => {
    expect(canUnlockOpeningBalance(sampleRecord({ settledAmount: 0 }))).toBe(
      true,
    )
    expect(
      canUnlockOpeningBalance(
        sampleRecord({ settledAmount: 1000, remainingAmount: 119000 }),
      ),
    ).toBe(false)
    expect(canUnlockOpeningBalance(sampleRecord({ status: 'DRAFT' }))).toBe(
      false,
    )
    expect(isDraftOpeningBalance('DRAFT')).toBe(true)
    expect(isDraftOpeningBalance('CONFIRMED')).toBe(false)
  })

  it('builds form defaults and upsert payloads cleanly', () => {
    const createDefaults = buildOpeningBalanceFormValues(null, '10001')
    expect(createDefaults.projectId).toBe('10001')
    expect(createDefaults.balanceType).toBe('RECEIVABLE')

    const payload = buildOpeningBalancePayload(
      {
        balanceNo: '  ',
        projectId: '10001',
        balanceType: 'ADVANCE',
        cutoffDate: dayjs('2025-12-31'),
        openingAmount: 50000.25,
        legacyDocNo: ' LEGACY-1 ',
        remark: ' 预收结转 ',
      },
      true,
    )
    expect(payload).toEqual({
      projectId: '10001',
      balanceType: 'ADVANCE',
      cutoffDate: '2025-12-31',
      openingAmount: 50000.25,
      legacyDocNo: 'LEGACY-1',
      remark: '预收结转',
      confirm: true,
    })
  })

  it('detects 412/428 version conflicts', () => {
    expect(isOpeningBalanceVersionConflict({ status: 412 })).toBe(true)
    expect(isOpeningBalanceVersionConflict({ status: 428 })).toBe(true)
    expect(isOpeningBalanceVersionConflict({ status: 400 })).toBe(false)
  })
})
