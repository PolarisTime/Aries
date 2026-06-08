import { describe, expect, it, vi } from 'vitest'

vi.mock('./module-behavior-registry-core', () => ({
  registerModuleBehavior: vi.fn(),
}))

import { registerModuleBehavior } from './module-behavior-registry-core'
import './module-behavior-actions'

const mockedRegister = vi.mocked(registerModuleBehavior)

describe('module-behavior-actions', () => {
  it('registers supplier-statement behavior', () => {
    const call = mockedRegister.mock.calls.find(
      ([key]) => key === 'supplier-statement',
    )
    expect(call).toBeDefined()
    expect(call?.[1]).toEqual({
      actionKindsByKey: { generate_statement: 'openCreateEditor' },
      actionKindsByLabel: { 生成对账单: 'openCreateEditor' },
    })
  })

  it('registers customer-statement behavior', () => {
    const call = mockedRegister.mock.calls.find(
      ([key]) => key === 'customer-statement',
    )
    expect(call).toBeDefined()
    expect(call?.[1]).toEqual({
      actionKindsByKey: { generate_statement: 'openCreateEditor' },
      actionKindsByLabel: { 生成对账单: 'openCreateEditor' },
    })
  })

  it('registers freight-statement behavior with actions', () => {
    const calls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'freight-statement',
    )
    expect(calls.length).toBeGreaterThanOrEqual(2)
    expect(calls[0]?.[1]).toEqual({
      actionKindsByKey: {
        generate_freight_statement: 'openCreateEditor',
        view_freight_summary: 'openFreightSummary',
      },
      actionKindsByLabel: {
        生成物流对账单: 'openCreateEditor',
        查看运费对账汇总: 'openFreightSummary',
      },
    })
  })

  it('registers freight-statement permission codes', () => {
    const calls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'freight-statement',
    )
    const permissionCall = calls.find(
      ([, config]) => config.permissionCodesByActionKey,
    )
    expect(permissionCall).toBeDefined()
    expect(permissionCall?.[1]).toEqual({
      permissionCodesByActionKey: {
        generate_freight_statement: ['create'],
        view_freight_summary: ['read'],
      },
    })
  })

  it('registers freight-bill behavior with actions', () => {
    const calls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'freight-bill',
    )
    expect(calls.length).toBeGreaterThanOrEqual(2)
    expect(calls[0]?.[1]).toEqual({
      actionKindsByKey: {
        create_freight_bill: 'openCreateEditor',
        generate_pickup_list: 'openFreightPickupList',
      },
      actionKindsByLabel: {
        生成提货清单: 'openFreightPickupList',
      },
    })
  })

  it('registers freight-bill permission codes', () => {
    const calls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'freight-bill',
    )
    const permissionCall = calls.find(
      ([, config]) => config.permissionCodesByActionKey,
    )
    expect(permissionCall).toBeDefined()
    expect(permissionCall?.[1]).toEqual({
      permissionCodesByActionKey: {
        create_freight_bill: ['create'],
        generate_pickup_list: ['export'],
      },
    })
  })

  it('registers all expected modules', () => {
    const registeredKeys = new Set(
      mockedRegister.mock.calls.map(([key]) => key),
    )
    expect(registeredKeys).toContain('supplier-statement')
    expect(registeredKeys).toContain('customer-statement')
    expect(registeredKeys).toContain('freight-statement')
    expect(registeredKeys).toContain('freight-bill')
  })
})
